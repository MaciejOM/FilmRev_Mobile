import { AppColors, globalStyles } from '@/constants/theme';
import { useFilms } from '@/hooks/useFilms';
import { useTV } from '@/hooks/useTV';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function index() {
   const router = useRouter();
   const { film, isLoading: isFilmLoading, error: filmError } = useFilms();
   const { Tv, isLoading: isTvLoading, error: tvError } = useTV();

   // Ładowanie filmów i seriali z bazy danych
    if (isFilmLoading || isTvLoading) {
        return (
            <View style={globalStyles.centerContainer}>
                <ActivityIndicator size="large" color={AppColors.primary} />
                <Text style={globalStyles.loadingText}>Pobieranie...</Text>
            </View>
        );
    }

    if ((filmError && film.length === 0) || (tvError && Tv.length === 0)) {
        return (
            <View style={globalStyles.centerContainer}>
                <Text style={globalStyles.headerText}>Błąd pobierania danych.</Text>
            </View>
        );
    }

    //Wyświetlanie listy filmów
    return (
        <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={globalStyles.header}>
                <Text style={globalStyles.headerText}>Główna</Text>
            </View>

            <Text style={styles.CategoryText}>Najnowsze filmy</Text>
            <FlatList
                data={film}
                keyExtractor={(item) => item.id.toString()}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={globalStyles.filmBanner}
                        onPress={() => router.push({
                                pathname: "/FilmDetail",
                                params: {id: item.id, title: item.title, release_date: item.release_date, overview: item.overview, backdrop: item.backdrop_path, gatunki: item.gatunki }
                            })}>
                            <Image source={{ uri: 'https://image.tmdb.org/t/p/w500/' + item.poster_path }} style={globalStyles.filmImage} />
                    </TouchableOpacity>
                )}
            />

            <Text style={[styles.CategoryText, { marginTop: 25 }]}>Najnowsze seriale</Text>
            <FlatList
                data={Tv}
                keyExtractor={(item) => item.id.toString()}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={globalStyles.filmBanner}
                        onPress={() => router.push({
                                pathname: "/FilmDetail",
                                params: {id: item.id, title: item.name, release_date: item.first_air_date, overview: item.overview, backdrop: item.backdrop_path, gatunki: item.gatunki  }
                            })}>
                            <Image source={{ uri: 'https://image.tmdb.org/t/p/w500/' + item.poster_path }} style={globalStyles.filmImage} />
                    </TouchableOpacity>
                )}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    CategoryText: {
        marginVertical: 10,
        marginLeft: 20,
        fontSize: 18,
        color: 'white',
    },
});