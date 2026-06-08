// importy
import { AppColors, globalStyles } from "@/constants/theme";
import { useFilms } from "@/hooks/useFilms";
import { useTV } from "@/hooks/useTV";
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

  const { film, isLoading: isFilmLoading } = useFilms();
  const { Tv, isLoading: isTvLoading } = useTV();

  // useMemo pozwala na filtrowanie i sortowanie tylko przy zmianie danych, co zwiększa wydajność.
  const dataToShow = useMemo(() => {
    if (isFilmLoading || isTvLoading) return [];

    // Mapowanie danych z filmów i seriali do ujednoliconego formatu wyszukiwania
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

    // Bezpieczne parsowanie dat, zapobiegające awariom przy brakujących danych z API
    const safeDate = (dateStr: string) =>
      dateStr ? new Date(dateStr).getTime() : 0;

    // Sortowanie chronologiczne dla kategorii "Najnowsze filmy"
    if (category === "latest_movies") {
      return [...moviesData].sort(
        (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
      );
    }

    // Sortowanie chronologiczne dla kategorii "Najnowsze seriale"
    if (category === "latest_tv") {
      return [...tvData].sort(
        (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
      );
    }

    // Łączenie i filtrowanie zbiorów dla kategorii "Najlepiej oceniane" (Wymagana jest min. 1 recenzja przy produkcji, żeby się pojawiłą w tej kategorii)
    if (category === "top_rated") {
      return [...moviesData, ...tvData]
        .filter((item) => (item.vote_average || 0) > 0)
        .sort((a, b) => b.vote_average - a.vote_average);
    }

    return [];
  }, [film, Tv, isFilmLoading, isTvLoading, category]);

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
          </Text>
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>{title}</Text>
      </View>

      {isFilmLoading || isTvLoading ? (
        <ActivityIndicator
          size="large"
          color={AppColors.primary}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={dataToShow}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          horizontal={false}
          numColumns={3}
          columnWrapperStyle={{
            gap: 15,
            justifyContent: "flex-start",
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridBanner}
              onPress={() =>
                router.push({
                  pathname: "/FilmDetail",
                  params: {
                    id: item.id,
                    title: item.searchTitle,
                    release_date: item.searchDate,
                    overview: item.overview,
                    backdrop: item.backdrop_path,
                    gatunki: item.gatunki,
                    type: item.type,
                  },
                })
              }
            >
              <Image
                source={{
                  uri: "https://image.tmdb.org/t/p/w154/" + item.poster_path,
                }}
                style={[globalStyles.filmImage, { height: 160 }]}
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
  closeButtonText: { color: "white", fontSize: 20, fontWeight: "bold" },
  gridBanner: { width: "31%", marginBottom: 20 },
  gridTitle: { color: "white", fontSize: 12, fontWeight: "bold", marginTop: 5 },
  gridRating: { color: "#FFD700", fontSize: 11, marginTop: 2 },
});
