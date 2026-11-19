
import { Ionicons } from "@expo/vector-icons";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../lib/supabase";

const PIPELINE = [
  "Application Submitted",
  "Under Review",
  "Interview Stage",
  "Awaiting Final Decision",
  "Hired",
];

const STATUS_STYLES = {
  "Application Submitted": {
    bg: "#DBEAFE",
    text: "#1D4ED8",
  },
  "Under Review": {
    bg: "#FEF3C7",
    text: "#B45309",
  },
  "Interview Stage": {
    bg: "#EDE9FE",
    text: "#6D28D9",
  },
  "Awaiting Final Decision": {
    bg: "#FFEDD5",
    text: "#C2410C",
  },
  Hired: {
    bg: "#DCFCE7",
    text: "#166534",
  },
  "Not Selected": {
    bg: "#FEE2E2",
    text: "#991B1B",
  },
};

export default function ApplicantDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [applicantData, setApplicantData] = useState(null);
  const [status, setStatus] = useState("Application Submitted");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingFile, setOpeningFile] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadApplicant = async () => {
        setLoading(true);

        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw authError;

          if (!user) {
            throw new Error("Please log in again.");
          }

          const { data, error } = await supabase
            .from("applications")
            .select(`
              id,
              job_id,
              applicant_id,
              full_name,
              email,
              note,
              attachment_paths,
              reply_from_employer,
              status,
              created_at,
              jobs:job_id (
                id,
                title,
                employer_id
              )
            `)
            .eq("id", id)
            .maybeSingle();

          if (error) throw error;

          if (!data || data.jobs?.employer_id !== user.id) {
            throw new Error(
              "Application not found or access denied."
            );
          }

          if (!active) return;

          setApplicantData(data);
          setStatus(data.status);
          setReplyMessage(data.reply_from_employer || "");
        } catch (error) {
          if (active) {
            setApplicantData(null);

            Alert.alert(
              "Unable to Load",
              error.message || "Failed to load applicant."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      };

      loadApplicant();

      return () => {
        active = false;
      };
    }, [id])
  );

  const openAttachment = (path) => {
    router.push({
      pathname: "/employerModal/document-viewer",
      params: { path },
    });
  };

  const handleUpdateStatus = (newStatus) => {
    if (saving || isFinalized) return;

    const isRejection = newStatus === "Not Selected";
    const isHiring = newStatus === "Hired";

    const message = isRejection
      ? "Are you sure you want to mark this applicant as Not Selected?"
      : isHiring
      ? "Are you sure you want to mark this applicant as Hired?"
      : `Move this applicant to ${newStatus}?`;

    Alert.alert(
      "Confirm Status Update",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            setSaving(true);

            try {
              const { error } = await supabase.rpc(
                "review_job_application",
                {
                  p_application_id: id,
                  p_status: newStatus,
                  p_reply: replyMessage.trim(),
                }
              );

              if (error) throw error;

              setStatus(newStatus);

              Alert.alert(
                "Success",
                `Applicant status updated to ${newStatus}.`
              );
            } catch (error) {
              Alert.alert(
                "Update Failed",
                error.message || "Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveReply = async () => {
    if (saving || isFinalized) return;

    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        "review_job_application",
        {
          p_application_id: id,
          p_status: status,
          p_reply: replyMessage.trim(),
        }
      );

      if (error) throw error;

      Alert.alert("Success", "Employer reply updated.");
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const isFinalized =
    status === "Hired" || status === "Not Selected";

  const currentStep = PIPELINE.indexOf(status);
  const attachments = applicantData?.attachment_paths || [];
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES["Application Submitted"];

  const nextStatus =
    currentStep >= 0 && currentStep < PIPELINE.length - 1
      ? PIPELINE[currentStep + 1]
      : null;

  const getFileName = (path) => {
    const fileName = path.split("/").pop();

    try {
      return decodeURIComponent(fileName || "Attachment");
    } catch {
      return fileName || "Attachment";
    }
  };

  const appliedDate = applicantData
    ? new Date(applicantData.created_at).toLocaleDateString(
        "en-PH",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )
    : "";

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Applicant Profile",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#2623D3" />
        </View>
      ) : !applicantData ? (
        <View style={styles.empty}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color="#9CA3AF"
          />
          <Text style={styles.emptyText}>
            Application unavailable.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.name}>
              {applicantData.full_name}
            </Text>

            <Text style={styles.subText}>
              ID: {applicantData.applicant_id.slice(0, 8)}
              {" • "}Applied: {appliedDate}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Applied Position</Text>
            <Text style={styles.value}>
              {applicantData.jobs?.title || "Job unavailable"}
            </Text>

            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>
              {applicantData.email}
            </Text>

            <Text style={styles.label}>Application Message</Text>
            <Text style={styles.value}>
              {applicantData.note || "No message provided."}
            </Text>

            <Text style={styles.label}>
              Attached Credentials / Files
            </Text>

            {attachments.length === 0 ? (
              <Text style={styles.value}>No attachments.</Text>
            ) : (
              attachments.map((path, index) => (
                <TouchableOpacity
                  key={`${path}-${index}`}
                  style={styles.fileContainer}
                  onPress={() => openAttachment(path)}
                  disabled={!!openingFile}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="document-text"
                    size={20}
                    color="#2623D3"
                  />

                  <Text style={styles.fileName} numberOfLines={2}>
                    {getFileName(path)}
                  </Text>

                  {openingFile === path ? (
                    <ActivityIndicator
                      size="small"
                      color="#2623D3"
                    />
                  ) : (
                    <Ionicons
                      name="open-outline"
                      size={18}
                      color="#2623D3"
                    />
                  )}
                </TouchableOpacity>
              ))
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>
              Application Progress
            </Text>

            <View
              style={[
                styles.badge,
                { backgroundColor: statusStyle.bg },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: statusStyle.text },
                ]}
              >
                {status}
              </Text>
            </View>

            {status !== "Not Selected" && (
              <View style={styles.progressContainer}>
                {PIPELINE.map((step, index) => {
                  const completed =
                    status === "Hired" || index <= currentStep;

                  return (
                    <View
                      key={step}
                      style={styles.progressItem}
                    >
                      <View
                        style={[
                          styles.progressDot,
                          completed && styles.progressDotActive,
                        ]}
                      >
                        {completed && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#FFF"
                          />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.progressLabel,
                          completed && styles.progressLabelActive,
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {isFinalized && (
              <Text style={styles.lockNotice}>
                {status === "Hired"
                  ? "This applicant has been marked as hired."
                  : "This applicant has been marked as not selected."}
                {" "}The status is finalized and locked.
              </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>
              Employer Instructions / Reply
            </Text>

            <TextInput
              style={[
                styles.input,
                isFinalized && styles.disabledInput,
              ]}
              placeholder="Enter interview schedule, instructions, feedback, or offer details..."
              placeholderTextColor="#9CA3AF"
              value={replyMessage}
              onChangeText={setReplyMessage}
              editable={!isFinalized && !saving}
              multiline
            />

            {!isFinalized && (
              <TouchableOpacity
                style={[
                  styles.saveReplyBtn,
                  saving && styles.disabledBtn,
                ]}
                onPress={handleSaveReply}
                disabled={saving}
              >
                <Text style={styles.btnText}>
                  Save Reply / Instructions
                </Text>
              </TouchableOpacity>
            )}

            {!isFinalized && (
              <>
                <Text style={styles.sectionTitle}>
                  Employer Actions
                </Text>

                {nextStatus && (
                  <TouchableOpacity
                    style={[
                      styles.nextBtn,
                      saving && styles.disabledBtn,
                    ]}
                    onPress={() =>
                      handleUpdateStatus(nextStatus)
                    }
                    disabled={saving}
                  >
                    <Text style={styles.btnText}>
                      {currentStep === 3
                        ? "Mark as Hired"
                        : `Move to ${nextStatus}`}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.rejectBtn,
                    saving && styles.disabledBtn,
                  ]}
                  onPress={() =>
                    handleUpdateStatus("Not Selected")
                  }
                  disabled={saving}
                >
                  <Text style={styles.btnText}>
                    Mark as Not Selected
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {saving && (
              <ActivityIndicator
                size="small"
                color="#2623D3"
                style={{ marginTop: 12 }}
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  subText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  progressContainer: {
    gap: 12,
    marginTop: 8,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: "#16A34A",
  },
  progressLabel: {
    flex: 1,
    fontSize: 12,
    color: "#9CA3AF",
  },
  progressLabelActive: {
    color: "#374151",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    marginTop: 4,
    minHeight: 100,
    textAlignVertical: "top",
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  saveReplyBtn: {
    backgroundColor: "#2623D3",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  nextBtn: {
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  rejectBtn: {
    backgroundColor: "#DC2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  lockNotice: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
