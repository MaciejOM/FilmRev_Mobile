import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Dane aplikacji Firebase DO UKRYCIA !!!
const firebaseConfig = {
  apiKey: "AIzaSyDwmwCu1jQR-H_kQXYo77tYkDGl1XQnKhk",
  authDomain: "filmrev-fb663.firebaseapp.com",
  projectId: "filmrev-fb663",
  storageBucket: "filmrev-fb663.firebasestorage.app",
  messagingSenderId: "59810252191",
  appId: "1:59810252191:web:6f8c2bf91ea949e61aa9aa",
  measurementId: "G-XHQWC321JZ"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);

// Eksport bazy danych i autoryzacji
export const db = getFirestore(app, "filmrev");
export const auth = getAuth(app);