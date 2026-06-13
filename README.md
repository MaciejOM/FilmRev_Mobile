# FilmRev

Mobilna aplikacja do recenzowania filmów i seriali, zbudowana w **React Native + Expo**. Pozwala użytkownikom przeglądać popularne produkcje z bazy TMDB, wystawiać recenzje, zarządzać listami oglądania oraz tworzyć własne listy tytułów.

<img src="images/Screenshot_20260613-130036_Expo Go.png" width=240px> <img src="images/Screenshot_20260613-130100_Expo Go.png" width=240px><img src="images/Screenshot_20260613-130124_Expo Go.png" width=240px><img src="images/Screenshot_20260613-130147_Expo Go.png" width=240px>

---

## Funkcje

### 1. Szeroki katalog filmów i seriali

- Przeglądaj najnowsze filmy i seriale.
- Integracja z TheMovieDatabase, pozwalająca na stały dostęp do najnowszych i najpopularniejszych produkcji.

### 2. Zaawansowane wyszukiwanie

- Znajdź konkretny tytuł poprzez słowa kluczowe, albo filtruj po filmach/serialach, gatunkach, ocenach oraz roku premiery.

### 3. System recenzji

- Przeglądaj recenzje innych użytkowników.
- Dodawaj swoje recenzje.
- System tagowania recenzji (Bez spoilerów, Pierwsze wrażenia).
- Edytuj lub usuń recenzje w każdym momencie.

### 4. Profil użytkownika

- Wyraź siebie poprzez własne zdjęcie profilowe.
- Lubisz jakąś produkcję? Dodaj ją do ulubionych jednym przyciskiem.
- Obejrzałeś lub planujesz obejrzeć coś później? Możesz dodać tytuł do listy "Obejrzane" lub "Do obejrzenia".
- Twórz własne, niestandardowe listy tytułów.
- Wszystkie swoje recenzje znajdziesz w jednym miejscu.
- W ustawieniach zmienisz nazwę, hasło oraz możliwość usunięcia konta.

### 5. Logowanie i rejestracja

- Zarejestruj nowe konto.
- Możliwość resetu hasła, jeśli zapomniałeś/aś.

---

## Stos technologiczny

| Warstwa        | Technologie                                                 |
| -------------- | ----------------------------------------------------------- |
| Framework      | React Native 0.81.5 + Expo SDK 54                           |
| Nawigacja      | Expo Router 6 (plik-jako-trasa)                             |
| Backend        | Firebase Auth · Firestore · Firebase Storage                |
| Dane filmów    | TMDB API v3                                                 |
| Stan globalny  | React Context API (`AuthContext`, `MediaContext`)           |
| Pamięć lokalna | AsyncStorage (cache publiczny) · expo-secure-store (tokeny) |
| Testy          | Jest 29 + @testing-library/react-native 14                  |

---

## Wymagania wstępne

