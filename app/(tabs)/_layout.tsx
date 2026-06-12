import { HapticTab } from "@/components/haptic-tab";
import { AppColors } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  // Wyciągamy stan bezpośrednio z centralnego monitoringu
  const { isLogged, isLoading } = useAuth();

  // Zabezpieczenie: dopóki aplikacja sprawdza token w SecureStore, pokazujemy loader
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: AppColors.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: AppColors.headerBackground,
          borderTopColor: "#27282e",
        },
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.textGray,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={30} name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={30} name="search" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "",
          // Dynamiczne chowanie zakładki - rekomendowane przez Expo Router
          href: isLogged ? null : "/account",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={30} name="account-circle" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Profile"
        options={{
          title: "",
          // Dynamiczne chowanie zakładki
          href: isLogged ? "/Profile" : null,
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={30} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
