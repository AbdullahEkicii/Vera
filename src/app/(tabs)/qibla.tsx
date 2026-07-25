import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../context/ThemeContext';
import { borderRadius, typography } from '../../utils/theme';
import { QiblaCompass } from '../../components/QiblaCompass';
import { getQiblaAngle, getDistanceToKaaba } from '../../utils/qibla';
import { AppBackground } from '../../components/ProgressRing';

export default function QiblaScreen() {
  const { t } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let headingSubscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(t('qibla.permissionDenied'));
        setHasPermission(false);
        return;
      }
      setHasPermission(true);

      try {
        const location =
          (await Location.getLastKnownPositionAsync({})) ||
          (await Location.getCurrentPositionAsync({}));
        const angle = getQiblaAngle(
          location.coords.latitude,
          location.coords.longitude
        );
        setQiblaAngle(angle);

        const dist = getDistanceToKaaba(
          location.coords.latitude,
          location.coords.longitude
        );
        setDistance(dist);

        headingSubscription = await Location.watchHeadingAsync((data) => {
          setHeading(data.trueHeading !== -1 ? data.trueHeading : data.magHeading);
        });
      } catch {
        setErrorMsg(t('qibla.errorCompass'));
      }
    })();

    return () => { headingSubscription?.remove(); };
  }, [t]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (hasPermission === null || qiblaAngle === null) {
    return (
      <AppBackground isDark={isDark}>
        <View style={styles.center}>
          {hasPermission === false ? (
            <>
              <Text style={[styles.errorIcon]}>🔒</Text>
              <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                {t('qibla.permissionRequired')}
              </Text>
              <Text style={[styles.errorBody, { color: theme.colors.textSecondary }]}>
                {errorMsg}
              </Text>
              <Pressable
                style={[styles.settingsBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.settingsBtnText}>{t('qibla.openSettings')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('qibla.calibrating')}
              </Text>
            </>
          )}
        </View>
      </AppBackground>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <AppBackground isDark={isDark}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
        hidden={isFullscreen}
      />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>🧭 {t('qibla.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('qibla.description')}
          </Text>
        </Animated.View>

        {/* Compass */}
        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.compassSection}>
          <QiblaCompass heading={heading} qiblaAngle={qiblaAngle} distance={distance} error={errorMsg} />
        </Animated.View>

        {/* Bottom hint */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <View style={[styles.hintRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border }]}>
            <Text style={styles.hintIcon}>💡</Text>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
              {t('qibla.hint')}
            </Text>
          </View>
        </Animated.View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  compassSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  hintIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  hintText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    marginTop: 12,
  },
  settingsBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: '#FFF',
  },
});
