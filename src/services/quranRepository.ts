import { getDb, Verse, DownloadStatus } from './quranDatabase';

// API Edition eşleştirmeleri (Al Quran Cloud)
const LANG_EDITIONS: Record<string, string> = {
  tr: 'tr.diyanet',
  en: 'en.asad',
  de: 'de.aburida',
  // İhtiyaca göre diğer diller eklenebilir
};

export const checkJuzStatus = async (juzNo: number): Promise<{ status: DownloadStatus; langCode?: string }> => {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ status: string; lang_code: string }>(
      'SELECT status, lang_code FROM download_status WHERE juz_no = ?',
      [juzNo]
    );

    if (result) {
      return { status: result.status as DownloadStatus, langCode: result.lang_code };
    }
    return { status: 'NotDownloaded' };
  } catch (error) {
    console.error('Error checking juz status:', error);
    return { status: 'NotDownloaded' };
  }
};

export const downloadJuz = async (
  juzNo: number,
  langCode: string,
  scriptType: string = 'quran-imlaei',
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  try {
    const db = await getDb();
    
    // Status'u Downloading olarak güncelle
    await db.runAsync(
      'INSERT OR REPLACE INTO download_status (juz_no, status, lang_code) VALUES (?, ?, ?)',
      [juzNo, 'Downloading', langCode]
    );

    onProgress?.(10); // Başlangıç

    // 1. Arapça metni çek
    const arabicRes = await fetch(`https://api.alquran.cloud/v1/juz/${juzNo}/${scriptType}`);
    const arabicData = await arabicRes.json();
    
    if (arabicData.code !== 200) throw new Error('Arapça API hatası');
    onProgress?.(50); // Arapça çekildi

    // Meal isteği şimdilik iptal edildi ("mealler suan dursun sadece kuran olsun")
    // İleride eklendiğinde API'den çekilecek.

    const arabicAyahs = arabicData.data.ayahs;

    // 3. Verileri SQLite için hazırla
    const verses: Verse[] = arabicAyahs.map((ayah: any) => {
      return {
        id: `${ayah.surah.number}:${ayah.numberInSurah}`,
        juzNo: juzNo,
        surahNo: ayah.surah.number,
        ayahNo: ayah.numberInSurah,
        pageNo: ayah.page,
        arabicText: ayah.text,
        translationText: '', // Şimdilik boş
        langCode: 'ar', // Varsayılan olarak sadece arapça indirildi
      };
    });

    // 4. Batch Insert (Transaction)
    await db.withTransactionAsync(async () => {
      // Önce bu cüze ait eski verileri temizle (Güncelleme durumu için)
      await db.runAsync('DELETE FROM verses WHERE juz_no = ?', [juzNo]);

      const statement = await db.prepareAsync(`
        INSERT INTO verses (id, juz_no, surah_no, ayah_no, page_no, arabic_text, translation_text, lang_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

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
      }
      await statement.finalizeAsync();

      // Durumu Downloaded yap
      await db.runAsync(
        'INSERT OR REPLACE INTO download_status (juz_no, status, lang_code) VALUES (?, ?, ?)',
        [juzNo, 'Downloaded', langCode]
      );
    });

    onProgress?.(100); // Bitti
    return true;

  } catch (error) {
    console.error(`Error downloading Juz ${juzNo}:`, error);
    // Hata durumunda statüyü geri al
    const db = await getDb();
    await db.runAsync('DELETE FROM download_status WHERE juz_no = ?', [juzNo]);
    return false;
  }
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
