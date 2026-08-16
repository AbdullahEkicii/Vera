import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentOpenCount?: number;
}

type Step = 'rate' | 'positive' | 'feedback' | 'thankyou';

export function AppReviewModal({ visible, onClose, currentOpenCount = 0 }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(0);
  const [step, setStep] = useState<Step>('rate');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setRating(0);
      setStep('rate');
      setFeedbackText('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleStarPress = async (selectedRating: number) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(
          selectedRating >= 4
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
      }
    } catch {}

    setRating(selectedRating);

    if (selectedRating >= 4) {
      // 4 or 5 stars -> positive flow
      setStep('positive');
      // Proactively attempt native in-app review
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      } catch (err) {
        console.log('In-app review request handled/skipped:', err);
      }
    } else {
      // 1, 2, or 3 stars -> feedback flow
      setStep('feedback');
    }
  };

  const handlePositiveReviewSubmit = async () => {
    try {
      await AsyncStorage.setItem('HAS_REVIEWED_APP', 'true');
    } catch (e) {
      console.error('Error saving review status', e);
    }

    onClose();

    // Fallback store open if user wants to write public review
    const storeUrl = Platform.select({
      android: 'market://details?id=com.abdllhekc.vera',
      ios: 'https://apps.apple.com/app/idcom.abdllhekc.vera',
      default: 'https://play.google.com/store/apps/details?id=com.abdllhekc.vera',
    });
    const webFallback = 'https://play.google.com/store/apps/details?id=com.abdllhekc.vera';

    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        } else {
          await Linking.openURL(webFallback);
        }
      }
    } catch {
      await Linking.openURL(webFallback).catch(() => {});
    }
  };

  const handleFeedbackSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Save feedback locally
      const feedbackPayload = {
        rating,
        feedback: feedbackText.trim(),
        date: new Date().toISOString(),
      };
      const existing = await AsyncStorage.getItem('USER_FEEDBACK_LOGS');
      const list = existing ? JSON.parse(existing) : [];
      list.push(feedbackPayload);
      await AsyncStorage.setItem('USER_FEEDBACK_LOGS', JSON.stringify(list));

      // Mark as reviewed so user is never asked again
      await AsyncStorage.setItem('HAS_REVIEWED_APP', 'true');
      setStep('thankyou');
    } catch (e) {
      console.error('Error saving feedback:', e);
      setStep('thankyou');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    // If dismissed without submitting, remember current open count
    try {
      await AsyncStorage.setItem(
        'LAST_REVIEW_DISMISSED_AT_OPEN_COUNT',
        currentOpenCount.toString()
      );
      await AsyncStorage.setItem('LAST_REVIEW_PROMPT_DATE', Date.now().toString());
    } catch (e) {
      console.error('Error saving review dismissal:', e);
    }
    onClose();
  };

  const handleCloseReviewed = async () => {
    try {
      await AsyncStorage.setItem('HAS_REVIEWED_APP', 'true');
    } catch (e) {}
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Close Button */}
            <Pressable
              onPress={step === 'thankyou' ? handleCloseReviewed : handleDismiss}
              style={styles.closeIconBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color="rgba(253, 248, 237, 0.6)" />
            </Pressable>

            {/* Top Decorative Header Icon */}
            <LinearGradient
              colors={['#D4AF37', '#996515']}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={
                  step === 'thankyou'
                    ? 'checkmark-circle'
                    : step === 'positive'
                    ? 'heart'
                    : step === 'feedback'
                    ? 'chatbubble-ellipses'
                    : 'star'
                }
                size={30}
                color="#FFFFFF"
              />
            </LinearGradient>

            {/* STEP 1: INITIAL RATE SCREEN */}
            {step === 'rate' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('review.title', "Vera'yı Beğendiniz mi?")}
                </Text>
                <Text style={styles.message}>
                  {t(
                    'review.message',
                    'Sizlere en iyi deneyimi sunmak için sürekli çalışıyoruz.'
                  )}
                </Text>

                {/* Star Rating Buttons */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => handleStarPress(star)}
                      style={({ pressed }) => [
                        styles.starBtn,
                        pressed && styles.starBtnPressed,
                      ]}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={rating >= star ? 'star' : 'star-outline'}
                        size={36}
                        color="#F59E0B"
                      />
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.tapHint}>
                  {t('review.subtitle', 'Deneyiminizi yıldızlarla puanlayın')}
                </Text>

                {/* Secondary Button */}
                <Pressable onPress={handleDismiss} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>
                    {t('review.notNow', 'Şimdi Değil')}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 2: POSITIVE 4-5 STARS */}
            {step === 'positive' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('review.fiveStarTitle', 'Bunu duyduğumuza çok sevindik! 🌟')}
                </Text>
                <Text style={styles.message}>
                  {t(
                    'review.fiveStarSubtitle',
                    'Uygulamamızı 5 yıldız vererek desteklemek ister misiniz?'
                  )}
                </Text>

                {/* Selected Stars Highlight */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={28}
                      color="#F59E0B"
                    />
                  ))}
                </View>

                {/* Primary Store Action Button */}
                <Pressable
                  onPress={handlePositiveReviewSubmit}
                  style={styles.primaryBtnWrapper}
                >
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('review.rateOnStore', '🌟 5 Yıldız Ver & Destek Ol')}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Close Button */}
                <Pressable onPress={handleCloseReviewed} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>
                    {t('review.close', 'Kapat')}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 3: CONSTRUCTIVE FEEDBACK (1-3 STARS) */}
            {step === 'feedback' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('review.feedbackTitle', 'Birlikte Geliştirelim 💬')}
                </Text>
                <Text style={styles.message}>
                  {t(
                    'review.feedbackSubtitle',
                    'Vera\'yı daha iyi yapabilmemiz için öneri ve görüşlerinizi bizimle paylaşın.'
                  )}
                </Text>

                {/* Feedback Input Field */}
                <TextInput
                  style={styles.textInput}
                  placeholder={t(
                    'review.feedbackPlaceholder',
                    'Fikir, öneri veya karşılaştığınız bir sorunu yazın...'
                  )}
                  placeholderTextColor="rgba(253, 248, 237, 0.4)"
                  multiline
                  numberOfLines={4}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  textAlignVertical="top"
                />

                {/* Submit Feedback Button */}
                <Pressable
                  onPress={handleFeedbackSubmit}
                  style={styles.primaryBtnWrapper}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('review.sendFeedback', 'Geri Bildirim Gönder')}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Cancel / Dismiss Button */}
                <Pressable onPress={handleDismiss} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>
                    {t('review.notNow', 'Şimdi Değil')}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 4: THANK YOU SCREEN */}
            {step === 'thankyou' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>
                  {t('review.thankYouTitle', 'Geri Bildiriminiz Alındı! 🤲')}
                </Text>
                <Text style={styles.message}>
                  {t(
                    'review.thankYouSubtitle',
                    'Görüşleriniz bizim için çok değerli. Vera\'yı güzelleştirmek için var gücümüzle çalışıyoruz.'
                  )}
                </Text>

                {/* Close Button */}
                <Pressable
                  onPress={handleCloseReviewed}
                  style={styles.primaryBtnWrapper}
                >
                  <LinearGradient
                    colors={['#D4AF37', '#B8860B']}
                    style={styles.primaryBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t('review.close', 'Kapat')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 4, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    backgroundColor: '#1E160C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 36,
    alignItems: 'center',
  },
  closeIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 248, 237, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#1E160C',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#FDF8ED',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  message: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(253, 248, 237, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  starBtn: {
    padding: 4,
  },
  starBtnPressed: {
    transform: [{ scale: 1.2 }],
  },
  tapHint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(253, 248, 237, 0.5)',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    minHeight: 90,
    backgroundColor: '#2A1F13',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 14,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#FDF8ED',
    marginBottom: 18,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#1A1207',
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(253, 248, 237, 0.55)',
  },
});

