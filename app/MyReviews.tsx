// Importy
import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "@/hooks/firebaseConfig";
import {
  deleteFirebaseReview,
  getUserReviews,
  toggleFirebaseReviewLike,
} from "@/hooks/firebaseDatabase";

export default function MyReviews() {
  // useState'y
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pobieranie pełnej historii wszystkich napisanych recenzji przez zalogowanego użytkownika
  const fetchReviews = async () => {
    const user = auth.currentUser;
    if (user) {
      const data = await getUserReviews(user.uid);
      setReviews(data);
    }
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, []),
  );

  // Usuwanie własnej recenzji z bazy z jednoczesnym wysłaniem sygnału
  const handleDeleteReview = (reviewId: string) => {
    Alert.alert("Usuń recenzję", "Czy na pewno chcesz usunąć swoją recenzję?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: () => {
          setReviews((prevReviews) =>
            prevReviews.filter((rev) => rev.id !== reviewId),
          );
          deleteFirebaseReview(reviewId)
            .then(() => DeviceEventEmitter.emit("refreshProfile"))
            .catch((error) => console.error("Błąd podczas usuwania:", error));
        },
      },
    ]);
  };

  // Mechanizm polubień: stan polubienia zmienia się przed wysłaniem go do bazy
  const handleLikePress = async (
    reviewId: string,
    currentLikes: string[] = [],
  ) => {
    const currentUser = auth.currentUser?.uid;
    if (!currentUser) return;

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
    // Wysyłanie informacji do Firebase
    await toggleFirebaseReviewLike(reviewId, currentUser);
  };

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>Recenzje</Text>
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.scrollContent}
          renderItem={() => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Skeleton width={150} height={20} style={{ flex: 1 }} />
                <Skeleton width={80} height={20} />
              </View>
              <Skeleton width="100%" height={12} style={{ marginTop: 10 }} />
              <Skeleton width="90%" height={12} style={{ marginTop: 8 }} />
              <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
              <View
                style={[styles.reviewFooter, { marginTop: 20, paddingTop: 15 }]}
              >
                <Skeleton width={120} height={25} />
                <Skeleton width={40} height={25} />
              </View>
            </View>
          )}
        />
      ) : reviews.length === 0 ? (
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.emptyText}>
            Nie napisałeś jeszcze żadnej recenzji.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item: rev }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (rev.movieData) {
                      router.push({
                        pathname: "/FilmDetail",
                        params: {
                          id: rev.movieData.tmdb_id,
                          title: rev.movieData.nazwa,
                          release_date: rev.movieData.rok,
                          overview: rev.movieData.overview,
                          backdrop: rev.movieData.backdrop,
                          gatunki: rev.movieData.gatunki
                            ? rev.movieData.gatunki.join(", ")
                            : "",
                          type: rev.movieData.typ,
                        },
                      });
                    }
                  }}
                >
                  <Text style={styles.reviewTargetTitle}>
                    Dla: {rev.movieData?.nazwa || "Nieznany tytuł"}
                  </Text>
                </TouchableOpacity>

                {rev.isEdited && (
                  <Text style={styles.editedText}>(edytowano)</Text>
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
                          movieId: rev.movieId,
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
                      color="white"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLikePress(rev.id, rev.likes || [])}
                >
                  <MaterialCommunityIcons
                    name={
                      rev.likes?.includes(auth.currentUser?.uid as string)
                        ? "cards-heart"
                        : "cards-heart-outline"
                    }
                    size={24}
                    color={
                      rev.likes?.includes(auth.currentUser?.uid as string)
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
          )}
        />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40 },
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
  reviewTargetTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  editedText: {
    color: AppColors.textGray,
    fontSize: 10,
    marginRight: 10,
    fontStyle: "italic",
  },
  reviewScoreContainer: { flexDirection: "row", alignItems: "center" },
  reviewScoreText: { color: "#FFD700", fontWeight: "bold", marginRight: 5 },
  starSelectedSmall: { color: "#FFD700", fontSize: 16 },
  starUnselectedSmall: { color: "#555", fontSize: 16 },
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
  reviewComment: { color: "#ddd", lineHeight: 20 },
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
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(228, 48, 87, 0.52)",
    borderRadius: 5,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 5,
  },
  likeCountText: { color: "white", fontSize: 14, fontWeight: "bold" },
});
