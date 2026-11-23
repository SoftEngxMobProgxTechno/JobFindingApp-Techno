
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Text,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import styles from "../components/styles";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  const [message, setMessage] = useState(
    "Verifying your email address..."
  );

  const [loading, setLoading] = useState(true);

  const processedUrls = useRef(new Set());

  useEffect(() => {
    let active = true;

    const handleVerification = async (url) => {
      if (!url || processedUrls.current.has(url)) return;

      processedUrls.current.add(url);

      try {
        // Get query and hash parameters
        const queryString =
          url.split("?")[1]?.split("#")[0] || "";

        const hashString =
          url.split("#")[1] || "";

        const params = new URLSearchParams(
          `${queryString}&${hashString}`
        );

        const code = params.get("code");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        const errorDescription =
          params.get("error_description");

        if (errorDescription) {
          throw new Error(
            decodeURIComponent(
              errorDescription.replace(/\+/g, " ")
            )
          );
        }

        let authError = null;

        // Handle PKCE verification links
        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          authError = error;
        }

        // Handle token-based verification links
        else if (accessToken && refreshToken) {
          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          authError = error;
        } else {
          throw new Error(
            "Invalid verification link. Please request a new verification email."
          );
        }

        if (authError) throw authError;

        if (!active) return;

        setMessage("Email verified successfully!");

        // Require the user to log in manually
        await supabase.auth.signOut();

        if (!active) return;

        setLoading(false);

        Alert.alert(
          "Email Verified!",
          "Your email address has been successfully verified. You can now log in to your inJob account.",
          [
            {
              text: "Go to Login",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      } catch (error) {
        if (!active) return;

        setMessage(
          error.message ||
            "Unable to verify your email address."
        );

        setLoading(false);

        Alert.alert(
          "Verification Failed",
          error.message ||
            "Your verification link may have expired. Please request a new one.",
          [
            {
              text: "Go to Login",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      }
    };

    const checkInitialLink = async () => {
      const url = await Linking.getInitialURL();

      if (url) {
        await handleVerification(url);
      } else if (active) {
        setLoading(false);
        setMessage(
          "No verification link was received."
        );

        Alert.alert(
          "Verification Link Missing",
          "Please open the verification link from your email again.",
          [
            {
              text: "Go to Login",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      }
    };

    checkInitialLink();

    const subscription = Linking.addEventListener(
      "url",
      ({ url }) => handleVerification(url)
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 25,
        }}
      >
        {loading && (
          <ActivityIndicator
            size="large"
            color="#2623D3"
          />
        )}

        <Text
          style={{
            marginTop: 15,
            fontSize: 16,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}
