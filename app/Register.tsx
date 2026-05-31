import { globalStyles } from '@/constants/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { auth, db } from '@/hooks/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne!');
            return;
        }
        if (username === '' || email === '' || password === '') {
            Alert.alert('Błąd', 'Wypełnij wszystkie pola!');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                nazwa_uzytkownika: username.toLowerCase(),
                email: email.toLowerCase(),
                data_dolaczenia: new Date().toLocaleDateString('pl-PL'),
                avatar: null
            });
            
            Alert.alert('Sukces', 'Konto zostało utworzone! Możesz się teraz zalogować.', [
                 { text: "OK", onPress: () => router.back() }
            ]);
            setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
        } catch (error: any) {

            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Błąd', 'Ten adres e-mail jest już zajęty!');
            } else if (error.code === 'auth/weak-password') {
                Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków!');
            } else {
                Alert.alert('Błąd', 'Nie udało się zarejestrować konta.');
            }
        }
    };

    return (
        <View style={globalStyles.container}>
            <View style={globalStyles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Text style={styles.closeButtonText}>◀</Text>
                </TouchableOpacity>
                <Text style={globalStyles.headerText2}>Zarejestruj się</Text>
            </View>
            <View style={styles.container}>

                <TextInput style={styles.input} placeholder="Nazwa użytkownika" placeholderTextColor="#999" autoCapitalize="none" value={username} onChangeText={setUsername} />
            <TextInput style={styles.input} placeholder="Adres e-mail" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Hasło" placeholderTextColor="#999" autoCapitalize="none" secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput style={styles.input} placeholder="Powtórz hasło" placeholderTextColor="#999" autoCapitalize="none" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Zarejestruj się</Text>
            </TouchableOpacity>
            </View>
            
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#27282e', justifyContent: 'center', paddingHorizontal: 20 },
    input: { height: 50, backgroundColor: 'white', borderRadius: 5, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
    button: { backgroundColor: '#2c40b4', paddingVertical: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
        closeButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    closeButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
});