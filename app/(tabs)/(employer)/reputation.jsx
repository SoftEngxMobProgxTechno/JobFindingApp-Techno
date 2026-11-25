
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopNav } from "../../../components/Navigations";
import {
    getMyAccountabilityDeadlines,
    getMyReputation,
    getMyReputationHistory,
    getReputationTier,
} from "../../../lib/employer/reputation";

const DEADLINE_LABELS = {
  application_review_3d: "Initial application review",
  under_review_followup_5d: "Under Review follow-up",
  interview_details_2d_before: "Interview details",
  post_interview_status_1d: "Post-interview status",
  final_decision_3d: "Final hiring decision",
};

function formatDate(dateString) {
  if (!dateString) return "Not available";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDeadlineStatus(deadline) {
  if (deadline.resolved_at) {
    return {
      label: "Completed",
      color: "#15803D",
      background: "#DCFCE7",
      icon: "check-circle",
    };
  }

  if (deadline.missed_at || deadline.penalty_applied_at) {
    return {
      label: "Missed",
      color: "#B91C1C",
      background: "#FEE2E2",
      icon: "alert-circle",
    };
  }

  if (new Date(deadline.due_at).getTime() < Date.now()) {
    return {
      label: "Overdue",
      color: "#B45309",
      background: "#FEF3C7",
      icon: "clock-alert-outline",
    };
  }

  return {
    label: "Pending",
    color: "#2563EB",
    background: "#DBEAFE",
    icon: "clock-outline",
  };
}

function getScoreColor(score) {
  if (score >= 90) return "#15803D";
  if (score >= 75) return "#2563EB";
  if (score >= 60) return "#A16207";
  if (score >= 40) return "#C2410C";
  return "#B91C1C";
}

export default function EmployerReputation() {
  const [reputation, setReputation] = useState(null);
  const [history, setHistory] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReputation = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [reputationData, historyData, deadlineData] =
        await Promise.all([
          getMyReputation(),
          getMyReputationHistory(30),
          getMyAccountabilityDeadlines(),
        ]);

      setReputation(reputationData);
      setHistory(historyData || []);
      setDeadlines(deadlineData || []);
    } catch (error) {
      console.error("Reputation dashboard error:", error);

      setErrorMessage(
        error.message || "Unable to load your reputation information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReputation();

      return undefined;
    }, [])
  );

  const score =
    reputation?.score !== null && reputation?.score !== undefined
      ? Number(reputation.score)
      : null;

  const tier = score !== null ? getReputationTier(score) : null;
  const scoreColor = score !== null ? getScoreColor(score) : "#8993A8";

  const completedDeadlines = deadlines.filter(
    (item) => item.resolved_at
  ).length;

  const pendingDeadlines = deadlines.filter((item) => {
    const status = getDeadlineStatus(item).label;
    return status === "Pending" || status === "Overdue";
  }).length;

  const missedDeadlines = deadlines.filter(
    (item) => item.missed_at || item.penalty_applied_at
  ).length;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F6F8FF" }}
      edges={["top"]}
    >
      <TopNav />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 35,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReputation(true)}
            colors={["#2623D3"]}
          />
        }
      >
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 23,
              fontWeight: "800",
              color: "#111C4B",
            }}
          >
            Employer Reputation
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#7381A2",
              marginTop: 5,
              lineHeight: 19,
            }}
          >
            Track your reliability score and how consistently you handle
            applications.
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#2623D3" />
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#7381A2",
              }}
            >
              Loading reputation...
            </Text>
          </View>
        ) : errorMessage ? (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <Ionicons
              name="alert-circle-outline"
              size={25}
              color="#B91C1C"
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#991B1B",
                marginTop: 8,
              }}
            >
              Unable to load reputation
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#991B1B",
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : (
          <>
            {/* Reputation Score */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#EEF0F8",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#56617B",
                  }}
                >
                  Your Reputation Score
                </Text>

                <MaterialCommunityIcons
                  name="shield-check"
                  size={25}
                  color="#2623D3"
                />
              </View>

              {score !== null ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 48,
                        fontWeight: "900",
                        color: scoreColor,
                      }}
                    >
                      {score}
                    </Text>

                    <Text
                      style={{
                        fontSize: 16,
                        color: "#8993A8",
                        fontWeight: "600",
                        marginLeft: 5,
                      }}
                    >
                      /100
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: "#E9ECF5",
                      height: 10,
                      borderRadius: 10,
                      overflow: "hidden",
                      marginTop: 12,
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(0, Math.min(score, 100))}%`,
                        height: "100%",
                        backgroundColor: scoreColor,
                        borderRadius: 10,
                      }}
                    />
                  </View>

                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: `${scoreColor}15`,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20,
                      marginTop: 15,
                    }}
                  >
                    <Text
                      style={{
                        color: scoreColor,
                        fontSize: 12,
                        fontWeight: "800",
                      }}
                    >
                      {tier}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#7381A2",
                      lineHeight: 18,
                      marginTop: 12,
                    }}
                  >
                    Your score reflects how consistently you review
                    applications, communicate with applicants, and complete
                    hiring decisions.
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    color: "#7381A2",
                    marginTop: 15,
                    lineHeight: 19,
                  }}
                >
                  Your reputation record is not available yet. Your score
                  will appear here once your employer reputation record has
                  been initialized.
                </Text>
              )}
            </View>

            {/* Accountability Summary */}
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#111C4B",
                marginBottom: 12,
              }}
            >
              Accountability Overview
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 9,
                marginBottom: 22,
              }}
            >
              <SummaryCard
                label="Completed"
                value={completedDeadlines}
                color="#15803D"
                background="#DCFCE7"
                icon="check-circle-outline"
              />

              <SummaryCard
                label="Pending"
                value={pendingDeadlines}
                color="#2563EB"
                background="#DBEAFE"
                icon="clock-outline"
              />

              <SummaryCard
                label="Missed"
                value={missedDeadlines}
                color="#B91C1C"
                background="#FEE2E2"
                icon="alert-circle-outline"
              />
            </View>

            {/* Accountability Deadlines */}
            <SectionHeader
              title="Accountability Deadlines"
              subtitle="Track your responsibilities for each application."
            />

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 15,
                borderWidth: 1,
                borderColor: "#EEF0F8",
                marginBottom: 22,
              }}
            >
              {deadlines.length === 0 ? (
                <EmptyState message="No accountability deadlines yet. Deadlines will appear here when applicants submit applications or enter other hiring stages." />
              ) : (
                deadlines.map((deadline, index) => {
                  const status = getDeadlineStatus(deadline);

                  return (
                    <View
                      key={deadline.id}
                      style={{
                        paddingVertical: 13,
                        borderBottomWidth:
                          index === deadlines.length - 1 ? 0 : 1,
                        borderBottomColor: "#EEF0F8",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: "#111C4B",
                            }}
                          >
                            {DEADLINE_LABELS[deadline.deadline_type] ||
                              deadline.deadline_type}
                          </Text>

                          <Text
                            style={{
                              fontSize: 11,
                              color: "#8993A8",
                              marginTop: 5,
                            }}
                          >
                            Due: {formatDate(deadline.due_at)}
                          </Text>

                          {deadline.resolved_at ? (
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#15803D",
                                marginTop: 4,
                              }}
                            >
                              Completed: {formatDate(deadline.resolved_at)}
                            </Text>
                          ) : null}
                        </View>

                        <View
                          style={{
                            backgroundColor: status.background,
                            borderRadius: 20,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <MaterialCommunityIcons
                            name={status.icon}
                            size={13}
                            color={status.color}
                          />

                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "800",
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Reputation History */}
            <SectionHeader
              title="Reputation History"
              subtitle="Recent changes to your reputation score."
            />

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 15,
                borderWidth: 1,
                borderColor: "#EEF0F8",
              }}
            >
              {history.length === 0 ? (
                <EmptyState message="No reputation activity has been recorded yet. Your score changes will appear here." />
              ) : (
                history.map((item, index) => {
                  const points = Number(item.points_change || 0);
                  const positive = points > 0;
                  const neutral = points === 0;

                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 11,
                        paddingVertical: 13,
                        borderBottomWidth:
                          index === history.length - 1 ? 0 : 1,
                        borderBottomColor: "#EEF0F8",
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: positive
                            ? "#DCFCE7"
                            : neutral
                              ? "#EEF2FF"
                              : "#FEE2E2",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={
                            positive
                              ? "trending-up"
                              : neutral
                                ? "remove"
                                : "trending-down"
                          }
                          size={17}
                          color={
                            positive
                              ? "#15803D"
                              : neutral
                                ? "#2623D3"
                                : "#B91C1C"
                          }
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "#111C4B",
                          }}
                        >
                          {item.description || "Reputation updated"}
                        </Text>

                        <Text
                          style={{
                            fontSize: 11,
                            color: "#8993A8",
                            marginTop: 4,
                          }}
                        >
                          {formatDate(item.created_at)}
                        </Text>

                        {item.score_after !== null &&
                        item.score_after !== undefined ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#7381A2",
                              marginTop: 4,
                            }}
                          >
                            Score after: {item.score_after}/100
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: positive
                            ? "#15803D"
                            : neutral
                              ? "#7381A2"
                              : "#B91C1C",
                        }}
                      >
                        {positive ? "+" : ""}
                        {points}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Score Guide */}
            <View
              style={{
                marginTop: 22,
                backgroundColor: "#EEF2FF",
                borderRadius: 15,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#2623D3",
                  marginBottom: 10,
                }}
              >
                Reputation Score Guide
              </Text>

              <TierRow label="Highly Reliable" range="90–100" />
              <TierRow label="Reliable" range="75–89" />
              <TierRow label="Fair" range="60–74" />
              <TierRow label="Needs Improvement" range="40–59" />
              <TierRow label="Poor Reliability" range="0–39" />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, color, background, icon }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "#EEF0F8",
        padding: 11,
      }}
    >
      <View
        style={{
          width: 29,
          height: 29,
          borderRadius: 10,
          backgroundColor: background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={color}
        />
      </View>

      <Text
        style={{
          fontSize: 22,
          fontWeight: "900",
          color: "#111C4B",
          marginTop: 9,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: "#7381A2",
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 11 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: "#111C4B",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontSize: 12,
          color: "#7381A2",
          marginTop: 4,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function EmptyState({ message }) {
  return (
    <View style={{ paddingVertical: 18, alignItems: "center" }}>
      <MaterialCommunityIcons
        name="clipboard-text-clock-outline"
        size={28}
        color="#A1AAC0"
      />

      <Text
        style={{
          fontSize: 12,
          color: "#7381A2",
          textAlign: "center",
          lineHeight: 18,
          marginTop: 9,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function TierRow({ label, range }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: "#39456A",
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: "#2623D3",
        }}
      >
        {range}
      </Text>
    </View>
  );
}
