import { AppColors, globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "@/hooks/firebaseConfig";
import { getUserList, getUserReviews } from "@/hooks/firebaseDatabase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import FavoritesTab from "@/components/profile/FavoritesTab";
import ListsTab from "@/components/profile/ListsTab";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs, { TabType } from "@/components/profile/ProfileTabs";
import ReviewsTab from "@/components/profile/ReviewsTab";

export default function OtherProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("favourites");
  const [favouritesData, setFavouritesData] = useState<any[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [customListsData, setCustomListsData] = useState<any[]>([]);
  const [watchedData, setWatchedData] = useState<any[]>([]);

  const loadTargetUser = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("Brak połączenia");
      }

      const listsQuery = query(
        collection(db, "custom_lists"),
        where("userId", "==", userId),
      );

      const [
        userDocSnap,
        favData,
        watchData,
        watchedRawData,
        revData,
        listsSnap,
      ] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getUserList(userId, "favourites"),
        getUserList(userId, "watchlist"),
        getUserList(userId, "watched" as any),
        getUserReviews(userId),
        getDocs(listsQuery),
      ]);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const authorCustomLists = listsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setUser(userData);
        setFavouritesData([...favData.movies, ...favData.tv]);
        setWatchlistData([...watchData.movies, ...watchData.tv]);
        setWatchedData([...watchedRawData.movies, ...watchedRawData.tv]);
        setReviewsData(revData);
        setReviewCount(revData.length);
        setCustomListsData(authorCustomLists);
      } else {
        setError("Użytkownik nie istnieje.");
      }
    } catch (err: any) {
      console.error("Błąd pobierania profilu:", err);
      setError(
        err.message === "Brak połączenia"
          ? "Brak połączenia z siecią."
          : "Wystąpił problem z wczytaniem danych.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTargetUser();
  }, [loadTargetUser]);

  useEffect(() => {
    const likeRevSub = DeviceEventEmitter.addListener(
      "reviewLikeToggled",
      (data) => {
        setReviewsData((prev) =>
          prev.map((r) =>
            r.id === data.reviewId ? { ...r, likes: data.newLikes } : r,
          ),
        );
      },
    );
    return () => likeRevSub.remove();
  }, []);

  if (isLoading) {
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

  if (error || !user) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={{ color: "white", fontSize: 18, marginBottom: 15 }}>
          {error || "Nie znaleziono użytkownika."}
        </Text>

        {error && error.includes("sieci") && (
          <TouchableOpacity onPress={loadTargetUser} style={styles.retryButton}>
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Spróbuj ponownie
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: AppColors.primary, fontSize: 16 }}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View
        style={[
          globalStyles.header,
          {
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            paddingLeft: 15,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
          </Text>
        </TouchableOpacity>
        <Text style={[globalStyles.headerText, { marginLeft: 60 }]}>
          {user.nazwa_uzytkownika}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          user={user}
          reviewCount={reviewCount}
          pickImage={() => {}}
          isEditingBio={false}
          setIsEditingBio={() => {}}
          editBioText={""}
          setEditBioText={() => {}}
          handleSaveBio={() => {}}
          isReadOnly={true}
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
            <ReviewsTab data={reviewsData} isReadOnly={true} />
          </View>

          <View style={activeTab !== "lists" ? { display: "none" } : undefined}>
            <ListsTab
              customLists={customListsData}
              isReadOnly={true}
              watchlistPreview={watchlistData}
              watchedPreview={watchedData}
              creatorId={userId}
            />
          </View>
        </View>
      </ScrollView>
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
  closeButtonText: { color: "white", fontSize: 30, fontWeight: "bold" },
  backButton: { paddingBottom: 15 },
  tabContentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  retryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
