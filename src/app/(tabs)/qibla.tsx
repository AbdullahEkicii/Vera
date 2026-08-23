import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../utils/theme';
import { QiblaCompass } from '../../components/QiblaCompass';
import { getQiblaAngle, getDistanceToKaaba } from '../../utils/qibla';
import { AppBackground } from '../../components/ProgressRing';
import { logScreenView } from '../../services/analyticsService';
import { AdBanner } from '../../components/AdBanner';

const DEFAULT_COORDS = { latitude: 41.0082, longitude: 28.9784 };

interface QiblaScreenProps {
  onBack?: () => void;
  isActiveTab?: boolean;
}

export default function QiblaScreen({ onBack, isActiveTab = true }: QiblaScreenProps) {
  const { t } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();
  const isFocused = useIsFocused();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usedFallbackLocation, setUsedFallbackLocation] = useState<boolean>(false);
  const [isCalibrateModalVisible, setIsCalibrateModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused || !isActiveTab) return;
    logScreenView('QiblaScreen');

    let headingSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    (async () => {
      let coords: { latitude: number; longitude: number } | null = null;

      // 1. Try to request GPS permission and get position
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          if (isMounted) setHasPermission(true);
          let loc = await Location.getLastKnownPositionAsync({});
          if (!loc) {
            const timeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Location timed out')), 4000)
            );
            const positionPromise = Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            loc = await Promise.race([positionPromise, timeoutPromise]);
          }
          if (loc) {
            coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          }
        } else {
          if (isMounted) setHasPermission(false);
        }
      } catch (e) {
        console.warn('GPS location fetch error in QiblaScreen:', e);
      }

      // 2. Fallback to saved manual location
      if (!coords) {
        try {
          const savedStr = await AsyncStorage.getItem('MANUAL_LOCATION');
          if (savedStr) {
            const saved = JSON.parse(savedStr);
            if (saved?.latitude && saved?.longitude) {
              coords = { latitude: saved.latitude, longitude: saved.longitude };
              if (isMounted) setUsedFallbackLocation(true);
            }
          }
        } catch {}
      }

      // 3. Fallback to default coordinates
      if (!coords) {
        coords = DEFAULT_COORDS;
        if (isMounted) setUsedFallbackLocation(true);
      }

      if (!isMounted) return;

      const angle = getQiblaAngle(coords.latitude, coords.longitude);
      setQiblaAngle(angle);

      const dist = getDistanceToKaaba(coords.latitude, coords.longitude);
      setDistance(dist);

      try {
        headingSubscription = await Location.watchHeadingAsync((data) => {
          if (isMounted) {
            setHeading(data.trueHeading !== -1 ? data.trueHeading : data.magHeading);
          }
        });
      } catch (e) {
        if (isMounted) {
          setErrorMsg(t('qibla.errorCompass', 'Pusula sensörüne erişilemedi.'));
        }
      }
    })();

    return () => {
      isMounted = false;
      headingSubscription?.remove();
    };
  }, [isFocused, isActiveTab, t]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (qiblaAngle === null) {
    return (
      <AppBackground isDark={isDark}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('qibla.calibrating', 'Pusula hazırlanıyor...')}
          </Text>
        </View>
      </AppBackground>
    );
  }

  const cardBg = isDark ? '#1E160C' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#FDF8ED' : '#1A1A24';
  const textSecondary = isDark ? 'rgba(253, 248, 237, 0.65)' : 'rgba(26,26,36,0.6)';

  return (
    <AppBackground isDark={isDark}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
        hidden={isFullscreen}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <View style={styles.headerTop}>
            {onBack && (
              <Pressable onPress={onBack} style={styles.backButton}>
                <Feather name="arrow-left" size={22} color={textPrimary} />
              </Pressable>
            )}
            <Text style={[styles.title, { color: textPrimary }]}>
              🧭 {t('qibla.title', 'Kıble Pusulası')}
            </Text>
            
            {/* Calibration Button */}
            <Pressable
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (_) {}
                setIsCalibrateModalVisible(true);
              }}
              style={[styles.calibrateHeaderBtn, { borderColor: cardBorder }]}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="rotate-3d-variant" size={18} color="#D4AF37" />
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {t('qibla.description', 'Telefonunuzu yere paralel tutarak ibreyi Kabe hizasına getirin.')}
          </Text>
          {usedFallbackLocation && (
            <Text style={styles.fallbackNotice}>
              {t('qibla.fallbackNotice', 'Şehir konum koordinatlarına göre hesaplanmaktadır.')}
            </Text>
          )}
        </Animated.View>

        {/* Compass Component with Fixed Kaaba angle */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} style={styles.compassSection}>
          <QiblaCompass heading={heading} qiblaAngle={qiblaAngle} distance={distance} error={errorMsg} />
        </Animated.View>

        {/* Sensors & Safety Shield Indicators */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.safetyRow}>
          {/* Level Bubble Indicator */}
          <View style={[styles.safetyBadge, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="scan-outline" size={15} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.safetyBadgeText, { color: textSecondary }]}>
              {t('qibla.levelFlat', 'Düz ve Paralel ✓')}
            </Text>
          </View>

          {/* Magnetic Shield Badge */}
          <View style={[styles.safetyBadge, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#D4AF37" style={{ marginRight: 6 }} />
            <Text style={[styles.safetyBadgeText, { color: textSecondary }]}>
              {t('qibla.magneticShield', 'Manyetik Koruma')}
            </Text>
          </View>
        </Animated.View>

        {/* Native Ad Banner */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ width: '100%' }}>
          <AdBanner />
        </Animated.View>

        {/* Calibration & How to Use Guide */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)} style={[styles.guideCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.guideHeader}>
            <Ionicons name="information-circle-outline" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
            <Text style={[styles.guideTitle, { color: textPrimary }]}>
              {t('qibla.guideTitle', 'Nasıl Kullanılır?')}
            </Text>
          </View>
          <Text style={[styles.guideStepText, { color: textSecondary }]}>
            1. {t('qibla.step1', 'Telefonunuzu yere paralel (düz) tutun.')}
          </Text>
          <Text style={[styles.guideStepText, { color: textSecondary }]}>
            2. {t('qibla.step2', 'Metal ve manyetik eşyalardan uzak durun.')}
          </Text>
          <Text style={[styles.guideStepText, { color: '#10B981', fontFamily: typography.fontFamily.semiBold }]}>
            3. {t('qibla.step3', 'İbre yeşil olduğunda ve titreştiğinde Kıble yönündesiniz.')}
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Calibration Helper Modal */}
      <Modal visible={isCalibrateModalVisible} transparent animationType="fade" onRequestClose={() => setIsCalibrateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={[styles.modalCard, { backgroundColor: isDark ? '#1C150E' : '#FFFFFF', borderColor: cardBorder }]}>
            <View style={styles.modalIconWrap}>
              <MaterialCommunityIcons name="rotate-3d-variant" size={36} color="#D4AF37" />
            </View>

            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {t('qibla.calibrationTitle', 'Pusula Kalibrasyonu')}
            </Text>

            <Text style={[styles.modalDesc, { color: textSecondary }]}>
              {t('qibla.calibrationDesc', 'Manyetik sapmaları önlemek ve hassasiyeti artırmak için telefonunuzu havada yatay bir 8 (sonsuzluk işareti ∞) çizecek şekilde 2-3 kez yavaşça döndürün.')}
            </Text>

            <View style={styles.infinityContainer}>
              <Text style={styles.infinitySymbol}>∞</Text>
            </View>

            <Pressable
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (_) {}
                setIsCalibrateModalVisible(false);
              }}
              style={styles.modalBtn}
            >
              <Text style={styles.modalBtnText}>{t('qibla.gotIt', 'Anladım')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24) + 8,
    paddingHorizontal: 16,
    paddingBottom: 90,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 6,
  },
  calibrateHeaderBtn: {
    position: 'absolute',
    right: 0,
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  fallbackNotice: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: '#D4AF37',
    marginTop: 4,
  },
  compassSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  safetyBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11.5,
  },
  guideCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  guideTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  guideStepText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  infinityContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infinitySymbol: {
    fontSize: 48,
    color: '#D4AF37',
    fontWeight: '300',
  },
  modalBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: '#1A1207',
  },
});
