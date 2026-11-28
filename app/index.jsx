
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const SPLASH_BACKGROUND = "#2624D0";
const LOADING_YELLOW = "#F4D34E";

export default function Index() {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || showSplash) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={SPLASH_BACKGROUND}
        />

        {/* Centered inJob Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Image
              source={require("../assets/images/injob-logo.png")}
              style={styles.iconLogo}
              resizeMode="contain"
            />
          </View>

          <Image
            source={require("../assets/images/inJob-letters-only-light.png")}
            style={styles.textLogo}
            resizeMode="contain"
          />
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={LOADING_YELLOW}
          />

          <Text style={styles.loadingText}>
            Preparing your workspace...
          </Text>
        </View>
      </View>
    );
  }

  if (!currentUser) {
    return <Redirect href="/login" />;
  }

  if (currentUser.role === "Admin") {
    return <Redirect href="/(tabs)/(admin)/dashboard" />;
  }

  if (currentUser.role === "Employer") {
    return <Redirect href="/(tabs)/(employer)/dashboard" />;
  }

  return <Redirect href="/(tabs)/(jobseeker)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    justifyContent: "center",
    alignItems: "center",
  },

  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  iconLogo: {
    width: 55,
    height: 55,
  },

  textLogo: {
    width: 78,
    height: 25,
    marginTop: 12,
  },

  loadingContainer: {
    position: "absolute",
    bottom: 46,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  loadingText: {
    color: LOADING_YELLOW,
    fontSize: 10,
    fontWeight: "600",
  },
});
