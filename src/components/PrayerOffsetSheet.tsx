import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getPrayerOffsets, PrayerOffsets, savePrayerOffsets } from '../services/api';
import { logOffsetChanged } from '../services/analyticsService';
import { formatTime } from '../utils/format';
import { typography } from '../utils/theme';

const MAX_OFFSET = 15;

interface Props {
  /** Prayer being adjusted, or null when closed. */
  prayerKey: keyof PrayerOffsets | null;
  prayerName: string;
  /** Currently displayed time for that prayer (saved offset already applied), "HH:mm". */
  time: string;
  onClose: () => void;
}

const shiftTime = (hhmm: string, minutes: number): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const formatOffset = (value: number) => (value > 0 ? `+${value}` : String(value));

/**
 * Quick ± minute correction for one prayer, opened by long-pressing its card on the
 * home screen. Uses the same stored offsets as Settings, then broadcasts
 * PRAYER_OFFSETS_CHANGED so the home screen reloads times and reschedules alarms.
 */
export function PrayerOffsetSheet({ prayerKey, prayerName, time, onClose }: Props) {
  const { t } = useTranslation();
  const { theme, timeFormat } = useTheme();
  const [saved, setSaved] = useState<PrayerOffsets | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!prayerKey) return;
    getPrayerOffsets().then((off) => {
      setSaved(off);
      setValue(off[prayerKey] || 0);
    });
  }, [prayerKey]);

  if (!prayerKey) return null;

  const savedValue = saved?.[prayerKey] || 0;
  const preview = shiftTime(time, value - savedValue);

  const step = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setValue((v) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, v + delta)));
  };

  const handleSave = async () => {
    if (saved && value !== savedValue) {
      await savePrayerOffsets({ ...saved, [prayerKey]: value });
      logOffsetChanged(prayerKey, value);
      DeviceEventEmitter.emit('PRAYER_OFFSETS_CHANGED');
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('offsetSheet.title', '{{prayer}} vaktini düzelt', { prayer: prayerName })}
          </Text>
          <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
            {t('offsetSheet.desc', 'Camiye veya takviminize göre fark varsa dakika ekleyin ya da çıkarın. Ezan bildirimi de buna göre çalar.')}
          </Text>

          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepBtn, { borderColor: theme.colors.border }]}
              onPress={() => step(-1)}
              disabled={value <= -MAX_OFFSET}
              accessibilityRole="button"
              accessibilityLabel={t('offsetSheet.minus', '1 dakika geri')}
            >
              <Feather name="minus" size={22} color={theme.colors.text} />
            </Pressable>

            <View style={styles.valueBox}>
              <Text style={[styles.previewTime, { color: theme.colors.text }]}>{formatTime(preview, timeFormat)}</Text>
              <Text style={[styles.offsetText, { color: value === 0 ? theme.colors.textSecondary : theme.colors.primary }]}>
                {t('offsetSheet.minutes', '{{value}} dk', { value: formatOffset(value) })}
              </Text>
            </View>

            <Pressable
              style={[styles.stepBtn, { borderColor: theme.colors.border }]}
              onPress={() => step(1)}
              disabled={value >= MAX_OFFSET}
              accessibilityRole="button"
              accessibilityLabel={t('offsetSheet.plus', '1 dakika ileri')}
            >
              <Feather name="plus" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={() => setValue(0)} disabled={value === 0} style={styles.textBtn} accessibilityRole="button">
              <Text style={[styles.textBtnText, { color: value === 0 ? theme.colors.border : theme.colors.textSecondary }]}>
                {t('offsetSheet.reset', 'Sıfırla')}
              </Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} accessibilityRole="button">
              <Text style={styles.saveBtnText}>{t('offsetSheet.save', 'Kaydet')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  desc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: {
    alignItems: 'center',
    gap: 2,
  },
  previewTime: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
  },
  offsetText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBtn: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  textBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 11,
    paddingHorizontal: 26,
    borderRadius: 12,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
