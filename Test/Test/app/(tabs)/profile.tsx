import Achievements from "@/components/Achievements";
import AddedPhotos from "@/components/AddedPhotos";
import TopHeader from "@/components/TopHeader";
import { showAlert } from "@/services/alerts";
import { ApiError } from "@/services/api";
import { catchesApi, type UploadImageMetadata } from "@/services/catchesApi";
import type { AppDispatch, RootState } from "@/store";
import { fetchMe, updateProfile } from "@/store/authSlice";
import type { ThemeColors } from "@/store/ThemeSlice";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { Camera, Check, Pencil, UserRound, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const ProfileField = ({
  label,
  value,
  editable,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText: (value: string) => void;
  colors: ThemeColors;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
      {label}
    </Text>
    <TextInput
      value={value}
      editable={editable}
      onChangeText={onChangeText}
      autoCapitalize={label === "EMAIL" ? "none" : "words"}
      keyboardType={label === "EMAIL" ? "email-address" : "default"}
      style={[
        styles.fieldInput,
        {
          color: colors.foreground,
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.border,
          opacity: editable ? 1 : 0.7,
        },
      ]}
      placeholderTextColor={colors.mutedForeground}
    />
  </View>
);

function StatPill({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  valueColor?: string;
}) {
  return (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          { color: valueColor ?? colors.primaryContainer },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const Profile = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const user = useSelector((state: RootState) => state.auth.user);
  const authStatus = useSelector((state: RootState) => state.auth.status);
  const dispatch = useDispatch<AppDispatch>();

  const [isEditing, setIsEditing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<UploadImageMetadata | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [totalCatches, setTotalCatches] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    school_or_university: user?.school_or_university ?? "",
    district: user?.district ?? "",
  });

  const displayForm = isEditing
    ? form
    : {
        name: user?.name ?? "",
        email: user?.email ?? "",
        school_or_university: user?.school_or_university ?? "",
        district: user?.district ?? "",
      };

  const toggleEditing = () => {
    if (isEditing) {
      setPhotoUri(null);
      setPhotoMeta(undefined);
      setIsEditing(false);
      return;
    }
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      school_or_university: user?.school_or_university ?? "",
      district: user?.district ?? "",
    });
    setIsEditing(true);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      dispatch(fetchMe());
      // limit=1 avoids pulling every catch just to read `total`.
      catchesApi
        .mineWithTotal(1, 0)
        .then((res) => {
          if (!cancelled) setTotalCatches(res.total);
        })
        .catch(() => {
          // Non-fatal — the stat pill just shows a dash.
        });
      return () => {
        cancelled = true;
      };
    }, [dispatch]),
  );

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Photo access needed",
        "Allow photo access to choose a profile image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      setPhotoMeta({ fileName: asset.fileName, mimeType: asset.mimeType });
      if (!isEditing) {
        setForm({
          name: user?.name ?? "",
          email: user?.email ?? "",
          school_or_university: user?.school_or_university ?? "",
          district: user?.district ?? "",
        });
        setIsEditing(true);
      }
    }
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      showAlert("Incomplete profile", "Name is required.");
      return;
    }
    setSaving(true);
    try {
      let avatarUrl: string | undefined = undefined;
      if (photoUri && !photoUri.startsWith("http")) {
        avatarUrl = await catchesApi.uploadImage(photoUri, photoMeta);
      }
      await dispatch(
        updateProfile({
          name: form.name.trim(),
          avatar_url: avatarUrl ?? user?.avatar_url ?? undefined,
          school_or_university: form.school_or_university.trim() || null,
          district: form.district.trim() || null,
        }),
      ).unwrap();
      setPhotoUri(null);
      setPhotoMeta(undefined);
      setIsEditing(false);
      showAlert("Profile updated", "Your angler records are up to date.");
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't save your profile.";
      showAlert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === "loading" && !user) {
    return (
      <SafeAreaView
        style={[styles.flex1, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <TopHeader />
        <View style={styles.centerFlex}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const xp = (user?.xp as number | undefined) ?? 0;

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <TopHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Angler Profile
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your catch record, all in one place.
            </Text>
          </View>
          <Pressable
            onPress={toggleEditing}
            accessibilityLabel={isEditing ? "Cancel editing" : "Edit profile"}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editButton,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            {isEditing ? (
              <X size={19} color={colors.foreground} />
            ) : (
              <Pencil size={19} color={colors.accent} />
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.avatarRow}>
            <Pressable
              onPress={pickPhoto}
              style={styles.avatarPressable}
              accessibilityLabel="Change profile photo"
              hitSlop={4}
            >
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: `${colors.accent}22`,
                    borderColor: colors.accent,
                  },
                ]}
              >
                {photoUri || user?.avatar_url ? (
                  <Image
                    source={{ uri: photoUri ?? (user!.avatar_url as string) }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <UserRound size={38} color={colors.accent} />
                )}
              </View>
              <View
                style={[
                  styles.cameraBadge,
                  { backgroundColor: colors.accent, borderColor: colors.card },
                ]}
              >
                <Camera size={13} color={colors.primary} />
              </View>
            </Pressable>
            <View style={styles.nameWrap}>
              <Text
                style={[styles.name, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {displayForm.name || "Angler"}
              </Text>
            </View>
          </View>

          <ProfileField
            label="FULL NAME"
            value={displayForm.name}
            editable={isEditing}
            onChangeText={(name) =>
              setForm((current) => ({ ...current, name }))
            }
            colors={colors}
          />
          <ProfileField
            label="EMAIL"
            value={displayForm.email}
            editable={false}
            onChangeText={() => {}}
            colors={colors}
          />
          <ProfileField
            label="SCHOOL / UNIVERSITY"
            value={displayForm.school_or_university}
            editable={isEditing}
            onChangeText={(school_or_university) =>
              setForm((current) => ({ ...current, school_or_university }))
            }
            colors={colors}
          />
          <ProfileField
            label="DISTRICT"
            value={displayForm.district}
            editable={isEditing}
            onChangeText={(district) =>
              setForm((current) => ({ ...current, district }))
            }
            colors={colors}
          />

          {isEditing && (
            <Pressable
              onPress={saveProfile}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed || saving ? 0.85 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Check size={18} color={colors.primary} />
                  <Text
                    style={[styles.saveButtonText, { color: colors.primary }]}
                  >
                    SAVE RECORDS
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatPill label="CURRENT XP" value={String(xp)} colors={colors} />
          <StatPill
            label="TOTAL CATCHES"
            value={totalCatches != null ? String(totalCatches) : "—"}
            colors={colors}
            valueColor={colors.foreground}
          />
        </View>

        <AddedPhotos />
        <Achievements />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  centerFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPressable: {
    position: "relative",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nameWrap: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontWeight: "700",
    letterSpacing: 1.2,
    fontSize: 12,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  statPill: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
});

export default Profile;
