import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
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
  FadeIn,
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

import { logScreenView, logDhikrCompleted } from '../services/analyticsService';
import { StoryCardShareModal } from './StoryCardShareModal';
import { sendImmediateNotification } from '../services/notificationService';
import { BannerAdSlot } from './BannerAdSlot';
import { DhikrHistory, DhikrProgressModal } from './DhikrProgressModal';
import { ScalePressable } from './ScalePressable';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TASBIH_STORAGE_KEY = '@tasbih_state';
const TASBIH_SOUND_KEY = '@tasbih_sound_enabled';
const DHIKR_BG_AUDIO_KEY = '@tasbih_bg_audio_id';

// Mirrors the floating tab bar geometry in (tabs)/index.tsx: 64dp bar + its bottom offset.
const TAB_BAR_HEIGHT = 64;
const RING_STROKE = 6;
const MIN_DIAL = 168;
const MAX_DIAL = 288;
const MILESTONES = [500, 1000, 2000];

const DHIKR_AUDIO_OPTIONS = [
  { id: 'off', labelKey: 'tasbih.bgAudioOff', defaultLabel: 'Sessiz / Kapalı', file: null },
  { id: 'dikhr1', labelKey: 'tasbih.dikhr1', defaultLabel: 'Zikir Sesi 1', file: require('../../assets/sounds/dikhr/dikhr1.mp3') },
];

interface DailyDhikrEntry {
  text: string;
  target: number;
  benefit: string;
}

interface DhikrItem {
  id: string;
  text: string;
  target: number;
}

interface TasbihScreenProps {
  isActiveTab?: boolean;
}

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dayKeyOf = (d: Date) => d.toISOString().split('T')[0];

