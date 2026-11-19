import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
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

function SectionTitle({ icon, title }) {
  return (
    <View style={[styles.homeHeadingRow, { marginBottom: 12 }]}>
      <Feather name={icon} size={20} color="#2623D3" />
      <Text style={styles.homeHeading}>{title}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.profileInfoRow}>
      <Feather name={icon} size={17} color="#7381A2" />
      <Text style={styles.profileInfoLabel}>{label}</Text>
      <Text style={styles.profileInfoValue} numberOfLines={2}>
        {value || "Not set"}
      </Text>
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
        placeholderTextColor="#9AA4B8"
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
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS";

  const skills = Array.isArray(currentUser?.skills)
    ? currentUser.skills
    : [];

  const alertsEnabled = currentUser?.jobAlertsEnabled ?? true;

  // Calculate profile completion.
  const checks = [
    currentUser?.name?.trim(),
    currentUser?.email?.trim(),
    currentUser?.phone?.trim(),
    currentUser?.location?.trim(),
    currentUser?.desiredJob?.trim(),
    currentUser?.bio?.trim(),
    skills.length > 0,
    Boolean(currentUser?.resume),
  ];

  const completion = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  const startEdit = () => {
    setDraft({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      location: currentUser?.location || "",
      desiredJob: currentUser?.desiredJob || "",
      bio: currentUser?.bio || "",
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

    const success = await updateCurrentUser({
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
      desiredJob: draft.desiredJob.trim(),
      bio: draft.bio.trim(),
    });

    if (!success) return;

    setEditVisible(false);
    Alert.alert(
      "Profile updated",
      "Your changes are updated in this app session. Only skills are currently saved to your Supabase Job Seeker record."
    );
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

    const success = await updateCurrentUser({
      skills: [...skills, skill],
    });

    if (success) {
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    Alert.alert("Remove skill", `Remove "${skill}" from your profile?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const success = await updateCurrentUser({
            skills: skills.filter((item) => item !== skill),
          });

          if (!success) {
            Alert.alert("Unable to remove skill", "Please try again.");
          }
        },
      },
    ]);
  };

  // Manage the profile's single resume.
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

  const changePassword = () => {
    if (!oldPassword || oldPassword !== currentUser?.password) {
      Alert.alert(
        "Incorrect password",
        "Please check your current password."
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Password too short",
        "Use at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Password mismatch",
        "The new passwords do not match."
      );
      return;
    }

    updateCurrentUser({ password: newPassword });

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordVisible(false);

    Alert.alert(
      "Password updated",
      "Your password has been updated for this session."
    );
  };

  return (
    <SafeAreaView style={styles.homeContainer} edges={["top"]}>
      <TopNav />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.homeContent, { paddingBottom: 30 }]}
      >
        <View style={styles.profileHeader}>
          <Text style={styles.jobAppsHeading}>Profile</Text>
          <Text style={styles.jobAppsSubtitle}>
            Manage your personal information and qualifications.
          </Text>
        </View>

        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {name}
            </Text>

            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>

            <View style={styles.profileRoleBadge}>
              <Text style={styles.profileRoleText}>Job Seeker</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileEditBtn}
            onPress={startEdit}
            accessibilityLabel="Edit profile"
          >
            <Feather name="edit-2" size={18} color="#2623D3" />
          </TouchableOpacity>
        </View>

        {/* Profile completion */}
        <View style={styles.profilePanel}>
          <View style={styles.profileCompletionTop}>
            <Text style={styles.profileCompletionTitle}>
              Profile completion
            </Text>
            <Text style={styles.profileCompletionPct}>
              {completion}%
            </Text>
          </View>

          <View style={styles.profileBarBg}>
            <View
              style={[
                styles.profileBarFill,
                { width: `${completion}%` },
              ]}
            />
          </View>

          <Text style={styles.profileCompletionHint}>
            Complete your details to better showcase your qualifications.
          </Text>
        </View>

        {/* About me */}
        <SectionTitle icon="user" title="About me" />

        <View style={styles.profilePanel}>
          <InfoRow
            icon="phone"
            label="Phone"
            value={currentUser?.phone}
          />

          <InfoRow
            icon="map-pin"
            label="Location"
            value={currentUser?.location}
          />

          <InfoRow
            icon="briefcase"
            label="Looking for"
            value={currentUser?.desiredJob}
          />

          <View style={styles.profileBioSection}>
            <Text style={styles.profileFieldLabel}>Bio</Text>
            <Text style={styles.profileBio}>
              {currentUser?.bio ||
                "Tell employers a little about yourself."}
            </Text>
          </View>
        </View>

        {/* Skills */}
        <SectionTitle icon="award" title="Skills" />

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
            <Text style={styles.profileEmptyText}>
              No skills added yet.
            </Text>
          )}

          <View style={styles.profileSkillInputRow}>
            <TextInput
              style={[styles.profileInput, { flex: 1 }]}
              placeholder="Add a skill"
              placeholderTextColor="#9AA4B8"
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

        {/* Account and documents */}
        <SectionTitle icon="folder" title="Account & Documents" />

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

            <Feather
              name="chevron-right"
              size={18}
              color="#8993A8"
            />
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

            <Feather
              name="chevron-right"
              size={18}
              color="#8993A8"
            />
          </TouchableOpacity>
        </View>
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Feather name="x" size={22} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
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
                label="Location"
                value={draft.location || ""}
                placeholder="City or province"
                onChangeText={(value) =>
                  setDraft({ ...draft, location: value })
                }
              />

              <Field
                label="Desired job"
                value={draft.desiredJob || ""}
                placeholder="e.g. Junior Web Developer"
                onChangeText={(value) =>
                  setDraft({ ...draft, desiredJob: value })
                }
              />

              <Field
                label="About me"
                value={draft.bio || ""}
                placeholder="Briefly introduce yourself"
                multiline
                onChangeText={(value) =>
                  setDraft({ ...draft, bio: value })
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
              <TouchableOpacity onPress={() => setResumeVisible(false)}>
                <Feather name="x" size={22} color="#111C4B" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileResumeBox}>
              <Feather
                name="file-text"
                size={30}
                color="#2623D3"
              />

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
                {currentUser?.resume
                  ? "Replace Resume"
                  : "Choose Resume"}
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
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Feather name="x" size={22} color="#111C4B" />
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
              <Feather
                name="chevron-right"
                size={18}
                color="#8993A8"
              />
            </TouchableOpacity>

            <View style={styles.profileSettingRow}>
              <Feather name="bell" size={18} color="#2623D3" />
              <Text style={styles.profileSettingText}>
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
                thumbColor={
                  alertsEnabled ? "#2623D3" : "#FFFFFF"
                }
              />
            </View>

            <TouchableOpacity
              style={styles.profileSettingRow}
              onPress={() =>
                Alert.alert(
                  "Privacy Information",
                  "Your skills are saved in your Supabase Job Seeker record. Other profile details, resume selection, and job alert preferences are currently kept only in this app session and are not yet saved permanently."
                )
              }
            >
              <Feather name="shield" size={18} color="#2623D3" />
              <Text style={styles.profileSettingText}>
                Privacy Information
              </Text>
              <Feather
                name="chevron-right"
                size={18}
                color="#8993A8"
              />
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
        <View style={styles.profileModalShade}>
          <View style={styles.profileModalCard}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordVisible(false)}>
                <Feather name="x" size={22} color="#111C4B" />
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

            <Text style={[styles.profileNote, { marginTop: 12 }]}>
              Password changes are currently session-based.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}