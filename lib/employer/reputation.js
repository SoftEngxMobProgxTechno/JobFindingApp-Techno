
import { supabase } from "../supabase";

/**
 * Get the current employer's reputation.
 */
export async function getMyReputation() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("User is not authenticated.");

  const { data, error } = await supabase
    .from("employer_reputation")
    .select("employer_id, score, created_at, updated_at")
    .eq("employer_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Get an employer's public reputation.
 * Intended for job seeker-facing profiles and job listings.
 */
export async function getEmployerReputation(employerId) {
  if (!employerId) {
    throw new Error("Employer ID is required.");
  }

  const { data, error } = await supabase
    .from("employer_reputation")
    .select("employer_id, score, created_at, updated_at")
    .eq("employer_id", employerId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Get the current employer's reputation history.
 */
export async function getMyReputationHistory(limit = 20) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("User is not authenticated.");

  const { data, error } = await supabase
    .from("employer_reputation_logs")
    .select(
      "id, application_id, event_type, points_change, score_after, description, created_at"
    )
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data ?? [];
}

/**
 * Get the current employer's accountability deadlines.
 */
export async function getMyAccountabilityDeadlines() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("User is not authenticated.");

  const { data, error } = await supabase
    .from("employer_accountability_deadlines")
    .select(
      "id, application_id, deadline_type, due_at, resolved_at, missed_at, penalty_applied_at, created_at"
    )
    .eq("employer_id", user.id)
    .order("due_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Convert a reputation score into its reliability tier.
 */
export function getReputationTier(score) {
  if (score >= 90) return "Highly Reliable";
  if (score >= 75) return "Reliable";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";

  return "Poor Reliability";
}



/**
 * Get reputation scores for multiple employers.
 * Returns an object keyed by employer ID.
 */
export async function getEmployerReputations(employerIds = []) {
  const uniqueIds = [...new Set(employerIds.filter(Boolean))];

  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("employer_reputation")
    .select("employer_id, score")
    .in("employer_id", uniqueIds);

  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((item) => [
      item.employer_id,
      Number(item.score),
    ])
  );
}
