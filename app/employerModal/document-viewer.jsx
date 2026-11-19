
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { supabase } from "../../lib/supabase";

export default function DocumentViewerScreen() {
  const { path } = useLocalSearchParams();

  const filePath = Array.isArray(path) ? path[0] : path;

  const webViewRef = useRef(null);

  const [signedUrl, setSignedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  const fileName = useMemo(() => {
    const name =
      String(filePath || "").split("/").pop() ||
      "Application document";

    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }, [filePath]);

  const extension = (
    fileName.split(".").pop() || ""
  ).toLowerCase();

  const isImage = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "bmp",
  ].includes(extension);

  const isPdf = extension === "pdf";

  // Load private Supabase document.
  useEffect(() => {
    let active = true;

    const loadFile = async () => {
      if (!filePath) {
        setError("Document path is missing.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: urlError } =
          await supabase.storage
            .from("application-documents")
            .createSignedUrl(filePath, 600);

        if (urlError) throw urlError;

        if (!data?.signedUrl) {
          throw new Error(
            "Unable to generate document link."
          );
        }

        if (active) {
          setSignedUrl(data.signedUrl);
        }
      } catch (e) {
        if (active) {
          setError(
            e.message || "Unable to load document."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFile();

    return () => {
      active = false;
    };
  }, [filePath]);

  // Zoom controls shared by PDF and images.
  const changeZoom = (amount) => {
    setZoom((current) => {
      const next = Math.min(
        4,
        Math.max(
          0.5,
          Number((current + amount).toFixed(2))
        )
      );

      webViewRef.current?.injectJavaScript(
        `if(window.zoomDocument){window.zoomDocument(${next});} true;`
      );

      return next;
    });
  };

  const resetZoom = () => {
    setZoom(1);

    webViewRef.current?.injectJavaScript(
      `if(window.zoomDocument){window.zoomDocument(1);} true;`
    );
  };

  // Save or share the original document.
  const saveToDevice = async () => {
    if (!signedUrl || saving) return;

    setSaving(true);

    try {
      const available = await Sharing.isAvailableAsync();

      if (!available) {
        throw new Error(
          "Sharing is not available on this device."
        );
      }

      const safeName = fileName.replace(
        /[^\w.\-() ]/g,
        "_"
      );

      const localUri =
        `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;

      const result = await FileSystem.downloadAsync(
        signedUrl,
        localUri
      );

      await Sharing.shareAsync(result.uri, {
        mimeType: isPdf
          ? "application/pdf"
          : undefined,
        dialogTitle: `Save ${fileName}`,
        UTI: isPdf
          ? "com.adobe.pdf"
          : undefined,
      });
    } catch (e) {
      Alert.alert(
        "Unable to Save File",
        e.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Document preview HTML.
  const html = useMemo(() => {
    if (!signedUrl) return "";

    const safeUrl = JSON.stringify(signedUrl);

    // ==========================================
    // IMAGE VIEWER WITH PINCH AND PAN
    // ==========================================
    if (isImage) {
      return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport"
content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111827;
  touch-action: none;
}

#viewer {
  position: fixed;
  inset: 0;
  overflow: hidden;
  touch-action: none;
}

#documentImage {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  width: auto;
  height: auto;
  object-fit: contain;
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
  will-change: transform;
}

#message {
  position: absolute;
  top: 50%;
  width: 100%;
  text-align: center;
  color: white;
  font-family: Arial;
}
</style>
</head>

<body>

<div id="viewer">
  <div id="message">Loading image...</div>
  <img id="documentImage"
    src=${safeUrl}
    draggable="false"
    style="display:none"
  />
</div>

<script>
const viewer = document.getElementById("viewer");
const img = document.getElementById("documentImage");
const message = document.getElementById("message");

let zoom = 1;
const minZoom = 1;
const maxZoom = 4;

let translateX = 0;
let translateY = 0;

let startDistance = 0;
let startZoom = 1;

let startX = 0;
let startY = 0;

let initialX = 0;
let initialY = 0;

let lastTap = 0;
let gesture = null;

let lastReportedZoom = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;

  return Math.sqrt(dx * dx + dy * dy);
}

function notifyZoom() {
  if (
    Math.abs(zoom - lastReportedZoom) >= 0.02 ||
    zoom === 1 ||
    zoom === 4
  ) {
    lastReportedZoom = zoom;

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "zoom",
          value: zoom
        })
      );
    }
  }
}

function applyTransform() {
  const width = img.offsetWidth * zoom;
  const height = img.offsetHeight * zoom;

  const maxX = Math.max(
    0,
    (width - viewer.clientWidth) / 2
  );

  const maxY = Math.max(
    0,
    (height - viewer.clientHeight) / 2
  );

  // Keep the image inside its actual viewing boundaries.
  translateX = clamp(
    translateX,
    -maxX,
    maxX
  );

  translateY = clamp(
    translateY,
    -maxY,
    maxY
  );

  img.style.transform =
    "translate(calc(-50% + " +
    translateX +
    "px), calc(-50% + " +
    translateY +
    "px)) scale(" +
    zoom +
    ")";

  notifyZoom();
}

function fitImage() {
  if (!img.naturalWidth || !img.naturalHeight) {
    return;
  }

  const availableWidth = viewer.clientWidth;
  const availableHeight = viewer.clientHeight;

  const fit = Math.min(
    availableWidth / img.naturalWidth,
    availableHeight / img.naturalHeight
  );

  img.style.width =
    img.naturalWidth * fit + "px";

  img.style.height =
    img.naturalHeight * fit + "px";

  zoom = 1;
  translateX = 0;
  translateY = 0;

  applyTransform();

  img.style.display = "block";
  message.style.display = "none";
}

function zoomDocument(value) {
  zoom = clamp(value, minZoom, maxZoom);
  applyTransform();
}

window.zoomDocument = zoomDocument;

// ------------------------------------------
// TOUCH START
// ------------------------------------------

function handleStart(e) {
  e.preventDefault();

  if (e.touches.length === 2) {
    gesture = "pinch";

    startDistance = distance(
      e.touches[0],
      e.touches[1]
    );

    startZoom = zoom;

    return;
  }

  if (e.touches.length === 1) {
    const now = Date.now();

    // Double tap to toggle zoom.
    if (now - lastTap < 300) {
      zoom = zoom > 1 ? 1 : 2;

      translateX = 0;
      translateY = 0;

      applyTransform();

      lastTap = 0;
      gesture = null;

      return;
    }

    lastTap = now;

    gesture = "pan";

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    initialX = translateX;
    initialY = translateY;
  }
}

// ------------------------------------------
// TOUCH MOVE
// ------------------------------------------

function handleMove(e) {
  e.preventDefault();

  // Two fingers = pinch to zoom.
  if (e.touches.length === 2) {
    if (gesture !== "pinch") {
      gesture = "pinch";

      startDistance = distance(
        e.touches[0],
        e.touches[1]
      );

      startZoom = zoom;

      return;
    }

    const newDistance = distance(
      e.touches[0],
      e.touches[1]
    );

    if (startDistance > 0) {
      zoom = clamp(
        startZoom *
          (newDistance / startDistance),
        minZoom,
        maxZoom
      );

      applyTransform();
    }

    return;
  }

  // One finger = freely pan the enlarged image.
  if (
    e.touches.length === 1 &&
    gesture === "pan" &&
    zoom > 1
  ) {
    const touch = e.touches[0];

    translateX =
      initialX + touch.clientX - startX;

    translateY =
      initialY + touch.clientY - startY;

    applyTransform();
  }
}

// ------------------------------------------
// TOUCH END
// ------------------------------------------

function handleEnd(e) {
  if (e.touches.length === 1) {
    // If one finger remains after pinching,
    // allow it to continue panning without jumping.
    gesture = "pan";

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    initialX = translateX;
    initialY = translateY;

    startDistance = 0;

  } else if (e.touches.length === 0) {
    gesture = null;
    startDistance = 0;
  }
}

viewer.addEventListener(
  "touchstart",
  handleStart,
  { passive: false }
);

viewer.addEventListener(
  "touchmove",
  handleMove,
  { passive: false }
);

viewer.addEventListener(
  "touchend",
  handleEnd,
  { passive: false }
);

viewer.addEventListener(
  "touchcancel",
  handleEnd,
  { passive: false }
);

img.onload = fitImage;

img.onerror = function() {
  message.textContent = "Unable to load image.";
};

if (img.complete && img.naturalWidth) {
  fitImage();
}

window.addEventListener("resize", fitImage);

</script>

</body>
</html>`;
    }

    // ==========================================
    // PDF VIEWER
    // ==========================================
    if (isPdf) {
      return `<!DOCTYPE html>
<html>
<head>

<meta name="viewport"
content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #525659;
  font-family: Arial, sans-serif;
  overflow: auto;
}

#message {
  color: white;
  text-align: center;
  padding: 20px;
}

#pages {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

canvas {
  background: white;
  max-width: none;
  box-shadow: 0 2px 8px #222;
}
</style>

</head>

<body>

<div id="message">Loading document...</div>
<div id="pages"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

<script>
const fileUrl = ${safeUrl};

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdf = null;
let currentZoom = 1;
let rendering = false;
let renderAgain = false;

window.zoomDocument = function(value) {
  currentZoom = Math.max(
    0.5,
    Math.min(4, value)
  );

  if (rendering) {
    renderAgain = true;
  } else {
    render();
  }
};

async function render() {
  if (!pdf) return;

  if (rendering) {
    renderAgain = true;
    return;
  }

  rendering = true;

  const pages = document.getElementById("pages");
  const message = document.getElementById("message");

  message.textContent = "";
  pages.innerHTML = "";

  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);

      const base = page.getViewport({
        scale: 1
      });

      const available = Math.max(
        280,
        window.innerWidth - 24
      );

      const fit = Math.min(
        1.5,
        available / base.width
      );

      const viewport = page.getViewport({
        scale: fit * currentZoom
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      canvas.style.width =
        viewport.width + "px";

      canvas.style.height =
        viewport.height + "px";

      pages.appendChild(canvas);

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    }

  } catch (e) {
    message.textContent =
      "Unable to display this PDF.";
  }

  rendering = false;

  if (renderAgain) {
    renderAgain = false;
    render();
  }
}

pdfjsLib.getDocument({
  url: fileUrl
}).promise.then((document) => {
  pdf = document;
  render();

}).catch(() => {
  document.getElementById("message").textContent =
    "Unable to load PDF. Check your internet connection.";
});

</script>

</body>
</html>`;
    }

    // ==========================================
    // UNSUPPORTED FILE
    // ==========================================
    return `<!DOCTYPE html>
<html>
<body style="background:#111827;color:white;padding:24px;font-family:Arial">
<p>Preview is unavailable for this file type.</p>
<p>Please use the Save button to open it with another application.</p>
</body>
</html>`;
  }, [signedUrl, isImage, isPdf]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom", "left", "right"]}
    >
      <Stack.Screen
        options={{
          title: "Document Preview",
          headerShown: true,
        }}
      />

      {/* FILE HEADER */}
      <View style={styles.fileHeader}>
        <Ionicons
          name={
            isImage
              ? "image-outline"
              : "document-text-outline"
          }
          size={20}
          color="#2623D3"
        />

        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveToDevice}
          disabled={!signedUrl || saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#FFF"
            />
          ) : (
            <>
              <Ionicons
                name="download-outline"
                size={17}
                color="#FFF"
              />

              <Text style={styles.saveText}>
                Save
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ZOOM TOOLBAR */}
      {(isImage || isPdf) &&
        !loading &&
        !error && (
          <View style={styles.zoomToolbar}>
            <Text style={styles.zoomLabel}>
              Zoom
            </Text>

            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => changeZoom(-0.25)}
                disabled={zoom <= 0.5}
              >
                <Ionicons
                  name="remove"
                  size={22}
                  color={
                    zoom <= 0.5
                      ? "#9CA3AF"
                      : "#2623D3"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomPercentage}
                onPress={resetZoom}
              >
                <Text style={styles.zoomText}>
                  {Math.round(zoom * 100)}%
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => changeZoom(0.25)}
                disabled={zoom >= 4}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={
                    zoom >= 4
                      ? "#9CA3AF"
                      : "#2623D3"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetZoom}
              >
                <Ionicons
                  name="refresh"
                  size={17}
                  color="#2623D3"
                />

                <Text style={styles.resetText}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* DOCUMENT CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#2623D3"
          />

          <Text style={styles.helper}>
            Loading document...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#DC2626"
          />

          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          key={signedUrl}
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          onMessage={(event) => {
            try {
              const message = JSON.parse(
                event.nativeEvent.data
              );

              if (message.type === "zoom") {
                setZoom(message.value);
              }
            } catch {}
          }}
          onError={() =>
            setError(
              "Unable to display this document."
            )
          }
        />
      )}

      {!isImage &&
        !isPdf &&
        !loading &&
        !error && (
          <Text style={styles.unsupported}>
            This file type cannot be previewed.
            Use Save to open it with another application.
          </Text>
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  fileHeader: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  fileName: {
    flex: 1,
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2623D3",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  saveText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  zoomToolbar: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  zoomLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomPercentage: {
    minWidth: 48,
    alignItems: "center",
  },

  zoomText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
  },

  resetText: {
    color: "#2623D3",
    fontSize: 12,
    fontWeight: "600",
  },

  webview: {
    flex: 1,
    backgroundColor: "#111827",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },

  helper: {
    color: "#6B7280",
    fontSize: 13,
  },

  error: {
    color: "#B91C1C",
    textAlign: "center",
    fontSize: 14,
  },

  unsupported: {
    padding: 10,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 12,
    backgroundColor: "#FFF",
  },
});
