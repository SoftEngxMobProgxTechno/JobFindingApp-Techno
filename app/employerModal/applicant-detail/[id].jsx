
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  Modal,
  Platform,
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
  "Application Submitted": { bg: "#DBEAFE", text: "#1D4ED8" },
  "Under Review": { bg: "#FEF3C7", text: "#B45309" },
  "Interview Stage": { bg: "#EDE9FE", text: "#6D28D9" },
  "Awaiting Final Decision": { bg: "#FFEDD5", text: "#C2410C" },
  Hired: { bg: "#DCFCE7", text: "#166534" },
  "Not Selected": { bg: "#FEE2E2", text: "#991B1B" },
};

function toDateInput(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeInput(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function parseInterviewDateTime(dateValue, timeValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error("Please select a valid interview date.");
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
    throw new Error("Please select a valid interview time.");
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);

  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hours ||
    localDate.getMinutes() !== minutes
  ) {
    throw new Error("Please select a valid interview date and time.");
  }

  if (localDate.getTime() <= Date.now()) {
    throw new Error(
      "The interview must be scheduled for a future date and time."
    );
  }

  return localDate.toISOString();
}

function formatDateTime(dateString) {
  if (!dateString) return "Not scheduled";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function createDefaultPickerDate(dateValue, timeValue) {
  if (dateValue && timeValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hours, minutes] = timeValue.split(":").map(Number);

    const existing = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes
    );

    if (!Number.isNaN(existing.getTime())) return existing;
  }

  if (dateValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const existing = new Date(year, month - 1, day, 9, 0);

    if (!Number.isNaN(existing.getTime())) return existing;
  }

  // Default to the next hour when no schedule exists.
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  return nextHour;
}

