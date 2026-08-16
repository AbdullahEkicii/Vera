import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
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

    // 3. Keep it on screen briefly, then complete smoothly (total ~1.1s)
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      textOpacity.value = withTiming(0, { duration: 250 });
      scale.value = withTiming(1.05, { duration: 300 });

      setTimeout(() => {
        onAnimationComplete();
      }, 320);
    }, 1100);

    return () => clearTimeout(timeout);
  }, []);

  const handlePressToSkip = () => {
    onAnimationComplete();
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
      
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logo}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]}>
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
    borderRadius: width * 0.45 / 2, // Tam yuvarlak yapmak için
    // borderRadius: 30, // Eğer hafif kavisli kare (iOS ikonu) istenirse
    overflow: 'hidden',
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: width * 0.45 / 2, // Logoyu tam yuvarlak yapar
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.15,
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
    color: 'rgba(212, 175, 55, 0.7)',
    letterSpacing: 2,
  },
});
