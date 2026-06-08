import { AppColors, globalStyles } from "@/constants/theme";
import { useFilms } from "@/hooks/useFilms";
import { useTV } from "@/hooks/useTV";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();

  // Pobieranie danych z lokalnych hooków synchronizujących
  const { film, isLoading: isFilmLoading, error: filmError } = useFilms();
  const { Tv, isLoading: isTvLoading, error: tvError } = useTV();

  if (isFilmLoading || isTvLoading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={globalStyles.loadingText}>Pobieranie...</Text>
      </View>
    );
  }

  if ((filmError && film.length === 0) || (tvError && Tv.length === 0)) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.headerText}>Błąd pobierania danych.</Text>
      </View>
    );
  }

  // Zunifikowanie struktury danych do wspólnego formatu wyszukiwania dla FlatList
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

  // Bezpieczne parsowanie dat, aby zapobiec awariom przy brakujących danych z TMDB
  const safeDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).getTime() : 0;

  // Sortowanie produkcji według najnowszej daty premiery
  const latestMovies = [...moviesData].sort(
    (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
  );

  const latestTv = [...tvData].sort(
    (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
  );

  // Filtrowanie i sortowanie produkcji z najwyższą oceną
  const topRated = [...moviesData, ...tvData]
    .filter((item) => (item.vote_average || 0) > 0)
    .sort((a, b) => b.vote_average - a.vote_average);

  // Dynamiczne budowanie sekcji ekranu głównego
  const sections = [
    {
      id: "latest_movies",
      title: "Najnowsze filmy",
      param: "latest_movies",
      data: latestMovies.slice(0, 4),
    },
    {
      id: "latest_tv",
      title: "Najnowsze seriale",
      param: "latest_tv",
      data: latestTv.slice(0, 4),
    },
  ];

  if (topRated.length > 0) {
    sections.push({
      id: "top_rated",
      title: "Najlepiej oceniane",
      param: "top_rated",
      data: topRated.slice(0, 4),
    });
  }

  const SectionHeader = ({
    title,
    categoryParams,
  }: {
    title: string;
    categoryParams: string;
  }) => (
    <TouchableOpacity
      style={styles.sectionHeaderRow}
      onPress={() =>
        router.push({
          pathname: "/CategoryView",
          params: { category: categoryParams, title: title },
        })
      }
    >
      <Text style={styles.CategoryText}>{title}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={globalStyles.filmBanner}
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
        source={{ uri: "https://image.tmdb.org/t/p/w154/" + item.poster_path }}
        style={globalStyles.filmImage}
      />
      {item.vote_average > 0 && (
        <Text style={styles.ratingText}>{item.vote_average}/5 ★</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.headerText}>Główna</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View>
            <SectionHeader title={item.title} categoryParams={item.param} />
            <FlatList
              data={item.data}
              keyExtractor={(mediaItem) => `${item.id}_${mediaItem.id}`}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 5 }}
              renderItem={renderCard}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  CategoryText: {
    marginLeft: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  chevron: {
    color: AppColors.textGray,
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 24,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
});