- **Node.js** ≥ 18
- **npm** ≥ 9
- **EAS CLI** (do budowania APK) — `npm install -g eas-cli`
- Konto [Expo](https://expo.dev) (wymagane do `eas build`)
- Projekt [Firebase](https://console.firebase.google.com) z włączonymi: Authentication, Firestore, Storage
- Klucz API [TMDB](https://www.themoviedb.org/settings/api)
- Projekt Google Cloud z klientem OAuth 2.0 (Web + Android) dla funkcji logowania przez Google

---

## Instalacja i uruchomienie

### 1. Klonowanie repozytorium

```bash
git clone <URL_REPOZYTORIUM>
cd FilmRev_Mobile
```

### 2. Instalacja zależności

```bash
npm install
```

### 3. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` w katalogu głównym projektu na podstawie poniższego szablonu:

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY="TWÓJ_KLUCZ"
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="TWÓJ_PROJEKT.firebaseapp.com"
EXPO_PUBLIC_FIREBASE_PROJECT_ID="TWÓJ_PROJEKT"
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="TWÓJ_PROJEKT.firebasestorage.app"
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TWÓJ_SENDER_ID"
EXPO_PUBLIC_FIREBASE_APP_ID="TWÓJ_APP_ID"
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID="TWÓJ_MEASUREMENT_ID"

# TMDB
EXPO_PUBLIC_TMDB_API_KEY="TWÓJ_KLUCZ_TMDB"
```

> Zmienne zaczynające się od `EXPO_PUBLIC_` są widoczne po stronie klienta. Nie commituj pliku `.env` do repozytorium.

### 4. Uruchomienie w Expo Go

```bash
npx expo start
```

Zeskanuj kod QR aplikacją **Expo Go** na telefonie lub uruchom go w emulatorze.

---

## Testy

Projekt zawiera 13 testów jednostkowych pokrywających kluczową logikę aplikacji.

```bash
npm test
```

| Plik                                | Liczba testów | Zakres                                                          |
| ----------------------------------- | ------------- | --------------------------------------------------------------- |
| `hooks/__tests__/reviews.test.ts`   | 5             | Dodawanie, usuwanie i edycja recenzji w Firestore               |
| `hooks/__tests__/auth.test.tsx`     | 4             | Stany AuthContext: logowanie, wylogowanie, błąd poza providerem |
| `hooks/__tests__/useFilms.test.tsx` | 4             | Pobieranie filmów/seriali; fallback do cache offline            |

---

## Budowanie APK (Android)

Aplikacja jest skonfigurowana do budowania pliku `.apk` za pomocą **EAS Build**.

Konfiguracja w `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Kroki

```bash
# Zaloguj się do Expo (jednorazowo)
eas login

# Zbuduj APK
eas build -p android --profile preview
```

Po kilku minutach link do pobrania pliku `.apk` pojawi się w terminalu oraz w panelu [expo.dev](https://expo.dev/accounts). Plik można zainstalować bezpośrednio na urządzeniu Android (wymagane włączenie "Instalacja z nieznanych źródeł").

---

## Struktura projektu

```
FilmRev_Mobile/
├── app/                    # Ekrany aplikacji (Expo Router – plik = trasa)
│   ├── (tabs)/             # Główny pasek nawigacji dolnej
│   │   ├── index.tsx       # Strona główna
│   │   ├── search.tsx      # Wyszukiwarka
│   │   ├── Profile.tsx     # Profil użytkownika
│   │   └── account.tsx     # Logowanie
│   ├── FilmDetail.tsx      # Szczegóły filmu/serialu
│   ├── Review.tsx          # Dodawanie recenzji
│   ├── EditReview.tsx      # Edycja recenzji
│   ├── CustomList.tsx      # Szczegóły własnej listy
│   ├── Watchlist.tsx       # Lista "Do obejrzenia"
│   ├── Watched.tsx         # Lista "Obejrzane"
│   ├── Register.tsx        # Rejestracja konta
│   └── Settings.tsx        # Ustawienia konta
├── components/             # Komponenty wielokrotnego użytku
│   ├── details/            # Komponenty ekranu szczegółów
│   ├── home/               # Komponenty strony głównej
│   ├── profile/            # Zakładki profilu (Recenzje, Listy, itp.)
│   └── ErrorBoundary.tsx   # Obsługa błędów renderowania
├── hooks/                  # Logika i konteksty globalne
│   ├── AuthContext.tsx     # Kontekst autoryzacji Firebase
│   ├── MediaContext.tsx    # Kontekst danych filmów/seriali
│   ├── firebaseDatabase.ts # Operacje CRUD na Firestore
│   ├── useFilms.ts         # Hook dostępu do listy filmów
│   ├── useTV.ts            # Hook dostępu do listy seriali
│   └── __tests__/          # Testy jednostkowe
├── constants/              # Kolory i style globalne
├── assets/                 # Ikony, splash screen, czcionki
├── app.json                # Konfiguracja Expo (nazwa, ikona, pakiet Android)
└── eas.json                # Konfiguracja EAS Build
```

---
