import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { PageVerseMeal, getPageMeal, LANG_EDITIONS } from '../services/quranRepository';
import { logPageMealViewed } from '../services/analyticsService';

interface Props {
  visible: boolean;
  pageNo: number;
  onClose: () => void;
}

export function PageMealModal({ visible, pageNo, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
  const langKey = (i18n.language || 'tr').toLowerCase().split(/[-_]/)[0];
  const editionInfo = LANG_EDITIONS[langKey];
  const sourceName = isLangTR
    ? (editionInfo?.sourceTR || 'Diyanet İşleri Başkanlığı Meali')
    : (editionInfo?.sourceEN || 'Authentic Translation');

  const [loading, setLoading] = useState(true);
  const [verses, setVerses] = useState<PageVerseMeal[]>([]);

  useEffect(() => {
    if (visible && pageNo > 0) {
      logPageMealViewed(pageNo);
      setLoading(true);
      getPageMeal(pageNo, i18n.language)
        .then((res) => {
          setVerses(res);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, pageNo, i18n.language]);

  if (!visible) return null;

  const handleShareVerse = (verse: PageVerseMeal) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    Share.share({
      message: `[${verse.surahNo}:${verse.ayahNo}]\n\n${verse.arabicText}\n\n"${verse.translationText}"\n\n— Vera Kuran-ı Kerim`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetCard, { backgroundColor: isDark ? '#18120B' : '#FFFDF9', borderColor: theme.colors.border }]}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LinearGradient colors={['#D4AF37', '#996515']} style={styles.iconBadge}>
                <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  {t('quran.pageMealTitle', 'Sayfa {{page}} Meali', { page: pageNo })}
                </Text>
                <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
                  {sourceName}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.colors.border }]}>
              <Feather name="x" size={18} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Verses Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('quran.loadingMeal', 'Sayfa meali yükleniyor...')}
              </Text>
            </View>
          ) : verses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="alert-circle" size={32} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: typography.fontFamily.medium, color: theme.colors.textSecondary, textAlign: 'center' }}>
                {t('quran.noMealFound', 'Bu sayfa için meal verisi bulunamadı. İnternet bağlantınızı kontrol edin.')}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {verses.map((v, index) => (
                <View
                  key={`${v.surahNo}:${v.ayahNo}_${index}`}
                  style={[styles.verseCard, { backgroundColor: isDark ? '#231B11' : '#F9F5EA', borderColor: 'rgba(212,175,55,0.2)' }]}
                >
                  {/* Top Ayah Meta */}
                  <View style={styles.verseHeader}>
                    <View style={styles.ayahBadge}>
                      <Text style={styles.ayahBadgeText}>{v.surahNo}:{v.ayahNo}</Text>
                    </View>

                    <Pressable onPress={() => handleShareVerse(v)} style={styles.shareIconBtn}>
                      <Feather name="share-2" size={14} color="#D4AF37" />
                    </Pressable>
                  </View>

                  {/* Arabic snippet */}
                  <Text style={[styles.arabicVerse, { color: theme.colors.text }]}>
                    {v.arabicText}
                  </Text>

                  {/* Meal Translation */}
                  <Text style={[styles.translationText, { color: isDark ? 'rgba(253,248,237,0.85)' : '#3A2E20' }]}>
                    {v.translationText}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 4, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    width: '100%',
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
  },
  headerSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  verseCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ayahBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  ayahBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: '#D4AF37',
  },
  shareIconBtn: {
    padding: 6,
  },
  arabicVerse: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    marginBottom: 8,
  },
  translationText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 21,
  },
});
