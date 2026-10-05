import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHatimState } from './hatimService';
import { loadKazaState } from './kazaService';
import i18n from '../localization/i18n';

type ProgressUnit = 'days' | 'prayers' | 'dhikr' | 'khatm' | 'kaza';
const PROGRESS_UNIT_TR: Record<ProgressUnit, string> = { days: 'gün', prayers: 'vakit', dhikr: 'zikir', khatm: 'hatim', kaza: 'kaza' };

/** "7 / 30 gün" in the current language, with locale-formatted numbers. */
const progress = (unit: ProgressUnit, current: number, total: number): string =>
  i18n.t(`achievements.progress.${unit}`, {
    defaultValue: `{{current}} / {{total}} ${PROGRESS_UNIT_TR[unit]}`,
    current: current.toLocaleString(i18n.language),
    total: total.toLocaleString(i18n.language),
  });

// These storage keys are owned by their respective screens/components; duplicated here
// (read-only) rather than imported, since prayer-history.tsx and TasbihScreen.tsx are
// screens/components, not shared modules.
const PRAYER_LOGS_KEY = 'USER_PRAYER_LOGS_V1';
const TASBIH_STORAGE_KEY = '@tasbih_state';

export type AchievementCategory = 'prayer' | 'quran' | 'dhikr' | 'kaza';

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  icon: string; // Feather icon name
  titleTR: string;
  titleEN: string;
  descTR: string;
  descEN: string;
  points: number;
  isUnlocked: (stats: AggregatedStats) => boolean;
  progressLabel?: (stats: AggregatedStats) => string;
}

export interface AggregatedStats {
  prayerStreak: number;
  prayerTotalLogged: number;
  hatimCompleted: number;
  dhikrStreak: number;
  dhikrTotalAllTime: number;
  kazaCompletedTotal: number;
}

