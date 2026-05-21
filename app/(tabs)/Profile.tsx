import { AppColors, globalStyles } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// IMPORTY FIREBASE
import { auth, db } from '@/hooks/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    //Załadowanie profilu użytkownika, jeśli jest zalogowany
    const loadUserData = async () => {
        try {
            const currentUser = auth.currentUser;

            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUser(userDocSnap.data());
                } else {
                    console.log("Nie znaleziono dokumentu użytkownika w Firestore");
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Błąd podczas ładowania profilu:", error);
            Alert.alert('Błąd', 'Nie udało się pobrać danych profilu.');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true); 
            loadUserData();
        }, [])
    );

    // Wylogowywanie
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.replace('/account'); 
        } catch (error) {
            console.error("Błąd podczas wylogowywania:", error);
            Alert.alert('Błąd', 'Nie udało się wylogować.');
        }
    };

    // Zmiana zdjęcia profilowego
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, 
            aspect: [1, 1],
            quality: 0.5, 
        });

        if (!result.canceled && auth.currentUser) {
            const newUri = result.assets[0].uri;
            
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    avatar: newUri
                });

                setUser((prev: any) => ({ ...prev, avatar: newUri }));
                Alert.alert('Sukces', 'Zdjęcie profilowe zostało zaktualizowane!');
            } catch (error) {
                console.error("Błąd zapisu avatara do Firestore:", error);
                Alert.alert('Błąd', 'Nie udało się zapisać zdjęcia w bazie danych.');
            }
        }
    };

    if (isLoading) {
        return (
            <View style={globalStyles.centerContainer}>
                <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
        );
    }

    // Jeśli użytkownik nie jest zalogowany, a znajdzie się na ekranie profilu, wyświetlany jest komunikat
    if (!user) {
        return (
            <View style={globalStyles.centerContainer}>
                <Text style={globalStyles.headerText}>Nie jesteś zalogowany</Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View style={globalStyles.header}>
                <Text style={globalStyles.headerText}>Twój profil</Text>
            </View>
                 
            <View style={styles.loginInfo}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarPlaceholderText}>+</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.editAvatarText}>Zmień zdjęcie</Text>

                <Text style={styles.usernameText}>{user.nazwa_uzytkownika}</Text>

                <Text style={styles.label}>Adres e-mail:</Text>
                <Text style={styles.value}>{user.email}</Text>

                <Text style={styles.label}>Data dołączenia:</Text>
                <Text style={styles.value}>{user.data_dolaczenia}</Text>

                <TouchableOpacity style={[globalStyles.buttonDanger, {width: '50%', marginTop: 30}]} onPress={handleLogout}>
                    <Text style={globalStyles.buttonText}>Wyloguj się</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    loginInfo: { flex: 1, alignItems: 'center', paddingTop: 30 },
    avatarContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#3a3c4f', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: AppColors.primary, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholderText: { fontSize: 40, color: AppColors.textGray },
    editAvatarText: { color: AppColors.textGray, fontSize: 12, marginBottom: 20, textDecorationLine: 'underline' },
    usernameText: { fontSize: 26, color: 'white', fontWeight: 'bold', marginBottom: 20 },
    label: { color: AppColors.textGray, fontSize: 14, marginTop: 10 },
    value: { color: 'white', fontSize: 18, fontWeight: '500', marginBottom: 10 },
});