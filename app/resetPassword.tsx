// Importy
import { globalStyles } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "@/hooks/firebaseConfig";
import NetInfo from "@react-native-community/netinfo";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetowanie hasła
  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    if (cleanEmail === "") {
      Alert.alert(
        "Brak e-maila",
        "Podaj adres e-mail, na który założono konto.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("network-error");
      }

      // Wysyłanie wiadomości na podany adres e-mail
      await sendPasswordResetEmail(auth, cleanEmail);
      Alert.alert(
        "Sprawdź skrzynkę",
        "Wysłaliśmy link do resetowania hasła na podany adres e-mail (sprawdź również folder SPAM).",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      console.error(error);
      if (error.message === "network-error") {
        Alert.alert("Brak połączenia", "Sprawdź połączenie z internetem i spróbuj ponownie.");
      } else if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
         Alert.alert("Błąd", "Nie znaleziono konta z podanym adresem e-mail.");
      } else {
         Alert.alert("Błąd", "Wystąpił problem z wysłaniem linku. Spróbuj ponownie później.");
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
          <MaterialIcons name="keyboard-arrow-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={globalStyles.headerText2}>Resetowanie hasła</Text>
      </View>
      <View style={styles.container}>
        <Text style={styles.RegisterText}>
          Podaj adres e-mail, na którym zostało założone konto. Wyślemy
          wiadomość z krokami do zresetowania hasła.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Adres e-mail"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[styles.button, isSubmitting && { opacity: 0.7 }]}
          onPress={handleResetPassword}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Wysyłanie..." : "Resetuj hasło"}
          </Text>
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
    color: "black",
  },
  button: {
    backgroundColor: "#a83350",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
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
  RegisterText: { fontSize: 16, color: "white", margin: 20, textAlign: "center", lineHeight: 22 },
});