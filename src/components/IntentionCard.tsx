import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { INTENTION_MAX_LENGTH, isIntentionCurrent, sanitizeIntention } from '../utils/intention';
import { isReminderOn, loadIntention, saveIntention, setWeeklyReminder } from '../services/intentionService';
import type { SavedIntention } from '../utils/intention';

/** This week's niyet: one line, kept on this device, with an optional Monday reminder. */
export function IntentionCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [saved, setSaved] = useState<SavedIntention | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [reminderError, setReminderError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadIntention(), isReminderOn()]).then(([intention, on]) => {
      if (!active) return;
      setSaved(intention);
      setDraft(intention?.text ?? '');
      setReminder(on);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const current = isIntentionCurrent(saved, new Date());

  const onSave = async () => {
    const text = sanitizeIntention(draft);
    if (!text) return;
    setSaved(await saveIntention(text));
    setEditing(false);
  };

  const onToggleReminder = async (value: boolean) => {
    setReminderError(false);
    const ok = await setWeeklyReminder(value);
    if (!ok) {
      setReminderError(true);
      return;
    }
    setReminder(value);
  };

  if (!loaded) return null;

  const showEditor = editing || !current;

  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
          <Feather name="feather" size={16} color={c.primaryText} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{t('intention.title', 'Bu haftaki niyetin')}</Text>
      </View>

      {showEditor ? (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            maxLength={INTENTION_MAX_LENGTH}
            placeholder={t('intention.placeholder', 'Örn: Her gün bir sayfa Kur’an okumak')}
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceStrong }]}
            accessibilityLabel={t('intention.title', 'Bu haftaki niyetin')}
          />
          <View style={styles.row}>
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {t('intention.localOnly', 'Yalnızca bu cihazda saklanır.')}
            </Text>
            <Pressable onPress={onSave} accessibilityRole="button" disabled={!sanitizeIntention(draft)}>
              <Text style={[styles.action, { color: sanitizeIntention(draft) ? c.primaryText : c.textSecondary }]}>
                {t('intention.save', 'Kaydet')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: c.text }]}>{saved?.text}</Text>
          <Pressable onPress={() => { setDraft(saved?.text ?? ''); setEditing(true); }} accessibilityRole="button">
            <Text style={[styles.action, { color: c.primaryText }]}>{t('intention.edit', 'Düzenle')}</Text>
          </Pressable>
        </>
      )}

      <View style={styles.row}>
        <Text style={[styles.hint, { color: c.textSecondary, flex: 1 }]}>
          {t('intention.reminder', 'Her pazartesi sabah 09:00’da hatırlat')}
        </Text>
        <Switch value={reminder} onValueChange={onToggleReminder} />
      </View>
      {reminderError ? (
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          {t('intention.reminderDenied', 'Bildirim izni kapalı. Hatırlatma için cihaz ayarlarından izin ver.')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15.5, fontFamily: 'Outfit_700Bold' },
  text: { fontSize: 15, lineHeight: 22, fontFamily: 'Outfit_500Medium' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, fontFamily: 'Outfit_400Regular' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hint: { fontSize: 12.5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  action: { fontSize: 13.5, fontFamily: 'Outfit_600SemiBold' },
});
