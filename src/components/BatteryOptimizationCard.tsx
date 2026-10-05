import { Feather, Ionicons } from '@expo/vector-icons';
import notifee from '@notifee/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { AppStorage } from '../services/storageService';
import { logBatterySettingOpened, logEvent } from '../services/analyticsService';
import { typography } from '../utils/theme';

const FIRST_LAUNCH_KEY = 'FIRST_LAUNCH_AT';
const DISMISSED_KEY = 'BATTERY_CARD_DISMISSED';
// Only nag during the first two days: that is when a missed adhan makes people uninstall.
const SHOW_FOR_MS = 2 * 24 * 60 * 60 * 1000;

type Maker = 'xiaomi' | 'samsung' | 'oppo' | 'other';

const detectMaker = (manufacturer?: string | null): Maker => {
  const m = (manufacturer || '').toLowerCase();
  if (/xiaomi|redmi|poco/.test(m)) return 'xiaomi';
  if (m.includes('samsung')) return 'samsung';
  if (/oppo|realme|oneplus|vivo/.test(m)) return 'oppo';
  return 'other';
};

/**
 * Android-only home card shown during the first days after install while battery
 * optimization is still on, with maker-specific steps. Hides itself once the user
 * turns optimization off or dismisses it.
 */
export function BatteryOptimizationCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [maker, setMaker] = useState<Maker>('other');
  const [hasPowerManager, setHasPowerManager] = useState(false);

  const evaluate = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      if ((await AppStorage.getItem(DISMISSED_KEY)) === 'true') return setVisible(false);

      let firstLaunch = Number(await AppStorage.getItem(FIRST_LAUNCH_KEY));
      if (!firstLaunch) {
        firstLaunch = Date.now();
        await AppStorage.setItem(FIRST_LAUNCH_KEY, String(firstLaunch));
      }
      if (Date.now() - firstLaunch > SHOW_FOR_MS) return setVisible(false);

      const optimized = await notifee.isBatteryOptimizationEnabled();
      if (!optimized) return setVisible(false);

      const info = await notifee.getPowerManagerInfo();
      setMaker(detectMaker(info.manufacturer));
      setHasPowerManager(!!info.activity);
      setVisible(true);
    } catch (e) {
      if (__DEV__) console.warn('Battery optimization check failed:', e);
    }
  }, []);

  useEffect(() => {
    evaluate();
    // Re-check when the user comes back from the system settings screen.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  useEffect(() => {
    if (visible) logEvent('battery_card_shown', { maker });
  }, [visible, maker]);

  if (!visible) return null;

  const handleOpen = async () => {
    logBatterySettingOpened();
    try {
      // Xiaomi/Oppo also kill apps through their own "autostart" managers, which only
      // the maker's power manager screen can switch off.
      if (maker !== 'samsung' && maker !== 'other' && hasPowerManager) {
        await notifee.openPowerManagerSettings();
      } else {
        await notifee.openBatteryOptimizationSettings();
      }
    } catch (e) {
      if (__DEV__) console.warn('Opening battery settings failed:', e);
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    logEvent('battery_card_dismissed', { maker });
    await AppStorage.setItem(DISMISSED_KEY, 'true');
  };

  const steps: Record<Maker, string> = {
    xiaomi: t('battery.stepsXiaomi', 'Ayarlar → Uygulamalar → Vera: "Otomatik başlatma"yı açın ve Pil tasarrufunu "Kısıtlama yok" yapın.'),
    samsung: t('battery.stepsSamsung', 'Ayarlar → Pil → Arka plan kullanım sınırları: Vera\'yı "Asla uyutulmayan uygulamalar"a ekleyin.'),
    oppo: t('battery.stepsOppo', 'Ayarlar → Pil → Vera: "Arka planda çalışmaya izin ver" ve "Otomatik başlatma"yı açın.'),
    other: t('battery.stepsOther', 'Pil optimizasyonunu Vera için kapatın, böylece ezan vaktinde gecikmeden çalar.'),
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(12)}
      style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
          <Feather name="battery-charging" size={16} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('battery.cardTitle', 'Ezan vaktinde çalsın')}
        </Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Kapat')}
        >
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>{steps[maker]}</Text>
      <Pressable
        style={[styles.btn, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpen}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>{t('battery.openSettings', 'Ayarları Aç')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  desc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
