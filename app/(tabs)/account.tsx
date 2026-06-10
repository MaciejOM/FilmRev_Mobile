import { AppColors } from "@/constants/theme";
import { auth } from "@/hooks/firebaseConfig";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Required so the browser auth session closes cleanly and returns to the app
WebBrowser.maybeCompleteAuthSession();

export default function AccountScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // expo-auth-session Google provider — works in Expo Go AND compiled APK
  const [_request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => {
          setIsSubmitting(false);
          router.replace("/Profile");
        })
        .catch((err) => {
          console.error("Firebase Google auth error:", err);
          setIsSubmitting(false);
          Alert.alert("Błąd", "Nie udało się zalogować przez Google.");
        });
    } else if (response?.type === "error") {
      setIsSubmitting(false);
      Alert.alert("Błąd", "Logowanie przez Google zostało przerwane.");
    } else if (response?.type === "dismiss") {
      setIsSubmitting(false);
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert("Brak sieci", "Sprawdź połączenie z internetem i spróbuj ponownie.");
      return;
    }
    setIsSubmitting(true);
    await promptAsync();
  };

  // Standardowe logowanie e-mailem i hasłem
  const handleLogin = async () => {
    if (email.trim() === "" || password === "") {
      Alert.alert("Błąd", "Wypełnij wszystkie pola!");
      return;
    }

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
        Alert.alert("Brak połączenia", "Sprawdź połączenie z internetem i spróbuj ponownie.");
      } else {
        Alert.alert("Błąd", "Nieprawidłowy e-mail lub hasło!");
      }
    } finally {
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

        <TouchableOpacity
          style={[styles.buttonGoogle, isSubmitting && { opacity: 0.7 }]}
          onPress={handleGoogleLogin}
          disabled={isSubmitting}
        >
          <MaterialIcons name="login" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Zaloguj przez Google</Text>
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
  buttonGoogle: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#4285F4",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
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
