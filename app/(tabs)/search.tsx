import { AppColors, globalStyles } from '@/constants/theme';
import { useFilms } from '@/hooks/useFilms';
import { useTV } from '@/hooks/useTV';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function FilmList() {
    const[searchQuery, setSearchQuery] = React.useState('');
    const router = useRouter();

    const { film, isLoading: isFilmLoading, error: filmError } = useFilms();
    const { Tv, isLoading: isTvLoading, error: tvError } = useTV();

    const isLoading = isFilmLoading || isTvLoading;
    const hasError = (filmError && film.length === 0) && (tvError && Tv.length === 0);
    const isSearchEmpty = searchQuery.trim() === '';

    //Łączenie danych z tabeli filmów i seriali w jedno
    const combinedData = [
        ...film.map(item => ({
            ...item,
            searchTitle: item.title,
            searchDate: item.release_date,
            type: 'movie'
        })),
        ...Tv.map(item => ({
            ...item,
            searchTitle: item.name,
            searchDate: item.first_air_date,
            type: 'tv'
        }))
    ];

    const mediaFilter = isSearchEmpty 
        ? [] 
        : combinedData.filter(item => 
            item.searchTitle.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );


return (
        <View style={globalStyles.container}>
            <View style={globalStyles.header}>
                <Text style={globalStyles.headerText}>Wyszukaj</Text>
            </View>

            <TextInput
                style={[globalStyles.input, styles.searchInput]}
                placeholder='Co chciałbyś zobaczyć?'
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={AppColors.textGray}
            />

            {isLoading ? (
                <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
            ) : hasError ? (
                <Text style={globalStyles.emptyText}>Błąd pobierania danych.</Text>
            ) : isSearchEmpty ? (
                <Text style={globalStyles.emptyText}>Wpisz tytuł, aby rozpocząć wyszukiwanie.</Text>
            ) : (
                <FlatList 
                    data={mediaFilter}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    horizontal={true}
                    contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>Brak wyników.</Text>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={globalStyles.filmBanner} 
                            onPress={() => router.push({
                                pathname: "/FilmDetail",
                                params: { 
                                    id: item.id,
                                    title: item.searchTitle,
                                    release_date: item.searchDate,
                                    overview: item.overview, 
                                    backdrop: item.backdrop_path, 
                                    gatunki: item.gatunki
                                }
                            })}
                        >
                            <Image 
                                source={{ uri: 'https://image.tmdb.org/t/p/w500/' + item.poster_path }} 
                                style={globalStyles.filmImage} 
                            />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    searchInput: {
        width: 'auto',
        marginHorizontal: 12,
        marginTop: 12,
    }
});