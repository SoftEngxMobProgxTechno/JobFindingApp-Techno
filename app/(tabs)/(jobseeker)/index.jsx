
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import JobCard from "../../../components/JobCard";
import { TopNav } from "../../../components/Navigations";
import styles from "../../../components/stylesIn";
import { supabase } from "../../../lib/supabase";

const QUICK_CATEGORIES = [
  { label: "Internship / OJT", type: "Internship / OJT" },
  { label: "Full-Time", type: "Full-Time" },
  { label: "Part-Time", type: "Part-Time" },
  { label: "Contract", type: "Contract" },
];

function getReputationTier(score) {
  if (score >= 90) return "Highly Reliable";
  if (score >= 75) return "Reliable";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";
  return "Poor Reliability";
}

export default function HomePageOption1() {
  const router = useRouter();

  const [jobs, setJobs] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);

    try {
      // 1. Fetch active open jobs
      const { data: jobData, error: jobError } = await supabase
        .from("jobLists")
        .select(`
          *,
          profiles:employer_id (
            name
          )
        `)
        .eq("status", "Open")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (jobError) throw jobError;

      // 2. Fetch employer verification records
      const {
        data: verificationData,
        error: verificationError,
      } = await supabase
        .from("employer_verifications")
        .select("employer_id, company_name");

      if (verificationError) {
        console.warn(
          "Error fetching verifications:",
          verificationError.message
        );
      }

      // 3. Build company name lookup
      const companyMap = {};

      if (verificationData) {
        verificationData.forEach((item) => {
          if (item.employer_id && item.company_name) {
            companyMap[item.employer_id] = item.company_name;
          }
        });
      }

      // 4. Format jobs with verified company name
      const formattedJobs = (jobData || []).map((job) => {
        const verifiedCompany = companyMap[job.employer_id];
        const profileName = job.profiles?.name;

        const resolvedCompanyName =
          verifiedCompany || profileName || "Employer";

        return {
          ...job,
          company: resolvedCompanyName,
          company_name: resolvedCompanyName,
          type: job.job_type,
          icon: "briefcase-outline",
          color: "#E9ECFF",
        };
      });

      // 5. Fetch employer reputation scores
      const employerIds = [
        ...new Set(
          formattedJobs
            .map((job) => job.employer_id)
            .filter(Boolean)
        ),
      ];

      let reputationByEmployer = {};

      if (employerIds.length > 0) {
        const {
          data: reputationRows,
          error: reputationError,
        } = await supabase
          .from("employer_reputation")
          .select("employer_id, score")
          .in("employer_id", employerIds);

        if (!reputationError && reputationRows) {
          reputationByEmployer = reputationRows.reduce(
            (result, row) => {
              result[row.employer_id] = Number(row.score);
              return result;
            },
            {}
          );
        } else if (reputationError) {
          console.warn(
            "Unable to load employer reputation:",
            reputationError.message
          );
        }
      }

      // 6. Attach reputation score and tier to each job
      const jobsWithReputation = formattedJobs.map((job) => {
        const score = reputationByEmployer[job.employer_id];

        return {
          ...job,
          reputation_score: Number.isFinite(score)
            ? score
            : null,
          reputation_tier: Number.isFinite(score)
            ? getReputationTier(score)
            : null,
        };
      });

      // 7. Filter active featured jobs
      const now = new Date();

      const activeFeaturedJobs = jobsWithReputation.filter(
        (job) =>
          job.is_featured === true &&
          job.featured_until &&
          new Date(job.featured_until) > now
      );

      // 8. Update states
      setJobs(jobsWithReputation);
      setFeaturedJobs(activeFeaturedJobs);

    } catch (error) {
      console.error("Error fetching jobs:", error);

      Alert.alert(
        "Error",
        error.message || "Unable to load jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const openJob = (id) => {
    router.push({
      pathname: "/jobseekerModal/details/[id]",
      params: { id },
    });
  };

  const openCategorySearch = (type) => {
    router.push({
      pathname: "/jobseekerModal/search/searchedDisplay",
      params: { jobType: type },
    });
  };

  const openAllJobs = () => {
    router.push({
      pathname: "/jobseekerModal/allJobList",
      params: { title: "Latest Jobs" },
    });
  };

  return (
    <SafeAreaView style={styles.homeContainer} edges={["top"]}>
      <TopNav />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
      >
        {/* Quick Category Pills */}
        <View style={{ marginBottom: 25 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.type}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#EEF0F8",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 50,
                }}
                activeOpacity={0.7}
                onPress={() => openCategorySearch(cat.type)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#2623D3",
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {/* Featured Jobs */}
            <View style={styles.homeSectionHeader}>
              <View style={styles.homeHeadingRow}>
                <MaterialCommunityIcons
                  name="creation"
                  size={22}
                  color="#2623D3"
                />
                <Text style={styles.homeHeading}>
                  Featured Jobs
                </Text>
              </View>
            </View>

            {featuredJobs.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.homeHorizontal}
              >
                {featuredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    featured={true}
                    onPress={() => openJob(job.id)}
                  />
                ))}
              </ScrollView>
            ) : (
              <View
                style={{
                  backgroundColor: "#F4F6F8",
                  borderRadius: 12,
                  padding: 10,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <MaterialCommunityIcons
                  name="star-outline"
                  size={28}
                  color="#94A3B8"
                />
                <Text
                  style={{
                    color: "#7381A2",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  No featured jobs available right now.
                </Text>
              </View>
            )}

            {/* Latest Jobs */}
            <View
              style={[
                styles.homeSectionHeader,
                { marginTop: 27 },
              ]}
            >
              <View style={styles.homeHeadingRow}>
                <Feather
                  name="briefcase"
                  size={21}
                  color="#2623D3"
                />
                <Text style={styles.homeHeading}>
                  Latest Jobs
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {jobs.slice(0, 8).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onPress={() => openJob(job.id)}
                />
              ))}

              {jobs.length === 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 30,
                    color: "#7381A2",
                  }}
                >
                  No jobs available right now.
                </Text>
              )}
            </View>

            {/* See More */}
            <TouchableOpacity
              style={{
                backgroundColor: "#EEF2FF",
                borderRadius: 1000,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                flexDirection: "row",
                marginTop: 12,
                gap: 4,
              }}
              activeOpacity={0.7}
              onPress={openAllJobs}
            >
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 12,
                  color: "#2623D3",
                }}
              >
                See more
              </Text>

              <Feather
                name="chevron-right"
                size={18}
                color="#2623D3"
              />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
