import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import notifee, { AndroidNotificationSetting, AuthorizationStatus } from '@notifee/react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, typography } from '../utils/theme';
import { requestNotificationPermissions, scheduleTestNotification } from '../services/notificationService';
import { logBatterySettingOpened, logEvent, setAnalyticsUserProperties } from '../services/analyticsService';
import { setCrashContext } from '../services/crashReportingService';
import { getDeliveryStats, DeliveryStats } from '../services/deliveryLog';

type Status = 'ok' | 'warn' | 'bad';

interface Health {
  permission: Status;
  exactAlarm: Status;
  battery: Status;
  oemRestricted: boolean;
  manufacturer: string;
  nextAlarm: number | null;
  delivery: DeliveryStats;
}

const OK = '#10B981';
const WARN = '#F59E0B';
const BAD = '#EF4444';

const statusColor = (s: Status) => (s === 'ok' ? OK : s === 'warn' ? WARN : BAD);
const statusIcon = (s: Status) => (s === 'ok' ? 'check-circle' : s === 'warn' ? 'alert-circle' : 'x-circle');

// Short, brand-specific steps for the setting that most often silences adhan alerts.
// Menu names vary between OS versions: kept generic on purpose.
const oemSteps = (manufacturer: string, isTr: boolean): string => {
  const m = manufacturer;
  if (/xiaomi|redmi|poco/.test(m)) return isTr ? 'Güvenlik > Uygulamalar > İzinler > Otomatik başlat: Vera\'yı açın; Pil tasarrufunda "Kısıtlama yok" seçin.' : 'Security > Apps > Permissions > Autostart: enable Vera; set battery saver to "No restrictions".';
  if (/huawei|honor/.test(m)) return isTr ? 'Uygulama başlatma > Vera > Elle yönet: üç seçeneği de açın.' : 'App launch > Vera > Manage manually: enable all three.';
  if (/oppo|realme|oneplus/.test(m)) return isTr ? 'Pil > Vera > Arka planda çalışmaya ve otomatik başlatmaya izin verin.' : 'Battery > Vera > allow background activity and auto-start.';
  if (/samsung/.test(m)) return isTr ? 'Pil > Arka plan kullanım sınırları: Vera\'yı "Uyku modundaki uygulamalar"dan çıkarın.' : 'Battery > Background usage limits: remove Vera from "Sleeping apps".';
  return isTr ? 'Pil ayarlarında Vera için arka plan çalışmasına ve otomatik başlatmaya izin verin.' : 'In battery settings, allow Vera to run in the background and auto-start.';
};

/**
 * Settings card that shows whether adhan alerts can actually reach the user:
 * permission, exact alarms, battery restriction, manufacturer power manager and the next
 * scheduled alarm, each with a one-tap fix, plus a 10s test notification.
 */
