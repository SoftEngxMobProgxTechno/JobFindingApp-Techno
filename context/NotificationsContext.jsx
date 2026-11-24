import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { currentUser } = useAuth();

    // Register this device for push notifications.
  useEffect(() => {
    if (!currentUser?.id) return;

    const registerPushToken = async () => {
      try {
        // Android requires a notification channel.
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(
            "default",
            {
              name: "Default",
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
            }
          );
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
          console.log("Push notification permission not granted.");
          return;
        }

        const projectId =
          Constants.easConfig?.projectId ||
          Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          throw new Error("Expo project ID not found.");
        }

        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        const { error } = await supabase
          .from("device_push_tokens")
          .upsert(
            {
              user_id: currentUser.id,
              expo_push_token: token,
              platform: Platform.OS,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,expo_push_token",
            }
          );

        if (error) throw error;

        console.log("Push notification device registered.");
      } catch (error) {
        console.error(
          "Push registration error:",
          error.message
        );
      }
    };

    registerPushToken();
  }, [currentUser?.id]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  // Fetch notifications belonging to the logged-in user.
  const refreshNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err) {
      console.error("Fetch notifications error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Mark one notification as read.
  const markAsRead = async (notificationId) => {
    if (!currentUser?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("recipient_id", currentUser.id);

      if (updateError) throw updateError;

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId
            ? { ...item, is_read: true }
            : item
        )
      );

      return true;
    } catch (err) {
      console.error("Mark notification as read error:", err.message);
      return false;
    }
  };

  // Mark all notifications as read.
  const markAllAsRead = async () => {
    if (!currentUser?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", currentUser.id)
        .eq("is_read", false);

      if (updateError) throw updateError;

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      return true;
    } catch (err) {
      console.error("Mark all notifications as read error:", err.message);
      return false;
    }
  };

  // Load notifications and subscribe to new notifications.
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    const userId = currentUser.id;
    let active = true;

    const loadNotifications = async () => {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (fetchError) {
        console.error(
          "Initial notification load error:",
          fetchError.message
        );
        setError(fetchError.message);
      } else {
        setNotifications(data || []);
      }
    };

    loadNotifications();

    // Listen for notifications created for this user.
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;

          setNotifications((previous) => {
            // Prevent duplicate entries.
            const alreadyExists = previous.some(
              (item) => item.id === newNotification.id
            );

            if (alreadyExists) return previous;

            return [newNotification, ...previous];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Notification realtime connected.");
        }
      });

    // Refresh notifications when the app becomes active again.
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          loadNotifications();
        }
      }
    );

    return () => {
      active = false;

      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider."
    );
  }

  return context;
}