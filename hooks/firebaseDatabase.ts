// Importy
import { db } from "@/hooks/firebaseConfig";
import NetInfo from "@react-native-community/netinfo";
import { DeviceEventEmitter } from "react-native";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

// --- HELPERY ---

// Funkcja sprawdzająca połączenie z siecią przed wykonaniem operacji
const ensureNetworkConnection = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error(
      "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.",
    );
  }
};

// --- GŁÓWNE OPERACJE NA BAZIE (FILMY I SERIALE) ---

// Synchronizacja nowej listy filmów i seriali z zewnętrznego API do bazy Firestore
export const syncMediaToFirestore = async (
  mediaArray: any[],
  type: "movie" | "tv",
  genresMap: any,
) => {
  try {
    await ensureNetworkConnection();

    const promises = mediaArray.map(async (item) => {
      const nazwa = type === "movie" ? item.title : item.name;
      const data = type === "movie" ? item.release_date : item.first_air_date;

      const gatunkiNazwy = item.genre_ids
        ? item.genre_ids.map((id: number) => genresMap[id]).filter(Boolean)
        : [];

      const documentId = `${type}_${item.id}`;
      const movieRef = doc(db, "movies", documentId);

      const docSnap = await getDoc(movieRef);
      const existingData = docSnap.exists() ? docSnap.data() : null;

      // Zapobiega nadpisaniu lokalnej oceny w bazie przy synchronizacji z TMDB
      const currentVoteAverage =
        existingData && existingData.vote_average !== undefined
          ? existingData.vote_average
          : 0;

      await setDoc(
        movieRef,
        {
          tmdb_id: item.id,
          typ: type,
          nazwa: nazwa,
          rok: data,
          overview: item.overview,
          plakat: item.poster_path,
          backdrop: item.backdrop_path,
          gatunki: gatunkiNazwy,
          vote_average: currentVoteAverage,
        },
        { merge: true },
      );
    });

    await Promise.all(promises);
    console.log(`Pomyślnie zsynchronizowano dane typu: ${type}`);
  } catch (error) {
    console.error("Błąd zapisu do Firestore:", error);
  }
};

// Pobieranie wszystkich zapisanych produkcji danego typu
export const getMediaFromFirestore = async (type: "movie" | "tv") => {
  try {
    await ensureNetworkConnection();

    const q = query(collection(db, "movies"), where("typ", "==", type));
    const querySnapshot = await getDocs(q);
    const media: any[] = [];

    querySnapshot.forEach((doc) => {
      media.push({ firebase_id: doc.id, ...doc.data() });
    });

    return media;
  } catch (error) {
    console.error("Błąd pobierania danych z Firestore:", error);
    throw error; // Rzucamy dalej, aby UI mogło wyświetlić opcję Retry
  }
};

// --- SYSTEM RECENZJI ---

