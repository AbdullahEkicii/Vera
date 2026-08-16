import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import {
  KazaState,
  KazaPrayerKey,
  DEFAULT_KAZA_STATE,
  loadKazaState,
  saveKazaState,
  calculateKazaDebtByTime,
} from '../services/kazaService';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PRAYER_CONFIG: {
  key: KazaPrayerKey;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  color: string;
}[] = [
  { key: 'fajr', labelKey: 'kaza.fajr', defaultLabel: 'Sabah', icon: 'sunrise', color: '#F59E0B' },
  { key: 'dhuhr', labelKey: 'kaza.dhuhr', defaultLabel: 'Öğle', icon: 'sun', color: '#EAB308' },
  { key: 'asr', labelKey: 'kaza.asr', defaultLabel: 'İkindi', icon: 'cloud', color: '#F97316' },
  { key: 'maghrib', labelKey: 'kaza.maghrib', defaultLabel: 'Akşam', icon: 'sunset', color: '#EA580C' },
  { key: 'isha', labelKey: 'kaza.isha', defaultLabel: 'Yatsı', icon: 'moon', color: '#6366F1' },
  { key: 'witr', labelKey: 'kaza.witr', defaultLabel: 'Vitir', icon: 'star', color: '#8B5CF6' },
  { key: 'fasting', labelKey: 'kaza.fasting', defaultLabel: 'Oruç (Gün)', icon: 'heart', color: '#10B981' },
];

