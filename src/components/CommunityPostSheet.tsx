import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type IconName = React.ComponentProps<typeof Feather>['name'];

/** Bottom sheet opened from a post's "..." button: report or block its author. */
export function CommunityPostSheet({
  visible,
  onClose,
  onReport,
  onBlock,
}: {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  const actions: { key: string; icon: IconName; label: string; color: string; onPress: () => void }[] = [
    {
      key: 'report',
      icon: 'flag',
      label: t('community.report.action', 'Bildir'),
      color: c.text,
      onPress: onReport,
    },
    {
      key: 'block',
      icon: 'user-x',
      label: t('community.block.action', 'Bu kişiyi engelle'),
      color: c.danger,
      onPress: onBlock,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.sheet, { borderColor: c.border, backgroundColor: c.surfaceStrong }]}>
          <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[styles.title, { color: c.text }]}>{t('community.more.title', 'Bu gönderi için')}</Text>

          <View style={styles.list}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: c.border, backgroundColor: c.surface },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
                  <Feather name={action.icon} size={17} color={action.color === c.text ? c.primaryText : action.color} />
                </View>
                <Text style={[styles.rowText, { color: action.color }]}>{action.label}</Text>
                <Feather name="chevron-right" size={18} color={c.textSecondary} />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={[styles.cancel, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={[styles.cancelText, { color: c.text }]}>{t('common.cancel', 'Vazgeç')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 14,
    overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  title: { fontSize: 17, fontFamily: 'Outfit_700Bold' },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  cancel: {
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