export function TasbihScreen({ isActiveTab = true }: TasbihScreenProps) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const defaultDhikrList: DhikrItem[] = useMemo(
    () => [
      { id: '0', text: t('tasbih.defaultInfinite', 'Serbest Zikir'), target: Infinity },
      { id: '1', text: t('tasbih.default1', 'Sübhanallah'), target: 33 },
      { id: '2', text: t('tasbih.default2', 'Elhamdülillah'), target: 33 },
      { id: '3', text: t('tasbih.default3', 'Allahu Ekber'), target: 33 },
      { id: '4', text: t('tasbih.default4', 'Lâ ilâhe illallah'), target: 100 },
      { id: '5', text: t('tasbih.default5', 'Estağfirullah'), target: 100 },
    ],
    [t]
  );

  const [customDhikrs, setCustomDhikrs] = useState<DhikrItem[]>([]);
  const [selectedId, setSelectedId] = useState(defaultDhikrList[0].id);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [history, setHistory] = useState<DhikrHistory>({});
  const [dailyActivity, setDailyActivity] = useState<Record<string, number>>({});

  const [soundEnabled, setSoundEnabled] = useState(true);
  const clickPlayer = useAudioPlayer(require('../../assets/sounds/click.wav'));
  const [selectedAudioId, setSelectedAudioId] = useState<string>('off');

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newDhikrName, setNewDhikrName] = useState('');
  const [newDhikrTarget, setNewDhikrTarget] = useState('');
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isRecModalVisible, setIsRecModalVisible] = useState(false);
  const [congratModalData, setCongratModalData] = useState<{ total: number } | null>(null);
  const [milestoneShareVisible, setMilestoneShareVisible] = useState(false);
  const [lastMilestoneTotal, setLastMilestoneTotal] = useState<number | null>(null);

  const [dialSize, setDialSize] = useState(0);

  const fullDhikrList = useMemo(() => [...defaultDhikrList, ...customDhikrs], [defaultDhikrList, customDhikrs]);
  const selectedDhikr = fullDhikrList.find((d) => d.id === selectedId) || fullDhikrList[0];
  const hasTarget = selectedDhikr.target !== Infinity;
  const isCompleted = hasTarget && count >= selectedDhikr.target;
  const progressRatio = hasTarget ? Math.min(count / selectedDhikr.target, 1) : 0;

  const setCountValue = useCallback((value: number) => {
    countRef.current = value;
    setCount(value);
  }, []);

  // ── Animations ────────────────────────────────────────────────────────────
  const pressScale = useSharedValue(1);
  const ripple = useSharedValue(1);
  const completionFlash = useSharedValue(0);
  const progressVal = useSharedValue(0);

  useEffect(() => {
    progressVal.value = withSpring(progressRatio, { damping: 16, stiffness: 120 });
  }, [progressRatio, progressVal]);

  const radius = dialSize > 0 ? (dialSize - RING_STROKE) / 2 : 0;
  const circumference = radius * 2 * Math.PI;

  const dialAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple.value, [0, 1], [1, 1.18], Extrapolation.CLAMP) }],
    opacity: interpolate(ripple.value, [0, 1], [0.5, 0], Extrapolation.CLAMP),
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: completionFlash.value * 0.35 }));
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - circumference * progressVal.value,
  }));

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(TASBIH_STORAGE_KEY);
        if (json) {
          const state = JSON.parse(json);
          if (state.customDhikrs) setCustomDhikrs(state.customDhikrs);
          if (state.history) setHistory(state.history);
          if (state.dailyActivity) setDailyActivity(state.dailyActivity);
          if (state.selectedId) setSelectedId(state.selectedId);
          if (typeof state.count === 'number') setCountValue(state.count);
        }
        const soundPref = await AsyncStorage.getItem(TASBIH_SOUND_KEY);
        if (soundPref !== null) setSoundEnabled(soundPref === 'true');
        const audioPref = await AsyncStorage.getItem(DHIKR_BG_AUDIO_KEY);
        if (audioPref && DHIKR_AUDIO_OPTIONS.some((o) => o.id === audioPref)) setSelectedAudioId(audioPref);
      } catch {}
    })();
  }, [setCountValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        TASBIH_STORAGE_KEY,
        JSON.stringify({ selectedId, count, customDhikrs, history, dailyActivity })
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedId, count, customDhikrs, history, dailyActivity]);

  useEffect(() => {
    if (isActiveTab) logScreenView('TasbihScreen');
  }, [isActiveTab]);

  // Looping background dhikr audio, only while this tab is active.
  useEffect(() => {
    if (!isActiveTab || selectedAudioId === 'off') return;
    const opt = DHIKR_AUDIO_OPTIONS.find((o) => o.id === selectedAudioId);
    if (!opt?.file) return;

    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer(opt.file);
      player.loop = true;
      player.volume = 0.7;
      player.play();
    } catch (err) {
      console.error('[TasbihScreen] Error starting background dhikr audio:', err);
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {}
    };
  }, [selectedAudioId, isActiveTab]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const thisMonthTotal = history[monthKeyOf(new Date())]?.total || 0;

  const streakCount = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if ((dailyActivity[dayKeyOf(d)] || 0) > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
      // Today without activity yet does not break the streak; the day is not over.
    }
    return streak;
  }, [dailyActivity]);

  const dailyDhikr = useMemo<DailyDhikrEntry>(() => {
    const list = t('tasbih.dailyDhikrs', { returnObjects: true }) as unknown as DailyDhikrEntry[];
    if (!Array.isArray(list) || list.length === 0) {
      return { text: 'Sübhanallahi ve bihamdihi', target: 100, benefit: '' };
    }
    return list[new Date().getDate() % list.length];
  }, [t]);

  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    pressScale.value = withSequence(
      withSpring(0.94, { damping: 12, stiffness: 480 }),
      withSpring(1, { damping: 14, stiffness: 360 })
    );
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });

    if (soundEnabled && clickPlayer) {
      clickPlayer.seekTo(0);
      clickPlayer.play();
    }

    const nextCount = countRef.current + 1;
    setCountValue(nextCount);

    if (nextCount === selectedDhikr.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logDhikrCompleted(selectedDhikr.id, selectedDhikr.target);
      completionFlash.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 700 }));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const now = new Date();
    const monthKey = monthKeyOf(now);
    const dayKey = dayKeyOf(now);
    setDailyActivity((prev) => ({ ...prev, [dayKey]: (prev[dayKey] || 0) + 1 }));
    setHistory((prev) => {
      const monthData = prev[monthKey] || { total: 0, dhikr_counts: {}, milestones_reached: {} };
      const newTotal = monthData.total + 1;
      const next = {
        ...monthData,
        total: newTotal,
        dhikr_counts: {
          ...monthData.dhikr_counts,
          [selectedDhikr.id]: (monthData.dhikr_counts[selectedDhikr.id] || 0) + 1,
        },
        milestones_reached: { ...monthData.milestones_reached },
      };
      for (const m of MILESTONES) {
        if (newTotal === m && !next.milestones_reached[String(m)]) {
          next.milestones_reached[String(m)] = true;
          setCongratModalData({ total: m });
          sendImmediateNotification(
            t('tasbih.milestoneTitle', 'Tebrikler!'),
            t('tasbih.milestoneBody', 'Maşallah, bu ay toplam {{total}} zikre ulaştınız!', { total: m })
          );
        }
      }
      return { ...prev, [monthKey]: next };
    });
  }, [selectedDhikr.id, selectedDhikr.target, soundEnabled, clickPlayer, setCountValue, pressScale, ripple, completionFlash, t]);

  const handleSelectDhikr = (id: string) => {
    if (id === selectedId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(id);
    setCountValue(0);
  };

  const handleStartRecommendation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existing = fullDhikrList.find((d) => d.text.toLowerCase() === dailyDhikr.text.toLowerCase());
    let id = existing?.id;
    if (!id) {
      const created: DhikrItem = {
        id: `rec_${dailyDhikr.text.replace(/\s+/g, '_')}`,
        text: dailyDhikr.text,
        target: dailyDhikr.target || 100,
      };
      setCustomDhikrs((prev) => [...prev, created]);
      id = created.id;
    }
    setSelectedId(id);
    setCountValue(0);
    setIsRecModalVisible(true);
  };

  const confirmReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCountValue(0);
    setIsResetModalVisible(false);
  };

  const handleAddCustomDhikr = () => {
    const name = newDhikrName.trim();
    const targetNum = parseInt(newDhikrTarget, 10);
    if (!name || isNaN(targetNum) || targetNum <= 0) return;
    const created: DhikrItem = { id: Date.now().toString(), text: name, target: targetNum };
    setCustomDhikrs((prev) => [...prev, created]);
    setSelectedId(created.id);
    setCountValue(0);
    setIsAddModalVisible(false);
    setNewDhikrName('');
    setNewDhikrTarget('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    AsyncStorage.setItem(TASBIH_SOUND_KEY, String(next)).catch(() => {});
  };

  const selectBgAudio = (audioId: string) => {
    setSelectedAudioId(audioId);
    setIsAudioModalVisible(false);
    AsyncStorage.setItem(DHIKR_BG_AUDIO_KEY, audioId).catch(() => {});
  };

  // The dial takes whatever vertical space is left, bounded by width and height.
  const handleHeroLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const statusLine = 40;
    const size = Math.round(Math.max(MIN_DIAL, Math.min(width * 0.74, height - statusLine, MAX_DIAL)));
    setDialSize((prev) => (prev === size ? prev : size));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const bottomReserve = TAB_BAR_HEIGHT + Math.max(insets.bottom + 8, 22) + spacing.md;
  const bgAudioOn = selectedAudioId !== 'off';
  const overlayColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.35)';
  const sheetColor = isDark ? '#16161E' : '#FFFFFF';
  const trackColor = theme.colors.borderStrong;

  const statusText = isCompleted
    ? t('tasbih.completed', 'Tamamlandı')
    : hasTarget
      ? t('tasbih.remaining', '{{count}} kaldı', { count: selectedDhikr.target - count })
      : t('tasbih.tapToCount', 'Saymak için dokun');

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: bottomReserve }]}>
      {/* Header: title, quick toggles */}
      <Animated.View entering={FadeInDown.duration(420)} style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
          {t('tasbih.title', 'Zikirmatik')}
        </Text>
        <View style={styles.headerActions}>
          <IconToggle
            icon={soundEnabled ? 'volume-2' : 'volume-x'}
            active={soundEnabled}
            onPress={toggleSound}
            label={soundEnabled ? t('tasbih.soundOn', 'Ses Açık') : t('tasbih.soundOff', 'Ses Kapalı')}
            colors={theme.colors}
          />
          <IconToggle
            icon="music"
            active={bgAudioOn}
            onPress={() => setIsAudioModalVisible(true)}
            label={t('tasbih.bgAudioTitle', 'Fon Zikir Sesi')}
            colors={theme.colors}
          />
        </View>
      </Animated.View>

      {/* Stats: month total and streak */}
      <Animated.View entering={FadeInDown.delay(40).duration(420)} style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="activity" size={13} color={theme.colors.primary} />
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {t('tasbih.monthStat', 'Bu ay')}
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatNumber(thisMonthTotal)}</Text>
        </View>
        {streakCount > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.textSecondary }]} />
            <View style={styles.stat}>
              <Feather name="zap" size={13} color={theme.colors.primary} />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                {t('tasbih.streakStat', 'Seri')}
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {t('tasbih.streakValue', '{{count}} gün', { count: streakCount })}
              </Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* Ad slot: reserved height, kept away from the counter and the tab bar */}
      <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.adSection}>
        <BannerAdSlot placement="tasbih" isVisible={isActiveTab} lazy={false} />
      </Animated.View>

      {/* Dhikr picker */}
      <Animated.View entering={FadeInDown.delay(120).duration(420)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {fullDhikrList.map((item) => {
            const selected = item.id === selectedId;
            return (
              <ScalePressable
                key={item.id}
                onPress={() => handleSelectDhikr(item.id)}
                activeScale={0.94}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.colors.text }]}
                >
                  {item.text}
                </Text>
                {item.target !== Infinity && (
                  <Text
                    style={[
                      styles.chipTarget,
                      { color: selected ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary },
                    ]}
                  >
                    {item.target}
                  </Text>
                )}
              </ScalePressable>
            );
          })}
          <ScalePressable
            onPress={() => setIsAddModalVisible(true)}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('tasbih.modalTitle', 'Yeni Zikir Ekle')}
            style={[styles.chip, styles.chipAdd, { borderColor: theme.colors.primary }]}
          >
            <Feather name="plus" size={14} color={theme.colors.primary} />
            <Text style={[styles.chipText, { color: theme.colors.primary }]}>{t('tasbih.addShort', 'Ekle')}</Text>
          </ScalePressable>
        </ScrollView>
      </Animated.View>

      {/* Daily recommendation: one line, shows the actual dhikr */}
      <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.recWrap}>
        <Pressable
          onPress={handleStartRecommendation}
          accessibilityRole="button"
          accessibilityLabel={`${t('tasbih.recTitle', 'Günün Zikir Önerisi')}: ${dailyDhikr.text}`}
          style={({ pressed }) => [
            styles.recRow,
            { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.borderStrong, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="star" size={13} color={theme.colors.primary} />
          <Text style={[styles.recLabel, { color: theme.colors.primary }]}>{t('tasbih.recShort', 'Öneri')}</Text>
          <Text numberOfLines={1} style={[styles.recText, { color: theme.colors.text }]}>
            {dailyDhikr.text}
          </Text>
          <View style={styles.recCta}>
            <Text style={[styles.recCtaText, { color: theme.colors.primary }]}>
              {t('tasbih.recBtnText', 'Zikre Başla')}
            </Text>
            <Feather name="chevron-right" size={14} color={theme.colors.primary} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Hero dial: the one thing that leads */}
      <View style={styles.hero} onLayout={handleHeroLayout}>
        {dialSize > 0 && (
          <Animated.View entering={FadeIn.duration(360)} style={styles.heroInner}>
            <Pressable
              onPress={handleTap}
              accessibilityRole="button"
              accessibilityLabel={`${selectedDhikr.text}, ${count}${hasTarget ? ` / ${selectedDhikr.target}` : ''}`}
              accessibilityHint={t('tasbih.tapToCount', 'Saymak için dokun')}
              style={{ width: dialSize, height: dialSize }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ripple,
                  { width: dialSize, height: dialSize, borderRadius: dialSize / 2, borderColor: theme.colors.primary },
                  rippleStyle,
                ]}
              />
              <Animated.View style={[styles.fill, dialAnimStyle]}>
                <Svg width={dialSize} height={dialSize} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <SvgLinearGradient id="tasbihArc" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={theme.colors.heroGradient[0]} />
                      <Stop offset="1" stopColor={theme.colors.heroGradient[1]} />
                    </SvgLinearGradient>
                  </Defs>
                  <Circle
                    cx={dialSize / 2}
                    cy={dialSize / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  {hasTarget && (
                    <AnimatedCircle
                      cx={dialSize / 2}
                      cy={dialSize / 2}
                      r={radius}
                      stroke="url(#tasbihArc)"
                      strokeWidth={RING_STROKE}
                      fill="none"
                      strokeDasharray={circumference}
                      strokeLinecap="round"
                      rotation="-90"
                      origin={`${dialSize / 2}, ${dialSize / 2}`}
                      animatedProps={arcProps}
                    />
                  )}
                </Svg>

                <View
                  style={[
                    styles.disc,
                    {
                      margin: RING_STROKE + 10,
                      borderRadius: dialSize,
                      backgroundColor: theme.colors.surfaceStrong,
                      borderColor: isCompleted ? theme.colors.primary : theme.colors.border,
                      shadowColor: theme.colors.glow,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={isDark ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.4)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: dialSize }]}
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { borderRadius: dialSize, backgroundColor: theme.colors.primary }, flashStyle]}
                  />
                  <Text numberOfLines={1} style={[styles.dialName, { color: theme.colors.textSecondary }]}>
                    {selectedDhikr.text}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.count, { color: theme.colors.text, fontSize: Math.round(dialSize * 0.3) }]}
                  >
                    {count}
                  </Text>
                  <Text style={[styles.target, { color: theme.colors.textSecondary }]}>
                    {hasTarget ? `/ ${selectedDhikr.target}` : t('tasbih.noTarget', 'Hedefsiz')}
                  </Text>
                </View>
              </Animated.View>
            </Pressable>

            <View style={styles.statusLine}>
              {isCompleted && <Feather name="check-circle" size={14} color={theme.colors.primary} />}
              <Text
                style={[
                  styles.statusText,
                  { color: isCompleted ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {statusText}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Controls */}
      <Animated.View entering={FadeInDown.delay(200).duration(420)} style={styles.controls}>
        <ScalePressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsResetModalVisible(true);
          }}
          disabled={count === 0}
          activeScale={0.96}
          accessibilityRole="button"
          accessibilityState={{ disabled: count === 0 }}
          style={[
            styles.controlBtn,
            { borderColor: theme.colors.danger, opacity: count === 0 ? 0.45 : 1 },
          ]}
        >
          <Feather name="rotate-ccw" size={16} color={theme.colors.danger} />
          <Text style={[styles.controlText, { color: theme.colors.danger }]}>{t('tasbih.reset', 'Sıfırla')}</Text>
        </ScalePressable>
        <ScalePressable
          onPress={() => setIsProgressModalVisible(true)}
          activeScale={0.96}
          accessibilityRole="button"
          style={[styles.controlBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Feather name="bar-chart-2" size={16} color={theme.colors.text} />
          <Text style={[styles.controlText, { color: theme.colors.text }]}>
            {t('tasbih.progressShort', 'İlerleme')}
          </Text>
        </ScalePressable>
      </Animated.View>

      {/* ── Add custom dhikr ── */}
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => setIsAddModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.overlay, { backgroundColor: overlayColor }]}
        >
          <View style={[styles.sheet, { backgroundColor: sheetColor, borderColor: theme.colors.border }]}>
            <View style={[styles.sheetIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Feather name="edit-3" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
              {t('tasbih.modalTitle', 'Yeni Zikir Ekle')}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              placeholder={t('tasbih.dhikrName', 'Zikir Adı')}
              placeholderTextColor={theme.colors.textSecondary}
              value={newDhikrName}
              onChangeText={setNewDhikrName}
              autoFocus
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              placeholder={t('tasbih.targetCount', 'Hedef Sayı')}
              placeholderTextColor={theme.colors.textSecondary}
              value={newDhikrTarget}
              onChangeText={setNewDhikrTarget}
              keyboardType="number-pad"
            />
            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetBtn, styles.sheetBtnGhost, { borderColor: theme.colors.border }]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={[styles.sheetBtnText, { color: theme.colors.textSecondary }]}>{t('tasbih.cancel', 'İptal')}</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetBtn, { flex: 2, backgroundColor: theme.colors.primary }]}
                onPress={handleAddCustomDhikr}
              >
                <Text style={[styles.sheetBtnText, { color: '#FFFFFF' }]}>{t('tasbih.save', 'Kaydet')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reset confirm (destructive) ── */}
      <Modal visible={isResetModalVisible} transparent animationType="fade" onRequestClose={() => setIsResetModalVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
          <View style={[styles.sheet, { backgroundColor: sheetColor, borderColor: theme.colors.border, alignItems: 'center' }]}>
            <View style={[styles.sheetIcon, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.14)' : 'rgba(239, 68, 68, 0.1)' }]}>
              <Feather name="rotate-ccw" size={22} color={theme.colors.danger} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
              {t('tasbih.resetConfirmTitle', 'Sayacı Sıfırla')}
            </Text>
            <Text style={[styles.sheetBody, { color: theme.colors.textSecondary }]}>
              {t('tasbih.resetConfirmMsg', 'Sayacı sıfırlamak istediğinize emin misiniz?')}
            </Text>
            <View style={[styles.sheetActions, { alignSelf: 'stretch' }]}>
              <Pressable
                style={[styles.sheetBtn, styles.sheetBtnGhost, { borderColor: theme.colors.border }]}
                onPress={() => setIsResetModalVisible(false)}
              >
                <Text style={[styles.sheetBtnText, { color: theme.colors.textSecondary }]}>{t('tasbih.no', 'Hayır')}</Text>
              </Pressable>
              <Pressable style={[styles.sheetBtn, { backgroundColor: theme.colors.danger }]} onPress={confirmReset}>
                <Text style={[styles.sheetBtnText, { color: '#FFFFFF' }]}>{t('tasbih.reset', 'Sıfırla')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Milestone ── */}
      <Modal visible={congratModalData !== null} transparent animationType="fade" onRequestClose={() => setCongratModalData(null)}>
        <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
          <View style={[styles.sheet, { backgroundColor: sheetColor, borderColor: theme.colors.border, alignItems: 'center' }]}>
            <View style={[styles.sheetIcon, styles.sheetIconLarge, { backgroundColor: theme.colors.primaryLight }]}>
              <Feather name="award" size={34} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.colors.text, fontSize: 22 }]}>
              {t('tasbih.milestoneTitle', 'Tebrikler!')}
            </Text>
            <Text style={[styles.sheetBody, { color: theme.colors.textSecondary }]}>
              {t('tasbih.milestoneBody', 'Maşallah, bu ay toplam {{total}} zikre ulaştınız!', { total: congratModalData?.total })}
            </Text>
            <Pressable
              style={[styles.sheetBtn, { alignSelf: 'stretch', backgroundColor: theme.colors.primary, marginTop: spacing.lg }]}
              onPress={() => setCongratModalData(null)}
            >
              <Text style={[styles.sheetBtnText, { color: '#FFFFFF' }]}>{t('tasbih.ok', 'Tamam')}</Text>
            </Pressable>
            <Pressable
              style={styles.shareLink}
              onPress={() => {
                setLastMilestoneTotal(congratModalData?.total ?? null);
                setCongratModalData(null);
                setMilestoneShareVisible(true);
              }}
            >
              <Feather name="share-2" size={13} color={theme.colors.primary} />
              <Text style={[styles.shareLinkText, { color: theme.colors.primary }]}>
                {t('tasbih.shareMilestone', 'Paylaş')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <StoryCardShareModal
        visible={milestoneShareVisible}
        onClose={() => setMilestoneShareVisible(false)}
        title={t('tasbih.title', 'Zikirmatik')}
        text={t('tasbih.milestoneShareText', 'Bu ay toplam {{total}} zikre ulaştım, maşallah!', { total: lastMilestoneTotal })}
        source="Vera"
        type="achievement"
      />

      {/* ── Daily recommendation details ── */}
      <Modal visible={isRecModalVisible} transparent animationType="fade" onRequestClose={() => setIsRecModalVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
          <View style={[styles.sheet, { backgroundColor: sheetColor, borderColor: theme.colors.border }]}>
            <View style={[styles.recBadge, { backgroundColor: theme.colors.primaryLight }]}>
              <Feather name="star" size={12} color={theme.colors.primary} />
              <Text style={[styles.recBadgeText, { color: theme.colors.primary }]}>
                {t('tasbih.recTitle', 'Günün Zikir Önerisi')}
              </Text>
            </View>
            <ScrollView style={styles.recScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.recModalText, { color: theme.colors.text }]}>{dailyDhikr.text}</Text>
              {!!dailyDhikr.benefit && (
                <Text style={[styles.recModalBenefit, { color: theme.colors.textSecondary }]}>{dailyDhikr.benefit}</Text>
              )}
            </ScrollView>
            <View style={[styles.recBadge, { backgroundColor: theme.colors.primaryLight, marginBottom: spacing.md }]}>
              <Feather name="target" size={12} color={theme.colors.primary} />
              <Text style={[styles.recBadgeText, { color: theme.colors.primary }]}>
                {t('tasbih.recTarget', 'Hedef:')} {dailyDhikr.target || 100}
              </Text>
            </View>
            <Pressable
              style={[styles.sheetBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setIsRecModalVisible(false)}
            >
              <Text style={[styles.sheetBtnText, { color: '#FFFFFF' }]}>{t('tasbih.ok', 'Tamam')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Background audio picker ── */}
      <Modal visible={isAudioModalVisible} transparent animationType="fade" onRequestClose={() => setIsAudioModalVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: overlayColor }]} onPress={() => setIsAudioModalVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: sheetColor, borderColor: theme.colors.border }]}>
            <View style={styles.audioHeader}>
              <View style={[styles.audioIcon, { backgroundColor: theme.colors.primaryLight }]}>
                <Feather name="music" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.audioTitle, { color: theme.colors.text }]}>{t('tasbih.bgAudioTitle', 'Fon Zikir Sesi')}</Text>
                <Text style={[styles.audioSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('tasbih.bgAudioSelect', 'Zikir esnasında arkada çalacak sesi seçin')}
                </Text>
              </View>
              <Pressable onPress={() => setIsAudioModalVisible(false)} hitSlop={10} accessibilityRole="button">
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.audioList}>
              {DHIKR_AUDIO_OPTIONS.map((opt) => {
                const selected = selectedAudioId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => selectBgAudio(opt.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.audioRow,
                      {
                        backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={opt.id === 'off' ? 'volume-x' : 'disc'}
                      size={18}
                      color={selected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.audioLabel, { color: selected ? theme.colors.primary : theme.colors.text }]}>
                      {t(opt.labelKey, opt.defaultLabel)}
                    </Text>
                    {selected && (
                      <View style={[styles.audioCheck, { backgroundColor: theme.colors.primary }]}>
                        <Feather name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
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

/** Circular header toggle; the filled state doubles as the "on" indicator. */
function IconToggle({
  icon,
  active,
  onPress,
  label,
  colors,
}: {
  icon: string;
  active: boolean;
  onPress: () => void;
  label: string;
  colors: { primary: string; primaryLight: string; surface: string; border: string; borderStrong: string; textSecondary: string };
}) {
  return (
    <ScalePressable
      onPress={onPress}
      activeScale={0.9}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.iconBtn,
        active
          ? { backgroundColor: colors.primaryLight, borderColor: colors.borderStrong }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Feather name={icon as any} size={17} color={active ? colors.primary : colors.textSecondary} />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  statValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.4,
  },

  // Ad
  adSection: {
    paddingHorizontal: spacing.lg,
  },

  // Chips
  chipsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  chipAdd: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  chipText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    maxWidth: 170,
  },
  chipTarget: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },

  // Recommendation
  recWrap: {
    paddingHorizontal: spacing.lg,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  recLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  recText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  recCta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recCtaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
  },

  // Hero dial
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroInner: {
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  fill: {
    flex: 1,
  },
  disc: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  dialName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    maxWidth: '82%',
    marginBottom: 2,
  },
  count: {
    fontFamily: typography.fontFamily.bold,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  target: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    marginTop: spacing.md,
  },
  statusText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  controlText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },

  // Sheets / modals
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetIconLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 19,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  sheetBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnGhost: {
    borderWidth: 1,
  },
  sheetBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  shareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 6,
  },
  shareLinkText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },

  // Recommendation modal
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.pill,
  },
  recBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  recScroll: {
    maxHeight: 240,
    marginVertical: spacing.md,
  },
  recModalText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  recModalBenefit: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  // Audio picker
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  audioIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
  },
  audioSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  audioList: {
    gap: spacing.sm,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  audioLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  audioCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
