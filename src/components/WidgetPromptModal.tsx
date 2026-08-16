import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { requestPinWidget } from '../services/widgetService';
import { typography, spacing } from '../utils/theme';

interface WidgetPromptModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WidgetPromptModal: React.FC<WidgetPromptModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  const handleAddWidget = async () => {
    onClose();
    if (Platform.OS === 'android') {
      const pinned = await requestPinWidget();
      if (!pinned) {
        Alert.alert(
          t('widget.guideTitle', 'Ana Ekrana Ekle'),
          t(
            'widget.guideDesc',
            'Ana ekranınıza basılı tutun ➔ "Widgetlar" seçeneğini tıklayın ➔ "VERA" widget\'ını seçip ekranınıza sürükleyin.'
          )
        );
      }
    } else {
      Alert.alert(
        t('widget.guideTitle', 'Ana Ekrana Ekle'),
        t(
          'widget.guideDesc',
          'Ana ekranınıza basılı tutun ➔ Sol üstteki "+" butonuna tıklayın ➔ "VERA" aratıp widget\'ı ekleyin.'
        )
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 55 : 40} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#181824' : '#FFFFFF',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.25)',
            },
          ]}
        >
          {/* Header Icon */}
          <LinearGradient
            colors={['#D4AF37', '#996515']}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="grid" size={30} color="#FFFFFF" />
          </LinearGradient>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('widget.promptTitle', 'Ana Ekrana Widget Ekle')}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {t(
              'widget.promptDesc',
              'Sıradaki ezan vaktini ve kalan dakikayı uygulamanızı açmadan doğrudan telefonunuzun ana ekranından canlı takip edin.'
            )}
          </Text>

          {/* Preview Badge */}
          <View style={[styles.previewBox, { backgroundColor: isDark ? '#222232' : '#F4F4F8' }]}>
            <Text style={[styles.previewTitle, { color: '#D4AF37' }]}>🕌 VERA • İkindi 16:45</Text>
            <Text style={[styles.previewSub, { color: theme.colors.textSecondary }]}>⏳ 35 dk kaldı • 📍 İstanbul</Text>
          </View>

          {/* Action Buttons */}
          <Pressable onPress={handleAddWidget} style={styles.primaryBtnWrapper}>
            <LinearGradient
              colors={['#D4AF37', '#B8860B']}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="plus-circle" size={18} color="#1A1207" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>
                {t('widget.addNow', '📌 Ana Ekrana Ekle')}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onClose} style={styles.secondaryBtn}>
            <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
              {t('widget.notNow', 'Daha Sonra')}
            </Text>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -42,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#181824',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  previewBox: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  previewTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
  previewSub: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    marginTop: 2,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#1A1207',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
});
