import { globalStyles } from '@/constants/theme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function Watchlist() {
    

    return (
        <View style={globalStyles.container}>
            <View style={globalStyles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Text style={styles.closeButtonText}>◀</Text>
                </TouchableOpacity>
                <Text style={globalStyles.headerText2}>Do obejrzenia</Text>
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