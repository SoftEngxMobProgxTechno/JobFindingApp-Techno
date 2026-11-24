
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure how notifications appear while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register this device's Expo Push Token
export async function registerPushToken(userId) {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission was not granted.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      throw new Error("EAS project ID is missing.");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenData.data;

    const { error } = await supabase
      .from("device_push_tokens")
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,expo_push_token",
        }
      );

    if (error) throw error;

    console.log("Push token registered successfully.");

    return expoPushToken;
  } catch (error) {
    console.error("Push Token Registration Error:", error);
    return null;
  }
}

// Remove this device's token association on logout
export async function removePushToken(userId) {
  try {
    if (!Device.isDevice) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const { error } = await supabase
      .from("device_push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("expo_push_token", tokenData.data);

    if (error) throw error;

    console.log("Push token removed successfully.");
  } catch (error) {
    console.error("Push Token Removal Error:", error);
  }
}
