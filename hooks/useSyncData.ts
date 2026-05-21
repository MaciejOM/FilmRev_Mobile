import { syncMediaToFirestore } from '@/hooks/firebaseDatabase';
import { useEffect } from 'react';

//Klucz API *DO UKRYCIA!!!*
const API_KEY = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1ZjE4YjA3ZDlhYWNlNDA4ZWQ2M2ZjZjliZDdhMTI0OSIsIm5iZiI6MTc0OTIxMjMyMi42NjUsInN1YiI6IjY4NDJkY2EyYjMwMzA2ZjY1N2YyY2FjZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.kb5r4wR4rO1WNE5_sDsa9jGPKMfj6dHiLf0i0PD3nUA"; // Użyj swojego Bearer Token

export const useSyncData = () => {
    const fetchAndSync = async () => {
        try {
            console.log("Rozpoczynam synchronizację z TMDB do Firebase...");

            // Pobieranie Gatunków
            const gMov = await fetch('https://api.themoviedb.org/3/genre/movie/list?language=pl-PL', { headers: { Authorization: API_KEY } });
            const gTv = await fetch('https://api.themoviedb.org/3/genre/tv/list?language=pl-PL', { headers: { Authorization: API_KEY } });
            const gMovJson = await gMov.json();
            const gTvJson = await gTv.json();
            
            const genresMap: Record<number, string> = {};
            [...gMovJson.genres, ...gTvJson.genres].forEach((g: {id: number, name: string}) => {
                genresMap[g.id] = g.name;
            });

            // Pobieranie Filmów
            const fRes = await fetch('https://api.themoviedb.org/3/movie/popular?language=pl-PL&page=1', { headers: { Authorization: API_KEY } });
            const fJson = await fRes.json();
            await syncMediaToFirestore(fJson.results, 'movie', genresMap);

            // Pobieranie Seriali
            const tRes = await fetch('https://api.themoviedb.org/3/tv/popular?language=pl-PL&page=1', { headers: { Authorization: API_KEY } });
            const tJson = await tRes.json();
            await syncMediaToFirestore(tJson.results, 'tv', genresMap);

            console.log("Synchronizacja do Firebase całkowicie zakończona!");
        } catch (e) {
            console.error("Błąd synchronizacji:", e);
        }
    };

    useEffect(() => { 
        fetchAndSync(); 
    }, []);
};