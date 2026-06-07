import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "@/hooks/firebaseConfig";
import { getUserList } from "@/hooks/firebaseDatabase";

export default function Watchlist() {
  const [movies, setMovies] = useState<any[]>([]);
  const [tvShows, setTvShows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pobieranie listy dla odpowiedniego użytkownika z Firestore
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

  // Renderowanie listy
  const renderGridItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
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
      />
    </TouchableOpacity>
  );

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
        <Text style={globalStyles.headerText2}>Do obejrzenia</Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Skeleton
            width={120}
            height={20}
            borderRadius={4}
            style={{ marginBottom: 15, marginTop: 10 }}
          />
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <Skeleton key={key} style={styles.gridItem} />
            ))}
          </View>
        </ScrollView>
      ) : movies.length === 0 && tvShows.length === 0 ? (
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.emptyText}>Brak ulubionych tytułów.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {movies.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Filmy</Text>
              </View>
              <View style={styles.gridContainer}>
                {movies.map(renderGridItem)}
              </View>
            </>
          )}

          {tvShows.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Seriale</Text>
              </View>
              <View style={styles.gridContainer}>
                {tvShows.map(renderGridItem)}
              </View>
            </>
          )}
        </ScrollView>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    borderBottomWidth: 1,
    borderColor: "#3a3c4f",
    paddingBottom: 5,
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    color: AppColors.textGray,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: "3%" },
  gridItem: {
    width: "31%",
    marginBottom: 15,
    aspectRatio: 2 / 3,
    backgroundColor: "#3a3c4f",
    borderRadius: 8,
    overflow: "hidden",
  },
  posterImage: { width: "100%", height: "100%", resizeMode: "cover" },
});
