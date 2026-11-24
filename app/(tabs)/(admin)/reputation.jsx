
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopNav } from "../../../components/Navigations";
import adminStyles from "../../../components/adminStyles";
import { supabase } from "../../../lib/supabase";

const FILTERS = [
  "All",
  "Highly Reliable",
  "Reliable",
  "Fair",
  "Needs Improvement",
  "Poor Reliability",
  "Not Rated",
];

function getTier(score) {
  if (score === null || score === undefined) return "Not Rated";
  if (score >= 90) return "Highly Reliable";
  if (score >= 75) return "Reliable";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";
  return "Poor Reliability";
}

function getTierColors(tier) {
  switch (tier) {
    case "Highly Reliable":
    case "Reliable":
      return { bg: "#E6F7EE", fg: "#15803D" };
    case "Fair":
      return { bg: "#FFF4DB", fg: "#B7791F" };
    case "Needs Improvement":
    case "Poor Reliability":
      return { bg: "#FDE8EB", fg: "#E13F58" };
    default:
      return { bg: "#E9EDF5", fg: "#64748B" };
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenId(value) {
  if (!value) return "—";
  return `${String(value).slice(0, 8)}...`;
}

function SectionTitle({ children }) {
  return (
    <Text style={adminStyles.sectionTitle}>
      {children}
    </Text>
  );
}

function DetailRow({ label, value, valueColor }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function DeadlineStatus({ deadline }) {
  let label = "Pending";
  let colors = { bg: "#FFF4DB", fg: "#B7791F" };

  if (deadline.penalty_applied_at) {
    label = "Penalty Applied";
    colors = { bg: "#FDE8EB", fg: "#E13F58" };
  } else if (deadline.missed_at) {
    label = "Missed";
    colors = { bg: "#FDE8EB", fg: "#E13F58" };
  } else if (deadline.resolved_at) {
    label = "Resolved";
    colors = { bg: "#E6F7EE", fg: "#15803D" };
  }

  return (
    <View style={[adminStyles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[adminStyles.badgeText, { color: colors.fg }]}>
        {label}
      </Text>
    </View>
  );
}

function EmployerDetails({ details, loading, error }) {
  if (loading) {
    return (
      <View style={styles.detailsLoading}>
        <ActivityIndicator color="#2623D3" />
        <Text style={adminStyles.meta}>Loading employer records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.detailsError}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!details) return null;

  const { logs, deadlines } = details;

  return (
    <View style={styles.detailsContainer}>
      <SectionTitle>Accountability Deadlines</SectionTitle>

      {deadlines.length === 0 ? (
        <Text style={styles.emptyDetails}>
          No accountability deadlines recorded.
        </Text>
      ) : (
        deadlines.map((deadline) => (
          <View key={deadline.id} style={styles.recordCard}>
            <View style={adminStyles.rowBetween}>
              <Text style={styles.recordTitle}>
                {(deadline.deadline_type || "Accountability")
                  .replaceAll("_", " ")}
              </Text>
              <DeadlineStatus deadline={deadline} />
            </View>

            <DetailRow
              label="Application"
              value={shortenId(deadline.application_id)}
            />
            <DetailRow
              label="Due date"
              value={formatDate(deadline.due_at)}
            />
            <DetailRow
              label="Resolved"
              value={formatDate(deadline.resolved_at)}
            />
            <DetailRow
              label="Missed"
              value={formatDate(deadline.missed_at)}
            />
            <DetailRow
              label="Penalty applied"
              value={formatDate(deadline.penalty_applied_at)}
              valueColor={deadline.penalty_applied_at ? "#E13F58" : undefined}
            />
          </View>
        ))
      )}

      <SectionTitle>Reputation History</SectionTitle>

      {logs.length === 0 ? (
        <Text style={styles.emptyDetails}>
          No reputation history recorded.
        </Text>
      ) : (
        logs.map((log) => {
          const points = Number(log.points_change || 0);
          const positive = points > 0;

          return (
            <View key={log.id} style={styles.recordCard}>
              <View style={adminStyles.rowBetween}>
                <Text style={styles.recordTitle}>
                  {(log.event_type || "Reputation event")
                    .replaceAll("_", " ")}
                </Text>

                <Text
                  style={[
                    styles.points,
                    { color: positive ? "#15803D" : points < 0 ? "#E13F58" : "#64748B" },
                  ]}
                >
                  {points > 0 ? "+" : ""}
                  {points} pts
                </Text>
              </View>

              {!!log.description && (
                <Text style={styles.description}>
                  {log.description}
                </Text>
              )}

              <DetailRow
                label="Score after event"
                value={
                  log.score_after === null || log.score_after === undefined
                    ? "—"
                    : `${log.score_after}/100`
                }
              />
              <DetailRow
                label="Application"
                value={shortenId(log.application_id)}
              />
              <DetailRow
                label="Date"
                value={formatDate(log.created_at)}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

export default function AdminReputation() {
  const [employers, setEmployers] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [expandedEmployer, setExpandedEmployer] = useState(null);
  const [detailsByEmployer, setDetailsByEmployer] = useState({});
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);
  const [detailsErrors, setDetailsErrors] = useState({});

  const loadEmployers = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    setErrorMessage("");

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .order("name", { ascending: true });

      if (profilesError) throw profilesError;

      const employerProfiles = (profiles || []).filter(
        (profile) =>
          String(profile.role || "").toLowerCase() === "employer"
      );

      const { data: reputationRows, error: reputationError } =
        await supabase
          .from("employer_reputation")
          .select("employer_id, score, updated_at");

      if (reputationError) throw reputationError;

      const reputationMap = new Map(
        (reputationRows || []).map((item) => [
          item.employer_id,
          item,
        ])
      );

      const combined = employerProfiles.map((profile) => {
        const reputation = reputationMap.get(profile.id);
        const score = reputation?.score ?? null;

        return {
          ...profile,
          reputation_score: score,
          reputation_tier: getTier(score),
          reputation_updated_at: reputation?.updated_at ?? null,
        };
      });

      setEmployers(combined);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load employer reputation.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEmployers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployers(false);
  };

  const visibleEmployers = useMemo(() => {
    return employers
      .filter((employer) => {
        if (filter === "All") return true;
        return employer.reputation_tier === filter;
      })
      .filter((employer) => {
        const searchText =
          `${employer.name || ""} ${employer.email || ""}`.toLowerCase();

        return searchText.includes(query.trim().toLowerCase());
      });
  }, [employers, filter, query]);

  const counts = useMemo(() => {
    return {
      total: employers.length,
      rated: employers.filter(
        (item) => item.reputation_score !== null
      ).length,
      needsAttention: employers.filter(
        (item) =>
          item.reputation_score !== null &&
          item.reputation_score < 60
      ).length,
      notRated: employers.filter(
        (item) => item.reputation_score === null
      ).length,
    };
  }, [employers]);

  const loadEmployerDetails = async (employerId) => {
    setDetailsLoadingId(employerId);

    setDetailsErrors((previous) => ({
      ...previous,
      [employerId]: "",
    }));

    try {
      const [logsResult, deadlinesResult] = await Promise.all([
        supabase
          .from("employer_reputation_logs")
          .select(
            "id, application_id, deadline_id, event_type, points_change, score_after, description, created_at"
          )
          .eq("employer_id", employerId)
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("employer_accountability_deadlines")
          .select(
            "id, application_id, deadline_type, due_at, resolved_at, missed_at, penalty_applied_at, cycle_started_at, created_at"
          )
          .eq("employer_id", employerId)
          .order("due_at", { ascending: false })
          .limit(50),
      ]);

      if (logsResult.error) throw logsResult.error;
      if (deadlinesResult.error) throw deadlinesResult.error;

      setDetailsByEmployer((previous) => ({
        ...previous,
        [employerId]: {
          logs: logsResult.data || [],
          deadlines: deadlinesResult.data || [],
        },
      }));
    } catch (error) {
      setDetailsErrors((previous) => ({
        ...previous,
        [employerId]: error.message || "Unable to load employer records.",
      }));
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const toggleEmployer = async (employerId) => {
    if (expandedEmployer === employerId) {
      setExpandedEmployer(null);
      return;
    }

    setExpandedEmployer(employerId);

    if (!detailsByEmployer[employerId]) {
      await loadEmployerDetails(employerId);
    }
  };

  const retryDetails = (employerId) => {
    loadEmployerDetails(employerId);
  };

  return (
    <SafeAreaView style={adminStyles.container} edges={["top"]}>
      <TopNav />

      <ScrollView
        contentContainerStyle={adminStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View>
          <Text style={adminStyles.title}>Employer Reputation</Text>
          <Text style={adminStyles.subtitle}>
            Review employer reliability scores, accountability deadlines,
            and reputation history.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Employers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.rated}</Text>
            <Text style={styles.statLabel}>Rated</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#E13F58" }]}>
              {counts.needsAttention}
            </Text>
            <Text style={styles.statLabel}>Below 60</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.notRated}</Text>
            <Text style={styles.statLabel}>Not Rated</Text>
          </View>
        </View>

        <TextInput
          style={adminStyles.search}
          placeholder="Search employer name or email"
          placeholderTextColor="#9AA6C1"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        <View style={adminStyles.chips}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                adminStyles.chip,
                filter === item && adminStyles.chipActive,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  adminStyles.chipText,
                  filter === item && adminStyles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 20 }}
          />
        )}

        {!!errorMessage && (
          <View style={adminStyles.card}>
            <Text style={{ color: "#E13F58" }}>{errorMessage}</Text>

            <TouchableOpacity onPress={() => loadEmployers()}>
              <Text style={{ color: "#2623D3", marginTop: 10 }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !errorMessage && visibleEmployers.length === 0 && (
          <Text style={adminStyles.empty}>
            No employers found for this search or filter.
          </Text>
        )}

        {!loading &&
          !errorMessage &&
          visibleEmployers.map((employer) => {
            const tierColors = getTierColors(employer.reputation_tier);
            const isExpanded = expandedEmployer === employer.id;

            return (
              <View key={employer.id} style={adminStyles.card}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => toggleEmployer(employer.id)}
                >
                  <View style={adminStyles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={adminStyles.name}
                        numberOfLines={1}
                      >
                        {employer.name || "Unnamed Employer"}
                      </Text>

                      <Text
                        style={adminStyles.meta}
                        numberOfLines={1}
                      >
                        {employer.email || "No email available"}
                      </Text>

                      <Text style={adminStyles.meta}>
                        Account:{" "}
                        {employer.status === "suspended"
                          ? "Suspended"
                          : "Active"}
                      </Text>
                    </View>

                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={22}
                      color="#6876A6"
                    />
                  </View>

                  <View style={styles.scoreRow}>
                    <View>
                      <Text style={styles.scoreLabel}>
                        Reputation Score
                      </Text>
                      <Text style={styles.scoreValue}>
                        {employer.reputation_score === null
                          ? "—"
                          : `${employer.reputation_score}/100`}
                      </Text>
                    </View>

                    <View
                      style={[
                        adminStyles.badge,
                        { backgroundColor: tierColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          adminStyles.badgeText,
                          { color: tierColors.fg },
                        ]}
                      >
                        {employer.reputation_tier}
                      </Text>
                    </View>
                  </View>

                  {!!employer.reputation_updated_at && (
                    <Text style={styles.updatedText}>
                      Updated: {formatDate(employer.reputation_updated_at)}
                    </Text>
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedArea}>
                    <View style={styles.expandedHeader}>
                      <Text style={styles.expandedTitle}>
                        Employer Records
                      </Text>

                      <TouchableOpacity
                        onPress={() => retryDetails(employer.id)}
                        disabled={detailsLoadingId === employer.id}
                      >
                        <Feather
                          name="refresh-cw"
                          size={17}
                          color="#2623D3"
                        />
                      </TouchableOpacity>
                    </View>

                    <EmployerDetails
                      details={detailsByEmployer[employer.id]}
                      loading={detailsLoadingId === employer.id}
                      error={detailsErrors[employer.id]}
                    />
                  </View>
                )}
              </View>
            );
          })}

        <Text style={styles.footerNote}>
          Reputation records are displayed for administrative review.
          Scores, penalties, and accountability deadlines are managed
          automatically by the system.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EBFA",
    borderRadius: 12,
    padding: 14,
  },
  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111C4B",
  },
  statLabel: {
    fontSize: 12,
    color: "#6876A6",
    marginTop: 3,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F8",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6876A6",
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111C4B",
    marginTop: 2,
  },
  updatedText: {
    fontSize: 11,
    color: "#8994B4",
    marginTop: 10,
  },
  expandedArea: {
    borderTopWidth: 1,
    borderTopColor: "#EEF0F8",
    marginTop: 14,
    paddingTop: 14,
    gap: 12,
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111C4B",
  },
  detailsContainer: {
    gap: 12,
  },
  detailsLoading: {
    alignItems: "center",
    padding: 18,
    gap: 8,
  },
  detailsError: {
    backgroundColor: "#FDE8EB",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#E13F58",
    fontSize: 13,
  },
  emptyDetails: {
    color: "#8994B4",
    fontSize: 13,
    paddingVertical: 8,
  },
  recordCard: {
    backgroundColor: "#F8F9FE",
    borderWidth: 1,
    borderColor: "#E7EBFA",
    borderRadius: 10,
    padding: 12,
    gap: 9,
  },
  recordTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
    textTransform: "capitalize",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 11,
    color: "#6876A6",
  },
  detailValue: {
    flex: 1.5,
    fontSize: 11,
    color: "#334155",
    textAlign: "right",
  },
  points: {
    fontSize: 13,
    fontWeight: "800",
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 17,
    color: "#8994B4",
    textAlign: "center",
    marginTop: 4,
  },
};
