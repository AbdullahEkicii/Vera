import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';
import { ESMAUL_HUSNA, EsmaulHusna } from '../data/esmaulhusna';
import { DUAS, DuaItem } from '../data/duas';
import { AdBanner } from './AdBanner';
import { ScalePressable } from './ScalePressable';

type TabType = 'names' | 'duas';

export function NamesAndDuasScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('names');
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
  const containerBg = isDark ? 'rgba(13, 13, 20, 0.2)' : 'rgba(245, 245, 247, 0.3)';
  const cardBg = isDark ? '#1A1A24' : '#FFFFFF';
  const cardBgExpanded = isDark ? '#22213A' : '#FFFBF0';

  const processedNames = useMemo(() => {
    const list = [...ESMAUL_HUSNA];
    if (list.length >= 4) {
      list.splice(4, 0, { id: 'ad_names', isAd: true } as any);
    }
    return list;
  }, []);

  const processedDuas = useMemo(() => {
    const list = [...DUAS];
    const sleepIdx = list.findIndex(d => d.id === 'sleeping');
    if (sleepIdx !== -1) {
      list.splice(sleepIdx + 1, 0, { id: 'ad_duas', isAd: true } as any);
    }
    return list;
  }, []);

  const toggleExpand = (id: number | string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setExpandedId(null);
  };

  // ── Names Item ──────────────────────────────────────────────────────────────
  const renderNameItem = ({ item, index }: { item: EsmaulHusna; index: number }) => {
    const isExpanded = expandedId === item.id;
    const meaning = isLangTR ? item.tr : item.en;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 15, 200)).duration(350)}>
        <ScalePressable
          activeScale={0.97}
          style={[
            styles.card,
            {
              backgroundColor: isExpanded ? cardBgExpanded : cardBg,
              borderColor: isExpanded ? theme.colors.primary + '80' : theme.colors.border,
            },
          ]}
          onPress={() => toggleExpand(item.id)}
        >
          <View style={styles.nameRow}>
            {/* Number Badge */}
            <View style={[styles.numBadge, {
              backgroundColor: isExpanded ? theme.colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
            }]}>
              <Text style={[styles.numText, {
                color: isExpanded ? (isDark ? '#000' : '#FFF') : theme.colors.textSecondary
              }]}>
                {item.id}
              </Text>
            </View>

            {/* Latin name */}
            <View style={styles.nameMeta}>
              <Text style={[styles.latinName, { color: theme.colors.text }]}>
                {item.transliteration}
              </Text>
            </View>

            {/* Arabic */}
            <Text style={[styles.arabicText, { color: theme.colors.primary }]}>
              {item.arabic}
            </Text>

            <Feather
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={isExpanded ? theme.colors.primary : theme.colors.textSecondary}
              style={{ marginLeft: 6 }}
            />
          </View>

          {isExpanded && (
            <Animated.View
              entering={FadeIn.duration(250)}
              style={[
                styles.nameExpanded,
                { 
                  borderTopColor: theme.colors.border + '80',
                  backgroundColor: isDark ? '#1E1D30' : '#FDF8ED',
                  borderRadius: 10,
                  marginTop: 10,
                  padding: 12,
                }
              ]}
            >
              <Text style={[styles.meaningText, { color: isDark ? '#E0D8FF' : '#2C1A0A' }]}>
                {meaning}
              </Text>
            </Animated.View>
          )}
        </ScalePressable>
      </Animated.View>
    );
  };

  // ── Duas Item ───────────────────────────────────────────────────────────────
  const renderDuaItem = ({ item, index }: { item: DuaItem; index: number }) => {
    const isExpanded = expandedId === item.id;
    const title = isLangTR ? item.title_tr : item.title_en;
    const meaning = isLangTR ? item.tr : item.en;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 200)).duration(400)}>
        <ScalePressable
          activeScale={0.98}
          onPress={() => toggleExpand(item.id)}
          style={[styles.duaCard, {
            backgroundColor: isDark ? '#1A1A24' : '#FFFFFF',
            borderColor: isExpanded ? theme.colors.primary + '70' : theme.colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.07,
            shadowRadius: 8,
            elevation: isDark ? 0 : 2,
          }]}
        >
          {/* Header row */}
          <View style={styles.duaHeader}>
            <View style={[styles.duaIconBox, {
              backgroundColor: isExpanded
                ? theme.colors.primary
                : (isDark ? 'rgba(200,134,10,0.15)' : 'rgba(200,134,10,0.1)')
            }]}>
              <Feather name="book-open" size={15} color={isExpanded ? (isDark ? '#000' : '#FFF') : theme.colors.primary} />
            </View>

            <Text style={[styles.duaTitle, { color: theme.colors.text }]}>
              {title}
            </Text>

            <View style={[styles.chevronBox, {
              backgroundColor: isExpanded
                ? (theme.colors.primary + '18')
                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
            }]}>
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isExpanded ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Expanded Content */}
          {isExpanded && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.duaBody}>
              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              {/* Arabic block */}
              <LinearGradient
                colors={isDark
                  ? ['rgba(200,134,10,0.12)', 'rgba(200,134,10,0.04)']
                  : ['rgba(200,134,10,0.08)', 'rgba(200,134,10,0.02)']}
                style={styles.arabicBlock}
              >
                <Text style={[styles.duaArabic, { color: isDark ? '#F0C060' : '#8A5C00' }]}>
                  {item.arabic}
                </Text>
              </LinearGradient>

              {/* Transliteration */}
              <View style={styles.translitRow}>
                <View style={[styles.translitBar, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.duaTranslit, { color: theme.colors.text }]}>
                  {item.transliteration}
                </Text>
              </View>

              {/* Meaning */}
              <View style={[styles.meaningBlock, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
              }]}>
                <Text style={[styles.meaningLabel, { color: theme.colors.primary }]}>
                  {isLangTR ? 'Türkçe Anlamı' : 'English Meaning'}
                </Text>
                <Text style={[styles.duaMeaning, { color: theme.colors.text }]}>
                  {meaning}
                </Text>
              </View>
            </Animated.View>
          )}
        </ScalePressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* Page Title */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>
          {activeTab === 'names' ? t('tasbih.names', 'Esmaül Hüsna') : t('tasbih.duas', 'Dualar')}
        </Text>
        <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
          {activeTab === 'names'
            ? (isLangTR ? "Allah'ın 99 güzel ismi" : "The 99 Beautiful Names of Allah")
            : (isLangTR ? 'Günlük hayat duaları' : 'Everyday supplications')}
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
                  {tab === 'names' ? t('tasbih.names', 'Esmaül Hüsna') : t('tasbih.duas', 'Dualar')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Count badge */}
      <View style={styles.countBadgeRow}>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
          <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>
            {activeTab === 'names'
              ? (isLangTR ? `${ESMAUL_HUSNA.length} isim` : `${ESMAUL_HUSNA.length} names`)
              : (isLangTR ? `${DUAS.length} dua` : `${DUAS.length} duas`)}
          </Text>
        </View>
        <Text style={[styles.countHint, { color: theme.colors.textSecondary }]}>
          {isLangTR ? 'Detay için dokun' : 'Tap for details'}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={(activeTab === 'names' ? processedNames : processedDuas) as any[]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          if ('isAd' in item) {
            return (
              <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
                <AdBanner />
              </View>
            );
          }
          return activeTab === 'names'
            ? renderNameItem({ item, index } as any)
            : renderDuaItem({ item, index } as any);
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  pageHeader: {
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 56 : 40,
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    marginTop: 4,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  segmentText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },

  // Count
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  countBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  countHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    opacity: 0.7,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 8,
  },

  // ── Names ──────────────────────────────────────────────────────────────
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
  nameMeta: {
    flex: 1,
  },
  latinName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  arabicText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 20,
  },
  nameExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  meaningText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Duas ───────────────────────────────────────────────────────────────
  duaCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  duaIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  duaTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  chevronBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  duaBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  divider: {
    height: 1,
    marginBottom: 2,
  },
  arabicBlock: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'flex-end',
  },
  duaArabic: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 38,
  },
  translitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  translitBar: {
    width: 3,
    borderRadius: 2,
    marginTop: 3,
    height: '100%',
    minHeight: 20,
  },
  duaTranslit: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    flex: 1,
  },
  meaningBlock: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  meaningLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  duaMeaning: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
  },
});
