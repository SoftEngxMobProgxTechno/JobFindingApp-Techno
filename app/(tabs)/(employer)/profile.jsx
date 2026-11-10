
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopNav } from "../../../components/Navigations";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";

const SUBSCRIPTION_PLANS = [
  {
    name: "Basic",
    price: 199,
    limit: 3,
    description: "For employers with occasional hiring needs.",
  },
  {
    name: "Plus",
    price: 399,
    limit: 8,
    description: "For growing businesses with regular hiring.",
    popular: true,
  },
  {
    name: "Pro",
    price: 699,
    limit: 15,
    description: "For businesses with frequent recruitment needs.",
  },
];

export default function EmployerProfile() {
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [billingInfo, setBillingInfo] = useState({
    freeTrialUsed: false,
    subscription: null,
    postsUsed: 0,
    remaining: 0,
  });

  const [activatingPlan, setActivatingPlan] = useState("");

  // Load billing information from Supabase.
  const fetchBillingInfo = async (employerId) => {
    const { data: billing, error: billingError } = await supabase
      .from("employer_billing_accounts")
      .select("free_trial_used")
      .eq("employer_id", employerId)
      .maybeSingle();

    if (billingError) throw billingError;

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("employer_subscriptions")
        .select(
          "plan, price, monthly_post_limit, started_at, expires_at"
        )
        .eq("employer_id", employerId)
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
        .eq("employer_id", employerId)
        .eq("month_start", monthStart)
        .maybeSingle();

      if (usageError) throw usageError;

      postsUsed = usage?.posts_used || 0;

      remaining = Math.max(
        0,
        subscription.monthly_post_limit - postsUsed
      );
    }

    return {
      freeTrialUsed: billing?.free_trial_used || false,
      subscription,
      postsUsed,
      remaining,
    };
  };

  // Load profile, verification, and billing information.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw authError;
          if (!user) throw new Error("Please log in again.");

          const { data: profileData, error: profileError } =
            await supabase
              .from("profiles")
              .select("id, name, email, role, verification_status")
              .eq("id", user.id)
              .single();

          if (profileError) throw profileError;

          const {
            data: verificationData,
            error: verificationError,
          } = await supabase
            .from("employer_verifications")
            .select(`
              company_name,
              branch,
              company_location,
              status,
              created_at
            `)
            .eq("employer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (verificationError) throw verificationError;

          const billingData = await fetchBillingInfo(user.id);

          if (active) {
            setProfile(profileData);
            setVerification(verificationData);
            setBillingInfo(billingData);
          }
        } catch (error) {
          if (active) {
            setErrorMessage(
              error.message || "Unable to load employer profile."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      };

      loadProfile();

      return () => {
        active = false;
      };
    }, [currentUser?.id])
  );

  // Activate a simulated subscription.
  const handleActivatePlan = (plan) => {
    Alert.alert(
      `Activate ${plan.name} Plan?`,
      `This will activate a simulated ${plan.name} subscription for ₱${plan.price}/month with ${plan.limit} job posts per month.${
        billingInfo.subscription
          ? "\n\nYour existing active subscription will be replaced."
          : ""
      }\n\nNo actual payment will be collected.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: async () => {
            if (activatingPlan) return;

            setActivatingPlan(plan.name);

            try {
              const { error } = await supabase.rpc(
                "activate_demo_subscription",
                {
                  p_plan: plan.name,
                }
              );

              if (error) throw error;

              const {
                data: { user },
                error: authError,
              } = await supabase.auth.getUser();

              if (authError) throw authError;
              if (!user) throw new Error("Please log in again.");

              const updatedBilling = await fetchBillingInfo(user.id);

              setBillingInfo(updatedBilling);

              Alert.alert(
                "Subscription Activated",
                `${plan.name} Plan has been activated successfully!\n\nYou now have ${plan.limit} job posts per month.\n\nThis is a simulated MVP transaction.`
              );
            } catch (error) {
              Alert.alert(
                "Unable to Activate Plan",
                error.message || "Please try again."
              );
            } finally {
              setActivatingPlan("");
            }
          },
        },
      ]
    );
  };

  const name = profile?.name || currentUser?.name || "Employer";
  const email = profile?.email || currentUser?.email || "";

  const verificationStatus =
    profile?.verification_status ||
    verification?.status ||
    "Not Submitted";

  const isVerified =
    verificationStatus.toLowerCase() === "verified";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "EM";

  const getStatusStyle = () => {
    switch (verificationStatus.toLowerCase()) {
      case "verified":
        return {
          backgroundColor: "#DCFCE7",
          color: "#15803D",
          icon: "checkmark-circle",
        };

      case "pending":
        return {
          backgroundColor: "#FEF3C7",
          color: "#B45309",
          icon: "time",
        };

      case "rejected":
        return {
          backgroundColor: "#FEE2E2",
          color: "#B91C1C",
          icon: "close-circle",
        };

      default:
        return {
          backgroundColor: "#F1F5F9",
          color: "#64748B",
          icon: "information-circle",
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopNav />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Employer Profile</Text>
          <Text style={styles.subtitle}>
            Your account and company information
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#2623D3" />
            <Text style={styles.stateText}>
              Loading profile...
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <Ionicons
              name="alert-circle-outline"
              size={45}
              color="#B91C1C"
            />

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() =>
                router.replace("/(tabs)/(employer)/profile")
              }
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Account Header */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              {/* Name and Verification Badge */}
              <View style={styles.nameStatusRow}>
                <Text style={styles.profileName}>{name}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusStyle.backgroundColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={statusStyle.icon}
                    size={13}
                    color={statusStyle.color}
                  />

                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: statusStyle.color },
                    ]}
                  >
                    {verificationStatus}
                  </Text>
                </View>
              </View>

              <Text style={styles.profileEmail}>{email}</Text>

              <View style={styles.roleBadge}>
                <Ionicons
                  name="briefcase-outline"
                  size={13}
                  color="#2623D3"
                />

                <Text style={styles.roleText}>
                  Employer Account
                </Text>
              </View>

              {!isVerified &&
                verificationStatus.toLowerCase() !== "pending" && (
                  <TouchableOpacity
                    style={styles.profileVerifyButton}
                    onPress={() => router.push("/getVerified")}
                  >
                    <Text style={styles.profileVerifyText}>
                      {verificationStatus.toLowerCase() === "rejected"
                        ? "Resubmit Verification"
                        : "Get Verified"}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color="#2623D3"
                    />
                  </TouchableOpacity>
                )}

              {verificationStatus.toLowerCase() === "pending" && (
                <Text style={styles.pendingNote}>
                  Your verification request is currently under review.
                </Text>
              )}
            </View>

            {/* Account Information */}
            <Text style={styles.sectionTitle}>
              Account Information
            </Text>

            <View style={styles.infoCard}>
              <InfoRow
                icon="person-outline"
                label="Full Name"
                value={name}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="mail-outline"
                label="Email Address"
                value={email}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="shield-checkmark-outline"
                label="Account Role"
                value={profile?.role || "Employer"}
              />
            </View>

            {/* Company Information */}
            <Text style={styles.sectionTitle}>
              Company Information
            </Text>

            <View style={styles.infoCard}>
              <InfoRow
                icon="business-outline"
                label="Company Name"
                value={verification?.company_name}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="git-branch-outline"
                label="Branch"
                value={verification?.branch}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="location-outline"
                label="Company Location"
                value={verification?.company_location}
              />
            </View>

            {/* Subscription and Posting Allowance */}
            <Text style={styles.sectionTitle}>
              Subscription & Posting Allowance
            </Text>

            <View style={styles.billingCard}>
              <View style={styles.billingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billingHeading}>
                    {billingInfo.subscription
                      ? `${billingInfo.subscription.plan} Plan`
                      : "No Active Subscription"}
                  </Text>

                  <Text style={styles.billingSubtitle}>
                    {billingInfo.subscription
                      ? `₱${Number(
                          billingInfo.subscription.price
                        ).toFixed(0)} / month`
                      : "Choose a plan to get monthly job posting credits."}
                  </Text>
                </View>

                <View
                  style={[
                    styles.billingBadge,
                    {
                      backgroundColor: billingInfo.subscription
                        ? "#DCFCE7"
                        : "#F1F5F9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.billingBadgeText,
                      {
                        color: billingInfo.subscription
                          ? "#15803D"
                          : "#64748B",
                      },
                    ]}
                  >
                    {billingInfo.subscription ? "ACTIVE" : "NO PLAN"}
                  </Text>
                </View>
              </View>

              <View style={styles.billingDivider} />

              {billingInfo.subscription ? (
                <>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>
                      Monthly Posting Usage
                    </Text>

                    <Text style={styles.usageValue}>
                      {billingInfo.postsUsed}/
                      {billingInfo.subscription.monthly_post_limit}
                    </Text>
                  </View>

                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${
                            (billingInfo.postsUsed /
                              billingInfo.subscription.monthly_post_limit) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.remainingText}>
                    {billingInfo.remaining} monthly posts remaining
                  </Text>

                  <Text style={styles.expiryText}>
                    Expires:{" "}
                    {new Date(
                      billingInfo.subscription.expires_at
                    ).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}
                  </Text>
                </>
              ) : (
                <Text style={styles.noPlanText}>
                  You currently have no active monthly posting allowance.
                </Text>
              )}

              <View style={styles.trialNotice}>
                <Ionicons
                  name="gift-outline"
                  size={19}
                  color={
                    billingInfo.freeTrialUsed
                      ? "#64748B"
                      : "#15803D"
                  }
                />

                <Text style={styles.trialText}>
                  {billingInfo.freeTrialUsed
                    ? "Your one-time free job post has already been used."
                    : "Your one-time free job post is still available."}
                </Text>
              </View>
            </View>

            {/* Available Subscription Plans */}
            <Text style={styles.planSectionTitle}>
              Available Subscription Plans
            </Text>

            {SUBSCRIPTION_PLANS.map((plan) => (
              <View key={plan.name} style={styles.planCard}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>
                      RECOMMENDED
                    </Text>
                  </View>
                )}

                <Text style={styles.planName}>
                  {plan.name}
                </Text>

                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>
                    ₱{plan.price}
                  </Text>

                  <Text style={styles.planPeriod}>
                    / month
                  </Text>
                </View>

                <Text style={styles.planDescription}>
                  {plan.description}
                </Text>

                <View style={styles.planFeature}>
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color="#15803D"
                  />

                  <Text style={styles.planFeatureText}>
                    {plan.limit} job postings per month
                  </Text>
                </View>

                <View style={styles.planFeature}>
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color="#15803D"
                  />

                  <Text style={styles.planFeatureText}>
                    Additional posts available for ₱99 each
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.planButton,
                    plan.popular && styles.planButtonPopular,
                    activatingPlan && styles.disabledButton,
                  ]}
                  onPress={() => handleActivatePlan(plan)}
                  disabled={!!activatingPlan}
                >
                  {activatingPlan === plan.name ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.planButtonText}>
                      {billingInfo.subscription?.plan === plan.name
                        ? "Reactivate Plan"
                        : "Activate Plan"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.billingDisclaimer}>
              Subscription activation is simulated for the MVP
              demonstration. Unused monthly posting credits do not
              carry over to the next month. Additional job posts
              cost ₱99 each.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color="#2623D3" />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue}>
          {value || "Not provided"}
        </Text>
      </View>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111C4B",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 5,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    gap: 12,
  },
  stateText: {
    fontSize: 13,
    color: "#64748B",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2623D3",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 8,
    elevation: 2,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  avatarText: {
    fontSize: 27,
    fontWeight: "800",
    color: "#2623D3",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111C4B",
    textAlign: "center",
  },
  nameStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  profileEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 7,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2623D3",
  },
  profileVerifyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#EEF2FF",
  },
  profileVerifyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2623D3",
  },
  pendingNote: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 12,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111C4B",
    marginTop: 24,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111C4B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Subscription styles
  billingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  billingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billingHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111C4B",
  },
  billingSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 5,
  },
  billingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  billingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  billingDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  usageValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2623D3",
  },
  usageBar: {
    height: 9,
    backgroundColor: "#E9ECFF",
    borderRadius: 10,
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    backgroundColor: "#2623D3",
    borderRadius: 10,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 9,
  },
  noPlanText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  expiryText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 5,
  },
  trialNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F8FAFC",
    padding: 11,
    borderRadius: 10,
    marginTop: 15,
  },
  trialText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    lineHeight: 17,
  },
  planSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111C4B",
    marginTop: 22,
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 13,
  },
  popularBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  popularText: {
    color: "#2623D3",
    fontSize: 9,
    fontWeight: "800",
  },
  planName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111C4B",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 5,
  },
  planPrice: {
    fontSize: 27,
    fontWeight: "800",
    color: "#2623D3",
  },
  planPeriod: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 5,
  },
  planDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 7,
    marginBottom: 14,
  },
  planFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },
  planFeatureText: {
    fontSize: 12,
    color: "#334155",
  },
  planButton: {
    height: 43,
    backgroundColor: "#64748B",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  planButtonPopular: {
    backgroundColor: "#2623D3",
  },
  planButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  billingDisclaimer: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 15,
  },
});
