//Importy
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Standardowa konfiguracja

// Dane aplikacji Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);

// Eksport bazy danych i autoryzacji
export const db = getFirestore(app, "filmrev");
export const auth = initializeAuth(app, {
  // AsyncStorage zapisuje stan autoryzacji w pamięci telefonu, aby przy późniejszym odpaleniu aplikacji użytkownik nadal pozostał zalogowany do momentu wylogowania
  persistence: getReactNativePersistence(AsyncStorage),
});
