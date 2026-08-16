import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { useQuranSettings, ScriptType } from '../context/QuranSettingsContext';
import { clearAllJuzData } from '../services/quranRepository';

interface Props {
  visible: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
}

const getScriptOptions = (t: any): { id: ScriptType; title: string; desc: string; sample: string; fontFamily?: string }[] => [
  {
    id: 'quran-imlaei',
    title: t('quran.imlaeiTitle', 'Diyanet / İmla Hattı'),
    desc: t('quran.imlaeiDesc', 'Standart okunaklı Türkçe imla hattı.'),
    sample: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ',
    fontFamily: 'quran-imlaei',
  },
  {
    id: 'quran-uthmani',
    title: t('quran.uthmaniTitle', 'Medine / Osmanî Hat'),
    desc: t('quran.uthmaniDesc', 'Klasik Medine baskısı Osmanî hat.'),
    sample: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
    fontFamily: 'quran-uthmani',
  },
  {
    id: 'quran-indopak',
    title: t('quran.indopakTitle', 'Hint / Asya Hattı'),
    desc: t('quran.indopakDesc', 'Doğu & Asya bölgesi klasik kalın hat.'),
    sample: 'بِسۡمِ اللّٰهِ الرَّحۡمٰنِ الرَّحِيۡمِ',
    fontFamily: 'quran-indopak',
  },
  {
    id: 'quran-husrev',
    title: t('quran.husrevTitle', 'Ahmet Hüsrev Hattı (Tevafuklu)'),
    desc: t('quran.husrevDesc', 'Hayrat Neşriyat Tevafuklu Kur\'an-ı Kerim hattı.'),
    sample: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ',
    fontFamily: 'quran-husrev',
  },
];

export const QuranStyleSelector: React.FC<Props> = ({ visible, onClose, isInitialSetup = false }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { scriptType, changeScriptType, completeFirstSelection } = useQuranSettings();
  const [selected, setSelected] = useState<ScriptType>(scriptType);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (selected === scriptType && !isInitialSetup) {
      onClose();
      return;
    }

    if (!isInitialSetup && selected !== scriptType) {
      Alert.alert(
        t('quran.oldDownloadsWillBeDeleted'),
        t('quran.styleChangeWarning'),
        [
          { text: t('quran.cancel'), style: 'cancel' },
          { text: t('quran.yesChange'), style: 'destructive', onPress: performSave },
        ]
      );
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    setLoading(true);

    if (!isInitialSetup && selected !== scriptType) {
      await clearAllJuzData();
    }

    let success = false;
    if (isInitialSetup) {
      success = await completeFirstSelection(selected);
    } else {
      success = await changeScriptType(selected);
    }

    setLoading(false);
    if (success) {
      onClose();
    } else {
      Alert.alert(t('quran.error'), t('quran.downloadError'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFF',
            paddingBottom: Math.max(insets.bottom + 16, 24),
          }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('quran.styleTitle', 'Kur\'an Hat / Stil Seçimi')}
            </Text>
            {!isInitialSetup && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            )}
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('quran.styleSubtitle', 'Tercih ettiğiniz okuma stilini veya Hüsrev Hattı PDF formatını seçin.')}
          </Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {getScriptOptions(t).map((opt) => {
              const isActive = selected === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.optionCard,
                    {
                      borderColor: isActive ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isActive ? theme.colors.primary + '10' : theme.colors.surface,
                    }
                  ]}
                  onPress={() => setSelected(opt.id)}
                >
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionTitle, { color: isActive ? theme.colors.primary : theme.colors.text }]}>
                      {opt.title}
                    </Text>
                    {isActive && <Feather name="check-circle" size={20} color={theme.colors.primary} />}
                  </View>
                  <Text style={[styles.optionDesc, { color: theme.colors.textSecondary }]}>
                    {opt.desc}
                  </Text>
                  <View style={[styles.sampleBox, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]}>
                    <Text style={[
                      styles.sampleText,
                      { color: theme.colors.text },
                      opt.fontFamily ? { fontFamily: opt.fontFamily } : null,
                      opt.id === 'quran-husrev' ? { fontSize: 15, fontFamily: typography.fontFamily.semiBold, color: theme.colors.primary } : (opt.id === 'quran-indopak' ? { fontSize: 26 } : null)
                    ]}>
                      {opt.sample}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('quran.saveAndContinue', 'Kaydet ve Devam Et')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollView: {
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
    paddingBottom: 8,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  optionDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginBottom: 12,
  },
  sampleBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sampleText: {
    fontSize: 22,
  },
  saveButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  saveButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFF',
  },
});