export default function ApplicantDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [applicantData, setApplicantData] = useState(null);
  const [status, setStatus] = useState("Application Submitted");
  const [replyMessage, setReplyMessage] = useState("");

  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewAt, setInterviewAt] = useState(null);
  const [interviewDetailsSentAt, setInterviewDetailsSentAt] =
    useState(null);

  const [pickerMode, setPickerMode] = useState(null);
  const [pickerValue, setPickerValue] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interviewSaving, setInterviewSaving] = useState(false);

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
          if (!user) throw new Error("Please log in again.");

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
              interview_at,
              interview_details_sent_at,
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

          setInterviewAt(data.interview_at || null);
          setInterviewDetailsSentAt(
            data.interview_details_sent_at || null
          );

          setInterviewDate(toDateInput(data.interview_at));
          setInterviewTime(toTimeInput(data.interview_at));
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

  const isFinalized =
    status === "Hired" || status === "Not Selected";

  const handleUpdateStatus = (newStatus) => {
    if (saving || isFinalized) return;

    const isRejection = newStatus === "Not Selected";
    const isHiring = newStatus === "Hired";

    const message = isRejection
      ? "Are you sure you want to mark this applicant as Not Selected?"
      : isHiring
        ? "Are you sure you want to mark this applicant as Hired?"
        : `Move this applicant to ${newStatus}?`;

    Alert.alert("Confirm Status Update", message, [
      { text: "Cancel", style: "cancel" },
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
    ]);
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

  // Open the date or time picker.
  const openPicker = (mode) => {
    if (interviewSaving) return;

    setPickerValue(
      createDefaultPickerDate(interviewDate, interviewTime)
    );

    setPickerMode(mode);
  };

  // Apply a selected date or time to the form.
  const applyPickerValue = (mode, selectedDate) => {
    if (mode === "date") {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");

      setInterviewDate(`${year}-${month}-${day}`);
    }

    if (mode === "time") {
      const hours = String(selectedDate.getHours()).padStart(2, "0");
      const minutes = String(selectedDate.getMinutes()).padStart(2, "0");

      setInterviewTime(`${hours}:${minutes}`);
    }
  };

  // Android picker returns a selected value and closes automatically.
  // iOS keeps the selected value as a draft until the user taps Done.
  const handlePickerChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed" || !selectedDate) {
        setPickerMode(null);
        return;
      }

      applyPickerValue(pickerMode, selectedDate);
      setPickerMode(null);
      return;
    }

    if (selectedDate) {
      setPickerValue(selectedDate);
    }
  };

  const confirmIOSPicker = () => {
    if (pickerMode) {
      applyPickerValue(pickerMode, pickerValue);
    }

    setPickerMode(null);
  };

  const cancelPicker = () => {
    setPickerMode(null);
  };

  const handleScheduleInterview = async () => {
    if (interviewSaving || status !== "Interview Stage") return;

    let interviewDateTime;

    try {
      interviewDateTime = parseInterviewDateTime(
        interviewDate,
        interviewTime
      );
    } catch (error) {
      Alert.alert("Invalid Interview Schedule", error.message);
      return;
    }

    const isRescheduling = Boolean(interviewAt);

    Alert.alert(
      isRescheduling ? "Reschedule Interview" : "Schedule Interview",
      isRescheduling
        ? "Changing the interview schedule will reset the interview details sent confirmation. You will need to mark the updated details as sent again."
        : "Save this interview date and time?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isRescheduling ? "Reschedule" : "Schedule",
          onPress: async () => {
            setInterviewSaving(true);

            try {
              const { error } = await supabase.rpc(
                "manage_application_interview",
                {
                  p_application_id: id,
                  p_action: "schedule",
                  p_interview_at: interviewDateTime,
                }
              );

              if (error) throw error;

              setInterviewAt(interviewDateTime);
              setInterviewDetailsSentAt(null);

              Alert.alert(
                "Success",
                "Interview schedule saved. Remember to update the employer instructions and mark the details as sent."
              );
            } catch (error) {
              Alert.alert(
                "Scheduling Failed",
                error.message || "Please try again."
              );
            } finally {
              setInterviewSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkDetailsSent = () => {
    if (interviewSaving || status !== "Interview Stage") return;

    if (!interviewAt) {
      Alert.alert(
        "Interview Not Scheduled",
        "Please schedule the interview first."
      );
      return;
    }

    if (!replyMessage.trim()) {
      Alert.alert(
        "Instructions Required",
        "Enter and save the interview instructions in the Employer Instructions / Reply section first."
      );
      return;
    }

    Alert.alert(
      "Confirm Interview Details",
      "Have you sent the interview date, time, and instructions to the applicant?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Details Sent",
          onPress: async () => {
            setInterviewSaving(true);

            try {
              const { error } = await supabase.rpc(
                "manage_application_interview",
                {
                  p_application_id: id,
                  p_action: "mark_details_sent",
                  p_interview_at: null,
                }
              );

              if (error) throw error;

              const sentAt = new Date().toISOString();
              setInterviewDetailsSentAt(sentAt);

              Alert.alert(
                "Success",
                "Interview details have been marked as sent."
              );
            } catch (error) {
              Alert.alert(
                "Unable to Confirm",
                error.message || "Please try again."
              );
            } finally {
              setInterviewSaving(false);
            }
          },
        },
      ]
    );
  };

  const currentStep = PIPELINE.indexOf(status);
  const attachments = applicantData?.attachment_paths || [];

  const statusStyle =
    STATUS_STYLES[status] ||
    STATUS_STYLES["Application Submitted"];

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
    ? new Date(applicantData.created_at).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const interviewIsScheduled = Boolean(interviewAt);
  const interviewDetailsAreSent = Boolean(interviewDetailsSentAt);

  const formattedPickerValue =
    pickerMode === "date"
      ? pickerValue.toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : pickerValue.toLocaleTimeString("en-PH", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

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

      {/* Android native date/time picker */}
      {Platform.OS === "android" && pickerMode && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display={pickerMode === "date" ? "calendar" : "clock"}
          minimumDate={
            pickerMode === "date" ? new Date() : undefined
          }
          onChange={handlePickerChange}
        />
      )}

      {/* iOS date/time picker modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={Boolean(pickerMode)}
          transparent
          animationType="slide"
          onRequestClose={cancelPicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={cancelPicker}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>
                  {pickerMode === "date"
                    ? "Select Interview Date"
                    : "Select Interview Time"}
                </Text>

                <TouchableOpacity onPress={confirmIOSPicker}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.pickerPreview}>
                {formattedPickerValue}
              </Text>

              {pickerMode && (
                <DateTimePicker
                  value={pickerValue}
                  mode={pickerMode}
                  display="spinner"
                  minimumDate={
                    pickerMode === "date" ? new Date() : undefined
                  }
                  onChange={handlePickerChange}
                  textColor="#111827"
                  style={{ height: 180 }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}

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

                  <Ionicons
                    name="open-outline"
                    size={18}
                    color="#2623D3"
                  />
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
                    <View key={step} style={styles.progressItem}>
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

            {/* Interview Management */}
            {status === "Interview Stage" && (
              <>
                <View style={styles.divider} />

                <View style={styles.interviewHeader}>
                  <View style={styles.interviewIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={21}
                      color="#6D28D9"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>
                      Interview Management
                    </Text>

                    <Text style={styles.interviewSubtitle}>
                      Select an interview date and time, then confirm when
                      the applicant has received the details.
                    </Text>
                  </View>
                </View>

                <View style={styles.interviewStatusBox}>
                  <View style={styles.interviewStatusRow}>
                    <Text style={styles.interviewStatusLabel}>
                      Interview Schedule
                    </Text>

                    <Text
                      style={[
                        styles.interviewStatusValue,
                        {
                          color: interviewIsScheduled
                            ? "#15803D"
                            : "#B45309",
                        },
                      ]}
                    >
                      {interviewIsScheduled
                        ? "Scheduled"
                        : "Not scheduled"}
                    </Text>
                  </View>

                  <Text style={styles.interviewDateValue}>
                    {formatDateTime(interviewAt)}
                  </Text>

                  <View style={styles.interviewStatusRow}>
                    <Text style={styles.interviewStatusLabel}>
                      Details Confirmation
                    </Text>

                    <Text
                      style={[
                        styles.interviewStatusValue,
                        {
                          color: interviewDetailsAreSent
                            ? "#15803D"
                            : "#B45309",
                        },
                      ]}
                    >
                      {interviewDetailsAreSent
                        ? "Details marked as sent"
                        : "Not yet confirmed"}
                    </Text>
                  </View>

                  {interviewDetailsSentAt && (
                    <Text style={styles.interviewSentDate}>
                      Confirmed: {formatDateTime(interviewDetailsSentAt)}
                    </Text>
                  )}
                </View>

                {!interviewDetailsAreSent && (
                  <>
                    <Text style={styles.label}>
                      Interview Date
                    </Text>

                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => openPicker("date")}
                      disabled={interviewSaving}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#6D28D9"
                      />

                      <Text
                        style={[
                          styles.pickerButtonText,
                          !interviewDate && styles.pickerPlaceholder,
                        ]}
                      >
                        {interviewDate
                          ? new Date(
                              `${interviewDate}T00:00:00`
                            ).toLocaleDateString("en-PH", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Choose interview date"}
                      </Text>

                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color="#8993A8"
                      />
                    </TouchableOpacity>

                    <Text style={styles.label}>
                      Interview Time
                    </Text>

                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => openPicker("time")}
                      disabled={interviewSaving}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color="#6D28D9"
                      />

                      <Text
                        style={[
                          styles.pickerButtonText,
                          !interviewTime && styles.pickerPlaceholder,
                        ]}
                      >
                        {interviewTime
                          ? (() => {
                              const [hours, minutes] =
                                interviewTime.split(":").map(Number);

                              const date = new Date();
                              date.setHours(hours, minutes, 0, 0);

                              return date.toLocaleTimeString("en-PH", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              });
                            })()
                          : "Choose interview time"}
                      </Text>

                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color="#8993A8"
                      />
                    </TouchableOpacity>

                    <Text style={styles.inputHint}>
                      The selected date and time will be saved using your
                      device's local timezone.
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.scheduleBtn,
                        interviewSaving && styles.disabledBtn,
                      ]}
                      onPress={handleScheduleInterview}
                      disabled={interviewSaving}
                    >
                      <Ionicons
                        name="calendar"
                        size={17}
                        color="#FFFFFF"
                      />

                      <Text style={styles.btnText}>
                        {interviewSaving
                          ? "Please wait..."
                          : interviewIsScheduled
                            ? "Save New Interview Schedule"
                            : "Schedule Interview"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {interviewIsScheduled && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>
                      Confirm Interview Details
                    </Text>

                    <Text style={styles.inputHint}>
                      First, save your interview instructions in the Employer
                      Instructions / Reply section below. After you have
                      actually sent those details to the applicant, use the
                      button here to confirm.
                    </Text>

                    {!interviewDetailsAreSent ? (
                      <TouchableOpacity
                        style={[
                          styles.sentBtn,
                          interviewSaving && styles.disabledBtn,
                        ]}
                        onPress={handleMarkDetailsSent}
                        disabled={interviewSaving}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#FFFFFF"
                        />

                        <Text style={styles.btnText}>
                          Mark Interview Details as Sent
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.sentConfirmation}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#15803D"
                        />

                        <Text style={styles.sentConfirmationText}>
                          Interview details have been marked as sent.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
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
                    onPress={() => handleUpdateStatus(nextStatus)}
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
                  onPress={() => handleUpdateStatus("Not Selected")}
                  disabled={saving}
                >
                  <Text style={styles.btnText}>
                    Mark as Not Selected
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {(saving || interviewSaving) && (
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
    backgroundColor: "#F4F6F8",
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
  interviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  interviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  interviewSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  interviewStatusBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 13,
    gap: 8,
  },
  interviewStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  interviewStatusLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  interviewStatusValue: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  interviewDateValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 6,
  },
  interviewSentDate: {
    fontSize: 11,
    color: "#6B7280",
  },
  pickerButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 9,
    paddingHorizontal: 13,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  pickerPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  inputHint: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 17,
    marginTop: 7,
  },
  scheduleBtn: {
    backgroundColor: "#6D28D9",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  sentBtn: {
    backgroundColor: "#15803D",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  sentConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    marginTop: 10,
  },
  sentConfirmationText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  pickerCancel: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  pickerDone: {
    color: "#2623D3",
    fontSize: 14,
    fontWeight: "800",
  },
  pickerPreview: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#2623D3",
    marginTop: 15,
  },
});
