import Skeleton from "@/components/Skeleton";
import { AppColors, globalStyles } from "@/constants/theme";
import { useResponsive } from "@/hooks/useResponsive";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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

import { useAuth } from "@/hooks/AuthContext";
import {
  deleteCustomList,
  getCustomListDetails,
  renameCustomList,
} from "@/hooks/firebaseDatabase";

export default function CustomList() {
  const { listId, creatorId } = useLocalSearchParams<{
    listId: string;
    creatorId: string;
  }>();
  const { user } = useAuth();
  const { numGridColumns, gridItemWidth } = useResponsive();
  const itemWidth = gridItemWidth(20, 15);

  const isOwner = user?.uid === creatorId;

  const [listDetails, setListDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"movie" | "tv">("movie");

  const [isEditingName, setIsEditingName] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Pobranie informacji o niestandardowej liście
  const fetchList = useCallback(async () => {
    if (!listId) return;
    try {
      setIsLoading(true);
      setError(null);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("Brak połączenia");
      }

      const data = await getCustomListDetails(listId);
      if (data) {
        setListDetails(data);
        setNewListName((data as any).name);
      }
    } catch (err: any) {
      console.error("Błąd pobierania szczegółów niestandardowej listy:", err);
      setError(
        "Brak połączenia z siecią. Nie udało się załadować danych listy.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [fetchList]),
  );

  // Zmiana nazwy listy
  const handleSaveName = async () => {
    if (newListName.trim() === "" || !listId) return;
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Alert.alert(
          "Brak połączenia",
          "Połącz się z internetem, aby zmienić nazwę listy.",
        );
        return;
      }

      await renameCustomList(listId, newListName.trim());
      setListDetails((prev: any) => ({ ...prev, name: newListName.trim() }));
      DeviceEventEmitter.emit("customListRenamed", {
        listId,
        newName: newListName.trim(),
      });
      setIsEditingName(false);
    } catch {
      Alert.alert("Błąd", "Wystąpił problem ze zmianą nazwy.");
    }
  };

  // Usuwanie listy
  const handleDeleteList = () => {
    Alert.alert(
      "Usuwanie listy",
      "Czy na pewno chcesz bezpowrotnie usunąć tę listę?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            if (!listId) return;
            try {
              const netState = await NetInfo.fetch();
              if (!netState.isConnected) {
                Alert.alert(
                  "Brak połączenia",
                  "Połącz się z internetem, aby usunąć listę.",
                );
                return;
              }
              await deleteCustomList(listId);
              DeviceEventEmitter.emit("customListDeleted", { listId });
              router.back();
            } catch {
              Alert.alert("Błąd", "Nie udało się usunąć listy.");
            }
          },
        },
      ],
    );
  };

  const dataToShow = useMemo(() => {
    return activeTab === "movie"
      ? listDetails?.movies || []
      : listDetails?.tv || [];
  }, [activeTab, listDetails]);

  const renderGridItem = useCallback(
    ({ item }: { item: any }) => {
      if (!item) return null;

      const posterPath = item.plakat || item.poster_path;
      const cleanId =
        item.tmdb_id ||
        item.id?.toString().replace("movie_", "").replace("tv_", "");

      return (
        <TouchableOpacity
          style={[styles.gridItem, { width: itemWidth }]}
          onPress={() =>
            router.push({
              pathname: "/FilmDetail",
              params: {
                id: cleanId,
                title: item.nazwa || item.title,
                release_date: item.rok || item.release_date,
                overview: item.overview,
                backdrop: item.backdrop || item.backdrop_path,
                type: item.typ || item.type || "movie",
              },
            })
          }
        >
          <Image
            source={{ uri: "https://image.tmdb.org/t/p/w154/" + posterPath }}
            style={styles.posterImage}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      );
    },
    [itemWidth],
  );

  if (isLoading) {
    return (
      <View style={globalStyles.container}>
        <View style={styles.customHeader}>
          <Skeleton width={150} height={25} style={{ marginLeft: 10 }} />
        </View>
        <FlatList
          data={[1, 2, 3]}
          numColumns={numGridColumns}
          columnWrapperStyle={{ gap: 15 }}
          renderItem={() => (
            <Skeleton style={[styles.gridItem, { width: itemWidth }]} />
          )}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchList}>
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Jeśli lista nie istnieje, wyświetla błąd.
  if (!listDetails) {
    return (
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.emptyText}>Nie znaleziono takiej listy.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: AppColors.primary, marginTop: 10 }}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>

        {isEditingName ? (
          <TextInput
            style={styles.nameInput}
            value={newListName}
            onChangeText={setNewListName}
            autoFocus
            maxLength={25}
          />
        ) : (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {listDetails.name}
          </Text>
        )}

        {isOwner &&
          (isEditingName ? (
            <TouchableOpacity
              onPress={handleSaveName}
              style={styles.actionIconButton}
            >
              <MaterialIcons name="check" size={26} color={AppColors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingName(true)}
              style={styles.actionIconButton}
            >
              <MaterialIcons name="edit" size={22} color={AppColors.textGray} />
            </TouchableOpacity>
          ))}

        {isOwner && (
          <TouchableOpacity
            style={styles.deleteListButton}
            onPress={handleDeleteList}
          >
            <MaterialIcons name="delete-outline" size={26} color="#e43057" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "movie" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("movie")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "movie" && styles.tabTextActive,
              ]}
            >
              Filmy ({listDetails.movies?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "tv" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("tv")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "tv" && styles.tabTextActive,
              ]}
            >
              Seriale ({listDetails.tv?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={dataToShow}
          keyExtractor={(item, index) =>
            item?.id?.toString() || index.toString()
          }
          numColumns={numGridColumns}
          contentContainerStyle={styles.scrollContent}
          columnWrapperStyle={{ gap: 15, justifyContent: "flex-start" }}
          initialNumToRender={6}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={globalStyles.emptyText}>
              Lista jest pusta. Użyj wyszukiwarki, aby dodać tytuły!
            </Text>
          }
          renderItem={renderGridItem}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    width: "100%",
    height: 110,
    backgroundColor: AppColors.headerBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 45,
  },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginRight: 10,
  },
  nameInput: {
    flex: 1,
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderColor: AppColors.primary,
    marginRight: 10,
    paddingVertical: 2,
  },
  actionIconButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteListButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  gridItem: {
    aspectRatio: 2 / 3,
    backgroundColor: "#3a3c4f",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  posterImage: { width: "100%", height: "100%" },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    gap: 15,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3a3c4f",
    backgroundColor: "#27282e",
  },
  tabButtonActive: {
    backgroundColor: "rgba(184, 0, 92, 0.2)",
    borderColor: AppColors.primary,
  },
  tabText: { color: AppColors.textGray, fontWeight: "bold" },
  tabTextActive: { color: AppColors.primary },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "bold" },
});
