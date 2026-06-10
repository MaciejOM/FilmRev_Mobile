import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "@/hooks/firebaseConfig";
import { addFirebaseReview } from "@/hooks/firebaseDatabase";
import { doc, getDoc } from "firebase/firestore";

const AVAILABLE_TAGS = ["Bez spoilerów", "Pierwsze wrażenia"];

export default function ReviewEditor() {
  const router = useRouter();
  
  // Pobieramy dodatkowe parametry przesłane z FilmDetail
  const { id, type, title, release_date, backdrop, gatunki } = useLocalSearchParams();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const netState = await NetInfo.fetch();
        if (auth.currentUser && netState.isConnected) {
          const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (snap.exists() && isMounted) setUserData(snap.data());
        }
      } catch (err) {
        console.warn("Nie udało się pobrać danych użytkownika w tle");
      }
    };
    fetchUser();
    
    return () => { isMounted = false; };
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSubmit = async () => {
    const userAuth = auth.currentUser;
    if (!userAuth) return Alert.alert("Błąd", "Musisz być zalogowany.");
    if (rating === 0) return Alert.alert("Błąd", "Zaznacz ocenę!");
    if (comment.trim() === "") return Alert.alert("Błąd", "Pusta treść!");

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert("Brak sieci", "Wymagane połączenie z internetem, aby dodać recenzję.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);

    try {
      const documentId = `${type || "movie"}_${id}`;

      const result = await addFirebaseReview(
        documentId,
        userAuth.uid,
        userData?.nazwa_uzytkownika || "Użytkownik",
        userData?.avatar || null,
        rating,
        comment,
        selectedTags,
      );

      if (result && result.success) {
        // OPTYMALIZACJA: Pakujemy tu od razu pełne dane filmu!
        const optimisticReview = {
          id: result.id, 
          movieId: documentId,
          userId: userAuth.uid,
          nazwa_uzytkownika: userData?.nazwa_uzytkownika || "Użytkownik",
          avatar: userData?.avatar || null,
          ocena: rating,
          tresc: comment,
          tags: selectedTags,
          likes: [],
          isEdited: false,
          movieData: {
            tmdb_id: id,
            typ: type || "movie",
            nazwa: title || "Nieznany tytuł",
            rok: release_date || "---",
            backdrop: backdrop || "",
            gatunki: gatunki ? gatunki.toString().split(", ") : []
          }
        };

        DeviceEventEmitter.emit("newReviewAdded", optimisticReview);
        // Całkowicie wywalamy "refreshProfile" – opieramy się na fragmencie
        router.back();
      } else {
        throw new Error(result?.error || "Nieznany błąd");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Błąd", "Nie udało się zapisać recenzji. Sprawdź połączenie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (rating > 0 || comment.trim() !== "" || selectedTags.length > 0) {
      Alert.alert(
        "Odrzuć zmiany",
        "Masz niezapisane zmiany. Czy na pewno chcesz wyjść bez zapisywania?",
        [
          { text: "Zostań", style: "cancel" },
          { text: "Wyjdź", style: "destructive", onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [rating, comment, selectedTags, router]);

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Text style={styles.closeButtonText}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            globalStyles.headerText,
            { marginLeft: 70, marginTop: 55, fontSize: 20 },
          ]}
        >
          Dodaj recenzję
        </Text>

        <TouchableOpacity
          style={[styles.AcceptButton, isSubmitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.AcceptButtonText}>
              <MaterialIcons name="check" size={32} color="white" />
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editorContainer}>
        <Text style={styles.label}>Twoja ocena:</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text
                style={[
                  styles.star,
                  star <= rating ? styles.starSelected : styles.starUnselected,
                ]}
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tagi (opcjonalnie):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
        >
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[styles.tagText, isSelected && styles.tagTextSelected]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Napisz co myślisz:</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            style={[styles.reviewInput, { marginBottom: 20 }]}
            placeholder="Jakie są twoje przemyślenia po seansie?"
            placeholderTextColor={AppColors.textGray}
            multiline
            value={comment}
            onChangeText={setComment}
            maxLength={1028}
          />

          {1028 - comment.length <= 100 && (
            <Text
              style={{
                color:
                  1028 - comment.length <= 10
                    ? AppColors.buttonDanger
                    : AppColors.textGray,
                fontSize: 12,
                position: "absolute",
                bottom: 30,
                right: 15,
                fontWeight: "bold",
              }}
            >
              {1028 - comment.length}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: { position: "absolute", top: 50, left: 20, backgroundColor: "rgba(0,0,0,0.5)", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", zIndex: 10 },
  closeButtonText: { color: "white", fontSize: 30, fontWeight: "bold" },
  AcceptButton: { position: "absolute", top: 50, right: 20, backgroundColor: "rgba(0,0,0,0.5)", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", zIndex: 10 },
  AcceptButtonText: { color: "white", fontSize: 20, fontWeight: "bold" },
  editorContainer: { padding: 20, flex: 1 },
  label: { color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 10, marginTop: 10 },
  starsContainer: { flexDirection: "row", marginBottom: 20 },
  star: { fontSize: 45, marginRight: 10 },
  starSelected: { color: "#FFD700" },
  starUnselected: { color: "#555" },
  tagsScroll: { marginBottom: 20, maxHeight: 40 },
  tagChip: { backgroundColor: "#3a3c4f", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: "#555", justifyContent: "center" },
  tagChipSelected: { backgroundColor: "rgba(228, 48, 87, 0.2)", borderColor: AppColors.primary },
  tagText: { color: "#ccc", fontSize: 14 },
  tagTextSelected: { color: AppColors.primary, fontWeight: "bold" },
  reviewInput: { backgroundColor: "#3a3c4f", borderRadius: 10, padding: 15, height: 200, textAlignVertical: "top", color: "white", fontSize: 16, borderWidth: 1, borderColor: "#555" },
});