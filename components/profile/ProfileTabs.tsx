import { AppColors } from "@/constants/theme";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type TabType = "favourites" | "reviews" | "lists";

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

// Pasek zakładek profilu (Ulubione / Recenzje / Listy).
// Aktywną zakładkę trzyma ekran nadrzędny, a tutaj tylko ją wyświetlamy i zgłaszamy kliknięcie.
const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "favourites" && styles.activeTab]}
        onPress={() => onTabChange("favourites")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "favourites" && styles.activeTabText,
          ]}
        >
          Ulubione
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "reviews" && styles.activeTab]}
        onPress={() => onTabChange("reviews")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "reviews" && styles.activeTabText,
          ]}
        >
          Recenzje
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "lists" && styles.activeTab]}
        onPress={() => onTabChange("lists")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "lists" && styles.activeTabText,
          ]}
        >
          Listy
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default memo(ProfileTabs);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#3a3c4f",
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    color: AppColors.textGray,
    fontSize: 14,
    fontWeight: "bold",
  },
  activeTabText: {
    color: "white",
  },
});
