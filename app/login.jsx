
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import FormButton from "../components/Button";
import InputField from "../components/InputField";
import styles from "../components/styles";

import { useAuth } from "../context/AuthContext";
import { validateLogin } from "../validations/authValidation";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    login,
    resendVerificationEmail,
  } = useAuth();

  const handleLogin = async () => {
    if (isLoggingIn) return;

    const validationError = validateLogin(email, password);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoggingIn(true);
    setError("");

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.message);
        return;
      }

      const role = String(
        result.user?.role || ""
      ).toLowerCase();

      if (role === "admin") {
        router.replace("/(tabs)/(admin)/dashboard");
      } else if (role === "employer") {
        router.replace("/(tabs)/(employer)/dashboard");
      } else {
        router.replace("/(tabs)/(jobseeker)");
      }
    } catch (error) {
      setError(
        error.message || "Login failed. Please try again."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendVerification = async () => {
    if (isResending) return;

    if (!email.trim()) {
      Alert.alert(
        "Email Required",
        "Please enter your registered email address first."
      );
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerificationEmail(email);

      if (!result.success) {
        Alert.alert(
          "Unable to Send Email",
          result.message
        );
        return;
      }

      Alert.alert(
        "Verification Email Sent",
        "If your account is eligible for verification, a new verification email will be sent. Please check your inbox and spam folder."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to resend verification email. Please try again."
      );
    } finally {
      setIsResending(false);
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
          <Image
            source={require("../assets/images/inJob-horizontal-dark.png")}
            style={styles.inJob_logo}
          />

          <View style={styles.card}>
            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Login to your account to continue
            </Text>

            <View style={styles.form}>
              <InputField
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
              />

              <InputField
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push("/forgot-password")}
              >
                <Text style={styles.forgotText}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {error !== "" && (
                <Text style={styles.errorText}>
                  {error}
                </Text>
              )}

              {error.toLowerCase().includes(
                "verify your email"
              ) && (
                <TouchableOpacity
                  onPress={handleResendVerification}
                  disabled={isResending}
                  style={{ marginBottom: 15 }}
                >
                  <Text
                    style={{
                      color: "#2623D3",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    {isResending
                      ? "Sending verification email..."
                      : "Resend Verification Email"}
                  </Text>
                </TouchableOpacity>
              )}

              <FormButton
                btnTitle={
                  isLoggingIn ? "Logging in..." : "Login"
                }
                onPress={handleLogin}
                disabled={isLoggingIn || isResending}
              />
            </View>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Don't have an account?
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/selectRole")}
              >
                <Text style={styles.registerLink}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
