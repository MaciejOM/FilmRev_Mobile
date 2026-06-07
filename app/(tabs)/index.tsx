import { AppColors, globalStyles } from "@/constants/theme";
import { useFilms } from "@/hooks/useFilms";
import { useTV } from "@/hooks/useTV";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();
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

  const latestMovies = [...moviesData].sort(
    (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
  );

  const latestTv = [...tvData].sort(
    (a, b) => safeDate(b.searchDate) - safeDate(a.searchDate),
  );

  const topRated = [...moviesData, ...tvData]
    .filter((item) => (item.vote_average || 0) > 0)
    .sort((a, b) => b.vote_average - a.vote_average);

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

  // Renderowanie katy produkcji
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
        source={{ uri: "https://image.tmdb.org/t/p/w500/" + item.poster_path }}
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

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <SectionHeader title="Najnowsze filmy" categoryParams="latest_movies" />
        <FlatList
          data={latestMovies.slice(0, 4)}
          keyExtractor={(item) => `latestMovie_${item.id}`}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 5 }}
          renderItem={renderCard}
        />

        <SectionHeader title="Najnowsze seriale" categoryParams="latest_tv" />
        <FlatList
          data={latestTv.slice(0, 4)}
          keyExtractor={(item) => `latestTv_${item.id}`}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 5 }}
          renderItem={renderCard}
        />

        {topRated.length > 0 && (
          <>
            <SectionHeader
              title="Najlepiej oceniane"
              categoryParams="top_rated"
            />
            <FlatList
              data={topRated.slice(0, 4)}
              keyExtractor={(item) => `topRated_${item.type}_${item.id}`}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 5 }}
              renderItem={renderCard}
            />
          </>
        )}
      </ScrollView>
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
