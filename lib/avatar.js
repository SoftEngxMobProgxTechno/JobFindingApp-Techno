import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "./supabase";

// Supabase Storage bucket that holds profile pictures (see supabase/profile-pictures.sql)
export const AVATAR_BUCKET = "avatars";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Identify the real image type from the file's first bytes (not from its name),
// so a corrupt or non-image file can never be uploaded as a profile picture.
function detectMimeType(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

// Convert a stored public URL back into its storage path (e.g. "<userId>/123.jpg")
export function getAvatarPathFromUrl(url) {
  if (!url) return null;

  const marker = `/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

// Open the photo library with a square crop. Returns the chosen asset or null if cancelled.
export async function pickAvatarImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  return result.assets?.[0] ?? null;
}

// Read the picked image into bytes.
// expo-file-system is the reliable way to read a local file on Android, so it goes
// first. fetch() is only a fallback (on Android it can report ok = false for file://).
async function readImageBytes(uri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const bytes = decode(base64);

    if (bytes.byteLength > 0) return bytes;
  } catch (error) {
    console.log("Avatar file system read failed, trying fetch:", error?.message);
  }

  try {
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();

    if (bytes.byteLength > 0) return bytes;
  } catch (error) {
    console.log("Avatar fetch read failed:", error?.message);
  }

  throw new Error("Unable to read the selected image. Please try another one.");
}

// Upload the picked image to Supabase Storage and return its public URL
async function uploadAvatarFile(userId, asset) {
  if (typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_BYTES) {
    throw new Error("Profile picture must be 5 MB or less.");
  }

  const bytes = await readImageBytes(asset.uri);

  if (bytes.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Profile picture must be 5 MB or less.");
  }

  const mimeType = detectMimeType(bytes);

  if (!mimeType) {
    throw new Error("Please choose a valid JPG, PNG, or WebP image.");
  }

  // A unique file name per upload avoids stale CDN / image caches.
  // The first folder must be the user's id to satisfy the storage policies.
  const path = `${userId}/${Date.now()}.${MIME_TO_EXTENSION[mimeType]}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

// Save (or clear) the avatar URL on the user's profiles row.
// Uses an RPC that can only change avatar_url, so it works for both roles
// without opening up role / status columns to direct updates.
async function saveAvatarUrl(url) {
  const { error } = await supabase.rpc("set_my_avatar", {
    new_avatar_url: url,
  });

  if (error) throw error;
}

// Best-effort removal of a previous picture. Never throws.
async function deleteAvatarFile(userId, url) {
  const path = getAvatarPathFromUrl(url);

  // Only ever delete files inside the user's own folder
  if (!path || !path.startsWith(`${userId}/`)) return;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);

  if (error) {
    console.log("Old avatar cleanup failed:", error.message);
  }
}

// Upload a new picture, save it on the profile, then remove the previous one.
// Returns the new public URL.
export async function changeAvatar({ userId, asset, previousUrl }) {
  if (!userId) throw new Error("No active user session.");

  const { path, publicUrl } = await uploadAvatarFile(userId, asset);

  try {
    await saveAvatarUrl(publicUrl);
  } catch (error) {
    // Don't leave an orphaned file behind if the profile update fails
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw error;
  }

  await deleteAvatarFile(userId, previousUrl);

  return publicUrl;
}

// Clear the picture from the profile and delete the stored file
export async function removeAvatar({ userId, previousUrl }) {
  if (!userId) throw new Error("No active user session.");

  await saveAvatarUrl(null);
  await deleteAvatarFile(userId, previousUrl);
}