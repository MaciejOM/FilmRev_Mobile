import { AppColors } from "@/constants/theme";
import { auth } from "@/hooks/firebaseConfig";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AccountScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Standardowe logowanie e-mailem i hasłem
  const handleLogin = async () => {
    if (email.trim() === "" || password === "") {
      Alert.alert("Błąd", "Wypełnij wszystkie pola!");
      return;
    }

    // "Wyłącza" przycisk logowania w momencie wciśnięcia, aby zapobiec niepotrzebnym wciśnięciom
    // w trakcie walidacji danych.
    setIsSubmitting(true);

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("network-error");
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);

      setPassword("");
      router.replace("/Profile");
    } catch (error: any) {
      console.error(error);
      if (error.message === "network-error") {
        Alert.alert(
          "Brak połączenia",
          "Sprawdź połączenie z internetem i spróbuj ponownie.",
        );
      } else {
        Alert.alert("Błąd", "Nieprawidłowy e-mail lub hasło!");
      }
    } finally {
      // Kiedy walidacja się skończy, przycisk logowania jest ponownie dostępny
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.Container}>
      <View style={styles.Header}>
        <Text style={styles.HeaderText}>Zaloguj się</Text>
      </View>

      <View style={styles.Login}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="Adres e-mail"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
            value={password}
            placeholder="Hasło"
            placeholderTextColor="#999"
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

        <View style={styles.optionsRow}>
          <TouchableOpacity onPress={() => router.push("/resetPassword")}>
            <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.RegisterText}>Nie posiadasz konta?</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/Register")}
        >
          <Text style={styles.buttonText}>Zarejestruj konto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: "#27282e" },
  Header: { width: "100%", height: 100, backgroundColor: "#121212" },
  HeaderText: {
    fontWeight: "bold",
    marginTop: 55,
    marginLeft: 20,
    fontSize: 24,
    color: "white",
  },
  Login: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "white",
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "black",
  },
  RegisterText: { fontSize: 16, color: "white", margin: 20 },
  button: {
    width: "100%",
    backgroundColor: "#a83350",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
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
    color: "black",
  },
  eyeIcon: { padding: 10 },
});
