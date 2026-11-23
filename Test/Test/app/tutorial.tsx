import { ApiError } from "@/services/api";
import { tutorialApi, usersApi, type Tutorial } from "@/services/tutorialApi";
import type { RootState } from "@/store";
import { setTutorialSeen } from "@/store/authSlice";
import { useRouter } from "expo-router";
import { Camera, CheckCircle2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const TutorialScreen = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const dispatch = useDispatch();
  const router = useRouter();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    tutorialApi
      .getUploadPhotoTutorial()
      .then(setTutorial)
      .catch((e) =>
        setLoadError(
          e instanceof ApiError ? e.message : "Couldn't load the tutorial.",
        ),
      );
  }, []);

  const finish = async () => {
    setFinishing(true);
    try {
      // Persist on the backend so it doesn't show again on the next login.
      await usersApi.completeTutorial();
    } catch {
      // Non-fatal for the user's flow — they can still use the app even if
      // this write fails; they'll just see the tutorial once more.
    } finally {
      dispatch(setTutorialSeen(true));
      setFinishing(false);
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.surfaceContainer },
            ]}
          >
            <Camera size={28} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {tutorial?.title ?? "Welcome to Aqua Lens"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Quick walkthrough before your first catch.
          </Text>
        </View>

        {!tutorial && !loadError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {loadError && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: `${colors.destructive}22`,
                borderColor: colors.destructive,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {loadError}
            </Text>
          </View>
        )}

        {tutorial?.steps.map((step) => (
          <View key={step.step} style={styles.stepRow}>
            <View
              style={[
                styles.stepNumberCircle,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <Text style={[styles.stepNumberText, { color: colors.accent }]}>
                {step.step}
              </Text>
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                {step.title}
              </Text>
              <Text
                style={[
                  styles.stepDescription,
                  { color: colors.mutedForeground },
                ]}
              >
                {step.description}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.flex1} />

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={finishing}
          onPress={finish}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {finishing ? (
            <ActivityIndicator color={colors.onPrimaryContainer} />
          ) : (
            <>
              <CheckCircle2 size={18} color={colors.onPrimaryContainer} />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                Got it, let's fish
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.6}
          disabled={finishing}
          onPress={finish}
          style={styles.skipButton}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },

  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },

  errorBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
  },

  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },

  stepRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },

  stepTextContainer: {
    flex: 1,
  },

  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  stepDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    flexDirection: "row",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 8,
  },

  skipButton: {
    alignItems: "center",
    marginTop: 16,
  },

  skipText: {
    fontSize: 14,
  },
});

export default TutorialScreen;
