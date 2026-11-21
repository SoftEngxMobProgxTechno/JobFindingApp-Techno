import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import styles from "./stylesIn";

export default function ProfileAvatar({
  uri,
  initials,
  uploading = false,
  onPress,
  size = 88,
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = Boolean(uri) && !failed;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="Change profile picture"
      style={[local.wrapper, { width: size, height: size }]}
    >
      <View
        style={[
          styles.empAvatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginBottom: 0,
            overflow: "hidden",
          },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={styles.empAvatarText}>{initials}</Text>
        )}

        {uploading && (
          <View style={local.overlay}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
      </View>

      {!uploading && (
        <View style={local.badge}>
          <Ionicons name="camera" size={14} color="#2623D3" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const local = StyleSheet.create({
  wrapper: { marginBottom: 13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 28, 75, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#2623D3",
    alignItems: "center",
    justifyContent: "center",
  },
});