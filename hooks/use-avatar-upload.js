import { useState } from "react";
import { Alert } from "react-native";

import { changeAvatar, pickAvatarImage, removeAvatar } from "../lib/avatar";

export function useAvatarUpload({ userId, avatarUrl, onChange }) {
  const [uploading, setUploading] = useState(false);

  const choosePhoto = async () => {
    try {
      const asset = await pickAvatarImage();
      if (!asset) return;

      setUploading(true);

      const newUrl = await changeAvatar({
        userId,
        asset,
        previousUrl: avatarUrl,
      });

      onChange?.(newUrl);
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error?.message || "Unable to update your profile picture."
      );
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    try {
      setUploading(true);
      await removeAvatar({ userId, previousUrl: avatarUrl });
      onChange?.(null);
    } catch (error) {
      Alert.alert(
        "Unable to remove photo",
        error?.message || "Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const openMenu = () => {
    if (uploading) return;

    if (!avatarUrl) {
      choosePhoto();
      return;
    }

    Alert.alert("Profile picture", undefined, [
      { text: "Choose new photo", onPress: choosePhoto },
      {
        text: "Remove photo",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Remove photo?",
            "Your profile picture will be replaced by your initials.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: deletePhoto },
            ]
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return { uploading, openMenu };
}