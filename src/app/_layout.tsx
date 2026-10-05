import { useEffect, useState, useRef } from 'react';
import { Slot, SplashScreen, router } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { audioManager } from '../services/audioManager';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { ThemeProvider } from '../context/ThemeContext';
import { QuranSettingsProvider } from '../context/QuranSettingsContext';
import { VersionChecker } from '../components/VersionChecker';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';
import { maybeRequestReview } from '../services/reviewService';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { registerBackgroundPrayerRefreshTask } from '../services/backgroundTaskService';
import { allowAdsConsentFlow, initializeAdsWithConsent } from '../services/adsConsentService';
import { reportError } from '../services/crashReportingService';
import { initializePushNotifications } from '../services/pushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeAppLanguage } from '../localization/i18n';
import { View, StyleSheet, Platform, InteractionManager } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global Error Handler for uncaught JS errors
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('🔴 [GLOBAL UNCAUGHT ERROR]', error, 'Fatal:', isFatal);
    reportError(error instanceof Error ? error : new Error(String(error)), `Global uncaught error (fatal=${!!isFatal})`);
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

function isNotificationFresh(detail: any) {
  let notifTime = detail?.notification?.data?.timestamp
    ? Number(detail.notification.data.timestamp)
    : null;
  if (!notifTime && detail?.notification?.id) {
    const parts = detail.notification.id.split('-');
    const lastPart = Number(parts[parts.length - 1]);
    if (!isNaN(lastPart) && lastPart > 1000000000000) {
      notifTime = lastPart;
    }
  }
  if (!notifTime) return true;
  const now = Date.now();
  return Math.abs(now - notifTime) <= 2 * 60 * 1000;
}

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
  const hasHandledInitialNotif = useRef(false);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'stop_sound') {
          console.log('Stop sound action pressed in foreground');
          audioManager.stopAdhan();
          if (detail.notification?.id) {
            notifee.cancelNotification(detail.notification.id);
          }
        }
      } else if (type === EventType.PRESS) {
        // Stop any playing adhan audio when tapping the notification to enter the app
        audioManager.stopAdhan();

        if (!isNotificationFresh(detail)) return;

        const notifType = detail.notification?.data?.type;
        setTimeout(() => {
          try {
            if (notifType === 'daily_content') {
              router.replace({ pathname: '/(tabs)', params: { tab: '1' } });
            } else if (notifType === 'quran') {
              router.replace({ pathname: '/(tabs)', params: { tab: '0' } });
            } else if (notifType === 'names') {
              router.replace({ pathname: '/(tabs)', params: { tab: '4' } });
            } else if (notifType === 'greeting') {
              const occasion = String(detail.notification?.data?.occasion ?? 'cuma');
              router.replace({ pathname: '/(tabs)', params: { tab: '2', open: 'greeting', occasion } });
            }
          } catch (e) {
            console.error('Error opening notification target:', e);
          }
        }, 500);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAppReady && isSplashAnimationComplete && !hasHandledInitialNotif.current) {
      hasHandledInitialNotif.current = true;
      notifee.getInitialNotification().then((initialNotification) => {
        const notifType = initialNotification?.notification?.data?.type;
        if (!notifType) return;
        if (!isNotificationFresh(initialNotification)) return;
        setTimeout(() => {
          try {
            if (notifType === 'daily_content') {
              router.replace({ pathname: '/(tabs)', params: { tab: '1' } });
            } else if (notifType === 'quran') {
              router.replace({ pathname: '/(tabs)', params: { tab: '0' } });
            } else if (notifType === 'names') {
              router.replace({ pathname: '/(tabs)', params: { tab: '4' } });
            } else if (notifType === 'greeting') {
              const occasion = String(initialNotification?.notification?.data?.occasion ?? 'cuma');
              router.replace({ pathname: '/(tabs)', params: { tab: '2', open: 'greeting', occasion } });
            }
          } catch (err) {
            console.error('Error handling initial notification route:', err);
          }
        }, 600);
      }).catch((err) => console.error('Error getting initial notification:', err));
    }
  }, [isAppReady, isSplashAnimationComplete]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
        // setBehaviorAsync is deprecated/unsupported with edge-to-edge
      } catch (e) {
        console.warn('Failed to configure navigation bar:', e);
      }
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('APP_LANG')
      .then((lang) => {
        if (lang) {
          changeAppLanguage(lang);
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

      const trackAppOpen = async () => {
        try {
          const countStr = await AsyncStorage.getItem('APP_OPEN_COUNT');
          const count = (countStr ? parseInt(countStr, 10) : 0) + 1;
          AsyncStorage.setItem('APP_OPEN_COUNT', count.toString()).catch(() => {});
          // Ask Play for a review once the user has come back a few times; Play
          // decides whether the card actually shows.
          if (count >= 5) {
            setTimeout(() => maybeRequestReview('open_5'), 4000);
          }
        } catch (e) {
          console.error("Error tracking app open count", e);
        }
      };
      trackAppOpen();
      registerBackgroundPrayerRefreshTask();
      // Defer non-critical network/consent init until after first interactions settle,
      // so they don't compete with prayer-times/weather fetches for bandwidth right at cold start.
      InteractionManager.runAfterInteractions(() => {
        // Returning users: onboarding is done, so the consent flow may run now.
        // First launch: WelcomeOnboardingModal releases it on finish instead.
        AsyncStorage.getItem('ONBOARDING_COMPLETED')
          .then((done) => {
            if (done === 'true') allowAdsConsentFlow();
          })
          .catch(() => {});
        initializeAdsWithConsent();
        initializePushNotifications();
      });
    }
  }, [fontsLoaded, fontError, langLoaded]);

  if (!isAppReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isSplashAnimationComplete ? (
        <ErrorBoundary>
          <ThemeProvider>
            <QuranSettingsProvider>
              <Slot />
              <VersionChecker />
            </QuranSettingsProvider>
          </ThemeProvider>
        </ErrorBoundary>
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
