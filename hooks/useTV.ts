import { getMediaFromFirestore } from '@/hooks/firebaseDatabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export const useTV = () => {
    const [Tv, setTv] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            const loadTvFromFirebase = async () => {
                try {
                    const fbData = await getMediaFromFirestore('tv');
                    
                    const mappedData = fbData.map((item: any) => ({
                        id: item.tmdb_id,
                        name: item.nazwa,
                        first_air_date: item.rok,
                        overview: item.overview || "Brak opisu",
                        poster_path: item.plakat,
                        backdrop_path: item.backdrop,
                        vote_average: item.vote_average || 0,
                        gatunki: item.gatunki ? item.gatunki.join(', ') : '',
                        type: 'tv'
                    }));
                    
                    setTv(mappedData);
                } catch (err) {
                    setError('Nie udało się załadować seriali z Firebase.');
                } finally {
                    setIsLoading(false);
                }
            };
            loadTvFromFirebase();
        }, [])
    );

    return { Tv, isLoading, error };
};