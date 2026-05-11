import { getMediaByType } from '@/hooks/Database';
import { useEffect, useState } from 'react';

export const useTV = () => {
    const [Tv, setTv] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTvFromDB = async () => {
            try {
                // Pobieranie seriali z SQL
                const dbData = await getMediaByType('tv');
                
                // Mapowanie kluczy dla wyszukiwarki
                const mappedData = dbData.map((item: any) => ({
                    id: item.tmdb_id,
                    name: item.nazwa,
                    first_air_date: item.rok,
                    overview: item.opis,
                    poster_path: item.plakat,
                    backdrop_path: item.tloFilmu,
                    vote_average: item.srednia_ocen,
                    gatunki: item.gatunki
                }));
                
                setTv(mappedData);
            } catch (err) {
                setError('Nie udało się załadować seriali z bazy danych.');
            } finally {
                setIsLoading(false);
            }
        };
        loadTvFromDB();
    }, []);

    return { Tv, isLoading, error };
};