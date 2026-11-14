import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { ReligiousDay, getDaysRemaining } from '../data/religiousDays';
import { hijriMonthName, religiousDayText } from '../localization/content';
import { fetchReligiousDays } from '../services/api';
import { typography, spacing } from '../utils/theme';
import { logModalOpened } from '../services/analyticsService';

interface ReligiousDaysModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ReligiousDaysModal: React.FC<ReligiousDaysModalProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const [days, setDays] = useState<ReligiousDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    logModalOpened('ReligiousDaysModal');
    let active = true;
    setLoading(true);
    setFailed(false);
    fetchReligiousDays()
      .then((list) => active && setDays(list))
      .catch((e) => {
        if (__DEV__) console.warn('[ReligiousDays] load failed:', e?.message ?? e);
        if (active) setFailed(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [visible]);

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
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: '#D4AF37' + '20' }]}>
              <Ionicons name="moon" size={20} color="#D4AF37" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('religious.title', 'Religious Days & Nights')}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {t('religious.subtitle', 'Calendar and countdown for blessed nights and days')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* List of Religious Days */}
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : failed || days.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={[styles.dayDesc, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                {t('religious.loadError', 'Dini günler yüklenemedi. İnternet bağlantınızı kontrol edin.')}
              </Text>
            </View>
          ) : (
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {days.map((item) => {
              const daysLeft = getDaysRemaining(item.gregorianDate);
              const isUpcoming = daysLeft >= 0;
              const title = religiousDayText(item, 'name', i18n.language);
              const desc = religiousDayText(item, 'description', i18n.language);

              const dateParts = item.gregorianDate.split('-');
              const formattedGregorian = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
              const formattedHijri = `${item.hijriDay} ${hijriMonthName(item.hijriMonth, i18n.language)} ${item.hijriYear}`;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.dayRow,
                    {
                      backgroundColor: isUpcoming
                        ? (isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.05)')
                        : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                      borderColor: isUpcoming ? 'rgba(212, 175, 55, 0.3)' : theme.colors.border + '40',
                    },
                  ]}
                >
                  <View style={{ flex: 1, paddingEnd: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={[styles.dayTitle, { color: theme.colors.text }]}>{title}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Feather name="calendar" size={11} color={theme.colors.textSecondary} />
                      <Text style={[styles.dayMeta, { color: theme.colors.textSecondary }]}>{formattedGregorian}</Text>
                      <Feather name="moon" size={11} color={theme.colors.textSecondary} style={{ marginStart: 8 }} />
                      <Text style={[styles.dayMeta, { color: theme.colors.textSecondary }]}>{formattedHijri}</Text>
                    </View>
                    {desc && <Text style={[styles.dayDesc, { color: theme.colors.textSecondary }]}>{desc}</Text>}
                  </View>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isUpcoming
                          ? (daysLeft === 0 ? '#10B981' : '#D4AF37')
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: isUpcoming ? '#1A1207' : theme.colors.textSecondary }]}>
                      {daysLeft === 0
                        ? t('religious.today', 'Today')
                        : daysLeft > 0
                        ? `${daysLeft} ${t('religious.daysLeft', 'days')}`
                        : t('religious.passed', 'Passed')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          )}
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  dayMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stateBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDesc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
