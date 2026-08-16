import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';

interface UnifiedCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  hijriDate?: { day: string; month: { en: string; ar: string }; year: string };
  gregorianDate?: { date: string };
}

export const UnifiedCalendarModal: React.FC<UnifiedCalendarModalProps> = ({
  visible,
  onClose,
  hijriDate,
  gregorianDate,
}) => {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const weekDays = React.useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      // 2021-11-01 was a Monday
      const d = new Date(2021, 10, i);
      days.push(d.toLocaleDateString(i18n.language, { weekday: 'short' }));
    }
    return days;
  }, [i18n.language]);

  if (!visible) return null;

  const now = new Date();
  const monthName = now.toLocaleString(i18n.language, { month: 'long' });
  const yearNum = now.getFullYear();
  const todayNum = now.getDate();
  const currentHijriDay = hijriDate ? parseInt(hijriDate.day, 10) : null;

  // 1. Ayın ilk gününün haftanın hangi gününe denk geldiğini bul (0 = Pazar, 1 = Pazartesi)
  const firstDayOfMonth = new Date(yearNum, now.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  // Haftayı Pazartesi'den başlatmak için offset hesapla (Pazartesi = 0, Salı = 1 ... Pazar = 6)
  const offset = startDay === 0 ? 6 : startDay - 1; 

  const daysInMonth = new Date(yearNum, now.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const gridCells = [...Array(offset).fill(null), ...daysArray];

  const getHijriDay = (dayNum: number) => {
    if (!currentHijriDay) return ((dayNum + 12) % 30) + 1;
    let hDay = currentHijriDay + (dayNum - todayNum);
    if (hDay <= 0) hDay += 30; // Approx previous month
    if (hDay > 30) hDay -= 30; // Approx next month
    return hDay;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 60 : 50} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#181824' : '#FFFFFF',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0, 0, 0, 0.1)',
              maxWidth: width > 400 ? 400 : width - 32,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: '#D4AF37' + '22' }]}>
              <Feather name="calendar" size={20} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('calendar.title', 'Unified Calendar')}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {monthName} {yearNum}  •  {hijriDate ? `${hijriDate.month.en} ${hijriDate.year}` : 'Hicri'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: isDark ? '#2A2A38' : '#F0F0F0' }]}>
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Today Banner */}
          <View
            style={[
              styles.todayBanner,
              {
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.18)' : 'rgba(212, 175, 55, 0.12)',
                borderColor: '#D4AF37',
              },
            ]}
          >
            <Feather name="sun" size={16} color="#D4AF37" />
            <Text style={[styles.todayBannerText, { color: isDark ? '#FDF8ED' : '#221A0F' }]}>
              {t('calendar.todayNotice', 'Today: {{gregorian}} • Hijri: {{hijri}}', {
                gregorian: `${todayNum} ${monthName} ${yearNum}`,
                hijri: hijriDate ? `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year}` : '',
              })}
            </Text>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekHeader}>
            {weekDays.map((dayName, idx) => (
              <Text key={idx} style={[styles.weekDayText, { color: theme.colors.textSecondary }]}>
                {dayName}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {gridCells.map((dayNum, index) => {
              if (dayNum === null) {
                return <View key={`empty-${index}`} style={styles.emptyCell} />;
              }

              const isToday = dayNum === todayNum;
              const isFriday = index % 7 === 4; // Cuma günü (0=Pzt, 4=Cum)
              
              return (
                <View
                  key={`day-${dayNum}`}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isToday
                        ? '#D4AF37'
                        : (isDark ? '#242434' : '#F4F4F6'),
                      borderColor: isToday ? '#D4AF37' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    },
                  ]}
                >
                  <Text style={[
                    styles.gregorianNum, 
                    { color: isToday ? '#1A1207' : (isFriday && !isDark ? theme.colors.primary : theme.colors.text) }
                  ]}>
                    {dayNum}
                  </Text>
                  <Text style={[styles.hijriSub, { color: isToday ? '#1A1207' : '#D4AF37' }]}>
                    {getHijriDay(dayNum)}
                  </Text>
                </View>
              );
            })}
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
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
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
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  todayBannerText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekDayText: {
    width: '13%',
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyCell: {
    width: '13%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gregorianNum: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  hijriSub: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 10,
    marginTop: 1,
  },
  footerHint: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerHintText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
  },
});
