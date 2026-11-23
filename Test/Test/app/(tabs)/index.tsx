import CatchPhotoUpload from "@/components/CatchPhotoUpload";
import FishSpeciesDropdown, {
  type SelectedFish,
} from "@/components/FishSpeciesDropdown";
import TopHeader from "@/components/TopHeader";
import { ApiError } from "@/services/api";
import { catchesApi } from "@/services/catchesApi";
import type { AppDispatch, RootState } from "@/store";
import { fetchMe } from "@/store/authSlice";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

// Best-effort name extraction — newly_unlocked_achievements is typed as
// unknown[] on the client, so we don't assume a shape. Adjust the field
// name below (e.g. "title" instead of "name") to match your backend's
// actual achievement payload once you confirm it.
function achievementName(a: unknown, index: number): string {
  if (a && typeof a === "object") {
    const obj = a as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.title === "string") return obj.title;
  }
  if (typeof a === "string") return a;
  return `Achievement ${index + 1}`;
}

const index = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [lengthText, setLengthText] = useState("");
  const [widthText, setWidthText] = useState("");
  const [remarks, setRemarks] = useState("");
  const [boatNumber, setBoatNumber] = useState("");

  const [selectedFish, setSelectedFish] = useState<SelectedFish | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // Bumping this forces CatchPhotoUpload and FishSpeciesDropdown to
  // remount after a save, clearing their own internal state (selected
  // image preview / selected species) that this screen doesn't control.
  const [formKey, setFormKey] = useState(0);

  const [focusedInput, setFocusedInput] = useState<
    "length" | "width" | "remarks" | "boat" | null
  >(null);

  const length = parseFloat(lengthText) || 0;
  const width = parseFloat(widthText) || 0;
  const canSave = !!selectedFish && length > 0 && !saving;

  const handleSave = async () => {
    if (!selectedFish) return;
    setSaving(true);
    try {
      const result = await catchesApi.add({
        species_id: selectedFish.id,
        length_cm: length,
        width_cm: width > 0 ? width : undefined,
        remarks: remarks.trim() || undefined,
        boat_number: boatNumber.trim() || undefined,
        image: imageUrl ?? undefined,
      });

      dispatch(fetchMe());

      const unlocked = result.newly_unlocked_achievements ?? [];

      // Reset the form right away so it's clean underneath the alert.
      setLengthText("");
      setWidthText("");
      setRemarks("");
      setBoatNumber("");
      setSelectedFish(null);
      setImageUrl(null);
      setFormKey((k) => k + 1);

      const achievementLines =
        unlocked.length > 0
          ? "\n\n🏆 " +
            unlocked.map((a, i) => achievementName(a, i)).join("\n🏆 ")
          : "";

      Alert.alert(
        "Catch logged!",
        `+${result.xp_awarded} XP` +
          (unlocked.length > 0
            ? ` — ${unlocked.length} new achievement${unlocked.length > 1 ? "s" : ""} unlocked!`
            : "") +
          achievementLines,
        [{ text: "OK" }],
      );
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Couldn't log this catch.";
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View style={styles.flex1}>
          <TopHeader />

          <View style={styles.contentPad}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Log New Catch
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Capture your trophy and update your tactical angler profile.
              </Text>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <CatchPhotoUpload
              key={`photo-${formKey}`}
              onUploaded={setImageUrl}
            />

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                FISH SPECIES
              </Text>
              <FishSpeciesDropdown
                key={`species-${formKey}`}
                onSelect={setSelectedFish}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                TOTAL LENGTH
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor:
                      focusedInput === "length"
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.inputFlex, { color: colors.foreground }]}
                  keyboardType="decimal-pad"
                  value={lengthText}
                  onChangeText={setLengthText}
                  onFocus={() => setFocusedInput("length")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="0.0"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text
                  style={[styles.unitLabel, { color: colors.mutedForeground }]}
                >
                  cm
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}
              >
                TOTAL WIDTH
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor:
                      focusedInput === "width" ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.inputFlex, { color: colors.foreground }]}
                  keyboardType="decimal-pad"
                  value={widthText}
                  onChangeText={setWidthText}
                  onFocus={() => setFocusedInput("width")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="0.0"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text
                  style={[styles.unitLabel, { color: colors.mutedForeground }]}
                >
                  cm
                </Text>
              </View>
            </View>


            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                BOAT NUMBER (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.textAreaWrap,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor:
                      focusedInput === "boat" ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.singleLineInput, { color: colors.foreground }]}
                  value={boatNumber}
                  onChangeText={setBoatNumber}
                  onFocus={() => setFocusedInput("boat")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Enter boat number"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />
              </View>
            </View>


            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                REMARKS (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.textAreaWrap,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor:
                      focusedInput === "remarks"
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textArea, { color: colors.foreground }]}
                  value={remarks}
                  onChangeText={setRemarks}
                  onFocus={() => setFocusedInput("remarks")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Add any remarks about your catch..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            

            <View style={styles.submitBlock}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!canSave}
                onPress={handleSave}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: canSave
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.onPrimaryContainer} />
                ) : (
                  <Text
                    style={[
                      styles.submitText,
                      {
                        color: canSave
                          ? colors.onPrimaryContainer
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    Save Catch
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  contentPad: {
    paddingHorizontal: 16,
  },
  titleBlock: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 4,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  inputFlex: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 14,
  },
  unitLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    paddingLeft: 8,
  },
  textAreaWrap: {
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 14,
    minHeight: 100,
  },
  singleLineInput: {
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 14,
  },
  submitBlock: {
    marginTop: 32,
    marginBottom: 80,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  submitText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default index;
