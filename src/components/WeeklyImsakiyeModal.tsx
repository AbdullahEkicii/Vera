import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { DayData } from '../services/api';
import { typography, spacing } from '../utils/theme';

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
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  // Take next 7 days from dataset
  const todayStr = new Date().toISOString().split('T')[0];
  const next7Days = (data || []).slice(0, 7);

  const cleanTime = (tStr?: string) => (tStr ? tStr.split(' ')[0] : '--:--');

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
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                📍 {cityName} • {t('imsakiye.subtitle', 'Next 7 days timings')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
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
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
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
                    {formattedDate} {isToday ? '★' : ''}
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
    fontSize: 11,
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
    fontSize: 11,
    textAlign: 'center',
  },
});
