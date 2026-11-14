import { Feather, Ionicons } from '@expo/vector-icons';
import { AppStorage as AsyncStorage } from '../services/storageService';
import { AppStorage, SecureLocationStorage } from '../services/storageService';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  logEvent,
  logLocationResult,
  logNotificationPermissionResult,
  logOnboardingCompleted,
  logOnboardingSkipped,
  logOnboardingStep,
  logSoundTested,
} from '../services/analyticsService';
import { audioManager } from '../services/audioManager';
import { requestNotificationPermissions, updatePersistentPrayerNotification } from '../services/notificationService';
import { getRecommendedCalculationMethod } from '../utils/calcMethod';
import { logBreadcrumb, reportError } from '../services/crashReportingService';
import { allowAdsConsentFlow } from '../services/adsConsentService';

// GPS or geocoder can stall (cold start indoors, no Google geocoder); never leave the
// button stuck on "Detecting…".
const LOCATION_TIMEOUT_MS = 8000;
const GEOCODE_TIMEOUT_MS = 5000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

interface Props {
  visible: boolean;
  // `source` is 'gps' when the coordinates come from "Find my location" (stored as a GPS fix).
  onComplete: (lat?: number, lng?: number, city?: string, source?: 'gps') => void;
  onOpenCitySearch: () => void;
  currentCity?: string;
  // True while `currentCity` is only a timezone/region guess, not something the user chose.
  locationIsGuess?: boolean;
}

