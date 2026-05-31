import { AppColors, globalStyles } from '@/constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { auth } from '@/hooks/firebaseConfig';
import { deleteFirebaseReview, getFirebaseReviewsForFilm, toggleFirebaseReviewLike } from '@/hooks/firebaseDatabase';

export default function FilmDetail() {
    const params = useLocalSearchParams();
    const router = useRouter();
    
    // Zbieramy parametry - dodaliśmy opcjonalny 'type', by odróżnić filmy od seriali
    const { id, title, release_date, overview, backdrop, gatunki, type } = params;
    const tmdbId = Number(id); 

    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    
    const [rating, setRating] = useState(0); 
    const [comment, setComment] = useState('');

    const loadData = async () => {
        const userAuth = auth.currentUser;
        setCurrentUser(userAuth ? userAuth.uid : null);

        if (tmdbId) {
            const documentId = `${type || 'movie'}_${tmdbId}`;
            const fetchedReviews = await getFirebaseReviewsForFilm(documentId);
            setReviews(fetchedReviews);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [tmdbId])
    );

    const handleAddReviewPress = () => {
        if (!currentUser) {
            Alert.alert('Brak dostępu', 'Musisz być zalogowany, aby dodać recenzję.', [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Zaloguj się', onPress: () => router.push('/account') }
            ]);
            return;
        }
        router.push({
            pathname: '/Review',
            params: { id: tmdbId, type: type || 'movie' }
        });
    };
    
    // Usuwanie Recenzji
    const handleDeleteReview = (reviewId: string) => {
        Alert.alert(
            "Usuń recenzję",
            "Czy na pewno chcesz usunąć swoją recenzję?",
            [
                { text: "Anuluj", style: "cancel" },
                { 
                    text: "Usuń", 
                    style: "destructive", 
                    onPress: async () => {
                        const result = await deleteFirebaseReview(reviewId);
                        if (result.success) {
                            Alert.alert('Sukces', 'Recenzja została usunięta.');
                            loadData();
                        } else {
                            Alert.alert('Błąd', 'Wystąpił problem z usunięciem recenzji.');
                        }
                    }
                }
            ]
        );
    };

    const totalReviews = reviews.length;
    
    // Obliczanie średniej ocen
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((sum, rev) => sum + rev.ocena, 0) / totalReviews).toFixed(1) 
        : 0;

    // Wyświetlanie liczby recenzji
    const getOpinionsLabel = (count: number) => {
        if (count === 1) return 'opinia';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'opinie';
        return 'opinii';
    };

    // Wyświetlanie gwiazdek przy ocenie
    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Text style={[styles.star, star <= rating ? styles.starSelected : styles.starUnselected]}>
                            ★
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const handleLikePress = async (reviewId: string, currentLikes: string[] = []) => {
        if (!currentUser) {
            Alert.alert('Zaloguj się', 'Musisz być zalogowany, aby polubić recenzję.');
            return;
        }

        const hasLiked = currentLikes.includes(currentUser);

        setReviews(prevReviews => prevReviews.map(rev => {
            if (rev.id === reviewId) {
                const newLikes = hasLiked
                    ? (rev.likes || []).filter((id: string) => id !== currentUser)
                    : [...(rev.likes || []), currentUser];
                return { ...rev, likes: newLikes };
            }
            return rev;
        }));

        await toggleFirebaseReviewLike(reviewId, currentUser);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={globalStyles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Text style={styles.closeButtonText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.WatchButton}>
                    <Text style={styles.WatchButtonText}>👁</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.LikeButton}>
                    <Text style={styles.LikeButtonText}>❤</Text>
                </TouchableOpacity>
            </View>
            <ImageBackground 
                source={{ uri: 'https://image.tmdb.org/t/p/w500/' + backdrop }} 
                style={styles.backdrop}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['transparent', 'rgba(37, 39, 54, 0.5)', AppColors.background]}
                    style={styles.gradient}
                />

                

                <View style={styles.headerTextContainer}>
                    <Text style={styles.titleText}>{title}</Text>
                    <Text style={styles.dateText}>Premiera: {release_date}</Text>
                    {gatunki && <Text style={styles.genreText}>{gatunki}</Text>}
                </View>
            </ImageBackground>

            <View style={styles.detailsContainer}>
                <Text style={styles.sectionTitle}>Opis fabuły</Text>
                <Text style={styles.overviewText}>{overview}</Text>
            </View>

            <View style={styles.reviewsSection}>
                <View style={styles.reviewsHeaderContainer}>
                    <TouchableOpacity style={styles.AddButton} onPress={handleAddReviewPress}>
                    <Text style={styles.AddButtonText}>+</Text>
                </TouchableOpacity>
                    <Text style={styles.reviewSectionTitle}>Recenzje</Text>
                    {totalReviews > 0 && (
                        <View style={styles.averageRatingContainer}>
                            <Text style={styles.averageRatingText}>{averageRating}</Text>
                            <Text style={styles.averageRatingStar}>★</Text>
                            <Text style={styles.totalReviewsText}>
                                ({totalReviews} {getOpinionsLabel(totalReviews)})
                            </Text>
                        </View>
                    )}
                </View>

               

                {reviews.length === 0 ? (
                    <Text style={styles.noReviewsText}>Brak recenzji. Bądź pierwszą osobą, która oceni ten tytuł!</Text>
                ) : (
                    reviews.map((rev) => (
                        <View key={rev.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                {rev.avatar ? (
                                    <Image source={{ uri: rev.avatar }} style={styles.reviewAvatar} />
                                ) : (
                                    <View style={styles.reviewAvatarPlaceholder}>
                                        <Text style={{color: 'white'}}>{rev.nazwa_uzytkownika.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <Text style={styles.reviewAuthor}>{rev.nazwa_uzytkownika}</Text>

                                {rev.isEdited && (
                                    <Text style={{ color: AppColors.textGray, fontSize: 12, marginRight: 10, fontStyle: 'italic' }}>edytowano</Text>
                                )}
                                
                                <View style={styles.reviewScoreContainer}>
                                    <Text style={styles.reviewScoreText}>{rev.ocena}/5 </Text>
                                    <View style={{ flexDirection: 'row' }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Text key={star} style={star <= rev.ocena ? styles.starSelectedSmall : styles.starUnselectedSmall}>
                                                ★
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                                
                            </View>
                            
                            
                            {rev.tags && rev.tags.length > 0 && (
                                <View style={styles.reviewTagsContainer}>
                                    {rev.tags.map((tag: string) => (
                                        <View key={tag} style={styles.reviewTagBadge}>
                                            <Text style={styles.reviewTagText}>{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.reviewComment}>{rev.tresc}</Text>
                            
                            <View style={styles.reviewFooter}>
                                <View style={styles.reviewActionsLeft}>
                                    {currentUser && currentUser === rev.userId && (
                                        <>
                                            <TouchableOpacity 
                                                style={[styles.deleteButton, { marginTop: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} 
                                                onPress={() => router.push({
                                                    pathname: '/EditReview',
                                                    params: { 
                                                        reviewId: rev.id,
                                                        movieId: `${type || 'movie'}_${tmdbId}`,
                                                        initialRating: rev.ocena,
                                                        initialComment: rev.tresc,
                                                        initialTags: JSON.stringify(rev.tags || []) 
                                                    }
                                                })}
                                            >
                                                <Text style={[styles.deleteButtonText, { color: 'white' }]}>Edytuj</Text>
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={[styles.deleteButton, { marginTop: 0 }]} 
                                                onPress={() => handleDeleteReview(rev.id)}
                                            >
                                                <Text style={styles.deleteButtonText}>Usuń</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>

                                {/* PRZYCISK SERDUSZKA */}
                                <TouchableOpacity 
                                    style={styles.likeButton} 
                                    onPress={() => handleLikePress(rev.id, rev.likes || [])}
                                >
                                    <Text style={[styles.heartIcon, rev.likes?.includes(currentUser) && styles.heartIconActive]}>
                                        {rev.likes?.includes(currentUser) ? '♥' : '♡'}
                                    </Text>
                                    <Text style={styles.likeCountText}>
                                        {rev.likes ? rev.likes.length : 0}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {/* --- KONIEC STOPKI --- */}
                        </View>
                    ))
                )}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    backdrop: { width: '100%', height: 450, justifyContent: 'flex-end' },
    gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
    closeButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    closeButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
    AddButton: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    AddButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
    LikeButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    LikeButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
    WatchButton: { position: 'absolute', top: 50, right: 80, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    WatchButtonText: { color: 'white', fontSize: 30, fontWeight: 'bold' },
    headerTextContainer: { paddingHorizontal: 20, paddingBottom: 20, zIndex: 5 },
    titleText: { fontSize: 32, fontWeight: 'bold', color: 'white', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
    dateText: { fontSize: 16, color: '#ddd', marginTop: 5, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
    genreText: { fontSize: 14, color: AppColors.primary, marginTop: 5, fontStyle: 'italic', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
    detailsContainer: { padding: 20, marginTop: -10 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    reviewSectionTitle: {left: 50, fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    overviewText: { fontSize: 16, color: '#ccc', lineHeight: 24 },

    reviewTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
        gap: 6,
    },
    reviewTagBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    reviewTagText: {
        color: '#ccc',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    
    reviewsSection: { paddingHorizontal: 20, marginTop: 10 },
    reviewsHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    averageRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    averageRatingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    averageRatingStar: {
        fontSize: 22,
        color: '#FFD700',
        marginLeft: 4,
        marginRight: 8,
    },
    totalReviewsText: {
        fontSize: 14,
        color: AppColors.textGray,
    },
    addReviewCard: { backgroundColor: '#3a3c4f', padding: 15, borderRadius: 10, marginBottom: 25 },
    addReviewTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    starsContainer: { flexDirection: 'row', marginBottom: 15 },
    star: { fontSize: 35, marginRight: 5 },
    starSelected: { color: '#FFD700' },
    starUnselected: { color: '#555' },
    reviewInput: { backgroundColor: AppColors.inputBackground, borderRadius: 5, padding: 10, height: 80, textAlignVertical: 'top' },
    noReviewsText: { color: AppColors.textGray, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
    reviewCard: { backgroundColor: '#3a3c4f', padding: 15, borderRadius: 10, marginBottom: 15 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    reviewAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
    reviewAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: AppColors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    reviewAuthor: { color: 'white', fontWeight: 'bold', fontSize: 16, flex: 1 },
    
    reviewScoreContainer: { flexDirection: 'row', alignItems: 'center' },
    reviewScoreText: { color: '#FFD700', fontWeight: 'bold', marginRight: 5 },
    starSelectedSmall: { color: '#FFD700', fontSize: 16 },
    starUnselectedSmall: { color: '#555', fontSize: 16 },
    
    reviewComment: { color: '#ddd', lineHeight: 20 },
    
    deleteButton: {
        alignSelf: 'flex-start',
        marginTop: 15,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(228, 48, 87, 0.2)',
        borderRadius: 5,
    },
    deleteButtonText: {
        color: AppColors.buttonDanger,
        fontSize: 12,
        fontWeight: 'bold',
    },
    reviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        paddingTop: 10,
    },
    reviewActionsLeft: {
        flexDirection: 'row',
        gap: 10,
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 5,
    },
    heartIcon: {
        fontSize: 22,
        color: AppColors.textGray,
    },
    heartIconActive: {
        color: AppColors.primary,
    },
    likeCountText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});