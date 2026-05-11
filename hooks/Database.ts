import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('moviesApp2.db');


// Tworzenie Tabeli w bazie danych
export const initDB = () => {
    try {
        db.execSync(`
            PRAGMA foreign_keys = ON;

            -- TABELA UŻYTKOWNIKÓW (zmodyfikowana o avatar i datę dołączenia)
            CREATE TABLE IF NOT EXISTS uzytkownicy (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                nazwa_uzytkownika TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                haslo TEXT NOT NULL,
                avatar TEXT,
                data_dolaczenia TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS film (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tmdb_id INTEGER NOT NULL,
                typ TEXT NOT NULL, -- 'movie' lub 'tv'
                nazwa TEXT,
                rok TEXT,
                overview TEXT,
                plakat TEXT,
                backdrop TEXT,
                UNIQUE(tmdb_id, typ) -- Zabezpiecza przed duplikatami z API
            );

            -- TABELA GATUNKÓW
            CREATE TABLE IF NOT EXISTS gatunki (
                id INTEGER PRIMARY KEY,
                gatunek TEXT
            );

            -- TABELA GATUNKI_FILMU (Relacja wiele do wielu)
            CREATE TABLE IF NOT EXISTS gatunki_filmu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_filmu INTEGER,
                id_gatunku INTEGER,
                UNIQUE(id_filmu, id_gatunku),
                FOREIGN KEY (id_filmu) REFERENCES film (id) ON DELETE CASCADE,
                FOREIGN KEY (id_gatunku) REFERENCES gatunki (id) ON DELETE CASCADE
            );

            -- TABELA RECENZJI
            CREATE TABLE IF NOT EXISTS recenzje (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_filmy INTEGER,
                id_uzytkownika INTEGER,
                tresc TEXT,
                ocena INTEGER,
                FOREIGN KEY (id_filmy) REFERENCES film (id) ON DELETE CASCADE,
                FOREIGN KEY (id_uzytkownika) REFERENCES uzytkownicy (ID) ON DELETE CASCADE
            );

            -- TWÓJ WIDOK: WIDOK_FILMY (Przystosowany do SQLite)
            DROP VIEW IF EXISTS widok_filmy;
            CREATE VIEW widok_filmy AS 
            SELECT 
                f.id AS id_filmu, 
                f.tmdb_id AS tmdb_id,
                f.typ AS typ,
                f.backdrop AS tloFilmu, 
                f.plakat AS plakat, 
                f.nazwa AS nazwa, 
                f.rok AS rok, 
                (SELECT GROUP_CONCAT(g.gatunek, ', ') FROM gatunki_filmu fg JOIN gatunki g ON g.id = fg.id_gatunku WHERE fg.id_filmu = f.id) AS gatunki, 
                f.overview AS opis, 
                COALESCE(ROUND(AVG(r.ocena)), 0) AS srednia_ocen 
            FROM film f 
            LEFT JOIN recenzje r ON f.id = r.id_filmy 
            GROUP BY f.id 
            ORDER BY f.rok DESC;
        `);
        console.log("Baza danych SQL wczytana pomyślnie!");
    } catch (error) {
        console.error("Błąd podczas inicjalizacji bazy danych: ", error);
    }
};


export const addUser = async (username: string, email: string, haslo: string, data_dolaczenia: string) => {
    try {
        const result = await db.runAsync(
            'INSERT INTO uzytkownicy (nazwa_uzytkownika, email, haslo, data_dolaczenia, avatar) VALUES (?, ?, ?, ?, NULL)',
            [username.toLowerCase(), email.toLowerCase(), haslo, data_dolaczenia]
        );
        return { success: true, id: result.lastInsertRowId };
    } catch (error) {
        return { success: false, error: error };
    }
};

export const getUserByUsername = async (username: string) => {
    try {
        const user = await db.getFirstAsync(
            'SELECT * FROM uzytkownicy WHERE nazwa_uzytkownika = ?',
            [username.toLowerCase()]
        );
        return user;
    } catch (error) {
        console.error(error);
        return null;
    }
};


