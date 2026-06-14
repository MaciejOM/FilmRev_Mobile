// Importy
import * as SecureStore from "expo-secure-store";
import { initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// SecureStore akceptuje tylko określone znaki w kluczach, dlatego zamieniamy
// wszystkie niedozwolone znaki na podkreślnik, aby uniknąć błędów zapisu tokenu.
const secureKey = (key: string) => {
  return key.replace(/[^a-zA-Z0-9.\-_]/g, "_");
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "filmrev");

// Na webie używamy domyślnej trwałości przeglądarki, bo SecureStore tam nie istnieje,
// a getReactNativePersistence nie jest eksportowane z webowej wersji firebase/auth.
let auth: Auth;

if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  // Na telefonie token logowania trzymamy w SecureStore (szyfrowana pamięć urządzenia),
  // dzięki czemu użytkownik pozostaje zalogowany między uruchomieniami aż do wylogowania.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require("firebase/auth");
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence({
      getItem: (key: string) => SecureStore.getItemAsync(secureKey(key)),
      setItem: (key: string, value: string) =>
        SecureStore.setItemAsync(secureKey(key), value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(secureKey(key)),
    }),
  });
}

export { auth };

export const storage = getStorage(app);
