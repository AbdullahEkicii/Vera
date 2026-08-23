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
import Svg, { Circle, G, Line, Path, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 80, 240);
const STROKE = COMPASS_SIZE * 0.04;

interface QiblaCompassProps {
  heading: number;
  qiblaAngle: number;
  distance: number | null;
  error?: string | null;
}

const DIRECTIONS = [
  { angle: 0, key: 'n' },
  { angle: 22.5, key: '' },
  { angle: 45, key: 'ne' },
  { angle: 67.5, key: '' },
  { angle: 90, key: 'e' },
  { angle: 112.5, key: '' },
  { angle: 135, key: 'se' },
  { angle: 157.5, key: '' },
  { angle: 180, key: 's' },
  { angle: 202.5, key: '' },
  { angle: 225, key: 'sw' },
  { angle: 247.5, key: '' },
  { angle: 270, key: 'w' },
  { angle: 292.5, key: '' },
  { angle: 315, key: 'nw' },
  { angle: 337.5, key: '' },
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

  const animatedDial = useSharedValue(0);
  const animatedNeedle = useSharedValue(0);
  const isAligned = useSharedValue(0);
  const glowScale = useSharedValue(1);

  const qiblaDiff = Math.abs(getShortestAngle(heading, qiblaAngle));
  const aligned = qiblaDiff <= 5.5;

  useEffect(() => {
    // Dial rotates by -heading (so North points to real geographic North)
    const dialDiff = getShortestAngle(animatedDial.value, -heading);
    animatedDial.value = withSpring(animatedDial.value + dialDiff, {
      damping: 24,
      stiffness: 110,
      mass: 0.9,
    });

    // Qibla needle rotates by (qiblaAngle - heading) so it points to Kaaba at 12 o'clock when aligned
    const relativeQiblaAngle = qiblaAngle - heading;
    const needleDiff = getShortestAngle(animatedNeedle.value, relativeQiblaAngle);
    animatedNeedle.value = withSpring(animatedNeedle.value + needleDiff, {
      damping: 24,
      stiffness: 110,
      mass: 0.9,
    });

    if (aligned) {
      if (isAligned.value === 0) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
        glowScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 550, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 550, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }
      isAligned.value = withTiming(1, { duration: 250 });
    } else {
      isAligned.value = withTiming(0, { duration: 250 });
      glowScale.value = withTiming(1, { duration: 150 });
    }
  }, [heading, qiblaAngle, aligned]);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedDial.value}deg` }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedNeedle.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: isAligned.value * 0.4 + 0.05,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      isAligned.value,
      [0, 1],
      [isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(0,0,0,0.12)', '#10B981']
    ),
  }));

  const CENTER = COMPASS_SIZE / 2;
  const R = CENTER - STROKE;

  const pt = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
  };

  // Stationary Kaaba Position at fixed 12 o'clock (top target destination)
  const kaabaY = CENTER - R * 0.72;

  // Straight Up Needle geometry pointing to 12 o'clock (0°)
  const needleTipY = CENTER - R * 0.62;
  const needleLeftX = CENTER - 7;
  const needleRightX = CENTER + 7;
  const needleBaseY = CENTER - R * 0.22;
  const needlePath = `M ${CENTER} ${needleTipY} L ${needleLeftX} ${needleBaseY} L ${CENTER} ${CENTER} L ${needleRightX} ${needleBaseY} Z`;

  return (
    <View style={styles.container}>
      {/* Compass container */}
      <View style={styles.compassOuter}>
        {/* Glow halo when aligned */}
        <Animated.View style={[styles.alignedGlow, glowStyle, { backgroundColor: '#10B981' }]} />

        {/* Outer Bezel Ring */}
        <Animated.View
          style={[
            styles.compassRing,
            ringStyle,
            {
              backgroundColor: isDark ? 'rgba(22, 17, 11, 0.92)' : 'rgba(255,255,255,0.98)',
              shadowColor: aligned ? '#10B981' : '#D4AF37',
            },
          ]}
        >
          {/* Layer 1: Rotating Cardinal Dial (N / S / E / W) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, dialStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              <Defs>
                <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={aligned ? '#10B981' : '#D4AF37'} stopOpacity={0.25} />
                  <Stop offset="100%" stopColor={aligned ? '#10B981' : '#D4AF37'} stopOpacity={0.0} />
                </RadialGradient>
              </Defs>

              <Circle cx={CENTER} cy={CENTER} r={R * 0.85} fill="url(#centerGlow)" />

              {/* 360 degree tick marks */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = i * 10;
                const isMajor = angle % 30 === 0;
                const inner = pt(angle, R * (isMajor ? 0.86 : 0.90));
                const outer = pt(angle, R * 0.94);
                return (
                  <Line
                    key={`tick-${i}`}
                    x1={outer.x}
                    y1={outer.y}
                    x2={inner.x}
                    y2={inner.y}
                    stroke={
                      isDark
                        ? isMajor
                          ? 'rgba(212, 175, 55, 0.5)'
                          : 'rgba(255,255,255,0.18)'
                        : isMajor
                        ? 'rgba(0,0,0,0.35)'
                        : 'rgba(0,0,0,0.12)'
                    }
                    strokeWidth={isMajor ? 1.4 : 0.8}
                  />
                );
              })}

              {/* Cardinal directions */}
              {DIRECTIONS.map((d, i) => {
                const isNorth = d.key === 'n';
                const isCardinal = ['n', 'e', 's', 'w'].includes(d.key);
                const labelText = d.key ? t(`directions.${d.key}`, d.key.toUpperCase()) : '';
                if (!labelText) return null;

                const pos = pt(d.angle, R * (isCardinal ? 0.74 : 0.77));
                return (
                  <SvgText
                    key={`label-${i}`}
                    x={pos.x}
                    y={pos.y + 4}
                    fill={
                      isNorth
                        ? '#EF4444'
                        : isCardinal
                        ? isDark
                          ? '#FDF8ED'
                          : '#1A1A24'
                        : isDark
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(0,0,0,0.38)'
                    }
                    fontSize={isCardinal ? 12 : 8}
                    fontWeight={isCardinal ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {labelText}
                  </SvgText>
                );
              })}

              {/* Concentric rings */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={R * 0.58}
                fill="none"
                stroke={isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.08)'}
                strokeWidth={1}
                strokeDasharray="3, 3"
              />
            </Svg>
          </Animated.View>

          {/* Layer 2: Rotating Qibla Needle (İbre) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, needleStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Rotating Pointer Beam */}
              <Line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={needleTipY}
                stroke={aligned ? '#10B981' : '#D4AF37'}
                strokeWidth={aligned ? 3.5 : 2.5}
                strokeLinecap="round"
              />

              {/* Arrowhead Pointer */}
              <Path d={needlePath} fill={aligned ? '#10B981' : '#D4AF37'} />
            </Svg>
          </Animated.View>

          {/* Layer 3: STATIONARY KAABA MEDALLION (Fixed at 12 o'clock destination at top) */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              <G x={CENTER} y={kaabaY}>
                <Circle
                  cx={0}
                  cy={0}
                  r={15}
                  fill={aligned ? '#10B981' : '#1A140B'}
                  stroke={aligned ? '#34D399' : '#D4AF37'}
                  strokeWidth={2}
                />
                <SvgText x={0} y={6} fontSize={16} textAnchor="middle">
                  🕋
                </SvgText>
              </G>
            </Svg>
          </View>

          {/* Center Hub & Level Spirit Jewel */}
          <View
            style={[
              styles.centerHub,
              {
                backgroundColor: aligned ? '#10B981' : '#D4AF37',
                shadowColor: aligned ? '#10B981' : '#D4AF37',
              },
            ]}
          >
            <View style={styles.centerInnerDot} />
          </View>
        </Animated.View>
      </View>

      {/* Alignment Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: aligned
              ? isDark
                ? 'rgba(16, 185, 129, 0.16)'
                : 'rgba(16, 185, 129, 0.12)'
              : isDark
              ? 'rgba(212, 175, 55, 0.12)'
              : 'rgba(212, 175, 55, 0.08)',
            borderColor: aligned ? '#10B981' : isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.25)',
          },
        ]}
      >
        <Ionicons
          name={aligned ? 'checkmark-circle' : 'compass-outline'}
          size={20}
          color={aligned ? '#10B981' : '#D4AF37'}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.statusBannerText,
            { color: aligned ? '#10B981' : isDark ? '#FDF8ED' : '#1A1A24' },
          ]}
        >
          {error
            ? error
            : aligned
            ? t('qibla.alignedSuccess', 'Kıble yönündesiniz! ✓')
            : t('qibla.aligning', 'Telefonu düz tutun ve döndürün')}
        </Text>
      </View>

      {/* Qibla info row */}
      <View
        style={[
          styles.infoRow,
          {
            backgroundColor: isDark ? '#1E160C' : '#FFFFFF',
            borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            {t('qibla.angle', 'Kıble Açısı')}
          </Text>
          <Text style={[styles.infoValue, { color: '#D4AF37' }]}>{Math.round(qiblaAngle)}°</Text>
        </View>
        <View
          style={[
            styles.infoDivider,
            { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.08)' },
          ]}
        />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            {t('qibla.heading', 'Pusula')}
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>{Math.round(heading)}°</Text>
        </View>
        <View
          style={[
            styles.infoDivider,
            { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.08)' },
          ]}
        />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
            {t('qibla.distance', 'Mesafe')}
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {distance !== null ? `${distance} km` : '...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  compassOuter: {
    width: COMPASS_SIZE + 20,
    height: COMPASS_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  alignedGlow: {
    position: 'absolute',
    width: COMPASS_SIZE + 20,
    height: COMPASS_SIZE + 20,
    borderRadius: (COMPASS_SIZE + 20) / 2,
  },
  compassRing: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  centerHub: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  centerInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    width: '100%',
  },
  statusBannerText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  infoDivider: {
    width: 1,
    height: 24,
  },
});
