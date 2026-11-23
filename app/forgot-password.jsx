
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import FormButton from "../components/Button";
import InputField from "../components/InputField";
import styles from "../components/styles";

import { supabase } from "../lib/supabase";

const RESET_REDIRECT_URL =
  "jobfindingapp://auth-callback?type=recovery";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResetRequest = async () => {
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: RESET_REDIRECT_URL,
          }
        );

      if (resetError) throw resetError;

      Alert.alert(
        "Check Your Email",
        "If an account exists with that email address, Supabase will send a password-reset link. Please check your inbox and spam folder.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (err) {
      setError(
        err.message || "Unable to send the reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>
              Forgot Password?
            </Text>

            <Text style={styles.subtitle}>
              Enter the email address associated with your inJob account. We'll send you a link to reset your password.
            </Text>

            <View style={styles.form}>
              <InputField
                label="Email"
                placeholder="Enter your registered email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
              />

              {error !== "" && (
                <Text style={styles.errorText}>
                  {error}
                </Text>
              )}

              <FormButton
                btnTitle={
                  loading ? "Sending..." : "Send Reset Link"
                }
                onPress={handleResetRequest}
              />
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Remember your password?
              </Text>

              <Text
                style={styles.loginLink}
                onPress={() => router.replace("/login")}
              >
                Login
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
