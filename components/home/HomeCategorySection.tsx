import { AppColors, globalStyles } from "@/constants/theme";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HomeCategorySectionProps {
  title: string;
  categoryParam: string;
  data: any[];
}

const HomeCategorySection = ({
  title,
  categoryParam,
  data,
}: HomeCategorySectionProps) => {
  const router = useRouter();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeaderRow}
        onPress={() =>
          router.push({
            pathname: "/CategoryView",
            params: { category: categoryParam, title: title },
          })
        }
      >
        <Text style={styles.categoryText}>{title}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <FlatList
        data={data}
        keyExtractor={(item, index) =>
          `${categoryParam}_${item.id || item.tmdb_id || index}`
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={globalStyles.filmBanner}
            onPress={() =>
              router.push({
                pathname: "/FilmDetail",
                params: {
                  id: item.id || item.tmdb_id,
                  title:
                    item.searchTitle || item.title || item.name || item.nazwa,
                  release_date:
                    item.searchDate ||
                    item.release_date ||
                    item.first_air_date ||
                    item.rok,
                  overview: item.overview,
                  backdrop:
                    item.backdrop_path ||
                    item.backdrop ||
                    item.poster_path ||
                    item.plakat,
                  gatunki: item.gatunki
                    ? Array.isArray(item.gatunki)
                      ? item.gatunki.join(", ")
                      : item.gatunki
                    : "",
                  type: item.type || "movie",
                },
              })
            }
          >
            <Image
              source={{
                uri:
                  "https://image.tmdb.org/t/p/w154/" +
                  (item.poster_path || item.plakat),
              }}
              style={globalStyles.filmImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default memo(HomeCategorySection);

const styles = StyleSheet.create({
  sectionContainer: { marginBottom: 5 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  categoryText: {
    marginLeft: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  chevron: {
    color: AppColors.textGray,
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 24,
  },
  horizontalListContent: { paddingLeft: 20, paddingRight: 5 },
  ratingText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
});
