// Importy
import { AppColors, globalStyles } from "@/constants/theme";
import { auth, db } from "@/hooks/firebaseConfig";
import { updateMovieAverageRating } from "@/hooks/firebaseDatabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo"; // Dodano obsługę NetCode
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmDeletePassword, setConfirmDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Wylogowanie konta
  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Uwaga",
        "Jesteś offline. Twoje dane zostaną wyczyszczone lokalnie, ale pełne wylogowanie z serwera nastąpi po odzyskaniu połączenia.",
      );
    }

    Alert.alert(
      "Wylogowanie",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: async () => {
            try {
              if (auth.currentUser) {
                await AsyncStorage.removeItem(
                  `profile_data_${auth.currentUser.uid}`,
                );
              }
              await signOut(auth);
              router.replace("/account");
            } catch (error) {
              console.error(error);
              Alert.alert(
                "Błąd",
                "Nie udało się wylogować. Sprawdź połączenie z internetem.",
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Resetowanie hasła (wiadomość e-mail)
  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Brak połączenia",
        "Wymagane połączenie z internetem, aby wysłać link resetujący hasło.",
      );
      return;
    }

    const user = auth.currentUser;
    if (user && user.email) {
      Alert.alert(
        "Zmiana hasła",
        `Wyślemy link do zmiany hasła na Twój adres e-mail: ${user.email}. Czy chcesz kontynuować?`,
        [
          { text: "Anuluj", style: "cancel" },
          {
            text: "Wyślij",
            onPress: async () => {
              try {
                await sendPasswordResetEmail(auth, user.email!);
                Alert.alert(
                  "Wysłano!",
                  "Sprawdź swoją skrzynkę pocztową (również folder SPAM).",
                );
              } catch (error) {
                console.error(error);
                Alert.alert(
                  "Błąd",
                  "Nie udało się wysłać linku. Spróbuj ponownie później.",
                );
              }
            },
          },
        ],
      );
    }
  };

  // Zmiana nazwy użytkownika
  const handleSaveUsername = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (newName.trim().length < 3) {
      Alert.alert("Błąd", "Nazwa użytkownika musi mieć co najmniej 3 znaki.");
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Brak połączenia",
        "Połącz się z internetem, aby zaktualizować nazwę użytkownika.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        nazwa_uzytkownika: newName.trim(),
      });

      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const updatePromises = querySnapshot.docs.map((reviewDoc) =>
        updateDoc(reviewDoc.ref, {
          nazwa_uzytkownika: newName.trim(),
        }),
      );

      await Promise.all(updatePromises);

      // Aktualizacja lokalnego cache
      const cacheKey = `profile_data_${user.uid}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        parsed.user.nazwa_uzytkownika = newName.trim();
        await AsyncStorage.setItem(cacheKey, JSON.stringify(parsed));
      }

      DeviceEventEmitter.emit("usernameChanged", { newName: newName.trim() });
      Alert.alert("Sukces", "Twoja nazwa użytkownika została zaktualizowana.");
      setIsEditingName(false);
      setNewName("");
    } catch (error) {
      console.error(error);
      Alert.alert("Błąd", "Nie udało się zmienić nazwy użytkownika.");
    } finally {
      setIsSaving(false);
    }
  };

  // Całkowite usunięcie konta
  const confirmAndDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    if (deletePassword !== confirmDeletePassword) {
      Alert.alert("Błąd", "Podane hasła nie są identyczne.");
      return;
    }

    if (deletePassword.trim() === "") {
      Alert.alert("Błąd", "Proszę podać hasło.");
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        "Brak połączenia",
        "Wymagane połączenie z internetem, aby usunąć konto.",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsDeletingAccount(true);

    try {
      // Re-walidacja danych
      const credential = EmailAuthProvider.credential(
        user.email,
        deletePassword,
      );
      await reauthenticateWithCredential(user, credential);

      // 1. Usunięcie pamięci lokalnej
      await AsyncStorage.removeItem(`profile_data_${user.uid}`);

      // 2. Zebranie recenzji użytkownika w celu przygotowania listy filmów do ponownego przeliczenia ocen
      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const movieIdsToUpdate = new Set<string>();
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.movieId) {
          movieIdsToUpdate.add(data.movieId);
        }
      });

      // 3. Usuwanie recenzji
      const deletePromises = querySnapshot.docs.map((reviewDoc) =>
        deleteDoc(reviewDoc.ref),
      );
      await Promise.all(deletePromises);

      // 4. Masowe przeliczenie nowej średniej ocen wszystkich dotkniętych produkcji
      const updateRatingPromises = Array.from(movieIdsToUpdate).map((movieId) =>
        updateMovieAverageRating(movieId),
      );
      await Promise.all(updateRatingPromises);

      // 5. Ostateczne skasowanie profilu
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);

      Alert.alert("Konto usunięte", "Twoje konto zostało pomyślnie usunięte.");
      router.replace("/account");
    } catch (error: any) {
      console.error("Błąd usuwania konta:", error);

      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        Alert.alert("Niepoprawne hasło", "Podane hasło jest błędne.");
      } else {
        Alert.alert(
          "Błąd",
          "Wystąpił problem podczas usuwania konta. Spróbuj ponownie później.",
        );
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>Ustawienia</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setIsEditingName(!isEditingName)}
        >
          <View style={styles.settingTextContainer}>
            <MaterialIcons name="edit" size={24} color="white" />
            <Text style={styles.settingText}>Zmień nazwę użytkownika</Text>
          </View>
          <MaterialIcons
            name={isEditingName ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24}
            color={AppColors.textGray}
          />
        </TouchableOpacity>

        {isEditingName && (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nowa nazwa użytkownika..."
              placeholderTextColor={AppColors.textGray}
              value={newName}
              onChangeText={setNewName}
              maxLength={20}
            />
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.5 }]}
              onPress={handleSaveUsername}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmianę"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleChangePassword}
        >
          <View style={styles.settingTextContainer}>
            <MaterialIcons name="lock-outline" size={24} color="white" />
            <Text style={styles.settingText}>Zmień hasło</Text>
          </View>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={24}
            color={AppColors.textGray}
          />
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <MaterialIcons name="info-outline" size={24} color="white" />
            <Text style={styles.settingText}>Wersja aplikacji</Text>
          </View>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="white" />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>

        {!showDeletePrompt ? (
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDeletePrompt(true);
            }}
          >
            <MaterialIcons
              name="delete-forever"
              size={24}
              color={AppColors.buttonDanger}
            />
            <Text style={styles.deleteAccountText}>Usuń konto</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.deletePromptContainer}>
            <Text style={styles.deletePromptWarning}>
              Ta operacja jest NIEODWRACALNA. Podaj swoje hasło, aby potwierdzić
              usunięcie konta.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz hasło..."
              placeholderTextColor={AppColors.textGray}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Powtórz hasło..."
              placeholderTextColor={AppColors.textGray}
              secureTextEntry
              value={confirmDeletePassword}
              onChangeText={setConfirmDeletePassword}
            />
            <View style={styles.deletePromptActions}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => {
                  setShowDeletePrompt(false);
                  setDeletePassword("");
                  setConfirmDeletePassword("");
                }}
              >
                <Text style={styles.cancelDeleteText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  isDeletingAccount && { opacity: 0.7 },
                ]}
                onPress={confirmAndDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmDeleteText}>
                    Potwierdź usunięcie
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3a3c4f",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  settingTextContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingText: { color: "white", fontSize: 16, fontWeight: "bold" },
  versionText: { color: AppColors.textGray, fontSize: 14, fontWeight: "bold" },
  editNameContainer: {
    backgroundColor: "#2e303f",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    marginTop: -5,
  },
  input: {
    backgroundColor: "#3a3c4f",
    color: "white",
    borderRadius: 5,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: { color: "white", fontWeight: "bold" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#3a3c4f",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutText: { color: "white", fontSize: 16, fontWeight: "bold" },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(204, 0, 44, 0.15)",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: AppColors.buttonDanger,
    height: 56,
  },
  deleteAccountText: {
    color: AppColors.buttonDanger,
    fontSize: 16,
    fontWeight: "bold",
  },
  deletePromptContainer: {
    backgroundColor: "rgba(204, 0, 44, 0.1)",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: AppColors.buttonDanger,
  },
  deletePromptWarning: {
    color: "white",
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  deletePromptActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    gap: 10,
  },
  cancelDeleteButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#3a3c4f",
    borderRadius: 5,
    alignItems: "center",
  },
  cancelDeleteText: { color: "white", fontWeight: "bold" },
  confirmDeleteButton: {
    flex: 1,
    padding: 12,
    backgroundColor: AppColors.buttonDanger,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: { color: "white", fontWeight: "bold" },
});
