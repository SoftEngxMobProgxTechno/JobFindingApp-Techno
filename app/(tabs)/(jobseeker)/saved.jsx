import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import JobCard from "../../../components/JobCard";
import { TopNav } from "../../../components/Navigations";
import styles from "../../../components/stylesIn";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";

const QUICK_CATEGORIES = [
  { label: "All", type: "All" },
  { label: "Internship / OJT", type: "Internship / OJT" },
  { label: "Full-Time", type: "Full-Time" },
  { label: "Part-Time", type: "Part-Time" },
  { label: "Contract", type: "Contract" },
];

export default function SavedJobsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchSavedJobs = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const savedIds = currentUser?.savedJobs || [];

      if (savedIds.length === 0) {
        setSavedJobs([]);
        setLoading(false);
        return;
      }

      // 1. Fetch saved job lists along with profiles
      const { data, error } = await supabase
        .from("jobLists")
        .select(`
          *,
          profiles:employer_id (
            name
          )
        `)
        .in("id", savedIds);

      if (error) throw error;

      // 2. Fetch employer verifications for company names
      const { data: verificationData, error: verError } = await supabase
        .from("employer_verifications")
        .select("employer_id, company_name");

      if (verError && verError.code !== "PGRST116") {
        console.warn("Error fetching verifications:", verError.message);
      }

      // 3. Build a lookup map of employer_id -> company_name
      const companyMap = {};
      if (verificationData) {
        verificationData.forEach((item) => {
          if (item.employer_id && item.company_name) {
            companyMap[item.employer_id] = item.company_name;
          }
        });
      }

      // 4. Format jobs with the verified company name fallback
      const formattedJobs = (data || []).map((job) => {
        const verifiedCompany = companyMap[job.employer_id];
        const profileName = job.profiles?.name;
        const resolvedCompanyName = verifiedCompany || profileName || "Employer";

        return {
          ...job,
          company: resolvedCompanyName,
          company_name: resolvedCompanyName,
          type: job.job_type,
          icon: "briefcase-outline",
          color: "#E9ECFF",
        };
      });

      setSavedJobs(formattedJobs);
    } catch (error) {
      setLoadError(error.message || "Unable to load saved jobs.");
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSavedJobs();
    }, [currentUser?.savedJobs])
  );

  const openJob = (id) => {
    router.push({
      pathname: "/jobseekerModal/details/[id]",
      params: { id: String(id) },
    });
  };

  const filteredSavedJobs =
    selectedCategory === "All"
      ? savedJobs
      : savedJobs.filter((job) => {
          const jobType = (job.type || "").toLowerCase().trim();
          const category = selectedCategory.toLowerCase().trim();

          if (category === "internship / ojt") {
            return jobType.includes("internship") || jobType.includes("ojt");
          }

          return jobType === category;
        });

  return (
    <SafeAreaView style={styles.homeContainer} edges={["top"]}>
      <TopNav />

      <ScrollView
        contentContainerStyle={[styles.homeContent, { paddingBottom: 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.jobAppsHeading}>Bookmarks</Text>

        {/* Quick Category Filter Pills */}
        <View style={styles.quickCatSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickCatRow}
          >
            {QUICK_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.type;
              return (
                <TouchableOpacity
                  key={cat.type}
                  style={[
                    styles.quickCatPill,
                    isActive && styles.quickCatPillActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat.type)}
                >
                  <Text
                    style={[
                      styles.quickCatPillText,
                      isActive && styles.quickCatPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 40 }}
          />
        ) : filteredSavedJobs.length > 0 ? (
          <View style={styles.savedListContainer}>
            {filteredSavedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPress={() => openJob(job.id)}
              />
            ))}
          </View>
        ) : savedJobs.length > 0 ? (
          <View style={styles.jobAppsEmptyContainer}>
            <Feather name="filter" size={44} color="#A1AAC0" />
            <Text style={styles.jobAppsEmptyTitle}>
              No {selectedCategory} jobs saved
            </Text>
            <Text style={styles.savedEmptyBody}>
              You haven't bookmarked any jobs under this category yet.
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedCategory("All")}
              style={styles.jobAppsEmptyButton}
            >
              <Text style={styles.jobAppsEmptyButtonText}>
                Show All Saved Jobs
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.jobAppsEmptyContainer}>
            <Feather name="bookmark" size={48} color="#A1AAC0" />
            <Text style={styles.jobAppsEmptyTitle}>No saved jobs yet</Text>
            <Text style={styles.savedEmptyBody}>
              Browse jobs on the Home tab and tap the bookmark icon to save the
              ones you like.
            </Text>
            <TouchableOpacity
              onPress={() => router.navigate("/(tabs)/(jobseeker)")}
              style={styles.jobAppsEmptyButton}
            >
              <Text style={styles.jobAppsEmptyButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}