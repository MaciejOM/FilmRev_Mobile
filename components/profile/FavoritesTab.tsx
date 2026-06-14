import { AppColors } from "@/constants/theme";
import { useResponsive } from "@/hooks/useResponsive";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { memo, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FavoritesTabProps {
  data: any[];
}

// Zakładka "Ulubione" na profilu: siatka tytułów z przełącznikiem Filmy/Seriale.
const FavoritesTab = ({ data }: FavoritesTabProps) => {
  const [activeTab, setActiveTab] = useState<"movie" | "tv">("movie");
  const { gridItemWidth } = useResponsive();
  const itemWidth = gridItemWidth(20, 12);

  const { movies, tvShows } = useMemo(() => {
    if (!data) return { movies: [], tvShows: [] };
    return {
      movies: data.filter(
        (item) => item.typ === "movie" || item.type === "movie",
      ),
      tvShows: data.filter((item) => item.typ === "tv" || item.type === "tv"),
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Nie masz jeszcze żadnych zapisanych tytułów.
        </Text>
      </View>
    );
  }

  const dataToShow = activeTab === "movie" ? movies : tvShows;

  return (
    <View style={styles.container}>
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
            style={[styles.tabText, activeTab === "tv" && styles.tabTextActive]}
          >
            Seriale ({tvShows.length})
          </Text>
        </TouchableOpacity>
      </View>

      {dataToShow.length === 0 ? (
        <Text style={styles.emptyTextCategory}>
          Brak tytułów w tej kategorii.
        </Text>
      ) : (
        <View style={styles.gridContainer}>
          {dataToShow.map((item, index) => {
            const posterPath = item.plakat || item.poster_path;
            const uniqueKey = item.id ? item.id.toString() : index.toString();

            return (
              <TouchableOpacity
                key={uniqueKey}
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
                {posterPath ? (
                  <Image
                    source={{
                      uri: "https://image.tmdb.org/t/p/w154/" + posterPath,
                    }}
                    style={styles.posterImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText} numberOfLines={3}>
                      {item.nazwa || item.title}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default memo(FavoritesTab);

const styles = StyleSheet.create({
  container: { width: "100%" },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: AppColors.textGray, fontSize: 15, fontStyle: "italic" },
  emptyTextCategory: {
    color: AppColors.textGray,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
  },
  tabsContainer: {
    flexDirection: "row",
    marginTop: 5,
    marginBottom: 15,
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
  tabText: { color: AppColors.textGray, fontWeight: "bold", fontSize: 13 },
  tabTextActive: { color: AppColors.primary },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },
  gridItem: {
    aspectRatio: 2 / 3,
    backgroundColor: "#3a3c4f",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 5,
  },
  posterImage: { width: "100%", height: "100%" },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  placeholderText: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
});
