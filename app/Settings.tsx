import { AppColors, globalStyles } from "@/constants/theme";
import { auth, db } from "@/hooks/firebaseConfig";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { deleteUser, sendPasswordResetEmail, signOut } from "firebase/auth";
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
  Alert,
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

  // Wylogowywanie
  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
              await signOut(auth);
              router.replace("/account");
            } catch (error) {
              console.error(error);
              Alert.alert("Błąd", "Nie udało się wylogować.");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Zmiana hasła (wysyłka e-maila)
  const handleChangePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          username: newName.trim(),
        }),
      );

      await Promise.all(updatePromises);

      Alert.alert(
        "Sukces",
        "Twoja nazwa użytkownika została zaktualizowana we wszystkich recenzjach.",
      );
      setIsEditingName(false);
      setNewName("");
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Błąd",
        "Nie udało się zmienić nazwy użytkownika we wszystkich miejscach.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Usuwanie konta wraz ze wszystkimi recenzjami
  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      "Usuwanie konta",
      "Ta operacja jest NIEODWRACALNA. Stracisz dostęp do swojego konta, ulubionych oraz trwale usuniesz wszystkie swoje recenzje. Czy na pewno chcesz usunąć konto?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń trwale",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              try {
                const reviewsRef = collection(db, "reviews");
                const q = query(reviewsRef, where("userId", "==", user.uid));
                const querySnapshot = await getDocs(q);

                const deletePromises = querySnapshot.docs.map((reviewDoc) =>
                  deleteDoc(reviewDoc.ref),
                );
                await Promise.all(deletePromises);

                await deleteDoc(doc(db, "users", user.uid));

                await deleteUser(user);

                Alert.alert(
                  "Konto usunięte",
                  "Twoje konto oraz wszystkie recenzje zostały pomyślnie wykasowane.",
                );
                router.replace("/account");
              } catch (error: any) {
                console.error("Błąd usuwania konta:", error);

                if (error.code === "auth/requires-recent-login") {
                  Alert.alert(
                    "Wymagane ponowne logowanie",
                    "Ze względów bezpieczeństwa wyloguj się i zaloguj ponownie, aby móc usunąć swoje konto.",
                  );
                } else {
                  Alert.alert(
                    "Błąd",
                    "Nie udało się usunąć konta. Spróbuj ponownie później.",
                  );
                }
              }
            }
          },
        },
      ],
    );
  };

  return (
    <View style={globalStyles.container}>
      {/* Nagłówek */}
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
        {/* Zmiana nazwy użytkownika */}
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

        {/* Zmiana hasła */}
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

        {/* Wersja aplikacji */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <MaterialIcons name="info-outline" size={24} color="white" />
            <Text style={styles.settingText}>Wersja aplikacji</Text>
          </View>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>

        {/* Wylogowywanie */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="white" />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>

        {/* Usuwanie konta */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
        >
          <MaterialIcons
            name="delete-forever"
            size={24}
            color={AppColors.buttonDanger}
          />
          <Text style={styles.deleteAccountText}>Usuń konto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
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
  settingTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  versionText: {
    color: AppColors.textGray,
    fontSize: 14,
    fontWeight: "bold",
  },
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
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
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
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
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
  },
  deleteAccountText: {
    color: AppColors.buttonDanger,
    fontSize: 16,
    fontWeight: "bold",
  },
});
