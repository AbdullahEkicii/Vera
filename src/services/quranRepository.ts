import { getDb, Verse, DownloadStatus } from './quranDatabase';

// API Edition eşleştirmeleri (Al Quran Cloud)
const LANG_EDITIONS: Record<string, string> = {
  tr: 'tr.diyanet',
  en: 'en.asad',
  de: 'de.aburida',
  // İhtiyaca göre diğer diller eklenebilir
};

export const checkJuzStatus = async (juzNo: number, scriptType: string = 'quran-imlaei'): Promise<{ status: DownloadStatus; langCode?: string }> => {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ status: string; lang_code: string; script_type: string }>(
      'SELECT status, lang_code, script_type FROM download_status WHERE juz_no = ?',
      [juzNo]
    );

    if (result && result.script_type === scriptType) {
      return { status: result.status as DownloadStatus, langCode: result.lang_code };
    }
    return { status: 'NotDownloaded' };
  } catch (error) {
    console.error('Error checking juz status:', error);
    return { status: 'NotDownloaded' };
  }
};

// API Script eşleştirmeleri
const API_SCRIPT_MAP: Record<string, string> = {
  'quran-imlaei': 'quran-simple-enhanced',
  'quran-uthmani': 'quran-uthmani',
  'quran-indopak': 'quran-indopak',
  'quran-husrev': 'quran-uthmani',
};

// Active download promises map to prevent concurrent download & transaction conflicts
const activeDownloadMap = new Map<string, Promise<boolean>>();

export const downloadJuz = async (
  juzNo: number,
  langCode: string,
  scriptType: string = 'quran-imlaei',
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  const downloadKey = `${juzNo}:${langCode}:${scriptType}`;

  // If Juz is ALREADY downloading, join existing promise
  if (activeDownloadMap.has(downloadKey)) {
    return activeDownloadMap.get(downloadKey)!;
  }

  const downloadPromise = (async (): Promise<boolean> => {
    try {
      const db = await getDb();

      // Check if already downloaded
      const statusCheck = await checkJuzStatus(juzNo, scriptType);
      if (statusCheck.status === 'Downloaded') {
        onProgress?.(100);
        return true;
      }

      // Status'u Downloading olarak güncelle
      await db.runAsync(
        'INSERT OR REPLACE INTO download_status (juz_no, status, lang_code, script_type) VALUES (?, ?, ?, ?)',
        [juzNo, 'Downloading', langCode, scriptType]
      );

      onProgress?.(10);

      // 1. Arapça metni çek
      const apiEdition = API_SCRIPT_MAP[scriptType] || 'quran-simple-enhanced';
      const arabicRes = await fetch(`https://api.alquran.cloud/v1/juz/${juzNo}/${apiEdition}`);
      const arabicData = await arabicRes.json();

      if (arabicData.code !== 200) throw new Error('Arapça API hatası');
      onProgress?.(50);

      const arabicAyahs = arabicData.data.ayahs;
      const verses: Verse[] = arabicAyahs.map((ayah: any) => ({
        id: `${ayah.surah.number}:${ayah.numberInSurah}`,
        juzNo: juzNo,
        surahNo: ayah.surah.number,
        ayahNo: ayah.numberInSurah,
        pageNo: ayah.page,
        arabicText: ayah.text,
        translationText: '',
        langCode: 'ar',
      }));

      // Safe Batch Insert using prepared statement without nested transaction conflict
      await db.runAsync('DELETE FROM verses WHERE juz_no = ?', [juzNo]);

      const statement = await db.prepareAsync(`
        INSERT INTO verses (id, juz_no, surah_no, ayah_no, page_no, arabic_text, translation_text, lang_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let insertCount = 0;
      for (const v of verses) {
        await statement.executeAsync(
          v.id,
          v.juzNo,
          v.surahNo,
          v.ayahNo,
          v.pageNo,
          v.arabicText,
          v.translationText,
          v.langCode
        );
        
        insertCount++;
        // React Native köprüsünün tıkanmasını (ANR) önlemek için her 50 ayette bir mikro mola veriyoruz
        if (insertCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      await statement.finalizeAsync();

      // Durumu Downloaded yap
      await db.runAsync(
        'INSERT OR REPLACE INTO download_status (juz_no, status, lang_code, script_type) VALUES (?, ?, ?, ?)',
        [juzNo, 'Downloaded', langCode, scriptType]
      );

      onProgress?.(100);
      return true;
    } catch (error) {
      console.error(`Error downloading Juz ${juzNo}:`, error);
      try {
        const db = await getDb();
        await db.runAsync('DELETE FROM download_status WHERE juz_no = ?', [juzNo]);
      } catch (e) {}
      return false;
    } finally {
      activeDownloadMap.delete(downloadKey);
    }
  })();

  activeDownloadMap.set(downloadKey, downloadPromise);
  return downloadPromise;
};

export const getVersesByPage = async (pageNo: number): Promise<Verse[]> => {
  try {
    const db = await getDb();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM verses WHERE page_no = ? ORDER BY surah_no ASC, ayah_no ASC',
      [pageNo]
    );

    return result.map((row) => ({
      id: row.id,
      juzNo: row.juz_no,
      surahNo: row.surah_no,
      ayahNo: row.ayah_no,
      pageNo: row.page_no,
      arabicText: row.arabic_text,
      translationText: row.translation_text,
      langCode: row.lang_code,
    }));
  } catch (error) {
    console.error(`Error getting verses for page ${pageNo}:`, error);
    return [];
  }
};

export const getJuzStartPage = async (juzNo: number): Promise<number> => {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ page_no: number }>(
      'SELECT MIN(page_no) as page_no FROM verses WHERE juz_no = ?',
      [juzNo]
    );
    return result?.page_no || 1;
  } catch (error) {
    console.error(`Error getting start page for Juz ${juzNo}:`, error);
    return 1;
  }
};

/** Belirli bir surenin ilk sayfasını SQLite'tan döndürür */
export const getFirstPageOfSurah = async (surahNo: number): Promise<number | null> => {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ page_no: number }>(
      'SELECT MIN(page_no) as page_no FROM verses WHERE surah_no = ?',
      [surahNo]
    );
    return result?.page_no ?? null;
  } catch (error) {
    console.error(`Error getting first page for Surah ${surahNo}:`, error);
    return null;
  }
};

/** Bir sayfadaki birinci ayetin surah bilgisini döndürür */
export const getSurahInfoForPage = async (pageNo: number): Promise<{ surahNo: number; ayahNo: number } | null> => {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ surah_no: number; ayah_no: number }>(
      'SELECT surah_no, ayah_no FROM verses WHERE page_no = ? ORDER BY surah_no ASC, ayah_no ASC LIMIT 1',
      [pageNo]
    );
    if (!result) return null;
    return { surahNo: result.surah_no, ayahNo: result.ayah_no };
  } catch (error) {
    return null;
  }
};

export const clearAllJuzData = async (): Promise<boolean> => {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM verses');
      await db.runAsync('DELETE FROM download_status');
    });
    return true;
  } catch (error) {
    console.error('Error clearing all juz data:', error);
    return false;
  }
};
