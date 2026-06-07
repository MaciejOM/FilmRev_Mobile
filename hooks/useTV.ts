import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Import
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  getMediaFromFirestore,
  syncMediaToFirestore,
} from "./firebaseDatabase";

const TV_GENRES: Record<number, string> = {
  10759: "Akcja i Przygoda",
  16: "Animacja",
  35: "Komedia",
  80: "Kryminał",
  99: "Dokumentalny",
  18: "Dramat",
  10751: "Familijny",
  10762: "Kids",
  9648: "Tajemnica",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Opera mydlana",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

let hasSyncedTVSession = false;

export const useTV = () => {
  const [Tv, setTv] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!hasSyncedTVSession) {
          try {
            const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
            const response = await fetch(
              `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&language=pl-PL&page=1`,
            );
            const data = await response.json();

            if (data.results) {
              syncMediaToFirestore(data.results, "tv", TV_GENRES)
                .then(() => {
                  hasSyncedTVSession = true;
                })
                .catch((err) => console.error("Błąd synchronizacji:", err));

              const fbData = await getMediaFromFirestore("tv");
              const localRatings = new Map(
                fbData.map((item: any) => [
                  item.tmdb_id,
                  item.vote_average || 0,
                ]),
              );

              const mappedData = data.results.map((item: any) => ({
                id: item.id,
                name: item.name,
                first_air_date: item.first_air_date,
                overview: item.overview || "Brak opisu",
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: localRatings.get(item.id) || 0,
                gatunki: item.genre_ids
                  ? item.genre_ids
                      .map((id: number) => TV_GENRES[id])
                      .filter(Boolean)
                      .join(", ")
                  : "",
                type: "tv",
              }));

              await AsyncStorage.setItem(
                "offline_tv",
                JSON.stringify(mappedData),
              );

              setTv(mappedData);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.error("Błąd TMDB:", err);
          }
        }

        try {
          const fbData = await getMediaFromFirestore("tv");
          const mappedData = fbData.map((item: any) => ({
            id: item.tmdb_id,
            name: item.nazwa,
            first_air_date: item.rok,
            overview: item.overview,
            poster_path: item.plakat,
            backdrop_path: item.backdrop,
            vote_average: item.vote_average || 0,
            gatunki: item.gatunki ? item.gatunki.join(", ") : "",
            type: "tv",
          }));

          await AsyncStorage.setItem("offline_tv", JSON.stringify(mappedData));
          setTv(mappedData);
        } catch (err) {
          console.error("Brak sieci. Wczytywanie offline...");

          const offlineData = await AsyncStorage.getItem("offline_tv");
          if (offlineData) {
            setTv(JSON.parse(offlineData));
          } else {
            setError("Nie udało się załadować seriali (Brak sieci).");
          }
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }, []),
  );

  return { Tv, isLoading, error };
};
