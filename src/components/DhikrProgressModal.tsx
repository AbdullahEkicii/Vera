import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../utils/theme';

export interface DhikrMonthData {
  total: number;
  dhikr_counts: Record<string, number>;
  milestones_reached: Record<string, boolean>;
}

export type DhikrHistory = Record<string, DhikrMonthData>;

interface Props {
  visible: boolean;
  onClose: () => void;
  history: DhikrHistory;
  dhikrList: { id: string; text: string }[];
}

export function DhikrProgressModal({ visible, onClose, history, dhikrList }: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const modalBg = isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';

  // Get sorted list of available months in history (e.g., ["2026-07", "2026-06"])
  const availableMonths = useMemo(() => {
    return Object.keys(history).sort((a, b) => (a < b ? 1 : -1));
  }, [history]);

  // If no history, just show current month
  const todayDate = new Date();
  const currentMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths.length > 0 ? availableMonths[0] : currentMonthKey
  );

  const monthData = history[selectedMonth];

  const formatMonthName = (monthKey: string) => {
    try {
      const [y, m] = monthKey.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return monthKey;
    }
  };

  const getDhikrName = (id: string) => {
    const item = dhikrList.find((d) => d.id === id);
    return item ? item.text : t('tasbih.defaultInfinite', 'Serbest Zikir');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: modalBg }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('tasbih.progressTitle', 'Aylık Zikir İlerlemesi')}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
              {availableMonths.length > 0 ? (
                availableMonths.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedMonth(m)}
                    style={[
                      styles.monthChip,
                      { backgroundColor: selectedMonth === m ? theme.colors.primary : 'rgba(150,150,150,0.1)' }
                    ]}
                  >
                    <Text style={[styles.monthText, { color: selectedMonth === m ? '#fff' : theme.colors.text }]}>
                      {formatMonthName(m)}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={[styles.monthChip, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.monthText, { color: '#fff' }]}>{formatMonthName(currentMonthKey)}</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.content}>
            {monthData ? (
              <>
                <View style={[styles.totalCard, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
                    {t('tasbih.totalThisMonth', 'Bu Ayki Toplam:')}
                  </Text>
                  <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                    {monthData.total}
                  </Text>
                </View>

                <View style={styles.breakdownList}>
                  {Object.entries(monthData.dhikr_counts)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .map(([id, count]) => (
                      <View key={id} style={[styles.breakdownItem, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.dhikrName, { color: theme.colors.text }]}>
                          {getDhikrName(id)}
                        </Text>
                        <Text style={[styles.dhikrCount, { color: theme.colors.text }]}>
                          {count}
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {t('tasbih.noData', 'Bu ay için henüz kayıt yok.')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    height: '75%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  monthSelector: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  monthScroll: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  monthText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  content: {
    padding: spacing.lg,
  },
  totalCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    marginBottom: 4,
  },
  totalValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 48,
  },
  breakdownList: {
    gap: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  dhikrName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
    flex: 1,
  },
  dhikrCount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 16,
  },
});
