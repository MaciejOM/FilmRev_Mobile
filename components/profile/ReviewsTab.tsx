import { AppColors } from "@/constants/theme";
import { auth } from "@/hooks/firebaseConfig";
import { toggleFirebaseReviewLike } from "@/hooks/firebaseDatabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ReviewsTabProps {
  data: any[];
  isReadOnly?: boolean;
  onDeleteReview?: (id: string) => void;
}

// Memoised card — only re-renders when its own review data changes
const ReviewCard = memo(
  ({
    rev,
    isReadOnly,
    onDelete,
    onLike,
  }: {
    rev: any;
    isReadOnly: boolean;
    onDelete?: (id: string) => void;
    onLike: (id: string, likes: string[]) => void;
  }) => {
    const currentUid = auth.currentUser?.uid;

    return (
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

          {rev.isEdited && <Text style={styles.editedText}>(edytowano)</Text>}

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
            {!isReadOnly && (
              <>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { backgroundColor: "rgba(255, 255, 255, 0.1)" },
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
                  style={styles.deleteButton}
                  onPress={() => onDelete && onDelete(rev.id)}
                >
                  <MaterialCommunityIcons
                    name="trash-can"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => onLike(rev.id, rev.likes || [])}
          >
            <MaterialCommunityIcons
              name={
                rev.likes?.includes(currentUid as string)
                  ? "cards-heart"
                  : "cards-heart-outline"
              }
              size={24}
              color={
                rev.likes?.includes(currentUid as string)
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
    );
  },
);

ReviewCard.displayName = "ReviewCard";

const ReviewsTab = ({
  data,
  isReadOnly = false,
  onDeleteReview,
}: ReviewsTabProps) => {
  const [reviewsList, setReviewsList] = useState<any[]>(data);

  useEffect(() => {
    setReviewsList(data);
  }, [data]);

  useEffect(() => {
    const likeSub = DeviceEventEmitter.addListener(
      "reviewLikeToggled",
      (eventData) => {
        setReviewsList((prev) =>
          prev.map((rev) =>
            rev.id === eventData.reviewId
              ? { ...rev, likes: eventData.newLikes }
              : rev,
          ),
        );
      },
    );
    return () => likeSub.remove();
  }, []);

  // Stable callback — uses functional setState so it doesn't depend on reviewsList
  const handleLikePress = useCallback(
    async (reviewId: string, currentLikes: string[] = []) => {
      const currentUser = auth.currentUser?.uid;
      if (!currentUser) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const hasLiked = currentLikes.includes(currentUser);
      const newLikes = hasLiked
        ? currentLikes.filter((id: string) => id !== currentUser)
        : [...currentLikes, currentUser];

      setReviewsList((prev) =>
        prev.map((rev) =>
          rev.id === reviewId ? { ...rev, likes: newLikes } : rev,
        ),
      );
      DeviceEventEmitter.emit("reviewLikeToggled", { reviewId, newLikes });

      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) throw new Error("Brak połączenia");
        await toggleFirebaseReviewLike(reviewId, currentUser);
      } catch {
        setReviewsList((prev) =>
          prev.map((rev) =>
            rev.id === reviewId ? { ...rev, likes: currentLikes } : rev,
          ),
        );
        DeviceEventEmitter.emit("reviewLikeToggled", {
          reviewId,
          newLikes: currentLikes,
        });
        Alert.alert(
          "Błąd",
          "Brak połączenia z siecią. Polubienie nie zostało zapisane.",
        );
      }
    },
    [],
  );

  return (
    <FlatList
      data={reviewsList}
      keyExtractor={(rev) => rev.id ?? `fallback-${rev.userId}-${rev.ocena}`}
      // Parent ScrollView handles scrolling; FlatList is used for its rendering optimisations
      scrollEnabled={false}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={3}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Brak napisanych recenzji.</Text>
        </View>
      }
      renderItem={({ item: rev }) => (
        <ReviewCard
          rev={rev}
          isReadOnly={isReadOnly}
          onDelete={onDeleteReview}
          onLike={handleLikePress}
        />
      )}
    />
  );
};

export default memo(ReviewsTab);

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: AppColors.textGray, fontSize: 15, fontStyle: "italic" },
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
