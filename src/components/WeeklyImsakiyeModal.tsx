import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { logModalOpened } from '../services/analyticsService';
import { DayData } from '../services/api';
import { spacing, typography } from '../utils/theme';
import { BannerAdSlot } from './BannerAdSlot';

interface WeeklyImsakiyeModalProps {
  visible: boolean;
  onClose: () => void;
  data: DayData[];
  cityName: string;
}

export const WeeklyImsakiyeModal: React.FC<WeeklyImsakiyeModalProps> = ({
  visible,
  onClose,
  data,
  cityName,
}) => {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  // 7 days (the weekly view) or the next 30 days (a month at a glance).
  const [range, setRange] = React.useState<7 | 30>(7);

  React.useEffect(() => {
    if (visible) {
      logModalOpened('WeeklyImsakiyeModal');
    }
  }, [visible]);

  if (!visible) return null;

  // The dataset is a whole calendar month starting on the 1st, so find today first;
  // slicing from index 0 showed the first week of the month instead of the next 7 days.
  const now = new Date();
  const todayKey = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const allDays = data || [];
  const todayIdx = allDays.findIndex((d) => d.date?.gregorian?.date === todayKey);
  const next7Days = allDays.slice(Math.max(todayIdx, 0), Math.max(todayIdx, 0) + range);

  const cleanTime = (tStr?: string) => (tStr ? tStr.split(' ')[0] : '--:--');

  const handleShare = async () => {
    const head = ['Date', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const lines = next7Days.map((d) => {
      const [dd, mm] = d.date.gregorian.date.split('-');
      const tm = d.timings;
      return [`${dd}/${mm}`, cleanTime(tm.Fajr), cleanTime(tm.Sunrise), cleanTime(tm.Dhuhr), cleanTime(tm.Asr), cleanTime(tm.Maghrib), cleanTime(tm.Isha)].join('  ');
    });
    try {
      await Share.share({ message: `${cityName}\n${head.join('  ')}\n${lines.join('\n')}\n\nVera` });
    } catch {}
  };
  const isTr = (i18n.language || '').startsWith('tr');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 40 : 25} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(22, 22, 30, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
              <Feather name="calendar" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('imsakiye.title', 'Weekly Imsakiye')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="map-pin" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary, flexShrink: 1 }]}>
                  {cityName} • {range === 7 ? t('imsakiye.subtitle', 'Next 7 days timings') : t('imsakiye.rangeDays', { defaultValue: isTr ? '{{n}} gün' : '{{n}} days', n: 30 })}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('common.close', 'Close')}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {([7, 30] as const).map((n) => {
              const active = range === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setRange(n)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ paddingVertical: 7, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 10, backgroundColor: active ? theme.colors.primary : 'transparent', borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border }}
                >
                  <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: active ? '#1A1207' : theme.colors.text }}>
                    {t('imsakiye.rangeDays', { defaultValue: isTr ? '{{n}} gün' : '{{n}} days', n })}
                  </Text>
                </Pressable>
              );
            })}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={handleShare}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.share', { defaultValue: isTr ? 'Paylaş' : 'Share' })}
              style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }}
            >
              <Feather name="share-2" size={15} color={theme.colors.primary} />
            </Pressable>
          </View>

          {/* Table Header */}
          <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
            <Text style={[styles.colHeader, { flex: 1.6, color: theme.colors.textSecondary }]}>{t('imsakiye.date', 'Date')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.fajr', 'Fajr')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.sunrise', 'Sunrise')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.dhuhr', 'Dhuhr')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.asr', 'Asr')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.maghrib', 'Maghrib')}</Text>
            <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('home.prayers.isha', 'Isha')}</Text>
          </View>

          {/* Table Rows */}
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {next7Days.map((day, idx) => {
              const dateParts = day.date.gregorian.date.split('-'); // DD-MM-YYYY
              const formattedDate = `${dateParts[0]}/${dateParts[1]}`;
              const isToday = idx === 0;

              return (
                <View
                  key={day.date.gregorian.date || idx}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: isToday
                        ? (isDark ? 'rgba(212, 175, 55, 0.18)' : 'rgba(212, 175, 55, 0.12)')
                        : (idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')),
                      borderColor: isToday ? '#D4AF37' : theme.colors.border + '40',
                    },
                  ]}
                >
                  <Text style={[styles.colCellDate, { color: isToday ? '#D4AF37' : theme.colors.text }]}>
                    {formattedDate}
                  </Text>
                  <Text style={[styles.colCell, { color: theme.colors.text }]}>{cleanTime(day.timings.Fajr)}</Text>
                  <Text style={[styles.colCell, { color: theme.colors.textSecondary }]}>{cleanTime(day.timings.Sunrise)}</Text>
                  <Text style={[styles.colCell, { color: theme.colors.text }]}>{cleanTime(day.timings.Dhuhr)}</Text>
                  <Text style={[styles.colCell, { color: theme.colors.text }]}>{cleanTime(day.timings.Asr)}</Text>
                  <Text style={[styles.colCell, { color: isToday ? '#D4AF37' : theme.colors.primary, fontFamily: typography.fontFamily.bold }]}>
                    {cleanTime(day.timings.Maghrib)}
                  </Text>
                  <Text style={[styles.colCell, { color: theme.colors.text }]}>{cleanTime(day.timings.Isha)}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Native Ad Banner */}
          <View style={{ marginTop: 8 }}>
            <BannerAdSlot placement="weekly_imsakiye" isVisible={visible} lazy={true} />
          </View>
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
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  colHeader: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  colCellDate: {
    flex: 1.6,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11.5,
  },
  colCell: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    textAlign: 'center',
  },
});
