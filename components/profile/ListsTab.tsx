import { AppColors } from "@/constants/theme";
import { auth, db } from "@/hooks/firebaseConfig";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import React, { memo, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ListsTabProps {
  customLists: any[];
  isReadOnly?: boolean;
  watchlistPreview: any[];
  watchedPreview: any[];
  creatorId: string;
  onRefresh?: () => void;
}

const ListsTab = ({
  customLists,
  isReadOnly = false,
  watchlistPreview,
  watchedPreview,
  creatorId,
  onRefresh,
}: ListsTabProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichedLists, setEnrichedLists] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchPreviews = async () => {
      if (!customLists || customLists.length === 0) {
        if (isMounted) setEnrichedLists([]);
        return;
      }

      const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

      const updatedLists = await Promise.all(
        customLists.map(async (list) => {
          const itemIds: string[] = list.items || [];
          const itemsToFetch = itemIds.slice(0, 3);

          const fetched = await Promise.all(
            itemsToFetch.map(async (mediaId) => {
              try {
                const mediaSnap = await getDoc(doc(db, "movies", mediaId));
                if (mediaSnap.exists()) {
                  return {
                    id: mediaId,
                    plakat:
                      mediaSnap.data().plakat || mediaSnap.data().poster_path,
                  };
                }
                const isMovie = mediaId.startsWith("movie_");
                const cleanId = mediaId
                  .replace("movie_", "")
                  .replace("tv_", "");
                const tmdbType = isMovie ? "movie" : "tv";
                const res = await fetch(
                  `https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=pl-PL`,
                );
                const json = await res.json();
                if (json?.poster_path) {
                  return { id: mediaId, plakat: json.poster_path };
                }
              } catch (err) {
                console.error(
                  "Błąd pobierania miniaturki podglądu kolekcji:",
                  err,
                );
              }
              return null;
            }),
          );

          return { ...list, previewItems: fetched.filter(Boolean) };
        }),
      );

      if (isMounted) {
        setEnrichedLists(updatedLists);
      }
    };

    fetchPreviews();

    return () => {
      isMounted = false;
    };
  }, [customLists]);

  const handleCreateList = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (!newListName || newListName.trim() === "") {
      Alert.alert("Błąd", "Nazwa listy nie może być pusta!");
      return;
    }

    if (customLists.length >= 10) {
      Alert.alert("Błąd", "Osiągnięto limit 10 list.");
      setIsModalVisible(false);
      return;
    }

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) throw new Error("Brak połączenia");

      setIsSubmitting(true);
      const docRef = await addDoc(collection(db, "custom_lists"), {
        name: newListName.trim(),
        userId: currentUser.uid,
        items: [],
        data_utworzenia: new Date().toLocaleDateString("pl-PL"),
      });

      setIsModalVisible(false);
      setNewListName("");

      if (onRefresh) onRefresh();

      router.push({
        pathname: "/CustomList",
        params: { listId: docRef.id, creatorId: currentUser.uid },
      });
    } catch (err: any) {
      console.error("Błąd tworzenia listy:", err);
      Alert.alert(
        "Błąd",
        err.message === "Brak połączenia"
          ? "Brak połączenia z siecią."
          : "Nie udało się utworzyć nowej listy.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStackedPosters = (previewItems: any[] = []) => {
    const itemsToRender = (previewItems || []).slice(0, 3);
    if (itemsToRender.length === 0) {
      return (
        <View style={styles.posterPlaceholderCard}>
          <MaterialIcons name="movie" size={30} color="#666" />
        </View>
      );
    }

    return (
      <View style={styles.stackWrapper}>
        {itemsToRender.reverse().map((item, index) => {
          const realIndex = itemsToRender.length - 1 - index;
          const posterPath = item.plakat || item.poster_path;

          return (
            <Image
              key={item.id || Math.random().toString()}
              source={{ uri: "https://image.tmdb.org/t/p/w154/" + posterPath }}
              style={[
                styles.stackedPoster,
                {
                  transform: [
                    { translateX: realIndex * 12 },
                    { scale: 1 - realIndex * 0.05 },
                  ],
                  zIndex: index,
                  opacity: 1 - realIndex * 0.15,
                },
              ]}
              contentFit="cover"
              transition={200}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.listCard}
          onPress={() =>
            router.push({ pathname: "/Watched", params: { userId: creatorId } })
          }
        >
          <View style={styles.cardVisual}>
            {renderStackedPosters(watchedPreview)}
          </View>
          <View style={styles.cardFooter}>
            <MaterialIcons
              name="visibility"
              size={16}
              color="white"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.listCardTitle}>Obejrzane</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.listCard}
          onPress={() =>
            router.push({
              pathname: "/Watchlist",
              params: { userId: creatorId },
            })
          }
        >
          <View style={styles.cardVisual}>
            {renderStackedPosters(watchlistPreview)}
          </View>
          <View style={styles.cardFooter}>
            <MaterialIcons
              name="watch-later"
              size={16}
              color="white"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.listCardTitle}>Do obejrzenia</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {enrichedLists.map((list) => (
          <TouchableOpacity
            key={list.id}
            style={styles.listCard}
            onPress={() =>
              router.push({
                pathname: "/CustomList",
                params: { listId: list.id, creatorId: creatorId },
              })
            }
          >
            <View style={styles.cardVisual}>
              {renderStackedPosters(list.previewItems || [])}
            </View>
            <View style={styles.cardFooter}>
              <MaterialIcons
                name="format-list-bulleted"
                size={16}
                color="white"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.listCardTitle} numberOfLines={1}>
                {list.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {!isReadOnly && (
          <TouchableOpacity
            style={styles.createCard}
            onPress={() => {
              if (customLists.length >= 10) {
                Alert.alert(
                  "Limit osiągnięty",
                  "Możesz posiadać maksymalnie 10 niestandardowych list. Usuń jedną z obecnych kolekcji, aby utworzyć nową.",
                );
              } else {
                setIsModalVisible(true);
              }
            }}
          >
            <View style={styles.createCircle}>
              <MaterialIcons name="add" size={36} color="white" />
            </View>
            <Text style={styles.createCardText}>Utwórz nową listę</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nowa lista</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wpisz nazwę kolekcji..."
              placeholderTextColor="#999"
              value={newListName}
              onChangeText={setNewListName}
              maxLength={25}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsModalVisible(false);
                  setNewListName("");
                }}
              >
                <Text style={{ color: "#aaa", fontWeight: "bold" }}>
                  Anuluj
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleCreateList}
                disabled={isSubmitting}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {isSubmitting ? "Tworzenie..." : "Utwórz"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default memo(ListsTab);

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginBottom: 5 },
  listCard: {
    width: "47%",
    aspectRatio: 1 / 1,
    backgroundColor: "#3a3c4f",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardVisual: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 35,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  listCardTitle: { color: "white", fontWeight: "bold", fontSize: 13, flex: 1 },
  stackWrapper: { width: 70, height: 105, position: "relative" },
  stackedPoster: {
    position: "absolute",
    width: 70,
    height: 105,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  posterPlaceholderCard: {
    width: 70,
    height: 105,
    backgroundColor: "#27282e",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  createCard: {
    width: "47%",
    aspectRatio: 1 / 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3a3c4f",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  createCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  createCardText: { color: "white", fontWeight: "bold", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#3a3c4f",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#555",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#27282e",
    color: "white",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  modalButtonCancel: { padding: 10 },
  modalButtonConfirm: {
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
