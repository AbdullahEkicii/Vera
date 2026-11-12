import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStorage } from '../services/storageService';

const SPLASH_SEEN_KEY = 'SPLASH_SEEN';
const EXIT_MS = 230;

const SPLASH_SUBTITLES: Record<string, string> = {
  en: 'Your Islamic Life Guide',
  tr: 'İslami Yaşam Rehberiniz',
  ar: 'دليلك للحياة الإسلامية',
  es: 'Tu Guía de Vida Islámica',
  fr: 'Votre Guide de Vie Islamique',
  id: 'Panduan Hidup Islami Anda',
  ur: 'آپ کا اسلامی ضابطہ حیات',
  fa: 'راهنمای زندگی اسلامی شما',
  ru: 'Ваш путеводитель по исламской жизни',
  bn: 'আপনার ইসলামিক জীবন নির্দেশিকা',
  ms: 'Panduan Hidup Islam Anda',
  ha: 'Jagoran Rayuwarku Na Musulunci',
  sw: 'Mwongozo Wako wa Maisha ya Kiislamu',
  de: 'Ihr islamischer Lebensratgeber'
};

interface Props {
  onAnimationComplete: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const { i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const logoSize = width * 0.45;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  // Synchronous MMKV read: whether a previous launch already showed the splash.
  const seenBefore = useRef(AppStorage.getString(SPLASH_SEEN_KEY) === '1').current;
  const done = useRef(false);

  // Idempotent: the tap-to-skip and the timer can both fire.
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onAnimationComplete();
  };

  useEffect(() => {
    if (!seenBefore) AppStorage.setString(SPLASH_SEEN_KEY, '1');

    // 1. Logo fades in and scales up quickly
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.exp) });
    scale.value = withSpring(1, { damping: 14, stiffness: 120 });

    // 2. Text fades in slightly after logo
    textOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
    textTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) })
    );

    // 3. First launch: brief ~0.5s total. Later launches: no artificial hold, just the quick exit.
    const hold = seenBefore ? 0 : 250;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: EXIT_MS });
      textOpacity.value = withTiming(0, { duration: EXIT_MS });
      scale.value = withTiming(1.05, { duration: EXIT_MS });
      finishTimer = setTimeout(finish, EXIT_MS + 20);
    }, hold);

    return () => {
      clearTimeout(timeout);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, []);

  const handlePressToSkip = () => {
    finish();
  };

  const logoStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

  return (
    <Pressable style={styles.container} onPress={handlePressToSkip}>
      {/* Premium karanlık arkaplan */}
      <LinearGradient
        colors={['#1A1207', '#0A0704']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[styles.logoContainer, { borderRadius: logoSize / 2 }, logoStyle]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={[styles.logo, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, { bottom: height * 0.15 }, textStyle]}>
        <Animated.Text style={styles.title}>V E R A</Animated.Text>
        <Animated.Text style={styles.subtitle}>{SPLASH_SUBTITLES[i18n.language] || SPLASH_SUBTITLES['en']}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1207',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Eğer resmin kendisi kare ve arka planı varsa, 
    // container'a veya direkt logoya yuvarlatma uygulayabiliriz:
    // borderRadius: 30, // Eğer hafif kavisli kare (iOS ikonu) istenirse
    overflow: 'hidden',
  },
  logo: {
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 42,
    color: '#D4AF37', // Premium gold color
    letterSpacing: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    color: 'rgba(212, 175, 55, 0.85)',
    letterSpacing: 2,
  },
});