// Dodawanie recenzji
export const addFirebaseReview = async (
  movieId: string,
  userId: string,
  username: string,
  avatar: string | null,
  ocena: number,
  tresc: string,
  tags: string[] = [],
) => {
  try {
    await ensureNetworkConnection();

    const docRef = await addDoc(collection(db, "reviews"), {
      movieId: movieId,
      userId: userId,
      nazwa_uzytkownika: username,
      avatar: avatar,
      ocena: ocena,
      tresc: tresc,
      tags: tags,
      createdAt: serverTimestamp(),
    });

    // Wywołanie przeliczenia średniej oceny przy dodaniu recenzji
    await updateMovieAverageRating(movieId);

    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Pobieranie wszystkich recenzji dla danej produkcji
export const getFirebaseReviewsForFilm = async (movieId: string) => {
  if (!movieId) return [];

  try {
    await ensureNetworkConnection();

    const q = query(collection(db, "reviews"), where("movieId", "==", movieId));
    const querySnapshot = await getDocs(q);
    const reviews: any[] = [];

    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });

    return reviews.sort(
      (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis(),
    );
  } catch (error) {
    console.error("Błąd pobierania recenzji z Firestore:", error);
    throw error;
  }
};

// Usuwanie recenzji
export const deleteFirebaseReview = async (reviewId: string) => {
  try {
    await ensureNetworkConnection();

    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const reviewData = reviewSnap.data();
      const movieId = reviewData.movieId;

      await deleteDoc(reviewRef);

      // Wywołanie przeliczenia średniej oceny przy usunięciu recenzji
      await updateMovieAverageRating(movieId);
    } else {
      // Przypadek, w którym recenzja nie istnieje
      await deleteDoc(reviewRef);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Błąd usuwania recenzji w Firestore:", error);
    return { success: false, error: error.message };
  }
};

// Edytowanie recenzji
export const updateFirebaseReview = async (
  reviewId: string,
  movieId: string,
  ocena: number,
  tresc: string,
  tags: string[],
) => {
  try {
    await ensureNetworkConnection();

    const reviewRef = doc(db, "reviews", reviewId);
    await updateDoc(reviewRef, {
      ocena: ocena,
      tresc: tresc,
      tags: tags,
      isEdited: true,
      updatedAt: serverTimestamp(),
    });

    await updateMovieAverageRating(movieId);

    return { success: true };
  } catch (error: any) {
    console.error("Błąd edycji recenzji w Firestore:", error);
    return { success: false, error: error.message };
  }
};

// Aktualizowanie średniej ocen dla danej produkcji (funkcja pomocnicza)
export const updateMovieAverageRating = async (movieId: string) => {
  if (!movieId) return;

  try {
    // Tutaj nie dajemy ensureNetworkConnection, bo funkcja wywoływana jest wewnątrz innych, które już to sprawdzają
    const q = query(collection(db, "reviews"), where("movieId", "==", movieId));
    const querySnapshot = await getDocs(q);

    let totalScore = 0;
    let reviewsCount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ocena) {
        totalScore += data.ocena;
        reviewsCount++;
      }
    });

    const newAverage =
      reviewsCount > 0 ? Number((totalScore / reviewsCount).toFixed(1)) : 0;

    const movieRef = doc(db, "movies", movieId);
    await updateDoc(movieRef, {
      vote_average: newAverage,
    });

    // Powiadamiamy MediaContext, by od razu zaktualizował średnią ocenę trzymaną
    // w pamięci. Bez tego ekran główny ("Najlepiej oceniane") i wyszukiwarka
    // pokazywałyby starą ocenę aż do następnego uruchomienia aplikacji,
    // bo dane TMDB pobierane są tylko raz na sesję.
    DeviceEventEmitter.emit("movieRatingUpdated", { movieId, newAverage });

    console.log(
      `Zaktualizowano średnią ocen dla ${movieId} na: ${newAverage} (Liczba opinii: ${reviewsCount})`,
    );
  } catch (error) {
    console.error("Błąd podczas aktualizacji średniej ocen filmu:", error);
  }
};

// Polubienia pod recenzjami
export const toggleFirebaseReviewLike = async (
  reviewId: string,
  userId: string,
) => {
  try {
    await ensureNetworkConnection();

    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const data = reviewSnap.data();
      const likes = data.likes || [];
      const hasLiked = likes.includes(userId);

      if (hasLiked) {
        await updateDoc(reviewRef, { likes: arrayRemove(userId) });
      } else {
        await updateDoc(reviewRef, { likes: arrayUnion(userId) });
      }
      return { success: true };
    }
    return { success: false, error: "Nie znaleziono recenzji." };
  } catch (error: any) {
    console.error("Błąd podczas przełączania polubienia:", error);
    return { success: false, error: error.message };
  }
};

// --- LISTY UŻYTKOWNIKA ---

// Przełączanie elementu na liście (Watchlist, Favourites, Watched)
export const toggleUserList = async (
  userId: string,
  listName: "watchlist" | "favourites" | "watched",
  mediaId: string,
) => {
  try {
    await ensureNetworkConnection();

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const list = data[listName] || [];
      const isInList = list.includes(mediaId);

      if (isInList) {
        await updateDoc(userRef, { [listName]: arrayRemove(mediaId) });
        return { success: true, added: false };
      } else {
        await updateDoc(userRef, { [listName]: arrayUnion(mediaId) });
        return { success: true, added: true };
      }
    }
    return { success: false, error: "Użytkownik nie istnieje w bazie." };
  } catch (error: any) {
    console.error(`Błąd przełączania elementu na liście ${listName}:`, error);
    return { success: false, error: error.message };
  }
};

// Pobieranie danych z podstawowych list użytkownika
export const getUserList = async (
  userId: string,
  listName: "watchlist" | "favourites" | "watched",
) => {
  try {
    await ensureNetworkConnection();

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return { movies: [], tv: [] };

    const listIds = userDoc.data()[listName] || [];
    if (listIds.length === 0) return { movies: [], tv: [] };

    // Optymalizacja: pobieranie wszystkich elementów na raz
    const mediaPromises = listIds.map((id: string) =>
      getDoc(doc(db, "movies", id)),
    );
    const mediaSnaps = await Promise.all(mediaPromises);

    const movies: any[] = [];
    const tv: any[] = [];

    mediaSnaps.forEach((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.typ === "movie") movies.push({ id: snap.id, ...data });
        if (data.typ === "tv") tv.push({ id: snap.id, ...data });
      }
    });

    return { movies, tv };
  } catch (error) {
    console.error(`Błąd pobierania listy ${listName}:`, error);
    throw error;
  }
};

