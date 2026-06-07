import { AppColors, globalStyles } from "@/constants/theme";
import { useFilms } from "@/hooks/useFilms";
import { useTV } from "@/hooks/useTV";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function FilmList() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { film, isLoading: isFilmLoading, error: filmError } = useFilms();
  const { Tv, isLoading: isTvLoading, error: tvError } = useTV();

  // Filtry
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRating, setFilterRating] = useState(0);

  const isLoading = isFilmLoading || isTvLoading;
  const hasError = filmError && film.length === 0 && tvError && Tv.length === 0;
  const isSearchEmpty = searchQuery.trim() === "";

  // Łączenie filmów i seriali w jedną listę.
  const combinedData = [
    ...film.map((item) => ({
      ...item,
      searchTitle: String(item.title || item.nazwa || item.name || ""),
      searchDate: String(
        item.release_date || item.rok || item.first_air_date || "",
      ),
      type: "movie",
    })),
    ...Tv.map((item) => ({
      ...item,
      searchTitle: String(item.name || item.nazwa || item.title || ""),
      searchDate: String(
        item.first_air_date || item.rok || item.release_date || "",
      ),
      type: "tv",
    })),
  ];

  // Listy dla filtrów roku i gatunków z Firestore
  // Rok produkcji
  const availableYears = Array.from(
    new Set(
      combinedData.map((item) =>
        item.searchDate.length >= 4 ? item.searchDate.substring(0, 4) : "",
      ),
    ),
  )
    .filter((year) => year !== "")
    .sort()
    .reverse();

  // Gatunki
  const availableGenres = Array.from(
    new Set(
      combinedData.flatMap((item) => {
        if (Array.isArray(item.gatunki)) return item.gatunki;
        if (typeof item.gatunki === "string" && item.gatunki.trim() !== "")
          return item.gatunki.split(",").map((g: string) => g.trim());
        return [];
      }),
    ),
  ).sort();

  const hasActiveFilters =
    filterType !== "all" ||
    filterGenre !== "" ||
    filterYear !== "" ||
    filterRating > 0;

  //Filtrowanie
  const mediaFilter = combinedData.filter((item) => {
    // 1. Wyszukiwarka tekstowa
    if (
      !isSearchEmpty &&
      !item.searchTitle.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
      return false;

    // 2. Typ
    if (filterType !== "all" && item.type !== filterType) return false;

    // 3. Rok produkcji
    if (filterYear !== "" && !item.searchDate.startsWith(filterYear))
      return false;

    // 4. Gatunek
    const itemGenres = Array.isArray(item.gatunki)
      ? item.gatunki
      : typeof item.gatunki === "string"
        ? item.gatunki.split(",").map((g) => g.trim())
        : [];
    if (filterGenre !== "" && !itemGenres.includes(filterGenre)) return false;

    // 5. Ocena
    const rating = Number(item.vote_average || item.srednia_ocen || 0);
    if (filterRating > 0) {
      if (rating < filterRating || rating >= filterRating + 1) {
        return false;
      }
    }

    return true;
  });

  const dataToShow = isSearchEmpty && !hasActiveFilters ? [] : mediaFilter;

  const clearFilters = () => {
    setFilterType("all");
    setFilterGenre("");
    setFilterYear("");
    setFilterRating(0);
  };

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.headerText}>Wyszukaj</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[globalStyles.input, styles.searchInput]}
          placeholder="Co chciałbyś zobaczyć?"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={AppColors.textGray}
        />

        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? "Zwiń" : "Filtry"} {hasActiveFilters && "*"}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Rodzaj:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {["all", "movie", "tv"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    filterType === type && styles.chipActive,
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterType === type && styles.chipTextActive,
                    ]}
                  >
                    {type === "all"
                      ? "Wszystko"
                      : type === "movie"
                        ? "Filmy"
                        : "Seriale"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Min. ocena z recenzji:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.chip,
                    filterRating === rating && styles.chipActive,
                  ]}
                  onPress={() => setFilterRating(rating)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterRating === rating && styles.chipTextActive,
                    ]}
                  >
                    {rating === 0
                      ? "Wszystkie"
                      : rating === 5
                        ? "5.0 ★"
                        : `${rating}.0 - ${rating}.9 ★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {availableGenres.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Gatunek:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, filterGenre === "" && styles.chipActive]}
                  onPress={() => setFilterGenre("")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterGenre === "" && styles.chipTextActive,
                    ]}
                  >
                    Wszystkie
                  </Text>
                </TouchableOpacity>
                {availableGenres.map((genre) => (
                  <TouchableOpacity
                    key={genre as string}
                    style={[
                      styles.chip,
                      filterGenre === genre && styles.chipActive,
                    ]}
                    onPress={() => setFilterGenre(genre as string)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filterGenre === genre && styles.chipTextActive,
                      ]}
                    >
                      {genre as string}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {availableYears.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Rok produkcji:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, filterYear === "" && styles.chipActive]}
                  onPress={() => setFilterYear("")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterYear === "" && styles.chipTextActive,
                    ]}
                  >
                    Dowolny
                  </Text>
                </TouchableOpacity>
                {availableYears.map((year) => (
                  <TouchableOpacity
                    key={year as string}
                    style={[
                      styles.chip,
                      filterYear === year && styles.chipActive,
                    ]}
                    onPress={() => setFilterYear(year as string)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filterYear === year && styles.chipTextActive,
                      ]}
                    >
                      {year as string}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Wyczyść filtry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={AppColors.primary}
          style={{ marginTop: 20 }}
        />
      ) : hasError ? (
        <Text style={globalStyles.emptyText}>Błąd pobierania danych.</Text>
      ) : isSearchEmpty && !hasActiveFilters ? (
        <Text style={globalStyles.emptyText}>
          Wpisz tytuł lub wybierz filtry, aby wyszukać.
        </Text>
      ) : (
        <FlatList
          data={dataToShow}
          keyExtractor={(item) => `${item.type}-${item.id || item.tmdb_id}`}
          horizontal={false}
          numColumns={3}
          columnWrapperStyle={{
            gap: 15,
            justifyContent: "flex-start",
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={
            <Text style={globalStyles.emptyText}>
              Brak wyników spełniających kryteria.
            </Text>
          }
          renderItem={({ item }) => {
            // Pobieramy bezpiecznie ocenę, aby ją wyświetlić
            const itemRating = Number(
              item.vote_average || item.srednia_ocen || 0,
            );

            return (
              <TouchableOpacity
                style={styles.gridBanner}
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
                      "https://image.tmdb.org/t/p/w500/" +
                      (item.poster_path || item.plakat),
                  }}
                  style={[globalStyles.filmImage, { height: 160 }]}
                />
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.searchTitle}
                </Text>

                {/* Wyświetlamy średnią ocen z Firebase, o ile film ma chociaż jedną recenzję */}
                {itemRating > 0 && (
                  <Text style={styles.gridRating}>{itemRating}/5 ★</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0 },
  filterButton: {
    marginLeft: 10,
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: "#3a3c4f",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: AppColors.primary },
  filterButtonText: { color: "white", fontWeight: "bold" },
  filtersContainer: {
    backgroundColor: "#1e1f26",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#3a3c4f",
    marginBottom: 10,
  },
  filterGroup: { marginBottom: 12 },
  filterLabel: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  chip: {
    backgroundColor: "#27282e",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#3a3c4f",
  },
  chipActive: {
    backgroundColor: "rgba(184, 0, 92, 0.2)",
    borderColor: AppColors.primary,
  },
  chipText: { color: "#ccc", fontSize: 14 },
  chipTextActive: { color: AppColors.primary, fontWeight: "bold" },
  clearButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  clearButtonText: {
    color: AppColors.textGray,
    textDecorationLine: "underline",
  },
  gridBanner: { width: "31%", marginBottom: 20 },
  gridTitle: { color: "white", fontSize: 12, fontWeight: "bold", marginTop: 5 },
  gridRating: { color: "#FFD700", fontSize: 11, marginTop: 2 },
});
