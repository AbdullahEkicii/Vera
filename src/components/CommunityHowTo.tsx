import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type IconName = React.ComponentProps<typeof Feather>['name'];

// The three steps a new user needs: finish a worship, tap share, find the post in the feed.
const STEPS: { key: 'step1' | 'step2' | 'step3'; icon: IconName }[] = [
  { key: 'step1', icon: 'check-circle' },
  { key: 'step2', icon: 'share-2' },
  { key: 'step3', icon: 'users' },
];

/** Short "how to share" sheet. Opens on the first visit and from the help button in the header. */
export function CommunityHowTo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.sheet, { borderColor: c.border, backgroundColor: c.surfaceStrong }]}>
          <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[c.primaryLight, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glow}
          />

          <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
            <Feather name="send" size={20} color={c.primaryText} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>{t('community.howTo.title')}</Text>
          <Text style={[styles.intro, { color: c.textSecondary }]}>{t('community.howTo.intro')}</Text>

          <View style={styles.steps}>
            {STEPS.map((step, i) => (
              <View key={step.key} style={[styles.step, { borderColor: c.border, backgroundColor: c.surface }]}>
                <View style={[styles.num, { backgroundColor: c.primary }]}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.stepTitle, { color: c.text }]}>{t(`community.howTo.${step.key}Title`)}</Text>
                  <Text style={[styles.stepBody, { color: c.textSecondary }]}>{t(`community.howTo.${step.key}Body`)}</Text>
                </View>
                <Feather name={step.icon} size={18} color={c.primary} />
              </View>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: c.primary }]}
          >
            <Text style={styles.buttonText}>{t('community.howTo.gotIt')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
  },
  glow: { ...StyleSheet.absoluteFillObject, height: 160 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 28, fontFamily: 'Outfit_700Bold' },
  intro: { fontSize: 14, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
  steps: { gap: 10, marginTop: 4 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Outfit_700Bold' },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  stepBody: { fontSize: 12, lineHeight: 17, fontFamily: 'Outfit_400Regular' },
  button: { marginTop: 6, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
