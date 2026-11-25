
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import JobCard from "../../../components/JobCard";
import styles from "../../../components/stylesIn";
import { supabase } from "../../../lib/supabase";

function getReputationTier(score) {
  if (score >= 90) return "Highly Reliable";
  if (score >= 75) return "Reliable";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";
  return "Poor Reliability";
}

export default function SearchedDisplay() {
  const router = useRouter();

  const {
    query = "",
    jobType = "All",
    location = "",
    skill = "",
  } = useLocalSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchFilteredJobs = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
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

        if (error) throw error;

        if (!active) return;

        const formatted = (data || []).map((job) => ({
          ...job,
          company: job.profiles?.name || "Employer",
          company_name: job.profiles?.name || "Employer",
          type: job.job_type,
          icon: "briefcase-outline",
          color: "#EEF2FF",
        }));

        const employerIds = [
          ...new Set(
            formatted
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
            reputationByEmployer = reputationRows.reduce((result, row) => {
              result[row.employer_id] = Number(row.score);
              return result;
            }, {});
          } else if (reputationError) {
            console.warn(
              "Unable to load employer reputation:",
              reputationError.message
            );
          }
        }

        if (!active) return;

        const jobsWithReputation = formatted.map((job) => {
          const score = reputationByEmployer[job.employer_id];

          return {
            ...job,
            reputation_score: Number.isFinite(score) ? score : null,
            reputation_tier: Number.isFinite(score)
              ? getReputationTier(score)
              : null,
          };
        });

        const keyword = String(query || "").toLowerCase().trim();
        const selectedType = String(jobType || "All").toLowerCase();

        const filtered = jobsWithReputation.filter((job) => {
          const searchText = [
            job.title,
            job.company,
            job.location,
            job.skills,
          ]
            .map((val) =>
              Array.isArray(val) ? val.join(" ") : String(val || "")
            )
            .join(" ")
            .toLowerCase();

          const type = String(job.job_type || job.type || "").toLowerCase();

          const matchesType =
            selectedType === "all" ||
            (selectedType === "internship / ojt"
              ? type.includes("internship") || type.includes("ojt")
              : type.replace(/[\s-]/g, "") ===
                selectedType.replace(/[\s-]/g, ""));

          const locationValue = String(location || "").trim();

          const matchesLocation =
            !locationValue ||
            String(job.location || "")
              .toLowerCase()
              .includes(locationValue.toLowerCase());

          const skillValue = String(skill || "").trim();

          const matchesSkill =
            !skillValue ||
            String(
              Array.isArray(job.skills)
                ? job.skills.join(", ")
                : job.skills || ""
            )
              .toLowerCase()
              .includes(skillValue.toLowerCase());

          return (
            (!keyword || searchText.includes(keyword)) &&
            matchesType &&
            matchesLocation &&
            matchesSkill
          );
        });

        setJobs(filtered);
      } catch (error) {
        console.error("Error fetching searched jobs:", error);

        if (active) {
          setJobs([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFilteredJobs();

    return () => {
      active = false;
    };
  }, [query, jobType, location, skill]);

  const openSearchModal = () => {
    router.push({
      pathname: "/jobseekerModal/search/searchModal",
      params: { query, jobType, location, skill },
    });
  };

  const openJobDetails = (id) => {
    router.push({
      pathname: "/jobseekerModal/details/[id]",
      params: { id: String(id) },
    });
  };

  const activeFilters = [
    jobType !== "All" && jobType,
    String(location || "").trim() && `Location: ${location}`,
    String(skill || "").trim() && `Skill: ${skill}`,
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.employerModalTopBar, { gap: 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color="#111C4B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeSearchBox}
          activeOpacity={0.8}
          onPress={openSearchModal}
        >
          <Feather name="search" size={18} color="#7D87A0" />
          <Text
            style={[
              styles.homeSearchInput,
              { color: query ? "#111C4B" : "#9299AB" },
            ]}
          >
            {query || "Search job title, skill or company..."}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeFilter}
          onPress={openSearchModal}
        >
          <Feather name="sliders" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeFilters.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {activeFilters.map((filterText, index) => (
              <View key={index} style={styles.employerSkillPill}>
                <Text style={styles.employerSkillPillText}>
                  {filterText}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.homeSectionHeader}>
          <Text style={styles.homeHeading}>
            {loading ? "Searching..." : `${jobs.length} Jobs Found`}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 40 }}
          />
        ) : jobs.length > 0 ? (
          <View style={{ gap: 10 }}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPress={() => openJobDetails(job.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.jobAppsEmptyContainer}>
            <Feather name="search" size={48} color="#A1AAC0" />
            <Text style={styles.jobAppsEmptyTitle}>No matching jobs</Text>
            <Text style={styles.jobAppsEmptyBody}>
              Try adjusting your keywords or clearing some filters.
            </Text>
            <TouchableOpacity
              style={styles.jobAppsEmptyButton}
              onPress={openSearchModal}
            >
              <Text style={styles.jobAppsEmptyButtonText}>
                Modify Search
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
