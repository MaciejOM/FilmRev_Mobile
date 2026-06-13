import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import {
  getMediaFromFirestore,
  syncMediaToFirestore,
} from "./firebaseDatabase";

// Definicje stałych gatunków
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

interface MediaContextType {
  film: any[];
  Tv: any[];
  isLoading: boolean;
  error: string | null;
  refreshMedia: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

let hasSyncedInitial = false;

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [film, setFilm] = useState<any[]>([]);
  const [Tv, setTv] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateFromCache = useCallback(async () => {
    try {
      const [offlineMovies, offlineTv] = await Promise.all([
        AsyncStorage.getItem("offline_movies"),
        AsyncStorage.getItem("offline_tv"),
      ]);
      if (offlineMovies) setFilm(JSON.parse(offlineMovies));
      if (offlineTv) setTv(JSON.parse(offlineTv));
      return Boolean(offlineMovies || offlineTv);
    } catch {
      return false;
    }
  }, []);

  const loadData = useCallback(async () => {
    const hadCache = await hydrateFromCache();
    setIsLoading(!hadCache);

    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      setError(
        hadCache
          ? "Brak połączenia z siecią. Dane wczytane z pamięci podręcznej."
          : "Brak połączenia z siecią. Sprawdź internet.",
      );
      setIsLoading(false);
      return;
    }

    try {
      const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

      if (!hasSyncedInitial) {
        hasSyncedInitial = true;

        const [movieRes, tvRes] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=pl-PL&page=1`,
          ),
          fetch(
            `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&language=pl-PL&page=1`,
          ),
        ]);

        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        await Promise.all([
          movieData.results
            ? syncMediaToFirestore(movieData.results, "movie", MOVIE_GENRES)
            : Promise.resolve(),
          tvData.results
            ? syncMediaToFirestore(tvData.results, "tv", TV_GENRES)
            : Promise.resolve(),
        ]);
      }

      const [fbMovies, fbTv] = await Promise.all([
        getMediaFromFirestore("movie"),
        getMediaFromFirestore("tv"),
      ]);

      const mappedMovies = fbMovies.map((item: any) => ({
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

      const mappedTv = fbTv.map((item: any) => ({
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

      setFilm(mappedMovies);
      setTv(mappedTv);
      setError(null);

      Promise.all([
        AsyncStorage.setItem("offline_movies", JSON.stringify(mappedMovies)),
        AsyncStorage.setItem("offline_tv", JSON.stringify(mappedTv)),
      ]).catch(() => {});
    } catch (err) {
      console.error("Błąd ładowania danych globalnych:", err);
      if (!hadCache) {
        setError("Wystąpił problem z pobieraniem danych z serwera.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [hydrateFromCache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const ratingSub = DeviceEventEmitter.addListener(
      "movieRatingUpdated",
      ({ movieId, newAverage }: { movieId: string; newAverage: number }) => {
        const isMovie = movieId.startsWith("movie_");
        const tmdbId = Number(movieId.replace("movie_", "").replace("tv_", ""));

        const patchList = (list: any[]) =>
          list.map((item) =>
            item.id === tmdbId ? { ...item, vote_average: newAverage } : item,
          );

        if (isMovie) setFilm((prev) => patchList(prev));
        else setTv((prev) => patchList(prev));
      },
    );

    return () => ratingSub.remove();
  }, []);

  const value = useMemo(
    () => ({ film, Tv, isLoading, error, refreshMedia: loadData }),
    [film, Tv, isLoading, error, loadData],
  );

  return (
    <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
  );
};

export const useGlobalMedia = () => {
  const context = useContext(MediaContext);
  if (!context)
    throw new Error("useGlobalMedia musi być używane wewnątrz MediaProvider");
  return context;
};
