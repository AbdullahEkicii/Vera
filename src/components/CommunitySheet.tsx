import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Extra control shown beside the close button, e.g. a refresh icon. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Bottom sheet for the community cards. The community screen keeps each card to one compact row so the
 * feed stays near the top; the full content opens here on demand.
 */
export function CommunitySheet({ visible, onClose, title, subtitle, headerRight, children }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('community.sheet.close', 'Kapat')}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              borderColor: c.border,
              maxHeight: height * 0.85,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.title, { color: c.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
            </View>
            {headerRight}
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('community.sheet.close', 'Kapat')}
              style={[styles.closeButton, { borderColor: c.border }]}
            >
              <Feather name="x" size={16} color={c.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 18,
    paddingHorizontal: 18,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: 10, paddingBottom: 4 },
});
