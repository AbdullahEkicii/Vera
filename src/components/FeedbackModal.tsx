import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { logEvent } from '../services/analyticsService';
import { submitFeedback } from '../services/feedbackService';
import { MAX_MESSAGE_LENGTH } from '../utils/feedbackOutbox';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Where the user opened it from (e.g. 'settings', 'prayer_times'); stored with the message. */
  source?: string;
}

type Step = 'form' | 'thankyou';

const MAX_LENGTH = MAX_MESSAGE_LENGTH;

/**
 * Free-form feedback, opened from Settings. Stored in the Firestore `app_feedback`
 * collection so the developer actually receives it. Kept separate from the Play
 * review prompt (see reviewService) on purpose: Play policy forbids routing
 * unhappy users away from the store review.
 */
export function FeedbackModal({ visible, onClose, source = 'settings' }: Props) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>('form');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  // Saved on the device but not yet confirmed by the server (it is re-sent automatically).
  const [queued, setQueued] = useState(false);
  // Synchronous guard: state updates are async, so a fast double tap could pass `isSubmitting`.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setStep('form');
      setText('');
      setError(false);
      setQueued(false);
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [visible]);

  if (!visible) return null;

  const trimmed = text.trim();

  const handleSubmit = async () => {
    if (submittingRef.current || !trimmed) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(false);
    try {
      // Saved on the device before any network call, so even a stalled connection cannot lose it
      // or tempt the user into sending it twice; undelivered feedback is re-sent later.
      const result = await submitFeedback(trimmed, i18n.language, source);
      logEvent('feedback_sent', { length: trimmed.length, delivered: result.delivered });
      setQueued(!result.delivered);
      setStep('thankyou');
    } catch (e) {
      if (__DEV__) console.warn('Feedback submit failed:', e);
      setError(true);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={onClose} style={styles.closeIconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close', 'Kapat')}>
              <Ionicons name="close" size={20} color="rgba(253, 248, 237, 0.75)" />
            </Pressable>

            <LinearGradient colors={['#D4AF37', '#996515']} style={styles.iconBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={step === 'thankyou' ? 'checkmark-circle' : 'chatbubble-ellipses'} size={30} color="#FFFFFF" />
            </LinearGradient>

            {step === 'form' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>{t('feedback.title', 'Birlikte Geliştirelim')}</Text>
                <Text style={styles.message}>
                  {t('feedback.subtitle', "Vera'yı daha iyi yapabilmemiz için öneri, istek veya karşılaştığınız bir sorunu yazın.")}
                </Text>

                <TextInput
                  style={styles.textInput}
                  placeholder={t('feedback.placeholder', 'Fikir, öneri veya karşılaştığınız bir sorunu yazın...')}
                  placeholderTextColor="rgba(253, 248, 237, 0.75)"
                  multiline
                  numberOfLines={5}
                  maxLength={MAX_LENGTH}
                  value={text}
                  onChangeText={setText}
                  textAlignVertical="top"
                />

                {error && (
                  <Text style={styles.errorText}>
                    {t('feedback.error', 'Gönderilemedi. Lütfen biraz sonra tekrar deneyin.')}
                  </Text>
                )}

                <Pressable
                  onPress={handleSubmit}
                  style={[styles.primaryBtnWrapper, !trimmed && styles.disabled]}
                  disabled={isSubmitting || !trimmed}
                  accessibilityRole="button"
                >
                  <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isSubmitting ? (
                      <ActivityIndicator color="#1A1207" />
                    ) : (
                      <Text style={styles.primaryBtnText}>{t('feedback.send', 'Gönder')}</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={onClose} style={styles.secondaryBtn} accessibilityRole="button">
                  <Text style={styles.secondaryBtnText}>{t('common.cancel', 'Vazgeç')}</Text>
                </Pressable>
              </Animated.View>
            )}

            {step === 'thankyou' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
                <Text style={styles.title}>{t('feedback.thankYouTitle', 'Geri Bildiriminiz Alındı')}</Text>
                <Text style={styles.message}>
                  {t('feedback.thankYouSubtitle', "Görüşleriniz bizim için çok değerli. Vera'yı güzelleştirmek için var gücümüzle çalışıyoruz.")}
                </Text>
                {queued && (
                  <Text style={styles.queuedText}>
                    {t('feedback.queuedNote', 'Bağlantı zayıf olduğu için mesajınız cihazınıza kaydedildi; internet geldiğinde otomatik gönderilecek.')}
                  </Text>
                )}
                <Pressable onPress={onClose} style={styles.primaryBtnWrapper} accessibilityRole="button">
                  <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.primaryBtnText}>{t('common.close', 'Kapat')}</Text>
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
    end: 14,
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
  textInput: {
    width: '100%',
    minHeight: 110,
    backgroundColor: '#2A1F13',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 14,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#FDF8ED',
    marginBottom: 14,
  },
  queuedText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(253, 248, 237, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  disabled: {
    opacity: 0.5,
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
    color: 'rgba(253, 248, 237, 0.75)',
  },
});
