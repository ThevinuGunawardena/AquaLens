import { showAlert } from "@/services/alerts";
import { ApiError } from "@/services/api";
import { catchesApi } from "@/services/catchesApi";
import type { RootState } from "@/store";
import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface CatchPhotoUploadProps {
  /**
   * Called with the hosted image URL once the upload succeeds,
   * or null if the photo is cleared.
   */
  onUploaded?: (url: string | null) => void;
  /** Notifies parent when an upload starts or finishes. */
  onUploadingChange?: (uploading: boolean) => void;
}

const CatchPhotoUpload = ({
  onUploaded,
  onUploadingChange,
}: CatchPhotoUploadProps) => {
  const colors = useSelector((state: RootState) => state.theme.colors);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const localUri = asset.uri;

      setImageUri(localUri);
      setUploading(true);
      onUploadingChange?.(true);

      try {
        const url = await catchesApi.uploadImage(localUri, {
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });
        onUploaded?.(url);
      } catch (e) {
        let message = "Couldn't upload the photo.";
        if (e instanceof ApiError) {
          message = e.message;
        } else if (e instanceof Error) {
          message = e.message;
        } else if (typeof e === "string") {
          message = e;
        }

        showAlert("Upload failed", message);
        setImageUri(null);
        onUploaded?.(null);
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Something went wrong while selecting the image.";
      showAlert("Image Error", message);
    }
  };

  const clearImage = () => {
    if (uploading) {
      return;
    }

    setImageUri(null);
    onUploaded?.(null);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={uploading ? undefined : pickImage}
        style={[
          styles.uploadContainer,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.border,
          },
        ]}
      >
        {imageUri ? (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />

            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color="#fff" />

                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.cameraContainer,
                {
                  backgroundColor: `${colors.accent}1A`,
                },
              ]}
            >
              <Camera size={28} color={colors.accent} />
            </View>

            <Text
              style={[
                styles.uploadText,
                {
                  color: colors.accent,
                },
              ]}
            >
              UPLOAD PHOTO
            </Text>

            <Text
              style={[
                styles.formatText,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              JPEG or PNG
            </Text>
          </View>
        )}
      </Pressable>

      {imageUri && !uploading && (
        <Pressable
          onPress={clearImage}
          accessibilityLabel="Remove photo"
          style={styles.clearButton}
          hitSlop={8}
        >
          <X size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
  },

  uploadContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  uploadOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  uploadingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  clearButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  cameraContainer: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  uploadText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  formatText: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
});

export default CatchPhotoUpload;
