import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { AppStorage } from '../services/storageService';
import { DAY_MS, markTourShown, shouldShowTour } from '../services/tourService';

// Feature tips shown one at a time, in order. A tip is shown once; dismissing it (or
// tapping its action) records it so it never comes back.
export const COACH_TIP_IDS = ['ummah', 'qibla', 'silentMode'] as const;
export type CoachTipId = (typeof COACH_TIP_IDS)[number];

const SEEN_KEY = 'COACH_TIPS_SEEN_V1';
const SHOW_DELAY_MS = 4000;
// Pacing across all tips: one tip at most every three days.
const COACH_TOUR_KEY = 'COACH_TIP_TOUR_V1';
const COACH_EVERY_MS = 3 * DAY_MS;

const ICONS: Record<CoachTipId, React.ComponentProps<typeof Feather>['name']> = {
  ummah: 'users',
  qibla: 'compass',
  silentMode: 'bell-off',
};

const readSeen = async (): Promise<CoachTipId[]> => {
  try {
    const raw = await AppStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as CoachTipId[]) : [];
  } catch {
    return [];
  }
};

const writeSeen = async (seen: CoachTipId[]) => {
  try {
    await AppStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage is best-effort: the worst case is a tip shown once more.
  }
};

/** The first tip the user has not seen yet, or null when all are seen. */
export async function nextUnseenCoachTip(): Promise<CoachTipId | null> {
  const seen = await readSeen();
  return COACH_TIP_IDS.find((id) => !seen.includes(id)) ?? null;
}

export function CoachTip({ bottom, enabled }: { bottom: number; enabled: boolean }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const [tip, setTip] = useState<CoachTipId | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      nextUnseenCoachTip().then(async (id) => {
        if (cancelled || !id) return;
        // Tips are paced: at most one every few days, and each shows only once (seen list above).
        const due = await shouldShowTour(COACH_TOUR_KEY, Date.now(), { every: COACH_EVERY_MS, max: COACH_TIP_IDS.length });
        if (cancelled || !due) return;
        await markTourShown(COACH_TOUR_KEY, Date.now());
        if (!cancelled) setTip(id);
      });
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  if (!tip) return null;

  const dismiss = async () => {
    const seen = await readSeen();
    await writeSeen([...seen.filter((id) => id !== tip), tip]);
    setTip(null);
  };

  const title = t(`coach.${tip}.title`, { defaultValue: DEFAULTS[tip].title });
  const body = t(`coach.${tip}.body`, { defaultValue: DEFAULTS[tip].body });

  return (
    <Animated.View
      entering={FadeInUp.duration(320)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.wrap, { bottom }]}
      pointerEvents="box-none"
    >
      {/* Solid surface: the tip sits over live content and must not let it show through. */}
      <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surfaceStrong }]}>
        <View style={[styles.icon, { backgroundColor: c.primaryLight }]}>
          <Feather name={ICONS[tip]} size={16} color={c.primaryText} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text>
        </View>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={t('coach.dismiss', { defaultValue: 'Tamam' })}
          style={[styles.button, { backgroundColor: c.primary }]}
          hitSlop={8}
        >
          <Text style={styles.buttonText}>{t('coach.dismiss', { defaultValue: 'Tamam' })}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// English fallbacks; other locales can be added under `coach.*` in src/localization/*.json.
const DEFAULTS: Record<CoachTipId, { title: string; body: string }> = {
  ummah: {
    title: 'Ummah',
    body: 'Share a completed worship with the community, or see what others shared today.',
  },
  qibla: {
    title: 'Qibla compass',
    body: 'Hold your phone flat and turn until the arrow points to the Kaaba.',
  },
  silentMode: {
    title: 'Silent mode',
    body: 'When your phone is silent or on vibrate, the adhan is announced quietly. You can change this in Settings.',
  },
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9997,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: 'Outfit_700Bold' },
  body: { fontSize: 12, lineHeight: 16, fontFamily: 'Outfit_400Regular' },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
});
