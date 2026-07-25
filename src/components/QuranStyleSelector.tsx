import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { useQuranSettings, ScriptType } from '../context/QuranSettingsContext';
import { clearAllJuzData } from '../services/quranRepository';

interface Props {
  visible: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
}

const getScriptOptions = (t: any): { id: ScriptType; title: string; desc: string; sample: string }[] => [
  {
    id: 'quran-imlaei',
    title: t('quran.imlaeiTitle'),
    desc: t('quran.imlaeiDesc'),
    sample: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ',
  },
  {
    id: 'quran-uthmani',
    title: t('quran.uthmaniTitle'),
    desc: t('quran.uthmaniDesc'),
    sample: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
  },
  {
    id: 'quran-indopak',
    title: t('quran.indopakTitle'),
    desc: t('quran.indopakDesc'),
    sample: 'بِسۡمِ اللّٰهِ الرَّحۡمٰنِ الرَّحِيۡمِ',
  },
];

export const QuranStyleSelector: React.FC<Props> = ({ visible, onClose, isInitialSetup = false }) => {
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

    // Eğer farklı bir hat seçildiyse, eski verilerin silineceğini bildir.
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
    
    // Clear old data if changing
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
        <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('quran.styleTitle')}
            </Text>
            {!isInitialSetup && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            )}
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('quran.styleSubtitle')}
          </Text>

          <View style={styles.optionsList}>
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
                    <Text style={[styles.sampleText, { color: theme.colors.text }]}>
                      {opt.sample}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('quran.saveAndContinue')}</Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
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
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
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
