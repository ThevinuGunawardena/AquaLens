import TopHeader from "@/components/TopHeader";
import { ApiError } from "@/services/api";
import { speciesApi, type SpeciesDto } from "@/services/speciesApi";
import type { RootState } from "@/store";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

// species.category from the API ("Pelagic" / "Reef" / etc) drives the accent
// color; anything not explicitly "rare-ish" falls back to primary.
const RARE_CATEGORIES = new Set(["deep", "legendary", "rare", "epic"]);

function StatBlock({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: RootState["theme"]["colors"];
}) {
  return (
    <View
      style={[
        styles.statBlock,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statLabel,
          {
            color: colors.mutedForeground,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            color: colors.foreground,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  colors: RootState["theme"]["colors"];
}) {
  return (
    <View
      style={[
        styles.infoRow,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={colors.mutedForeground}
      />

      <View style={styles.infoContent}>
        <Text
          style={[
            styles.infoLabel,
            {
              color: colors.mutedForeground,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color: colors.foreground,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function FishSpeciesDetail() {
  const colors = useSelector((state: RootState) => state.theme.colors);

  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [species, setSpecies] = useState<SpeciesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    setLoading(true);
    setError(null);

    speciesApi
      .get(id)
      .then((result) => {
        if (!cancelled) {
          setSpecies(result);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Species not found");
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
  }, [id]);

  // -----------------------------
  // LOADING STATE
  // -----------------------------

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={["top"]}
      >
        <TopHeader />

        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="fish"
            size={32}
            color={colors.mutedForeground}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            Loading species...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------
  // ERROR STATE
  // -----------------------------

  if (error || !species) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={["top"]}
      >
        <TopHeader />

        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={32}
            color={colors.destructive}
          />

          <Text
            style={[
              styles.errorTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Species not found
          </Text>

          <Text
            style={[
              styles.errorMessage,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            {error ?? `No entry matches id "${id}".`}
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={[
              styles.goBackButton,
              {
                backgroundColor: colors.primaryContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.goBackText,
                {
                  color: colors.onPrimaryContainer,
                },
              ]}
            >
              GO BACK
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------
  // ACCENT COLOR
  // -----------------------------

  const accentColor = RARE_CATEGORIES.has(species.category.toLowerCase())
    ? colors.secondary
    : colors.primaryContainer;

  // -----------------------------
  // MAIN SCREEN
  // -----------------------------

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TopHeader />

        <View style={styles.content}>
          {/* BACK BUTTON */}

          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surfaceContainer,
              },
            ]}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={colors.foreground}
            />
          </Pressable>

          {/* SPECIES IMAGE */}

          <View
            style={[
              styles.imageContainer,
              {
                borderColor: accentColor,
                backgroundColor: colors.surfaceContainer,
              },
            ]}
          >
            {species.image ? (
              <Image
                source={{ uri: species.image }}
                style={styles.speciesImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons
                  name="fish"
                  size={40}
                  color={colors.mutedForeground}
                />
              </View>
            )}
          </View>

          {/* SPECIES NAME */}

          <View style={styles.speciesHeader}>
            <Text
              style={[
                styles.categoryText,
                {
                  color: accentColor,
                },
              ]}
            >
              {species.category.toUpperCase()}
            </Text>

            <Text
              style={[
                styles.speciesName,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {species.name}
            </Text>

            <Text
              style={[
                styles.scientificName,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              {species.scientific_name}
            </Text>
          </View>

          {/* STATS */}

          <View style={styles.statsContainer}>
            <StatBlock
              label="AVG SIZE"
              value={
                species.average_size_cm != null
                  ? `${species.average_size_cm} cm`
                  : "—"
              }
              colors={colors}
            />
          </View>

          {/* HABITAT */}

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
              },
            ]}
          >
            <InfoRow
              icon="map-marker-outline"
              label="HABITAT"
              value={species.habitat ?? "Unknown"}
              colors={colors}
            />
          </View>

          {/* FIELD NOTES */}

          <View
            style={[
              styles.notesCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.notesLabel,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              FIELD NOTES
            </Text>

            <Text
              style={[
                styles.notesText,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {species.description ?? "No notes yet."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // -----------------------------
  // Loading
  // -----------------------------

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },

  // -----------------------------
  // Error
  // -----------------------------

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },

  errorMessage: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },

  goBackButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 20,
  },

  goBackText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // -----------------------------
  // Back button
  // -----------------------------

  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    marginTop: 16,
  },

  // -----------------------------
  // Image
  // -----------------------------

  imageContainer: {
    width: "100%",
    height: 220,
    borderWidth: 2,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
  },

  speciesImage: {
    width: "100%",
    height: 220,
  },

  imagePlaceholder: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  // -----------------------------
  // Species header
  // -----------------------------

  speciesHeader: {
    marginTop: 16,
  },

  categoryText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  speciesName: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },

  scientificName: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 2,
  },

  // -----------------------------
  // Stats
  // -----------------------------

  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  statBlock: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },

  // -----------------------------
  // Info card
  // -----------------------------

  infoCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  // -----------------------------
  // Field notes
  // -----------------------------

  notesCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },

  notesLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
