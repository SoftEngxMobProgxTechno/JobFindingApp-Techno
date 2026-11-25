
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const STATUS = {
  "Application Submitted": {
    bg: "#FFF3CF",
    fg: "#7A4E00",
    bar: "#B7791F",
    steps: 1,
    note: "Your application has been submitted",
  },
  "Under Review": {
    bg: "#DBEAFE",
    fg: "#1D4ED8",
    bar: "#2563EB",
    steps: 2,
    note: "The employer is reviewing your application",
  },
  "Interview Stage": {
    bg: "#EDE9FE",
    fg: "#6D28D9",
    bar: "#7C3AED",
    steps: 3,
    note: "You have moved to the interview stage",
  },
  "Awaiting Final Decision": {
    bg: "#FEF3C7",
    fg: "#92400E",
    bar: "#D97706",
    steps: 4,
    note: "Waiting for the employer's final decision",
  },
  Hired: {
    bg: "#DCFCE7",
    fg: "#166534",
    bar: "#16A34A",
    steps: 5,
    note: "Congratulations! You have been hired",
  },
  "Not Selected": {
    bg: "#FDE8E8",
    fg: "#B42318",
    bar: "#B42318",
    steps: 0,
    note: "Your application was not selected",
  },
};

function formatInterviewDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatInterviewTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ApplicationCard({
  job,
  application,
  onPress,
}) {
  const [showReply, setShowReply] = useState(false);

  const s =
    STATUS[application.status] ||
    STATUS["Application Submitted"];

  const isNotSelected = application.status === "Not Selected";
  const isHired = application.status === "Hired";

  const date = application.appliedAt
    ? new Date(application.appliedAt).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  const hasReply = !!application.replyMessage?.trim();

  const hasInterview = !!application.interviewAt;

  const interviewDetailsSent = Boolean(
    application.interviewDetailsSentAt
  );

  // If the employer's reply is already displayed as interview
  // instructions, don't show the same message a second time.
  const replyDisplayedAsInstructions =
    hasInterview && interviewDetailsSent && hasReply;

  const showEmployerReply =
    hasReply && !replyDisplayedAsInstructions;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.top}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: job.color || "#E9ECFF",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={job.icon || "briefcase-outline"}
              size={25}
              color="#2623D3"
            />
          </View>

          <View style={styles.info}>
            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {job.title}
            </Text>

            <Text
              style={styles.company}
              numberOfLines={1}
            >
              {job.company} · {job.location}
            </Text>
          </View>

          <Text
            style={[
              styles.pill,
              {
                backgroundColor: s.bg,
                color: s.fg,
              },
            ]}
          >
            {application.status}
          </Text>
        </View>

        {/* Hiring progress */}
        {isNotSelected ? (
          <View style={styles.finalStatus}>
            <MaterialCommunityIcons
              name="close-circle"
              size={17}
              color="#B42318"
            />

            <Text style={styles.finalStatusText}>
              Application not selected
            </Text>
          </View>
        ) : (
          <View style={styles.bars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    backgroundColor:
                      i < s.steps ? s.bar : "#E1E5F2",
                  },
                ]}
              />
            ))}
          </View>
        )}

        <View style={styles.bottom}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.note,
                isNotSelected && { color: "#B42318" },
                isHired && { color: "#15803D" },
              ]}
            >
              {s.note}
            </Text>

            <Text style={styles.appliedDate}>
              Applied {date}
            </Text>
          </View>

          <Text style={styles.view}>
            View
          </Text>
        </View>
      </TouchableOpacity>

      {/* Interview Schedule - displayed inside this application card */}
      {hasInterview && (
        <>
          <View style={styles.divider} />

          <View style={styles.interviewSection}>
            <View style={styles.interviewHeader}>
              <View style={styles.interviewHeaderLeft}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={20}
                  color="#6D28D9"
                />

                <Text style={styles.interviewTitle}>
                  Interview Schedule
                </Text>
              </View>

              <View
                style={[
                  styles.interviewBadge,
                  {
                    backgroundColor: interviewDetailsSent
                      ? "#DCFCE7"
                      : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.interviewBadgeText,
                    {
                      color: interviewDetailsSent
                        ? "#166534"
                        : "#92400E",
                    },
                  ]}
                >
                  {interviewDetailsSent
                    ? "CONFIRMED"
                    : "SCHEDULED"}
                </Text>
              </View>
            </View>

            <View style={styles.interviewInfoRow}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={18}
                color="#6D28D9"
              />

              <Text style={styles.interviewInfoText}>
                {formatInterviewDate(application.interviewAt)}
              </Text>
            </View>

            <View style={styles.interviewInfoRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={18}
                color="#6D28D9"
              />

              <Text style={styles.interviewInfoText}>
                {formatInterviewTime(application.interviewAt)}
              </Text>
            </View>

            {interviewDetailsSent && hasReply ? (
              <View style={styles.interviewInstructions}>
                <View style={styles.instructionsHeader}>
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={16}
                    color="#6D28D9"
                  />

                  <Text style={styles.instructionsTitle}>
                    Employer Instructions
                  </Text>
                </View>

                <Text style={styles.instructionsText}>
                  {application.replyMessage}
                </Text>
              </View>
            ) : (
              <View style={styles.pendingInstructions}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={15}
                  color="#92400E"
                />

                <Text style={styles.pendingInstructionsText}>
                  {interviewDetailsSent
                    ? "The employer has not provided additional instructions."
                    : "The employer has not yet confirmed that the interview instructions have been sent."}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* General Employer Reply */}
      {showEmployerReply && (
        <>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setShowReply(!showReply)}
            activeOpacity={0.7}
          >
            <View style={styles.replyButtonLeft}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color="#2623D3"
              />

              <Text style={styles.replyButtonText}>
                {showReply
                  ? "Hide Employer Reply"
                  : "View Employer Reply"}
              </Text>
            </View>

            <MaterialCommunityIcons
              name={
                showReply
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={20}
              color="#2623D3"
            />
          </TouchableOpacity>

          {showReply && (
            <View style={styles.replyBox}>
              <Text style={styles.replyLabel}>
                Message from Employer
              </Text>

              <Text style={styles.replyMessage}>
                {application.replyMessage}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#EDF0F7",
    gap: 12,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#121B39",
  },
  company: {
    fontSize: 12,
    color: "#5B6788",
    marginTop: 4,
  },
  pill: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: 145,
  },
  bars: {
    flexDirection: "row",
    gap: 5,
    marginTop: 12,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  finalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  finalStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B42318",
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  note: {
    flex: 1,
    fontSize: 12,
    color: "#5B6788",
  },
  view: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDF0F7",
  },
  appliedDate: {
    fontSize: 11,
    color: "#8A94A8",
    marginTop: 4,
  },

  // Interview schedule
  interviewSection: {
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  interviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  interviewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  interviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4C1D95",
  },
  interviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  interviewBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  interviewInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  interviewInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  interviewInstructions: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginTop: 2,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instructionsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4C1D95",
  },
  instructionsText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 19,
  },
  pendingInstructions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  pendingInstructionsText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 17,
  },

  // Employer reply
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2623D3",
  },
  replyBox: {
    backgroundColor: "#F6F8FF",
    borderRadius: 12,
    padding: 12,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111C4B",
    marginBottom: 6,
  },
  replyMessage: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
});
