import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform, NativeModules } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';

interface WidgetPromoModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWidget: () => void;
}

export const WidgetPromoModal: React.FC<WidgetPromoModalProps> = ({
  visible,
  onClose,
  onAddWidget,
}) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 60 : 40} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(14)}
          exiting={FadeOutDown.duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(22, 22, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Icon/Illustration Area */}
          <View style={styles.illustrationContainer}>
            <View style={[styles.glowCircle, { backgroundColor: '#D4AF37' + '25' }]} />
            <View style={[styles.iconWrapper, { backgroundColor: '#D4AF37' }]}>
              <Ionicons name="grid-outline" size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Text Content */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('widgetPromo.title', 'Add Prayer Widget')}
          </Text>
          <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
            {t(
              'widgetPromo.desc',
              'Add Vera widget to your home screen to see prayer times and countdown instantly without opening the app.'
            )}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
              ]}
              onPress={onAddWidget}
            >
              <Text style={styles.primaryBtnText}>
                {t('widgetPromo.addBtn', 'Add to Home Screen')}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
                {t('widgetPromo.dismissBtn', 'Not Now')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  closeBtn: {
    padding: 4,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 20,
  },
  glowCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
});
