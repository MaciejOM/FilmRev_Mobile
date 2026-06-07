import { db } from "@/hooks/firebaseConfig";
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

// Synchronizacja filmów i seriali z bazą danych
export const syncMediaToFirestore = async (
  mediaArray: any[],
  type: "movie" | "tv",
  genresMap: any,
) => {
  try {
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

// Pobieranie danych z bazy danych
export const getMediaFromFirestore = async (type: "movie" | "tv") => {
  try {
    const q = query(collection(db, "movies"), where("typ", "==", type));

    const querySnapshot = await getDocs(q);
    const media: any[] = [];

    querySnapshot.forEach((doc) => {
      media.push({ firebase_id: doc.id, ...doc.data() });
    });

    return media;
  } catch (error) {
    console.error("Błąd pobierania danych z Firestore:", error);
    return [];
  }
};

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
    await addDoc(collection(db, "reviews"), {
      movieId: movieId,
      userId: userId,
      nazwa_uzytkownika: username,
      avatar: avatar,
      ocena: ocena,
      tresc: tresc,
      tags: tags,
      createdAt: serverTimestamp(),
    });

    await updateMovieAverageRating(movieId);

    return { success: true };
  } catch (error) {
    console.error("Błąd dodawania recenzji do Firestore:", error);
    return { success: false, error };
  }
};

// Pobieranie recenzji dla danej produkcji
export const getFirebaseReviewsForFilm = async (movieId: string) => {
  try {
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
    return [];
  }
};

// Usuwanie recenzji
export const deleteFirebaseReview = async (reviewId: string) => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const reviewData = reviewSnap.data();
      const movieId = reviewData.movieId;

      await deleteDoc(reviewRef);

      await updateMovieAverageRating(movieId);
    } else {
      await deleteDoc(reviewRef);
    }

    return { success: true };
  } catch (error) {
    console.error("Błąd usuwania recenzji w Firestore:", error);
    return { success: false, error };
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
  } catch (error) {
    console.error("Błąd edycji recenzji w Firestore:", error);
    return { success: false, error };
  }
};

// Aktualizowanie średniej ocen dla danej produkcji
export const updateMovieAverageRating = async (movieId: string) => {
  try {
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

    console.log(
      `Zaktualizowano średnią ocen dla ${movieId} na: ${newAverage} (Liczba opinii: ${reviewsCount})`,
    );
  } catch (error) {
    console.error("Błąd podczas aktualizacji średniej ocen filmu:", error);
  }
};

// polubienia pod recenzjami
export const toggleFirebaseReviewLike = async (
  reviewId: string,
  userId: string,
) => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const data = reviewSnap.data();
      const likes = data.likes || [];
      const hasLiked = likes.includes(userId);

      if (hasLiked) {
        await updateDoc(reviewRef, {
          likes: arrayRemove(userId),
        });
      } else {
        await updateDoc(reviewRef, {
          likes: arrayUnion(userId),
        });
      }
      return { success: true };
    }
    return { success: false, error: "Nie znaleziono recenzji" };
  } catch (error) {
    console.error("Błąd podczas przełączania polubienia:", error);
    return { success: false, error };
  }
};

// Listy użytkownika
export const toggleUserList = async (
  userId: string,
  listName: "watchlist" | "favourites",
  mediaId: string,
) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const list = data[listName] || [];
      const isInList = list.includes(mediaId);

      if (isInList) {
        await updateDoc(userRef, {
          [listName]: arrayRemove(mediaId),
        });
        return { success: true, added: false };
      } else {
        await updateDoc(userRef, {
          [listName]: arrayUnion(mediaId),
        });
        return { success: true, added: true };
      }
    }
    return { success: false, error: "Użytkownik nie istnieje" };
  } catch (error) {
    console.error(`Błąd przełączania elementu na liście ${listName}:`, error);
    return { success: false, error };
  }
};

// Pobieranie list użytkownika
export const getUserList = async (
  userId: string,
  listName: "watchlist" | "favourites",
) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return { movies: [], tv: [] };

    const listIds = userDoc.data()[listName] || [];
    if (listIds.length === 0) return { movies: [], tv: [] };

    // Pobieramy pełne dane dla każdego ID filmu/serialu zapisanego w liście
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
    return { movies: [], tv: [] };
  }
};

// Pobieranie recenzji użytkownika
export const getUserReviews = async (userId: string) => {
  try {
    const q = query(collection(db, "reviews"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const reviews: any[] = [];

    for (const document of querySnapshot.docs) {
      const data = document.data();
      const movieRef = doc(db, "movies", data.movieId);
      const movieSnap = await getDoc(movieRef);

      reviews.push({
        id: document.id,
        ...data,
        movieData: movieSnap.exists() ? movieSnap.data() : null,
      });
    }

    return reviews.sort(
      (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
    );
  } catch (error) {
    console.error("Błąd pobierania recenzji użytkownika:", error);
    return [];
  }
};
