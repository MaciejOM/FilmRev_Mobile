import { AppColors } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FilmReviewsSectionProps {
  currentUser: string | null;
  totalReviews: number;
  averageRating: string | number;
  onAddReviewPress: () => void;
}

const FilmReviewsSection = ({
  currentUser,
  totalReviews,
  averageRating,
  onAddReviewPress,
}: FilmReviewsSectionProps) => {
  return (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeaderContainer}>
        {currentUser && (
          <TouchableOpacity style={styles.addButton} onPress={onAddReviewPress}>
            <Text style={styles.addButtonText}>
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.reviewSectionTitle, !currentUser && { left: 0 }]}>Recenzje</Text>
        {totalReviews > 0 && (
          <View style={styles.averageRatingContainer}>
            <Text style={styles.averageRatingText}>{averageRating}</Text>
            <Text style={styles.averageRatingStar}>★</Text>
            <Text style={styles.totalReviewsText}>({totalReviews})</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default memo(FilmReviewsSection);

const styles = StyleSheet.create({
  reviewsSection: { paddingHorizontal: 20, marginTop: 10 },
  reviewsHeaderContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  addButton: { position: "absolute", backgroundColor: "rgba(0,0,0,0.5)", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", zIndex: 10 },
  addButtonText: { color: "white", fontSize: 30, fontWeight: "bold" },
  reviewSectionTitle: { left: 50, fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 10 },
  averageRatingContainer: { flexDirection: "row", alignItems: "center" },
  averageRatingText: { fontSize: 24, fontWeight: "bold", color: "white" },
  averageRatingStar: { fontSize: 22, color: "#FFD700", marginLeft: 4, marginRight: 8 },
  totalReviewsText: { fontSize: 14, color: AppColors.textGray },
});