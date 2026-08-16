import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 90, 250);
const STROKE = COMPASS_SIZE * 0.04;

interface QiblaCompassProps {
  heading: number;
  qiblaAngle: number;
  distance: number | null;
  error?: string | null;
}

// 16 compass directions with localization keys
const DIRECTIONS = [
  { angle: 0,   key: 'n' },
  { angle: 22.5, key: '' },
  { angle: 45,  key: 'ne' },
  { angle: 67.5, key: '' },
  { angle: 90,  key: 'e' },
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

  const animatedHeading = useSharedValue(0);
  const isAligned = useSharedValue(0);
  const glowScale = useSharedValue(1);

  const qiblaDiff = Math.abs(getShortestAngle(heading, qiblaAngle));
  const aligned = qiblaDiff <= 6;

  useEffect(() => {
    const diff = getShortestAngle(animatedHeading.value, -heading);
    animatedHeading.value = withSpring(animatedHeading.value + diff, {
      damping: 22,
      stiffness: 100,
      mass: 1,
    });

    if (aligned) {
      if (isAligned.value === 0) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
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
  }, [heading, qiblaAngle, aligned]);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedHeading.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: isAligned.value * 0.35 + 0.05,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      isAligned.value,
      [0, 1],
      [isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0,0,0,0.1)', '#22C55E']
    ),
  }));

  const statusTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      isAligned.value,
      [0, 1],
      [theme.colors.textSecondary, '#22C55E']
    ),
  }));

  const CENTER = COMPASS_SIZE / 2;
  const R = CENTER - STROKE;

  const pt = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
  };

  const arrowLen = R * 0.54;
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
      {/* Compass container */}
      <View style={styles.compassOuter}>
        {/* Glow halo when aligned */}
        <Animated.View style={[styles.alignedGlow, glowStyle, { backgroundColor: '#22C55E' }]} />

        {/* Outer ring */}
        <Animated.View style={[styles.compassRing, ringStyle, {
          backgroundColor: isDark ? 'rgba(30, 22, 12, 0.8)' : 'rgba(255,255,255,0.95)',
          shadowColor: aligned ? '#22C55E' : '#000',
        }]}>
          {/* Rotating compass rose (N/S/E/W + ticks) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Outer tick ring */}
              {DIRECTIONS.map((d, i) => {
                const labelText = d.key ? t(`directions.${d.key}`, d.key.toUpperCase()) : '';
                const inner = pt(d.angle, R * (labelText ? 0.76 : 0.82));
                const outer = pt(d.angle, R * 0.88);
                const isNorth = d.key === 'n';
                const isCardinal = ['n', 'e', 's', 'w'].includes(d.key);
                return (
                  <G key={i}>
                    <Line
                      x1={outer.x} y1={outer.y}
                      x2={inner.x} y2={inner.y}
                      stroke={isNorth ? '#EF4444' : (isCardinal ? (isDark ? '#FDF8ED' : '#1A1A24') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'))}
                      strokeWidth={isCardinal ? 1.5 : 0.8}
                    />
                    {labelText ? (
                      <SvgText
                        x={pt(d.angle, R * 0.64).x}
                        y={pt(d.angle, R * 0.64).y + 3}
                        fill={isNorth ? '#EF4444' : (isCardinal ? (isDark ? '#FDF8ED' : '#1A1A24') : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'))}
                        fontSize={isCardinal ? 11 : 7}
                        fontWeight={isCardinal ? 'bold' : 'normal'}
                        textAnchor="middle"
                      >
                        {labelText}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}

              {/* Inner circle separator */}
              <Circle
                cx={CENTER} cy={CENTER} r={R * 0.55}
                fill="none"
                stroke={isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={1}
              />
            </Svg>
          </Animated.View>

          {/* Qibla needle with Kaaba Icon */}
          <Animated.View style={[StyleSheet.absoluteFillObject, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Arrow shaft */}
              <Path
                d={arrowPath}
                stroke={aligned ? '#22C55E' : '#D4AF37'}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              {/* Arrow head */}
              <Path
                d={arrowHeadPath}
                fill={aligned ? '#22C55E' : '#D4AF37'}
              />
              {/* Kaaba 🕋 Icon at Needle Tip */}
              <SvgText
                x={tipX}
                y={tipY + 6}
                fontSize={20}
                textAnchor="middle"
              >
                🕋
              </SvgText>
            </Svg>
          </Animated.View>

          {/* Center hub */}
          <View style={[styles.centerHub, {
            backgroundColor: aligned ? '#22C55E' : '#D4AF37',
            shadowColor: aligned ? '#22C55E' : '#D4AF37',
          }]} />
        </Animated.View>
      </View>

      {/* Alignment Status Banner */}
      <View style={[
        styles.statusBanner,
        {
          backgroundColor: aligned
            ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)')
            : (isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.08)'),
          borderColor: aligned ? '#22C55E' : (isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.2)'),
        }
      ]}>
        <Ionicons
          name={aligned ? 'checkmark-circle' : 'navigate-circle-outline'}
          size={18}
          color={aligned ? '#22C55E' : '#D4AF37'}
          style={{ marginRight: 8 }}
        />
        <Text style={[
          styles.statusBannerText,
          { color: aligned ? '#22C55E' : (isDark ? '#FDF8ED' : '#1A1A24') }
        ]}>
          {error ? error : aligned ? t('qibla.alignedSuccess', 'Kıble yönündesiniz! ✓') : t('qibla.aligning', 'Telefonu düz tutun ve döndürün')}
        </Text>
      </View>

      {/* Qibla info row */}
      <View style={[styles.infoRow, { backgroundColor: isDark ? '#1E160C' : '#FFFFFF', borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)' }]}>
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.angle', 'Kıble Açısı')}</Text>
          <Text style={[styles.infoValue, { color: '#D4AF37' }]}>{Math.round(qiblaAngle)}°</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.heading', 'Pusula')}</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>{Math.round(heading)}°</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={styles.infoCell}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('qibla.distance', 'Mesafe')}</Text>
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
    gap: 12,
  },
  compassOuter: {
    width: COMPASS_SIZE + 20,
    height: COMPASS_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  statusBannerText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoDivider: {
    width: 1,
    marginVertical: 8,
  },
  infoLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
  },
});
