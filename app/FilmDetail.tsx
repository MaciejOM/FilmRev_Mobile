// Importy
import { AppColors, globalStyles } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { auth, db } from "@/hooks/firebaseConfig";
import {
  deleteFirebaseReview,
  getFirebaseReviewsForFilm,
  toggleFirebaseReviewLike,
  toggleUserList,
} from "@/hooks/firebaseDatabase";
import { doc, getDoc } from "firebase/firestore";

export default function FilmDetail() {
  // Parametry
  const params = useLocalSearchParams();
  const router = useRouter();

  const { id, title, release_date, overview, backdrop, gatunki, type } = params;
  const tmdbId = Number(id);

  // useState'y
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavourites, setIsInFavourites] = useState(false);

  // Nasłuchiwanie na sygnały z ekranów dodawania i edycji recenzji.
  // Zapewnia natychmiastową aktualizację listy po powrocie z edytora.
  useEffect(() => {
    const addSubscription = DeviceEventEmitter.addListener(
      "newReviewAdded",
      (newReview) => {
        setReviews((prevReviews) => [newReview, ...prevReviews]);
      },
    );

    const editSubscription = DeviceEventEmitter.addListener(
      "reviewEdited",
      (updatedData) => {
        setReviews((prevReviews) =>
          prevReviews.map((rev) => {
            if (rev.id === updatedData.reviewId) {
              return {
                ...rev,
                ocena: updatedData.rating,
                tresc: updatedData.comment,
                tags: updatedData.selectedTags,
                isEdited: true,
              };
            }
            return rev;
          }),
        );
      },
    );

    return () => {
      addSubscription.remove();
      editSubscription.remove();
    };
  }, []);

  // Główna funkcja ładująca dane z bazy. Pobiera recenzje oraz sprawdza listy użytkownika
  const loadData = useCallback(async () => {
    const userAuth = auth.currentUser;
    if (tmdbId) {
      const documentId = `${type || "movie"}_${tmdbId}`;
      const fetchedReviews = await getFirebaseReviewsForFilm(documentId);
      setReviews(fetchedReviews);

      if (userAuth) {
        setCurrentUser(userAuth.uid);
        const userDocSnap = await getDoc(doc(db, "users", userAuth.uid));

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsInWatchlist(userData.watchlist?.includes(documentId) || false);
          setIsInFavourites(userData.favourites?.includes(documentId) || false);
        }
      } else {
        setCurrentUser(null);
      }
    }
  }, [tmdbId, type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Przejście do dodawania nowej recenzji
  const handleAddReviewPress = () => {
    // Jeśli użytkownik nie jest zalogowany, wyświetli komunikat
    if (!currentUser) {
      Alert.alert(
        "Brak dostępu",
        "Musisz być zalogowany, aby dodać recenzję.",
        [
          { text: "Anuluj", style: "cancel" },
          { text: "Zaloguj się", onPress: () => router.push("/account") },
        ],
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/Review",
      params: { id: tmdbId, type: type || "movie" },
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
        onPress: () => {
          setReviews((prevReviews) =>
            prevReviews.filter((rev) => rev.id !== reviewId),
          );
          deleteFirebaseReview(reviewId).catch((error) => {
            Alert.alert(
              "Błąd",
              "Nie udało się usunąć recenzji. Sprawdź połączenie z internetem.",
            );
          });
        },
      },
    ]);
  };

  // Kalkulacja łącznej liczby recenzji
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce((sum, rev) => sum + rev.ocena, 0) / totalReviews
        ).toFixed(1)
      : 0;

  const getOpinionsLabel = (count: number) => {
    if (count === 1) return "opinia";
    if (
      count % 10 >= 2 &&
      count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20)
    )
      return "opinie";
    return "opinii";
  };

  // Mechanizm polubień: stan polubienia zmienia się przed wysłaniem go do bazy
  const handleLikePress = async (
    reviewId: string,
    currentLikes: string[] = [],
  ) => {
    if (!currentUser) {
      Alert.alert(
        "Zaloguj się",
        "Musisz być zalogowany, aby polubić recenzję.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasLiked = currentLikes.includes(currentUser);
    setReviews((prevReviews) =>
      prevReviews.map((rev) => {
        if (rev.id === reviewId) {
          const newLikes = hasLiked
            ? (rev.likes || []).filter((id: string) => id !== currentUser)
            : [...(rev.likes || []), currentUser];
          return { ...rev, likes: newLikes };
        }
        return rev;
      }),
    );
    await toggleFirebaseReviewLike(reviewId, currentUser);
  };

  // Przełączanie statusu "Do obejrzenia"
  const handleToggleWatchlist = () => {
    if (!currentUser)
      return Alert.alert(
        "Zaloguj się",
        "Musisz być zalogowany, aby zapisać ten tytuł na później.",
      );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const documentId = `${type || "movie"}_${tmdbId}`;
    const previousState = isInWatchlist;
    setIsInWatchlist(!previousState);

    toggleUserList(currentUser, "watchlist", documentId).catch(() =>
      setIsInWatchlist(previousState),
    );
  };

  // Przełączanie statusu "Ulubione"
  const handleToggleFavourite = () => {
    if (!currentUser)
      return Alert.alert(
        "Zaloguj się",
        "Musisz być zalogowany, aby dodać tytuł do ulubionych.",
      );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const documentId = `${type || "movie"}_${tmdbId}`;
    const previousState = isInFavourites;
    setIsInFavourites(!previousState);

    toggleUserList(currentUser, "favourites", documentId).catch(() =>
      setIsInFavourites(previousState),
    );
  };

  //Renderowanie głównej sekcji szczegółów (Tło, tytuł, opis, gatunki, premiera, nagłówek recenzji)
  const renderHeader = () => (
    <>
      <ImageBackground
        source={{ uri: "https://image.tmdb.org/t/p/w500/" + backdrop }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(37, 39, 54, 0.5)",
            AppColors.background,
          ]}
          style={styles.gradient}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.dateText}>Premiera: {release_date}</Text>
          {gatunki && <Text style={styles.genreText}>{gatunki}</Text>}
        </View>
      </ImageBackground>

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Opis fabuły</Text>
        <Text style={styles.overviewText}>{overview}</Text>
      </View>

      <View style={[styles.reviewsSection, { paddingBottom: 0 }]}>
        <View style={styles.reviewsHeaderContainer}>
          <TouchableOpacity
            style={styles.AddButton}
            onPress={handleAddReviewPress}
          >
            <Text style={styles.AddButtonText}>
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </Text>
          </TouchableOpacity>
          <Text style={styles.reviewSectionTitle}>Recenzje</Text>
          {totalReviews > 0 && (
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRatingText}>{averageRating}</Text>
              <Text style={styles.averageRatingStar}>★</Text>
              <Text style={styles.totalReviewsText}>
                ({totalReviews} {getOpinionsLabel(totalReviews)})
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.WatchButton,
            isInWatchlist && { backgroundColor: AppColors.primary },
          ]}
          onPress={handleToggleWatchlist}
        >
          <MaterialCommunityIcons
            name="eye"
            size={32}
            color={isInWatchlist ? "white" : "white"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.LikeButton,
            isInFavourites && { backgroundColor: AppColors.primary },
          ]}
          onPress={handleToggleFavourite}
        >
          <MaterialCommunityIcons
            name="cards-heart"
            size={32}
            color={isInFavourites ? "white" : "white"}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={styles.noReviewsText}>
              Brak recenzji. Bądź pierwszą osobą, która oceni ten tytuł!
            </Text>
          </View>
        }
        renderItem={({ item: rev }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {rev.avatar ? (
                  <Image
                    source={{ uri: rev.avatar }}
                    style={styles.reviewAvatar}
                  />
                ) : (
                  <View style={styles.reviewAvatarPlaceholder}>
                    <Text style={{ color: "white" }}>
                      {rev.nazwa_uzytkownika.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.reviewAuthor}>{rev.nazwa_uzytkownika}</Text>

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
                              movieId: `${type || "movie"}_${tmdbId}`,
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
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  backdrop: { width: "100%", height: 450, justifyContent: "flex-end" },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
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
  AddButton: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  AddButtonText: { color: "white", fontSize: 30, fontWeight: "bold" },
  LikeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  WatchButton: {
    position: "absolute",
    top: 50,
    right: 80,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerTextContainer: { paddingHorizontal: 20, paddingBottom: 20, zIndex: 5 },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  dateText: {
    fontSize: 16,
    color: "#ddd",
    marginTop: 5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  genreText: {
    fontSize: 14,
    color: "white",
    marginTop: 5,
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  detailsContainer: { padding: 20, marginTop: -10 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  reviewSectionTitle: {
    left: 50,
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  overviewText: { fontSize: 16, color: "#ccc", lineHeight: 24 },
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
  reviewsSection: { paddingHorizontal: 20, marginTop: 10 },
  reviewsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  averageRatingContainer: { flexDirection: "row", alignItems: "center" },
  averageRatingText: { fontSize: 24, fontWeight: "bold", color: "white" },
  averageRatingStar: {
    fontSize: 22,
    color: "#FFD700",
    marginLeft: 4,
    marginRight: 8,
  },
  totalReviewsText: { fontSize: 14, color: AppColors.textGray },
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
    marginTop: 15,
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
});
