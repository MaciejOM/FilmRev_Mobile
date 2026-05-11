import { globalStyles } from '@/constants/theme';

import { addUser } from '@/hooks/Database';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    //Sprawdzanie poprawności formularza
    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne!');
            return;
        }
        if (username === '' || email === '' || password === '') {
            Alert.alert('Błąd', 'Wypełnij wszystkie pola!');
            return;
        }

        // Wysyłanie danych z formularza do bazy danych
        try {
            const response = await addUser(username, email, password, new Date().toLocaleDateString('pl-PL'));
            
            if (response.success) {
                Alert.alert('Sukces', 'Konto zostało utworzone!', [{ text: "OK", onPress: () => router.back() }]);
                setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
            } else {
                Alert.alert('Błąd', 'Nazwa użytkownika lub e-mail są już zajęte!');
            }
        } catch (error) {
            Alert.alert('Błąd', 'Wystąpił problem z bazą danych.');
        }
    };

    return (
        <View style={globalStyles.container}>

            <View style={globalStyles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                                    <Text style={styles.closeButtonText}>←</Text>
                                </TouchableOpacity>
                <Text style={globalStyles.headerText}>Zarejestruj się</Text>
            </View>

            <View style={globalStyles.authContainer}>
                
                <TextInput style={globalStyles.input} placeholder="Nazwa użytkownika" placeholderTextColor="#999" autoCapitalize="none" value={username} onChangeText={setUsername} />
                <TextInput style={globalStyles.input} placeholder="Adres e-mail" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <TextInput style={globalStyles.input} placeholder="Hasło" placeholderTextColor="#999" autoCapitalize="none" secureTextEntry value={password} onChangeText={setPassword} />
                <TextInput style={globalStyles.input} placeholder="Powtórz hasło" placeholderTextColor="#999" autoCapitalize="none" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

                <TouchableOpacity style={globalStyles.button} onPress={handleRegister}>
                    <Text style={globalStyles.buttonText}>Zarejestruj się</Text>
                </TouchableOpacity>

            </View> 
        </View>
    );
}

const styles = StyleSheet.create({
closeButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    closeButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
});