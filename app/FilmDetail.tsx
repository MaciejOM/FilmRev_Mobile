import { AppColors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";

import { auth, db } from "@/hooks/firebaseConfig";
import {
  deleteFirebaseReview,
  getFirebaseReviewsForFilm,
  toggleFirebaseReviewLike,
  toggleUserList,
} from "@/hooks/firebaseDatabase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import FilmInfoSection from "@/components/details/FilmInfoSection";
import FilmReviewsSection from "@/components/details/FilmReviewsSection";

export default function FilmDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const { id, title, release_date, overview, backdrop, gatunki, type } = params;
  const tmdbId = Number(id);
  const movieType = (type as string) || "movie";
  const documentId = `${movieType}_${tmdbId}`;

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavourites, setIsInFavourites] = useState(false);
  const [isInWatched, setIsInWatched] = useState(false);
  const [isListModalVisible, setIsListModalVisible] = useState(false);
  const [myCustomLists, setMyCustomLists] = useState<any[]>([]);

  const [dbMovieData, setDbMovieData] = useState<any>(null);

  // Informacje o dodaniu/edycji/usunięciu/polubieniu recenzji oraz zmianie danych konta
  // zostaną natychmiastowo zmienione w momencie dokonania zmiany.
  useEffect(() => {
    // Dodanie recenzji
    const addSubscription = DeviceEventEmitter.addListener(
      "newReviewAdded",
      (newReview) => {
        setReviews((prev) => [newReview, ...prev]);
      },
    );

    // Edycja recenzji
    const editSubscription = DeviceEventEmitter.addListener(
      "reviewEdited",
      (updatedData) => {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === updatedData.reviewId
              ? {
                  ...r,
                  ocena: updatedData.rating,
                  tresc: updatedData.comment,
                  tags: updatedData.selectedTags,
                  isEdited: true,
                }
              : r,
          ),
        );
      },
    );

    // Polubienie recenzji
    const likeSubscription = DeviceEventEmitter.addListener(
      "reviewLikeToggled",
      (data) => {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === data.reviewId ? { ...r, likes: data.newLikes } : r,
          ),
        );
      },
    );

    // Usunięcie recenzji
    const deleteSubscription = DeviceEventEmitter.addListener(
      "reviewDeleted",
      (data) => {
        setReviews((prev) => prev.filter((r) => r.id !== data.reviewId));
      },
    );

    // Zmiana zdjęcia profilowego
    const avatarSubscription = DeviceEventEmitter.addListener(
      "avatarChanged",
      (data) => {
        setReviews((prev) =>
          prev.map((r) =>
            r.userId === data.userId ? { ...r, avatar: data.newAvatar } : r,
          ),
        );
      },
    );

    return () => {
      addSubscription.remove();
      editSubscription.remove();
      likeSubscription.remove();
      deleteSubscription.remove();
      avatarSubscription.remove();
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!tmdbId || isNaN(tmdbId)) {
      setIsDataLoading(false);
      return;
    }

    const userAuth = auth.currentUser;
    try {
      setIsDataLoading(true);
      setError(null);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("Brak połączenia z siecią. Sprawdź internet.");
      }

      if (userAuth) setCurrentUser(userAuth.uid);
      else setCurrentUser(null);

      const reviewsPromise = getFirebaseReviewsForFilm(documentId);
      const movieDocPromise = getDoc(doc(db, "movies", documentId));

      let userDocPromise: Promise<any> = Promise.resolve(null);
      let customListsPromise: Promise<any> = Promise.resolve(null);

      if (userAuth) {
        userDocPromise = getDoc(doc(db, "users", userAuth.uid));
        const qLists = query(
          collection(db, "custom_lists"),
          where("userId", "==", userAuth.uid),
        );
        customListsPromise = getDocs(qLists);
      }

      const [fetchedReviews, movieSnap, userDocSnap, snapLists] =
        await Promise.all([
          reviewsPromise,
          movieDocPromise,
          userDocPromise,
          customListsPromise,
        ]);

      if (movieSnap?.exists()) {
        setDbMovieData(movieSnap.data());
      }

      if (userAuth && userDocSnap?.exists()) {
        const userData = userDocSnap.data();
        setIsInWatchlist(userData.watchlist?.includes(documentId) || false);
        setIsInFavourites(userData.favourites?.includes(documentId) || false);
        setIsInWatched(userData.watched?.includes(documentId) || false);
      }

      if (userAuth && snapLists) {
        setMyCustomLists(
          snapLists.docs.map((d: any) => ({ id: d.id, ...d.data() })),
        );
      }

      setReviews(fetchedReviews || []);
    } catch (err: any) {
      console.error("Błąd tła: ", err);
      setError(err.message || "Wystąpił problem z pobraniem recenzji i list.");
    } finally {
      setIsDataLoading(false);
    }
  }, [tmdbId, documentId]);

  useEffect(() => {
    loadData();
  }, [tmdbId, movieType, loadData]);

  // Dodawanie recenzji
  const handleAddReviewPress = () => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/Review",
      params: {
        id: tmdbId,
        type: movieType,
        title: resolvedTitle,
        release_date: resolvedReleaseDate,
        backdrop: dbMovieData?.plakat || resolvedBackdrop,
        gatunki: resolvedGenres,
      },
    });
  };

  // Usuwanie recenzji
  const handleDeleteReview = (reviewId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Usuń recenzję", "Czy na pewno chcesz usunąć swoją recenzję?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          const previousReviews = [...reviews];
          setReviews((prev) => prev.filter((r) => r.id !== reviewId));

          // Natychmiastowy sygnał Deltą, zamiast refreshProfile
          DeviceEventEmitter.emit("reviewDeleted", { reviewId });

          try {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) throw new Error("Brak połączenia");
            await deleteFirebaseReview(reviewId);
          } catch {
            setReviews(previousReviews);
            DeviceEventEmitter.emit("refreshProfile"); // Fallback przy błędzie
            Alert.alert(
              "Błąd",
              "Brak połączenia. Nie udało się usunąć recenzji.",
            );
          }
        },
      },
    ]);
  };

  // Dodanie do niestandardowej listy
  const toggleCustomListMembership = async (
    listId: string,
    currentItems: string[],
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const listRef = doc(db, "custom_lists", listId);
    const exists = currentItems.includes(documentId);

    const previousLists = [...myCustomLists];
    setMyCustomLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: exists
                ? l.items.filter((i: string) => i !== documentId)
                : [...l.items, documentId],
            }
          : l,
      ),
    );

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) throw new Error("Brak połączenia");
      if (exists) await updateDoc(listRef, { items: arrayRemove(documentId) });
      else await updateDoc(listRef, { items: arrayUnion(documentId) });

      DeviceEventEmitter.emit("refreshProfile");
    } catch {
      setMyCustomLists(previousLists);
      Alert.alert(
        "Błąd",
        "Nie udało się zaktualizować listy niestandardowej. Sprawdź połączenie z siecią.",
      );
    }
  };

  // Polubienie recenzji: przy polubieniu najpierw UI jest aktualizowane,
  // a tle informacja jest wysyłana do bazy, co zapewnia natychmiastową reakcję na interakcje użytkownika.
  // W przypadku braku sieci, polubienie jest cofane (Przywraca poprzedni stan).
  const handleToggleFavourite = async () => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previousState = isInFavourites;
    const newState = !previousState;

    setIsInFavourites(newState);

    const correctPosterPath = dbMovieData?.plakat || resolvedBackdrop;

    const mediaPayload = {
      id: documentId,
      tmdb_id: tmdbId,
      nazwa: resolvedTitle,
      rok: resolvedReleaseDate,
      overview: resolvedOverview,
      backdrop: resolvedBackdrop,
      plakat: correctPosterPath,
      gatunki: resolvedGenres,
      typ: movieType,
      type: movieType,
    };

    DeviceEventEmitter.emit("favouriteToggled", {
      mediaId: documentId,
      isAdded: newState,
      mediaData: mediaPayload,
    });

    try {
      const result = await toggleUserList(
        currentUser,
        "favourites",
        documentId,
      );
      if (result && result.error) throw new Error();
    } catch {
      setIsInFavourites(previousState);
      DeviceEventEmitter.emit("favouriteToggled", {
        mediaId: documentId,
        isAdded: previousState,
        mediaData: mediaPayload,
      });
      Alert.alert("Błąd", "Nie udało się dodać do ulubionych. Sprawdź sieć.");
    }
  };

  // Polubienie recenzji
  const handleLikePress = async (
    reviewId: string,
    currentLikes: string[] = [],
  ) => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasLiked = currentLikes.includes(currentUser);
    const previousReviews = [...reviews];

    const newLikes = hasLiked
      ? currentLikes.filter((id) => id !== currentUser)
      : [...currentLikes, currentUser];

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, likes: newLikes } : r)),
    );

    DeviceEventEmitter.emit("reviewLikeToggled", { reviewId, newLikes });

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) throw new Error();
      await toggleFirebaseReviewLike(reviewId, currentUser);
    } catch {
      setReviews(previousReviews);
      DeviceEventEmitter.emit("reviewLikeToggled", {
        reviewId,
        newLikes: currentLikes,
      });
      Alert.alert("Błąd", "Nie udało się polubić recenzji.");
    }
  };

  // Liczba recenzji
  const totalReviews = reviews.length;
  // Średnia ocena
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.ocena, 0) / totalReviews).toFixed(1)
      : 0;

  // Dane tymczasowe (Wyświetlane podczas ładowania danych)
  const resolvedTitle = (title as string) || "Brak tytułu";
  const resolvedBackdrop = (backdrop as string) || "";
  const resolvedReleaseDate = (release_date as string) || "---";
  const resolvedOverview = (overview as string) || "Brak opisu.";
  const resolvedGenres = (gatunki as string) || "";

  return (
    <View style={styles.container}>
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={isDataLoading ? [] : reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <FilmInfoSection
              title={resolvedTitle}
              backdrop={resolvedBackdrop}
              releaseDate={resolvedReleaseDate}
              overview={resolvedOverview}
              genres={resolvedGenres}
              currentUser={currentUser}
              isInFavourites={isInFavourites}
              isDataLoading={isDataLoading}
              onToggleFavourite={handleToggleFavourite}
              onOpenListModal={() => setIsListModalVisible(true)}
            />
            {isDataLoading && (
              <ActivityIndicator
                size="large"
                color={AppColors.primary}
                style={{ marginTop: 20 }}
              />
            )}
            {!isDataLoading && !error && (
              <FilmReviewsSection
                currentUser={currentUser}
                totalReviews={totalReviews}
                averageRating={averageRating}
                onAddReviewPress={handleAddReviewPress}
              />
            )}
          </>
        }
        ListEmptyComponent={
          !isDataLoading ? (
            <View
              style={{
                paddingHorizontal: 20,
                alignItems: "center",
                marginTop: 20,
              }}
            >
              {error ? (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={loadData}
                  >
                    <Text style={styles.retryText}>Spróbuj ponownie</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noReviewsText}>
                  Brak recenzji. Bądź pierwszą osobą, która oceni ten tytuł!
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item: rev }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {rev.avatar ? (
                  <Image
                    source={{ uri: rev.avatar }}
                    style={styles.reviewAvatar}
                    transition={200}
                  />
                ) : (
                  <View style={styles.reviewAvatarPlaceholder}>
                    <Text style={{ color: "white" }}>
                      {rev.nazwa_uzytkownika?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() =>
                    currentUser && currentUser === rev.userId
                      ? router.push("/Profile")
                      : router.push({
                          pathname: "/OtherProfile",
                          params: { userId: rev.userId },
                        })
                  }
                  style={{ flex: 1, marginRight: 10 }}
                >
                  <Text style={styles.reviewAuthor} numberOfLines={1}>
                    {rev.nazwa_uzytkownika}
                  </Text>
                </TouchableOpacity>
                {rev.isEdited && (
                  <Text
                    style={{
                      color: AppColors.textGray,
                      fontSize: 12,
                      marginRight: 10,
                      fontStyle: "italic",
                    }}
                  >
                    edytowano
                  </Text>
                )}
                <View style={styles.reviewScoreContainer}>
                  <Text style={styles.reviewScoreText}>{rev.ocena}/5 </Text>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text
                        key={star}
                        style={
                          star <= rev.ocena
                            ? styles.starSelectedSmall
                            : styles.starUnselectedSmall
                        }
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                </View>
              </View>

              {rev.tags && rev.tags.length > 0 && (
                <View style={styles.reviewTagsContainer}>
                  {rev.tags.map((tag: string) => (
                    <View key={tag} style={styles.reviewTagBadge}>
                      <Text style={styles.reviewTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.reviewComment}>{rev.tresc}</Text>
              <View style={styles.reviewFooter}>
                <View style={styles.reviewActionsLeft}>
                  {currentUser && currentUser === rev.userId && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.deleteButton,
                          {
                            marginTop: 0,
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: "/EditReview",
                            params: {
                              reviewId: rev.id,
                              movieId: documentId,
                              initialRating: rev.ocena,
                              initialComment: rev.tresc,
                              initialTags: JSON.stringify(rev.tags || []),
                            },
                          })
                        }
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={24}
                          color="white"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteButton, { marginTop: 0 }]}
                        onPress={() => handleDeleteReview(rev.id)}
                      >
                        <MaterialCommunityIcons
                          name="trash-can"
                          size={24}
                          color={AppColors.buttonDanger}
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {currentUser && (
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => handleLikePress(rev.id, rev.likes || [])}
                  >
                    <MaterialCommunityIcons
                      name={
                        rev.likes?.includes(currentUser)
                          ? "cards-heart"
                          : "cards-heart-outline"
                      }
                      size={24}
                      color={
                        rev.likes?.includes(currentUser)
                          ? AppColors.primary
                          : AppColors.textGray
                      }
                    />
                    <Text style={styles.likeCountText}>
                      {rev.likes ? rev.likes.length : 0}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      />

      <Modal
        visible={isListModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsListModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Zapisz do kolekcji...</Text>
              <TouchableOpacity onPress={() => setIsListModalVisible(false)}>
                <MaterialIcons name="close" size={26} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <TouchableOpacity
                style={styles.listItemRow}
                onPress={() => {
                  const newState = !isInWatchlist;
                  setIsInWatchlist(newState);
                  DeviceEventEmitter.emit("watchlistToggled", {
                    mediaId: documentId,
                    isAdded: newState,
                    mediaData: { ...dbMovieData, id: documentId },
                  });
                  toggleUserList(currentUser!, "watchlist", documentId).catch(
                    () => {
                      setIsInWatchlist(!newState);
                      DeviceEventEmitter.emit("watchlistToggled", {
                        mediaId: documentId,
                        isAdded: !newState,
                        mediaData: { ...dbMovieData, id: documentId },
                      });
                      Alert.alert("Błąd", "Brak połączenia.");
                    },
                  );
                }}
              >
                <MaterialIcons
                  name={isInWatchlist ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={isInWatchlist ? AppColors.primary : "#999"}
                />
                <Text style={styles.listItemText}>Do obejrzenia</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.listItemRow}
                onPress={() => {
                  const newState = !isInWatched;
                  setIsInWatched(newState);
                  DeviceEventEmitter.emit("watchedToggled", {
                    mediaId: documentId,
                    isAdded: newState,
                    mediaData: { ...dbMovieData, id: documentId },
                  });
                  toggleUserList(
                    currentUser!,
                    "watched" as any,
                    documentId,
                  ).catch(() => {
                    setIsInWatched(!newState);
                    DeviceEventEmitter.emit("watchedToggled", {
                      mediaId: documentId,
                      isAdded: !newState,
                      mediaData: { ...dbMovieData, id: documentId },
                    });
                    Alert.alert("Błąd", "Brak połączenia.");
                  });
                }}
              >
                <MaterialIcons
                  name={isInWatched ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={isInWatched ? AppColors.primary : "#999"}
                />
                <Text style={styles.listItemText}>Obejrzane</Text>
              </TouchableOpacity>

              <View
                style={{
                  height: 1,
                  backgroundColor: "#444",
                  marginVertical: 5,
                }}
              />
              {myCustomLists.length === 0 ? (
                <Text style={styles.noCustomListsText}>
                  Brak utworzonych list niestandardowych.
                </Text>
              ) : (
                myCustomLists.map((list) => {
                  const isChecked = list.items?.includes(documentId) || false;
                  return (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.listItemRow}
                      onPress={() =>
                        toggleCustomListMembership(list.id, list.items || [])
                      }
                    >
                      <MaterialIcons
                        name={
                          isChecked ? "check-box" : "check-box-outline-blank"
                        }
                        size={24}
                        color={isChecked ? AppColors.primary : "#999"}
                      />
                      <Text style={styles.listItemText}>{list.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  floatingHeader: { position: "absolute", top: 50, left: 20, zIndex: 10 },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "bold" },
  noReviewsText: {
    color: AppColors.textGray,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  reviewCard: {
    backgroundColor: "#3a3c4f",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  reviewAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  reviewAuthor: { color: "white", fontWeight: "bold", fontSize: 16, flex: 1 },
  reviewScoreContainer: { flexDirection: "row", alignItems: "center" },
  reviewScoreText: { color: "#FFD700", fontWeight: "bold", marginRight: 5 },
  starSelectedSmall: { color: "#FFD700", fontSize: 16 },
  starUnselectedSmall: { color: "#555", fontSize: 16 },
  reviewComment: { color: "#ddd", lineHeight: 20 },
  deleteButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 5,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingTop: 10,
  },
  reviewActionsLeft: { flexDirection: "row", gap: 10 },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 5,
  },
  likeCountText: { color: "white", fontSize: 14, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#3a3c4f",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    minHeight: 250,
    borderTopWidth: 1,
    borderColor: "#555",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  listItemText: { color: "white", fontSize: 16, fontWeight: "500" },
  noCustomListsText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  reviewTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 6,
  },
  reviewTagBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  reviewTagText: {
    color: "#ccc",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
