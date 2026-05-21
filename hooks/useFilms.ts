import { getMediaFromFirestore } from '@/hooks/firebaseDatabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export const useFilms = () => {
    const [film, setFilm] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            const loadFilmsFromFirebase = async () => {
                try {
                    const fbData = await getMediaFromFirestore('movie');
                    
                    const mappedData = fbData.map((item: any) => ({
                        id: item.tmdb_id,
                        title: item.nazwa,
                        release_date: item.rok,
                        overview: item.overview || "Brak opisu",
                        poster_path: item.plakat,
                        backdrop_path: item.backdrop,
                        vote_average: item.vote_average || 0,
                        gatunki: item.gatunki ? item.gatunki.join(', ') : '',
                        type: 'movie'
                    }));
                    
                    setFilm(mappedData);
                } catch (err) {
                    setError('Nie udało się załadować filmów z Firebase.');
                } finally {
                    setIsLoading(false);
                }
            };
            loadFilmsFromFirebase();
        }, [])
    );

    return { film, isLoading, error };
};