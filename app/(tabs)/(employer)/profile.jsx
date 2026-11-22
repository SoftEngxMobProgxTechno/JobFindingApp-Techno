
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopNav } from "../../../components/Navigations";
import ProfileAvatar from "../../../components/ProfileAvatar";
import styles from "../../../components/stylesIn";
import { useAuth } from "../../../context/AuthContext";
import { useAvatarUpload } from "../../../hooks/use-avatar-upload";
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
}) {
  return (
    <View style={styles.profileFieldGroup}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#9299AB"
        keyboardType={keyboardType || "default"}
        secureTextEntry={secureTextEntry}
        autoCapitalize={
          keyboardType === "email-address" ? "none" : "sentences"
        }
        style={styles.profileInput}
      />
    </View>
  );
}

export default function EmployerProfile() {
  const { currentUser, updateCurrentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal visibility states
  const [editVisible, setEditVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Edit draft state
  const [draft, setDraft] = useState({});

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
              .select("id, name, email, role, avatar_url")
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

          if (verificationError && verificationError.code !== "PGRST116") {
            throw verificationError;
          }

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

  const name = profile?.name || currentUser?.name || "Employer";
  const email = profile?.email || currentUser?.email || "";

  const verificationStatus = verification?.status || "Not Submitted";
  const isVerified = verificationStatus.toLowerCase() === "verified";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "EM";

  const avatarUrl = profile?.avatar_url || currentUser?.avatar_url || null;

  const { uploading: avatarUploading, openMenu: openAvatarMenu } =
    useAvatarUpload({
      userId: currentUser?.id,
      avatarUrl,
      onChange: (url) => {
        setProfile((prev) => ({ ...prev, avatar_url: url }));
        updateCurrentUser({ avatar_url: url });
      },
    });

  const startEdit = () => {
    setDraft({
      name: name || "",
      email: email || "",
    });
    setEditVisible(true);
  };

  // Save profile changes.
  const saveProfile = async () => {
    const cleanName = draft.name?.trim();
    const cleanEmail = draft.email?.trim().toLowerCase();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail || "")) {
      Alert.alert("Invalid email", "Please enter a valid email.");
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("No active user session.");
      }

      // 1. Update name in public.profiles
      const { data: updatedRows, error: profileError } = await supabase
        .from("profiles")
        .update({
          name: cleanName,
        })
        .eq("id", user.id)
        .select("id, name");

      if (profileError) throw profileError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          "No profile row was updated. Check RLS policies or user ID."
        );
      }

      // 2. Update Auth user details
      const authUpdates = {
        data: { name: cleanName },
      };

      // Only update email if it changed.
      if (cleanEmail !== email.toLowerCase()) {
        authUpdates.email = cleanEmail;
      }

      const { error: authError } =
        await supabase.auth.updateUser(authUpdates);

      if (authError) throw authError;

      // 3. Update local profile and AuthContext.
      setProfile((prev) => ({
        ...prev,
        name: cleanName,
        email: cleanEmail,
      }));

      if (updateCurrentUser) {
        await updateCurrentUser({
          name: cleanName,
          email: cleanEmail,
        });
      }

      setEditVisible(false);

      Alert.alert(
        "Success",
        cleanEmail !== email.toLowerCase()
          ? "Profile updated. Check your new email inbox if confirmation is required."
          : "Profile updated successfully."
      );
    } catch (error) {
      Alert.alert(
        "Database Update Failed",
        error.message || "Failed to update profile."
      );
    }
  };

  // Change account password.
  const changePassword = async () => {
    if (!oldPassword) {
      Alert.alert("Required", "Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "The new passwords do not match.");
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });

      if (signInError) {
        Alert.alert(
          "Incorrect Password",
          "Your current password is incorrect."
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordVisible(false);

      Alert.alert(
        "Password Updated",
        "Your password has been successfully updated."
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update password.");
    }
  };

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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.jobAppsEmptyContainer}>
            <ActivityIndicator size="large" color="#2623D3" />
            <Text style={styles.jobAppsEmptyBody}>
              Loading profile...
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.jobAppsEmptyContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={45}
              color="#B91C1C"
            />

            <Text style={styles.jobAppsEmptyTitle}>
              Unable to load profile
            </Text>
            <Text style={styles.jobAppsEmptyBody}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={styles.jobAppsEmptyButton}
              onPress={() =>
                router.replace("/(tabs)/(employer)/profile")
              }
            >
              <Text style={styles.jobAppsEmptyButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Account Header */}
            <View style={[styles.empProfileCard, { position: "relative" }]}>
              <TouchableOpacity
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: "#4947E8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={startEdit}
                accessibilityLabel="Edit profile"
              >
                <Feather name="edit-2" size={16} color="#C7D2FE" />
              </TouchableOpacity>

              <ProfileAvatar
                uri={avatarUrl}
                initials={initials}
                uploading={avatarUploading}
                onPress={openAvatarMenu}
              />

              <View style={styles.empNameStatusRow}>
                <Text style={styles.empProfileName}>{name}</Text>

                <View
                  style={[
                    styles.empStatusBadge,
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
                      styles.empStatusBadgeText,
                      { color: statusStyle.color },
                    ]}
                  >
                    {verificationStatus}
                  </Text>
                </View>
              </View>

              <Text style={styles.empProfileEmail}>{email}</Text>

              <View style={styles.empRoleBadge}>
                <Ionicons
                  name="briefcase-outline"
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.empRoleText}>
                  Employer Account
                </Text>
              </View>

              {!isVerified &&
                verificationStatus.toLowerCase() !== "pending" && (
                  <TouchableOpacity
                    style={styles.empVerifyButton}
                    onPress={() => router.push("employerModal/getVerified")}
                  >
                    <Text style={styles.empVerifyText}>
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
                <Text style={styles.empPendingNote}>
                  Your verification request is currently under review.
                </Text>
              )}
            </View>

            {/* Account Information */}
            <Text style={styles.empSectionTitle}>
              Account Information
            </Text>

            <View style={styles.empInfoCard}>
              <InfoRow
                icon="person-outline"
                label="Full Name"
                value={name}
              />

              <View style={styles.empDivider} />

              <InfoRow
                icon="mail-outline"
                label="Email Address"
                value={email}
              />

              <View style={styles.empDivider} />

              <InfoRow
                icon="shield-checkmark-outline"
                label="Account Role"
                value={profile?.role || "Employer"}
              />
            </View>

            {/* Company Information */}
            <Text style={styles.empSectionTitle}>
              Company Information
            </Text>

            <View style={styles.empInfoCard}>
              <InfoRow
                icon="business-outline"
                label="Company Name"
                value={verification?.company_name}
              />

              <View style={styles.empDivider} />

              <InfoRow
                icon="git-branch-outline"
                label="Branch"
                value={verification?.branch}
              />

              <View style={styles.empDivider} />

              <InfoRow
                icon="location-outline"
                label="Company Location"
                value={verification?.company_location}
              />
            </View>

            {/* Account Settings */}
            <Text style={styles.empSectionTitle}>Account Settings</Text>

            <View style={styles.profileMenuCard}>
              <TouchableOpacity
                style={styles.profileMenuRow}
                onPress={() => setSettingsVisible(true)}
              >
                <View style={styles.profileMenuIcon}>
                  <Feather name="settings" size={20} color="#2623D3" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileMenuLabel}>
                    Settings & Security
                  </Text>
                  <Text style={styles.profileMenuHint}>
                    Password management and privacy information
                  </Text>
                </View>

                <Feather name="chevron-right" size={18} color="#8993A8" />
              </TouchableOpacity>
            </View>

            {/* Subscription & Posting Allowance */}
            <Text style={styles.empSectionTitle}>
              Subscription & Posting Allowance
            </Text>

            <View style={styles.profilePanel}>
              <View style={styles.profileCompletionTop}>
                <Text style={styles.profileCompletionTitle}>
                  {billingInfo.subscription
                    ? `${billingInfo.subscription.plan} Plan`
                    : "No Active Subscription"}
                </Text>

                <View
                  style={[
                    styles.profileRoleBadge,
                    {
                      marginTop: 0,
                      backgroundColor: billingInfo.subscription
                        ? "#DCFCE7"
                        : "#F1F5F9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.profileRoleText,
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

              <Text style={styles.profileCompletionHint}>
                {billingInfo.subscription
                  ? `₱${Number(
                      billingInfo.subscription.price
                    ).toFixed(0)} / month`
                  : "Choose a plan to get monthly job posting credits."}
              </Text>

              {billingInfo.subscription ? (
                <>
                  <View style={{ marginTop: 14, marginBottom: 8 }}>
                    <View style={styles.profileCompletionTop}>
                      <Text style={styles.profileCompletionTitle}>
                        Monthly Usage
                      </Text>
                      <Text style={styles.profileCompletionPct}>
                        {billingInfo.postsUsed}/
                        {billingInfo.subscription.monthly_post_limit}
                      </Text>
                    </View>

                    <View style={styles.profileBarBg}>
                      <View
                        style={[
                          styles.profileBarFill,
                          {
                            width: `${Math.min(
                              100,
                              (billingInfo.postsUsed /
                                billingInfo.subscription.monthly_post_limit) *
                                100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.profileCompletionHint,
                      { color: "#15803D", fontWeight: "700" },
                    ]}
                  >
                    {billingInfo.remaining} monthly posts remaining
                  </Text>

                  <Text style={styles.profileCompletionHint}>
                    Expires:{" "}
                    {new Date(
                      billingInfo.subscription.expires_at
                    ).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}
                  </Text>
                </>
              ) : (
                <Text style={styles.profileCompletionHint}>
                  You currently have no active monthly posting allowance.
                </Text>
              )}
            </View>

            {/* Available Subscription Plans */}
            <Text style={[styles.empSectionTitle, { marginTop: 6 }]}>
              Available Subscription Plans
            </Text>

            {SUBSCRIPTION_PLANS.map((plan) => (
              <View key={plan.name} style={styles.profilePanel}>
                {plan.popular && (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: "#EEF2FF",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#2623D3",
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      RECOMMENDED
                    </Text>
                  </View>
                )}

                <Text style={styles.profileName}>{plan.name}</Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    marginTop: 4,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "800",
                      color: "#2623D3",
                    }}
                  >
                    ₱{plan.price}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#7381A2",
                      marginLeft: 4,
                    }}
                  >
                    / month
                  </Text>
                </View>

                <Text style={styles.profileBio}>{plan.description}</Text>

                <View style={{ gap: 6, marginTop: 10, marginBottom: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color="#15803D"
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#111C4B",
                        fontWeight: "600",
                      }}
                    >
                      {plan.limit} job postings per month
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.profileSaveBtn,
                    plan.popular ? {} : { backgroundColor: "#64748B" },
                    activatingPlan && { opacity: 0.6 },
                  ]}
                  onPress={() => handleActivatePlan(plan)}
                  disabled={!!activatingPlan}
                >
                  {activatingPlan === plan.name ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.profileSaveBtnText}>
                      {billingInfo.subscription?.plan === plan.name
                        ? "Reactivate Plan"
                        : "Activate Plan"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.profileModalShade}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.employerCloseModalBtn}
                onPress={() => setEditVisible(false)}
              >
                <Feather name="x" size={18} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Field
                label="Full name"
                value={draft.name || ""}
                onChangeText={(val) =>
                  setDraft({ ...draft, name: val })
                }
              />

              <Field
                label="Email"
                value={draft.email || ""}
                keyboardType="email-address"
                onChangeText={(val) =>
                  setDraft({ ...draft, email: val })
                }
              />

              <TouchableOpacity
                style={styles.profileSaveBtn}
                onPress={saveProfile}
              >
                <Text style={styles.profileSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.profileModalShade}>
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>
                Settings & Security
              </Text>
              <TouchableOpacity
                style={styles.employerCloseModalBtn}
                onPress={() => setSettingsVisible(false)}
              >
                <Feather name="x" size={18} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileNote}>
              Manage your password and security settings.
            </Text>

            <TouchableOpacity
              style={styles.profileSettingRow}
              onPress={() => {
                setSettingsVisible(false);
                setPasswordVisible(true);
              }}
            >
              <Feather name="lock" size={18} color="#2623D3" />
              <Text style={styles.profileSettingText}>Change Password</Text>
              <Feather name="chevron-right" size={18} color="#8993A8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileSettingRow}
              onPress={() =>
                Alert.alert(
                  "Privacy Information",
                  "Your company verifications and billing subscription data are securely managed in Supabase."
                )
              }
            >
              <Feather name="shield" size={18} color="#2623D3" />
              <Text style={styles.profileSettingText}>
                Privacy Information
              </Text>
              <Feather name="chevron-right" size={18} color="#8993A8" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPasswordVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.profileModalShade}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>
                Change Password
              </Text>
              <TouchableOpacity
                style={styles.employerCloseModalBtn}
                onPress={() => setPasswordVisible(false)}
              >
                <Feather name="x" size={18} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <Field
              label="Current password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />

            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Field
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.profileSaveBtn}
              onPress={changePassword}
            >
              <Text style={styles.profileSaveBtnText}>
                Update Password
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.empInfoRow}>
      <View style={styles.empInfoIcon}>
        <Ionicons name={icon} size={19} color="#2623D3" />
      </View>

      <View style={styles.empInfoContent}>
        <Text style={styles.empInfoLabel}>{label}</Text>
        <Text style={styles.empInfoValue}>
          {value || "Not provided"}
        </Text>
      </View>
    </View>
  );
}
