import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { borderRadius, prayerGradients, spacing, typography, palettes } from '../utils/theme';
import { formatTime } from '../utils/format';
import { ScalePressable } from './ScalePressable';

interface PrayerTimeCardProps {
  id: string;
  name: string;
  time: string;
  isHero?: boolean;
  isActive?: boolean;
  targetDate?: Date | null;
  onTimeReached?: () => void;
}

const getIcon = (id: string, size: number, color: string) => {
  switch (id) {
    case 'fajr': return <Feather name="moon" size={size} color={color} />;
    case 'sunrise': return <Feather name="sunrise" size={size} color={color} />;
    case 'dhuhr': return <Feather name="sun" size={size} color={color} />;
    case 'asr': return <Feather name="cloud" size={size} color={color} />;
    case 'maghrib': return <Feather name="sunset" size={size} color={color} />;
    case 'isha': return <Ionicons name="moon-outline" size={size} color={color} />;
    default: return <Feather name="clock" size={size} color={color} />;
  }
};

// Format ms remaining using translations
function formatCountdown(ms: number, t: any): string {
  if (ms <= 0) return `0${t('home.timeLeftUnits.s')}`;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const unitH = t('home.timeLeftUnits.h');
  const unitM = t('home.timeLeftUnits.m');
  const unitS = t('home.timeLeftUnits.s');

  const pad = (num: number) => String(num).padStart(2, '0');

  if (h > 0) return `${h}${unitH} ${pad(m)}${unitM} ${pad(s)}${unitS}`;
  if (m > 0) return `${m}${unitM} ${pad(s)}${unitS}`;
  return `${s}${unitS}`;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const PrayerTimeCard: React.FC<PrayerTimeCardProps> = React.memo(({
  id, name, time, isHero = false, isActive = false, targetDate, onTimeReached,
}) => {
  const { theme, isDark, timeFormat, circlePalette } = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const [remaining, setRemaining] = useState(0);

  // Animations values
  const animatedProgress = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const dotsOpacity = useSharedValue(0.4);
  const activeBorderPulse = useSharedValue(0.3);

  // Magic Numbers minimized by defining constants
  const HERO_SIZE = 270;
  const SCALE = HERO_SIZE / 230; // Scale text based on the base size of 230
  const STROKE_WIDTH = 4;
  const RADIUS = (HERO_SIZE - 28) / 2; // Exact radius for Apple Watch thin ring
  const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * animatedProgress.value),
  }));

  // Dots animated opacity properties
  const dotsProps = useAnimatedProps(() => ({
    opacity: dotsOpacity.value,
  }));

  // Comet Animated position calculations
  const cometProps = useAnimatedProps(() => {
    const theta = (2 * Math.PI * animatedProgress.value) - (Math.PI / 2);
    const cx = HERO_SIZE / 2 + RADIUS * Math.cos(theta);
    const cy = HERO_SIZE / 2 + RADIUS * Math.sin(theta);
    return { cx, cy };
  });

  // Countdown timer & progress update
  useEffect(() => {
    if (!isHero || !targetDate) return;

    cancelAnimation(animatedProgress);

    const update = () => {
      const now = Date.now();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        setRemaining(0);
        animatedProgress.value = withTiming(1, { duration: 300 });
        onTimeReached?.();
        return;
      }
      setRemaining(diff);

      const total = 6 * 60 * 60 * 1000;
      const currentProgress = Math.max(0, Math.min(1, 1 - diff / total));
      animatedProgress.value = withTiming(currentProgress, { duration: 950, easing: Easing.linear });
    };

    update();
    const interval = setInterval(update, 1000);

    // Inner Glow slow breath animation
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.15, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );

    // Outer Dial Dots opacity oscillation
    dotsOpacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );

    return () => {
      clearInterval(interval);
      cancelAnimation(animatedProgress);
      cancelAnimation(pulseValue);
      cancelAnimation(dotsOpacity);
    };
  }, [isHero, targetDate, onTimeReached]);

  // Active state border glow pulse
  useEffect(() => {
    if (isActive && !isHero) {
      activeBorderPulse.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, true
      );
    } else {
      cancelAnimation(activeBorderPulse);
    }
  }, [isActive, isHero]);

  // Spring scale styles for interactions
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
    opacity: withTiming(isDark ? 0.08 : 0.12),
  }));

  const activeBorderStyle = useAnimatedStyle(() => ({
    borderColor: theme.colors.primary,
    opacity: activeBorderPulse.value,
  }));

  const onPressIn = () => { scale.value = withSpring(0.95, { damping: 15, stiffness: 200 }); };
  const onPressOut = () => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); };

  // ── HERO CARD RENDER ───────────────────────────────────────────────────
  if (isHero) {
    let circleColors = (prayerGradients[id] ?? theme.colors.heroGradient) as [string, string];

    if (circlePalette !== 'default') {
      const selected = palettes[circlePalette];
      if (selected) {
        circleColors = isDark
          ? [selected.primary, selected.primaryLight] as [string, string]
          : [selected.primary, selected.borderStrong || selected.primary] as [string, string];
      }
    }

    return (
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[scaleStyle, styles.heroContainer, { width: HERO_SIZE, height: HERO_SIZE }]}>
          <LinearGradient
            colors={circleColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroGlassCard, { borderRadius: HERO_SIZE / 2 }]}
          >
            {/* White glossy thin inner rim */}
            <View style={[styles.heroInnerRim, { borderRadius: HERO_SIZE / 2 }]} />

            {/* Breathing internal center glow */}
            <Animated.View style={[styles.heroBreathingGlow, glowStyle, { borderRadius: HERO_SIZE / 2 }]} />

            {/* SVG Visual Renders */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={HERO_SIZE} height={HERO_SIZE}>
                <Defs>
                  <SvgLinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                    <Stop offset="100%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0.5} />
                  </SvgLinearGradient>
                </Defs>

                {/* Outer Watch Dots Face (Simulates exact 60 watch divisions) */}
                <AnimatedCircle
                  cx={HERO_SIZE / 2}
                  cy={HERO_SIZE / 2}
                  r={RADIUS + 10}
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="1 8"
                  animatedProps={dotsProps}
                />

                {/* Background Ring Track */}
                <Circle
                  cx={HERO_SIZE / 2}
                  cy={HERO_SIZE / 2}
                  r={RADIUS}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />

                {/* Main Apple Watch-style Thin Progress Ring */}
                <AnimatedCircle
                  cx={HERO_SIZE / 2}
                  cy={HERO_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#progressGrad)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={progressProps}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${HERO_SIZE / 2}, ${HERO_SIZE / 2}`}
                />

                {/* Animated Comet (Leading Progress Glowing Node) */}
                <AnimatedCircle
                  r={4}
                  fill="#FFFFFF"
                  animatedProps={cometProps}
                />
                {/* Comet Glow Effect */}
                <AnimatedCircle
                  r={8}
                  fill="rgba(255, 255, 255, 0.4)"
                  animatedProps={cometProps}
                />
              </Svg>
            </View>

            {/* Inner Content Texts */}
            <View style={styles.heroContent}>
              <Text style={[styles.heroNextLabel, { fontSize: 9 * SCALE }]}>{t('home.nextPrayer').toUpperCase()}</Text>
              
              <View style={[styles.heroIconRow, { gap: 6 * SCALE, marginBottom: 1 * SCALE }]}>
                <View style={[styles.heroIconBox, { width: 22 * SCALE, height: 22 * SCALE, borderRadius: 11 * SCALE }]}>
                  {getIcon(id, 16 * SCALE, '#FFF')}
                </View>
                <Text style={[styles.heroName, { fontSize: 18 * SCALE }]}>{name}</Text>
              </View>

              <Text style={[styles.heroTime, { fontSize: 28 * SCALE, marginBottom: 4 * SCALE }]}>{formatTime(time, timeFormat)}</Text>
              <View style={[styles.heroDivider, { width: 32 * SCALE, height: 1.5 * SCALE, marginBottom: 4 * SCALE }]} />
              
              <Text style={[styles.heroCountdown, { fontSize: 22 * SCALE }]}>{formatCountdown(remaining, t)}</Text>
              <Text style={[styles.heroLeftLabel, { fontSize: 11 * SCALE, marginTop: 1 * SCALE }]}>{t('home.timeLeft').toLowerCase()}</Text>
            </View>

          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  // ── PRAYER GRID CELL RENDER ────────────────────────────────────────────
  const cardGradientColors = isDark
    ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] as const
    : ['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.35)'] as const;

  const iconBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

  if (isActive) {
    // Premium custom styling for active prayer card
    return (
      <ScalePressable
        activeScale={0.94}
        style={[
          styles.gridCellContainer,
          styles.gridCellWrapper,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        {/* Animated Pulsing Gold/Green border */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.activeBorderGlow, activeBorderStyle]} />

        <View style={styles.gridCell}>
          <View style={styles.gridCellHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
              {getIcon(id, 16, '#FFF')}
            </View>
            <View style={styles.activePill} />
          </View>
          <Text style={[styles.gridName, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>
            {name}
          </Text>
          <Text style={[styles.gridTime, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatTime(time, timeFormat)}
          </Text>
        </View>
      </ScalePressable>
    );
  }

  // Standard Inactive Glassmorphic Grid Card
  return (
    <ScalePressable
      activeScale={0.94}
      style={[styles.gridCellContainer, styles.gridCellWrapper]}
    >
      <LinearGradient
        colors={cardGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gridCell, { borderColor: theme.colors.border, borderWidth: 1 }]}
      >
        <View style={styles.gridCellHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            {getIcon(id, 15, theme.colors.primary)}
          </View>
        </View>
        <Text style={[styles.gridName, { color: theme.colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
          {name}
        </Text>
        <Text style={[styles.gridTime, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatTime(time, timeFormat)}
        </Text>
      </LinearGradient>
    </ScalePressable>
  );
});

PrayerTimeCard.displayName = 'PrayerTimeCard';

const styles = StyleSheet.create({
  // ── Hero Glass Card Styles ──
  heroContainer: {
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  heroGlassCard: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroInnerRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    margin: 3,
  },
  heroBreathingGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'absolute',
  },
  heroNextLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  heroIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFF',
  },
  heroTime: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroDivider: {
    width: 32,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1,
    marginBottom: 4,
  },
  heroCountdown: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  heroLeftLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.5,
    marginTop: 1,
  },

  // ── Grid Card Styles ──
  gridCellContainer: {
    flex: 1,
  },
  gridCellWrapper: {
    flex: 1,
    position: 'relative',
    borderRadius: borderRadius.md,
  },
  gridCell: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 2,
    minHeight: 74,
  },
  activeBorderGlow: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  activeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gridCellHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 3,
  },
  activeDot: {
    display: 'none',
  },
  gridName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  gridTime: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
