import { ApiError } from "@/services/api";
import { authApi, isValidEmail } from "@/services/authApi";
import { saveToken } from "@/services/tokenStorage";
import type { RootState } from "@/store";
import { login } from "@/store/authSlice";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const MIN_PASSWORD_LENGTH = 8;

const SignUp = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const dispatch = useDispatch();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"name" | "email" | "password" | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    if (normalizedName.length > 160) {
      setError("Name must be 160 characters or fewer.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.register(
        normalizedName,
        normalizedEmail,
        password,
      );
      await saveToken(session.token);
      dispatch(login({ user: session.user, token: session.token }));

      // Brand-new accounts always have tutorial_seen === false, but check
      // the flag from the API rather than assuming it.
      if (!session.user.tutorial_seen) {
        router.replace("/tutorial");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brandContainer}>
            <Text
              style={[
                styles.brandTitle,
                { color: colors.foreground, letterSpacing: 2 },
              ]}
            >
              AQUA Lens
            </Text>
            <Text
              style={[styles.brandSubtitle, { color: colors.mutedForeground }]}
            >
              Create your angler profile
            </Text>
          </View>

          {error && (
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
                {error}
              </Text>
            </View>
          )}

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              NAME
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor:
                    focused === "name" ? colors.primary : colors.border,
                },
              ]}
            >
              <UserIcon size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              EMAIL
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor:
                    focused === "email" ? colors.primary : colors.border,
                },
              ]}
            >
              <Mail size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroupTight}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              PASSWORD
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor:
                    focused === "password" ? colors.primary : colors.border,
                },
              ]}
            >
              <Lock size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                onSubmitEditing={onSubmit}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color={colors.mutedForeground} />
                ) : (
                  <Eye size={18} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>
            <Text
              style={[styles.helperText, { color: colors.mutedForeground }]}
            >
              Minimum {MIN_PASSWORD_LENGTH} characters.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSubmit}
            onPress={onSubmit}
            style={[
              styles.submitButton,
              {
                backgroundColor: canSubmit
                  ? colors.primary
                  : colors.surfaceContainerHigh,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryContainer} />
            ) : (
              <Text
                style={[
                  styles.submitText,
                  {
                    color: canSubmit
                      ? colors.onPrimaryContainer
                      : colors.mutedForeground,
                  },
                ]}
              >
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Link to sign in */}
          <View style={styles.footerRow}>
            <Text
              style={[styles.footerText, { color: colors.mutedForeground }]}
            >
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.accent }]}>
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  brandSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
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
    lineHeight: 20,
    fontWeight: "500",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldGroupTight: {
    marginBottom: 8,
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
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 14,
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
});

export default SignUp;
