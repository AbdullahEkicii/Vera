import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import i18n from '../localization/i18n';
import {
  CommunityPost,
  CommunitySettings,
  deleteOwnPost,
  ensureSignedIn,
  listMyPosts,
  loadCommunitySettings,
  saveCommunitySettings,
} from '../services/communityService';
import { logCommunityPostDeleted, logCommunitySettingChanged } from '../services/analyticsService';
import { countryDisplayName, templateText } from '../utils/communityText';

interface Props {
  visible: boolean;
  onClose: () => void;
  onChanged: (settings: CommunitySettings) => void;
}

const COUNTRY_CODE = /^[A-Z]{2}$/;

/** Community settings: participation, country, own posts, and blocked authors. Opened from the feed header. */
export function CommunitySettingsModal({ visible, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const lang = (i18n.language || 'en').split('-')[0];

  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [countryInput, setCountryInput] = useState('');
  const [countryError, setCountryError] = useState(false);
  const [editingCountry, setEditingCountry] = useState(false);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const loaded = await loadCommunitySettings();
      setSettings(loaded);
      setCountryInput(loaded.countryOverride ?? '');
      setCountryError(false);
      setEditingCountry(false);
      try {
        const uid = await ensureSignedIn();
        setMyPosts(await listMyPosts(uid));
      } catch {
        setMyPosts([]);
      }
    })();
  }, [visible]);

  const update = async (next: CommunitySettings) => {
    setSettings(next);
    await saveCommunitySettings(next);
    onChanged(next);
  };

  if (!settings) return null;

  const onToggleParticipate = async (value: boolean) => {
    await update({ ...settings, participate: value });
    logCommunitySettingChanged('participation', value);
  };

  const onToggleCountry = async (value: boolean) => {
    await update({ ...settings, showCountry: value });
    logCommunitySettingChanged('visibility', value);
  };

  const onSaveCountry = async () => {
    const code = countryInput.trim().toUpperCase();
    if (!COUNTRY_CODE.test(code)) {
      setCountryError(true);
      return;
    }
    await update({ ...settings, countryOverride: code });
    logCommunitySettingChanged('country', code);
    setEditingCountry(false);
  };

  const onUseDeviceCountry = async () => {
    setCountryInput('');
    await update({ ...settings, countryOverride: null });
    logCommunitySettingChanged('country', 'device');
    setEditingCountry(false);
  };

  const onDelete = (post: CommunityPost) => {
    Alert.alert(
      t('community.settings.deleteTitle', 'Gönderi silinsin mi?'),
      t('community.settings.deleteBody', 'Bu gönderi herkes için akıştan kalkar.'),
      [
        { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
        {
          text: t('community.settings.delete', 'Sil'),
          style: 'destructive',
          onPress: async () => {
            await deleteOwnPost(post.id);
            logCommunityPostDeleted(post.templateKey);
            setMyPosts((prev) => prev.filter((p) => p.id !== post.id));
          },
        },
      ]
    );
  };

  const onClearBlocked = async () => {
    await update({ ...settings, blockedUids: [] });
  };

  const countryName = countryDisplayName(settings.countryOverride, lang);
  const deviceCountry = t('community.settings.countryDevice', 'Cihaz bölgesi kullanılıyor.');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: c.background ?? '#FFF' }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: c.text }]}>{t('community.settings.title', 'Topluluk ayarları')}</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Kapat')}
            hitSlop={12}
            style={[styles.closeButton, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <Feather name="x" size={18} color={c.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Status: the one place to join or leave the community */}
          <Card>
            <Row
              icon="users"
              label={
                settings.participate
                  ? t('community.settings.joined', 'Topluluktasın')
                  : t('community.settings.left', 'Topluluk kapalı')
              }
              hint={t('community.settings.participateHint', 'Kapatırsan yeni paylaşım önerisi gelmez. Akışı görmeye devam edersin.')}
            >
              <Switch value={settings.participate} onValueChange={onToggleParticipate} />
            </Row>
          </Card>

          <SectionTitle label={t('community.settings.sectionPrivacy', 'Gizlilik')} />
          <Card>
            <Row
              icon="globe"
              label={t('community.settings.showCountry', 'Ülkemi göster')}
              hint={t('community.settings.showCountryHint', 'Açıkken paylaşımların yanında ülke adı görünür. Kapatma yalnızca yeni paylaşımlara uygulanır.')}
            >
              <Switch value={settings.showCountry} onValueChange={onToggleCountry} />
            </Row>
          </Card>

          <SectionTitle label={t('community.settings.country', 'Ülke')} />
          <Card>
            <View style={styles.countryHead}>
              <View style={[styles.iconTile, { backgroundColor: c.primaryLight }]}>
                <Feather name="map-pin" size={16} color={c.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.label, { color: c.text }]}>
                  {settings.countryOverride ? countryName || settings.countryOverride : t('community.settings.countryDeviceTitle', 'Cihaz bölgesi')}
                </Text>
                <Text style={[styles.hint, { color: c.textSecondary }]}>
                  {settings.countryOverride
                    ? t('community.settings.countryManual', 'Seçilen ülke: {{code}}', { code: settings.countryOverride })
                    : deviceCountry}
                </Text>
              </View>
              <Pressable onPress={() => setEditingCountry((v) => !v)} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.linkText, { color: c.primary }]}>
                  {editingCountry ? t('common.close', 'Kapat') : t('community.settings.change', 'Değiştir')}
                </Text>
              </Pressable>
            </View>

            {editingCountry && (
              <View style={styles.countryEdit}>
                <TextInput
                  value={countryInput}
                  onChangeText={(v) => {
                    setCountryInput(v);
                    setCountryError(false);
                  }}
                  maxLength={2}
                  autoCapitalize="characters"
                  placeholder="TR"
                  placeholderTextColor={c.textSecondary}
                  style={[styles.input, { color: c.text, borderColor: countryError ? c.danger : c.border }]}
                />
                <Pressable onPress={onSaveCountry} style={[styles.pill, { backgroundColor: c.primary }]} accessibilityRole="button">
                  <Text style={styles.pillTextOnPrimary}>{t('common.save', 'Kaydet')}</Text>
                </Pressable>
                <Pressable onPress={onUseDeviceCountry} style={[styles.pill, { borderColor: c.border, borderWidth: 1 }]} accessibilityRole="button">
                  <Text style={[styles.pillText, { color: c.textSecondary }]}>{t('community.settings.useDevice', 'Cihazınki')}</Text>
                </Pressable>
              </View>
            )}
            {countryError && (
              <Text style={[styles.hint, { color: c.danger }]}>{t('community.settings.countryInvalid', 'İki harfli ülke kodu gir, örnek: TR')}</Text>
            )}
          </Card>

          <SectionTitle label={t('community.settings.myPosts', 'Gönderilerim')} />
          <Card>
            {myPosts.length === 0 && (
              <Text style={[styles.hint, { color: c.textSecondary }]}>{t('community.settings.noPosts', 'Henüz paylaşımın yok.')}</Text>
            )}
            {myPosts.map((post) => (
              <View key={post.id} style={styles.postRow}>
                <Text style={[styles.postText, { color: c.text }]} numberOfLines={2}>
                  {templateText(t, post.templateKey, post.params, lang)}
                </Text>
                <Pressable
                  onPress={() => onDelete(post)}
                  accessibilityRole="button"
                  accessibilityLabel={t('community.settings.delete', 'Sil')}
                  hitSlop={10}
                  style={[styles.trash, { backgroundColor: c.danger + '18' }]}
                >
                  <Feather name="trash-2" size={15} color={c.danger} />
                </Pressable>
              </View>
            ))}
          </Card>

          <SectionTitle label={t('community.settings.sectionBlocked', 'Engellenenler')} />
          <Card>
            <View style={styles.blockedRow}>
              <Text style={[styles.label, { color: c.text }]}>
                {t('community.settings.blockedCount', '{{count}} kişi', { count: settings.blockedUids.length })}
              </Text>
              {settings.blockedUids.length > 0 && (
                <Pressable onPress={onClearBlocked} accessibilityRole="button" style={[styles.pill, { borderColor: c.border, borderWidth: 1 }]}>
                  <Text style={[styles.pillText, { color: c.primary }]}>{t('community.settings.clearBlocked', 'Engelleri temizle')}</Text>
                </Pressable>
              )}
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{label}</Text>;
}

/** Grouped inset section: rows share one rounded surface and are separated by hairlines. */
function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const items = React.Children.toArray(children);
  return (
    <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && <View style={[styles.groupDivider, { backgroundColor: theme.colors.border }]} />}
          <View style={styles.groupRow}>{child}</View>
        </React.Fragment>
      ))}
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: c.primaryLight }]}>
        <Feather name={icon} size={16} color={c.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  // Large title, Apple-style.
  title: { fontSize: 34, lineHeight: 40, fontFamily: 'Outfit_700Bold' },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
  },
  // Outer radius 20; rows sit inside 14px horizontal padding.
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, overflow: 'hidden' },
  groupRow: { paddingHorizontal: 14, paddingVertical: 12 },
  groupDivider: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 3 },
  iconTile: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  linkText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  countryHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryEdit: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 76,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
  },
  pill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  pillText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  pillTextOnPrimary: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  postRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  postText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Outfit_400Regular' },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  blockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
