import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, StatusBar, Platform } from 'react-native';
import Svg, { Circle, Defs, Filter, FeDropShadow, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

const BG_DARK = require('../../assets/images/bg_dark.jpg');
const BG_LIGHT = require('../../assets/images/bg_light.jpg');

interface ProgressRingProps {
  targetDate: Date | null;
  nextPrayerName: string;
  size?: number;
  strokeWidth?: number;
  onTimeReached?: () => void;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  targetDate,
  nextPrayerName,
  size = 240,
  strokeWidth = 12,
  onTimeReached,
}) => {
  const { theme, isDark } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const animatedProgress = useSharedValue(0);
  const [timeLeftStr, setTimeLeftStr] = useState('--:--:--');

  // Subtle pulse on the outer glow ring for "alive" feel — very cheap
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  useEffect(() => {
    if (!targetDate) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        if (onTimeReached) onTimeReached();
        return;
      }

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeftStr(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );

      const maxDiff = 4 * 60 * 60 * 1000;
      const p = Math.min(diff / maxDiff, 1);
      animatedProgress.value = withTiming(1 - p, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onTimeReached]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - circumference * animatedProgress.value,
  }));

  return (
    <View style={[styles.ringRoot, { width: size + 40, height: size + 40 }]}>
      {/* Outer ambient glow */}
      <AnimatedView
        style={[
          styles.glowRing,
          glowStyle,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            borderColor: theme.colors.primary,
          },
        ]}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <Filter id="glow">
            <FeDropShadow
              dx="0"
              dy="0"
              stdDeviation="8"
              floodColor={theme.colors.primary}
              floodOpacity={0.7}
            />
          </Filter>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.heroGradient[0]} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc — filter only on iOS; Android SVG filter is CPU expensive */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          filter={Platform.OS === 'ios' ? 'url(#glow)' : undefined}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center text */}
      <View style={styles.ringCenter}>
        <Text style={[styles.nextLabel, { color: theme.colors.textSecondary }]}>
          {nextPrayerName.toUpperCase()}
        </Text>
        <Text style={[styles.timeDisplay, { color: theme.colors.text }]}>{timeLeftStr}</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.borderStrong }]} />
        <Text style={[styles.untilLabel, { color: theme.colors.primary }]}>
          kalan süre
        </Text>
      </View>
    </View>
  );
};

// ── Background helper ─────────────────────────────────────────────────────────
// Used by HomeScreen to wrap content in the themed mosque image
// Rules:
//   • mode === 'dark' (user forced dark)  → plain black, no image
//   • fajr / dhuhr / asr                 → bg_light (daytime)
//   • maghrib / isha or no prayer key    → bg_dark  (nighttime)
const NIGHT_PRAYERS = new Set(['maghrib', 'isha']);

export const AppBackground: React.FC<{
  isDark: boolean;
  children: React.ReactNode;
  nextPrayerKey?: string | null;
}> = ({ isDark, children, nextPrayerKey }) => {
  const { theme, mode, isFullscreen } = useTheme();

  // If user explicitly chose dark mode, or if auto mode is night time, use dark background
  const isNight = mode === 'dark' ? true : (nextPrayerKey ? NIGHT_PRAYERS.has(nextPrayerKey) : isDark);
  const source = isNight ? BG_DARK : BG_LIGHT;

  return (
    <ImageBackground
      source={source}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Gradient overlay so text stays readable regardless of image brightness */}
      <LinearGradient
        colors={theme.colors.bgGradient as unknown as [string, string]}
        style={StyleSheet.absoluteFill}
      />
      {children}
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen} />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  ringRoot: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
  },
  nextLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 2,
  },
  timeDisplay: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 40,
    letterSpacing: 1,
  },
  dividerLine: {
    width: 36,
    height: 1,
    marginVertical: 6,
    borderRadius: 1,
  },
  untilLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.8,
  },
  bgImage: {
    flex: 1,
  },
});
