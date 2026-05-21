import { auth } from '@/hooks/firebaseConfig';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AccountScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (email === '' || password === '') {
            Alert.alert('Błąd', 'Wypełnij wszystkie pola!');
            return;
        }

        // Weryfikacja logowania
        try {
            await signInWithEmailAndPassword(auth, email, password);
            
            setEmail('');
            setPassword('');
            router.replace('/Profile');
            
        } catch (error: any) {
            console.error(error);
            Alert.alert('Błąd', 'Nieprawidłowy e-mail lub hasło!');
        }
    };

    return(
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
                <TextInput 
                    style={styles.input} 
                    secureTextEntry={true} 
                    onChangeText={setPassword} 
                    value={password} 
                    placeholder="Hasło" 
                    placeholderTextColor="#999" 
                />
            
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Zaloguj się</Text>
                </TouchableOpacity>

                <Text style={styles.RegisterText}>Nie posiadasz konta?</Text>

                <TouchableOpacity style={styles.button} onPress={() => router.push('/Register')}>
                    <Text style={styles.buttonText}>Zarejestruj konto</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    Container:{ flex: 1, backgroundColor: '#27282e' },
    Header:{ width: '100%', height: 100, backgroundColor: '#121212' },
    HeaderText: { fontWeight: 'bold', marginTop: 55, marginLeft: 20, fontSize: 24, color: 'white' },
    Login: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    input: { width:'100%', height: 50, backgroundColor: 'white', borderRadius: 5, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
    RegisterText: { fontSize: 16, color: 'white', margin: 20 },
    button: { width:'100%', backgroundColor: '#2c40b4', paddingVertical: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});