import {
  achievementsApi,
  type AchievementDto,
} from "@/services/achievementsApi";
import { ApiError } from "@/services/api";
import type { RootState } from "@/store";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSelector } from "react-redux";

const Achievements = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);

  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      achievementsApi
        .list()
        .then((data) => {
          if (!cancelled) {
            setAchievements(data);
            setError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(
              e instanceof ApiError ? e.message : "Couldn't load achievements.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const completedCount = achievements.filter((item) => item.completed).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Achievements
        </Text>

        {!loading && !error && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: colors.surfaceContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              {completedCount}/{achievements.length}
            </Text>
          </View>
        )}
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.destructive,
            },
          ]}
        >
          {error}
        </Text>
      )}

      {/* Achievements Grid */}
      {!loading && !error && (
        <View style={styles.grid}>
          {achievements.map((achievement) => {
            const completed = achievement.completed;

            return (
              <Pressable
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  {
                    backgroundColor: completed
                      ? colors.card
                      : colors.surfaceContainer,

                    borderColor: completed ? colors.accent : colors.border,

                    opacity: completed ? 1 : 0.7,
                  },
                ]}
              >
                {/* Achievement Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: completed
                        ? colors.primaryContainer
                        : colors.muted,
                    },
                  ]}
                >
                  <Text style={styles.iconText}>{achievement.icon}</Text>
                </View>

                {/* Achievement Title */}
                <Text
                  style={[
                    styles.achievementTitle,
                    {
                      color: colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {achievement.title}
                </Text>

                {/* Description */}
                <View style={styles.descriptionContainer}>
                  <Text
                    style={[
                      styles.description,
                      {
                        color: colors.mutedForeground,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {achievement.description}
                  </Text>
                </View>

                {/* XP */}
                <Text
                  style={[
                    styles.experience,
                    {
                      color: colors.accent,
                    },
                  ]}
                >
                  +{achievement.experience} XP
                </Text>

                {/* Status */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: completed
                        ? colors.success
                        : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: completed ? "#ffffff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {completed ? "Completed" : "Locked"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    marginTop: 24,
    marginBottom: 80,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },

  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  countText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },

  // Error
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: 32,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  // Achievement card
  achievementCard: {
    width: "48%",
    height: 235,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },

  // Icon
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  iconText: {
    fontSize: 24,
  },

  // Title
  achievementTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 22,
  },

  // Description
  descriptionContainer: {
    height: 38,
    marginTop: 4,
  },

  description: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  // XP
  experience: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },

  // Status
  statusBadge: {
    alignSelf: "center",
    marginTop: "auto",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});

export default Achievements;
