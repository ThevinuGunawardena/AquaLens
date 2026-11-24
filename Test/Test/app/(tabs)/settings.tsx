import TopHeader from "@/components/TopHeader";
import { confirmAction, showAlert } from "@/services/alerts";
import { setAuthToken } from "@/services/api";
import type { RootState } from "@/store";
import { logout } from "@/store/authSlice";
import { setMode, type ThemeColors } from "@/store/ThemeSlice";
import { useRouter } from "expo-router";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Info,
  LogOut,
  Moon,
  Shield,
  UserRound,
} from "lucide-react-native";
import { ReactNode, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

function SettingRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onPress,
  danger = false,
  colors,
}: {
  icon: typeof Bell;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.border,
          opacity: pressed && onPress ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: danger
              ? `${colors.destructive}22`
              : `${colors.accent}18`,
          },
        ]}
      >
        <Icon size={19} color={danger ? colors.destructive : colors.accent} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text
          style={[
            styles.rowTitle,
            { color: danger ? colors.destructive : colors.foreground },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.rowSubtitle, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ??
        (onPress ? (
          <ChevronRight size={18} color={colors.mutedForeground} />
        ) : null)}
    </Pressable>
  );
}

const Settings = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const mode = useSelector((state: RootState) => state.theme.mode);
  const dispatch = useDispatch();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);

  const confirmLogout = () => {
    confirmAction(
      "Log out?",
      "You can sign back in anytime to continue your catch record.",
      "Log out",
      () => {
        setAuthToken(null); // clears in-memory token AND persisted storage
        dispatch(logout());
        router.replace("/(auth)/sign-in");
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <TopHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Settings
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tune your Aqua Lens experience.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ACCOUNT
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SettingRow
            icon={UserRound}
            title="Edit profile"
            subtitle="Name, school, district and photo"
            colors={colors}
            onPress={() => router.push("/(tabs)/profile")}
          />
          <SettingRow
            icon={Shield}
            title="Privacy & security"
            subtitle="Your account is protected"
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SettingRow
            icon={Bell}
            title="Catch alerts"
            subtitle="Get notified about your fishing progress"
            colors={colors}
            trailing={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: colors.surfaceVariant,
                  true: `${colors.accent}88`,
                }}
                thumbColor={
                  notifications ? colors.accent : colors.mutedForeground
                }
              />
            }
          />
          <SettingRow
            icon={Moon}
            title="Dark mode"
            subtitle="Use the tactical night palette"
            colors={colors}
            trailing={
              <Switch
                value={mode === "dark"}
                onValueChange={(enabled) => {
                  dispatch(setMode(enabled ? "dark" : "light"));
                }}
                trackColor={{
                  false: colors.surfaceVariant,
                  true: `${colors.accent}88`,
                }}
                thumbColor={
                  mode === "dark" ? colors.accent : colors.mutedForeground
                }
              />
            }
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          APPLICATION
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SettingRow
            icon={BookOpen}
            title="Fish Dictionary"
            subtitle="Browse all species and biological specifications"
            colors={colors}
            onPress={() => router.push("/(tabs)/dictionary")}
          />
          <SettingRow
            icon={Info}
            title="About Aqua Lens"
            subtitle="Version 1.0.0"
            colors={colors}
            onPress={() =>
              showAlert("Aqua Lens", "Version 1.0.0 — Catch logger & species guide.")
            }
          />
        </View>

        <Pressable
          onPress={confirmLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: colors.destructive, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <LogOut size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>
            LOG OUT
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontWeight: "700",
    letterSpacing: 1.2,
    fontSize: 12,
    marginLeft: 8,
  },
});

export default Settings;
