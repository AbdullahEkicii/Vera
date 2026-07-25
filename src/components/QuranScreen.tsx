import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { useQuranData } from '../hooks/useQuranData';
import { useQuranDownloader } from '../hooks/useQuranDownloader';
import { SURAHS, FEATURED_SURAHS, getSurahsInJuz, SurahMeta, getJuzStartPageStatic } from '../data/quranMeta';
import { getFirstPageOfSurah, checkJuzStatus, downloadJuz } from '../services/quranRepository';
import { useQuranSettings } from '../context/QuranSettingsContext';
import { QuranStyleSelector } from './QuranStyleSelector';
import { AdBanner } from './AdBanner';
import { ScalePressable } from './ScalePressable';

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

// ── Öne Çıkan Sure Kartı ────────────────────────────────────────────────────
const FeaturedSurahCard = React.memo(({ surah }: { surah: SurahMeta }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { scriptType } = useQuranSettings();
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePress = useCallback(async () => {
    setNavigating(true);
    
    // Check if juz is downloaded
    const statusResult = await checkJuzStatus(surah.juz);
    if (statusResult.status !== 'Downloaded') {
      setProgress(0);
      const success = await downloadJuz(surah.juz, 'ar', scriptType, (p) => setProgress(p));
      if (!success) {
        Alert.alert(t('common.error'), t('quran.downloadError', 'Cüz indirilirken hata oluştu.'));
        setNavigating(false);
        return;
      }
    }

    const page = await getFirstPageOfSurah(surah.number).catch(() => null);
    const targetPage = page ?? surah.page;
    router.push({
      pathname: '/quran-reading',
      params: { page: targetPage, surahName: surah.nameTurkish, juz: surah.juz },
    } as any);
    setNavigating(false);
  }, [surah, scriptType, t]);

  return (
    <ScalePressable
      activeScale={0.96}
      style={[
        styles.featuredCard,
        { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.featuredArabicBadge, { backgroundColor: theme.colors.primary + '18' }]}>
        <Text style={[styles.featuredArabicText, { color: theme.colors.primary }]}>
          {surah.nameArabic}
        </Text>
      </View>
      <View style={styles.featuredInfo}>
        <Text style={[styles.featuredTurkishName, { color: theme.colors.text }]} numberOfLines={1}>
          {surah.nameTurkish}
        </Text>
        <Text style={[styles.featuredMeta, { color: theme.colors.textSecondary }]}>
          {t('quran.verseCount', { count: surah.verseCount })}
        </Text>
        {navigating && progress > 0 && progress < 100 && (
          <Text style={{ color: theme.colors.primary, fontSize: 10, marginTop: 4 }}>
            {t('quran.downloading', { progress: Math.round(progress * 100) / 100 }) || `%${Math.round(progress)} İndiriliyor...`}
          </Text>
        )}
      </View>
      {navigating ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : null}
    </ScalePressable>
  );
});

// ── Cüz Listesi Öğesi (Expandable + Detaylı) ────────────────────────────────
const JuzListItem = React.memo(({ juz }: { juz: number }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { status, progress, startDownload } = useQuranDownloader(juz, 'ar');
  const [expanded, setExpanded] = useState(false);
  const surahsInJuz = getSurahsInJuz(juz);

  const handleMainPress = () => {
    if (status === 'NotDownloaded') {
      startDownload();
    } else if (status === 'Downloaded') {
      const startPage = getJuzStartPageStatic(juz);
      router.push({ pathname: '/quran-reading', params: { juz, page: startPage } } as any);
    }
  };

  const handleSurahPress = useCallback(async (surah: SurahMeta) => {
    if (status !== 'Downloaded') return;
    const page = await getFirstPageOfSurah(surah.number).catch(() => null);
    router.push({
      pathname: '/quran-reading',
      params: { page: page ?? surah.page, surahName: surah.nameTurkish, juz },
    } as any);
  }, [status, juz]);

  return (
    <View style={[styles.juzCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
      {/* Ana satır */}
      <ScalePressable style={styles.juzRow} onPress={handleMainPress} activeScale={0.98}>
        <View style={[styles.juzBadge, { backgroundColor: theme.colors.primary + '18' }]}>
          <Text style={[styles.juzBadgeText, { color: theme.colors.primary }]}>{juz}</Text>
        </View>

        <View style={styles.juzInfo}>
          <Text style={[styles.juzTitle, { color: theme.colors.text }]}>{t('quran.juzNum', { num: juz })}</Text>
          <Text style={[styles.juzMeta, { color: theme.colors.textSecondary }]}>
            {surahsInJuz.length > 0
              ? `${surahsInJuz[0].nameTurkish}${surahsInJuz.length > 1 ? ` – ${surahsInJuz[surahsInJuz.length - 1].nameTurkish}` : ''}`
              : ''}
          </Text>
          {status === 'Downloading' && (
            <Text style={{ color: theme.colors.primary, fontSize: 11, marginTop: 2 }}>
              {t('quran.downloading', { progress })}
            </Text>
          )}
          {status === 'NotDownloaded' && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              {t('quran.downloadToRead')}
            </Text>
          )}
        </View>

        <View style={styles.juzActions}>
          {status === 'Downloading' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : status === 'Downloaded' ? (
            <ScalePressable
              onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              style={[styles.expandButton, { backgroundColor: theme.colors.surfaceStrong }]}
              hitSlop={8}
              activeScale={0.9}
            >
              <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
            </ScalePressable>
          ) : (
            <View style={[styles.downloadButton, { backgroundColor: theme.colors.primary }]}>
              <Feather name="download" size={16} color="#FFF" />
            </View>
          )}
        </View>
      </ScalePressable>

      {/* Sure listesi (expanded) */}
      {expanded && status === 'Downloaded' && surahsInJuz.length > 0 && (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.surahList, { borderTopColor: theme.colors.border }]}>
          {surahsInJuz.map((surah) => (
            <ScalePressable
              key={surah.number}
              style={[styles.surahRow, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleSurahPress(surah)}
              activeScale={0.97}
            >
              <View style={[styles.surahNumberBadge, { backgroundColor: theme.colors.surfaceStrong }]}>
                <Text style={[styles.surahNumberText, { color: theme.colors.textSecondary }]}>{surah.number}</Text>
              </View>
              <View style={styles.surahNameContainer}>
                <Text style={[styles.surahTurkishName, { color: theme.colors.text }]}>{surah.nameTurkish}</Text>
                <Text style={[styles.surahArabicName, { color: theme.colors.primary }]}>{surah.nameArabic}</Text>
              </View>
              <Text style={[styles.surahVerseCount, { color: theme.colors.textSecondary }]}>
                {t('quran.verseCount', { count: surah.verseCount })}
              </Text>
              <Feather name="chevron-right" size={14} color={theme.colors.border} />
            </ScalePressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
});

// ── Sure Arama Modalı ────────────────────────────────────────────────────────
const SurahSearchModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { scriptType } = useQuranSettings();
  const [query, setQuery] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadingJuz, setDownloadingJuz] = useState<number | null>(null);

  const filtered = query
    ? SURAHS.filter(
        (s) =>
          s.nameTurkish.toLowerCase().includes(query.toLowerCase()) ||
          s.nameArabic.includes(query) ||
          String(s.number).includes(query)
      )
    : SURAHS;

  const handleSelect = useCallback(async (surah: SurahMeta) => {
    setNavigating(true);
    setDownloadingJuz(surah.juz);

    const statusResult = await checkJuzStatus(surah.juz);
    if (statusResult.status !== 'Downloaded') {
      setProgress(0);
      const success = await downloadJuz(surah.juz, 'ar', scriptType, (p) => setProgress(p));
      if (!success) {
        Alert.alert(t('common.error'), t('quran.downloadError', 'Cüz indirilirken hata oluştu.'));
        setNavigating(false);
        setDownloadingJuz(null);
        return;
      }
    }

    onClose();
    // After closing modal, give state time to update
    setTimeout(async () => {
      const page = await getFirstPageOfSurah(surah.number).catch(() => null);
      router.push({
        pathname: '/quran-reading',
        params: { page: page ?? surah.page, surahName: surah.nameTurkish, juz: surah.juz },
      } as any);
      setNavigating(false);
      setDownloadingJuz(null);
    }, 100);
  }, [onClose, scriptType, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: isDark ? '#111' : '#F8F8F8' }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('quran.allSurahs')}</Text>
          <Pressable onPress={onClose} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]}>
            <Feather name="x" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* Arama */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
          <Feather name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, flex: 1, paddingVertical: 8, paddingHorizontal: 8 }]}
            placeholder={t('quran.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          initialNumToRender={10}
          windowSize={5}
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          renderItem={({ item }) => (
            <ScalePressable
              activeScale={0.97}
              style={[styles.modalSurahRow, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleSelect(item)}
            >
              <View style={[styles.modalSurahBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[styles.modalSurahNumber, { color: theme.colors.primary }]}>{item.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSurahTurkish, { color: theme.colors.text }]}>{item.nameTurkish}</Text>
                <Text style={[styles.modalSurahMeta, { color: theme.colors.textSecondary }]}>
                  {t('quran.verseCount', { count: item.verseCount })} • {t('quran.juzNum', { num: item.juz })}
                </Text>
              </View>
              {navigating && downloadingJuz === item.juz ? (
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                   <Text style={{ color: theme.colors.primary, fontSize: 11 }}>
                     {progress > 0 && progress < 100
                       ? `${Math.round(progress)}%`
                       : t('quran.downloadingShort', 'İndiriliyor...')}
                   </Text>
                   <ActivityIndicator size="small" color={theme.colors.primary} />
                 </View>
              ) : (
                <Feather name="chevron-right" size={14} color={theme.colors.border} />
              )}
            </ScalePressable>
          )}
        />
      </View>
    </Modal>
  );
};

// ── Ana Ekran ────────────────────────────────────────────────────────────────
export const QuranScreen = () => {
  const { t } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();
  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');
  const [surahModalVisible, setSurahModalVisible] = useState(false);
  const [styleSelectorVisible, setStyleSelectorVisible] = useState(false);
  const { lastRead, history, loading } = useQuranData();
  const { isStyleSelected, isFontLoaded } = useQuranSettings();

  // Initial setup trigger removed from here; moved to reading page.

  const renderBrowseTab = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Öne Çıkan Sureler */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('quran.featuredSurahs')}</Text>
        <Pressable onPress={() => setSurahModalVisible(true)} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>{t('quran.seeAll')}</Text>
          <Feather name="chevron-right" size={14} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScroll}
      >
        {FEATURED_SURAHS.map((surah) => (
          <FeaturedSurahCard key={surah.number} surah={surah} />
        ))}
      </ScrollView>

      {/* Live AdMob Native Ad */}
      <View style={{ marginVertical: 16 }}>
        <AdBanner />
      </View>

      {/* Cüzler */}
      <View style={[styles.sectionHeader, { marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('quran.juzs')}</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>{t('quran.juzCount')}</Text>
      </View>

      <View style={styles.juzList}>
        {JUZ_LIST.map((juz) => (
          <JuzListItem key={juz} juz={juz} />
        ))}
      </View>
    </Animated.View>
  );

  const renderHistoryTab = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('quran.lastRead')}</Text>
      {lastRead ? (
        <Pressable
          style={[styles.lastReadCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}
          onPress={() =>
            router.push({ pathname: '/quran-reading', params: { juz: lastRead.juz, page: lastRead.page } } as any)
          }
        >
          <View>
            <Text style={[styles.lastReadSurah, { color: theme.colors.text }]}>{lastRead.surahName}</Text>
            <Text style={[styles.lastReadDetails, { color: theme.colors.textSecondary }]}>
              {t('quran.juzNum', { num: lastRead.juz })} • {t('quran.pageNum', { num: lastRead.page })}
            </Text>
          </View>
          <View style={[styles.goButton, { backgroundColor: theme.colors.primary }]}>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </View>
        </Pressable>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
          <Feather name="book" size={28} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('quran.noHistoryTitle')}
          </Text>
        </View>
      )}

      {/* Live AdMob Native Ad */}
      <View style={{ marginVertical: 16 }}>
        <AdBanner />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 16 }]}>{t('quran.pastReadings')}</Text>
      {history.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('quran.noPastReadings')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {history.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/quran-reading', params: { juz: item.juz ?? 1, page: item.page } } as any)}
              style={[styles.historyItem, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{item.surahName}</Text>
                <Text style={[styles.historyDetails, { color: theme.colors.textSecondary }]}>{t('quran.pageNum', { num: item.page })}</Text>
              </View>
              <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                {new Date(item.timestamp).toLocaleDateString('tr-TR')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen} />

      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('quran.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {t('quran.subtitle')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => setSurahModalVisible(true)}
            style={[styles.searchIconButton, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}
          >
            <Feather name="search" size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setStyleSelectorVisible(true)}
            style={[styles.searchIconButton, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}
          >
            <Feather name="settings" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
        {(['browse', 'history'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.segmentButton,
              activeTab === tab && [styles.segmentButtonActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.segmentText, { color: activeTab === tab ? theme.colors.text : theme.colors.textSecondary }]}>
              {tab === 'browse' ? t('quran.tabBrowse') : t('quran.tabHistory')}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'browse' ? renderBrowseTab() : renderHistoryTab()}
      </ScrollView>

      <SurahSearchModal visible={surahModalVisible} onClose={() => setSurahModalVisible(false)} />
      
      {/* Hat / Stil Seçici Modal */}
      {styleSelectorVisible && (
        <QuranStyleSelector 
          visible={styleSelectorVisible} 
          onClose={() => setStyleSelectorVisible(false)} 
          isInitialSetup={!isStyleSelected} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  searchIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 3,
    borderRadius: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 18,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  // Featured Sureler
  featuredScroll: {
    gap: 16,
    flexWrap: 'wrap',
  },
  featuredCard: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  featuredArabicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredArabicText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
  },
  featuredInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  featuredTurkishName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  featuredMeta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginTop: 2,
  },
  featuredVerseCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
  },
  // Cüzler
  juzList: { gap: 10 },
  juzCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  juzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  juzBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
  },
  juzInfo: { flex: 1 },
  juzTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  juzMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  juzActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sure listesi (expanded)
  surahList: {
    borderTopWidth: 1,
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  surahNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
  },
  surahNameContainer: { flex: 1 },
  surahTurkishName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  surahArabicName: {
    fontSize: 13,
    marginTop: 1,
  },
  surahVerseCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginRight: 4,
  },
  // History tab
  lastReadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  lastReadSurah: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  lastReadDetails: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 3,
  },
  goButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
  },
  historyDetails: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  historyDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  emptyCard: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
  },
  searchInput: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    flex: 1,
    paddingVertical: 8,
  },
  modalSurahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalSurahBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSurahNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
  modalSurahTurkish: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
  },
  modalSurahMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  modalSurahArabic: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
});
