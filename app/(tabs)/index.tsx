import { AppColors, globalStyles } from "@/constants/theme";
import { useGlobalMedia } from "@/hooks/MediaContext";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import HomeCategorySection from "@/components/home/HomeCategorySection";

export default function Index() {
  const { film, Tv, isLoading, error, refreshMedia } = useGlobalMedia();

  const sections = useMemo(() => {
    if (!film || !Tv) return [];

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

    const generatedSections = [
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
      generatedSections.push({
        id: "top_rated",
        title: "Najlepiej oceniane",
        param: "top_rated",
        data: topRated.slice(0, 4),
      });
    }

    return generatedSections;
  }, [film, Tv]);

  if (isLoading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={globalStyles.loadingText}>Pobieranie...</Text>
      </View>
    );
  }

  // Obsługa błędów sieciowych z wymaganą opcją RETRY (Punkt 12 z wytycznych)
  if (error && film.length === 0 && Tv.length === 0) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.headerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshMedia}>
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.headerText}>Główna</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.mainScrollContent}
        renderItem={({ item }) => (
          <HomeCategorySection
            title={item.title}
            categoryParam={item.param}
            data={item.data}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainScrollContent: { paddingBottom: 30 },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});