export function NotificationHealthCard() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [health, setHealth] = useState<Health | null>(null);
  const isTr = (i18n.language || '').startsWith('tr');
  const tt = (key: string, tr: string, en: string, vars?: Record<string, string | number>) =>
    t(key, { defaultValue: isTr ? tr : en, ...vars });

  const refresh = useCallback(async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      const permission: Status = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED ? 'ok' : 'bad';
      const exactAlarm: Status =
        Platform.OS !== 'android' || settings.android?.alarm === AndroidNotificationSetting.ENABLED ? 'ok' : 'bad';
      let battery: Status = 'ok';
      let oemRestricted = false;
      let manufacturer = '';
      let nextAlarm: number | null = null;
      if (Platform.OS === 'android') {
        battery = (await notifee.isBatteryOptimizationEnabled().catch(() => false)) ? 'warn' : 'ok';
        const pm = await notifee.getPowerManagerInfo().catch(() => null);
        oemRestricted = !!pm?.activity;
        manufacturer = (pm?.manufacturer || '').toLowerCase();
        const triggers = await notifee.getTriggerNotifications().catch(() => []);
        const times = triggers
          .map((x) => (x.trigger as { timestamp?: number }).timestamp ?? 0)
          .filter((ts) => ts > Date.now());
        nextAlarm = times.length ? Math.min(...times) : null;
      }
      const delivery = await getDeliveryStats(7);
      setHealth({ permission, exactAlarm, battery, oemRestricted, manufacturer, nextAlarm, delivery });
      // Lets GA4 / Crashlytics segment retention and missed-alert reports by delivery health.
      setAnalyticsUserProperties({
        notif_permission: permission === 'ok',
        exact_alarm: exactAlarm === 'ok',
        battery_restricted: battery !== 'ok',
        // Only with a real sample: a handful of alerts says nothing.
        ...(delivery.due >= 6 ? { alert_confirm_rate: Math.round((delivery.confirmed / delivery.due) * 100) } : {}),
      });
      setCrashContext('notif_health', `${permission}/${exactAlarm}/${battery}`);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Returning from a system settings screen is the moment the status changes.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (Platform.OS !== 'android' || !health) return null;

  const fix = async (kind: 'permission' | 'exact' | 'battery' | 'oem') => {
    logEvent('notif_health_fix', { kind });
    try {
      if (kind === 'permission') {
        const ok = await requestNotificationPermissions();
        if (!ok) await Linking.openSettings();
      } else if (kind === 'exact') {
        await notifee.openAlarmPermissionSettings();
      } else if (kind === 'battery') {
        logBatterySettingOpened();
        await notifee.openBatteryOptimizationSettings();
      } else {
        await notifee.openPowerManagerSettings();
      }
    } catch {
      await Linking.openSettings().catch(() => {});
    }
  };

  const rows: { key: string; status: Status; label: string; hint?: string; fix?: () => void }[] = [
    {
      key: 'permission',
      status: health.permission,
      label: tt('notifHealth.permission', 'Bildirim izni', 'Notification permission'),
      hint: health.permission === 'ok' ? undefined : tt('notifHealth.permissionHint', 'Kapalıyken ezan bildirimi gelmez', 'Adhan alerts cannot arrive while off'),
      fix: health.permission === 'ok' ? undefined : () => fix('permission'),
    },
    {
      key: 'exact',
      status: health.exactAlarm,
      label: tt('notifHealth.exactAlarm', 'Tam zamanlı alarm', 'Exact alarms'),
      hint: health.exactAlarm === 'ok' ? undefined : tt('notifHealth.exactAlarmHint', 'Kapalıyken ezan birkaç dakika gecikebilir', 'Alerts may arrive minutes late while off'),
      fix: health.exactAlarm === 'ok' ? undefined : () => fix('exact'),
    },
    {
      key: 'battery',
      status: health.battery,
      label: tt('notifHealth.battery', 'Pil kısıtlaması', 'Battery restriction'),
      hint: health.battery === 'ok' ? undefined : tt('notifHealth.batteryHint', 'Telefon uygulamayı uykuya alabilir', 'The phone may put the app to sleep'),
      fix: health.battery === 'ok' ? undefined : () => fix('battery'),
    },
  ];
  if (health.oemRestricted) {
    rows.push({
      key: 'oem',
      status: 'warn',
      label: tt('notifHealth.oem', 'Üretici güç yöneticisi', 'Manufacturer power manager'),
      hint: oemSteps(health.manufacturer, isTr),
      fix: () => fix('oem'),
    });
  }

  const { due, confirmed } = health.delivery;
  // Android does not always run JS for a delivered alert, so only a clearly low rate with a
  // real sample is shown as a warning; anything else is informational.
  if (due >= 6 && confirmed / due < 0.5) {
    rows.push({
      key: 'delivery',
      status: 'warn',
      label: tt('notifHealth.delivery', 'Teslim kaydı düşük', 'Low delivery record'),
      hint: tt('notifHealth.deliveryHint', 'Son 7 günde {{n}} ezan bildirimi doğrulanamadı; pil ayarlarını kontrol edin.', '{{n}} adhan alerts could not be confirmed in the last 7 days; check battery settings.', { n: due - confirmed }),
    });
  }

  const allOk = rows.every((r) => r.status === 'ok');
  const nextText = health.nextAlarm
    ? new Date(health.nextAlarm).toLocaleString(i18n.language || undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Feather name={allOk ? 'shield' : 'alert-triangle'} size={16} color={allOk ? OK : WARN} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {tt('notifHealth.title', 'Bildirim Sağlığı', 'Notification Health')}
        </Text>
      </View>
      <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>
        {allOk
          ? tt('notifHealth.allGood', 'Her şey yolunda, ezan bildirimleri zamanında gelmeli.', 'All good: adhan alerts should arrive on time.')
          : tt('notifHealth.needsAttention', 'Aşağıdaki ayarlar ezan bildirimini etkileyebilir.', 'The settings below can affect adhan alerts.')}
      </Text>

      {rows.map((r) => (
        <View key={r.key} style={styles.row} accessible accessibilityLabel={`${r.label}. ${r.status === 'ok' ? 'OK' : r.hint ?? ''}`}>
          <Feather name={statusIcon(r.status)} size={16} color={statusColor(r.status)} />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{r.label}</Text>
            {!!r.hint && <Text style={[styles.rowHint, { color: theme.colors.textSecondary }]}>{r.hint}</Text>}
          </View>
          {r.fix && (
            <Pressable
              onPress={r.fix}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.fixBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.fixBtnText}>{tt('notifHealth.fix', 'Düzelt', 'Fix')}</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Text style={[styles.next, { color: theme.colors.textSecondary }]}>
        {nextText
          ? `${tt('notifHealth.nextAlarm', 'Sıradaki planlı alarm', 'Next scheduled alarm')}: ${nextText}`
          : tt('notifHealth.noAlarm', 'Planlı alarm yok. Şehir seçili ve bildirimler açık mı kontrol edin.', 'No alarm scheduled. Check that a city is set and notifications are on.')}
      </Text>

      {due > 0 && (
        <Text style={[styles.next, { color: theme.colors.textSecondary, marginTop: -6 }]}>
          {tt('notifHealth.deliveryLine', 'Son 7 gün: {{c}}/{{d}} ezan bildirimi doğrulandı', 'Last 7 days: {{c}}/{{d}} adhan alerts confirmed', { c: confirmed, d: due })}
        </Text>
      )}
      <Text style={[styles.next, { color: theme.colors.textSecondary, marginTop: -6 }]}>
        {tt('notifHealth.dndNote', 'Ezan sesi alarm sesi olarak çalar. Rahatsız Etmeyin açıkken telefonunuza göre susturulabilir; test bildirimiyle deneyin.', 'The adhan plays on the alarm volume. Do Not Disturb may silence it on some phones; try the test alert.')}
      </Text>

      <Pressable
        onPress={() => {
          logEvent('notif_health_test', {});
          scheduleTestNotification('exact', t);
        }}
        accessibilityRole="button"
        style={[styles.testBtn, { borderColor: theme.colors.border }]}
      >
        <Feather name="bell" size={15} color={theme.colors.primary} />
        <Text style={[styles.testText, { color: theme.colors.text }]}>
          {tt('notifHealth.test', '10 sn sonra test bildirimi gönder', 'Send a test alert in 10 s')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: borderRadius.md, padding: 14, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontFamily: typography.fontFamily.semiBold, fontSize: 14 },
  summary: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: typography.fontFamily.medium, fontSize: 13 },
  rowHint: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, marginTop: 1 },
  fixBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.sm, minHeight: 32, justifyContent: 'center' },
  fixBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: '#1A1207' },
  next: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, marginTop: 6, marginBottom: 10 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: 10 },
  testText: { fontFamily: typography.fontFamily.medium, fontSize: 13 },
});