// Pobieranie wszystkich recenzji danego użytkownika
export const getUserReviews = async (userId: string) => {
  try {
    await ensureNetworkConnection();

    const q = query(collection(db, "reviews"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    // Optymalizacja z Promise.all zamiast pętli for...of
    const reviewsPromises = querySnapshot.docs.map(async (document) => {
      const data = document.data();
      const movieRef = doc(db, "movies", data.movieId);
      const movieSnap = await getDoc(movieRef);

      return {
        id: document.id,
        ...data,
        movieData: movieSnap.exists() ? movieSnap.data() : null,
      };
    });

    const reviews = await Promise.all(reviewsPromises);

    return reviews.sort(
      (a: any, b: any) =>
        (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
    );
  } catch (error) {
    console.error("Błąd pobierania recenzji użytkownika:", error);
    throw error;
  }
};

// --- OBSŁUGA NIESTANDARDOWYCH LIST ---

// 1. Pobieranie konkretnej listy po jej unikalnym ID wraz z danymi produkcji
export const getCustomListDetails = async (listId: string) => {
  try {
    await ensureNetworkConnection();

    const listRef = doc(db, "custom_lists", listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) return null;

    const listData = listSnap.data();
    const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

    if (!listData.items || listData.items.length === 0) {
      return { ...listData, id: listSnap.id, movies: [], tv: [] };
    }

    // Optymalizacja: Przejście z powolnego for...of na równoległe zapytania Promise.all
    const mediaPromises = listData.items.map(async (mediaId: string) => {
      const isMovie = mediaId.startsWith("movie_");
      const collectionName = isMovie ? "movie" : "tv";
      const cleanId = mediaId.replace("movie_", "").replace("tv_", "");

      try {
        const mediaRef = doc(db, collectionName, mediaId);
        const mediaSnap = await getDoc(mediaRef);

        if (mediaSnap.exists()) {
          return {
            type: isMovie ? "movie" : "tv",
            data: { id: mediaSnap.id, ...mediaSnap.data() },
          };
        } else {
          // Fallback do TMDB jeśli brakuje w Firestore
          const tmdbType = isMovie ? "movie" : "tv";
          const res = await fetch(
            `https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=pl-PL`,
          );
          const json = await res.json();

          if (json && !json.status_message) {
            return {
              type: tmdbType,
              data: {
                id: mediaId,
                tmdb_id: json.id,
                nazwa: json.title || json.name,
                plakat: json.poster_path,
                backdrop: json.backdrop_path,
                overview: json.overview,
                rok: json.release_date || json.first_air_date || "---",
                typ: tmdbType,
              },
            };
          }
        }
      } catch (err) {
        console.error(`Błąd parsowania elementu ${mediaId}:`, err);
      }
      return null; // Zwracamy null jeśli coś poszło nie tak
    });

    // Czekamy na rozwiązanie wszystkich zapytań jednocześnie
    const resolvedMedia = await Promise.all(mediaPromises);

    // Sortowanie wyników do odpowiednich tablic
    const moviesData = resolvedMedia
      .filter((item) => item?.type === "movie")
      .map((item) => item?.data);
    const tvData = resolvedMedia
      .filter((item) => item?.type === "tv")
      .map((item) => item?.data);

    return {
      ...listData,
      id: listSnap.id,
      movies: moviesData,
      tv: tvData,
    };
  } catch (error) {
    console.error("Błąd pobierania szczegółów niestandardowej listy:", error);
    throw error;
  }
};

// 2. Usuwanie niestandardowej listy
export const deleteCustomList = async (listId: string) => {
  try {
    await ensureNetworkConnection();
    const listRef = doc(db, "custom_lists", listId);
    await deleteDoc(listRef);
  } catch (error) {
    console.error("Błąd usuwania listy:", error);
    throw error;
  }
};

// 3. Zmiana nazwy listy
export const renameCustomList = async (listId: string, newName: string) => {
  try {
    await ensureNetworkConnection();
    const listRef = doc(db, "custom_lists", listId);
    await updateDoc(listRef, { name: newName });
  } catch (error) {
    console.error("Błąd zmiany nazwy listy:", error);
    throw error;
  }
};