export function KazaTrackerModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const [state, setState] = useState<KazaState>(DEFAULT_KAZA_STATE);
  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [editItemKey, setEditItemKey] = useState<KazaPrayerKey | null>(null);
  const [editValue, setEditValue] = useState('');

  const [yearsInput, setYearsInput] = useState('');
  const [monthsInput, setMonthsInput] = useState('');

  useEffect(() => {
    if (visible) {
      loadKazaState().then(setState);
    }
  }, [visible]);

  const updateItem = useCallback(
    (key: KazaPrayerKey, delta: number) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}

      setState((prev) => {
        const item = prev[key];
        const newCompleted = Math.max(0, item.completed + delta);
        const newState = {
          ...prev,
          [key]: {
            ...item,
            completed: newCompleted,
          },
        };
        saveKazaState(newState);

        // Check if finished debt
        if (delta > 0 && item.debt > 0 && newCompleted >= item.debt) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}
        }
        return newState;
      });
    },
    []
  );

  const handleAddDailyPackage = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    setState((prev) => {
      const newState: KazaState = {
        ...prev,
        fajr: { ...prev.fajr, completed: prev.fajr.completed + 1 },
        dhuhr: { ...prev.dhuhr, completed: prev.dhuhr.completed + 1 },
        asr: { ...prev.asr, completed: prev.asr.completed + 1 },
        maghrib: { ...prev.maghrib, completed: prev.maghrib.completed + 1 },
        isha: { ...prev.isha, completed: prev.isha.completed + 1 },
        witr: { ...prev.witr, completed: prev.witr.completed + 1 },
      };
      saveKazaState(newState);
      return newState;
    });

    Alert.alert(
      t('kaza.dailyAddedTitle', '1 Günlük Kaza Eklendi!'),
      t('kaza.dailyAddedDesc', 'Sabah, Öğle, İkindi, Akşam, Yatsı ve Vitir kazalarınız 1 artırıldı. Allah kabul etsin.')
    );
  };

  const handleApplyCalculation = () => {
    const y = parseInt(yearsInput, 10) || 0;
    const m = parseInt(monthsInput, 10) || 0;

    if (y === 0 && m === 0) {
      Alert.alert(t('common.error'), t('kaza.invalidTime', 'Lütfen geçerli bir yıl veya ay giriniz.'));
      return;
    }

    const { prayers, fasting } = calculateKazaDebtByTime(y, m);

    setState((prev) => {
      const newState: KazaState = {
        ...prev,
        fajr: { ...prev.fajr, debt: prayers },
        dhuhr: { ...prev.dhuhr, debt: prayers },
        asr: { ...prev.asr, debt: prayers },
        maghrib: { ...prev.maghrib, debt: prayers },
        isha: { ...prev.isha, debt: prayers },
        witr: { ...prev.witr, debt: prayers },
        fasting: { ...prev.fasting, debt: fasting },
      };
      saveKazaState(newState);
      return newState;
    });

    setCalcModalVisible(false);
    setYearsInput('');
    setMonthsInput('');

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  const handleSaveDirectDebt = () => {
    if (!editItemKey) return;
    const num = parseInt(editValue, 10);
    if (isNaN(num) || num < 0) {
      Alert.alert(t('common.error'), t('kaza.invalidNumber', 'Geçerli bir sayı giriniz.'));
      return;
    }

    setState((prev) => {
      const newState = {
        ...prev,
        [editItemKey]: {
          ...prev[editItemKey],
          debt: num,
        },
      };
      saveKazaState(newState);
      return newState;
    });

    setEditItemKey(null);
    setEditValue('');
  };

  // Calculate totals
  const totalDebt =
    state.fajr.debt +
    state.dhuhr.debt +
    state.asr.debt +
    state.maghrib.debt +
    state.isha.debt +
    state.witr.debt;

  const totalCompleted =
    state.fajr.completed +
    state.dhuhr.completed +
    state.asr.completed +
    state.maghrib.completed +
    state.isha.completed +
    state.witr.completed;

  const totalRemaining = Math.max(0, totalDebt - totalCompleted);
  const progressPercent = totalDebt > 0 ? Math.min(100, Math.round((totalCompleted / totalDebt) * 100)) : 0;

  if (!visible) return null;

  const cardBg = isDark ? '#1E160C' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#FDF8ED' : '#1A1A24';
  const textSecondary = isDark ? 'rgba(253, 248, 237, 0.65)' : 'rgba(26,26,36,0.6)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleRow}>
              <LinearGradient colors={['#D4AF37', '#996515']} style={styles.headerIconBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                  {t('kaza.title', 'Kaza Namazı & Oruç Takipçisi')}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
                  {t('kaza.subtitle', 'Geçmiş namaz ve oruç borçlarınızı düzenli takip edin')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Top Summary Banner */}
            <LinearGradient
              colors={isDark ? ['#2A1F13', '#1A1207'] : ['#FDF8ED', '#F5E6CC']}
              style={[styles.summaryCard, { borderColor: cardBorder }]}
            >
              <View style={styles.summaryStatsRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statNumber, { color: '#D4AF37' }]}>{totalRemaining}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('kaza.remainingPrayers', 'Kalan Vakit')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: cardBorder }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>{totalCompleted}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('kaza.completedPrayers', 'Kılınan')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: cardBorder }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNumber, { color: textPrimary }]}>%{progressPercent}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('kaza.progress', 'Tamamlanan')}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <LinearGradient
                  colors={['#10B981', '#D4AF37']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${Math.max(4, progressPercent)}%` }]}
                />
              </View>
            </LinearGradient>

            {/* Quick Action Buttons */}
            <View style={styles.quickActionsRow}>
              <Pressable
                style={[styles.quickActionBtn, { borderColor: cardBorder, backgroundColor: isDark ? '#2A1F13' : '#F7F2E8' }]}
                onPress={handleAddDailyPackage}
              >
                <Feather name="plus-circle" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
                <Text style={[styles.quickActionText, { color: textPrimary }]}>
                  {t('kaza.addDailyBtn', '+1 Günlük Kaza')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionBtn, { borderColor: cardBorder, backgroundColor: isDark ? '#2A1F13' : '#F7F2E8' }]}
                onPress={() => setCalcModalVisible(true)}
              >
                <Ionicons name="calculator-outline" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
                <Text style={[styles.quickActionText, { color: textPrimary }]}>
                  {t('kaza.calcBtn', 'Borç Hesapla')}
                </Text>
              </Pressable>
            </View>

            {/* Prayer Items List */}
            <View style={styles.prayerList}>
              {PRAYER_CONFIG.map((p) => {
                const item = state[p.key];
                const remaining = Math.max(0, item.debt - item.completed);

                return (
                  <View
                    key={p.key}
                    style={[styles.prayerRow, { backgroundColor: isDark ? '#251B10' : '#FAFAF7', borderColor: cardBorder }]}
                  >
                    {/* Left: Icon & Name */}
                    <View style={styles.prayerInfoCol}>
                      <View style={[styles.prayerIconWrap, { backgroundColor: p.color + '18' }]}>
                        <Feather name={p.icon as any} size={16} color={p.color} />
                      </View>
                      <View>
                        <Text style={[styles.prayerName, { color: textPrimary }]}>
                          {t(p.labelKey, p.defaultLabel)}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setEditItemKey(p.key);
                            setEditValue(item.debt.toString());
                          }}
                        >
                          <Text style={[styles.prayerMeta, { color: textSecondary }]}>
                            {t('kaza.debtOf', 'Borç')}: <Text style={{ color: '#D4AF37', textDecorationLine: 'underline' }}>{item.debt}</Text>
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Center: Remaining Counter Badge */}
                    <View style={styles.remainingBadge}>
                      <Text style={[styles.remainingText, { color: remaining === 0 && item.debt > 0 ? '#10B981' : textPrimary }]}>
                        {remaining}
                      </Text>
                      <Text style={[styles.remainingSub, { color: textSecondary }]}>
                        {t('kaza.left', 'kaldı')}
                      </Text>
                    </View>

                    {/* Right: +1, -1, +5 Buttons */}
                    <View style={styles.controlsRow}>
                      <Pressable
                        style={[styles.controlBtn, { borderColor: cardBorder }]}
                        onPress={() => updateItem(p.key, -1)}
                      >
                        <Text style={[styles.controlBtnText, { color: textSecondary }]}>-1</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.controlBtnPrimary, { backgroundColor: '#D4AF37' }]}
                        onPress={() => updateItem(p.key, 1)}
                      >
                        <Text style={styles.controlBtnPrimaryText}>+1</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.controlBtn, { borderColor: cardBorder }]}
                        onPress={() => updateItem(p.key, 5)}
                      >
                        <Text style={[styles.controlBtnText, { color: '#D4AF37' }]}>+5</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Calculation Helper Modal */}
        {calcModalVisible && (
          <Modal transparent animationType="fade" visible={calcModalVisible}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                  {t('kaza.calculatorTitle', 'Kaza Borcu Hesaplayıcı')}
                </Text>
                <Text style={[styles.dialogDesc, { color: textSecondary }]}>
                  {t('kaza.calculatorDesc', 'Buluğ çağından bu yana kılmadığınız tahmini süreyi giriniz:')}
                </Text>

                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>{t('kaza.years', 'Yıl')}</Text>
                    <TextInput
                      style={[styles.dialogInput, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? '#2A1F13' : '#F5F5F0' }]}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={textSecondary}
                      value={yearsInput}
                      onChangeText={setYearsInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>{t('kaza.months', 'Ay')}</Text>
                    <TextInput
                      style={[styles.dialogInput, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? '#2A1F13' : '#F5F5F0' }]}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={textSecondary}
                      value={monthsInput}
                      onChangeText={setMonthsInput}
                    />
                  </View>
                </View>

                <View style={styles.dialogActions}>
                  <Pressable
                    style={[styles.dialogCancelBtn, { borderColor: cardBorder }]}
                    onPress={() => setCalcModalVisible(false)}
                  >
                    <Text style={[styles.dialogCancelText, { color: textSecondary }]}>{t('common.cancel', 'Vazgeç')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dialogConfirmBtn, { backgroundColor: '#D4AF37' }]}
                    onPress={handleApplyCalculation}
                  >
                    <Text style={styles.dialogConfirmText}>{t('kaza.applyCalc', 'Borcu Güncelle')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Direct Debt Edit Modal */}
        {editItemKey && (
          <Modal transparent animationType="fade" visible={!!editItemKey}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                  {t('kaza.editDebtTitle', 'Borç Sayısını Belirle')}
                </Text>
                <TextInput
                  style={[styles.dialogInput, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? '#2A1F13' : '#F5F5F0', marginVertical: 14 }]}
                  keyboardType="number-pad"
                  value={editValue}
                  onChangeText={setEditValue}
                  autoFocus
                />
                <View style={styles.dialogActions}>
                  <Pressable
                    style={[styles.dialogCancelBtn, { borderColor: cardBorder }]}
                    onPress={() => setEditItemKey(null)}
                  >
                    <Text style={[styles.dialogCancelText, { color: textSecondary }]}>{t('common.cancel', 'Vazgeç')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dialogConfirmBtn, { backgroundColor: '#D4AF37' }]}
                    onPress={handleSaveDirectDebt}
                  >
                    <Text style={styles.dialogConfirmText}>{t('common.save', 'Kaydet')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
  },
  sheetSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
  },
  prayerList: {
    gap: 10,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  prayerInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prayerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prayerName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  prayerMeta: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  remainingBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  remainingText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
  },
  remainingSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
  },
  controlBtnPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnPrimaryText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#1A1207',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  dialogTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  dialogDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    marginBottom: 4,
  },
  dialogInput: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#1A1207',
  },
});
