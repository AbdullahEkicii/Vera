import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { logModalOpened } from '../services/analyticsService';
import { fetchRamadanCalendar } from '../services/api';
import { spacing, typography } from '../utils/theme';
import { BannerAdSlot } from './BannerAdSlot';

interface RamadanCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  cityName: string;
}

interface RamadanDayRow {
  fullDate: string; // DD-MM-YYYY (gregorian, as returned by Aladhan)
  dateStr: string; // DD/MM
  dayNumber: number; // Ramadan day, from the Hijri date itself
  sahur: string; // Fajr: the same "İmsak" the home screen shows (API "Imsak" is Fajr - 10 min)
  iftar: string; // Maghrib
}

const cleanTime = (tStr?: string) => (tStr ? tStr.split(' ')[0] : '--:--');

export const RamadanCalendarModal: React.FC<RamadanCalendarModalProps> = ({
  visible,
  onClose,
  latitude,
  longitude,
  cityName,
}) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const [rows, setRows] = useState<RamadanDayRow[]>([]);
  const [hijriYear, setHijriYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }, []);

  useEffect(() => {
    if (visible) {
      logModalOpened('RamadanCalendarModal');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !latitude || !longitude) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setFailed(false);

    (async () => {
      try {
        const { hijriYear: year, days } = await fetchRamadanCalendar(latitude, longitude);
        const result: RamadanDayRow[] = days.map((d: any) => {
          const [dd, mm] = (d.date?.gregorian?.date || '').split('-');
          return {
            fullDate: d.date?.gregorian?.date,
            dateStr: `${dd}/${mm}`,
            dayNumber: Number(d.date?.hijri?.day),
            sahur: cleanTime(d.timings.Fajr),
            iftar: cleanTime(d.timings.Maghrib),
          };
        });
        if (active) {
          setRows(result);
          setHijriYear(year);
        }
      } catch {
        if (active) {
          setRows([]);
          setFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [visible, latitude, longitude]);

  const handleShare = async () => {
    if (rows.length === 0) return;
    const lines = rows.map((r) => `${r.dayNumber}. Gün (${r.dateStr}) — İmsak: ${r.sahur}  İftar: ${r.iftar}`);
    const message = `${cityName} Ramazan İmsakiyesi\n\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
    } catch {}
  };

  if (!visible) return null;

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
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: '#D4AF37' + '18' }]}>
              <Feather name="moon" size={20} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('ramadan.calendarTitle', 'Ramazan İmsakiyesi')}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {cityName}
                {hijriYear && rows.length > 0
                  ? ` • ${hijriYear} • ${rows[0].fullDate?.split('-')[2] ?? ''} • ${rows.length} ${t('ramadan.days', 'gün')}`
                  : ''}
              </Text>
            </View>
            <Pressable onPress={handleShare} hitSlop={10} style={{ marginEnd: 12 }}>
              <Feather name="share-2" size={20} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : failed || rows.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('ramadan.noData', 'Ramazan takvimi verisi bulunamadı.')}
            </Text>
          ) : (
            <>
              <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
                <Text style={[styles.colHeaderDay, { color: theme.colors.textSecondary }]}>{t('ramadan.day', 'Gün')}</Text>
                <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('ramadan.date', 'Tarih')}</Text>
                <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('ramadan.sahur', 'İmsak')}</Text>
                <Text style={[styles.colHeader, { color: theme.colors.textSecondary }]}>{t('ramadan.iftar', 'İftar')}</Text>
              </View>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {rows.map((row) => {
                  const isToday = row.fullDate === todayKey;
                  return (
                    <View
                      key={row.dayNumber}
                      style={[
                        styles.tableRow,
                        {
                          backgroundColor: isToday
                            ? (isDark ? 'rgba(212, 175, 55, 0.18)' : 'rgba(212, 175, 55, 0.12)')
                            : 'transparent',
                          borderColor: isToday ? '#D4AF37' : theme.colors.border + '40',
                        },
                      ]}
                    >
                      <Text style={[styles.colCellDay, { color: isToday ? '#D4AF37' : theme.colors.text }]}>{row.dayNumber}</Text>
                      <Text style={[styles.colCell, { color: theme.colors.text }]}>{row.dateStr}</Text>
                      <Text style={[styles.colCell, { color: theme.colors.text }]}>{row.sahur}</Text>
                      <Text style={[styles.colCell, { color: isToday ? '#D4AF37' : theme.colors.primary, fontFamily: typography.fontFamily.bold }]}>
                        {row.iftar}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={{ marginTop: 8 }}>
            <BannerAdSlot placement="ramadan_calendar" isVisible={visible} lazy={true} />
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
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  colHeaderDay: {
    width: 36,
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    textAlign: 'center',
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
  colCellDay: {
    width: 36,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11.5,
    textAlign: 'center',
  },
  colCell: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    textAlign: 'center',
  },
});
