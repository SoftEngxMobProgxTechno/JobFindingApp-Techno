import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopNav } from "../../../components/Navigations";
import styles from "../../../components/stylesIn";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";


function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.empInfoRow}>
      <View style={styles.empInfoIcon}>
        <Ionicons name={icon} size={19} color="#2623D3" />
      </View>

      <View style={styles.empInfoContent}>
        <Text style={styles.empInfoLabel}>{label}</Text>
        <Text style={styles.empInfoValue} numberOfLines={2}>
          {value || "Not provided"}
        </Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
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
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={
          keyboardType === "email-address" ? "none" : "sentences"
        }
        style={[
          styles.profileInput,
          multiline && styles.profileInputMultiline,
        ]}
      />
    </View>
  );
}

export default function Profile() {
  const { currentUser, updateCurrentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [jobSeekerData, setJobSeekerData] = useState(null);

  const [editVisible, setEditVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resumeVisible, setResumeVisible] = useState(false);

  const [draft, setDraft] = useState({});
  const [skillInput, setSkillInput] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const name = currentUser?.name || "Your Name";
  const email = currentUser?.email || "";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS";
  
  const { uploading: avatarUploading, openMenu: openAvatarMenu } =
    useAvatarUpload({
      userId: currentUser?.id,
      avatarUrl: currentUser?.avatar_url,
      onChange: (url) => updateCurrentUser({ avatar_url: url }),
    });

  // Fetch jobSeeker row from Supabase matching jobseeker_id
  const loadJobSeekerProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || currentUser?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("jobSeeker")
        .select("jobseeker_id, bookmarks, skills, address, phone_number")
        .eq("jobseeker_id", userId)
        .maybeSingle();

      if (error) {
        console.log("Error loading jobSeeker table data:", error.message);
      } else if (data) {
        setJobSeekerData(data);
      }
    } catch (err) {
      console.log("Profile load exception:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadJobSeekerProfile();
    }, [loadJobSeekerProfile])
  );

  // Extract skills from Supabase or fallback to auth context
  const skills = Array.isArray(jobSeekerData?.skills)
    ? jobSeekerData.skills
    : Array.isArray(currentUser?.skills)
    ? currentUser.skills
    : [];

  const phone = jobSeekerData?.phone_number || currentUser?.phone || "";
  const address = jobSeekerData?.address || currentUser?.location || "";

  const alertsEnabled = currentUser?.jobAlertsEnabled ?? true;

  // Calculate profile completion (excluding desiredJob & bio)
  const checks = [
    name.trim(),
    email.trim(),
    phone.trim(),
    address.trim(),
    skills.length > 0,
    Boolean(currentUser?.resume),
  ];

  const completion = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  const startEdit = () => {
    setDraft({
      name: name || "",
      email: email || "",
      phone: phone || "",
      location: address || "",
    });

    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!draft.name?.trim()) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(draft.email?.trim() || "")) {
      Alert.alert("Invalid email", "Please enter a valid email.");
      return;
    }

    try {
      const userId = currentUser?.id;
      if (userId) {
        // 1. Update Supabase profiles table for name
        await supabase
          .from("profiles")
          .update({ name: draft.name.trim() })
          .eq("id", userId);

        // 2. Explicitly include jobseeker_id so upsert updates the correct row
        const { error: seekerError } = await supabase
          .from("jobSeeker")
          .upsert({
            jobseeker_id: userId,
            phone_number: draft.phone.trim(),
            address: draft.location.trim(),
            skills: skills,
          }, { onConflict: "jobseeker_id" });

        if (seekerError) throw seekerError;
      }

      await updateCurrentUser({
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        phone: draft.phone.trim(),
        location: draft.location.trim(),
      });

      setJobSeekerData((prev) => ({
        ...prev,
        phone_number: draft.phone.trim(),
        address: draft.location.trim(),
      }));

      setEditVisible(false);
      Alert.alert("Success", "Profile updated.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save profile.");
    }
  };

  const addSkill = async () => {
    const skill = skillInput.trim();
    if (!skill) return;

    if (
      skills.some(
        (item) => String(item).trim().toLowerCase() === skill.toLowerCase()
      )
    ) {
      Alert.alert("Duplicate skill", "This skill already exists.");
      return;
    }

    const updatedSkills = [...skills, skill];

    try {
      const userId = currentUser?.id;
      if (userId) {
        await supabase
          .from("jobSeeker")
          .upsert({
            jobseeker_id: userId,
            skills: updatedSkills,
          })
          .select();
      }

      await updateCurrentUser({ skills: updatedSkills });
      setJobSeekerData((prev) => ({ ...prev, skills: updatedSkills }));
      setSkillInput("");
    } catch (error) {
      Alert.alert("Error", "Unable to add skill.");
    }
  };

  const removeSkill = (skill) => {
    Alert.alert("Remove skill", `Remove "${skill}" from your profile?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updatedSkills = skills.filter((item) => item !== skill);

          try {
            const userId = currentUser?.id;
            if (userId) {
              await supabase
                .from("jobSeeker")
                .upsert({
                  jobseeker_id: userId,
                  skills: updatedSkills,
                })
                .select();
            }

            await updateCurrentUser({ skills: updatedSkills });
            setJobSeekerData((prev) => ({ ...prev, skills: updatedSkills }));
          } catch (error) {
            Alert.alert("Unable to remove skill", "Please try again.");
          }
        },
      },
    ]);
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      const extension = file.name?.split(".").pop()?.toLowerCase();

      if (!["pdf", "doc", "docx"].includes(extension)) {
        Alert.alert("Unsupported file", "Select PDF, DOC, or DOCX.");
        return;
      }

      if (file.size == null || file.size > 5 * 1024 * 1024) {
        Alert.alert(
          "Invalid file size",
          "Choose a file with a known size of 5 MB or less."
        );
        return;
      }

      updateCurrentUser({
        resume: {
          name: file.name,
          uri: file.uri,
          size: file.size,
          mimeType: file.mimeType,
        },
      });

      setResumeVisible(false);
      Alert.alert(
        "Resume selected",
        "Your resume has been added to this app session."
      );
    } catch {
      Alert.alert("Error", "Unable to select your resume.");
    }
  };

  const removeResume = () => {
    Alert.alert("Remove resume?", "Remove your current resume?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          updateCurrentUser({ resume: null });
          setResumeVisible(false);
        },
      },
    ]);
  };

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
      // 1. Verify old password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });

      if (signInError) {
        Alert.alert("Incorrect Password", "Your current password is incorrect.");
        return;
      }

      // 2. Update to the new password
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopNav />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2623D3"
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {/* Centered Profile Header Card with Top-Right Edit Button */}
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
                uri={currentUser?.avatar_url}
                initials={initials}
                uploading={avatarUploading}
                onPress={openAvatarMenu}
              />

              <View style={styles.empNameStatusRow}>
                <Text style={styles.empProfileName}>{name}</Text>

              </View>

              <Text style={styles.empProfileEmail}>{email}</Text>

              <View style={styles.empRoleBadge}>
                <Ionicons
                  name="person-outline"
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.empRoleText}>Job Seeker Account</Text>
              </View>
            </View>

            {/* Profile Completion Progress Panel */}
            <Text style={styles.empSectionTitle}>Profile Completeness</Text>

            <View style={styles.profilePanel}>
              <View style={styles.profileCompletionTop}>
                <Text style={styles.profileCompletionTitle}>
                  Overall Profile Progress
                </Text>
                <Text style={styles.profileCompletionPct}>{completion}%</Text>
              </View>

              <View style={styles.profileBarBg}>
                <View
                  style={[styles.profileBarFill, { width: `${completion}%` }]}
                />
              </View>

              <Text style={styles.profileCompletionHint}>
                Complete your details to better showcase your qualifications to employers.
              </Text>
            </View>

            {/* Account Information */}
            <Text style={styles.empSectionTitle}>Account Information</Text>

            <View style={styles.empInfoCard}>
              <InfoRow icon="person-outline" label="Full Name" value={name} />

              <View style={styles.empDivider} />

              <InfoRow icon="mail-outline" label="Email Address" value={email} />

              <View style={styles.empDivider} />

              <InfoRow
                icon="call-outline"
                label="Phone Number"
                value={phone}
              />
            </View>

            {/* Contact & Location Information */}
            <Text style={styles.empSectionTitle}>Contact & Location</Text>

            <View style={styles.empInfoCard}>
              <InfoRow
                icon="location-outline"
                label="Address"
                value={address}
              />
            </View>

            {/* Skills */}
            <Text style={styles.empSectionTitle}>Skills & Expertise</Text>

            <View style={styles.profilePanel}>
              <View style={styles.profileChipWrap}>
                {skills.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    style={styles.profileChip}
                    onPress={() => removeSkill(skill)}
                  >
                    <Text style={styles.profileChipText}>{skill}</Text>
                    <Feather name="x" size={12} color="#2623D3" />
                  </TouchableOpacity>
                ))}
              </View>

              {skills.length === 0 && (
                <Text style={styles.profileEmptyText}>No skills added yet.</Text>
              )}

              <View style={styles.profileSkillInputRow}>
                <TextInput
                  style={[styles.profileInput, { flex: 1 }]}
                  placeholder="Add a skill (e.g. React Native, UI/UX)"
                  placeholderTextColor="#9299AB"
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={addSkill}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={styles.profileAddSkillBtn}
                  onPress={addSkill}
                >
                  <Feather name="plus" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account & Documents */}
            <Text style={styles.empSectionTitle}>Account & Documents</Text>

            <View style={styles.profileMenuCard}>
              <TouchableOpacity
                style={[styles.profileMenuRow, styles.profileRowBorder]}
                onPress={() => setResumeVisible(true)}
              >
                <View style={styles.profileMenuIcon}>
                  <Feather name="file-text" size={20} color="#2623D3" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileMenuLabel}>My Resume</Text>
                  <Text style={styles.profileMenuHint} numberOfLines={1}>
                    {currentUser?.resume?.name ||
                      "Upload or manage your resume"}
                  </Text>
                </View>

                <Feather name="chevron-right" size={18} color="#8993A8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileMenuRow}
                onPress={() => setSettingsVisible(true)}
              >
                <View style={styles.profileMenuIcon}>
                  <Feather name="settings" size={20} color="#2623D3" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileMenuLabel}>Settings</Text>
                  <Text style={styles.profileMenuHint}>
                    Password, notifications and privacy
                  </Text>
                </View>

                <Feather name="chevron-right" size={18} color="#8993A8" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit profile modal */}
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="Full name"
                value={draft.name || ""}
                onChangeText={(value) =>
                  setDraft({ ...draft, name: value })
                }
              />

              <Field
                label="Email"
                value={draft.email || ""}
                keyboardType="email-address"
                onChangeText={(value) =>
                  setDraft({ ...draft, email: value })
                }
              />

              <Field
                label="Phone number"
                value={draft.phone || ""}
                keyboardType="phone-pad"
                onChangeText={(value) =>
                  setDraft({ ...draft, phone: value })
                }
              />

              <Field
                label="Address"
                value={draft.location || ""}
                placeholder="City or province"
                onChangeText={(value) =>
                  setDraft({ ...draft, location: value })
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

      {/* Resume management modal */}
      <Modal
        visible={resumeVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResumeVisible(false)}
      >
        <View style={styles.profileModalShade}>
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>My Resume</Text>
              <TouchableOpacity
                style={styles.employerCloseModalBtn}
                onPress={() => setResumeVisible(false)}
              >
                <Feather name="x" size={18} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileResumeBox}>
              <Feather name="file-text" size={30} color="#2623D3" />

              <Text style={styles.profileResumeName}>
                {currentUser?.resume?.name || "No resume uploaded"}
              </Text>

              <Text style={styles.profileNote}>
                PDF, DOC or DOCX — maximum 5 MB
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileSaveBtn}
              onPress={pickResume}
            >
              <Text style={styles.profileSaveBtnText}>
                {currentUser?.resume ? "Replace Resume" : "Choose Resume"}
              </Text>
            </TouchableOpacity>

            {!!currentUser?.resume && (
              <TouchableOpacity
                style={styles.profileRemoveResumeBtn}
                onPress={removeResume}
              >
                <Text style={styles.profileRemoveResumeText}>
                  Remove Resume
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings modal */}
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
                Settings & Privacy
              </Text>
              <TouchableOpacity
                style={styles.employerCloseModalBtn}
                onPress={() => setSettingsVisible(false)}
              >
                <Feather name="x" size={18} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileNote}>
              Manage your account and preferences.
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

            <View style={styles.profileSettingRow}>
              <Feather name="bell" size={18} color="#2623D3" />
              <Text style={[styles.profileSettingText, { flex: 1 }]}>
                Job Alerts
              </Text>

              <Switch
                value={alertsEnabled}
                onValueChange={(value) =>
                  updateCurrentUser({ jobAlertsEnabled: value })
                }
                trackColor={{
                  false: "#D8DDEA",
                  true: "#B9B7FF",
                }}
                thumbColor={alertsEnabled ? "#2623D3" : "#FFFFFF"}
              />
            </View>

            <TouchableOpacity
              style={styles.profileSettingRow}
              onPress={() =>
                Alert.alert(
                  "Privacy Information",
                  "Your skills and address are synced directly with your Supabase jobSeeker record."
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

      {/* Password modal */}
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
              <Text style={styles.employerModalTitle}>Change Password</Text>
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
              <Text style={styles.profileSaveBtnText}>Update Password</Text>
            </TouchableOpacity>

            <Text style={[styles.profileNote, { marginTop: 12 }]}>
              Password changes are currently session-based.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}