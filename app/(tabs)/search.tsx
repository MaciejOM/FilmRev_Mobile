import { AppColors, globalStyles } from "@/constants/theme";
import { useGlobalMedia } from "@/hooks/MediaContext"; // Zamieniono na główny hook, by mieć dostęp do Retry
import { useResponsive } from "@/hooks/useResponsive";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function FilmList() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { numGridColumns, gridItemWidth } = useResponsive();
  const itemWidth = gridItemWidth(20, 15);

  // Pobieranie wszystkiego z jednego miejsca (wraz z funkcją naprawczą z pkt 12)
  const { film, Tv, isLoading, error, refreshMedia } = useGlobalMedia();

  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRating, setFilterRating] = useState(0);

  const hasError = error && film.length === 0 && Tv.length === 0;
  const isSearchEmpty = searchQuery.trim() === "";

  const hasActiveFilters =
    filterType !== "all" ||
    filterGenre !== "" ||
    filterYear !== "" ||
    filterRating > 0;

  // OPTYMALIZACJA: Połączenie list wykonuje się tylko po pobraniu nowych danych, a nie przy każdym wpisaniu literki
  const combinedData = useMemo(() => {
    return [
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
  }, [film, Tv]);

  // OPTYMALIZACJA: Wyciąganie lat produkcji z pamięci podręcznej
  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        combinedData.map((item) =>
          item.searchDate.length >= 4 ? item.searchDate.substring(0, 4) : "",
        ),
      ),
    )
      .filter((year) => year !== "")
      .sort()
      .reverse();
  }, [combinedData]);

  // OPTYMALIZACJA: Dynamiczne wyciąganie unikalnych gatunków
  const availableGenres = useMemo(() => {
    return Array.from(
      new Set(
        combinedData.flatMap((item) => {
          if (Array.isArray(item.gatunki)) return item.gatunki;
          if (typeof item.gatunki === "string" && item.gatunki.trim() !== "")
            return item.gatunki.split(",").map((g: string) => g.trim());
          return [];
        }),
      ),
    ).sort();
  }, [combinedData]);

  // Główny silnik filtrujący wewnątrz useMemo (zabezpieczenie przed lagami podczas pisania na klawiaturze)
  const dataToShow = useMemo(() => {
    if (isSearchEmpty && !hasActiveFilters) return [];

    return combinedData.filter((item) => {
      if (
        !isSearchEmpty &&
        !item.searchTitle.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
        return false;

      if (filterType !== "all" && item.type !== filterType) return false;

      if (filterYear !== "" && !item.searchDate.startsWith(filterYear))
        return false;

      const itemGenres = Array.isArray(item.gatunki)
        ? item.gatunki
        : typeof item.gatunki === "string"
          ? item.gatunki.split(",").map((g) => g.trim())
          : [];
      if (filterGenre !== "" && !itemGenres.includes(filterGenre)) return false;

      const rating = Number(item.vote_average || item.srednia_ocen || 0);
      if (filterRating > 0) {
        if (rating < filterRating || rating >= filterRating + 1) {
          return false;
        }
      }

      return true;
    });
  }, [
    combinedData,
    searchQuery,
    filterType,
    filterYear,
    filterGenre,
    filterRating,
    isSearchEmpty,
    hasActiveFilters,
  ]);

  // Resetowanie wszystkich nałożonych filtrów jednym kliknięciem
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
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={["all", "movie", "tv"]}
              keyExtractor={(item) => item}
              renderItem={({ item: type }) => (
                <TouchableOpacity
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
              )}
            />
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Min. ocena z recenzji:</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[0, 1, 2, 3, 4, 5]}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item: rating }) => (
                <TouchableOpacity
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
              )}
            />
          </View>

          {availableGenres.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Gatunek:</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={["", ...availableGenres]}
                keyExtractor={(item) => item as string}
                renderItem={({ item: genre }) => (
                  <TouchableOpacity
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
                      {genre === "" ? "Wszystkie" : (genre as string)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {availableYears.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Rok produkcji:</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={["", ...availableYears]}
                keyExtractor={(item) => item as string}
                renderItem={({ item: year }) => (
                  <TouchableOpacity
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
                      {year === "" ? "Dowolny" : (year as string)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
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
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text style={globalStyles.emptyText}>Błąd pobierania danych z serwera.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshMedia}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      ) : isSearchEmpty && !hasActiveFilters ? (
        <Text style={globalStyles.emptyText}>
          Wpisz tytuł lub wybierz filtry, aby wyszukać.
        </Text>
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
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          initialNumToRender={6}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={globalStyles.emptyText}>
              Brak wyników spełniających kryteria.
            </Text>
          }
          renderItem={({ item }) => {
            const itemRating = Number(
              item.vote_average || item.srednia_ocen || 0,
            );

            return (
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
                      "https://image.tmdb.org/t/p/w500/" +
                      (item.poster_path || item.plakat),
                  }}
                  style={[globalStyles.filmImage, { height: 160 }]}
                  contentFit="cover"
                  transition={200}
                />
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.searchTitle}
                </Text>

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