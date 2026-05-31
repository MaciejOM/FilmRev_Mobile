import { AppColors, globalStyles } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { auth } from '@/hooks/firebaseConfig';
import { updateFirebaseReview } from '@/hooks/firebaseDatabase';

const AVAILABLE_TAGS = ['Bez spoilerów', 'Pierwsze wrażenia', 'Analiza fabuły', 'Krótka opinia', 'Zaskakujące zakończenie'];

export default function EditReview() {
    const router = useRouter();
    
    const { reviewId, movieId, initialRating, initialComment, initialTags } = useLocalSearchParams();

    const [rating, setRating] = useState(Number(initialRating) || 0); 
    const [comment, setComment] = useState((initialComment as string) || '');
    const [selectedTags, setSelectedTags] = useState<string[]>(
        initialTags ? JSON.parse(initialTags as string) : []
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        const userAuth = auth.currentUser;
        
        if (!userAuth) return;
        if (rating === 0) {
            Alert.alert('Błąd', 'Zaznacz ocenę gwiazdkową!');
            return;
        }
        if (comment.trim() === '') {
            Alert.alert('Błąd', 'Treść recenzji nie może być pusta!');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await updateFirebaseReview(
                reviewId as string,
                movieId as string,
                rating, 
                comment,
                selectedTags 
            );
            
            if (result.success) {
                Alert.alert('Sukces', 'Recenzja została zaktualizowana!', [
                    { text: 'OK', onPress: () => router.back() } 
                ]);
            } else {
                Alert.alert('Błąd', 'Nie udało się edytować recenzji.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Błąd', 'Wystąpił problem z połączeniem.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={globalStyles.container}>
            <View style={globalStyles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Text style={styles.closeButtonText}>◀</Text>
                </TouchableOpacity>
                <Text style={[globalStyles.headerText, { marginLeft: 70, marginTop: 55, fontSize: 20 }]}>Edytuj recenzję</Text>
                <TouchableOpacity 
                    style={[styles.AcceptButton, isSubmitting && { opacity: 0.5 }]} 
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.AcceptButtonText}>✅</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.editorContainer}>
                <Text style={styles.label}>Twoja ocena:</Text>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Text style={[styles.star, star <= rating ? styles.starSelected : styles.starUnselected]}>★</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Tagi (opcjonalnie):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                    {AVAILABLE_TAGS.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                            <TouchableOpacity key={tag} style={[styles.tagChip, isSelected && styles.tagChipSelected]} onPress={() => toggleTag(tag)}>
                                <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.label}>Napisz co myślisz:</Text>
                <TextInput
                    style={styles.reviewInput}
                    placeholder="Ten film to istne arcydzieło, ponieważ..."
                    placeholderTextColor={AppColors.textGray}
                    multiline
                    value={comment}
                    onChangeText={setComment}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    closeButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    closeButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
    AcceptButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    AcceptButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    editorContainer: { padding: 20, flex: 1 },
    label: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    starsContainer: { flexDirection: 'row', marginBottom: 20 },
    star: { fontSize: 45, marginRight: 10 },
    starSelected: { color: '#FFD700' },
    starUnselected: { color: '#555' },
    tagsScroll: { marginBottom: 20, maxHeight: 40 },
    tagChip: { backgroundColor: '#3a3c4f', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#555', justifyContent: 'center' },
    tagChipSelected: { backgroundColor: 'rgba(228, 48, 87, 0.2)', borderColor: AppColors.primary },
    tagText: { color: '#ccc', fontSize: 14 },
    tagTextSelected: { color: AppColors.primary, fontWeight: 'bold' },
    reviewInput: { backgroundColor: '#3a3c4f', borderRadius: 10, padding: 15, height: 250, textAlignVertical: 'top', color: 'white', fontSize: 16, borderWidth: 1, borderColor: '#555', marginBottom: 40 },
});