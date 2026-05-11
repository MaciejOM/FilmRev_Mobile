import { AppColors, globalStyles } from '@/constants/theme';
import { getUserByUsername, updateUserAvatar } from '@/hooks/Database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUserData = async () => {
        try {
            // AsyncStorage służy nam już tylko do trzymania "sesji" (kto jest zalogowany)
            const activeUsername = await AsyncStorage.getItem('currentUser');
            if (activeUsername) {
                // Całą resztę danych pobieramy bezpiecznie z SQLite
                const dbUser = await getUserByUsername(activeUsername);
                if (dbUser) {
                    setUser(dbUser);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error(error);
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

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('currentUser');
            setUser(null);
            router.replace('/account'); 
        } catch (error) {
            console.error(error);
        }
    };

    const pickImage = async () => {
        // Prośba o otwarcie biblioteki zdjęć
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Pozwala przyciąć zdjęcie do kwadratu
            aspect: [1, 1],
            quality: 0.5, // Kompresja, aby nie zapchać bazy
        });

        if (!result.canceled && user) {
            const newUri = result.assets[0].uri;
            // Zapisujemy w bazie
            const updated = await updateUserAvatar(user.nazwa_uzytkownika, newUri);
            if (updated) {
                // Aktualizujemy stan lokalny, aby odświeżyć obrazek od razu
                setUser({ ...user, avatar: newUri });
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
                {/* ZDJĘCIE PROFILOWE */}
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
    loginInfo: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 30,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#3a3c4f',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: AppColors.primary,
        overflow: 'hidden', // Upewnia się, że zdjęcie nie wychodzi poza koło
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholderText: {
        fontSize: 40,
        color: AppColors.textGray,
    },
    editAvatarText: {
        color: AppColors.textGray,
        fontSize: 12,
        marginBottom: 20,
        textDecorationLine: 'underline',
    },
    usernameText: {
        fontSize: 26,
        color: 'white',
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        color: AppColors.textGray,
        fontSize: 14,
        marginTop: 10,
    },
    value: {
        color: 'white',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 10,
    },
});