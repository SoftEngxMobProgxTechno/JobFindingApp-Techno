
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import JobCard from "../../components/JobCard";
import styles from "../../components/stylesIn";
import { supabase } from "../../lib/supabase";

function getReputationTier(score) {
  if (score >= 90) return "Highly Reliable";
  if (score >= 75) return "Reliable";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";
  return "Poor Reliability";
}

export default function AllJobList() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const title = params.title || "All Jobs";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllJobs = async () => {
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

      const formattedJobs = (data || []).map((job) => ({
        ...job,
        company: job.profiles?.name || "Employer",
        company_name: job.profiles?.name || "Employer",
        type: job.job_type,
        icon: "briefcase-outline",
        color: "#E9ECFF",
      }));

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

      const jobsWithReputation = formattedJobs.map((job) => {
        const score = reputationByEmployer[job.employer_id];

        return {
          ...job,
          reputation_score: Number.isFinite(score) ? score : null,
          reputation_tier: Number.isFinite(score)
            ? getReputationTier(score)
            : null,
        };
      });

      setJobs(jobsWithReputation);
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Unable to load jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllJobs();
  }, []);

  const openJob = (id) => {
    router.push({
      pathname: "/jobseekerModal/details/[id]",
      params: { id: String(id) },
    });
  };

  return (
    <SafeAreaView style={styles.homeContainer} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingBottom: 6,
          backgroundColor: "#F6F8FF",
          borderBottomWidth: 1,
          borderColor: "#EEF0F8",
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Feather name="arrow-left" size={20} color="#111C4B" />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111C4B" }}>
          {title}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: 20, paddingBottom: 30 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 40 }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {jobs.map((job) => (
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
                  marginTop: 40,
                  color: "#7381A2",
                  fontSize: 14,
                }}
              >
                No jobs available right now.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
