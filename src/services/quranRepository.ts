import { getDb, Verse, DownloadStatus } from './quranDatabase';

// API Edition eşleştirmeleri (Al Quran Cloud - Multi-Language)
export const LANG_EDITIONS: Record<string, { edition: string; sourceTR: string; sourceEN: string }> = {
  tr: { edition: 'tr.diyanet', sourceTR: 'Diyanet İşleri Başkanlığı Meali', sourceEN: 'Diyanet Affairs Translation' },
  en: { edition: 'en.asad', sourceTR: 'Muhammed Esed Meali (İngilizce)', sourceEN: 'Muhammad Asad Translation' },
  ar: { edition: 'ar.muyassar', sourceTR: 'Tefsiru\'l-Müyesser (Arapça)', sourceEN: 'Tafsir Al-Muyassar' },
  id: { edition: 'id.indonesian', sourceTR: 'Endonezya Din Bakanlığı', sourceEN: 'Indonesian Ministry of Religious Affairs' },
  ur: { edition: 'ur.jalandhry', sourceTR: 'Fetih Muhammed Calenderi (Urduca)', sourceEN: 'Fateh Muhammad Jalandhry' },
  fr: { edition: 'fr.hamidullah', sourceTR: 'Muhammed Hamidullah (Fransızca)', sourceEN: 'Muhammad Hamidullah' },
  de: { edition: 'de.aburida', sourceTR: 'Ebu Rıda (Almanca)', sourceEN: 'Abu Rida Translation' },
  ru: { edition: 'ru.kuliev', sourceTR: 'Elmir Kuliev (Rusça)', sourceEN: 'Elmir Kuliev Translation' },
  es: { edition: 'es.cortes', sourceTR: 'Julio Cortes (İspanyolca)', sourceEN: 'Julio Cortes Translation' },
  fa: { edition: 'fa.ansarian', sourceTR: 'Hüseyin Ensariyan (Farsça)', sourceEN: 'Hussain Ansarian Translation' },
  bn: { edition: 'bn.bengali', sourceTR: 'Muhyiddin Han (Bengalce)', sourceEN: 'Muhiuddin Khan Translation' },
  ms: { edition: 'ms.basmeih', sourceTR: 'Abdullah Basmeih (Malayca)', sourceEN: 'Abdullah Basmeih Translation' },
  ha: { edition: 'ha.gumi', sourceTR: 'Ebubekir Gumi (Havsaca)', sourceEN: 'Abubakar Gumi Translation' },
  sw: { edition: 'sw.barwani', sourceTR: 'Ali Muhsin El-Barwani (Svahili)', sourceEN: 'Ali Muhsin Al-Barwani' },
  hi: { edition: 'hi.hindi', sourceTR: 'Faruk Han (Hintçe)', sourceEN: 'Farooq Khan Translation' },
  it: { edition: 'it.piccardo', sourceTR: 'Hamza Piccardo (İtalyanca)', sourceEN: 'Hamza Piccardo Translation' },
  nl: { edition: 'nl.keyzer', sourceTR: 'Salomo Keyzer (Felemenkçe)', sourceEN: 'Salomo Keyzer Translation' },
  uz: { edition: 'uz.sodik', sourceTR: 'Muhammed Sadık (Özbekçe)', sourceEN: 'Muhammad Sodik Translation' },
  pt: { edition: 'pt.elhayek', sourceTR: 'Semir El-Hayek (Portekizce)', sourceEN: 'Samir El-Hayek Translation' },
  zh: { edition: 'zh.jian', sourceTR: 'Ma Jian (Çince)', sourceEN: 'Ma Jian Translation' },
  sq: { edition: 'sq.ahmeti', sourceTR: 'Şerif Ahmedi (Arnavutça)', sourceEN: 'Sherif Ahmeti Translation' },
  th: { edition: 'th.thai', sourceTR: 'Kral Fehd Kompleksi (Tayca)', sourceEN: 'King Fahd Complex Thai' },
  ja: { edition: 'ja.japanese', sourceTR: 'Ryoichi Mita (Japonca)', sourceEN: 'Ryoichi Mita Translation' },
  ko: { edition: 'ko.korean', sourceTR: 'Korece Meal', sourceEN: 'Korean Translation' },
  sv: { edition: 'sv.bernstrom', sourceTR: 'Knut Bernström (İsveççe)', sourceEN: 'Knut Bernstrom Translation' },
  no: { edition: 'no.berg', sourceTR: 'Einar Berg (Norveççe)', sourceEN: 'Einar Berg Translation' },
  pl: { edition: 'pl.bielawskiego', sourceTR: 'Jozef Bielawski (Lehçe)', sourceEN: 'Jozef Bielawski Translation' },
  ro: { edition: 'ro.grigore', sourceTR: 'George Grigore (Rumence)', sourceEN: 'George Grigore Translation' },
  cs: { edition: 'cs.hrbek', sourceTR: 'Ivan Hrbek (Çekçe)', sourceEN: 'Ivan Hrbek Translation' },
};

export const getQuranEditionForLanguage = (langCode: string): string => {
  const code = (langCode || 'en').toLowerCase().split(/[-_]/)[0];
  return LANG_EDITIONS[code]?.edition || 'en.asad';
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

export interface PageVerseMeal {
  surahNo: number;
  ayahNo: number;
  arabicText: string;
  translationText: string;
}

export const getPageMeal = async (pageNo: number, langCode: string = 'tr'): Promise<PageVerseMeal[]> => {
  const edition = getQuranEditionForLanguage(langCode);
  try {
    const [arRes, trRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/page/${pageNo}/quran-simple-enhanced`),
      fetch(`https://api.alquran.cloud/v1/page/${pageNo}/${edition}`),
    ]);

    if (arRes.ok && trRes.ok) {
      const arJson = await arRes.json();
      const trJson = await trRes.json();
      const arAyahs = arJson.data?.ayahs || [];
      const trAyahs = trJson.data?.ayahs || [];

      return arAyahs.map((ayah: any, idx: number) => ({
        surahNo: ayah.surah.number,
        ayahNo: ayah.numberInSurah,
        arabicText: ayah.text,
        translationText: trAyahs[idx]?.text || '',
      }));
    }
  } catch (err) {
    console.warn(`Failed to fetch online meal for page ${pageNo}:`, err);
  }

  // Local fallback from SQLite
  const localVerses = await getVersesByPage(pageNo);
  return localVerses.map((v) => ({
    surahNo: v.surahNo,
    ayahNo: v.ayahNo,
    arabicText: v.arabicText,
    translationText: v.translationText,
  }));
};

