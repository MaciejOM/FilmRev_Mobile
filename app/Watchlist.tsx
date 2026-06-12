import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import { useResponsive } from "@/hooks/useResponsive";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "@/hooks/firebaseConfig";
import { getUserList } from "@/hooks/firebaseDatabase";

export default function Watchlist() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { numGridColumns, gridItemWidth } = useResponsive();
  const itemWidth = gridItemWidth(20, 15);

  const [movies, setMovies] = useState<any[]>([]);
  const [tvShows, setTvShows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"movie" | "tv">("movie");

  const fetchList = useCallback(async () => {
    const targetUid = userId || auth.currentUser?.uid;
    if (!targetUid) return;

    try {
      setIsLoading(true);
      setError(null);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("Brak połączenia");
      }

      const data = await getUserList(targetUid, "watchlist");
      setMovies(data.movies);
      setTvShows(data.tv);
    } catch (err: any) {
      console.error("Błąd pobierania listy do obejrzenia:", err);
      setError("Brak połączenia z siecią. Nie udało się załadować danych.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [fetchList]),
  );

  const dataToShow = useMemo(
    () => (activeTab === "movie" ? movies : tvShows),
    [activeTab, movies, tvShows],
  );

  const renderGridItem = useCallback(
    ({ item }: { item: any }) => {
      if (!item) return null;

      return (
        <TouchableOpacity
          style={[styles.gridItem, { width: itemWidth }]}
          onPress={() =>
            router.push({
              pathname: "/FilmDetail",
              params: {
                id: item.tmdb_id || item.id,
                title: item.nazwa || item.title,
                release_date: item.rok || item.release_date,
                overview: item.overview,
                backdrop: item.backdrop || item.backdrop_path,
                gatunki: item.gatunki
                  ? Array.isArray(item.gatunki)
                    ? item.gatunki.join(", ")
                    : item.gatunki
                  : "",
                type: item.typ || item.type || "movie",
              },
            })
          }
        >
          <Image
            source={{
              uri:
                "https://image.tmdb.org/t/p/w154/" +
                (item.plakat || item.poster_path),
            }}
            style={styles.posterImage}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      );
    },
    [itemWidth],
  );

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>Do obejrzenia</Text>
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          numColumns={numGridColumns}
          columnWrapperStyle={{ gap: 15, justifyContent: "flex-start" }}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <Skeleton
              width={120}
              height={20}
              borderRadius={4}
              style={{ marginBottom: 15, marginTop: 10 }}
            />
          }
          renderItem={() => (
            <Skeleton style={[styles.gridItem, { width: itemWidth }]} />
          )}
        />
      ) : error ? (
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchList}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      ) : movies.length === 0 && tvShows.length === 0 ? (
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.emptyText}>
            Brak tytułów do obejrzenia.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "movie" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("movie")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "movie" && styles.tabTextActive,
                ]}
              >
                Filmy ({movies.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "tv" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("tv")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "tv" && styles.tabTextActive,
                ]}
              >
                Seriale ({tvShows.length})
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={dataToShow}
            keyExtractor={(item, index) =>
              item?.id?.toString() || index.toString()
            }
            numColumns={numGridColumns}
            contentContainerStyle={styles.scrollContent}
            columnWrapperStyle={{ gap: 15, justifyContent: "flex-start" }}
            initialNumToRender={6}
            maxToRenderPerBatch={9}
            windowSize={5}
            removeClippedSubviews
            ListEmptyComponent={
              <Text style={globalStyles.emptyText}>
                Brak tytułów na liście w tej kategorii.
              </Text>
            }
            renderItem={renderGridItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  gridItem: {
    aspectRatio: 2 / 3,
    backgroundColor: "#3a3c4f",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  posterImage: { width: "100%", height: "100%" },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    gap: 15,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3a3c4f",
    backgroundColor: "#27282e",
  },
  tabButtonActive: {
    backgroundColor: "rgba(184, 0, 92, 0.2)",
    borderColor: AppColors.primary,
  },
  tabText: { color: AppColors.textGray, fontWeight: "bold" },
  tabTextActive: { color: AppColors.primary },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "bold" },
});