export const updateUserAvatar = async (username: string, avatarUri: string) => {
    try {
        await db.runAsync(
            'UPDATE uzytkownicy SET avatar = ? WHERE nazwa_uzytkownika = ?',
            [avatarUri, username.toLowerCase()]
        );
        return true;
    } catch (error) {
        console.error("Błąd przy aktualizacji avatara: ", error);
        return false;
    }
};


export const syncGenres = async (genresArray: any[]) => {
    try {
        for (const g of genresArray) {
            await db.runAsync('INSERT OR IGNORE INTO gatunki (id, gatunek) VALUES (?, ?)', [g.id, g.name]);
        }
    } catch (error) { console.error(error); }
};

export const syncMediaToDB = async (mediaArray: any[], type: 'movie' | 'tv') => {
    try {
        for (const item of mediaArray) {
            const nazwa = type === 'movie' ? item.title : item.name;
            const data = type === 'movie' ? item.release_date : item.first_air_date;

            await db.runAsync(
                'INSERT OR IGNORE INTO film (tmdb_id, typ, nazwa, rok, overview, plakat, backdrop) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [item.id, type, nazwa, data, item.overview, item.poster_path, item.backdrop_path]
            );

            const dbFilm: any = await db.getFirstAsync('SELECT id FROM film WHERE tmdb_id = ? AND typ = ?', [item.id, type]);
            if (dbFilm && item.genre_ids) {
                for (const gId of item.genre_ids) {
                    await db.runAsync('INSERT OR IGNORE INTO gatunki_filmu (id_filmu, id_gatunku) VALUES (?, ?)', [dbFilm.id, gId]);
                }
            }
        }
    } catch (error) { console.error(error); }
};


export const getMediaByType = async (type: 'movie' | 'tv') => {
    try {
        return await db.getAllAsync('SELECT * FROM widok_filmy WHERE typ = ?', [type]);
    } catch (error) {
        console.error("Błąd odczytu z widoku:", error);
        return [];
    }
};



export const addReview = async (tmdb_id: number, username: string, ocena: number, tresc: string) => {
    try {

        const user: any = await db.getFirstAsync('SELECT ID FROM uzytkownicy WHERE nazwa_uzytkownika = ?', [username.toLowerCase()]);
        if (!user) return { success: false, error: 'Nie znaleziono użytkownika' };


        const film: any = await db.getFirstAsync('SELECT id FROM film WHERE tmdb_id = ?', [tmdb_id]);
        if (!film) return { success: false, error: 'Nie znaleziono filmu w bazie' };


        const existingReview: any = await db.getFirstAsync(
            'SELECT id FROM recenzje WHERE id_filmy = ? AND id_uzytkownika = ?', 
            [film.id, user.ID]
        );

        if (existingReview) {

            await db.runAsync('UPDATE recenzje SET ocena = ?, tresc = ? WHERE id = ?', [ocena, tresc, existingReview.id]);
        } else {

            await db.runAsync('INSERT INTO recenzje (id_filmy, id_uzytkownika, tresc, ocena) VALUES (?, ?, ?, ?)', [film.id, user.ID, tresc, ocena]);
        }
        
        return { success: true };
    } catch (error) {
        console.error("Błąd dodawania recenzji:", error);
        return { success: false, error };
    }
};


export const getReviewsForFilm = async (tmdb_id: number) => {
    try {

        const query = `
            SELECT r.id, r.tresc, r.ocena, u.nazwa_uzytkownika, u.avatar 
            FROM recenzje r
            JOIN uzytkownicy u ON r.id_uzytkownika = u.ID
            JOIN film f ON r.id_filmy = f.id
            WHERE f.tmdb_id = ?
            ORDER BY r.id DESC
        `;
        return await db.getAllAsync(query, [tmdb_id]);
    } catch (error) {
        console.error("Błąd pobierania recenzji:", error);
        return [];
    }
};

export const deleteReview = async (reviewId: number) => {
    try {
        await db.runAsync('DELETE FROM recenzje WHERE id = ?', [reviewId]);
        return { success: true };
    } catch (error) {
        console.error("Błąd usuwania recenzji:", error);
        return { success: false, error };
    }
};