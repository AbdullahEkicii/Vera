import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';
import {
  HatimState,
  DEFAULT_HATIM_STATE,
  loadHatimState,
  updateHatimPage,
  resetHatim,
} from '../services/hatimService';
import { logHatimProgress } from '../services/analyticsService';

interface Props {
  onOpenPrayers: () => void;
  onContinueReading?: (page: number, juz: number) => void;
}

export function HatimTrackerCard({ onOpenPrayers, onContinueReading }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const [hatimState, setHatimState] = useState<HatimState>(DEFAULT_HATIM_STATE);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [inputPage, setInputPage] = useState('');

  const fetchHatim = async () => {
    const data = await loadHatimState();
    setHatimState(data);
  };

  useEffect(() => {
    fetchHatim();
  }, []);

  const percentage = Math.min(100, Math.round((hatimState.currentPage / 604) * 100));
  const pagesRemaining = Math.max(0, 604 - hatimState.currentPage);

  const handlePageChange = async (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    const updated = await updateHatimPage(hatimState.currentPage + delta);
    setHatimState(updated);
    logHatimProgress(updated.currentPage, updated.currentJuz, Math.round((updated.currentPage / 604) * 100));
  };

  const handleSaveInputPage = async () => {
    const pageNum = parseInt(inputPage, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      Alert.alert(t('common.error', 'Hata'), t('hatim.invalidPage', 'Lütfen 1 ile 604 arasında bir sayfa numarası girin.'));
      return;
    }
    const updated = await updateHatimPage(pageNum);
    setHatimState(updated);
    setEditModalVisible(false);
    setInputPage('');
    logHatimProgress(updated.currentPage, updated.currentJuz, Math.round((updated.currentPage / 604) * 100));
  };

  const handleResetHatim = () => {
    Alert.alert(
      t('hatim.resetTitle', 'Yeni Hatim Başlat'),
      t('hatim.resetBody', 'Mevcut hatim tamamlandı olarak kaydedilecek ve 1. sayfadan yeni bir hatim başlayacaktır. Onaylıyor musunuz?'),
      [
        { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
        {
          text: t('hatim.startNew', 'Yeni Hatim Başlat'),
          style: 'destructive',
          onPress: async () => {
            const updated = await resetHatim();
            setHatimState(updated);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    if (onContinueReading) {
      onContinueReading(hatimState.currentPage, hatimState.currentJuz);
    } else {
      router.push({
        pathname: '/quran-reading',
        params: {
          juz: hatimState.currentJuz,
          page: hatimState.currentPage,
          surahName: `${hatimState.currentJuz}. Cüz`,
        },
      });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C150C' : '#FFFFFF', borderColor: theme.colors.border }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <LinearGradient colors={['#D4AF37', '#996515']} style={styles.iconBadge}>
            <Ionicons name="ribbon" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {t('hatim.title', 'Kuran Hatim Takibi')}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {hatimState.hatimNumber}. {t('hatim.hatimLabel', 'Hatim')} • {hatimState.currentJuz}. {t('quran.juz', 'Cüz')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onOpenPrayers}
          style={[styles.prayersBtn, { borderColor: 'rgba(212,175,55,0.35)', backgroundColor: 'rgba(212,175,55,0.12)' }]}
          hitSlop={6}
        >
          <Text style={styles.prayersBtnIcon}>🤲</Text>
          <Text style={styles.prayersBtnText} numberOfLines={1} ellipsizeMode="tail">
            {t('quran.prayersBtn', 'Dualar')}
          </Text>
        </Pressable>
      </View>

      {/* Progress Bar & Stats */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {t('hatim.page', 'Sayfa')} <Text style={{ color: theme.colors.primary, fontFamily: typography.fontFamily.bold }}>{hatimState.currentPage}</Text> / 604
          </Text>
          <Text style={[styles.statPercent, { color: theme.colors.primary }]}>
            %{percentage}
          </Text>
        </View>

        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={['#D4AF37', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>

        <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
          {pagesRemaining > 0
            ? t('hatim.pagesRemaining', 'Hatmin tamamlanmasına {{count}} sayfa kaldı.', { count: pagesRemaining })
            : t('hatim.completed', 'Tebrikler! Hatmi tamamladınız. 🎉')}
        </Text>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <Pressable onPress={handleContinue} style={styles.continueBtnWrapper}>
          <LinearGradient
            colors={['#D4AF37', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            <Feather name="book-open" size={15} color="#1A1207" style={{ marginRight: 6 }} />
            <Text style={styles.continueBtnText}>
              {t('hatim.readPageBtn', 'Sayfa {{page}}\'yi Oku', { page: hatimState.currentPage })}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Steppers & Edit */}
        <View style={styles.stepperGroup}>
          <Pressable
            onPress={() => handlePageChange(-1)}
            disabled={hatimState.currentPage <= 1}
            style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="minus" size={16} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              setInputPage(String(hatimState.currentPage));
              setEditModalVisible(true);
            }}
            style={[styles.editPageBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="edit-3" size={14} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => handlePageChange(1)}
            disabled={hatimState.currentPage >= 604}
            style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="plus" size={16} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Edit Page Modal */}
      {editModalVisible && (
        <Modal visible={editModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#1C150C' : '#FFFFFF', borderColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('hatim.jumpPageTitle', 'Sayfaya Git / İlerleme Güncelle')}
              </Text>
              <Text style={[styles.modalDesc, { color: theme.colors.textSecondary }]}>
                {t('hatim.jumpPageDesc', 'Kaldığınız sayfa numarasını girin (1 - 604):')}
              </Text>

              <TextInput
                style={[styles.pageInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                keyboardType="numeric"
                value={inputPage}
                onChangeText={setInputPage}
                placeholder="1 - 604"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />

              <View style={styles.modalButtonsRow}>
                <Pressable onPress={() => setEditModalVisible(false)} style={[styles.modalActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.modalActionBtnText, { color: theme.colors.text }]}>{t('common.cancel', 'Vazgeç')}</Text>
                </Pressable>

                <Pressable onPress={handleSaveInputPage} style={[styles.modalActionBtn, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.modalActionBtnText, { color: '#1A1207' }]}>{t('common.save', 'Kaydet')}</Text>
                </Pressable>
              </View>

              <Pressable onPress={handleResetHatim} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 12, color: '#EF4444' }}>
                  🔄 {t('hatim.resetHatimBtn', 'Yeni Hatim Sıfırla & Başlat')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14.5,
  },
  cardSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  prayersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 115,
    gap: 3,
  },
  prayersBtnIcon: {
    fontSize: 12,
  },
  prayersBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11.5,
    color: '#D4AF37',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  statPercent: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  continueBtnWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  continueBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13.5,
    color: '#1A1207',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPageBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  pageInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
});
