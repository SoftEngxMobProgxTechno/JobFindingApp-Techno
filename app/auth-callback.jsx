import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [status, setStatus] = useState("processing");
  const [errorMessage, setErrorMessage] = useState("");

  const processingRef = useRef(false);
  const completedRef = useRef(false);
  const processedLinksRef = useRef(new Set());

  // Handles parameters that Expo Router may return as arrays.
  const getValue = (value) => {
    if (Array.isArray(value)) {
      return value[0] ?? "";
    }

    return value ?? "";
  };

  // Prevent the same authentication credentials from being processed twice.
  const getLinkKey = (authData) => {
    return (
      authData.code ||
      authData.token_hash ||
      `${authData.access_token || ""}:${authData.refresh_token || ""}`
    );
  };

  const processAuthData = useCallback(async (authData) => {
    if (processingRef.current || completedRef.current) {
      return;
    }

    const code = getValue(authData.code);
    const tokenHash = getValue(authData.token_hash);
    const accessToken = getValue(authData.access_token);
    const refreshToken = getValue(authData.refresh_token);

    // Recovery type can come from Supabase or the redirect URL.
    const type = getValue(authData.type);

    const linkKey = getLinkKey({
      code,
      token_hash: tokenHash,
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!linkKey) {
      return;
    }

    if (processedLinksRef.current.has(linkKey)) {
      return;
    }

    processedLinksRef.current.add(linkKey);
    processingRef.current = true;
    setStatus("processing");
    setErrorMessage("");

    console.log("AUTH CALLBACK:", {
      hasCode: !!code,
      hasTokenHash: !!tokenHash,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      type: type || "unknown",
    });

    try {
      let result;

      // PKCE flow
      if (code) {
        console.log("AUTH CALLBACK: Exchanging PKCE code.");

        result = await supabase.auth.exchangeCodeForSession(code);
      }
      // Token hash flow
      else if (tokenHash) {
        if (!type) {
          throw new Error(
            "The authentication type is missing from the email link."
          );
        }

        console.log("AUTH CALLBACK: Verifying token hash.");

        result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
      }
      // Direct session token flow
      else if (accessToken && refreshToken) {
        console.log("AUTH CALLBACK: Setting session.");

        result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } else {
        throw new Error("No valid authentication credentials were found.");
      }

      if (result?.error) {
        throw result.error;
      }

      const session = result?.data?.session;

      if (!session) {
        throw new Error(
          "Authentication succeeded, but no session was returned."
        );
      }

      completedRef.current = true;

      console.log("AUTH CALLBACK: Authentication successful.");

      // Password recovery
      if (type === "recovery") {
        console.log("AUTH CALLBACK: Opening reset password screen.");

        router.replace("/reset-password");
        return;
      }

      // Email verification
      console.log("AUTH CALLBACK: Email verification completed.");

      await supabase.auth.signOut();

      setStatus("success");

      Alert.alert(
        "Email Verified!",
        "Your email has been successfully verified. You can now log in.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/login"),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.log("AUTH CALLBACK ERROR:", error?.message);

      processedLinksRef.current.delete(linkKey);

      setErrorMessage(
        error?.message ||
          "Something went wrong while processing your authentication link."
      );

      setStatus("error");
    } finally {
      processingRef.current = false;
    }
  }, [router]);

  // Parse incoming URL, including query parameters and hash parameters.
  const handleAuthLink = useCallback(async (url, source) => {
    if (!url || completedRef.current) {
      return;
    }

    try {
      const parsedUrl = new URL(url);

      const queryParams = new URLSearchParams(parsedUrl.search);

      const hashParams = new URLSearchParams(
        parsedUrl.hash.startsWith("#")
          ? parsedUrl.hash.substring(1)
          : parsedUrl.hash
      );

      const authData = {};

      const allKeys = new Set([
        ...queryParams.keys(),
        ...hashParams.keys(),
      ]);

      allKeys.forEach((key) => {
        authData[key] =
          queryParams.get(key) ?? hashParams.get(key);
      });

      console.log("AUTH LINK RECEIVED:", {
        source,
        queryKeys: [...queryParams.keys()],
        hashKeys: [...hashParams.keys()],
        hasCode: !!authData.code,
        hasTokenHash: !!authData.token_hash,
        hasAccessToken: !!authData.access_token,
        hasRefreshToken: !!authData.refresh_token,
        type: authData.type || "unknown",
      });

      // Supabase may return authentication errors in the URL.
      if (authData.error || authData.error_description) {
        throw new Error(
          authData.error_description ||
            authData.error ||
            "The authentication link is invalid or expired."
        );
      }

      await processAuthData(authData);
    } catch (error) {
      console.log("AUTH LINK ERROR:", error?.message);

      if (!completedRef.current) {
        setErrorMessage(
          error?.message || "Unable to read the authentication link."
        );
        setStatus("error");
      }
    }
  }, [processAuthData]);

  // Listen for deep links while the app is already running.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleAuthLink(url, "incoming event");
    });

    return () => {
      subscription.remove();
    };
  }, [handleAuthLink]);

  // Read the deep link that opened the app.
  useEffect(() => {
    let active = true;

    Linking.getInitialURL()
      .then((url) => {
        if (active && url) {
          handleAuthLink(url, "initial URL");
        }
      })
      .catch((error) => {
        console.log("INITIAL URL ERROR:", error?.message);
      });

    return () => {
      active = false;
    };
  }, [handleAuthLink]);

  // Fallback: process authentication parameters supplied by Expo Router.
  useEffect(() => {
    const authData = {
      code: getValue(params.code),
      token_hash: getValue(params.token_hash),
      access_token: getValue(params.access_token),
      refresh_token: getValue(params.refresh_token),
      type: getValue(params.type),
      error: getValue(params.error),
      error_description: getValue(params.error_description),
    };

    if (
      authData.code ||
      authData.token_hash ||
      (authData.access_token && authData.refresh_token) ||
      authData.error ||
      authData.error_description
    ) {
      processAuthData(authData);
    }
  }, [
    params.code,
    params.token_hash,
    params.access_token,
    params.refresh_token,
    params.type,
    params.error,
    params.error_description,
    processAuthData,
  ]);

  // Timeout for missing links OR stalled authentication requests.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (completedRef.current) {
        return;
      }

      if (status === "processing") {
        setErrorMessage(
          processingRef.current
            ? "Authentication is taking too long. The link may have expired or the connection may be unstable. Please try requesting a new link."
            : "We couldn't find authentication information in the link. Please request a new email and try again."
        );

        setStatus("error");
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [status]);

  return (
    <View style={styles.container}>
      {status === "processing" && (
        <>
          <ActivityIndicator size="large" color="#16A34A" />

          <Text style={styles.title}>
            Processing your link...
          </Text>

          <Text style={styles.subtitle}>
            Please wait while we verify your authentication.
          </Text>
        </>
      )}

      {status === "success" && (
        <>
          <Text style={styles.successIcon}>✓</Text>

          <Text style={styles.title}>
            Email Verified!
          </Text>

          <Text style={styles.subtitle}>
            Your email has been successfully verified.
          </Text>
        </>
      )}

      {status === "error" && (
        <>
          <Text style={styles.errorIcon}>!</Text>

          <Text style={styles.title}>
            Authentication Failed
          </Text>

          <Text style={styles.subtitle}>
            {errorMessage}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.buttonText}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222222",
    marginTop: 20,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
  },

  successIcon: {
    fontSize: 55,
    fontWeight: "bold",
    color: "#16A34A",
  },

  errorIcon: {
    fontSize: 55,
    fontWeight: "bold",
    color: "#DC2626",
  },

  button: {
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 25,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});