import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, DeviceEventEmitter, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../utils/theme';

const VERSION_URL = 'https://raw.githubusercontent.com/AbdullahEkicii/Vera/main/Vera_version_control.json';
const DISMISSED_KEY = 'VERA_DISMISSED_UPDATE_VERSION';

export interface VersionData {
  latestVersion: string;
  minVersion: string;
  androidUrl: string;
  iosUrl: string;
  releaseNotes?: Record<string, string> | string;
}

const cleanVersion = (v?: string): string => {
  if (!v) return '0.0.0';
  return v.replace(/[^0-9.]/g, '');
};

export const compareVersions = (v1: string, v2: string): number => {
  const p1 = cleanVersion(v1).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = cleanVersion(v2).split('.').map(n => parseInt(n, 10) || 0);
  const maxLength = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLength; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n2 > n1) return -1;
  }
  return 0;
};

export function VersionChecker() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [updateData, setUpdateData] = useState<VersionData | null>(null);

  const checkVersion = async (isManual = false) => {
    try {
      const url = `${VERSION_URL}?t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) {
        if (isManual) {
          Alert.alert(
            t('common.error', 'Hata'),
            t('update.checkFailed', 'Güncelleme bilgisi alınamadı.')
          );
        }
        return;
      }

      const data: VersionData = await response.json();
      const currentVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

      const isLatestNewer = compareVersions(data.latestVersion, currentVersion) > 0;
      const isMinNewer = compareVersions(data.minVersion, currentVersion) > 0;

      if (isMinNewer) {
        setIsForceUpdate(true);
        setUpdateData(data);
        setIsVisible(true);
      } else if (isLatestNewer) {
        const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
        if (isManual || dismissed !== data.latestVersion) {
          setIsForceUpdate(false);
          setUpdateData(data);
          setIsVisible(true);
        }
      } else if (isManual) {
        Alert.alert(
          t('update.upToDateTitle', 'Uygulamanız Güncel'),
          t('update.upToDateMessage', `En son sürümü (v${currentVersion}) kullanıyorsunuz.`, { version: currentVersion })
        );
      }
    } catch (error) {
      console.log('Version check failed:', error);
      if (isManual) {
        Alert.alert(
          t('common.error', 'Hata'),
          t('update.checkFailed', 'Güncelleme kontrolü yapılırken bir hata oluştu.')
        );
      }
    }
  };

  useEffect(() => {
    checkVersion(false);

    const subscription = DeviceEventEmitter.addListener('CHECK_FOR_UPDATE', (evt) => {
      checkVersion(evt?.manual ?? true);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isVisible || !updateData) return null;

  const handleUpdate = () => {
    const url = Platform.OS === 'ios' ? updateData.iosUrl : updateData.androidUrl;
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const handleLater = async () => {
    if (!isForceUpdate && updateData) {
      await AsyncStorage.setItem(DISMISSED_KEY, updateData.latestVersion);
      setIsVisible(false);
    }
  };

  const modalBg = isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';

  const getReleaseNotesText = (): string | null => {
    if (!updateData?.releaseNotes) return null;
    if (typeof updateData.releaseNotes === 'string') return updateData.releaseNotes;
    if (typeof updateData.releaseNotes === 'object') {
      const currentLang = (i18n.language || 'tr').split('-')[0];
      return (
        updateData.releaseNotes[currentLang] ||
        updateData.releaseNotes['tr'] ||
        updateData.releaseNotes['en'] ||
        Object.values(updateData.releaseNotes)[0] ||
        null
      );
    }
    return null;
  };

  const notes = getReleaseNotesText();

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: modalBg }]}>
          <View style={[styles.iconContainer, { backgroundColor: isForceUpdate ? 'rgba(255, 59, 48, 0.1)' : theme.colors.primary + '20' }]}>
            <Feather
              name={isForceUpdate ? "alert-triangle" : "download-cloud"}
              size={48}
              color={isForceUpdate ? "#FF3B30" : theme.colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            {isForceUpdate ? t('update.forceTitle', 'Zorunlu Güncelleme') : t('update.title', 'Yeni Güncelleme Mevcut!')}
          </Text>

          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {isForceUpdate
              ? t('update.forceMessage', 'Uygulamamızı kullanmaya devam edebilmek için lütfen son sürüme güncelleyin.')
              : t('update.message', 'Uygulamamızın yeni versiyonu yayınlandı. Daha iyi bir deneyim için lütfen güncelleyin.')}
          </Text>

          {notes && (
            <View style={styles.notesContainer}>
              <Text style={[styles.notesTitle, { color: theme.colors.text }]}>
                {t('update.releaseNotes', 'Sürüm Notları:')}
              </Text>
              <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
                {notes}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {!isForceUpdate && (
              <Pressable
                style={[styles.btn, { backgroundColor: 'rgba(150,150,150,0.1)', flex: 1, marginRight: 8 }]}
                onPress={handleLater}
              >
                <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>
                  {t('update.laterBtn', 'Daha Sonra')}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.btn, { backgroundColor: isForceUpdate ? '#FF3B30' : theme.colors.primary, flex: 2, marginLeft: isForceUpdate ? 0 : 8 }]}
              onPress={handleUpdate}
            >
              <Text style={[styles.btnText, { color: '#FFF' }]}>
                {t('update.updateBtn', 'Şimdi Güncelle')}
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(150,150,150,0.05)',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  notesTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
});
