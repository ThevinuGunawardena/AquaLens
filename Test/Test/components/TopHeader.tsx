import type { RootState } from "@/store";
import { toggleMode } from "@/store/ThemeSlice";
import { useRouter } from "expo-router";
import { HelpCircle, Moon, Sun, User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

// How much XP is needed per level.
const XP_PER_LEVEL = 100;

const TopHeader = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const mode = useSelector((state: RootState) => state.theme.mode);
  const user = useSelector((state: RootState) => state.auth.user);

  const dispatch = useDispatch();
  const router = useRouter();

  const xp = (user?.xp as number | undefined) ?? 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  return (
    <View style={styles.container}>
      {/* Background layer */}
      <View
        style={[
          styles.backgroundLayer,
          {
            backgroundColor: colors.background,
          },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Tutorial Button */}
        <Pressable
          android_ripple={{
            color: colors.surfaceContainerHigh,
            radius: 20,
          }}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: pressed
                ? colors.surfaceContainer
                : "transparent",
            },
          ]}
          accessibilityLabel="Open tutorial"
          onPress={() => router.push("/tutorial")}
        >
          <HelpCircle size={22} color={colors.foreground} />
        </Pressable>

        {/* App Title */}
        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
            },
          ]}
        >
          AQUA Lens
        </Text>

        {/* Right Side */}
        <View style={styles.rightContainer}>
          {/* Theme Toggle */}
          <Pressable
            onPress={() => dispatch(toggleMode())}
            style={({ pressed }) => [
              styles.themeButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceContainer
                  : "transparent",
              },
            ]}
          >
            {mode === "dark" ? (
              <Moon size={19} color={colors.foreground} />
            ) : (
              <Sun size={19} color={colors.foreground} />
            )}
          </Pressable>

          {/* Level */}
          <View style={styles.levelWrapper}>
            {/* Glow */}
            <View
              style={[
                styles.levelGlow,
                {
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                },
              ]}
            />

            {/* Level Container */}
            <View
              style={[
                styles.levelContainer,
                {
                  borderColor: colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.levelLabel,
                  {
                    color: colors.accent,
                  },
                ]}
              >
                LV
              </Text>

              <Text
                style={[
                  styles.levelNumber,
                  {
                    color: colors.foreground,
                  },
                ]}
              >
                {level}
              </Text>
            </View>
          </View>

          {/* Profile */}
          <Pressable
            style={[
              styles.profileButton,
              {
                backgroundColor: colors.surfaceContainer,
              },
            ]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <User size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Bottom Border */}
      <View
        style={[
          styles.bottomBorder,
          {
            backgroundColor: colors.border,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },

  backgroundLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.7,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Tutorial / Theme buttons
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  themeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  // Title
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // Right side
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Level
  levelWrapper: {
    position: "relative",
    marginLeft: 4,
    marginRight: 4,
  },

  levelGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,

    opacity: 0.18,

    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0.9,
    shadowRadius: 10,

    elevation: 8,
  },

  levelContainer: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderRadius: 999,

    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  levelLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1,
    marginRight: 4,
  },

  levelNumber: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },

  // Profile
  profileButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  // Bottom border
  bottomBorder: {
    width: "100%",
    height: 1,
  },
});

export default TopHeader;
