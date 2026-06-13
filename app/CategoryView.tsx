// importy
import { AppColors, globalStyles } from "@/constants/theme";
import { useGlobalMedia } from "@/hooks/MediaContext"; // Zmieniono na główny hook
import { useResponsive } from "@/hooks/useResponsive";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CategoryView() {
  const router = useRouter();
  const { category, title } = useLocalSearchParams();
  const { numGridColumns, gridItemWidth } = useResponsive();
  const itemWidth = gridItemWidth(20, 15);

  const { film, Tv, isLoading, error, refreshMedia } = useGlobalMedia();

  const dataToShow = useMemo(() => {
    if (isLoading || (!film.length && !Tv.length)) return [];

    const moviesData = film.map((f) => ({
      ...f,
      type: "movie",
      searchTitle: f.title,
      searchDate: f.release_date,
    }));
    const tvData = Tv.map((t) => ({
      ...t,
      type: "tv",
      searchTitle: t.name,
      searchDate: t.first_air_date,
    }));

    const safeDate = (dateStr: string) =>
      dateStr ? new Date(dateStr).getTime() : 0;

    // Sortowanie dla kategorii "Najnowsze filmy"
    if (category === "latest_movies") {
      return [...moviesData].sort(
        (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
      );
    }

    // Sortowanie dla kategorii "Najnowsze seriale"
    if (category === "latest_tv") {
      return [...tvData].sort(
        (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
      );
    }

    // Łączenie i filtrowanie zbiorów dla kategorii "Najlepiej oceniane" (Jeśli tytuł ma min. 1 recenzje)
    if (category === "top_rated") {
      return [...moviesData, ...tvData]
        .filter((item) => (item.vote_average || 0) > 0)
        .sort((a, b) => b.vote_average - a.vote_average);
    }

    return [];
  }, [film, Tv, isLoading, category]);

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>{title}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={AppColors.primary}
          style={{ marginTop: 20 }}
        />
      ) : error && dataToShow.length === 0 ? (
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshMedia}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dataToShow}
          keyExtractor={(item) => `${item.type}-${item.id || item.tmdb_id}`}
          horizontal={false}
          numColumns={numGridColumns}
          columnWrapperStyle={{
            gap: 15,
            justifyContent: "flex-start",
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
          initialNumToRender={6}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={globalStyles.emptyText}>
              Brak tytułów w tej kategorii.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridBanner, { width: itemWidth }]}
              onPress={() =>
                router.push({
                  pathname: "/FilmDetail",
                  params: {
                    id: item.id || item.tmdb_id,
                    title: item.searchTitle,
                    release_date: item.searchDate,
                    overview: item.overview,
                    backdrop: item.backdrop_path || item.backdrop,
                    gatunki: Array.isArray(item.gatunki)
                      ? item.gatunki.join(", ")
                      : item.gatunki,
                    type: item.type,
                  },
                })
              }
            >
              <Image
                source={{
                  uri:
                    "https://image.tmdb.org/t/p/w154/" +
                    (item.poster_path || item.plakat),
                }}
                style={[globalStyles.filmImage, { height: 160 }]}
                contentFit="cover"
                transition={200}
              />
              <Text style={styles.gridTitle} numberOfLines={1}>
                {item.searchTitle}
              </Text>
              {item.vote_average > 0 && (
                <Text style={styles.gridRating}>{item.vote_average}/5 ★</Text>
              )}
            </TouchableOpacity>
          )}
        />
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
  gridBanner: { marginBottom: 20 },
  gridTitle: { color: "white", fontSize: 12, fontWeight: "bold", marginTop: 5 },
  gridRating: { color: "#FFD700", fontSize: 11, marginTop: 2 },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
});
