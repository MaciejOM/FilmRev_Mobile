import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db, storage } from "@/hooks/firebaseConfig";
import {
  deleteFirebaseReview,
  getUserList,
  getUserReviews,
} from "@/hooks/firebaseDatabase";
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

import FavoritesTab from "@/components/profile/FavoritesTab";
import ListsTab from "@/components/profile/ListsTab";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs, { TabType } from "@/components/profile/ProfileTabs";
import ReviewsTab from "@/components/profile/ReviewsTab";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>("favourites");
  const [favouritesData, setFavouritesData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [watchedData, setWatchedData] = useState<any[]>([]);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState("");
  const [customListsData, setCustomListsData] = useState<any[]>([]);

  // Załadowanie nowych danych użytkownika
  const fetchFreshData = async (userAuth: any) => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return;

      const userDocRef = doc(db, "users", userAuth.uid);
      const listsQuery = query(
        collection(db, "custom_lists"),
        where("userId", "==", userAuth.uid),
      );

      const [
        userDocSnap,
        favData,
        watchData,
        watchedRawData,
        revData,
        listsSnap,
      ] = await Promise.all([
        getDoc(userDocRef),
        getUserList(userAuth.uid, "favourites"),
        getUserList(userAuth.uid, "watchlist"),
        getUserList(userAuth.uid, "watched" as any),
        getUserReviews(userAuth.uid),
        getDocs(listsQuery),
      ]);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userCustomLists = listsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const fullFavData = [...favData.movies, ...favData.tv];
        const fullWatchData = [...watchData.movies, ...watchData.tv];
        const fullWatchedData = [
          ...watchedRawData.movies,
          ...watchedRawData.tv,
        ];

        setUser(userData);
        setFavouritesData(fullFavData);
        setWatchlistData(fullWatchData);
        setReviewsData(revData);
        setReviewCount(revData.length);
        setCustomListsData(userCustomLists);
        setWatchedData(fullWatchedData);

        const safeUserData = { ...userData };
        delete safeUserData.email;

        const cacheKey = `profile_data_${userAuth.uid}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            user: safeUserData,
            favouritesData: fullFavData,
            watchlistData: fullWatchData,
            reviewsData: revData,
            reviewCount: revData.length,
            customListsData: userCustomLists,
          }),
        );
      } else {
        await AsyncStorage.removeItem(`profile_data_${userAuth.uid}`);
        await signOut(auth);
        setUser(null);
        router.replace("/account");
      }
    } catch (error) {
      console.error("Błąd tła (Profile):", error);
    }
  };

  // Załadowanie danych użytkowika 
  const loadUserData = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const cacheKey = `profile_data_${currentUser.uid}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);

        const netState = await NetInfo.fetch();

        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            setUser(parsed.user);
            setFavouritesData(parsed.favouritesData || []);
            setWatchlistData(parsed.watchlistData || []);
            setReviewsData(parsed.reviewsData || []);
            setReviewCount(parsed.reviewCount || 0);
            setCustomListsData(parsed.customListsData || []);
          } catch (e) {
            console.error("Błąd parsowania cache", e);
          }
        } else if (!netState.isConnected) {
          Alert.alert(
            "Brak połączenia",
            "Wymagane połączenie, aby załadować profil po raz pierwszy.",
          );
        }

        if (netState.isConnected) {
          await fetchFreshData(currentUser);
        }
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

  const hasFetchedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFetchedOnce.current) {
        hasFetchedOnce.current = true;
        loadUserData();
      }
    }, [loadUserData]),
  );

  const updateCache = useCallback((updater: (parsed: any) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    AsyncStorage.getItem(`profile_data_${uid}`).then((cache) => {
      if (!cache) return;
      try {
        const parsed = JSON.parse(cache);
        updater(parsed);
        AsyncStorage.setItem(`profile_data_${uid}`, JSON.stringify(parsed));
      } catch {}
    });
  }, []);

  // Odświeżanie niestandarowych list
  const refreshCustomLists = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const listsQuery = query(
        collection(db, "custom_lists"),
        where("userId", "==", uid),
      );
      const listsSnap = await getDocs(listsQuery);
      const userCustomLists = listsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCustomListsData(userCustomLists);
      updateCache((p) => {
        p.customListsData = userCustomLists;
      });
    } catch (err) {
      console.error("Błąd odświeżania list:", err);
    }
  }, [updateCache]);

  // Kiedy użytkownik polubi produkcje, doda ją do listy, lub doda recenzje,
  // DeviceEventEmitter wyłapie tą informacje i zaktualizuje profil odpowiednimi informacjami.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "refreshProfile",
      () => {
        if (auth.currentUser) fetchFreshData(auth.currentUser);
      },
    );

    // Dodanie do ulubionych.
    const favSub = DeviceEventEmitter.addListener(
      "favouriteToggled",
      (data) => {
        setFavouritesData((prev) => {
          const updated = data.isAdded
            ? prev.find((item) => item.id === data.mediaId)
              ? prev
              : [data.mediaData, ...prev]
            : prev.filter((item) => item.id !== data.mediaId);
          updateCache((p) => {
            p.favouritesData = updated;
          });
          return updated;
        });
      },
    );

    // Dodanie do listy "Do obejrzenia".
    const watchlistSub = DeviceEventEmitter.addListener(
      "watchlistToggled",
      (data) => {
        setWatchlistData((prev) => {
          const updated = data.isAdded
            ? prev.find((item) => item.id === data.mediaId)
              ? prev
              : [data.mediaData, ...prev]
            : prev.filter((item) => item.id !== data.mediaId);
          return updated;
        });
      },
    );

    // Dodanie do listy "Obejrzane".
    const watchedSub = DeviceEventEmitter.addListener(
      "watchedToggled",
      (data) => {
        setWatchedData((prev) => {
          const updated = data.isAdded
            ? prev.find((item) => item.id === data.mediaId)
              ? prev
              : [data.mediaData, ...prev]
            : prev.filter((item) => item.id !== data.mediaId);
          return updated;
        });
      },
    );

    // Dodanie recenzji
    const newRevSub = DeviceEventEmitter.addListener(
      "newReviewAdded",
      (newReview) => {
        setReviewsData((prev) => [newReview, ...prev]);
        setReviewCount((prev) => prev + 1);
        updateCache((p) => {
          p.reviewsData = [newReview, ...(p.reviewsData || [])];
          p.reviewCount = (p.reviewCount || 0) + 1;
        });
      },
    );

    // Edycja recenzji
    const editRevSub = DeviceEventEmitter.addListener(
      "reviewEdited",
      (data) => {
        setReviewsData((prev) =>
          prev.map((r) =>
            r.id === data.reviewId
              ? {
                  ...r,
                  ocena: data.rating,
                  tresc: data.comment,
                  tags: data.selectedTags,
                  isEdited: true,
                }
              : r,
          ),
        );
        updateCache((p) => {
          p.reviewsData = (p.reviewsData || []).map((r: any) =>
            r.id === data.reviewId
              ? {
                  ...r,
                  ocena: data.rating,
                  tresc: data.comment,
                  tags: data.selectedTags,
                  isEdited: true,
                }
              : r,
          );
        });
      },
    );

    // Usunięcie recenzji
    const delRevSub = DeviceEventEmitter.addListener(
      "reviewDeleted",
      (data) => {
        setReviewsData((prev) => prev.filter((r) => r.id !== data.reviewId));
        setReviewCount((prev) => Math.max(0, prev - 1));
        updateCache((p) => {
          p.reviewsData = (p.reviewsData || []).filter(
            (r: any) => r.id !== data.reviewId,
          );
          p.reviewCount = Math.max(0, (p.reviewCount || 1) - 1);
        });
      },
    );

    // Polubienie recenzji
    const likeRevSub = DeviceEventEmitter.addListener(
      "reviewLikeToggled",
      (data) => {
        setReviewsData((prev) =>
          prev.map((r) =>
            r.id === data.reviewId ? { ...r, likes: data.newLikes } : r,
          ),
        );
        updateCache((p) => {
          p.reviewsData = (p.reviewsData || []).map((r: any) =>
            r.id === data.reviewId ? { ...r, likes: data.newLikes } : r,
          );
        });
      },
    );

    // Zmiana nazwy użytkownika
    const usernameSub = DeviceEventEmitter.addListener(
      "usernameChanged",
      (data) => {
        setUser((prev: any) =>
          prev ? { ...prev, nazwa_uzytkownika: data.newName } : prev,
        );
        updateCache((p) => {
          if (p.user) p.user.nazwa_uzytkownika = data.newName;
        });
      },
    );

    // Usunięcie listy
    const listDeletedSub = DeviceEventEmitter.addListener(
      "customListDeleted",
      (data) => {
        setCustomListsData((prev) =>
          prev.filter((list) => list.id !== data.listId),
        );
        updateCache((p) => {
          p.customListsData = (p.customListsData || []).filter(
            (list: any) => list.id !== data.listId,
          );
        });
      },
    );

    // Zmiana nazwy listy
    const listRenamedSub = DeviceEventEmitter.addListener(
      "customListRenamed",
      (data) => {
        setCustomListsData((prev) =>
          prev.map((list) =>
            list.id === data.listId ? { ...list, name: data.newName } : list,
          ),
        );
        updateCache((p) => {
          p.customListsData = (p.customListsData || []).map((list: any) =>
            list.id === data.listId ? { ...list, name: data.newName } : list,
          );
        });
      },
    );

    return () => {
      subscription.remove();
      favSub.remove();
      watchlistSub.remove();
      watchedSub.remove();
      newRevSub.remove();
      editRevSub.remove();
      delRevSub.remove();
      likeRevSub.remove();
      usernameSub.remove();
      listDeletedSub.remove();
      listRenamedSub.remove();
    };
  }, [updateCache]);

  // Zmiana zdjęcia profilowego.
  const pickImage = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Brak połączenia",
        "Wymagane połączenie z internetem, aby zmienić zdjęcie.",
      );
      return;
    }

    // Pozwolenie na dostęp do galerii.
    const { status, canAskAgain } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Brak dostępu do galerii",
        canAskAgain
          ? "Zezwól aplikacji na dostęp do galerii zdjęć, aby zmienić zdjęcie profilowe."
          : "Dostęp do galerii został trwale odrzucony. Zmień uprawnienia ręcznie w ustawieniach urządzenia.",
      );
      return;
    }

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
          updateDoc(reviewDoc.ref, { avatar: publicUrl }),
        );
        await Promise.all(updatePromises);
        DeviceEventEmitter.emit("avatarChanged", {
          userId: auth.currentUser.uid,
          newAvatar: publicUrl,
        });
        DeviceEventEmitter.emit("refreshProfile");
      } catch {
        Alert.alert("Błąd", "Nie udało się przesłać zdjęcia na serwer.");
      }
    }
  };

  // Zapisywanie zmian w opisie profilu
  const handleSaveBio = async () => {
    if (!auth.currentUser) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Błąd",
        "Sprawdź połączenie internetowe, aby zapisać zmianę.",
      );
      return;
    }

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, { opis: editBioText.trim() });
      setUser((prev: any) => ({ ...prev, opis: editBioText.trim() }));
      setIsEditingBio(false);
      DeviceEventEmitter.emit("refreshProfile");
    } catch {
      Alert.alert("Błąd", "Nie udało się zapisać nowego opisu.");
    }
  };

  // Jeśli niezalogowany użytkownik wyświetli ekran, pojawi się specjalny komunikat.
  if (!user && !auth.currentUser) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.headerText}>Nie jesteś zalogowany</Text>
      </View>
    );
  }

  if (isLoading || !user) {
    return (
      <View style={globalStyles.container}>
        <ActivityIndicator
          size="large"
          color={AppColors.primary}
          style={{ marginTop: 100 }}
        />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={[globalStyles.headerText]}>{user.nazwa_uzytkownika} </Text>

        <TouchableOpacity
          style={styles.SettingsButton}
          onPress={() => router.push("/Settings")}
        >
          <Text style={styles.SettingsText}>
            <MaterialIcons name="settings" size={24} color="white" />
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          user={user}
          reviewCount={reviewCount}
          pickImage={pickImage}
          isEditingBio={isEditingBio}
          setIsEditingBio={setIsEditingBio}
          editBioText={editBioText}
          setEditBioText={setEditBioText}
          handleSaveBio={handleSaveBio}
        />

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <View style={styles.tabContentContainer}>
          <View
            style={activeTab !== "favourites" ? { display: "none" } : undefined}
          >
            <FavoritesTab data={favouritesData} />
          </View>

          <View
            style={activeTab !== "reviews" ? { display: "none" } : undefined}
          >
            <ReviewsTab
              data={reviewsData}
              isReadOnly={false}
              onDeleteReview={(id) => {
                Alert.alert(
                  "Usuń recenzję",
                  "Czy na pewno chcesz usunąć swoją recenzję?",
                  [
                    { text: "Anuluj", style: "cancel" },
                    {
                      text: "Usuń",
                      style: "destructive",
                      onPress: async () => {
                        const netState = await NetInfo.fetch();
                        if (!netState.isConnected) {
                          Alert.alert("Błąd", "Brak połączenia.");
                          return;
                        }
                        DeviceEventEmitter.emit("reviewDeleted", {
                          reviewId: id,
                        });
                        deleteFirebaseReview(id).catch((err) => {
                          console.error(err);
                          DeviceEventEmitter.emit("refreshProfile");
                        });
                      },
                    },
                  ],
                );
              }}
            />
          </View>

          <View style={activeTab !== "lists" ? { display: "none" } : undefined}>
            <ListsTab
              customLists={customListsData}
              isReadOnly={false}
              watchlistPreview={watchlistData}
              watchedPreview={watchedData}
              creatorId={auth.currentUser?.uid || ""}
              onRefresh={refreshCustomLists}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  SettingsButton: {
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
  SettingsText: { color: "white", fontSize: 16, fontWeight: "bold" },
  tabContentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
});
