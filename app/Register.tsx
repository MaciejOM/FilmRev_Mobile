//importy
import { globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "@/hooks/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tworzenie konta w Firebase Auth oraz inicjalizacja struktury profilu w Firestore
  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są identyczne!");
      return;
    }
    if (username === "" || email === "" || password === "") {
      Alert.alert("Błąd", "Wypełnij wszystkie pola!");
      return;
    }

    // Blokada zapobiegająca tworzeniu duplikatów przy wielokrotnym kliknięciu
    setIsSubmitting(true);

    try {
      // Rejestracja i automatyczne zalogowanie użytkownika przez Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Tworzenie dedykowanego dokumentu użytkownika w bazie z podstawowymi danymi
      await setDoc(doc(db, "users", user.uid), {
        nazwa_uzytkownika: username.toLowerCase(),
        email: email.toLowerCase(),
        data_dolaczenia: new Date().toLocaleDateString("pl-PL"),
        avatar: null,
      });

      // Bezpośrednie przekierowanie do aplikacji (omijające ekran powrotny)
      Alert.alert(
        "Witaj w FilmRev!",
        "Twoje konto zostało pomyślnie utworzone.",
        [{ text: "Zaczynamy", onPress: () => router.replace("/") }],
      );

      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Błąd", "Ten adres e-mail jest już zajęty!");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Błąd", "Hasło musi mieć co najmniej 6 znaków!");
      } else {
        Alert.alert("Błąd", "Nie udało się zarejestrować konta.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
          </Text>
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>Zarejestruj się</Text>
      </View>
      {/* formularz rejestracji */}
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Nazwa użytkownika"
          placeholderTextColor="#999"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Adres e-mail"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Hasło"
            placeholderTextColor="#999"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <MaterialIcons
              name={showPassword ? "visibility" : "visibility-off"}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Powtórz hasło"
            placeholderTextColor="#999"
            autoCapitalize="none"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <MaterialIcons
              name={showConfirmPassword ? "visibility" : "visibility-off"}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {/* Animacja ładowania chroniąca przed dublowaniem wysyłania formularza */}
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Zarejestruj się</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#27282e",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  input: {
    height: 50,
    backgroundColor: "white",
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#a83350",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    height: 55,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
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
  closeButtonText: { color: "white", fontSize: 20, fontWeight: "bold" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 5,
    marginBottom: 15,
    width: "100%",
    height: 50,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    fontSize: 16,
  },
  eyeIcon: { padding: 10 },
});
