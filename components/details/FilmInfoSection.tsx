import { AppColors } from "@/constants/theme";
import { useResponsive } from "@/hooks/useResponsive";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { ActivityIndicator, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FilmInfoSectionProps {
  title: string;
  backdrop: string;
  releaseDate: string;
  overview: string;
  genres: string;
  currentUser: string | null;
  isInFavourites: boolean;
  isDataLoading: boolean; // <-- NOWA FLAGA BUFOROWANIA
  onToggleFavourite: () => void;
  onOpenListModal: () => void;
}

const FilmInfoSection = ({
  title,
  backdrop,
  releaseDate,
  overview,
  genres,
  currentUser,
  isInFavourites,
  isDataLoading,
  onToggleFavourite,
  onOpenListModal,
}: FilmInfoSectionProps) => {
  const { backdropHeight } = useResponsive();
  return (
    <View>
      <ImageBackground
        source={{ uri: backdrop ? "https://image.tmdb.org/t/p/w780/" + backdrop : undefined }}
        style={[styles.backdrop, { height: backdropHeight }]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["transparent", "rgba(37, 39, 54, 0.5)", AppColors.background]}
          style={styles.gradient}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.titleText}>{title || "Ładowanie..."}</Text>
          <Text style={styles.dateText}>Premiera: {releaseDate || "---"}</Text>
          {genres ? <Text style={styles.genreText}>{genres}</Text> : null}
        </View>
      </ImageBackground>

      {/* Paski akcji widoczne wyłącznie dla zalogowanych użytkowników */}
      {currentUser && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, isDataLoading && { opacity: 0.7 }]} 
            onPress={onOpenListModal}
            disabled={isDataLoading} // Blokada kliknięcia w trakcie ładowania
          >
            {isDataLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialCommunityIcons name="folder-plus" size={22} color="white" />
            )}
            <Text style={styles.actionButtonText}>
              {isDataLoading ? "Ładowanie..." : "Zapisz do listy"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              isInFavourites && !isDataLoading && styles.actionButtonActive,
              isDataLoading && { opacity: 0.7 }
            ]} 
            onPress={onToggleFavourite}
            disabled={isDataLoading} // Blokada kliknięcia w trakcie ładowania
          >
            {isDataLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialCommunityIcons 
                name={isInFavourites ? "cards-heart" : "cards-heart-outline"} 
                size={22} 
                color="white" 
              />
            )}
            <Text style={styles.actionButtonText}>
              {isDataLoading ? "Ładowanie..." : "Ulubione"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Opis fabuły</Text>
        <Text style={styles.overviewText}>{overview || "Pobieranie opisu fabuły..."}</Text>
      </View>
    </View>
  );
};

export default memo(FilmInfoSection);

const styles = StyleSheet.create({
  backdrop: { width: "100%", justifyContent: "flex-end" },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  headerTextContainer: { paddingHorizontal: 20, paddingBottom: 20, zIndex: 5 },
  titleText: { fontSize: 32, fontWeight: "bold", color: "white" },
  dateText: { fontSize: 16, color: "#ddd", marginTop: 5 },
  genreText: { fontSize: 14, color: "white", marginTop: 5, fontStyle: "italic" },
  detailsContainer: { padding: 20, marginTop: -10 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 10 },
  overviewText: { fontSize: 16, color: "#ccc", lineHeight: 24 },
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 15, marginTop: 10, marginBottom: 15 },
  actionButton: { flex: 1, flexDirection: "row", backgroundColor: "#3a3c4f", paddingVertical: 12, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 8 },
  actionButtonActive: { backgroundColor: AppColors.primary },
  actionButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
});