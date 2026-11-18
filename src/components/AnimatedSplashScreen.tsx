import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const HOLD_BEFORE_EXIT_MS = 1650;
const EXIT_DURATION_MS = 920;
const WAVE_BASE_SIZE = 180;

interface Props {
  onAnimationComplete: () => void;
}

/**
 * Next-gen celestial splash screen rendered over the mounted app and unveiled
 * with a slow, weighted golden light-bloom transition on every launch.
 */
export function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const emblemSize = Math.min(width * 0.34, 148);
  const ringOuterSize = emblemSize + 44;
  const ringInnerSize = emblemSize + 24;
  const maxWaveScale = Math.max(4.5, (Math.hypot(width, height) * 0.92) / WAVE_BASE_SIZE);

  const [isExiting, setIsExiting] = useState(false);

  // Entrance & idle shared values
  const containerOpacity = useSharedValue(1);
  const backdropScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const haloOpacity = useSharedValue(0);
  const haloBreath = useSharedValue(1);
  const outerRingRotation = useSharedValue(0);
  const innerRingRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(10);
  const lineScaleX = useSharedValue(0);
  const progressFill = useSharedValue(0);

  // Dual full-screen reveal light-bloom shared values
  const waveScale = useSharedValue(0.85);
  const waveOpacity = useSharedValue(0);
  const secondaryWaveScale = useSharedValue(0.85);
  const secondaryWaveOpacity = useSharedValue(0);

  const exitStarted = useRef(false);
  const completed = useRef(false);

  const notifyComplete = () => {
    if (completed.current) return;
    completed.current = true;
    onAnimationComplete();
  };

  const startExitTransition = () => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    setIsExiting(true);

    // 1. Primary slow golden horizon bloom gliding cleanly across the screen
    waveScale.value = 0.85;
    waveOpacity.value = withSequence(
      withTiming(0.58, { duration: 240, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: EXIT_DURATION_MS - 240, easing: Easing.inOut(Easing.quad) })
    );
    waveScale.value = withTiming(maxWaveScale, {
      duration: EXIT_DURATION_MS,
      easing: Easing.inOut(Easing.sin),
    });

    // 2. Subtle secondary trailing golden aura for layered depth
    secondaryWaveScale.value = 0.85;
    secondaryWaveOpacity.value = withDelay(
      130,
      withSequence(
        withTiming(0.32, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: EXIT_DURATION_MS - 330, easing: Easing.inOut(Easing.quad) })
      )
    );
    secondaryWaveScale.value = withDelay(
      130,
      withTiming(maxWaveScale * 0.74, {
        duration: EXIT_DURATION_MS - 130,
        easing: Easing.inOut(Easing.sin),
      })
    );

    // 3. Gently poise emblem and dissolve typography
    logoScale.value = withTiming(1.03, {
      duration: 620,
      easing: Easing.inOut(Easing.cubic),
    });
    logoOpacity.value = withTiming(0, {
      duration: 560,
      easing: Easing.inOut(Easing.quad),
    });
    haloOpacity.value = withTiming(0, {
      duration: 520,
      easing: Easing.inOut(Easing.quad),
    });
    textOpacity.value = withTiming(0, {
      duration: 460,
      easing: Easing.inOut(Easing.quad),
    });

    // 4. Unhurried backdrop dissolve unveiling the live home screen underneath
    backdropScale.value = withDelay(
      160,
      withTiming(1.012, {
        duration: EXIT_DURATION_MS - 160,
        easing: Easing.inOut(Easing.quad),
      })
    );
    containerOpacity.value = withDelay(
      200,
      withTiming(
        0,
        { duration: EXIT_DURATION_MS - 200, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(notifyComplete)();
          }
        }
      )
    );
  };

  useEffect(() => {
    // Emblem serene entrance
    logoOpacity.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) });

    // Ambient breathing halo
    haloOpacity.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
    haloBreath.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Slow dignified counter-rotating orbital rings
    outerRingRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    innerRingRotation.value = withRepeat(
      withTiming(-360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    // Brand typography & hairline reveal
    textOpacity.value = withDelay(240, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    textTranslateY.value = withDelay(240, withTiming(0, { duration: 640, easing: Easing.out(Easing.cubic) }));
    lineScaleX.value = withDelay(420, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));

    // Calm bottom progress bar synced with hold window
    progressFill.value = withDelay(
      180,
      withTiming(1, { duration: HOLD_BEFORE_EXIT_MS - 220, easing: Easing.inOut(Easing.cubic) })
    );

    const holdTimer = setTimeout(startExitTransition, HOLD_BEFORE_EXIT_MS);
    const safetyTimer = setTimeout(notifyComplete, HOLD_BEFORE_EXIT_MS + EXIT_DURATION_MS + 250);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(safetyTimer);
      cancelAnimation(haloBreath);
      cancelAnimation(outerRingRotation);
      cancelAnimation(innerRingRotation);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: backdropScale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloBreath.value }],
  }));

  const outerRingStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value * 0.72,
    transform: [{ scale: logoScale.value }, { rotate: `${outerRingRotation.value}deg` }],
  }));

  const innerRingStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value * 0.52,
    transform: [{ scale: logoScale.value }, { rotate: `${innerRingRotation.value}deg` }],
  }));

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scaleX: lineScaleX.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressFill.value }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
    transform: [{ scale: waveScale.value }],
  }));

  const secondaryWaveStyle = useAnimatedStyle(() => ({
    opacity: secondaryWaveOpacity.value,
    transform: [{ scale: secondaryWaveScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents={isExiting ? 'none' : 'auto'}
      style={[styles.overlay, containerStyle]}
    >
      <Pressable
        style={styles.pressable}
        onPress={startExitTransition}
        accessibilityRole="button"
        accessibilityLabel="VERA"
      >
        <LinearGradient
          colors={['#0D0D0D', '#130E07', '#1A1207']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Centerpiece orbital stage */}
        <View style={styles.centerStage}>
          {/* Soft breathing radial glow */}
          <Animated.View
            style={[
              styles.haloWrap,
              { width: ringOuterSize + 96, height: ringOuterSize + 96 },
              haloStyle,
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 240 240">
              <Defs>
                <RadialGradient id="veraHalo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.24" />
                  <Stop offset="48%" stopColor="#D4AF37" stopOpacity="0.09" />
                  <Stop offset="100%" stopColor="#0D0D0D" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="120" cy="120" r="120" fill="url(#veraHalo)" />
            </Svg>
          </Animated.View>

          {/* Outer segmented orbital ring */}
          <Animated.View
            style={[
              styles.ringLayer,
              { width: ringOuterSize, height: ringOuterSize },
              outerRingStyle,
            ]}
          >
            <Svg width={ringOuterSize} height={ringOuterSize} viewBox="0 0 200 200">
              <Circle
                cx="100"
                cy="100"
                r="96"
                stroke="#D4AF37"
                strokeOpacity={0.34}
                strokeWidth={1}
                strokeDasharray="36 18 6 18"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Inner celestial ring */}
          <Animated.View
            style={[
              styles.ringLayer,
              { width: ringInnerSize, height: ringInnerSize },
              innerRingStyle,
            ]}
          >
            <Svg width={ringInnerSize} height={ringInnerSize} viewBox="0 0 180 180">
              <Circle
                cx="90"
                cy="90"
                r="86"
                stroke="#F3E5AB"
                strokeOpacity={0.28}
                strokeWidth={0.9}
                strokeDasharray="4 10"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Slow full-screen golden light-bloom waves */}
          <Animated.View style={[styles.exitWaveWrap, waveStyle]} pointerEvents="none">
            <Svg width={WAVE_BASE_SIZE} height={WAVE_BASE_SIZE} viewBox="0 0 180 180">
              <Defs>
                <RadialGradient id="veraExitBloom" cx="50%" cy="50%" r="50%">
                  <Stop offset="55%" stopColor="#D4AF37" stopOpacity="0" />
                  <Stop offset="82%" stopColor="#F59E0B" stopOpacity="0.16" />
                  <Stop offset="94%" stopColor="#F3E5AB" stopOpacity="0.48" />
                  <Stop offset="100%" stopColor="#F3E5AB" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="90" cy="90" r="90" fill="url(#veraExitBloom)" />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.exitWaveWrap, secondaryWaveStyle]} pointerEvents="none">
            <Svg width={WAVE_BASE_SIZE} height={WAVE_BASE_SIZE} viewBox="0 0 180 180">
              <Defs>
                <RadialGradient id="veraExitTrail" cx="50%" cy="50%" r="50%">
                  <Stop offset="62%" stopColor="#D4AF37" stopOpacity="0" />
                  <Stop offset="86%" stopColor="#D4AF37" stopOpacity="0.22" />
                  <Stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="90" cy="90" r="90" fill="url(#veraExitTrail)" />
            </Svg>
          </Animated.View>

          {/* Emblem */}
          <Animated.View
            style={[
              styles.logoFrame,
              {
                width: emblemSize,
                height: emblemSize,
                borderRadius: emblemSize / 2,
              },
              emblemStyle,
            ]}
          >
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={[
                styles.logoImage,
                {
                  width: emblemSize - 4,
                  height: emblemSize - 4,
                  borderRadius: (emblemSize - 4) / 2,
                },
              ]}
              contentFit="cover"
              transition={0}
            />
          </Animated.View>
        </View>

        {/* Minimalist brand lockup */}
        <Animated.View style={[styles.brandLockup, textStyle]}>
          <Animated.Text style={styles.title}>V E R A</Animated.Text>
          <Animated.View style={[styles.hairline, hairlineStyle]} />
          <Animated.Text style={styles.subtitle}>
            {t('splash.subtitle', 'Compass of the Heart')}
          </Animated.Text>
        </Animated.View>

        {/* Ultra-thin bottom shimmer indicator */}
        <Animated.View style={[styles.footerTrackWrap, { bottom: Math.max(height * 0.08, 42) }, textStyle]}>
          <View style={styles.footerTrack}>
            <Animated.View style={[styles.footerProgress, progressStyle]} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#0D0D0D',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  haloWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitWaveWrap: {
    position: 'absolute',
    width: WAVE_BASE_SIZE,
    height: WAVE_BASE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#12100C',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    backgroundColor: '#0D0D0D',
  },
  brandLockup: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 34,
    color: '#F5EFE0',
    letterSpacing: 10,
    paddingLeft: 10,
  },
  hairline: {
    width: 64,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#D4AF37',
    marginTop: 12,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13.5,
    color: 'rgba(243, 229, 171, 0.78)',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  footerTrackWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  footerTrack: {
    width: 72,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(245, 239, 224, 0.12)',
    overflow: 'hidden',
  },
  footerProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 1,
  },
});
