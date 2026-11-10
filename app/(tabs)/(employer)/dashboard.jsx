
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopNav } from "../../../components/Navigations";
import { supabase } from "../../../lib/supabase";

const ACTIVITY_FILTERS = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "All Time", value: "all" },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyName, setCompanyName] = useState("My Company");
  const [activityFilter, setActivityFilter] = useState("7");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [recentApplicants, setRecentApplicants] = useState([]);

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in again.");

      // Kuhaon ang verified company name.
      const { data: company, error: companyError } =
        await supabase
          .from("employer_verifications")
          .select("company_name")
          .eq("employer_id", user.id)
          .eq("status", "Verified")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (companyError) throw companyError;

      setCompanyName(company?.company_name || "My Company");

      // Kuhaon ang tanan postings sa employer.
      const { data: jobsData, error: jobsError } =
        await supabase
          .from("jobLists")
          .select("id, title, status, is_archived, created_at")
          .eq("employer_id", user.id);

      if (jobsError) throw jobsError;

      const allJobs = jobsData || [];
      const jobIds = allJobs.map((job) => job.id);

      let allApplications = [];

      if (jobIds.length > 0) {
        // Kuhaon ang applications sa tanan postings.
        const { data, error } = await supabase
          .from("applications")
          .select("id, job_id, full_name, status, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false });

        if (error) throw error;

        allApplications = data || [];
      }

      setJobs(allJobs);
      setApplications(allApplications);

      // Ipakita ang five most recent applications.
      const recent = allApplications.slice(0, 5).map((item) => {
        const job = allJobs.find(
          (entry) => entry.id === item.job_id
        );

        return {
          ...item,
          applicantName: item.full_name || "Applicant",
          jobTitle: job?.title || "Job unavailable",
        };
      });

      setRecentApplicants(recent);
    } catch (error) {
      Alert.alert(
        "Dashboard Error",
        error.message || "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh dashboard when returning to this screen.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const activeJobs = jobs.filter((job) => !job.is_archived);

  const pending = applications.filter(
    (item) => item.status?.toLowerCase() === "pending"
  ).length;

  const accepted = applications.filter(
    (item) => item.status?.toLowerCase() === "accepted"
  ).length;

  const rejected = applications.filter(
    (item) => item.status?.toLowerCase() === "rejected"
  ).length;

  const openJobs = activeJobs.filter(
    (job) => job.status?.toLowerCase() === "open"
  ).length;

  const closedJobs = activeJobs.filter(
    (job) => job.status?.toLowerCase() === "closed"
  ).length;

  // Rank postings according to their applicant count.
  const postingPerformance = useMemo(() => {
    return activeJobs
      .map((job) => {
        const jobApplications = applications.filter(
          (item) => item.job_id === job.id
        );

        return {
          ...job,
          applicantCount: jobApplications.length,
          pendingCount: jobApplications.filter(
            (item) => item.status?.toLowerCase() === "pending"
          ).length,
          acceptedCount: jobApplications.filter(
            (item) => item.status?.toLowerCase() === "accepted"
          ).length,
        };
      })
      .sort((a, b) => b.applicantCount - a.applicantCount)
      .slice(0, 5);
  }, [activeJobs, applications]);

  // Prepare application activity chart.
  const activityData = useMemo(() => {
    const now = new Date();

    if (activityFilter === "7" || activityFilter === "30") {
      const dayCount = Number(activityFilter);

      const buckets = Array.from(
        { length: dayCount },
        (_, index) => {
          const date = new Date(now);

          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - (dayCount - 1 - index));

          return {
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
            label:
              activityFilter === "7"
                ? date.toLocaleDateString("en-PH", {
                    weekday: "short",
                  })
                : date.toLocaleDateString("en-PH", {
                    day: "numeric",
                  }),
            count: 0,
          };
        }
      );

      const bucketMap = new Map(
        buckets.map((bucket) => [bucket.key, bucket])
      );

      applications.forEach((item) => {
        const date = new Date(item.created_at);

        if (Number.isNaN(date.getTime())) return;

        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const bucket = bucketMap.get(key);

        if (bucket) bucket.count += 1;
      });

      return buckets;
    }

    // All-time view is grouped by month.
    const firstDate = applications.reduce((earliest, item) => {
      const date = new Date(item.created_at);

      if (Number.isNaN(date.getTime())) return earliest;

      return !earliest || date < earliest ? date : earliest;
    }, null);

    if (!firstDate) {
      return [
        {
          key: "empty",
          label: now.toLocaleDateString("en-PH", {
            month: "short",
          }),
          count: 0,
        },
      ];
    }

    const start = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      1
    );

    const monthCount =
      (now.getFullYear() - start.getFullYear()) * 12 +
      now.getMonth() -
      start.getMonth() +
      1;

    const buckets = Array.from(
      { length: monthCount },
      (_, index) => {
        const date = new Date(
          start.getFullYear(),
          start.getMonth() + index,
          1
        );

        return {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          label: date.toLocaleDateString("en-PH", {
            month: "short",
          }),
          count: 0,
        };
      }
    );

    const bucketMap = new Map(
      buckets.map((bucket) => [bucket.key, bucket])
    );

    applications.forEach((item) => {
      const date = new Date(item.created_at);

      if (Number.isNaN(date.getTime())) return;

      const bucket = bucketMap.get(
        `${date.getFullYear()}-${date.getMonth()}`
      );

      if (bucket) bucket.count += 1;
    });

    return buckets.slice(-6);
  }, [applications, activityFilter]);

  const maxActivity = Math.max(
    ...activityData.map((item) => item.count),
    1
  );

  const statusTotal = pending + accepted + rejected;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "#15803D";
      case "rejected":
        return "#B91C1C";
      default:
        return "#B45309";
    }
  };

  const getStatusBackground = (status) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "#DCFCE7";
      case "rejected":
        return "#FEE2E2";
      default:
        return "#FEF3C7";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopNav />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            colors={["#2623D3"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Employer Dashboard</Text>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.subtitle}>
            Overview of your job postings and applications
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2623D3" />
            <Text style={styles.loadingText}>
              Loading dashboard...
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="briefcase-outline"
                title="Total Jobs"
                value={activeJobs.length}
                color="#2623D3"
                background="#EEF2FF"
                detail={`${openJobs} open · ${closedJobs} closed`}
              />

              <StatCard
                icon="people-outline"
                title="Total Applicants"
                value={applications.length}
                color="#0284C7"
                background="#E0F2FE"
                detail="Across all postings"
              />

              <StatCard
                icon="time-outline"
                title="Pending"
                value={pending}
                color="#D97706"
                background="#FEF3C7"
                detail="Awaiting review"
              />

              <StatCard
                icon="checkmark-circle-outline"
                title="Accepted"
                value={accepted}
                color="#15803D"
                background="#DCFCE7"
                detail="Successful applications"
              />
            </View>

            {/* Application Status */}
            <SectionTitle title="Application Status" />

            <View style={styles.card}>
              {statusTotal === 0 ? (
                <EmptyMessage message="Application status data will appear here once applicants apply." />
              ) : (
                <>
                  <View style={styles.statusBar}>
                    {pending > 0 && (
                      <View
                        style={[
                          styles.statusSegment,
                          {
                            flex: pending,
                            backgroundColor: "#D97706",
                          },
                        ]}
                      />
                    )}

                    {accepted > 0 && (
                      <View
                        style={[
                          styles.statusSegment,
                          {
                            flex: accepted,
                            backgroundColor: "#16A34A",
                          },
                        ]}
                      />
                    )}

                    {rejected > 0 && (
                      <View
                        style={[
                          styles.statusSegment,
                          {
                            flex: rejected,
                            backgroundColor: "#DC5252",
                          },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.statusLegend}>
                    <StatusLegend
                      label="Pending"
                      value={pending}
                      color="#D97706"
                    />

                    <StatusLegend
                      label="Accepted"
                      value={accepted}
                      color="#16A34A"
                    />

                    <StatusLegend
                      label="Rejected"
                      value={rejected}
                      color="#DC5252"
                    />
                  </View>

                  {applications.length > statusTotal && (
                    <Text style={styles.mutedNote}>
                      {applications.length - statusTotal} other
                      application(s) are not included in this breakdown.
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Application Activity */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Application Activity
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.activityHeader}>
                <Text style={styles.cardSubtitle}>
                  Applications received
                </Text>

                <View style={styles.filterRow}>
                  {ACTIVITY_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.value}
                      style={[
                        styles.filterButton,
                        activityFilter === filter.value &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() =>
                        setActivityFilter(filter.value)
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          activityFilter === filter.value &&
                            styles.filterTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {applications.length === 0 ? (
                <EmptyMessage message="Your application activity will appear here." />
              ) : (
                <>
                  <View style={styles.chart}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={
                        activityFilter === "30"
                          ? styles.chartScrollContent
                          : styles.chart
                      }
                    >
                      {activityData.map((item, index) => {
                        const showDateLabel =
                          activityFilter !== "30" ||
                          [0, 4, 9, 14, 19, 24, 29].includes(index);

                        return (
                          <View
                            key={item.key}
                            style={
                              activityFilter === "30"
                                ? styles.chartColumn30
                                : styles.chartColumn
                            }
                          >
                            <Text style={styles.chartValue} numberOfLines={1}>
                              {item.count > 0 ? item.count : ""}
                            </Text>

                            <View style={styles.chartBarArea}>
                              <View
                                style={[
                                  styles.chartBar,
                                  {
                                    height: `${Math.max(
                                      (item.count / maxActivity) * 100,
                                      item.count > 0 ? 8 : 0
                                    )}%`,
                                  },
                                ]}
                              />
                            </View>

                            <Text style={styles.chartLabel} numberOfLines={1}>
                              {showDateLabel ? item.label : ""}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <Text style={styles.chartFootnote}>
                    {activityFilter === "7"
                      ? "Daily applications over the last 7 days"
                      : activityFilter === "30"
                        ? "Daily applications over the last 30 days"
                        : "Monthly applications · latest 6 months shown"}
                  </Text>
                </>
              )}
            </View>

            {/* Posting Performance */}
            <SectionTitle title="Posting Performance" />

            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>
                Your top postings ranked by applicants
              </Text>

              {postingPerformance.length === 0 ? (
                <EmptyMessage message="Your job posting performance will appear here once you publish a job." />
              ) : (
                postingPerformance.map((job, index) => {
                  const maxApplicants = Math.max(
                    ...postingPerformance.map(
                      (item) => item.applicantCount
                    ),
                    1
                  );

                  return (
                    <View
                      key={job.id}
                      style={[
                        styles.performanceItem,
                        index !== postingPerformance.length - 1 &&
                          styles.performanceDivider,
                      ]}
                    >
                      <View style={styles.performanceTitleRow}>
                        <View style={styles.performanceTitleWrap}>
                          <Text
                            style={styles.performanceTitle}
                            numberOfLines={1}
                          >
                            {job.title}
                          </Text>

                          <Text style={styles.performanceMeta}>
                            {job.status || "Unknown status"}
                          </Text>
                        </View>

                        <Text style={styles.applicantCount}>
                          {job.applicantCount}{" "}
                          {job.applicantCount === 1
                            ? "applicant"
                            : "applicants"}
                        </Text>
                      </View>

                      <View style={styles.performanceBarBackground}>
                        <View
                          style={[
                            styles.performanceBar,
                            {
                              width: `${
                                (job.applicantCount / maxApplicants) *
                                100
                              }%`,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.performanceDetails}>
                        <Text style={styles.performanceDetailText}>
                          {job.pendingCount} pending
                        </Text>

                        <Text style={styles.performanceDetailText}>
                          {job.acceptedCount} accepted
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}

              {activeJobs.length > 5 && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() =>
                    router.push("/(tabs)/(employer)/jobs")
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.seeAllText}>
                    View all job postings
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#2623D3"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Job Overview */}
            <SectionTitle title="Job Overview" />

            <View style={styles.card}>
              <OverviewRow
                label="Open Job Postings"
                value={openJobs}
                icon="checkmark-circle-outline"
                color="#15803D"
              />

              <View style={styles.divider} />

              <OverviewRow
                label="Closed Job Postings"
                value={closedJobs}
                icon="lock-closed-outline"
                color="#B91C1C"
              />

              <View style={styles.divider} />

              <OverviewRow
                label="Rejected Applications"
                value={rejected}
                icon="close-circle-outline"
                color="#B91C1C"
              />
            </View>

            {/* Recent Applications */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent Applications
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push("/(tabs)/(employer)/applicants")
                }
              >
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentContainer}>
              {recentApplicants.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="document-text-outline"
                    size={42}
                    color="#CBD5E1"
                  />

                  <Text style={styles.emptyTitle}>
                    No applications yet
                  </Text>

                  <Text style={styles.emptySubtitle}>
                    Applications submitted to your jobs will appear here.
                  </Text>
                </View>
              ) : (
                recentApplicants.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.applicantRow,
                      index !== recentApplicants.length - 1 &&
                        styles.applicantDivider,
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push(
                        `/employerModal/applicant-detail/${item.id}`
                      )
                    }
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {item.applicantName
                          .split(" ")
                          .filter(Boolean)
                          .map((name) => name[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.applicantInfo}>
                      <Text
                        style={styles.applicantName}
                        numberOfLines={1}
                      >
                        {item.applicantName}
                      </Text>

                      <Text
                        style={styles.jobTitle}
                        numberOfLines={1}
                      >
                        {item.jobTitle}
                      </Text>

                      <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString(
                          "en-PH",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusBackground(
                            item.status
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(item.status),
                          },
                        ]}
                      >
                        {item.status || "Pending"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable statistics card
function StatCard({
  icon,
  title,
  value,
  color,
  background,
  detail,
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </View>
  );
}

// Section heading
function SectionTitle({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// Job overview row
function OverviewRow({ label, value, icon, color }) {
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewLeft}>
        <Ionicons name={icon} size={19} color={color} />
        <Text style={styles.overviewLabel}>{label}</Text>
      </View>

      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

// Application status legend
function StatusLegend({ label, value, color }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
        ]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

// Empty state for analytics
function EmptyMessage({ message }) {
  return (
    <View style={styles.inlineEmptyState}>
      <Text style={styles.inlineEmptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111C4B",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2623D3",
    marginTop: 5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111C4B",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "600",
  },
  statDetail: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111C4B",
  },
  viewAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusBar: {
    height: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  statusSegment: {
    height: "100%",
  },
  statusLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 17,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111C4B",
  },
  mutedNote: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 12,
  },
  activityHeader: {
    gap: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  filterRow: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    padding: 3,
    borderRadius: 9,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  filterButtonActive: {
    backgroundColor: "#2623D3",
  },
  filterText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  chart: {
    height: 150,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 18,
  },
  chartColumn: {
  flex: 1,
  minWidth: 0,
  alignItems: "center",
},

  chartValue: {
    height: 17,
    width: "100%",
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },

  chartBarArea: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  chartBar: {
    width: "65%",
    minHeight: 0,
    backgroundColor: "#6366F1",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },

  chartLabel: {
    width: "100%",
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 7,
    textAlign: "center",
  },
  chartFootnote: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 10,
  },
  performanceItem: {
    paddingVertical: 14,
  },
  performanceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  performanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  performanceTitleWrap: {
    flex: 1,
  },
  performanceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
  },
  performanceMeta: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    textTransform: "capitalize",
  },
  applicantCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  performanceBarBackground: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#EEF2FF",
    overflow: "hidden",
    marginTop: 10,
  },
  performanceBar: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#6366F1",
  },
  performanceDetails: {
    flexDirection: "row",
    gap: 14,
    marginTop: 7,
  },
  performanceDetailText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  overviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  overviewLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111C4B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  recentContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 14,
  },
  applicantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  applicantDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2623D3",
  },
  applicantInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 6,
  },
  applicantName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
  },
  jobTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  dateText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 15,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  inlineEmptyState: {
    paddingVertical: 22,
    alignItems: "center",
  },
  inlineEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  chartScrollContent: {
  flexDirection: "row",
  gap: 5,
  height: 150,
  paddingRight: 10,
  },

  chartColumn30: {
    width: 32,
    flexShrink: 0,
    alignItems: "center",
  },
});
