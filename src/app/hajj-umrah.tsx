import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar, LayoutAnimation } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { AppBackground } from '../components/ProgressRing';
import { logScreenView } from '../services/analyticsService';
import { HAJJ_UMRAH_STEPS, HAJJ_UMRAH_CHECKLIST } from '../data/hajjUmrah';
import { BannerAdSlot } from '../components/BannerAdSlot';
import { useIsFocused } from '@react-navigation/native';
import { useCt } from '../localization/content';
import { directionalIconStyle } from '../utils/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HajjUmrahScreen() {
  const insets = useSafeAreaInsets();
  // Edge-to-edge / cut-out safe: StatusBar.currentHeight alone can be 0 or stale.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const { t, i18n } = useTranslation();
  const ct = useCt();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  const isLangTR = i18n.language.startsWith('tr');

  const [mode, setMode] = useState<'umrah' | 'hajj'>('umrah');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    logScreenView('HajjUmrahScreen');
  }, []);

  const steps = useMemo(
    () => HAJJ_UMRAH_STEPS.filter((s) => s.appliesTo.includes(mode)).sort((a, b) => a.order - b.order),
    [mode]
  );

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppBackground isDark={isDark}>
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.text} style={directionalIconStyle} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('hajjUmrah.title', 'Hac & Umre Rehberi')}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
          {(['umrah', 'hajj'] as const).map((m) => (
            <Pressable
              key={m}
              style={[
                styles.segmentButton,
                mode === m && [styles.segmentButtonActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }],
              ]}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.segmentText, { color: mode === m ? theme.colors.text : theme.colors.textSecondary }]}>
                {m === 'umrah' ? t('hajjUmrah.umrah', 'Umre') : t('hajjUmrah.hajj', 'Hac')}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('hajjUmrah.stepsTitle', 'Adım Adım Menasik')}
          </Text>

          <View style={{ gap: 10 }}>
            {steps.map((step, idx) => {
              const isExpanded = expandedId === step.id;
              return (
                <Animated.View
                  key={step.id}
                  entering={FadeInDown.delay(idx * 40).duration(350)}
                  style={[styles.stepCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
                >
                  <Pressable style={styles.stepHeader} onPress={() => toggleExpanded(step.id)}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.stepNumberText, { color: theme.colors.primaryText }]}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                      {ct(`content.hajj.${step.id}.title`, step.titleTR, step.titleEN)}
                    </Text>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textSecondary} />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.stepBody}>
                      <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]}>
                        {ct(`content.hajj.${step.id}.desc`, step.descTR, step.descEN)}
                      </Text>
                      {step.duaArabic && (
                        <View style={[styles.duaBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
                          <Text style={[styles.duaArabic, { color: theme.colors.text }]}>{step.duaArabic}</Text>
                          {step.duaTransliteration && (
                            <Text style={[styles.duaTransliteration, { color: theme.colors.textSecondary }]}>{step.duaTransliteration}</Text>
                          )}
                          <Text style={[styles.duaMeaning, { color: theme.colors.text }]}>
                            {isLangTR ? step.duaTR : step.duaEN}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Keyed by tab so Umrah and Hajj each load their own ad */}
          <View style={{ marginTop: 20 }}>
            <BannerAdSlot placement="hajj_umrah" key={mode} isVisible={isFocused} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>
            {t('hajjUmrah.checklistTitle', 'Hazırlık Kontrol Listesi')}
          </Text>
          <View style={{ gap: 8 }}>
            {HAJJ_UMRAH_CHECKLIST.map((item, idx) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.checklistRow,
                    { backgroundColor: theme.colors.surfaceStrong, borderColor: isChecked ? theme.colors.primary : theme.colors.border },
                  ]}
                  onPress={() => toggleChecklistItem(item.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { backgroundColor: isChecked ? theme.colors.primary : 'transparent', borderColor: isChecked ? theme.colors.primary : theme.colors.border },
                    ]}
                  >
                    {isChecked && <Feather name="check" size={12} color="#1A1207" />}
                  </View>
                  <Text style={[styles.checklistText, { color: theme.colors.text, textDecorationLine: isChecked ? 'line-through' : 'none' }]}>
                    {ct(`content.hajj.${item.id}.label`, item.labelTR, item.labelEN)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  stepCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  stepBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  stepDesc: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  duaBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  duaArabic: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    fontFamily: 'serif',
  },
  duaTransliteration: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
  duaMeaning: {
    fontSize: 12,
    lineHeight: 18,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
