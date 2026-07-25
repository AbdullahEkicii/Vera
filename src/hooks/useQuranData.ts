import { useState, useEffect, useCallback } from 'react';
import {
  ReadingHistoryItem,
  getLastRead,
  getReadingHistory,
  getFavoriteSurahs,
  toggleFavoriteSurah,
} from '../services/quranStorage';

export const useQuranData = () => {
  const [lastRead, setLastRead] = useState<ReadingHistoryItem | null>(null);
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [favoriteSurahs, setFavoriteSurahs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [last, hist, favs] = await Promise.all([
        getLastRead(),
        getReadingHistory(),
        getFavoriteSurahs(),
      ]);
      setLastRead(last);
      setHistory(hist);
      setFavoriteSurahs(favs);
    } catch (error) {
      console.error('Error loading Quran data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFavorite = async (surahId: number) => {
    const newFavs = await toggleFavoriteSurah(surahId);
    setFavoriteSurahs(newFavs);
  };

  return {
    lastRead,
    history,
    favoriteSurahs,
    loading,
    refreshData: loadData,
    toggleFavorite,
  };
};
