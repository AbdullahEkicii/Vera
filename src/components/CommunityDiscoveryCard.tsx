import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { AppStorage } from '../services/storageService';

// Set once the user opens the community or closes this card, so it never comes back.
const DISMISSED_KEY = 'COMMUNITY_DISCOVERY_DISMISSED_V1';

interface Props {
  onOpen: () => void;
}

/**
 * Home card that tells people the community exists before any share offer appears.
 * Shown once; opening the community or closing the card hides it for good.
 */
export function CommunityDiscoveryCard({ onOpen }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dismissed = await AppStorage.getItem(DISMISSED_KEY);
        setVisible(!dismissed);
      } catch {
        setVisible(false);
      }
    })();
  }, []);

  const hide = async () => {
    setVisible(false);
    try {
      await AppStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(12)}
      style={[styles.card, { backgroundColor: c.surfaceStrong ?? c.surface, borderColor: c.border }]}
    >
      <LinearGradient
        colors={[c.primaryLight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={[styles.icon, { backgroundColor: c.primary }]}>
        <Feather name="users" size={18} color="#FFFFFF" />
      </View>

      <View style={styles.text}>
        <Text style={[styles.title, { color: c.text }]}>
          {t('community.discovery.title', 'Başarılarını Vera topluluğuyla paylaş')}
        </Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          {t('community.discovery.body', 'Hatim, zikir ve namaz günlerini anonim olarak dünyadaki kardeşlerinle paylaşabilirsin.')}
        </Text>
        <Pressable
          onPress={() => {
            hide();
            onOpen();
          }}
          accessibilityRole="button"
          style={[styles.cta, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.ctaText, { color: c.primaryText ?? '#FFFFFF' }]}>
            {t('community.discovery.cta', 'Topluluğa git')}
          </Text>
          <Feather name="arrow-right" size={14} color={c.primaryText ?? '#FFFFFF'} />
        </Pressable>
      </View>

      <Pressable
        onPress={hide}
        accessibilityRole="button"
        accessibilityLabel={t('common.close', 'Kapat')}
        hitSlop={12}
        style={styles.close}
      >
        <Feather name="x" size={16} color={c.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 6 },
  title: { fontSize: 16, fontFamily: 'Outfit_700Bold', lineHeight: 21 },
  body: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  ctaText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  close: { padding: 2 },
});
