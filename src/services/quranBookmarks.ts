import { AppStorage } from './storageService';

const BOOKMARKS_KEY = '@quran_verse_bookmarks';

export interface VerseBookmark {
  id: string; // "surahNo:ayahNo"
  surahNo: number;
  ayahNo: number;
  surahName: string;
  pageNo: number;
  arabicText: string;
  createdAt: number;
}

const makeId = (surahNo: number, ayahNo: number) => `${surahNo}:${ayahNo}`;

export async function getVerseBookmarks(): Promise<VerseBookmark[]> {
  try {
    const json = await AppStorage.getItem(BOOKMARKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function isVerseBookmarked(surahNo: number, ayahNo: number): Promise<boolean> {
  const bookmarks = await getVerseBookmarks();
  return bookmarks.some((b) => b.id === makeId(surahNo, ayahNo));
}

/** Adds or removes a bookmark for the given verse. Returns the updated bookmark list. */
export async function toggleVerseBookmark(entry: Omit<VerseBookmark, 'id' | 'createdAt'>): Promise<VerseBookmark[]> {
  const bookmarks = await getVerseBookmarks();
  const id = makeId(entry.surahNo, entry.ayahNo);
  const exists = bookmarks.some((b) => b.id === id);

  const next = exists
    ? bookmarks.filter((b) => b.id !== id)
    : [{ ...entry, id, createdAt: Date.now() }, ...bookmarks];

  await AppStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  return next;
}

export async function removeVerseBookmark(surahNo: number, ayahNo: number): Promise<VerseBookmark[]> {
  const bookmarks = await getVerseBookmarks();
  const next = bookmarks.filter((b) => b.id !== makeId(surahNo, ayahNo));
  await AppStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  return next;
}
