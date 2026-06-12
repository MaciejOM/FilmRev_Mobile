import AsyncStorageModule from "@react-native-async-storage/async-storage";
import NetInfoModule from "@react-native-community/netinfo";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { getMediaFromFirestore as getMediaModule } from "../firebaseDatabase";
import { MediaProvider, useGlobalMedia } from "../MediaContext";
import { useFilms } from "../useFilms";
import { useTV } from "../useTV";

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../firebaseDatabase", () => ({
  getMediaFromFirestore: jest.fn(),
  syncMediaToFirestore: jest.fn().mockResolvedValue(undefined),
}));

const NetInfo = NetInfoModule as unknown as { fetch: jest.Mock };
const AsyncStorage = AsyncStorageModule as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};
const getMediaFromFirestore = getMediaModule as unknown as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MediaProvider>{children}</MediaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  AsyncStorage.setItem.mockResolvedValue(undefined);
  AsyncStorage.getItem.mockResolvedValue(null);
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ results: [] }),
  }) as any;
});

describe("useFilms", () => {
  it("exposes mapped movies from Firestore", async () => {
    const raw = [
      {
        tmdb_id: 1,
        nazwa: "Dune",
        typ: "movie",
        plakat: "/a.jpg",
        rok: "2021",
        overview: "Pustynia",
        gatunki: ["Sci-Fi"],
        vote_average: 7.9,
        backdrop: "/b.jpg",
      },
    ];
    getMediaFromFirestore.mockResolvedValueOnce(raw).mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useFilms(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.film).toHaveLength(1);
    expect(result.current.film[0].title).toBe("Dune");
    expect(result.current.film[0].type).toBe("movie");
    expect(result.current.error).toBeNull();
  });

  it("exposes mapped TV shows from Firestore", async () => {
    const raw = [
      {
        tmdb_id: 2,
        nazwa: "Breaking Bad",
        typ: "tv",
        plakat: "/c.jpg",
        rok: "2008",
        overview: "Chemia",
        gatunki: ["Dramat"],
        vote_average: 9.5,
        backdrop: "/d.jpg",
      },
    ];
    getMediaFromFirestore.mockResolvedValueOnce([]).mockResolvedValueOnce(raw);

    const { result } = await renderHook(() => useTV(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.Tv).toHaveLength(1);
    expect(result.current.Tv[0].name).toBe("Breaking Bad");
    expect(result.current.Tv[0].type).toBe("tv");
  });

  it("falls back to AsyncStorage cache and sets offline error when offline", async () => {
    NetInfo.fetch.mockResolvedValue({ isConnected: false });
    const cached = [{ id: 1, title: "Cached Film", type: "movie" }];
    AsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === "offline_movies")
        return Promise.resolve(JSON.stringify(cached));
      return Promise.resolve(null);
    });

    const { result } = await renderHook(() => useFilms(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.film).toHaveLength(1);
    expect(result.current.error).toContain("Brak połączenia");
    expect(getMediaFromFirestore).not.toHaveBeenCalled();
  });
});

describe("useGlobalMedia outside provider", () => {
  it("throws when rendered outside MediaProvider", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let thrownError: any = null;

    await renderHook(() => {
      try {
        return useGlobalMedia();
      } catch (e: any) {
        thrownError = e;
        return null as any;
      }
    });

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toContain(
      "useGlobalMedia musi być używane wewnątrz MediaProvider",
    );
    consoleError.mockRestore();
  });
});
