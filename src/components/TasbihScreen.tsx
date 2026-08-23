import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, useAudioPlayer } from 'expo-audio';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing, typography } from '../utils/theme';

import { logScreenView } from '../services/analyticsService';
import { sendImmediateNotification } from '../services/notificationService';
import { AdBanner } from './AdBanner';
import { DhikrHistory, DhikrProgressModal } from './DhikrProgressModal';
import { ScalePressable } from './ScalePressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.52, 192);
const STROKE_WIDTH = 5;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

const TASBIH_STORAGE_KEY = '@tasbih_state';

const getLocalizedMonthlyTotalLabel = (lang: string): string => {
  const cleanLang = lang.split('-')[0].toLowerCase();
  const dict: Record<string, string> = {
    en: 'This Month:',
    tr: 'Bu Ay:',
    ar: 'هذا الشهر:',
    es: 'Este mes:',
    fr: 'Ce mois:',
    id: 'Bulan ini:',
    ur: 'اس ماہ:',
    fa: 'این ماه:',
    ru: 'В этом месяце:',
    bn: 'এই মাস:',
    ms: 'Bulan ini:',
    ha: 'Wannan wata:',
    sw: 'Mwezi huu:',
    de: 'Diesen Monat:',
  };
  return dict[cleanLang] || dict.en;
};

const DAILY_DHIKRS_TR = [
  { text: 'Sübhanallahi ve bihamdihi', target: 100, benefit: 'Günde 100 kere okunduğunda günahlar deniz köpüğü kadar olsa bile bağışlanır.' },
  { text: 'Lâ ilâhe illallâhu vahdehû lâ şerîke leh...', target: 100, benefit: 'Günde 100 kere okuyan, 10 köle azat etmiş gibi sevap alır ve şeytandan korunur.' },
  { text: 'Estağfirullâhe\'l-Azîm', target: 100, benefit: 'Sıkıntıları giderir, rızkı genişletir, dertlerden kurtuluş sağlar.' },
  { text: 'Lâ havle velâ kuvvete illâ billâh', target: 100, benefit: 'Cennet hazinelerinden bir hazinedir, her türlü dert ve tasayı defeder.' },
  { text: 'Sübhanallâhi velhamdülillâhi...', target: 100, benefit: 'Üzerine güneşin doğduğu her şeyden daha sevgilidir.' },
];

const DAILY_DHIKRS_EN = [
  { text: 'Subhanallahi wa bihamdihi', target: 100, benefit: 'Recited 100 times daily, sins are forgiven even if they are like the foam of the sea.' },
  { text: 'La ilaha illallahu wahdahu la sharika lah...', target: 100, benefit: 'Reciting it 100 times is equivalent to freeing 10 slaves and protects against Satan.' },
  { text: 'Astaghfirullah al-Adheem', target: 100, benefit: 'Removes distress, opens doors of sustenance, and grants relief.' },
  { text: 'La hawla wa la quwwata illa billah', target: 100, benefit: 'A treasure from the treasures of Paradise, repelling worries.' },
  { text: 'Subhanallahi walhamdulillahi...', target: 100, benefit: 'Dearest of words to Allah, heavier in scales than all else.' },
];

const TASBIH_SOUND_KEY = '@tasbih_sound_enabled';
const DHIKR_BG_AUDIO_KEY = '@tasbih_bg_audio_id';

const DHIKR_AUDIO_OPTIONS = [
  { id: 'off', labelKey: 'tasbih.bgAudioOff', defaultLabel: 'Sessiz / Kapalı', file: null },
  { id: 'dikhr1', labelKey: 'tasbih.dikhr1', defaultLabel: 'Zikir Sesi 1', file: require('../../assets/sounds/dikhr/dikhr1.mp3') },
];

interface TasbihScreenProps {
  isActiveTab?: boolean;
}

