import { syncGenres, syncMediaToDB } from '@/hooks/Database';
import { useEffect } from 'react';

const API_KEY = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1ZjE4YjA3ZDlhYWNlNDA4ZWQ2M2ZjZjliZDdhMTI0OSIsIm5iZiI6MTc0OTIxMjMyMi42NjUsInN1YiI6IjY4NDJkY2EyYjMwMzA2ZjY1N2YyY2FjZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.kb5r4wR4rO1WNE5_sDsa9jGPKMfj6dHiLf0i0PD3nUA"; // Użyj swojego Bearer Token

export const useSyncData = () => {
    const fetchAndSync = async () => {
        try {
            // Pobieranie gatunków
            const gMov = await fetch('https://api.themoviedb.org/3/genre/movie/list?language=pl-PL', { headers: { Authorization: API_KEY } });
            const gTv = await fetch('https://api.themoviedb.org/3/genre/tv/list?language=pl-PL', { headers: { Authorization: API_KEY } });
            const gMovJson = await gMov.json();
            const gTvJson = await gTv.json();
            
            await syncGenres([...gMovJson.genres, ...gTvJson.genres]);

            // Pobieranie Filmów
            const fRes = await fetch('https://api.themoviedb.org/3/movie/popular?language=pl-PL&page=1', { headers: { Authorization: API_KEY } });
            const fJson = await fRes.json();
            await syncMediaToDB(fJson.results, 'movie');

            // Pobieranie Seriali
            const tRes = await fetch('https://api.themoviedb.org/3/tv/popular?language=pl-PL&page=1', { headers: { Authorization: API_KEY } });
            const tJson = await tRes.json();
            await syncMediaToDB(tJson.results, 'tv');

            console.log("Synchronizacja zakończona!");
        } catch (e) {
            console.error("Sync failed", e);
        }
    };

    useEffect(() => { fetchAndSync(); }, []);
};