import { Feather, Ionicons } from '@expo/vector-icons';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  logBatterySettingOpened,
  logOnboardingCompleted,
  logScreenView,
  logSoundTested,
  logWidgetPinned,
} from '../services/analyticsService';
import { audioManager } from '../services/audioManager';
import { requestNotificationPermissions } from '../services/notificationService';
import { requestPinWidget } from '../services/widgetService';
import { getRecommendedCalculationMethod } from '../utils/calcMethod';

interface Props {
  visible: boolean;
  onComplete: (lat?: number, lng?: number, city?: string) => void;
  onOpenCitySearch: () => void;
  currentCity?: string;
}

export function WelcomeOnboardingModal({
  visible,
  onComplete,
  onOpenCitySearch,
  currentCity = '',
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLoc, setDetectedLoc] = useState<{ latitude: number; longitude: number; city: string } | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [widgetPinned, setWidgetPinned] = useState(false);

  useEffect(() => {
    if (visible) {
      logScreenView(`Onboarding_Step_${step}`);
    }
    return () => {
      audioManager.stopAdhan();
    };
  }, [visible, step]);

  if (!visible) return null;

  const handleAutoLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) { }
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (loc) {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          let cityName = currentCity;
          if (geocode && geocode[0]) {
            const item = geocode[0];
            const district = item.district || item.subregion || item.city;
            const province = item.region;
            cityName = district ? (province && province !== district ? `${district}, ${province}` : district) : (item.name || currentCity);

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

          await AsyncStorage.setItem('MANUAL_LOCATION', JSON.stringify(newLoc));
          await AsyncStorage.setItem('LAST_GPS_LOCATION', JSON.stringify(newLoc));

          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) { }
          setStep(2);
          return;
        }
      }
    } catch (e) {
      console.warn('Auto location detection in onboarding failed:', e);
    } finally {
      setIsDetectingLocation(false);
    }
    setStep(2);
  };

  const handleStepChange = (newStep: 1 | 2 | 3) => {
    try {
      Haptics.selectionAsync();
    } catch (_) { }
    audioManager.stopAdhan();
    setIsPlayingTestSound(false);
    setStep(newStep);
  };

  const handleToggleNotif = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) { }
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

  const handlePinWidget = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) { }
    if (Platform.OS === 'android') {
      const success = await requestPinWidget();
      if (success) {
        setWidgetPinned(true);
        logWidgetPinned();
      }
    }
  };

  const handleOpenBatterySettings = async () => {
    try {
      logBatterySettingOpened();
      await notifee.openBatteryOptimizationSettings();
    } catch (e) {
      console.error('Error opening battery optimization settings:', e);
    }
  };

  const handleFinish = async () => {
    audioManager.stopAdhan();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) { }
    try {
      const cityToLog = detectedLoc?.city || currentCity;
      logOnboardingCompleted(step, cityToLog);
      if (notifEnabled) {
        await requestNotificationPermissions();
      }
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
    } catch (e) {
      console.error('Error saving onboarding state', e);
    }
    if (detectedLoc) {
      onComplete(detectedLoc.latitude, detectedLoc.longitude, detectedLoc.city);
    } else {
      onComplete();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
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
              <View style={[styles.stepIndicatorBar, step >= 3 && styles.stepIndicatorActive]} />
            </View>

            {/* STEP 1: WELCOME & LOCATION SELECTION */}
            {step === 1 && (() => {
              const isValidCity = currentCity && currentCity !== 'İstanbul';
              const displayCity = detectedLoc?.city || (isValidCity ? currentCity : t('onboarding.locationNotSet', 'Konum Alınamadı (İzin Verilmedi)'));
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
                    <Feather name="navigation" size={18} color="#1A1207" style={{ marginRight: 8 }} />
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
                    } catch (_) { }
                    onOpenCitySearch();
                    setStep(2);
                  }}
                  style={styles.secondaryActionBtn}
                >
                  <Feather name="search" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryActionText}>
                    {t('onboarding.manualCityBtn', 'Listeden Şehir Seç')}
                  </Text>
                </Pressable>

                {/* Skip / Continue Button */}
                <Pressable onPress={() => handleStepChange(2)} style={styles.skipBtn}>
                  <Text style={styles.skipBtnText}>
                    {t('onboarding.continueWithCity', '{{city}} İle Devam Et', { city: displayCity })}
                  </Text>
                </Pressable>
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

                {/* Verified Method Badge */}
                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Feather name="shield" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>
                      {t('onboarding.verifiedMethodTitle', 'Doğrulanmış Vakitler')}
                    </Text>
                    <Text style={styles.featureDesc}>
                      {t(
                        'onboarding.verifiedMethodDesc',
                        'Bölgenize en uygun İslami hesaplama yöntemi otomatik seçildi.'
                      )}
                    </Text>
                  </View>
                </View>

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
                    color={notifEnabled ? '#D4AF37' : 'rgba(253, 248, 237, 0.3)'}
                  />
                </Pressable>

                {/* Sound Test / Preview Button */}
                <Pressable onPress={handleToggleTestSound} style={styles.secondaryActionBtn}>
                  <Feather name={isPlayingTestSound ? 'square' : 'volume-2'} size={16} color="#D4AF37" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryActionText}>
                    {isPlayingTestSound
                      ? t('onboarding.stopTestSound', 'Sesi Durdur ⏹️')
                      : t('onboarding.playTestSound', 'Ezan Sesini Dinle 🔊')}
                  </Text>
                </Pressable>

                {/* Next Button */}
                <Pressable onPress={() => handleStepChange(3)} style={styles.primaryBtnWrapper}>
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('onboarding.nextStepBtn', 'Devam Et →')}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Back Button */}
                <Pressable onPress={() => handleStepChange(1)} style={styles.skipBtn}>
                  <Text style={styles.skipBtnText}>
                    {t('onboarding.backBtn', '← Geri Dön')}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 3: DAY-1 RETENTION (WIDGET & BATTERY OPTIMIZATION) */}
            {step === 3 && (
              <Animated.View entering={FadeIn.duration(220)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('onboarding.step3Title', 'Kesintisiz Deneyim')}
                </Text>
                <Text style={styles.subtitle}>
                  {t(
                    'onboarding.step3Subtitle',
                    'Vakitleri ana ekranınızdan canlı takip edin ve ezan seslerini garantiye alın.'
                  )}
                </Text>

                {/* Pin Widget Promo Item */}
                {Platform.OS === 'android' && (
                  <Pressable
                    style={[styles.featureItem, widgetPinned && styles.featureItemActive]}
                    onPress={handlePinWidget}
                  >
                    <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                      <Feather name="grid" size={18} color="#D4AF37" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>
                        {t('onboarding.widgetTitle', '📌 Ana Ekrana Widget Ekle')}
                      </Text>
                      <Text style={styles.featureDesc}>
                        {widgetPinned
                          ? t('onboarding.widgetAdded', 'Widget başarıyla eklendi!')
                          : t('onboarding.widgetDesc', 'Uygulamayı açmadan canlı geri sayımı görün.')}
                      </Text>
                    </View>
                    <Ionicons
                      name={widgetPinned ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color="#D4AF37"
                    />
                  </Pressable>
                )}

                {/* Battery Optimization Card (Android) */}
                {Platform.OS === 'android' && (
                  <Pressable
                    style={styles.featureItem}
                    onPress={handleOpenBatterySettings}
                  >
                    <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Feather name="battery-charging" size={18} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>
                        {t('onboarding.batteryTitle', '🔋 Pil Tasarrufu Kısıtlaması')}
                      </Text>
                      <Text style={styles.featureDesc}>
                        {t('onboarding.batteryDesc', 'Xiaomi & Samsung cihazlarda ezanın tam vaktinde çalması için kapatmanız önerilir.')}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="rgba(253, 248, 237, 0.4)" />
                  </Pressable>
                )}

                {/* Feature Highlights Mini */}
                <View style={styles.highlightsContainer}>
                  <View style={styles.highlightBadge}>
                    <Feather name="book" size={13} color="#D4AF37" style={{ marginRight: 4 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureQuran', 'Kuran')}
                    </Text>
                  </View>
                  <View style={styles.highlightBadge}>
                    <Feather name="compass" size={13} color="#D4AF37" style={{ marginRight: 4 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureQibla', 'Kıble')}
                    </Text>
                  </View>
                  <View style={styles.highlightBadge}>
                    <Feather name="heart" size={13} color="#D4AF37" style={{ marginRight: 4 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureDhikr', 'Zikir')}
                    </Text>
                  </View>
                </View>

                {/* Finish Button */}
                <Pressable onPress={handleFinish} style={styles.primaryBtnWrapper}>
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('onboarding.startBtn', "Vera'yı Kullanmaya Başla 🌟")}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Back Button */}
                <Pressable onPress={() => handleStepChange(2)} style={styles.skipBtn}>
                  <Text style={styles.skipBtnText}>
                    {t('onboarding.backBtn', '← Geri Dön')}
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
    marginRight: 12,
  },
  locationPreviewLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: 'rgba(253, 248, 237, 0.55)',
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
    color: 'rgba(253, 248, 237, 0.55)',
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
    marginRight: 10,
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
    color: 'rgba(253, 248, 237, 0.65)',
    lineHeight: 15,
  },
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
    gap: 6,
  },
  highlightBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  highlightText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: '#FDF8ED',
  },
});
