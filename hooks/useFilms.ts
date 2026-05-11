import { getMediaByType } from '@/hooks/Database';
import { useEffect, useState } from 'react';

export const useFilms = () => {
    const [film, setFilm] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFilmsFromDB = async () => {
            try {
                // Pobieranie filmów z SQL
                const dbData = await getMediaByType('movie');
                
                // Mapowanie kluczy dla wyszukiwarki
                const mappedData = dbData.map((item: any) => ({
                    id: item.tmdb_id,
                    title: item.nazwa,
                    release_date: item.rok,
                    overview: item.opis,
                    poster_path: item.plakat,
                    backdrop_path: item.tloFilmu,
                    vote_average: item.srednia_ocen,
                    gatunki: item.gatunki
                }));
                
                setFilm(mappedData);
            } catch (err) {
                setError('Nie udało się załadować filmów z bazy danych.');
            } finally {
                setIsLoading(false);
            }
        };
        loadFilmsFromDB();
    }, []);

    return { film, isLoading, error };
};