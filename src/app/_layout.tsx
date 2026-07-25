import { useEffect, useState } from 'react';
import { Slot, SplashScreen, router } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { audioManager } from '../services/audioManager';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { ThemeProvider } from '../context/ThemeContext';
import { QuranSettingsProvider } from '../context/QuranSettingsContext';
import { VersionChecker } from '../components/VersionChecker';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../localization/i18n';
import { View, StyleSheet, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const [langLoaded, setLangLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED) {
        if (detail.notification?.data?.prayerId) {
          const isExact = detail.notification.data.type === 'exact';
          console.log('Attempting to play adhan in foreground. Type:', isExact ? 'azizallah' : 'adhan');
          audioManager.playAdhan(isExact ? 'azizallah' : 'adhan');
        }
      } else if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'stop_sound') {
          console.log('Stop sound action pressed in foreground');
          audioManager.stopAdhan();
          if (detail.notification?.id) {
            notifee.cancelNotification(detail.notification.id);
          }
        } else if (detail.notification?.data?.type === 'daily_content') {
          router.replace('/');
        }
      }
    });

    notifee.getInitialNotification().then((initialNotification) => {
      if (initialNotification?.notification.data?.type === 'daily_content') {
        setTimeout(() => {
          router.replace('/');
        }, 500);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
        NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      } catch (e) {
        console.warn('Failed to configure navigation bar:', e);
      }
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('APP_LANG')
      .then((lang) => {
        if (lang) {
          i18n.changeLanguage(lang);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLangLoaded(true);
      });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && langLoaded) {
      setIsAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, langLoaded]);

  if (!isAppReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isSplashAnimationComplete ? (
        <ThemeProvider>
          <QuranSettingsProvider>
            <Slot />
            <VersionChecker />
          </QuranSettingsProvider>
        </ThemeProvider>
      ) : (
        <AnimatedSplashScreen 
          onAnimationComplete={() => setSplashAnimationComplete(true)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1207', // Match the splash screen background
  },
});
