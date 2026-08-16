import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { requestNotificationPermissions } from '../services/notificationService';
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
  currentCity = 'İstanbul',
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  if (!visible) return null;

  const handleAutoLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
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
            await AsyncStorage.setItem('PRAYER_CALCULATION_METHOD', recommendedMethod.toString()).catch(() => {});
          }
          await AsyncStorage.setItem(
            'MANUAL_LOCATION',
            JSON.stringify({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              city: cityName,
            })
          );
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}
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

  const handleStepChange = (newStep: 1 | 2) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setStep(newStep);
  };

  const handleToggleNotif = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setNotifEnabled(!notifEnabled);
  };

  const handleFinish = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    try {
      if (notifEnabled) {
        await requestNotificationPermissions();
      }
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
    } catch (e) {
      console.error('Error saving onboarding state', e);
    }
    onComplete();
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
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </LinearGradient>

            {/* Step Progress Indicators */}
            <View style={styles.stepIndicatorContainer}>
              <View style={[styles.stepIndicatorBar, step >= 1 && styles.stepIndicatorActive]} />
              <View style={[styles.stepIndicatorBar, step >= 2 && styles.stepIndicatorActive]} />
            </View>

            {/* STEP 1: WELCOME & LOCATION SELECTION */}
            {step === 1 && (
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
                    <Text style={styles.locationPreviewCity}>{currentCity}</Text>
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
                    } catch (_) {}
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
                    {t('onboarding.continueWithCity', '{{city}} İle Devam Et', { city: currentCity })}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 2: NOTIFICATION & FEATURES SHOWCASE */}
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

                {/* Feature Mini Highlights */}
                <View style={styles.highlightsContainer}>
                  <View style={styles.highlightBadge}>
                    <Feather name="book" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureQuran', 'Kuran & Ses')}
                    </Text>
                  </View>
                  <View style={styles.highlightBadge}>
                    <Feather name="compass" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureQibla', 'Kıble')}
                    </Text>
                  </View>
                  <View style={styles.highlightBadge}>
                    <Feather name="heart" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
                    <Text style={styles.highlightText}>
                      {t('onboarding.featureDhikr', 'Zikirmatik')}
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

                {/* Back to Step 1 */}
                <Pressable onPress={() => handleStepChange(1)} style={styles.skipBtn}>
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
    backgroundColor: 'rgba(10, 7, 4, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
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
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
    marginBottom: 16,
  },
  stepIndicatorBar: {
    width: 36,
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
    fontSize: 22,
    color: '#FDF8ED',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(253, 248, 237, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  locationPreviewBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F13',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 14,
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationPreviewLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(253, 248, 237, 0.55)',
    marginBottom: 2,
  },
  locationPreviewCity: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#FDF8ED',
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
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
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 10,
  },
  secondaryActionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#D4AF37',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
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
    padding: 14,
    marginBottom: 12,
  },
  featureItemActive: {
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: '#332617',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FDF8ED',
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(253, 248, 237, 0.65)',
    lineHeight: 16,
  },
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  highlightBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
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

