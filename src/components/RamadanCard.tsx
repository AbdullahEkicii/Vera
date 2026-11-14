import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { fetchRamadanCalendar } from '../services/api';
import { parseDdMmYyyy, pickDailyIndex, ramadanPhase, RamadanPhase } from '../utils/ramadan';

// Number of rotating items in each list. The keys live in the locale files (ramadan.card.*).
export const RAMADAN_PREP_COUNT = 4;
export const RAMADAN_DAILY_COUNT = 8;

interface Props {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onOpenCalendar: () => void;
  onOpenCommunity: () => void;
}

/**
 * Countdown to Ramazan, then a short daily item during the month. The start date comes from the same
 * Hijri calendar the Ramadan imsakiye uses, never from a hardcoded date. Renders nothing when the date
 * cannot be read, so a failed request never leaves an empty card.
 */
export function RamadanCard({ latitude, longitude, onOpenCalendar, onOpenCommunity }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [phase, setPhase] = useState<RamadanPhase | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    let active = true;
    fetchRamadanCalendar(latitude, longitude)
      .then(({ days }) => {
        if (!active) return;
        const start = parseDdMmYyyy(days[0]?.date?.gregorian?.date);
        if (!start) return;
        setStartDate(start);
        setPhase(ramadanPhase(new Date(), start, days.length || 30));
      })
      .catch(() => {
        if (active) setPhase(null);
      });
    return () => {
      active = false;
    };
  }, [latitude, longitude]);

  const today = useMemo(() => new Date(), []);
  const startLabel = useMemo(
    () => (startDate ? startDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : ''),
    [startDate, i18n.language],
  );

  if (!phase || phase.kind === 'after') return null;

  const isBefore = phase.kind === 'before';
  // The lists are arrays in the locale files, so read them whole and pick by index. A dotted key such
  // as "prep.1" would not resolve and would print the raw key.
  const list = (key: string): string[] => {
    const value = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  };
  const noteList = list(isBefore ? 'ramadan.card.prep' : 'ramadan.card.daily');
  const noteIndex = pickDailyIndex(today, isBefore ? RAMADAN_PREP_COUNT : RAMADAN_DAILY_COUNT);
  const noteText = noteList.length > 0 ? noteList[noteIndex % noteList.length] : '';

  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
          <Feather name="moon" size={16} color={c.primaryText} />
        </View>
        <View style={styles.headerText}>
          {isBefore ? (
            <>
              <Text style={[styles.title, { color: c.text }]}>
                {t('ramadan.card.beforeTitle', { n: phase.daysLeft, defaultValue: 'Ramazan’a {{n}} gün kaldı' })}
              </Text>
              {startLabel ? (
                <Text style={[styles.sub, { color: c.textSecondary }]}>
                  {t('ramadan.card.beforeSub', { date: startLabel, defaultValue: 'Tahmini başlangıç: {{date}}' })}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: c.text }]}>
                {t('ramadan.card.duringTitle', { day: phase.day, defaultValue: 'Ramazan {{day}}. gün' })}
              </Text>
              <View style={[styles.track, { backgroundColor: c.surfaceStrong }]}>
                <View style={[styles.fill, { backgroundColor: c.primaryText, width: `${(phase.day / phase.total) * 100}%` }]} />
              </View>
            </>
          )}
        </View>
      </View>

      {noteText ? (
        <View style={[styles.note, { backgroundColor: c.surfaceStrong }]}>
          <Text style={[styles.noteText, { color: c.text }]}>{noteText}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onOpenCalendar}
          accessibilityRole="button"
          style={[styles.action, { borderColor: c.border }]}
        >
          <Feather name="calendar" size={14} color={c.primaryText} />
          <Text style={[styles.actionText, { color: c.primaryText }]}>
            {t('ramadan.card.calendar', 'İmsakiye')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenCommunity}
          accessibilityRole="button"
          style={[styles.action, { borderColor: c.border }]}
        >
          <Feather name="users" size={14} color={c.primaryText} />
          <Text style={[styles.actionText, { color: c.primaryText }]}>
            {t('ramadan.card.community', 'Ortak hatim')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, gap: 12, marginVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 6 },
  title: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  sub: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  note: { borderRadius: 14, padding: 12 },
  noteText: { fontSize: 13.5, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
  },
  actionText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
});
