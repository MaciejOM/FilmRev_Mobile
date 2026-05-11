import { globalStyles } from '@/constants/theme';
import { getUserByUsername } from '@/hooks/Database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AccountScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {

        try {
            const user = await getUserByUsername(username);
            
            if (user) {
                if (user.haslo === password) { // 'haslo', bo tak nazwaliśmy to w SQLite
                    await AsyncStorage.setItem('currentUser', username.toLowerCase()); // Zachowujemy stan sesji
                    setPassword('');
                    router.replace('/Profile');
                } else {
                    Alert.alert('Błąd', 'Nieprawidłowe hasło!');
                }
            } else {
                Alert.alert('Błąd', 'Nie znaleziono konta!');
            }
        } catch (error) {
            console.error(error);
        }

    };

    return(
        <View style={globalStyles.container}>

            <View style={globalStyles.header}>
                <Text style={globalStyles.headerText}>Zaloguj się</Text>
            </View>

            <View style={styles.LoginContent}>
                <TextInput 
                    style={globalStyles.input} 
                    onChangeText={setUsername} 
                    value={username} 
                    placeholder="Nazwa użytkownika" 
                    autoCapitalize="none" />
                <TextInput 
                    style={globalStyles.input} 
                    secureTextEntry={true} 
                    onChangeText={setPassword} 
                    value={password} 
                    placeholder="Hasło" />
            
                <TouchableOpacity style={globalStyles.button} onPress={handleLogin}>
                    <Text style={globalStyles.buttonText}>Zaloguj się</Text>
                </TouchableOpacity>

                <Text style={styles.RegisterText}>Nie posiadasz konta?</Text>

                <TouchableOpacity style={globalStyles.button} onPress={() => router.push('/Register')}>
                    <Text style={globalStyles.buttonText}>Zarejestruj konto</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    LoginContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    RegisterText: {
        fontSize: 16,
        color: 'white',
        margin: 20,
    },
});