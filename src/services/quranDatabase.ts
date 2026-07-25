import * as SQLite from 'expo-sqlite';

// Veri Modelleri
export interface Verse {
  id: string; // "surahNo:ayahNo" (Örn: "2:255")
  juzNo: number;
  surahNo: number;
  ayahNo: number; // Suredaki ayet numarası
  pageNo: number;
  arabicText: string;
  translationText: string;
  langCode: string; // Örn: "tr", "en"
}

export type DownloadStatus = 'NotDownloaded' | 'Downloading' | 'Downloaded';

export interface JuzDownloadState {
  juzNo: number;
  status: DownloadStatus;
  progress: number; // 0-100 arası
  langCode: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('quran_offline.db');
      await initDb(database);
      return database;
    })();
  }
  return dbPromise;
};

// Tabloların oluşturulması
const initDb = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS verses (
      id TEXT PRIMARY KEY,
      juz_no INTEGER NOT NULL,
      surah_no INTEGER NOT NULL,
      ayah_no INTEGER NOT NULL,
      page_no INTEGER NOT NULL,
      arabic_text TEXT NOT NULL,
      translation_text TEXT NOT NULL,
      lang_code TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_juz ON verses(juz_no);
    CREATE INDEX IF NOT EXISTS idx_page ON verses(page_no);

    CREATE TABLE IF NOT EXISTS download_status (
      juz_no INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      lang_code TEXT NOT NULL
    );
  `);
};
