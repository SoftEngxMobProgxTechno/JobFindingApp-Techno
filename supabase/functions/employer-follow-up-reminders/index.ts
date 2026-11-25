
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function getServiceRoleKey(): string {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (legacyKey) return legacyKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeys) {
    return JSON.parse(secretKeys).default;
  }

  throw new Error("Supabase service role key is missing.");
}

async function claimReminder(
  supabase: ReturnType<typeof createClient>,
  applicationId: string,
  employerId: string,
  hours: number
) {
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("employer_follow_up_reminders")
    .insert({
      application_id: applicationId,
      employer_id: employerId,
      reminder_hours: hours,
      status: "processing",
      attempts: 1,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (!insertError && inserted) {
    return inserted.id;
  }

  if (insertError?.code !== "23505") {
    throw insertError || new Error("Unable to create reminder record.");
  }

  const { data: existing, error: readError } = await supabase
    .from("employer_follow_up_reminders")
    .select("*")
    .eq("application_id", applicationId)
    .eq("reminder_hours", hours)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing || existing.status === "sent") return null;

  const recentlyProcessing =
    existing.status === "processing" &&
    existing.updated_at &&
    Date.now() - new Date(existing.updated_at).getTime() <
      30 * 60 * 1000;

  if (recentlyProcessing) return null;

  const { data: updated, error: updateError } = await supabase
    .from("employer_follow_up_reminders")
    .update({
      status: "processing",
      attempts: existing.attempts + 1,
      last_error: null,
      updated_at: now,
    })
    .eq("id", existing.id)
    .neq("status", "sent")
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;

  return updated?.id || null;
}

async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: object
) {
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((token: string) => ({
      to: token,
      sound: "default",
      priority: "high",
      title,
      body,
      data,
      channelId: "default",
    }));

    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Expo Push API returned HTTP ${response.status}.`
      );
    }

    const result: {
      data?: Array<{ status?: string }>;
    } = await response.json();

    const failedTickets = (result.data || []).filter(
      (ticket: { status?: string }) => ticket.status !== "ok"
    );

    if (failedTickets.length > 0) {
      throw new Error(
        `Expo rejected ${failedTickets.length} push notification(s): ` +
        JSON.stringify(failedTickets)
      );
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (
      !cronSecret ||
      request.headers.get("x-cron-secret") !== cronSecret
    ) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();

    if (!supabaseUrl) {
      throw new Error("Supabase URL is missing.");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = Date.now();

    const cutoff24 = new Date(
      now - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: applications, error: applicationsError } =
      await supabase
        .from("applications")
        .select(`
          id,
          job_id,
          status,
          created_at,
          jobLists!inner (
            employer_id,
            title
          )
        `)
        .eq("status", "Application Submitted")
        .lt("created_at", cutoff24);

    if (applicationsError) throw applicationsError;

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const application of applications || []) {
      const job = Array.isArray(application.jobLists)
        ? application.jobLists[0]
        : application.jobLists;

      if (!job?.employer_id) {
        skipped++;
        continue;
      }

      const ageHours =
        (now - new Date(application.created_at).getTime()) /
        (60 * 60 * 1000);

      for (const hours of [24, 48]) {
        if (ageHours < hours) continue;

        let reminderId: string | null = null;

        try {
          reminderId = await claimReminder(
            supabase,
            application.id,
            job.employer_id,
            hours
          );

          if (!reminderId) {
            skipped++;
            continue;
          }

          const eventKey =
            `employer_follow_up_${hours}h_${application.id}`;

          const title =
            hours === 24
              ? "Application Follow-Up Reminder"
              : "Second Application Follow-Up Reminder";

          const message =
            hours === 24
              ? `You have an application for "${job.title}" waiting for review for 24 hours. Please review your applicant.`
              : `An application for "${job.title}" has been waiting for review for 48 hours. Please take action on this application.`;

          const { data: existingNotification, error: notificationReadError } =
            await supabase
              .from("notifications")
              .select("id")
              .eq("event_key", eventKey)
              .maybeSingle();

          if (notificationReadError) {
            throw notificationReadError;
          }

          if (!existingNotification) {
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                recipient_id: job.employer_id,
                actor_id: null,
                type: "employer_follow_up_reminder",
                title,
                message,
                data: {
                  application_id: application.id,
                  job_id: application.job_id,
                  reminder_hours: hours,
                },
                is_read: false,
                event_key: eventKey,
              });

            if (notificationError) throw notificationError;
          }

          const { data: devices, error: devicesError } = await supabase
            .from("device_push_tokens")
            .select("expo_push_token")
            .eq("user_id", job.employer_id);

          if (devicesError) throw devicesError;

          const tokens: string[] = [
            ...new Set<string>(
              (devices || [])
                .map(
                  (device: { expo_push_token: string | null }) =>
                    device.expo_push_token
                )
                .filter(
                  (token: string | null): token is string =>
                    Boolean(token)
                )
            ),
          ];

          if (tokens.length > 0) {
            await sendExpoPushNotifications(
              tokens,
              title,
              message,
              {
                type: "employer_follow_up_reminder",
                application_id: application.id,
                job_id: application.job_id,
                reminder_hours: hours,
              }
            );
          }

          const { error: completeError } = await supabase
            .from("employer_follow_up_reminders")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", reminderId);

          if (completeError) throw completeError;

          processed++;
        } catch (error) {
          failed++;

          console.error(
            `Reminder failed for application ${application.id}:`,
            error
          );

          if (reminderId) {
            await supabase
              .from("employer_follow_up_reminders")
              .update({
                status: "failed",
                last_error: String(error).slice(0, 1000),
                updated_at: new Date().toISOString(),
              })
              .eq("id", reminderId);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalApplications: applications?.length || 0,
        processed,
        skipped,
        failed,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Employer reminder function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
