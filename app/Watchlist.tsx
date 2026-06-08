//importy
import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
  // useState'y
  const [movies, setMovies] = useState<any[]>([]);
  const [tvShows, setTvShows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"movie" | "tv">("movie");

  // Asynchroniczne pobieranie listy produkcji przypisanych jako "Do obejrzenia"
  useFocusEffect(
    useCallback(() => {
      const fetchList = async () => {
        const user = auth.currentUser;
        if (user) {
          const data = await getUserList(user.uid, "watchlist");
          setMovies(data.movies);
          setTvShows(data.tv);
        }
        setIsLoading(false);
      };
      fetchList();
    }, []),
  );

  // Dynamiczne renderowanie kafelka na siatce połączone z nawigacją do detali
  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() =>
        router.push({
          pathname: "/FilmDetail",
          params: {
            id: item.tmdb_id,
            title: item.nazwa,
            release_date: item.rok,
            overview: item.overview,
            backdrop: item.backdrop,
            gatunki: item.gatunki ? item.gatunki.join(", ") : "",
            type: item.typ,
          },
        })
      }
    >
      <Image
        source={{ uri: "https://image.tmdb.org/t/p/w500/" + item.plakat }}
        style={styles.posterImage}
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  // Zmiana wyświetlanych danych w zależności od aktualnie aktywnej zakładki
  const dataToShow = activeTab === "movie" ? movies : tvShows;

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

      {/* Ekran ładowania w formie szkieletów zastępczych */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          numColumns={3}
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
          renderItem={() => <Skeleton style={styles.gridItem} />}
        />
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
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.scrollContent}
            columnWrapperStyle={{ gap: 15, justifyContent: "flex-start" }}
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
    flex: 1,
    maxWidth: "31%",
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
});
