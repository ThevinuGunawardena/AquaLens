import { ApiError } from "@/services/api";
import { speciesApi, type SpeciesDto } from "@/services/speciesApi";
import type { RootState } from "@/store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSelector } from "react-redux";

export interface SelectedFish {
  id: number;
  name: string;
}

interface FishSpeciesDropdownProps {
  onSelect?: (fish: SelectedFish) => void;
}

const FishSpeciesDropdown = ({ onSelect }: FishSpeciesDropdownProps) => {
  const colors = useSelector((state: RootState) => state.theme.colors);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SpeciesDto | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [species, setSpecies] = useState<SpeciesDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSpecies = () => {
    setLoading(true);
    setError(null);

    speciesApi
      .list()
      .then((data) => {
        if (mountedRef.current) {
          setSpecies(data);
        }
      })
      .catch((e) => {
        if (mountedRef.current) {
          setError(
            e instanceof ApiError ? e.message : "Couldn't load species.",
          );
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  };

  const openDropdown = () => {
    setIsOpen(true);
    if (species.length === 0 && !loading) {
      loadSpecies();
    }
  };

  const filtered = species.filter((fish) => {
    const q = query.toLowerCase().trim();

    return (
      fish.name.toLowerCase().includes(q) ||
      fish.scientific_name.toLowerCase().includes(q) ||
      fish.category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (fish: SpeciesDto) => {
    setSelected(fish);
    setIsOpen(false);
    setQuery("");

    onSelect?.({
      id: fish.id,
      name: fish.name,
    });
  };

  return (
    <View style={styles.container}>
      {/* Main Dropdown Button */}
      <Pressable
        onPress={openDropdown}
        style={[
          styles.dropdownButton,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.selectedContent}>
          <Text
            style={[
              styles.selectedText,
              {
                color: selected ? colors.foreground : colors.mutedForeground,
              },
            ]}
            numberOfLines={1}
          >
            {selected?.name ?? "Select a fish species"}
          </Text>

          {/* Dropdown Arrow */}
          <Text
            style={[
              styles.arrow,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            ▼
          </Text>
        </View>
      </Pressable>

      {/* Species Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
          ]}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.card,
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor: colors.muted,
                },
              ]}
            />

            {/* Title */}
            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Select Fish Species
            </Text>

            {/* Search */}
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Search species..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />

            {/* Loading */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.accent} />

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
            )}

            {/* Error */}
            {!loading && error && (
              <View style={styles.messageContainer}>
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
                <Pressable
                  onPress={loadSpecies}
                  style={[
                    styles.retryButton,
                    { backgroundColor: colors.surfaceContainerHigh },
                  ]}
                >
                  <Text
                    style={[styles.retryText, { color: colors.accent }]}
                  >
                    RETRY
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Species List */}
            {!loading && !error && (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isSelected = item.id === selected?.id;

                  return (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={[
                        styles.speciesItem,
                        {
                          backgroundColor: isSelected
                            ? `${colors.primary}12`
                            : colors.surfaceContainer,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.speciesTextContainer}>
                        <Text
                          style={[
                            styles.speciesName,
                            {
                              color: isSelected
                                ? colors.primary
                                : colors.foreground,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={[
                            styles.scientificName,
                            {
                              color: colors.mutedForeground,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.scientific_name}
                        </Text>

                        <Text
                          style={[
                            styles.category,
                            {
                              color: colors.mutedForeground,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                      </View>

                      {isSelected && (
                        <View
                          style={[
                            styles.selectedIndicator,
                            {
                              backgroundColor: colors.primary,
                            },
                          ]}
                        >
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.messageContainer}>
                    <Text
                      style={[
                        styles.emptyText,
                        {
                          color: colors.mutedForeground,
                        },
                      ]}
                    >
                      No species found
                    </Text>
                  </View>
                }
              />
            )}

            {/* Close Button */}
            <Pressable
              onPress={() => {
                setIsOpen(false);
                setQuery("");
              }}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color: colors.onSurfaceVariant,
                  },
                ]}
              >
                CLOSE
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  // Main dropdown
  dropdownButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },

  selectedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },

  arrow: {
    fontSize: 12,
    marginLeft: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContainer: {
    width: "100%",
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    marginBottom: 14,
  },

  // Search
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },

  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },

  // List
  listContent: {
    paddingBottom: 4,
  },

  speciesItem: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  speciesTextContainer: {
    flex: 1,
  },

  speciesName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },

  scientificName: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
    marginTop: 2,
  },

  category: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Messages
  messageContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },

  errorText: {
    fontSize: 13,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  retryText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },

  // Close button
  closeButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  closeButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
});

export default FishSpeciesDropdown;
