import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const STROKE = COMPASS_SIZE * 0.04;

interface QiblaCompassProps {
  heading: number;
  qiblaAngle: number;
  distance: number | null;
  error?: string | null;
}

// 16 compass directions
const DIRECTIONS = [
  { angle: 0,   label: 'K' },
  { angle: 22.5, label: '' },
  { angle: 45,  label: 'KD' },
  { angle: 67.5, label: '' },
  { angle: 90,  label: 'D' },
  { angle: 112.5, label: '' },
  { angle: 135, label: 'GD' },
  { angle: 157.5, label: '' },
  { angle: 180, label: 'G' },
  { angle: 202.5, label: '' },
  { angle: 225, label: 'GB' },
  { angle: 247.5, label: '' },
  { angle: 270, label: 'B' },
  { angle: 292.5, label: '' },
  { angle: 315, label: 'KB' },
  { angle: 337.5, label: '' },
];

function getShortestAngle(from: number, to: number): number {
  let diff = (to - from) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function QiblaCompass({ heading, qiblaAngle, distance, error }: QiblaCompassProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const animatedHeading = useSharedValue(0);
  const isAligned = useSharedValue(0);
  const glowScale = useSharedValue(1);

  const qiblaDiff = Math.abs(getShortestAngle(heading, qiblaAngle));
  const aligned = qiblaDiff <= 5;

  useEffect(() => {
    const diff = getShortestAngle(animatedHeading.value, -heading);
    animatedHeading.value = withSpring(animatedHeading.value + diff, {
      damping: 22,
      stiffness: 100,
      mass: 1,
    });

    if (aligned) {
      if (isAligned.value === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        glowScale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0,  { duration: 600, easing: Easing.inOut(Easing.ease) })
          ),
          -1, true
        );
      }
      isAligned.value = withTiming(1, { duration: 300 });
    } else {
      isAligned.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 200 });
    }
  }, [heading, qiblaAngle]);

  // Animated rotate style for the compass rose
  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedHeading.value}deg` }],
  }));

  // Glow pulse when aligned
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: isAligned.value * 0.35 + 0.05,
  }));

  // Outer ring color: gray → green when aligned
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      isAligned.value,
      [0, 1],
      [isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', '#22C55E']
    ),
  }));

  // Status text color
  const statusTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      isAligned.value,
      [0, 1],
      [theme.colors.textSecondary, '#22C55E']
    ),
  }));

  const CENTER = COMPASS_SIZE / 2;
  const R = CENTER - STROKE;

  // Degree angle → SVG x/y on circle
  const pt = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
  };

  // Qibla arrow path (pointing up from center)
  const arrowLen = R * 0.52;
  const arrowPt = pt(qiblaAngle, arrowLen);
  const arrowPath = `M ${CENTER} ${CENTER} L ${arrowPt.x} ${arrowPt.y}`;

  const arrowHeadAngle = ((qiblaAngle - 90) * Math.PI) / 180;
  const tipX = CENTER + arrowLen * Math.cos(arrowHeadAngle);
  const tipY = CENTER + arrowLen * Math.sin(arrowHeadAngle);
  const leftPt = pt(qiblaAngle - 20, arrowLen * 0.8);
  const rightPt = pt(qiblaAngle + 20, arrowLen * 0.8);
  const arrowHeadPath = `M ${tipX} ${tipY} L ${leftPt.x} ${leftPt.y} L ${rightPt.x} ${rightPt.y} Z`;

  return (
    <View style={styles.container}>
      {/* Degree display */}
      <View style={[styles.degreeDisplay, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border }]}>
        <Feather name="compass" size={14} color={theme.colors.primary} />
        <Text style={[styles.degreeText, { color: theme.colors.text }]}>
          {Math.round(heading)}°
        </Text>
        <Text style={[styles.degreeLabel, { color: theme.colors.textSecondary }]}>
          {heading < 22.5 || heading >= 337.5 ? 'K' :
           heading < 67.5  ? 'KD' : heading < 112.5 ? 'D' :
           heading < 157.5 ? 'GD' : heading < 202.5 ? 'G' :
           heading < 247.5 ? 'GB' : heading < 292.5 ? 'B' : 'KB'}
        </Text>
      </View>

      {/* Compass container */}
      <View style={styles.compassOuter}>
        {/* Glow halo when aligned */}
        <Animated.View style={[styles.alignedGlow, glowStyle, { backgroundColor: '#22C55E' }]} />

        {/* Outer ring */}
        <Animated.View style={[styles.compassRing, ringStyle, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
          shadowColor: aligned ? '#22C55E' : '#000',
        }]}>
          {/* Rotating compass rose (N/S/E/W + ticks) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Outer tick ring */}
              {DIRECTIONS.map((d, i) => {
                const inner = pt(d.angle, R * (d.label ? 0.76 : 0.82));
                const outer = pt(d.angle, R * 0.88);
                const isCardinal = ['K', 'D', 'G', 'B'].includes(d.label);
                return (
                  <G key={i}>
                    <Line
                      x1={outer.x} y1={outer.y}
                      x2={inner.x} y2={inner.y}
                      stroke={d.label === 'K' ? '#EF4444' : (isCardinal ? theme.colors.text : theme.colors.border)}
                      strokeWidth={isCardinal ? 1.5 : 0.8}
                    />
                    {d.label ? (
                      <SvgText
                        x={pt(d.angle, R * 0.66).x}
                        y={pt(d.angle, R * 0.66).y + 3}
                        fill={d.label === 'K' ? '#EF4444' : (isCardinal ? theme.colors.text : theme.colors.textSecondary)}
                        fontSize={isCardinal ? 11 : 7}
                        fontWeight={isCardinal ? 'bold' : 'normal'}
                        textAnchor="middle"
                      >
                        {d.label}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}

              {/* Inner circle separator */}
              <Circle
                cx={CENTER} cy={CENTER} r={R * 0.55}
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={1}
              />
            </Svg>
          </Animated.View>

          {/* Qibla arrow (fixed, rotated by qibla angle offset from heading) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Arrow shaft */}
              <Path
                d={arrowPath}
                stroke={aligned ? '#22C55E' : theme.colors.primary}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Arrow head */}
              <Path
                d={arrowHeadPath}
                fill={aligned ? '#22C55E' : theme.colors.primary}
              />
              {/* Kaaba dot at tip */}
              <Circle
                cx={tipX} cy={tipY} r={5}
                fill={aligned ? '#22C55E' : theme.colors.primary}
              />
            </Svg>
          </Animated.View>

          {/* Center hub */}
          <View style={[styles.centerHub, {
            backgroundColor: aligned ? '#22C55E' : theme.colors.primary,
            shadowColor: aligned ? '#22C55E' : theme.colors.primary,
          }]} />
        </Animated.View>
      </View>

      {/* Qibla info row */}
      <View style={[styles.infoRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border }]}>
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.angle')}</Text>
          <Text style={[styles.infoValue, { color: theme.colors.primary }]}>{Math.round(qiblaAngle)}°</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.distance')}</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {distance !== null ? `${distance} km` : '...'}
          </Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.status')}</Text>
          <Animated.Text style={[styles.infoStatus, statusTextStyle]}>
            {aligned ? `✓ ${t('qibla.aligned')}` : t('qibla.aligning')}
          </Animated.Text>
        </View>
      </View>

      {/* Status message */}
      <Animated.Text style={[styles.statusText, { fontFamily: typography.fontFamily.medium }, statusTextStyle]}>
        {error
          ? error
          : aligned
            ? t('qibla.alignedSuccess')
            : t('qibla.holdFlat')}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
    width: '100%',
  },
  degreeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  degreeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  degreeLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  compassOuter: {
    width: COMPASS_SIZE + 24,
    height: COMPASS_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignedGlow: {
    position: 'absolute',
    width: COMPASS_SIZE + 24,
    height: COMPASS_SIZE + 24,
    borderRadius: (COMPASS_SIZE + 24) / 2,
  },
  compassRing: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  centerHub: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  infoDivider: {
    width: 1,
    marginVertical: 12,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  infoStatus: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  statusText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
