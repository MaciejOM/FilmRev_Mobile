import AsyncStorage from '@react-native-async-storage/async-storage'; // DODANO
import { Tabs, usePathname } from 'expo-router'; // DODANO: usePathname
import React, { useEffect, useState } from 'react';


import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const pathname = usePathname(); 
  
  const [isLogged, setIsLogged] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const user = await AsyncStorage.getItem('currentUser');
      setIsLogged(!!user);
      setIsChecking(false);
    };
    checkLoginStatus();
  }, [pathname]);



  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Główna',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Wyszukaj',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="search" color={color} />,
        }}
      />

      <Tabs.Screen 
        name="account" 
        options={{ 
          title: 'Zaloguj się',
          href: isLogged ? null : '/account', 
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="account-circle" color={color} />,
        }} 
      />

      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Konto',
          href: isLogged ? '/Profile' : null, 
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="account-circle" color={color} /> 
        }} 
      />
      // UKRYTE
      <Tabs.Screen name="explore" options={{ href: null}} />
      <Tabs.Screen name="FilmList" options={{ href: null }} />
      <Tabs.Screen name="index2" options={{ href: null}} />
    </Tabs>
  );
}
