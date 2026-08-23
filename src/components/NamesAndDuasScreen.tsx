import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { ESMAUL_HUSNA, EsmaulHusna } from '../data/esmaulhusna';
import { DUAS, DuaItem } from '../data/duas';
import { AdBanner } from './AdBanner';
import { ScalePressable } from './ScalePressable';
import { logScreenView } from '../services/analyticsService';

type TabType = 'names' | 'duas';

// ── Memoized Item Component: Esma Item Card ──────────────────────────────────
interface EsmaItemCardProps {
  item: EsmaulHusna;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  isDark: boolean;
  isLangTR: boolean;
  theme: any;
}

const EsmaItemCard = React.memo(({ item, isExpanded, onToggle, isDark, isLangTR, theme }: EsmaItemCardProps) => {
  const meaning = isLangTR ? item.tr : item.en;
  const cardBg = isDark ? '#1A1A24' : '#FFFFFF';
  const cardBgExpanded = isDark ? '#22213A' : '#FFFBF0';

  return (
    <ScalePressable
      activeScale={0.97}
      style={[
        styles.card,
        {
          backgroundColor: isExpanded ? cardBgExpanded : cardBg,
          borderColor: isExpanded ? theme.colors.primary : theme.colors.border,
        },
      ]}
      onPress={() => onToggle(item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.numberBadge, { backgroundColor: theme.colors.primary + '18' }]}>
          <Text style={[styles.numberText, { color: theme.colors.primary }]}>{item.id}</Text>
        </View>

        <View style={styles.titleCol}>
          <Text style={[styles.translitText, { color: theme.colors.text }]}>
            {item.transliteration}
          </Text>
          <Text style={[styles.shortMeaningText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {meaning}
          </Text>
        </View>

        <Text style={[styles.arabicText, { color: isDark ? '#F5D061' : '#8A5C00' }]}>
          {item.arabic}
        </Text>
      </View>

      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.expandedBody}>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.fullMeaningText, { color: theme.colors.text }]}>
            {meaning}
          </Text>
        </Animated.View>
      )}
    </ScalePressable>
  );
});

// ── Memoized Item Component: Dua Item Card ───────────────────────────────────
interface DuaItemCardProps {
  item: DuaItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  isDark: boolean;
  isLangTR: boolean;
  theme: any;
  t: any;
}

const DuaItemCard = React.memo(({ item, isExpanded, onToggle, isDark, isLangTR, theme, t }: DuaItemCardProps) => {
  const title = isLangTR ? item.title_tr : item.title_en;
  const meaning = isLangTR ? item.tr : item.en;
  const occasion = isLangTR ? item.occasion_tr : item.occasion_en;

  return (
    <ScalePressable
      activeScale={0.98}
      onPress={() => onToggle(item.id)}
      style={[
        styles.duaCard,
        {
          backgroundColor: isDark ? '#1A1A24' : '#FFFFFF',
          borderColor: isExpanded ? theme.colors.primary + '70' : theme.colors.border,
        },
      ]}
    >
      <View style={styles.duaHeader}>
        <View
          style={[
            styles.duaIconBox,
            {
              backgroundColor: isExpanded
                ? theme.colors.primary
                : isDark
                ? 'rgba(200,134,10,0.15)'
                : 'rgba(200,134,10,0.1)',
            },
          ]}
        >
          <Feather name="book-open" size={15} color={isExpanded ? (isDark ? '#000' : '#FFF') : theme.colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.duaTitle, { color: theme.colors.text }]}>{title}</Text>
          {occasion && !isExpanded && (
            <Text style={[styles.duaOccasionPreview, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {occasion}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.chevronBox,
            {
              backgroundColor: isExpanded
                ? theme.colors.primary + '18'
                : isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={isExpanded ? theme.colors.primary : theme.colors.textSecondary}
          />
        </View>
      </View>

      {isExpanded && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.duaBody}>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {occasion && (
            <View
              style={[
                styles.occasionBadge,
                {
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.08)',
                  borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.25)',
                },
              ]}
            >
              <Ionicons name="sparkles" size={14} color="#D4AF37" style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.occasionLabel, { color: '#D4AF37' }]}>
                  {t('duas.occasionTitle', 'Ne Zaman / Ne İçin Okunur?')}
                </Text>
                <Text style={[styles.occasionText, { color: isDark ? '#FDF8ED' : '#6B4A0E' }]}>
                  {occasion}
                </Text>
              </View>
            </View>
          )}

          {item.arabic ? (
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(200,134,10,0.12)', 'rgba(200,134,10,0.04)']
                  : ['rgba(200,134,10,0.08)', 'rgba(200,134,10,0.02)']
              }
              style={styles.arabicBlock}
            >
              <Text style={[styles.duaArabic, { color: isDark ? '#F0C060' : '#8A5C00' }]}>
                {item.arabic}
              </Text>
            </LinearGradient>
          ) : null}

          {item.transliteration ? (
            <View style={styles.translitRow}>
              <View style={[styles.translitBar, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.duaTranslit, { color: theme.colors.text }]}>
                {item.transliteration}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.meaningBlock,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
              },
            ]}
          >
            <Text style={[styles.meaningLabel, { color: theme.colors.primary }]}>
              {t('names.meaningLabel', 'Anlamı')}
            </Text>
            <Text style={[styles.duaMeaning, { color: theme.colors.text }]}>{meaning}</Text>
          </View>
        </Animated.View>
      )}
    </ScalePressable>
  );
});

