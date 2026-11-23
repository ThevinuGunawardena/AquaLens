import { ApiError } from "@/services/api";
import { catchesApi, type CatchDto } from "@/services/catchesApi";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../store";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.42;

const AddedPhotos = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);

  const [catches, setCatches] = useState<CatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    catchesApi
      .mine()
      .then((data) => {
        if (!cancelled) {
          setCatches(data.filter((c) => !!c.image));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof ApiError ? e.message : "Couldn't load your photos.",
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
  }, []);

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
          Added Photos
        </Text>

        {!loading && !error && (
          <Text
            style={[
              styles.photoCount,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            {catches.length <= 1
              ? `${catches.length} Photo`
              : `${catches.length} Photos`}
          </Text>
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

      {/* Empty */}
      {!loading && !error && catches.length === 0 && (
        <Text
          style={[
            styles.emptyText,
            {
              color: colors.mutedForeground,
            },
          ]}
        >
          Log a catch with a photo to see it here.
        </Text>
      )}

      {/* Photos */}
      {!loading && !error && catches.length > 0 && (
        <FlatList
          data={catches}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          snapToInterval={ITEM_WIDTH + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.photoCard,
                {
                  width: ITEM_WIDTH,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Photo */}
              <Image
                source={{ uri: item.image! }}
                style={styles.photo}
                resizeMode="cover"
              />

              {/* Details */}
              <View style={styles.details}>
                <Text
                  style={[
                    styles.speciesName,
                    {
                      color: colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.species_name ?? "Unknown species"}
                </Text>

                <Text
                  style={[
                    styles.lengthText,
                    {
                      color: colors.mutedForeground,
                    },
                  ]}
                >
                  Length: {item.length_cm} cm
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    marginTop: 24,
    marginBottom: 40,
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

  photoCount: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },

  // Error
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: 24,
  },

  // Empty
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 24,
  },

  // FlatList
  listContent: {
    paddingRight: 16,
  },

  // Photo card
  photoCard: {
    marginRight: 12,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  // Photo
  photo: {
    width: "100%",
    height: 150,
  },

  // Details
  details: {
    padding: 12,
  },

  speciesName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },

  lengthText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});

export default AddedPhotos;
