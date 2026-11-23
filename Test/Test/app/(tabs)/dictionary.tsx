import { ApiError } from "@/services/api";
import { speciesApi, type SpeciesDto } from "@/services/speciesApi";
import type { RootState } from "@/store";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const Dictionary = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const [species, setSpecies] = useState<SpeciesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Small debounce so we don't fire a request per keystroke.
    const handle = setTimeout(() => {
      speciesApi
        .list(query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setSpecies(data);
        })
        .catch((e) => {
          if (!cancelled)
            setError(
              e instanceof ApiError
                ? e.message
                : "Couldn't load the fish dictionary.",
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <SafeAreaView
      style={[styles.flex1, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        {router.canGoBack() ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceContainer
                  : "transparent",
              },
            ]}
          >
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Fish Dictionary
        </Text>
        {/* Balances the back button so the title stays visually centered */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: isFocused ? colors.accent : colors.border,
              borderWidth: isFocused ? 1.5 : 1,
              shadowColor: colors.accent,
              shadowOpacity: isFocused ? 0.25 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          <Search
            size={18}
            color={isFocused ? colors.accent : colors.mutedForeground}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search by name or species..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              style={[
                styles.clearButton,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <X size={12} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        {!loading && !error && query.length > 0 && (
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {species.length} {species.length === 1 ? "result" : "results"}
          </Text>
        )}
      </View>

      {loading && (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centerPadWide}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={species}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centerPadWide}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No fish found for "{query}"
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/dictionary/${item.id}`)}
              style={({ pressed }) => [
                styles.listItem,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.thumb,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.thumbFallback}>🐟</Text>
                )}
              </View>

              <View style={styles.listItemBody}>
                <Text
                  style={[styles.fishName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.fishScientific,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {item.scientific_name}
                </Text>
              </View>

              <View
                style={[
                  styles.categoryBadge,
                  {
                    borderColor: colors.accent,
                    backgroundColor: `${colors.accent}14`,
                  },
                ]}
              >
                <Text
                  style={[styles.categoryText, { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {item.category.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center",
    marginRight: -4,
  },
  headerSpacer: {
    width: 40,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  resultCount: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    marginLeft: 4,
  },
  centerPad: {
    alignItems: "center",
    paddingTop: 64,
  },
  centerPadWide: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    fontSize: 22,
  },
  listItemBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  fishName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  fishScientific: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
    marginTop: 2,
  },
  categoryBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 90,
  },
  categoryText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
  },
});

export default Dictionary;
