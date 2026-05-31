import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';



export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();


  // Zwraca ekrany po załadowaniu bazy danych
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="FilmDetail" options={{ headerShown: false }} />
        <Stack.Screen name="Register" options={{ headerShown: false}} />
        <Stack.Screen name="Review" options={{ headerShown: false}} />
        <Stack.Screen name="EditReview" options={{ headerShown: false}}/>
        <Stack.Screen name="Favourites" options={{ headerShown: false}}/>
        <Stack.Screen name="Watchlist" options={{ headerShown: false}}/>
        <Stack.Screen name="MyReviews" options={{ headerShown: false}}/>
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}