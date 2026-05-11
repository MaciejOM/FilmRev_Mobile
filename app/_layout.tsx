import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { initDB } from '@/hooks/Database';
import { useSyncData } from '@/hooks/useSyncData';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {

    initDB();
    setIsDbReady(true);
  }, []);

  useSyncData();

  // Blokuje ładowanie ekranów aplikacji, do momentu załadowania bazy danych
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#27282e', justifyContent: 'center', alignItems: 'center' }}>
         <ActivityIndicator size="large" color="#b8005c" />
      </View>
    );
  }

  // Zwraca ekrany po załadowaniu bazy danych
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="FilmDetail" options={{ headerShown: false }} />
        <Stack.Screen name="Register" options={{ headerShown: false }} />
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}