export function WelcomeOnboardingModal({
  visible,
  onComplete,
  onOpenCitySearch,
  currentCity = '',
  locationIsGuess = true,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLoc, setDetectedLoc] = useState<{ latitude: number; longitude: number; city: string } | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notifDenied, setNotifDenied] = useState(false);

  // Reopening the modal must not count the same step twice in the funnel.
  const loggedSteps = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (visible && !loggedSteps.current.has(step)) {
      loggedSteps.current.add(step);
      logOnboardingStep(step);
      logBreadcrumb(`onboarding step ${step}`);
    }
    return () => {
      audioManager.stopAdhan();
    };
  }, [visible, step]);

  if (!visible) return null;

  const handleAutoLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    setIsDetectingLocation(true);
    setLocationError(null);
    let geocodeFailed = false;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      logEvent('onboarding_permission', { type: 'location', granted: status === 'granted' });
      if (status !== 'granted') logLocationResult('denied', 'onboarding');
      if (status !== 'granted') {
        setLocationError(
          t('onboarding.locationDenied', 'Konum izni verilmedi. Şehrinizi listeden seçebilir veya bunu daha sonra Ayarlar\'dan değiştirebilirsiniz.')
        );
      }
      if (status === 'granted') {
        // Recent fixes only: a days-old position from another city is not "my location".
        let loc = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 5000 });
        if (!loc) {
          loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            LOCATION_TIMEOUT_MS
          );
        }
        if (loc) {
          // The coordinates are valid even if the geocoder fails; keep them.
          let geocode: Location.LocationGeocodedAddress[] = [];
          try {
            geocode = await withTimeout(
              Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              }),
              GEOCODE_TIMEOUT_MS
            );
          } catch (geocodeError) {
            console.warn('Reverse geocode in onboarding failed:', geocodeError);
            geocodeFailed = true;
          }
          let cityName = t('onboarding.currentLocationLabel', 'Mevcut konum');
          if (geocode && geocode[0]) {
            const item = geocode[0];
            const district = item.district || item.subregion || item.city;
            const province = item.region;
            cityName = district ? (province && province !== district ? `${district}, ${province}` : district) : (item.name || cityName);

            const countryCode = item.isoCountryCode || '';
            const recommendedMethod = getRecommendedCalculationMethod(countryCode);
            await AsyncStorage.setItem('PRAYER_CALCULATION_METHOD', recommendedMethod.toString()).catch(() => { });
          }

          const newLoc = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            city: cityName,
          };
          setDetectedLoc(newLoc);

          // A GPS fix, not a manual choice: MANUAL_LOCATION would pin the user to this city
          // forever (see useLocation.saveGpsLocation).
          await SecureLocationStorage.setItem('LAST_GPS_LOCATION', JSON.stringify(newLoc));
          await AppStorage.setItem('LAST_GPS_UPDATE_TIME', Date.now().toString()).catch(() => { });

          logLocationResult(geocodeFailed ? 'geocode_failed' : 'granted', 'onboarding');
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch { }
          setStep(2);
          return;
        }
      }
    } catch (e) {
      console.warn('Auto location detection in onboarding failed:', e);
      logLocationResult(e instanceof Error && e.message === 'timeout' ? 'timeout' : 'error', 'onboarding');
      setLocationError(
        t('onboarding.locationFailed', 'Konum alınamadı. Şehrinizi listeden seçebilir veya bunu daha sonra Ayarlar\'dan değiştirebilirsiniz.')
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleStepChange = (newStep: 1 | 2) => {
    try {
      Haptics.selectionAsync();
    } catch { }
    audioManager.stopAdhan();
    setIsPlayingTestSound(false);
    setStep(newStep);
  };

  // Step 2 is the last step: asking for the notification permission finishes onboarding.
  const handleContinueFromStep2 = async () => {
    // Request the notification permission right here — right after its rationale
    // was shown on this same step — instead of deferring it to the final Finish button.
    setNotifDenied(false);
    if (notifEnabled) {
      try {
        const granted = await requestNotificationPermissions();
        logEvent('onboarding_permission', { type: 'notification', granted });
        logNotificationPermissionResult(granted, 'onboarding');
        if (!granted) {
          // Don't silently continue — the adhan alert must never silently fail.
          // Surface it inline (same pattern as locationError) and let the user retry
          // or acknowledge and move on without notifications.
          setNotifDenied(true);
          return;
        }
      } catch (e) {
        console.warn('Notification permission request failed:', e);
        setNotifDenied(true);
        return;
      }
    }
    handleFinish();
  };

  const handleContinueWithoutNotifications = () => {
    setNotifEnabled(false);
    setNotifDenied(false);
    handleFinish();
  };

  const handleToggleNotif = () => {
    try {
      Haptics.selectionAsync();
    } catch { }
    setNotifEnabled(!notifEnabled);
  };

  const handleToggleTestSound = async () => {
    if (isPlayingTestSound) {
      audioManager.stopAdhan();
      setIsPlayingTestSound(false);
    } else {
      setIsPlayingTestSound(true);
      logSoundTested('azizallah');
      await audioManager.playAdhan('azizallah', () => {
        setIsPlayingTestSound(false);
      });
    }
  };

  const handleFinish = async () => {
    audioManager.stopAdhan();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }
    try {
      const cityToLog = detectedLoc?.city || currentCity;
      logOnboardingCompleted(step, cityToLog);
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
      // The always-on lock-screen countdown is opt-in for new installs (Settings). Existing
      // users, who never wrote this key, keep it on.
      if ((await AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED')) === null) {
        await AsyncStorage.setItem('PERSISTENT_NOTIF_ENABLED', 'false');
        updatePersistentPrayerNotification('', '', '', 0, false);
      }
    } catch (e) {
      console.error('Error saving onboarding state', e);
      reportError(e instanceof Error ? e : new Error(String(e)), 'Failed to persist ONBOARDING_COMPLETED flag');
    }
    // Only now may the ATT prompt / GDPR consent form appear.
    allowAdsConsentFlow();
    if (detectedLoc) {
      onComplete(detectedLoc.latitude, detectedLoc.longitude, detectedLoc.city, 'gps');
    } else {
      onComplete();
    }
  };

  const handleRequestClose = () => {
    if (step > 1) {
      handleStepChange((step - 1) as 1 | 2);
      return;
    }
    Alert.alert(
      t('onboarding.skipTitle', 'Kurulumu Atla'),
      t('onboarding.skipBody', 'Kurulumu şimdi atlayabilirsiniz. Konum ve bildirim ayarlarını daha sonra Ayarlar\'dan yapabilirsiniz.'),
      [
        { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
        {
          text: t('onboarding.skipConfirm', 'Atla'),
          style: 'destructive',
          onPress: () => {
            logOnboardingSkipped(step);
            handleFinish();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Top Glowing Header Badge */}
            <LinearGradient
              colors={['#D4AF37', '#996515']}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={26} color="#FFFFFF" />
            </LinearGradient>

            {/* Step Progress Indicators */}
            <View style={styles.stepIndicatorContainer}>
              <View style={[styles.stepIndicatorBar, step >= 1 && styles.stepIndicatorActive]} />
              <View style={[styles.stepIndicatorBar, step >= 2 && styles.stepIndicatorActive]} />
            </View>

            {/* STEP 1: WELCOME & LOCATION SELECTION */}
            {step === 1 && (() => {
              const isValidCity = !!currentCity && !locationIsGuess;
              // The timezone-guess fallback city (İstanbul) is not a chosen location: show a
              // neutral state rather than an error before any permission was even asked.
              const hasCity = !!(detectedLoc?.city || isValidCity);
              const displayCity = detectedLoc?.city || (isValidCity ? currentCity : t('onboarding.locationNotSetYet', 'Henüz seçilmedi'));
              return (
                <Animated.View entering={FadeIn.duration(220)} style={styles.stepContainer}>
                  <Text style={styles.title}>
                    {t('onboarding.title', "Vera'ya Hoş Geldiniz")}
                  </Text>
                  <Text style={styles.subtitle}>
                    {t(
                      'onboarding.subtitle',
                      'Doğru namaz vakitleri ve ezan bildirimleri için konumunuzu belirleyelim.'
                    )}
                  </Text>

                  {/* Detected Location Card */}
                  <View style={styles.locationPreviewBox}>
                    <View style={styles.locationIconWrap}>
                      <Feather name="map-pin" size={20} color="#D4AF37" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationPreviewLabel}>
                        {t('onboarding.detectedCity', 'Mevcut Şehir')}
                      </Text>
                      <Text style={styles.locationPreviewCity}>{displayCity}</Text>
                    </View>
                  </View>

                {locationError && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#F87171" style={{ marginEnd: 6 }} />
                    <Text style={styles.errorBoxText}>{locationError}</Text>
                  </View>
                )}

                {/* Auto GPS Button */}
                <Pressable
                  onPress={handleAutoLocation}
                  disabled={isDetectingLocation}
                  style={styles.primaryBtnWrapper}
                >
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Feather name="navigation" size={18} color="#1A1207" style={{ marginEnd: 8 }} />
                    <Text style={styles.primaryBtnText}>
                      {isDetectingLocation
                        ? t('onboarding.detecting', 'Konum Alınıyor...')
                        : t('onboarding.autoLocationBtn', 'Konumumu Otomatik Bul')}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Manual Search Button */}
                <Pressable
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch { }
                    onOpenCitySearch();
                    setStep(2);
                  }}
                  style={styles.secondaryActionBtn}
                >
                  <Feather name="search" size={16} color="#D4AF37" style={{ marginEnd: 6 }} />
                  <Text style={styles.secondaryActionText}>
                    {t('onboarding.manualCityBtn', 'Listeden Şehir Seç')}
                  </Text>
                </Pressable>

                {/* Skip / Continue Button */}
                <Pressable onPress={() => handleStepChange(2)} style={styles.skipBtn}>
                  <Text style={styles.skipBtnText}>
                    {hasCity
                      ? t('onboarding.continueWithCity', '{{city}} İle Devam Et', { city: displayCity })
                      : t('onboarding.skipLocation', 'Şimdilik atla')}
                  </Text>
                </Pressable>
                <Text style={styles.reassuranceText}>
                  {t('onboarding.locationReassurance', 'Bunu daha sonra Ayarlar\'dan istediğiniz zaman değiştirebilirsiniz.')}
                </Text>
              </Animated.View>
            );})()}

            {/* STEP 2: NOTIFICATION & AUDIO REASSURANCE */}
            {step === 2 && (
              <Animated.View entering={FadeIn.duration(220)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('onboarding.step2Title', 'Namaz & Ezan Bildirimleri')}
                </Text>
                <Text style={styles.subtitle}>
                  {t(
                    'onboarding.step2Subtitle',
                    'Vakitleri kaçırmamak için bildirim tercihlerinizi tamamlayın.'
                  )}
                </Text>

                {/* Notification Toggle Feature */}
                <Pressable
                  style={[
                    styles.featureItem,
                    notifEnabled && styles.featureItemActive,
                  ]}
                  onPress={handleToggleNotif}
                >
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                    <Ionicons
                      name={notifEnabled ? 'notifications' : 'notifications-off'}
                      size={18}
                      color="#D4AF37"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>
                      {t('onboarding.notificationsTitle', 'Ezan Vakti Bildirimleri')}
                    </Text>
                    <Text style={styles.featureDesc}>
                      {t(
                        'onboarding.notificationsDesc',
                        'Ezan girdiğinde sesli veya sessiz hatırlatma alırsınız.'
                      )}
                    </Text>
                  </View>
                  <Ionicons
                    name={notifEnabled ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={notifEnabled ? '#D4AF37' : 'rgba(253, 248, 237, 0.6)'}
                  />
                </Pressable>

                {/* Silent-mode behaviour is the decision users most often regret: say it here, before the permission ask. */}
                <Text style={styles.reassuranceText}>
                  {t('settings.respectSilentModeDesc', 'Telefonunuz sessizde veya titreşimdeyken ezan sesini kapatır, sessizce uyarır.')}
                </Text>

                {/* Sound Test / Preview Button */}
                <Pressable onPress={handleToggleTestSound} style={styles.secondaryActionBtn}>
                  <Feather name={isPlayingTestSound ? 'square' : 'volume-2'} size={16} color="#D4AF37" style={{ marginEnd: 6 }} />
                  <Text style={styles.secondaryActionText}>
                    {isPlayingTestSound
                      ? t('onboarding.stopTestSound', 'Sesi Durdur')
                      : t('onboarding.playTestSound', 'Ezan Sesini Dinle')}
                  </Text>
                </Pressable>

                {notifDenied && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#F87171" style={{ marginEnd: 6 }} />
                    <Text style={styles.errorBoxText}>
                      {t(
                        'onboarding.notifDenied',
                        'Bildirim izni verilmedi. Ezan uyarıları çalışmayabilir — daha sonra Ayarlar\'dan açabilirsiniz.'
                      )}
                    </Text>
                  </View>
                )}

                {/* Next Button */}
                <Pressable onPress={handleContinueFromStep2} style={styles.primaryBtnWrapper}>
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {notifDenied
                        ? t('onboarding.retryBtn', 'Tekrar Dene')
                        : t('onboarding.startBtn', "Vera'yı Kullanmaya Başla")}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {notifDenied && (
                  <Pressable onPress={handleContinueWithoutNotifications} style={styles.skipBtn}>
                    <Text style={styles.skipBtnText}>
                      {t('onboarding.continueWithoutNotif', 'Bildirim Olmadan Devam Et')}
                    </Text>
                  </Pressable>
                )}

                {/* Back Button */}
                <Pressable onPress={() => handleStepChange(1)} style={styles.skipBtn}>
                  <Text style={styles.skipBtnText}>
                    {t('onboarding.backBtn', 'Geri Dön')}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 4, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#1E160C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 22,
    alignItems: 'center',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#1E160C',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  stepIndicatorBar: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(253, 248, 237, 0.18)',
  },
  stepIndicatorActive: {
    backgroundColor: '#D4AF37',
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 21,
    color: '#FDF8ED',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(253, 248, 237, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  locationPreviewBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F13',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 12,
    marginBottom: 14,
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  locationPreviewLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: 'rgba(253, 248, 237, 0.75)',
    marginBottom: 2,
  },
  locationPreviewCity: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FDF8ED',
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#1A1207',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 10,
  },
  secondaryActionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#D4AF37',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  skipBtnText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: 'rgba(253, 248, 237, 0.75)',
  },
  reassuranceText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 10.5,
    color: 'rgba(253, 248, 237, 0.7)',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 12,
  },
  errorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    padding: 10,
    marginBottom: 12,
  },
  errorBoxText: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: '#F87171',
    lineHeight: 15,
  },
  featureItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F13',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    padding: 12,
    marginBottom: 10,
  },
  featureItemActive: {
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: '#332617',
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  featureTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#FDF8ED',
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: 'rgba(253, 248, 237, 0.8)',
    lineHeight: 15,
  },
});
