import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc } from '@react-native-firebase/firestore';

export interface QueuedContent {
  id?: string;
  type: 'verse' | 'hadith' | 'quote';
  text: string;
  source: string;
  targetDate: string; // YYYY-MM-DD
  language: string;
  createdAt: number;
}

const withTimeout = <T>(promise: Promise<T>, ms: number = 3000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
  ]);
};

/**
 * Gets the current local date as YYYY-MM-DD
 */
export const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets tomorrow's local date as YYYY-MM-DD
 */
export const getTomorrowString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Adds a new daily content to the queue for the specified type.
 * It will assign the next available targetDate (at least tomorrow).
 */
export const addContentToQueue = async (
  type: 'verse' | 'hadith' | 'quote',
  text: string,
  source: string
) => {
  try {
    const db = getFirestore();
    const collRef = collection(db, 'custom_daily_content');
    
    // Find the latest scheduled item for this type
    const q = query(
      collRef,
      where('type', '==', type),
      orderBy('targetDate', 'desc'),
      limit(1)
    );
    console.log('Executing getDocs query...');
    const snapshot = await withTimeout(getDocs(q), 5000);
    console.log('getDocs finished. empty:', snapshot.empty);

    let nextDateStr = getTomorrowString();

    if (!snapshot.empty) {
      const latestItem = snapshot.docs[0].data() as QueuedContent;
      const latestDateStr = latestItem.targetDate;
      
      // If the latest scheduled date is tomorrow or later, we append to it.
      if (latestDateStr >= nextDateStr) {
        const d = new Date(latestDateStr);
        d.setDate(d.getDate() + 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        nextDateStr = `${year}-${month}-${day}`;
      }
    }

    const newItem: QueuedContent = {
      type,
      text,
      source,
      targetDate: nextDateStr,
      language: 'tr', // Default to TR since editor is TR
      createdAt: Date.now(),
    };

    console.log('Adding new doc to firestore...', newItem);
    await withTimeout(addDoc(collRef, newItem), 5000);
    console.log('Doc added successfully.');
    return true;
  } catch (error) {
    console.error('Error adding content to queue:', error);
    return false;
  }
};

/**
 * Retrieves today's queued content for a specific type, if it exists.
 */
export const getQueuedContentForToday = async (
  type: 'verse' | 'hadith' | 'quote'
): Promise<QueuedContent | null> => {
  try {
    const todayStr = getTodayString();
    const db = getFirestore();
    const collRef = collection(db, 'custom_daily_content');
    
    const q = query(
      collRef,
      where('type', '==', type),
      where('targetDate', '==', todayStr),
      limit(1)
    );
    const snapshot = await withTimeout(getDocs(q), 15000);

    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as QueuedContent;
    }
    return null;
  } catch (error) {
    console.error('Error getting queued content:', error);
    return null;
  }
};
