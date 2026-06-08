import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db, storage } from "@/hooks/firebaseConfig";
import { getUserList, getUserReviews } from "@/hooks/firebaseDatabase";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const DEFAULT_BIO = "Brak opisu";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [favouritesPreview, setFavouritesPreview] = useState<any[]>([]);
  const [watchlistPreview, setWatchlistPreview] = useState<any[]>([]);
  const [latestReview, setLatestReview] = useState<any>(null);
  const [reviewCount, setReviewCount] = useState(0);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState("");

  // Ciche pobieranie najświeższych danych z Firebase w tle po załadowaniu lokalnego widoku
  const fetchFreshData = async (userAuth: any) => {
    try {
      const userDocRef = doc(db, "users", userAuth.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        const favData = await getUserList(userAuth.uid, "favourites");
        const watchData = await getUserList(userAuth.uid, "watchlist");
        const reviewsData = await getUserReviews(userAuth.uid);

        const newFavPreview = [...favData.movies, ...favData.tv].slice(0, 5);
        const newWatchPreview = [...watchData.movies, ...watchData.tv].slice(
          0,
          5,
        );
        const newReviewCount = reviewsData.length;
        const newLatestReview = reviewsData.length > 0 ? reviewsData[0] : null;

        setUser(userData);
        setFavouritesPreview(newFavPreview);
        setWatchlistPreview(newWatchPreview);
        setReviewCount(newReviewCount);
        setLatestReview(newLatestReview);

        // Zapis najnowszych danych do AsyncStorage
        const cacheKey = `profile_data_${userAuth.uid}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            user: userData,
            favouritesPreview: newFavPreview,
            watchlistPreview: newWatchPreview,
            reviewCount: newReviewCount,
            latestReview: newLatestReview,
          }),
        );
      } else {
        // Zabezpieczenie przed tzw. "kontem-widmo" (konto usunięte, ale sesja pozostała na urządzeniu)
        console.warn("Wykryto konto-widmo. Wymuszanie wylogowania...");
        await AsyncStorage.removeItem(`profile_data_${userAuth.uid}`);
        await signOut(auth);
        setUser(null);
        router.replace("/account");
      }
    } catch (error) {
      console.error("Błąd tła (Profile):", error);
    }
  };

  // Ładowanie profilu w architekturze Stale-While-Revalidate (najpierw cache, potem świeże dane)
  const loadUserData = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const cacheKey = `profile_data_${currentUser.uid}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);

        // Natychmiastowe pokazanie UI na podstawie danych z pamięci telefonu
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setUser(parsed.user);
          setFavouritesPreview(parsed.favouritesPreview);
          setWatchlistPreview(parsed.watchlistPreview);
          setReviewCount(parsed.reviewCount);
          setLatestReview(parsed.latestReview);
          setIsLoading(false);
        }

        // Ciche odpytanie bazy o nowe dane
        await fetchFreshData(currentUser);
      } else {
        setUser(null);
        router.replace("/account");
      }
    } catch (error) {
      console.error("Błąd loadUserData:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData]),
  );

  // Nasłuchiwanie na sygnały (np. nowa recenzja) w celu odświeżenia UI bez ponownego wejścia na ekran
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "refreshProfile",
      () => {
        if (auth.currentUser) {
          fetchFreshData(auth.currentUser);
        }
      },
    );
    return () => subscription.remove();
  }, []);

  // Wybór zdjęcia profilowego i kaskadowa aktualizacja we wszystkich recenzjach użytkownika
  // Wybór zdjęcia profilowego, przesłanie na serwer (Storage) i kaskadowa aktualizacja we wszystkich recenzjach użytkownika
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && auth.currentUser) {
      const localUri = result.assets[0].uri;

      setUser((prev: any) => ({ ...prev, avatar: localUri }));

      try {
        const response = await fetch(localUri);
        const blob = await response.blob();

        const fileRef = ref(storage, `avatars/${auth.currentUser.uid}.jpg`);

        await uploadBytes(fileRef, blob);

        const publicUrl = await getDownloadURL(fileRef);

        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, { avatar: publicUrl });

        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("userId", "==", auth.currentUser.uid),
        );
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map((reviewDoc) =>
          updateDoc(reviewDoc.ref, {
            avatar: publicUrl,
          }),
        );

        await Promise.all(updatePromises);

        DeviceEventEmitter.emit("refreshProfile");
      } catch (error) {
        Alert.alert(
          "Błąd",
          "Nie udało się przesłać zdjęcia na serwer i zaktualizować recenzji.",
        );
        console.error("Błąd aktualizacji avatara: ", error);
      }
    }
  };

  // Zapisywanie nowego opisu użytkownika (Bio)
  const handleSaveBio = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, { opis: editBioText.trim() });

      setUser((prev: any) => ({ ...prev, opis: editBioText.trim() }));
      setIsEditingBio(false);
      DeviceEventEmitter.emit("refreshProfile");
    } catch (err) {
      console.error(err);
      Alert.alert("Błąd", "Nie udało się zapisać nowego opisu.");
    }
  };

  if (isLoading || (!user && auth.currentUser)) {
    return (
      <View style={globalStyles.container}>
        <View
          style={[
            globalStyles.header,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            },
          ]}
        >
          <Skeleton width={150} height={25} style={{ marginBottom: 5 }} />
        </View>
        <FlatList
          data={["skeleton_layout"]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.scrollContent}
          renderItem={() => (
            <View>
              <View style={styles.topProfileSection}>
                <Skeleton
                  width={80}
                  height={80}
                  borderRadius={40}
                  style={{ marginRight: 20 }}
                />
                <View style={{ flex: 1, flexDirection: "row", gap: 30 }}>
                  <Skeleton width={50} height={40} />
                  <Skeleton width={70} height={40} />
                </View>
              </View>
              <Skeleton width="100%" height={15} style={{ marginTop: 10 }} />
              <Skeleton width="80%" height={15} style={{ marginTop: 10 }} />
              <View style={styles.separator} />
              <Skeleton width={100} height={20} style={{ marginBottom: 15 }} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Skeleton width={100} height={150} borderRadius={8} />
                <Skeleton width={100} height={150} borderRadius={8} />
                <Skeleton width={100} height={150} borderRadius={8} />
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  if (!user && !auth.currentUser) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.headerText}>Nie jesteś zalogowany</Text>
      </View>
    );
  }

  const renderPreviewList = (list: any[]) => {
    if (list.length === 0) {
      return (
        <Text style={styles.emptyListText}>Lista jest jeszcze pusta.</Text>
      );
    }
    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalList}
        data={list}
        keyExtractor={(item) => item.id || item.tmdb_id?.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.posterPlaceholder}
            onPress={() =>
              router.push({
                pathname: "/FilmDetail",
                params: {
                  id: item.tmdb_id,
                  title: item.nazwa,
                  release_date: item.rok,
                  overview: item.overview,
                  backdrop: item.backdrop,
                  gatunki: item.gatunki ? item.gatunki.join(", ") : "",
                  type: item.typ,
                },
              })
            }
          >
            <Image
              source={{ uri: "https://image.tmdb.org/t/p/w154/" + item.plakat }}
              style={styles.previewImage}
            />
          </TouchableOpacity>
        )}
      />
    );
  };

  const profileSections = [
    { id: "top_stats" },
    { id: "bio" },
    { id: "sep1" },
    { id: "favourites" },
    { id: "sep2" },
    { id: "watchlist" },
    { id: "sep3" },
    { id: "my_reviews" },
  ];

  const renderProfileBlock = ({ item }: { item: { id: string } }) => {
    switch (item.id) {
      case "top_stats":
        return (
          <View style={styles.topProfileSection}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
            >
              {user.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarPlaceholderText}>+</Text>
              )}
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{reviewCount}</Text>
                <Text style={styles.statLabel}>Recenzje</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{user.data_dolaczenia}</Text>
                <Text style={styles.statLabel}>Dołączono</Text>
              </View>
            </View>
          </View>
        );

      case "bio":
        return (
          <View style={styles.bioContainer}>
            {isEditingBio ? (
              <View>
                <TextInput
                  style={styles.bioInput}
                  multiline
                  value={editBioText}
                  onChangeText={setEditBioText}
                  placeholder="Napisz coś o sobie..."
                  placeholderTextColor={AppColors.textGray}
                  maxLength={128}
                  autoFocus
                />
                {128 - editBioText.length <= 30 && (
                  <Text
                    style={{
                      color: AppColors.textGray,
                      fontSize: 11,
                      textAlign: "right",
                      marginTop: 2,
                    }}
                  >
                    Pozostało znaków: {128 - editBioText.length}
                  </Text>
                )}
                <View style={styles.bioActions}>
                  <TouchableOpacity onPress={() => setIsEditingBio(false)}>
                    <Text style={styles.bioCancelText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveBio}>
                    <Text style={styles.bioSaveText}>Zapisz</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditBioText(user.opis || DEFAULT_BIO);
                  setIsEditingBio(true);
                }}
              >
                <Text style={styles.bioText}>{user.opis || DEFAULT_BIO}</Text>
                <Text style={styles.editBioHint}>
                  <MaterialIcons name="edit" size={16} color="white" /> Edytuj
                  opis
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case "sep1":
      case "sep2":
      case "sep3":
        return <View style={styles.separator} />;

      case "favourites":
        return (
          <>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => router.push("/Favourites")}
            >
              <Text style={styles.sectionTitle}>Ulubione</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {renderPreviewList(favouritesPreview)}
          </>
        );

      case "watchlist":
        return (
          <>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => router.push("/Watchlist")}
            >
              <Text style={styles.sectionTitle}>Do obejrzenia</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {renderPreviewList(watchlistPreview)}
          </>
        );

      case "my_reviews":
        return (
          <>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => router.push("/MyReviews")}
            >
              <Text style={styles.sectionTitle}>Moje recenzje</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            {latestReview ? (
              <TouchableOpacity
                style={styles.mockReviewContainer}
                onPress={() => router.push("/MyReviews")}
              >
                <View style={styles.mockReviewHeader}>
                  <Text style={styles.mockReviewTitle}>
                    Dla: {latestReview.movieData?.nazwa || "Nieznany tytuł"}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ color: "#FFD700", fontSize: 16 }}>
                      {latestReview.ocena}/5 ★
                    </Text>
                  </View>
                </View>
                <Text style={styles.mockReviewText} numberOfLines={3}>
                  {latestReview.tresc}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.emptyListText}>
                Nie masz jeszcze żadnych recenzji.
              </Text>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View style={globalStyles.container}>
      <View
        style={[
          globalStyles.header,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          },
        ]}
      >
        <Text
          style={[
            globalStyles.headerText,
            { marginBottom: 0, textTransform: "capitalize" },
          ]}
        >
          {user.nazwa_uzytkownika}
        </Text>
        <TouchableOpacity
          style={styles.SettingsButton}
          onPress={() => router.push("/Settings")}
        >
          <Text style={styles.SettingsText}>
            <MaterialIcons name="settings" size={24} color="white" />
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={profileSections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        renderItem={renderProfileBlock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  SettingsButton: { marginRight: 20, paddingBottom: 2 },
  SettingsText: { color: "white", fontSize: 16, fontWeight: "bold" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  topProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3a3c4f",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.primary,
    overflow: "hidden",
    marginRight: 20,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholderText: { fontSize: 30, color: AppColors.textGray },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 30,
  },
  statBox: { alignItems: "center" },
  statNumber: { color: "white", fontSize: 16, fontWeight: "bold" },
  statLabel: { color: AppColors.textGray, fontSize: 12, marginTop: 2 },
  bioContainer: { marginBottom: 10 },
  bioText: { color: "#ddd", fontSize: 14, lineHeight: 20 },
  editBioHint: {
    color: AppColors.textGray,
    fontSize: 12,
    marginTop: 5,
    fontStyle: "italic",
  },
  bioInput: {
    backgroundColor: "#3a3c4f",
    color: "white",
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#555",
  },
  bioActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 15,
  },
  bioCancelText: {
    color: AppColors.textGray,
    fontSize: 14,
    fontWeight: "bold",
    padding: 5,
  },
  bioSaveText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: "bold",
    padding: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#3a3c4f",
    width: "100%",
    marginVertical: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { color: "white", fontSize: 16, fontWeight: "bold" },
  chevron: {
    color: AppColors.textGray,
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 24,
  },
  horizontalList: { marginBottom: 5 },
  posterPlaceholder: {
    width: 100,
    height: 150,
    backgroundColor: "#3a3c4f",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  previewImage: { width: "100%", height: "100%", borderRadius: 8 },
  emptyListText: {
    color: AppColors.textGray,
    fontStyle: "italic",
    marginBottom: 15,
  },
  mockReviewContainer: {
    marginTop: 10,
    backgroundColor: "#3a3c4f",
    padding: 15,
    borderRadius: 10,
  },
  mockReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  mockReviewTitle: { color: "white", fontSize: 14, fontWeight: "bold" },
  mockReviewText: { color: "#aaa", fontSize: 13, lineHeight: 18 },
});