function computeConsecutiveDayStreak(activeDates: Set<string>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().split('T')[0];
    if (activeDates.has(dayKey)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export async function getAggregatedStats(): Promise<AggregatedStats> {
  const [prayerLogsRaw, tasbihRaw, hatimState, kazaState] = await Promise.all([
    AsyncStorage.getItem(PRAYER_LOGS_KEY),
    AsyncStorage.getItem(TASBIH_STORAGE_KEY),
    loadHatimState(),
    loadKazaState(),
  ]);

  // Prayer streak + total
  let prayerStreak = 0;
  let prayerTotalLogged = 0;
  try {
    const logs: Record<string, any> = prayerLogsRaw ? JSON.parse(prayerLogsRaw) : {};
    const activeDates = new Set<string>();
    for (const [date, log] of Object.entries(logs)) {
      const count = [log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha].filter(Boolean).length;
      prayerTotalLogged += count;
      if (count > 0) activeDates.add(date);
    }
    prayerStreak = computeConsecutiveDayStreak(activeDates);
  } catch {}

  // Dhikr streak + total
  let dhikrStreak = 0;
  let dhikrTotalAllTime = 0;
  try {
    const state = tasbihRaw ? JSON.parse(tasbihRaw) : null;
    if (state?.dailyActivity) {
      const activeDates = new Set<string>(
        Object.keys(state.dailyActivity).filter((k) => state.dailyActivity[k] > 0)
      );
      dhikrStreak = computeConsecutiveDayStreak(activeDates);
    }
    if (state?.history) {
      dhikrTotalAllTime = Object.values(state.history).reduce(
        (sum: number, m: any) => sum + (m?.total || 0),
        0
      );
    }
  } catch {}

  // Kaza completed total
  const kazaCompletedTotal =
    (kazaState.fajr?.completed || 0) +
    (kazaState.dhuhr?.completed || 0) +
    (kazaState.asr?.completed || 0) +
    (kazaState.maghrib?.completed || 0) +
    (kazaState.isha?.completed || 0) +
    (kazaState.witr?.completed || 0) +
    (kazaState.fasting?.completed || 0);

  return {
    prayerStreak,
    prayerTotalLogged,
    hatimCompleted: hatimState.completedHatims || 0,
    dhikrStreak,
    dhikrTotalAllTime,
    kazaCompletedTotal,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'prayer_streak_7',
    category: 'prayer',
    icon: 'sunrise',
    titleTR: '7 Günlük İstikrar',
    titleEN: '7-Day Consistency',
    descTR: '7 gün üst üste namaz kaydı tuttunuz',
    descEN: 'Logged prayers 7 days in a row',
    points: 50,
    isUnlocked: (s) => s.prayerStreak >= 7,
    progressLabel: (s) => progress('days', Math.min(s.prayerStreak, 7), 7),
  },
  {
    id: 'prayer_streak_30',
    category: 'prayer',
    icon: 'sun',
    titleTR: '30 Günlük İstikrar',
    titleEN: '30-Day Consistency',
    descTR: '30 gün üst üste namaz kaydı tuttunuz',
    descEN: 'Logged prayers 30 days in a row',
    points: 200,
    isUnlocked: (s) => s.prayerStreak >= 30,
    progressLabel: (s) => progress('days', Math.min(s.prayerStreak, 30), 30),
  },
  {
    id: 'prayer_total_100',
    category: 'prayer',
    icon: 'check-circle',
    titleTR: '100 Vakit',
    titleEN: '100 Prayers',
    descTR: 'Toplam 100 vakit namaz kaydettiniz',
    descEN: 'Logged 100 total prayers',
    points: 100,
    isUnlocked: (s) => s.prayerTotalLogged >= 100,
    progressLabel: (s) => progress('prayers', Math.min(s.prayerTotalLogged, 100), 100),
  },
  {
    id: 'prayer_total_500',
    category: 'prayer',
    icon: 'award',
    titleTR: '500 Vakit',
    titleEN: '500 Prayers',
    descTR: 'Toplam 500 vakit namaz kaydettiniz',
    descEN: 'Logged 500 total prayers',
    points: 400,
    isUnlocked: (s) => s.prayerTotalLogged >= 500,
    progressLabel: (s) => progress('prayers', Math.min(s.prayerTotalLogged, 500), 500),
  },
  {
    id: 'dhikr_streak_7',
    category: 'dhikr',
    icon: 'repeat',
    titleTR: '7 Günlük Zikir',
    titleEN: '7-Day Dhikr Streak',
    descTR: '7 gün üst üste zikir çektiniz',
    descEN: 'Practiced dhikr 7 days in a row',
    points: 50,
    isUnlocked: (s) => s.dhikrStreak >= 7,
    progressLabel: (s) => progress('days', Math.min(s.dhikrStreak, 7), 7),
  },
  {
    id: 'dhikr_streak_30',
    category: 'dhikr',
    icon: 'repeat',
    titleTR: '30 Günlük Zikir',
    titleEN: '30-Day Dhikr Streak',
    descTR: '30 gün üst üste zikir çektiniz',
    descEN: 'Practiced dhikr 30 days in a row',
    points: 200,
    isUnlocked: (s) => s.dhikrStreak >= 30,
    progressLabel: (s) => progress('days', Math.min(s.dhikrStreak, 30), 30),
  },
  {
    id: 'dhikr_total_1000',
    category: 'dhikr',
    icon: 'trending-up',
    titleTR: '1.000 Zikir',
    titleEN: '1,000 Dhikr',
    descTR: 'Toplamda 1.000 zikir çektiniz',
    descEN: 'Recited 1,000 total dhikr',
    points: 100,
    isUnlocked: (s) => s.dhikrTotalAllTime >= 1000,
    progressLabel: (s) => progress('dhikr', Math.min(s.dhikrTotalAllTime, 1000), 1000),
  },
  {
    id: 'dhikr_total_10000',
    category: 'dhikr',
    icon: 'zap',
    titleTR: '10.000 Zikir',
    titleEN: '10,000 Dhikr',
    descTR: 'Toplamda 10.000 zikir çektiniz',
    descEN: 'Recited 10,000 total dhikr',
    points: 400,
    isUnlocked: (s) => s.dhikrTotalAllTime >= 10000,
    progressLabel: (s) => progress('dhikr', Math.min(s.dhikrTotalAllTime, 10000), 10000),
  },
  {
    id: 'hatim_first',
    category: 'quran',
    icon: 'book-open',
    titleTR: 'İlk Hatim',
    titleEN: 'First Khatm',
    descTR: 'Kur\'an-ı Kerim\'i baştan sona okudunuz',
    descEN: 'Completed reading the entire Quran',
    points: 500,
    isUnlocked: (s) => s.hatimCompleted >= 1,
    progressLabel: (s) => progress('khatm', Math.min(s.hatimCompleted, 1), 1),
  },
  {
    id: 'hatim_3',
    category: 'quran',
    icon: 'bookmark',
    titleTR: '3 Hatim',
    titleEN: '3 Khatms',
    descTR: 'Kur\'an-ı Kerim\'i 3 kez tamamladınız',
    descEN: 'Completed the Quran 3 times',
    points: 1000,
    isUnlocked: (s) => s.hatimCompleted >= 3,
    progressLabel: (s) => progress('khatm', Math.min(s.hatimCompleted, 3), 3),
  },
  {
    id: 'kaza_10',
    category: 'kaza',
    icon: 'clock',
    titleTR: '10 Kaza Tamamlandı',
    titleEN: '10 Makeup Prayers',
    descTR: '10 kaza namazı/orucu tamamladınız',
    descEN: 'Completed 10 makeup prayers/fasts',
    points: 100,
    isUnlocked: (s) => s.kazaCompletedTotal >= 10,
    progressLabel: (s) => progress('kaza', Math.min(s.kazaCompletedTotal, 10), 10),
  },
  {
    id: 'kaza_50',
    category: 'kaza',
    icon: 'clock',
    titleTR: '50 Kaza Tamamlandı',
    titleEN: '50 Makeup Prayers',
    descTR: '50 kaza namazı/orucu tamamladınız',
    descEN: 'Completed 50 makeup prayers/fasts',
    points: 300,
    isUnlocked: (s) => s.kazaCompletedTotal >= 50,
    progressLabel: (s) => progress('kaza', Math.min(s.kazaCompletedTotal, 50), 50),
  },
];

export interface AchievementResult {
  def: AchievementDef;
  unlocked: boolean;
  progress?: string;
}

export async function getAchievementsWithStatus(): Promise<{
  results: AchievementResult[];
  totalPoints: number;
  stats: AggregatedStats;
}> {
  const stats = await getAggregatedStats();
  const results = ACHIEVEMENTS.map((def) => ({
    def,
    unlocked: def.isUnlocked(stats),
    progress: def.progressLabel?.(stats),
  }));
  const totalPoints = results.filter((r) => r.unlocked).reduce((sum, r) => sum + r.def.points, 0);
  return { results, totalPoints, stats };
}