export function TasbihScreen({ isActiveTab = true }: TasbihScreenProps) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const DEFAULT_DHIKR_LIST = [
    { id: '0', text: t('tasbih.defaultInfinite', 'Serbest Zikir'), target: Infinity },
    { id: '1', text: t('tasbih.default1', 'Sübhanallah'), target: 33 },
    { id: '2', text: t('tasbih.default2', 'Elhamdülillah'), target: 33 },
    { id: '3', text: t('tasbih.default3', 'Allahu Ekber'), target: 33 },
    { id: '4', text: t('tasbih.default4', 'Lâ ilâhe illallah'), target: 100 },
    { id: '5', text: t('tasbih.default5', 'Estağfirullah'), target: 100 },
  ];

  const [customDhikrs, setCustomDhikrs] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_DHIKR_LIST[0].id);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<DhikrHistory>({});

  const [soundEnabled, setSoundEnabled] = useState(true);
  const clickPlayer = useAudioPlayer(require('../../assets/sounds/click.wav'));

  // Background Dhikr Audio Player State
  const [selectedAudioId, setSelectedAudioId] = useState<string>('off');
  const [isAudioModalVisible, setIsAudioModalVisible] = useState<boolean>(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newDhikrName, setNewDhikrName] = useState('');
  const [newDhikrTarget, setNewDhikrTarget] = useState('');
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [congratModalData, setCongratModalData] = useState<{ total: number } | null>(null);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

  // Recommendation overlay session state
  const [isRecModalVisible, setIsRecModalVisible] = useState(false);

  const modalBg = isDark ? 'rgba(18, 18, 24, 0.95)' : 'rgba(255, 255, 255, 0.97)';

  const fullDhikrList = [...DEFAULT_DHIKR_LIST, ...customDhikrs];
  const selectedDhikr = fullDhikrList.find((d) => d.id === selectedId) || fullDhikrList[0];

  const scale = useSharedValue(1);
  const ringPulse = useSharedValue(1); // Set to 1 by default so ripple is hidden initially
  const glowOpacity = useSharedValue(0);
  const progressVal = useSharedValue(0);

  // Progress ratio: 0 to 1
  const progressRatio = selectedDhikr.target === Infinity ? 0 : Math.min(count / selectedDhikr.target, 1);

  // Animate progress ring smoothly
  useEffect(() => {
    progressVal.value = withSpring(progressRatio, { damping: 15, stiffness: 120 });
  }, [count, progressRatio]);

  // Load saved background audio preference
  useEffect(() => {
    if (isActiveTab) {
      logScreenView('TasbihScreen');
    }
    const loadAudioPref = async () => {
      try {
        const saved = await AsyncStorage.getItem(DHIKR_BG_AUDIO_KEY);
        if (saved && DHIKR_AUDIO_OPTIONS.some((o) => o.id === saved)) {
          setSelectedAudioId(saved);
        }
      } catch (e) { }
    };
    loadAudioPref();
  }, []);

  // Background Audio Lifecycle Hook (Looping & Strict Memory Leak Cleanup)
  useEffect(() => {
    let currentPlayer: any = null;
    let isMounted = true;

    const startAudio = async () => {
      if (!isActiveTab || selectedAudioId === 'off') return;
      const opt = DHIKR_AUDIO_OPTIONS.find((o) => o.id === selectedAudioId);
      if (!opt || !opt.file) return;

      try {
        const player = createAudioPlayer(opt.file);
        if (!isMounted) {
          if (typeof player.remove === 'function') player.remove();
          return;
        }
        if (player) {
          player.loop = true;
          player.volume = 0.70;

          player.play();
          currentPlayer = player;
        }
      } catch (err) {
        console.error('[TasbihScreen] Error starting background dhikr audio:', err);
      }
    };

    startAudio();

    return () => {
      isMounted = false;
      if (currentPlayer) {
        try {
          if (typeof currentPlayer.pause === 'function') currentPlayer.pause();
          if (typeof currentPlayer.remove === 'function') currentPlayer.remove();
          else if (typeof currentPlayer.release === 'function') currentPlayer.release();
        } catch (e) {
          console.error('[TasbihScreen] Error releasing dhikr player:', e);
        }
        currentPlayer = null;
      }
    };
  }, [selectedAudioId, isActiveTab]);

  const selectBgAudio = async (audioId: string) => {
    setSelectedAudioId(audioId);
    setIsAudioModalVisible(false);
    try {
      await AsyncStorage.setItem(DHIKR_BG_AUDIO_KEY, audioId);
    } catch (e) { }
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const json = await AsyncStorage.getItem(TASBIH_STORAGE_KEY);
        if (json) {
          const state = JSON.parse(json);
          if (state.customDhikrs) setCustomDhikrs(state.customDhikrs);
          if (state.history) setHistory(state.history);
          if (state.selectedId) setSelectedId(state.selectedId);
          if (state.count !== undefined) setCount(state.count);
        }

        // Load sound preference
        const soundPref = await AsyncStorage.getItem(TASBIH_SOUND_KEY);
        if (soundPref !== null) {
          setSoundEnabled(soundPref === 'true');
        }
      } catch (e) { }
    };
    loadState();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          TASBIH_STORAGE_KEY,
          JSON.stringify({ selectedId, count, customDhikrs, history })
        );
      } catch (e) { }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedId, count, customDhikrs, history]);

  const toggleSound = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      await AsyncStorage.setItem(TASBIH_SOUND_KEY, String(nextVal));
    } catch (e) { }
  };

  const dailyDhikr = useMemo(() => {
    const day = new Date().getDate();
    const list = isLangTR ? DAILY_DHIKRS_TR : DAILY_DHIKRS_EN;
    return list[day % list.length];
  }, [isLangTR]);

  const ensureDailyDhikrRegistered = () => {
    const found = fullDhikrList.find((d) => d.text.toLowerCase() === dailyDhikr.text.toLowerCase());
    if (!found) {
      const newDhikr = {
        id: `rec_${dailyDhikr.text.replace(/\s+/g, '_')}`,
        text: dailyDhikr.text,
        target: dailyDhikr.target || 100
      };
      setCustomDhikrs(prev => [...prev, newDhikr]);
      return newDhikr.id;
    }
    return found.id;
  };

  const handleSelectRecommendation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const foundId = ensureDailyDhikrRegistered();
    setSelectedId(foundId);
    setCount(0);
    setIsRecModalVisible(true);
  };

  const handleTap = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 12, stiffness: 450 }),
      withSpring(1.04, { damping: 12, stiffness: 450 }),
      withSpring(1, { damping: 15, stiffness: 350 })
    );

    if (soundEnabled && clickPlayer) {
      clickPlayer.seekTo(0);
      clickPlayer.play();
    }

    const nextCount = count + 1;
    setCount(nextCount);

    if (nextCount === selectedDhikr.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 600 })
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Ripple wave effect on tap
    ringPulse.value = 0;
    ringPulse.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });

    const d = new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    setHistory((prev) => {
      const monthData = prev[monthKey] || { total: 0, dhikr_counts: {}, milestones_reached: {} };
      const newTotal = monthData.total + 1;
      const newDhikrCount = (monthData.dhikr_counts[selectedDhikr.id] || 0) + 1;
      const newMonthData = {
        ...monthData,
        total: newTotal,
        dhikr_counts: { ...monthData.dhikr_counts, [selectedDhikr.id]: newDhikrCount },
      };
      const milestones = [500, 1000, 2000];
      for (const m of milestones) {
        if (newTotal === m && !newMonthData.milestones_reached[m.toString()]) {
          newMonthData.milestones_reached[m.toString()] = true;
          setCongratModalData({ total: m });
          sendImmediateNotification(
            t('tasbih.milestoneTitle', '🎉 Tebrikler!'),
            t('tasbih.milestoneBody', 'Maşallah, bu ay toplam {{total}} zikre ulaştınız!', { total: m })
          );
        }
      }
      return { ...prev, [monthKey]: newMonthData };
    });
  }, [count, selectedDhikr.id, selectedDhikr.target, scale, glowOpacity, ringPulse, t, soundEnabled, clickPlayer]);

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsResetModalVisible(true);
  };

  const confirmReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCount(0);
    setIsResetModalVisible(false);
  };

  const handleSelectDhikr = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(id);
    setCount(0);
  };

  const handleAddCustomDhikr = () => {
    if (!newDhikrName.trim() || !newDhikrTarget.trim()) return;
    const targetNum = parseInt(newDhikrTarget, 10);
    if (isNaN(targetNum) || targetNum <= 0) return;
    const newDhikr = { id: Date.now().toString(), text: newDhikrName.trim(), target: targetNum };
    setCustomDhikrs([...customDhikrs, newDhikr]);
    setSelectedId(newDhikr.id);
    setCount(0);
    setIsModalVisible(false);
    setNewDhikrName('');
    setNewDhikrTarget('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const circleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ringPulse.value, [0, 1], [1, 1.25], Extrapolation.CLAMP) }],
    opacity: interpolate(ringPulse.value, [0, 1], [0.75, 0], Extrapolation.CLAMP),
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - CIRCUMFERENCE * progressVal.value,
  }));

  // Statistics for header info card
  const activeMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const thisMonthTotal = history[activeMonthKey]?.total || 0;

  const isCompleted = selectedDhikr.target !== Infinity && count >= selectedDhikr.target;

  const TAB_BAR_PADDING = 60 + Math.max(insets.bottom + 12, 12);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: TAB_BAR_PADDING + 8 }]}>
      {/* Background soft dim overlay for legibility */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? '#0D0D14' : '#F5F5F7',
            opacity: 0.65,
          },
        ]}
        pointerEvents="none"
      />

      {/* Header Info */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('tasbih.title', 'Zikirmatik')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {selectedDhikr.text}
            </Text>
          </View>
          {/* Compact monthly total card */}
          <View style={[styles.headerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Feather name="activity" size={14} color={theme.colors.primary} />
            <Text style={[styles.headerCardText, { color: theme.colors.textSecondary }]}>
              {getLocalizedMonthlyTotalLabel(i18n.language)}{' '}
              <Text style={[styles.headerCardTotal, { color: theme.colors.text }]}>{thisMonthTotal}</Text>
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Daily Dhikr Recommendation Card */}
      <Animated.View entering={FadeInDown.delay(40).duration(500)} style={styles.recContainer}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(99, 102, 241, 0.12)', 'rgba(168, 85, 247, 0.06)']
              : ['rgba(99, 102, 241, 0.06)', 'rgba(168, 85, 247, 0.04)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.recCard, { borderColor: theme.colors.border }]}
        >
          <View style={styles.recHeader}>
            <View style={[styles.recPill, { backgroundColor: theme.colors.primary + '15' }]}>
              <Feather name="star" size={12} color={theme.colors.primary} />
              <Text style={[styles.recPillText, { color: theme.colors.primary }]}>
                {t('tasbih.recTitle', 'Günün Zikir Önerisi')}
              </Text>
            </View>
            <Pressable
              style={[styles.recBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleSelectRecommendation}
            >
              <Text style={styles.recBtnText}>{t('tasbih.recBtnText', 'Zikre Başla')}</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Dhikr Selector Chips */}
      <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContainer}
        >
          {fullDhikrList.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <ScalePressable
                key={item.id}
                onPress={() => handleSelectDhikr(item.id)}
                activeScale={0.93}
                style={[
                  styles.chip,
                  isSelected
                    ? { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }
                    : {
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? '#FFF'
                        : isDark
                          ? 'rgba(255,255,255,0.85)'
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {item.text}
                </Text>
              </ScalePressable>
            );
          })}
          <ScalePressable
            onPress={() => setIsModalVisible(true)}
            activeScale={0.93}
            style={[
              styles.chip,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: theme.colors.primary,
                borderStyle: 'dashed',
              },
            ]}
          >
            <Feather name="plus" size={14} color={theme.colors.primary} />
            <Text style={[styles.chipText, { color: theme.colors.primary }]}>
              {t('tasbih.addCustom', 'Yeni Ekle')}
            </Text>
          </ScalePressable>
        </ScrollView>
      </Animated.View>

      {/* Main Tap Area */}
      <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.mainArea}>
        <Pressable style={styles.tapArea} onPress={handleTap}>
          {/* Animated pulsing ripple ring */}
          <Animated.View
            style={[
              styles.outerRing,
              { borderColor: theme.colors.primary, borderStyle: 'solid' },
              ringPulseStyle,
            ]}
          />

          {/* SVG Circular Progress Ring */}
          <View style={styles.svgOverlay} pointerEvents="none">
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
              <Defs>
                <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={theme.colors.heroGradient[0]} stopOpacity="1" />
                  <Stop offset="1" stopColor={theme.colors.heroGradient[1]} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              {/* Animated Progress Circle */}
              {selectedDhikr.target !== Infinity && (
                <AnimatedCircle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#ringGrad)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                />
              )}
            </Svg>
          </View>

          {/* Completion flash overlay inside circle */}
          <Animated.View style={[styles.completionGlow, { backgroundColor: theme.colors.primary }, glowStyle]} />

          {/* Physical glassmorphic tap circle */}
          <Animated.View style={[styles.circleInner, circleAnimStyle]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                  : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.45)']
              }
              style={StyleSheet.absoluteFillObject}
            />
            {/* Fine border inside glass */}
            <View
              style={[
                styles.circleBorder,
                {
                  borderColor: isCompleted ? theme.colors.primary : 'rgba(255, 255, 255, 0.25)',
                  borderWidth: isCompleted ? 2.5 : 1,
                },
              ]}
            />

            <Text style={[styles.countText, { color: theme.colors.text }]} adjustsFontSizeToFit numberOfLines={1}>
              {count}
            </Text>

            {selectedDhikr.target !== Infinity ? (
              <Text style={[styles.targetText, { color: theme.colors.textSecondary }]}>
                / {selectedDhikr.target}
              </Text>
            ) : (
              <Text style={[styles.targetText, { color: theme.colors.textSecondary }]}>
                ∞
              </Text>
            )}

            {isCompleted && (
              <AnimatedView
                entering={FadeInDown.duration(300)}
                style={[styles.completedBadge, { backgroundColor: theme.colors.primaryLight }]}
              >
                <Feather name="check" size={11} color={theme.colors.primary} />
                <Text style={[styles.completedText, { color: theme.colors.primary }]}>
                  {t('tasbih.completed', 'Tamamlandı')}
                </Text>
              </AnimatedView>
            )}
          </Animated.View>

          <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>
            {t('tasbih.tapHint', 'ARTIRMAK İÇİN DOKUN').toUpperCase()}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Bottom controls & Ad Banner */}
      <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.bottomSection}>
        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.25)',
              },
            ]}
            onPress={handleReset}
          >
            <Feather name="rotate-ccw" size={14} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t('tasbih.reset', 'Sıfırla')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={toggleSound}
          >
            <Feather name={soundEnabled ? 'volume-2' : 'volume-x'} size={14} color={theme.colors.text} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {soundEnabled ? t('tasbih.soundOn', 'Ses Açık') : t('tasbih.soundOff', 'Ses Kapalı')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: selectedAudioId !== 'off'
                  ? (isDark ? 'rgba(200, 134, 10, 0.2)' : 'rgba(200, 134, 10, 0.12)')
                  : theme.colors.surface,
                borderWidth: 1,
                borderColor: selectedAudioId !== 'off' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setIsAudioModalVisible(true)}
          >
            <Feather name="music" size={14} color={selectedAudioId !== 'off' ? theme.colors.primary : theme.colors.text} />
            <Text style={[styles.actionBtnText, { color: selectedAudioId !== 'off' ? theme.colors.primary : theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {selectedAudioId !== 'off'
                ? (t(DHIKR_AUDIO_OPTIONS.find((o) => o.id === selectedAudioId)?.labelKey || '', DHIKR_AUDIO_OPTIONS.find((o) => o.id === selectedAudioId)?.defaultLabel || 'Fon Sesi'))
                : t('tasbih.bgAudioOff', 'Fon Sesi')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setIsProgressModalVisible(true)}
          >
            <Feather name="bar-chart-2" size={14} color={theme.colors.text} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t('tasbih.progressBtn', 'İlerleme')}
            </Text>
          </Pressable>
        </View>

        {/* Saved Notice */}
        <View style={styles.noticeContainer}>
          <Feather name="shield" size={11} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />
          <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
            {t('tasbih.savedNotice', 'Kaldığınız yerden devam edebilirsiniz.')}
          </Text>
        </View>

        {/* Live AdMob Native Ad Space */}
        <AdBanner />
      </Animated.View>

      {/* Add Custom Dhikr Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalCard, { backgroundColor: modalBg, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.colors.textSecondary }]} />
              <View style={[styles.modalIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <Feather name="edit-3" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('tasbih.modalTitle', 'Yeni Zikir Ekle')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder={t('tasbih.dhikrName', 'Zikir Adı')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newDhikrName}
                onChangeText={setNewDhikrName}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder={t('tasbih.targetCount', 'Hedef Sayı')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newDhikrTarget}
                onChangeText={setNewDhikrTarget}
                keyboardType="numeric"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.colors.border, flex: 1 }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: theme.colors.textSecondary }]}>
                    {t('tasbih.cancel', 'İptal')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: theme.colors.primary, flex: 2 }]}
                  onPress={handleAddCustomDhikr}
                >
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                    {t('tasbih.save', 'Kaydet')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

      {/* Reset Modal */}
      <Modal visible={isResetModalVisible} transparent animationType="fade">
        <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: modalBg, alignItems: 'center', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={[styles.modalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Feather name="rotate-ccw" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('tasbih.resetConfirmTitle', 'Sayacı Sıfırla')}
            </Text>
            <Text style={[styles.modalBody, { color: theme.colors.textSecondary }]}>
              {t('tasbih.resetConfirmMsg', 'Sayacı sıfırlamak istediğinize emin misiniz?')}
            </Text>
            <View style={[styles.modalActions, { width: '100%', marginTop: 24 }]}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { flex: 1, borderColor: theme.colors.border }]}
                onPress={() => setIsResetModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.colors.textSecondary }]}>
                  {t('tasbih.no', 'Hayır')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave, { flex: 1, backgroundColor: '#EF4444' }]}
                onPress={confirmReset}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                  {t('tasbih.yes', 'Evet')}
                </Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Milestone Modal */}
      <Modal visible={congratModalData !== null} transparent animationType="fade">
        <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: modalBg, alignItems: 'center', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={[styles.modalIconBox, { backgroundColor: theme.colors.primaryLight, width: 80, height: 80, borderRadius: 40 }]}>
              <Feather name="award" size={38} color={theme.colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text, fontSize: 22, marginTop: 8 }]}>
              {t('tasbih.milestoneTitle', '🎉 Tebrikler!')}
            </Text>
            <Text style={[styles.modalBody, { color: theme.colors.textSecondary }]}>
              {t('tasbih.milestoneBody', 'Maşallah, bu ay toplam {{total}} zikre ulaştınız!', { total: congratModalData?.total })}
            </Text>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: theme.colors.primary, width: '100%', marginTop: 24 }]}
              onPress={() => setCongratModalData(null)}
            >
              <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Tamam</Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>

      {/* Daily Recommendation Info Modal */}
      <Modal visible={isRecModalVisible} transparent animationType="fade">
        <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: modalBg, borderColor: theme.colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.textSecondary }]} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('tasbih.recTitle', 'Günün Zikir Önerisi')}
            </Text>

            <ScrollView style={{ maxHeight: 220, marginVertical: spacing.md }} showsVerticalScrollIndicator={true}>
              <Text style={[styles.recModalText, { color: theme.colors.text }]}>
                {dailyDhikr.text}
              </Text>

              <Text style={[styles.recModalBenefit, { color: theme.colors.textSecondary }]}>
                {dailyDhikr.benefit}
              </Text>
            </ScrollView>

            <View style={[styles.recModalTargetBox, { backgroundColor: theme.colors.primary + '15', marginBottom: spacing.md }]}>
              <Feather name="target" size={12} color={theme.colors.primary} />
              <Text style={[styles.recModalTargetText, { color: theme.colors.primary }]}>
                {t('tasbih.recTarget', 'Hedef:')} {dailyDhikr.target || 100}
              </Text>
            </View>

            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setIsRecModalVisible(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                {t('common.ok', 'Tamam')}
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>

      {/* Progress Modal */}
      {/* Background Dhikr Audio Selection Modal */}
      <Modal
        visible={isAudioModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAudioModalVisible(false)}
      >
        <BlurView intensity={isDark ? 40 : 25} tint={isDark ? 'dark' : 'light'} style={styles.audioModalOverlay}>
          <View style={[styles.audioModalCard, { backgroundColor: isDark ? 'rgba(22, 22, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)', borderColor: theme.colors.border }]}>
            <View style={styles.audioModalHeader}>
              <View style={[styles.audioModalIconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
                <Feather name="music" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.audioModalTitle, { color: theme.colors.text }]}>
                  {t('tasbih.bgAudioTitle', 'Fon Zikir Sesi')}
                </Text>
                <Text style={[styles.audioModalSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('tasbih.bgAudioSelect', 'Zikir esnasında arkada çalacak sesi seçin')}
                </Text>
              </View>
              <Pressable onPress={() => setIsAudioModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.audioOptionsList}>
              {DHIKR_AUDIO_OPTIONS.map((opt) => {
                const isSelected = selectedAudioId === opt.id;
                const label = t(opt.labelKey, opt.defaultLabel);
                return (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.audioOptionRow,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(200, 134, 10, 0.18)' : 'rgba(200, 134, 10, 0.1)')
                          : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => selectBgAudio(opt.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather
                        name={opt.id === 'off' ? 'volume-x' : 'disc'}
                        size={18}
                        color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <Text style={[styles.audioOptionLabel, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                        {label}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={[styles.audioCheckBadge, { backgroundColor: theme.colors.primary }]}>
                        <Feather name="check" size={12} color="#FFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BlurView>
      </Modal>

      <DhikrProgressModal
        visible={isProgressModalVisible}
        onClose={() => setIsProgressModalVisible(false)}
        history={history}
        dhikrList={fullDhikrList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 1,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 5,
  },
  headerCardText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11.5,
  },
  headerCardTotal: {
    fontFamily: typography.fontFamily.bold,
  },
  chipsContainer: {
    marginBottom: 4,
  },
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  mainArea: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  tapArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
  },
  svgOverlay: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  completionGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    opacity: 0,
    zIndex: 2,
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
    zIndex: 3,
  },
  circleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CIRCLE_SIZE / 2,
  },
  countText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 66,
    letterSpacing: -2,
    textAlign: 'center',
  },
  targetText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    marginTop: -2,
    opacity: 0.7,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  completedText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 10.5,
  },
  tapHint: {
    marginTop: 6,
    fontFamily: typography.fontFamily.medium,
    fontSize: 9.5,
    letterSpacing: 2,
    opacity: 0.5,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    textAlign: 'center',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.5,
    width: '100%',
    marginVertical: 1,
  },
  noticeText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    textAlign: 'center',
  },
  adBanner: {
    width: '100%',
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  adText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1,
  },

  // ── Modal Styles ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    alignItems: 'stretch',
  },
  modalHandle: {
    width: 32,
    height: 3.5,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.25,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 19,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  modalBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  modalBtnSave: {
    paddingHorizontal: 16,
  },
  modalBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  // Recommendation styles
  recContainer: {
    paddingHorizontal: spacing.lg,
    width: '100%',
    marginBottom: 6,
  },
  recCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  recPillText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  recBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFF',
  },
  recText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  recBenefit: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
  },

  // ── Daily Zikir Modal specific styles ───────────────────────
  recModalText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  recModalBenefit: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  recModalTargetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  recModalTargetText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },

  // ── Background Audio Modal Styles ───────────────────────
  audioModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  audioModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  audioModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  audioModalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioModalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  audioModalSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  audioOptionsList: {
    gap: 8,
  },
  audioOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  audioOptionLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  audioCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
