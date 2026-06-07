import { AppColors } from "@/constants/theme";
import { auth } from "@/hooks/firebaseConfig";
import { Tabs } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function TabLayout() {
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    // Sprawdzanie stanu logowania
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLogged(true); // Zalogowany
      } else {
        setIsLogged(false); // Wylogowany
      }
    });

    return unsubscribe;
  }, []);

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
          href: isLogged ? "/Profile" : null,
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={30} name="account-circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
