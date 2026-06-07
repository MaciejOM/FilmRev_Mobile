import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Import AsyncStorage
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  getMediaFromFirestore,
  syncMediaToFirestore,
} from "./firebaseDatabase";

const MOVIE_GENRES: Record<number, string> = {
  28: "Akcja",
  12: "Przygodowy",
  16: "Animacja",
  35: "Komedia",
  80: "Kryminał",
  99: "Dokumentalny",
  18: "Dramat",
  10751: "Familijny",
  14: "Fantasy",
  36: "Historyczny",
  27: "Horror",
  10402: "Muzyczny",
  9648: "Tajemnica",
  10749: "Romans",
  878: "Sci-Fi",
  10770: "Film TV",
  53: "Thriller",
  10752: "Wojenny",
  37: "Western",
};

let hasSyncedMoviesSession = false;

export const useFilms = () => {
  const [film, setFilm] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!hasSyncedMoviesSession) {
          try {
            const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
            const response = await fetch(
              `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=pl-PL&page=1`,
            );
            const data = await response.json();

            if (data.results) {
              syncMediaToFirestore(data.results, "movie", MOVIE_GENRES)
                .then(() => {
                  hasSyncedMoviesSession = true;
                })
                .catch((err) => console.error("Błąd synchronizacji:", err));

              const fbData = await getMediaFromFirestore("movie");
              const localRatings = new Map(
                fbData.map((item: any) => [
                  item.tmdb_id,
                  item.vote_average || 0,
                ]),
              );

              const mappedData = data.results.map((item: any) => ({
                id: item.id,
                title: item.title,
                release_date: item.release_date,
                overview: item.overview || "Brak opisu",
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: localRatings.get(item.id) || 0,
                gatunki: item.genre_ids
                  ? item.genre_ids
                      .map((id: number) => MOVIE_GENRES[id])
                      .filter(Boolean)
                      .join(", ")
                  : "",
                type: "movie",
              }));

              await AsyncStorage.setItem(
                "offline_movies",
                JSON.stringify(mappedData),
              );

              setFilm(mappedData);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.error("Błąd TMDB:", err);
          }
        }

        try {
          const fbData = await getMediaFromFirestore("movie");
          const mappedData = fbData.map((item: any) => ({
            id: item.tmdb_id,
            title: item.nazwa,
            release_date: item.rok,
            overview: item.overview,
            poster_path: item.plakat,
            backdrop_path: item.backdrop,
            vote_average: item.vote_average || 0,
            gatunki: item.gatunki ? item.gatunki.join(", ") : "",
            type: "movie",
          }));

          await AsyncStorage.setItem(
            "offline_movies",
            JSON.stringify(mappedData),
          );
          setFilm(mappedData);
        } catch (err) {
          console.error("Błąd sieci. Próba wczytania danych offline...");

          const offlineData = await AsyncStorage.getItem("offline_movies");
          if (offlineData) {
            setFilm(JSON.parse(offlineData));
          } else {
            setError("Brak połączenia z siecią i brak zapisanych danych.");
          }
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }, []),
  );

  return { film, isLoading, error };
};