export function NamesAndDuasScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('names');
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    logScreenView(activeTab === 'names' ? 'esmaulhusna' : 'dualar');
  }, [activeTab]);

  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
  const containerBg = isDark ? 'rgba(13, 13, 20, 0.2)' : 'rgba(245, 245, 247, 0.3)';

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredNames = useMemo(() => {
    if (!cleanQuery) return ESMAUL_HUSNA;
    return ESMAUL_HUSNA.filter((item) => {
      const matchName = item.transliteration.toLowerCase().includes(cleanQuery);
      const matchMeaning = (isLangTR ? item.tr : item.en).toLowerCase().includes(cleanQuery);
      return matchName || matchMeaning;
    });
  }, [cleanQuery, isLangTR]);

  const filteredDuas = useMemo(() => {
    if (!cleanQuery) return DUAS;
    return DUAS.filter((item) => {
      const title = (isLangTR ? item.title_tr : item.title_en).toLowerCase();
      const meaning = (isLangTR ? item.tr : item.en).toLowerCase();
      const occasion = (isLangTR ? item.occasion_tr : item.occasion_en).toLowerCase();
      const translit = (item.transliteration || '').toLowerCase();
      return title.includes(cleanQuery) || meaning.includes(cleanQuery) || occasion.includes(cleanQuery) || translit.includes(cleanQuery);
    });
  }, [cleanQuery, isLangTR]);

  const processedNames = useMemo(() => {
    if (cleanQuery) return filteredNames;
    const result: any[] = [];
    filteredNames.forEach((item, index) => {
      result.push(item);
      const itemNum = index + 1;
      // Ad after 4th item AND after every 15 items
      if ((itemNum === 4 || itemNum % 15 === 0) && itemNum < filteredNames.length) {
        result.push({ id: `ad_names_${itemNum}`, isAd: true });
      }
    });
    return result;
  }, [filteredNames, cleanQuery]);

  const processedDuas = useMemo(() => {
    if (cleanQuery) return filteredDuas;
    const result: any[] = [];
    filteredDuas.forEach((item, index) => {
      result.push(item);
      const itemNum = index + 1;
      // Ad after 3rd item AND after every 7 items
      if ((itemNum === 3 || itemNum % 7 === 0) && itemNum < filteredDuas.length) {
        result.push({ id: `ad_duas_${itemNum}`, isAd: true });
      }
    });
    return result;
  }, [filteredDuas, cleanQuery]);

  const toggleExpand = useCallback((id: number | string) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const switchTab = useCallback((tab: TabType) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setActiveTab(tab);
    setExpandedId(null);
  }, []);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const renderListItem = useCallback(
    ({ item }: { item: any }) => {
      if ('isAd' in item) {
        return (
          <View style={styles.adListItemCard}>
            <AdBanner />
          </View>
        );
      }
      return activeTab === 'names' ? (
        <EsmaItemCard
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={toggleExpand as any}
          isDark={isDark}
          isLangTR={isLangTR}
          theme={theme}
        />
      ) : (
        <DuaItemCard
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={toggleExpand as any}
          isDark={isDark}
          isLangTR={isLangTR}
          theme={theme}
          t={t}
        />
      );
    },
    [activeTab, expandedId, isDark, isLangTR, theme, t, toggleExpand]
  );

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* Page Title */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>
          {t('names.title', 'Esmaül Hüsna & Dualar')}
        </Text>
        <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
          {activeTab === 'names'
            ? t('names.namesSubtitle', "Allah'ın 99 Güzel İsmi ve Anlamları")
            : t('names.duasSubtitle', 'Her gün ve her duruma özel sahih dualar')}
        </Text>
      </Animated.View>

      {/* Segmented Control */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <View style={[styles.segmentedControl, {
          backgroundColor: isDark ? '#1A1A24' : '#E5E5EA',
          borderColor: theme.colors.border
        }]}>
          {(['names', 'duas'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.segmentBtn, { overflow: 'hidden', borderRadius: 12 }]}
                onPress={() => switchTab(tab)}
              >
                {isActive && (
                  <LinearGradient
                    colors={['#C8860A', '#A06A00']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Feather
                  name={tab === 'names' ? 'star' : 'book-open'}
                  size={14}
                  color={isActive ? '#FFF' : theme.colors.textSecondary}
                />
                <Text style={[styles.segmentText, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>
                  {tab === 'names' ? t('names.tabNames', '99 İsim') : t('names.tabDuas', 'Dualar')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Live Search Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderColor: theme.colors.border }]}>
          <Feather name="search" size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={
              activeTab === 'names'
                ? t('names.searchPlaceholder', 'İsim veya anlam ara...')
                : t('duas.searchPlaceholder', 'Dua, şifa, rızık, nazar ara...')
            }
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Count badge */}
      <View style={styles.countBadgeRow}>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
          <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>
            {activeTab === 'names'
              ? t('names.namesCount', { count: filteredNames.length, defaultValue: `${filteredNames.length} İsim` })
              : t('names.duasCount', { count: filteredDuas.length, defaultValue: `${filteredDuas.length} Dua` })}
          </Text>
        </View>
        <Text style={[styles.countHint, { color: theme.colors.textSecondary }]}>
          {t('names.tapHint', { defaultValue: 'Detay için dokunun' })}
        </Text>
      </View>

      {/* Optimized FlatList */}
      <FlatList
        data={(activeTab === 'names' ? processedNames : processedDuas) as any[]}
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
  },
  pageHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12.5,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 6,
  },
  segmentText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12.5,
  },
  searchWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    paddingVertical: 2,
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
  },
  countHint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 8,
  },
  adListItemCard: {
    width: '100%',
    marginVertical: 2,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  translitText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  shortMeaningText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  arabicText: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
  },
  expandedBody: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  fullMeaningText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  duaCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duaIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  duaTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  duaOccasionPreview: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  chevronBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  duaBody: {
    marginTop: 10,
  },
  occasionBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  occasionLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    marginBottom: 2,
  },
  occasionText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  arabicBlock: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  duaArabic: {
    fontSize: 19,
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    textAlign: 'center',
    lineHeight: 32,
  },
  translitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  translitBar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  duaTranslit: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  meaningBlock: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  meaningLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    marginBottom: 4,
  },
  duaMeaning: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
