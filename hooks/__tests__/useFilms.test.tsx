import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  getMediaFromFirestore,
  syncMediaToFirestore,
} from "../firebaseDatabase";
import { useFilms } from "../useFilms";

// Mockowanie routera
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: jest.fn((callback) => {
      React.useEffect(() => {
        callback();
      }, []);
    }),
  };
});

jest.mock("../firebaseDatabase", () => ({
  getMediaFromFirestore: jest.fn(),
  syncMediaToFirestore: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

global.fetch = jest.fn();

let hookData: any;
function HookWrapper() {
  hookData = useFilms();
  return null;
}

describe("Logika pobierania danych (useFilms.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookData = null;
  });

  it("SCENARIUSZ 1: Pobiera dane z TMDB, synchronizuje z Firebase, zapisuje w AsyncStorage i zwraca mapę", async () => {
    const mockTMDBResponse = {
      results: [
        {
          id: 101,
          title: "Testowy Film",
          release_date: "2024-01-01",
          overview: "Opis testowy",
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg",
          vote_average: 8.5,
          genre_ids: [28],
        },
      ],
    };

    const mockFirebaseResponse = [{ tmdb_id: 101, vote_average: 9.0 }];

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockTMDBResponse),
    });
    (syncMediaToFirestore as jest.Mock).mockResolvedValue(true);
    (getMediaFromFirestore as jest.Mock).mockResolvedValue(
      mockFirebaseResponse,
    );

    await act(async () => {
      renderer.create(<HookWrapper />);
    });

    expect(hookData.isLoading).toBe(false);
    expect(hookData.film.length).toBeGreaterThan(0);
    expect(hookData.film[0].title).toBe("Testowy Film");
    expect(hookData.film[0].vote_average).toBe(9.0);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "offline_movies",
      expect.any(String),
    );
  });

  it("SCENARIUSZ 2: Używa fallbacku (pobiera z Firebase), gdy TMDB zgłosi błąd/brak internetu i zapisuje lokalnie", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("Brak połączenia z siecią"),
    );

    const mockFirebaseFallback = [
      {
        tmdb_id: 202,
        nazwa: "Film z pamięci Firebase",
        rok: "2023-05-05",
        overview: "Stary opis",
        plakat: "/old.jpg",
        backdrop: "/old_bg.jpg",
        vote_average: 5.0,
        gatunki: ["Dramat"],
      },
    ];

    (getMediaFromFirestore as jest.Mock).mockResolvedValue(
      mockFirebaseFallback,
    );

    await act(async () => {
      renderer.create(<HookWrapper />);
    });

    expect(hookData.isLoading).toBe(false);
    expect(hookData.film.length).toBeGreaterThan(0);
    expect(hookData.film[0].title).toBe("Film z pamięci Firebase");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "offline_movies",
      expect.any(String),
    );
  });

  it("SCENARIUSZ 3: Ostateczny fallback - ładuje dane z AsyncStorage, gdy brakuje sieci", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("Brak sieci (TMDB)"),
    );
    (getMediaFromFirestore as jest.Mock).mockRejectedValue(
      new Error("Brak sieci (Firebase)"),
    );

    const mockOfflineData = JSON.stringify([
      {
        id: 303,
        title: "Film wczytany offline",
        type: "movie",
      },
    ]);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockOfflineData);

    await act(async () => {
      renderer.create(<HookWrapper />);
    });

    expect(hookData.isLoading).toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("offline_movies");
    expect(hookData.film[0].title).toBe("Film wczytany offline");
  });
});
