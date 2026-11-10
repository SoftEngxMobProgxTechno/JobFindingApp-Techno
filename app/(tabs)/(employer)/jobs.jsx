
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopNav } from "../../../components/Navigations";
import styles from "../../../components/stylesIn";
import { supabase } from "../../../lib/supabase";

const SUGGESTED_SKILLS = [
  "React Native",
  "React.js",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "UI/UX Design",
  "Figma",
  "Python",
  "PostgreSQL",
  "Flutter",
  "Tailwind CSS",
];

const SUGGESTED_REQUIREMENTS = [
  "Bachelor's Degree in IT/CS",
  "2+ Years Experience",
  "Strong Portfolio",
  "Good Communication Skills",
  "Problem Solving Mindset",
  "Team Collaboration",
];

export default function EmployerJobsScreen() {
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // Create Form State
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [position, setPosition] = useState("Full-Time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryInterval, setSalaryInterval] = useState("mo");
  const [description, setDescription] = useState("");

  // Posting Allowance State
  const [postingInfo, setPostingInfo] = useState({
    freeTrialAvailable: true,
    plan: null,
    monthlyLimit: 0,
    postsUsed: 0,
    remaining: 0,
    requiresPayPerPost: false,
  });

  const [usePayPerPost, setUsePayPerPost] = useState(false);

  // Featured Job State
  const [useFeatured, setUseFeatured] = useState(false);

  // Requirements Pills State
  const [reqInput, setReqInput] = useState("");
  const [selectedRequirements, setSelectedRequirements] = useState([]);

  // Skill Pills State
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);

  // Check employer's available posting allowance
  const loadPostingInfo = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Please log in again.");

    // Check whether the free trial has already been used.
    const { data: billing, error: billingError } = await supabase
      .from("employer_billing_accounts")
      .select("free_trial_used")
      .eq("employer_id", user.id)
      .maybeSingle();

    if (billingError) throw billingError;

    const freeTrialAvailable = !billing?.free_trial_used;

    if (freeTrialAvailable) {
      setPostingInfo({
        freeTrialAvailable: true,
        plan: null,
        monthlyLimit: 0,
        postsUsed: 0,
        remaining: 0,
        requiresPayPerPost: false,
      });

      setUsePayPerPost(false);
      return;
    }

    // Check for an active subscription.
    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("employer_subscriptions")
        .select("plan, monthly_post_limit, expires_at")
        .eq("employer_id", user.id)
        .eq("status", "Active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    let postsUsed = 0;
    let remaining = 0;

    if (subscription) {
      // Get the current month using Philippine time.
      const dateParts = new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
      }).formatToParts(new Date());

      const year = dateParts.find(
        (part) => part.type === "year"
      ).value;

      const month = dateParts.find(
        (part) => part.type === "month"
      ).value;

      const monthStart = `${year}-${month}-01`;

      const { data: usage, error: usageError } = await supabase
        .from("employer_monthly_usage")
        .select("posts_used")
        .eq("employer_id", user.id)
        .eq("month_start", monthStart)
        .maybeSingle();

      if (usageError) throw usageError;

      postsUsed = usage?.posts_used || 0;

      remaining = Math.max(
        0,
        subscription.monthly_post_limit - postsUsed
      );
    }

    const requiresPayPerPost = !subscription || remaining <= 0;

    setPostingInfo({
      freeTrialAvailable: false,
      plan: subscription?.plan || null,
      monthlyLimit: subscription?.monthly_post_limit || 0,
      postsUsed,
      remaining,
      requiresPayPerPost,
    });

    setUsePayPerPost(false);
  };

  const handlePostJob = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert("Login Required", "Please log in first.");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, verification_status")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile.role !== "Employer") {
        Alert.alert(
          "Access Denied",
          "Only employers can post jobs."
        );
        return;
      }

      switch (profile.verification_status) {
        case "Verified":
          await loadPostingInfo();
          setUseFeatured(false);
          setModalVisible(true);
          break;

        case "Pending":
          Alert.alert(
            "Verification Pending",
            "Your employer verification is still under review."
          );
          break;

        case "Rejected":
        case "Not Submitted":
          Alert.alert(
            "Verification Required",
            "You must verify your employer account before posting jobs.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Get Verified",
                onPress: () => router.push("/getVerified"),
              },
            ]
          );
          break;

        default:
          Alert.alert(
            "Verification Required",
            "Your verification status could not be confirmed."
          );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Unable to check verification status."
      );
    }
  };

  // Reload employer jobs when screen is focused
  const loadJobs = async () => {
    setLoadingJobs(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setJobs([]);
        return;
      }

      // Get jobs that have not been archived.
      const { data, error } = await supabase
        .from("jobLists")
        .select("*")
        .eq("employer_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const {
        data: verification,
        error: verificationError,
      } = await supabase
        .from("employer_verifications")
        .select("company_name")
        .eq("employer_id", user.id)
        .eq("status", "Verified")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationError) throw verificationError;

      // Get actual applicant counts for each job.
      const jobList = data || [];
      const jobIds = jobList.map((job) => job.id);

      let applications = [];

      if (jobIds.length > 0) {
        const {
          data: applicationData,
          error: applicationsError,
        } = await supabase
          .from("applications")
          .select("job_id")
          .in("job_id", jobIds);

        if (applicationsError) throw applicationsError;

        applications = applicationData || [];
      }

      // Count applications for each job.
      const applicantCounts = {};

      applications.forEach((application) => {
        const jobId = application.job_id;

        applicantCounts[jobId] =
          (applicantCounts[jobId] || 0) + 1;
      });

      setJobs(
        jobList.map((job) => ({
          ...job,
          position: job.job_type,
          companyName: verification?.company_name || "My Company",
          applicantsCount: applicantCounts[job.id] || 0,
          skillRequirements: job.skills || "",
          status: job.status.toLowerCase(),
        }))
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Unable to load jobs."
      );
    } finally {
      setLoadingJobs(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [])
  );

  const filteredJobs = jobs.filter(
    (job) =>
      job.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      job.companyName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleAddRequirement = (reqToAdd) => {
    const formatted = reqToAdd.trim();

    if (
      formatted &&
      !selectedRequirements.includes(formatted)
    ) {
      setSelectedRequirements([
        ...selectedRequirements,
        formatted,
      ]);
    }

    setReqInput("");
  };

  const handleRemoveRequirement = (reqToRemove) => {
    setSelectedRequirements(
      selectedRequirements.filter(
        (r) => r !== reqToRemove
      )
    );
  };

  const handleAddSkill = (skillToAdd) => {
    const formatted = skillToAdd.trim();

    if (
      formatted &&
      !selectedSkills.includes(formatted)
    ) {
      setSelectedSkills([...selectedSkills, formatted]);
    }

    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSelectedSkills(
      selectedSkills.filter(
        (s) => s !== skillToRemove
      )
    );
  };

  const handleCreateJob = async () => {
    if (publishing) return;

    if (
      !title.trim() ||
      !location.trim() ||
      !description.trim() ||
      !salaryMin.trim() ||
      !salaryMax.trim()
    ) {
      Alert.alert(
        "Missing Fields",
        "Fill in the title, location, description and salary range."
      );
      return;
    }

    const min = Number(salaryMin);
    const max = Number(salaryMax);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      max < min
    ) {
      Alert.alert(
        "Invalid Salary",
        "Enter a valid minimum and maximum salary."
      );
      return;
    }

    // Require explicit agreement to the ₱99 option.
    if (
      postingInfo.requiresPayPerPost &&
      !usePayPerPost
    ) {
      Alert.alert(
        "Additional Posting Required",
        "Your free trial or monthly posting allowance is unavailable. Please agree to the ₱99 additional posting option to continue."
      );
      return;
    }

    setPublishing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      // Create the job through the Supabase RPC.
      const { data, error } = await supabase.rpc(
        "create_employer_job",
        {
          p_job: {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            job_type: position,
            salary: `₱${salaryMin} - ₱${salaryMax} / ${salaryInterval}`,
            requirements: selectedRequirements.join(", "),
            skills: selectedSkills.join(", "),
          },
          p_use_pay_per_post: usePayPerPost,
        }
      );

      if (error) throw error;

      // Activate Featured promotion if selected.
      let featuredActivated = false;
      let featuredError = null;

      if (useFeatured) {
        const { error: featureRpcError } = await supabase.rpc(
          "feature_employer_job",
          {
            p_job_id: data.job_id,
          }
        );

        if (featureRpcError) {
          featuredError = featureRpcError;
        } else {
          featuredActivated = true;
        }
      }

      setModalVisible(false);

      // Reset form fields.
      setTitle("");
      setLocation("");
      setPosition("Full-Time");
      setSalaryMin("");
      setSalaryMax("");
      setSalaryInterval("mo");
      setDescription("");
      setReqInput("");
      setSkillInput("");
      setSelectedRequirements([]);
      setSelectedSkills([]);
      setUsePayPerPost(false);
      setUseFeatured(false);

      await loadJobs();

      const message =
        data.posting_type === "Free Trial"
          ? "Your first job post was published using your free trial."
          : data.posting_type === "Subscription"
            ? "Your job post was published using your monthly allowance."
            : "Your job post was published. ₱99 additional posting was recorded as a simulated MVP transaction.";

      if (useFeatured && featuredActivated) {
        Alert.alert(
          "Job Published and Featured!",
          `${message}\n\nYour job is now Featured for 30 days. The ₱49 promotion was recorded as a simulated MVP transaction.`
        );
      } else if (useFeatured && featuredError) {
        Alert.alert(
          "Job Published",
          `${message}\n\nHowever, the Featured promotion could not be activated. You can try featuring this job again from My Job Postings.`
        );
      } else {
        Alert.alert("Success", message);
      }
    } catch (error) {
      Alert.alert(
        "Unable to Publish",
        error.message || "Please try again."
      );
    } finally {
      setPublishing(false);
    }
  };

  const matchingReqSuggestions =
    reqInput.trim().length > 0
      ? SUGGESTED_REQUIREMENTS.filter(
          (r) =>
            r
              .toLowerCase()
              .includes(reqInput.toLowerCase()) &&
            !selectedRequirements.includes(r)
        )
      : [];

  const matchingSkillSuggestions =
    skillInput.trim().length > 0
      ? SUGGESTED_SKILLS.filter(
          (s) =>
            s
              .toLowerCase()
              .includes(skillInput.toLowerCase()) &&
            !selectedSkills.includes(s)
        )
      : [];

  return (
    <SafeAreaView style={styles.homeContainer}>
      <TopNav />

      {/* Header Banner */}
      <View style={styles.employerHeader}>
        <View>
          <Text style={styles.employerHeaderTitle}>
            My Job Postings
          </Text>
          <Text style={styles.employerHeaderSubtitle}>
            Manage and review active vacancies
          </Text>
        </View>

        <TouchableOpacity
          style={styles.employerPostBtn}
          onPress={handlePostJob}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.employerPostBtnText}>
            Post Job
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <View style={styles.homeSearchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#7381A2"
          />

          <TextInput
            style={styles.homeSearchInput}
            placeholder="Search job title or company..."
            placeholderTextColor="#7381A2"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#7381A2"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Job List Feed */}
      <FlatList
        data={filteredJobs}
        refreshing={loadingJobs}
        onRefresh={loadJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <Ionicons
              name="briefcase-outline"
              size={48}
              color="#CBD5E1"
            />

            <Text
              style={{
                fontSize: 14,
                color: "#7381A2",
                marginTop: 8,
                fontWeight: "600",
              }}
            >
              No job postings found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.jobCardCard}
            activeOpacity={0.9}
            onPress={() =>
              router.push(`/employerModal/jobList/${item.id}`)
            }
          >
            <View style={styles.jobCardIconBox}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#2623D3",
                }}
              >
                {item.companyName[0]}
              </Text>
            </View>

            <View style={styles.jobCardInfo}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={styles.jobCardTitle}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor:
                      item.status === "open"
                        ? "#DCFCE7"
                        : "#FEE2E2",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color:
                        item.status === "open"
                          ? "#166534"
                          : "#991B1B",
                    }}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.jobCardCompany}>
                {item.companyName}
              </Text>

              <View style={styles.jobCardMeta}>
                <Text style={styles.jobCardTag}>
                  {item.position}
                </Text>
                <Text style={styles.jobCardSalary}>
                  {item.salary}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 8,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={13}
                  color="#2623D3"
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#2623D3",
                  }}
                >
                  {item.applicantsCount} Applicants
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Job Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView
          style={styles.employerModalContainer}
          edges={["top", "bottom", "left", "right"]}
        >
          <View style={styles.employerModalTopBar}>
            <View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: "#111C4B",
                }}
              >
                Create Job Vacancy
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#7381A2",
                  marginTop: 2,
                }}
              >
                Fill in details to publish your listing
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.employerCloseModalBtn}
            >
              <Ionicons
                name="close"
                size={20}
                color="#111C4B"
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Posting Allowance Information */}
            <View
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 12,
                padding: 14,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 6,
                  color: "#111C4B",
                }}
              >
                Posting Allowance
              </Text>

              {postingInfo.freeTrialAvailable ? (
                <Text
                  style={{
                    color: "#15803D",
                    fontSize: 13,
                  }}
                >
                  Your first job post is FREE! Your one-time free trial will be used.
                </Text>
              ) : postingInfo.remaining > 0 ? (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#334155",
                    }}
                  >
                    {postingInfo.plan} Plan
                  </Text>

                  <Text
                    style={{
                      fontSize: 13,
                      color: "#15803D",
                      marginTop: 4,
                    }}
                  >
                    {postingInfo.remaining} of {postingInfo.monthlyLimit} monthly posts remaining.
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginTop: 4,
                    }}
                  >
                    This job will use one of your included monthly posts.
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#334155",
                      marginBottom: 10,
                    }}
                  >
                    {postingInfo.plan
                      ? `Your ${postingInfo.plan} monthly posting allowance has been used.`
                      : "Your free trial has already been used and you do not have an active subscription."}
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setUsePayPerPost(!usePayPerPost)
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        usePayPerPost
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={22}
                      color={
                        usePayPerPost
                          ? "#15803D"
                          : "#64748B"
                      }
                    />

                    <Text
                      style={{
                        fontSize: 13,
                        marginLeft: 8,
                        flex: 1,
                        color: "#334155",
                      }}
                    >
                      Use additional job post — ₱99
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      marginTop: 6,
                    }}
                  >
                    This is a simulated transaction for the MVP demonstration.
                  </Text>
                </>
              )}
            </View>

            {/* Featured Job Option */}
            <View
              style={{
                backgroundColor: "#FFFBEB",
                borderRadius: 12,
                padding: 14,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: "#FDE68A",
              }}
            >
              <TouchableOpacity
                onPress={() => setUseFeatured(!useFeatured)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={
                    useFeatured
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={22}
                  color={useFeatured ? "#D97706" : "#64748B"}
                />

                <View style={{ flex: 1, marginLeft: 9 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#92400E",
                    }}
                  >
                    Feature this job — ₱49
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#78350F",
                      marginTop: 3,
                    }}
                  >
                    Give your job priority placement in the Job Seeker feed.
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={{
                  marginTop: 10,
                  paddingTop: 9,
                  borderTopWidth: 1,
                  borderTopColor: "#FDE68A",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#92400E",
                  }}
                >
                  Featured jobs display a Featured badge and receive priority placement for 30 days.
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: "#A16207",
                    marginTop: 5,
                  }}
                >
                  This is a simulated transaction for the MVP demonstration.
                </Text>
              </View>
            </View>

            <Text style={styles.employerLabel}>
              Job Title
            </Text>
            <TextInput
              style={styles.employerInput}
              placeholder="e.g. Senior Full Stack Developer"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.employerLabel}>
              Job Location
            </Text>
            <TextInput
              style={styles.employerInput}
              placeholder="e.g. Cagayan de Oro / Remote"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.employerLabel}>
              Employment Type
            </Text>
            <View style={styles.employerToggleRow}>
              {[
                "Full-Time",
                "Part-Time",
                "Contract",
                "Internship",
              ].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.employerToggleChip,
                    position === type &&
                      styles.employerToggleChipActive,
                  ]}
                  onPress={() => setPosition(type)}
                >
                  <Text
                    style={[
                      styles.employerToggleChipText,
                      position === type &&
                        styles.employerToggleChipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.employerLabel}>
              Salary Range (Automatic Formatting)
            </Text>

            <View style={styles.employerSalaryRow}>
              <View style={styles.employerCurrencyBox}>
                <Text style={styles.employerCurrencyText}>
                  ₱
                </Text>
              </View>

              <TextInput
                style={[
                  styles.employerInput,
                  { flex: 1, marginTop: 0 },
                ]}
                placeholder="Min (e.g. 40k)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={salaryMin}
                onChangeText={setSalaryMin}
              />

              <Text
                style={{
                  color: "#7381A2",
                  fontWeight: "700",
                }}
              >
                to
              </Text>

              <TextInput
                style={[
                  styles.employerInput,
                  { flex: 1, marginTop: 0 },
                ]}
                placeholder="Max (e.g. 60k)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={salaryMax}
                onChangeText={setSalaryMax}
              />

              <TouchableOpacity
                style={styles.employerIntervalBadge}
                onPress={() =>
                  setSalaryInterval(
                    salaryInterval === "mo" ? "yr" : "mo"
                  )
                }
              >
                <Text style={styles.employerIntervalText}>
                  /{salaryInterval}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.employerLabel}>
              Job Description
            </Text>
            <TextInput
              style={[
                styles.employerInput,
                {
                  height: 100,
                  textAlignVertical: "top",
                },
              ]}
              multiline
              placeholder="Describe core responsibilities and team context..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.employerLabel}>
              Requirements & Credentials (Interactive Pills)
            </Text>

            <View style={styles.employerSkillInputContainer}>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "#111C4B",
                  paddingVertical: 4,
                }}
                placeholder="Type requirement & press enter..."
                placeholderTextColor="#94A3B8"
                value={reqInput}
                onChangeText={setReqInput}
                onSubmitEditing={() =>
                  handleAddRequirement(reqInput)
                }
              />

              <TouchableOpacity
                onPress={() =>
                  handleAddRequirement(reqInput)
                }
                style={styles.employerAddSkillBtn}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>

            {matchingReqSuggestions.length > 0 && (
              <View style={styles.employerSuggestionsDropdown}>
                {matchingReqSuggestions.map(
                  (suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.employerSuggestionItem}
                      onPress={() =>
                        handleAddRequirement(suggestion)
                      }
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={13}
                        color="#0F172A"
                      />
                      <Text
                        style={styles.employerSuggestionText}
                      >
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {selectedRequirements.length > 0 && (
              <View style={styles.employerPillsContainer}>
                {selectedRequirements.map((req) => (
                  <View
                    key={req}
                    style={[
                      styles.employerSkillPill,
                      {
                        backgroundColor: "#F1F5F9",
                        borderColor: "#CBD5E1",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#0F172A"
                    />

                    <Text
                      style={[
                        styles.employerSkillPillText,
                        { color: "#0F172A" },
                      ]}
                    >
                      {req}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        handleRemoveRequirement(req)
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color="#0F172A"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text
              style={[
                styles.employerLabel,
                { marginTop: 16 },
              ]}
            >
              Key Skill Requirements (Interactive Pills)
            </Text>

            <View style={styles.employerSkillInputContainer}>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "#111C4B",
                  paddingVertical: 4,
                }}
                placeholder="Type skill & press enter..."
                placeholderTextColor="#94A3B8"
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={() =>
                  handleAddSkill(skillInput)
                }
              />

              <TouchableOpacity
                onPress={() => handleAddSkill(skillInput)}
                style={styles.employerAddSkillBtn}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>

            {matchingSkillSuggestions.length > 0 && (
              <View style={styles.employerSuggestionsDropdown}>
                {matchingSkillSuggestions.map(
                  (suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.employerSuggestionItem}
                      onPress={() =>
                        handleAddSkill(suggestion)
                      }
                    >
                      <Ionicons
                        name="sparkles"
                        size={12}
                        color="#2623D3"
                      />
                      <Text
                        style={styles.employerSuggestionText}
                      >
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {selectedSkills.length > 0 && (
              <View style={styles.employerPillsContainer}>
                {selectedSkills.map((skill) => (
                  <View
                    key={skill}
                    style={styles.employerSkillPill}
                  >
                    <Text style={styles.employerSkillPillText}>
                      {skill}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        handleRemoveSkill(skill)
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color="#2623D3"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Sticky Bottom Action Footer */}
          <View style={styles.detailsFooter}>
            <TouchableOpacity
              style={styles.detailsApply}
              onPress={handleCreateJob}
              disabled={publishing}
              activeOpacity={0.85}
            >
              {publishing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.detailsApplyText}>
                  Publish Job Listing
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
