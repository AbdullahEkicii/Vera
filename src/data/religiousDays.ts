export interface ReligiousDay {
  id: string;
  nameTR: string;
  nameEN: string;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string;
  hijriDay: number;
  hijriMonth: number; // 1-12, for per-language month names
  hijriYear: number;
  descriptionTR?: string;
  descriptionEN?: string;
}

export const HIJRI_MONTHS_TR = [
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir',
  'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
];

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

/**
 * How a religious day maps onto the Gregorian calendar:
 * - `day`: the Hijri date itself (Ramadan's first fast, the Eids, New Year, Ashura).
 * - `night`: a kandil night, i.e. the evening before the Hijri date.
 * - `regaip`: the Thursday night before the first Friday of Rajab.
 */
export type ReligiousDayKind = 'day' | 'night' | 'regaip';

export interface ReligiousDayDef {
  id: string;
  nameTR: string;
  nameEN: string;
  hijriMonth: number; // 1-12
  hijriDay: number;
  kind: ReligiousDayKind;
  descriptionTR: string;
  descriptionEN: string;
}

// Dates are computed from the Hijri calendar each year (see fetchReligiousDays),
// never hardcoded: a fixed list goes stale within a year and drifts ~11 days per year.
export const RELIGIOUS_DAY_DEFS: ReligiousDayDef[] = [
  {
    id: 'regaip',
    nameTR: 'Regaip Kandili',
    nameEN: 'Raghaib Night',
    hijriMonth: 7,
    hijriDay: 1,
    kind: 'regaip',
    descriptionTR: 'Üç ayların başlangıcı ve rahmet gecesi.',
    descriptionEN: 'The beginning of the three holy months and a night of mercy.',
  },
  {
    id: 'mirac',
    nameTR: 'Miraç Kandili',
    nameEN: "Isra and Mi'raj",
    hijriMonth: 7,
    hijriDay: 27,
    kind: 'night',
    descriptionTR: 'Peygamber Efendimizin (s.a.v.) ilahi huzura yükselişi.',
    descriptionEN: "The Prophet's (pbuh) night journey and ascension.",
  },
  {
    id: 'berat',
    nameTR: 'Berat Kandili',
    nameEN: "Bara'at Night",
    hijriMonth: 8,
    hijriDay: 15,
    kind: 'night',
    descriptionTR: 'Günahlardan arınma ve kederlerden kurtuluş gecesi.',
    descriptionEN: 'A night of forgiveness and relief from sorrow.',
  },
  {
    id: 'ramadan',
    nameTR: 'Ramazan Başlangıcı',
    nameEN: 'First Day of Ramadan',
    hijriMonth: 9,
    hijriDay: 1,
    kind: 'day',
    descriptionTR: 'Mübarek Ramazan ayının ilk oruç günü.',
    descriptionEN: 'The first day of fasting in the blessed month of Ramadan.',
  },
  {
    id: 'kadir',
    nameTR: 'Kadir Gecesi',
    nameEN: 'Laylat al-Qadr',
    hijriMonth: 9,
    hijriDay: 27,
    kind: 'night',
    descriptionTR: 'Bin aydan daha hayırlı olan mübarek gece.',
    descriptionEN: 'The Night of Power, better than a thousand months.',
  },
  {
    id: 'eid-fitr',
    nameTR: 'Ramazan Bayramı (1. Gün)',
    nameEN: 'Eid al-Fitr (Day 1)',
    hijriMonth: 10,
    hijriDay: 1,
    kind: 'day',
    descriptionTR: 'Ramazan Bayramının ilk günü.',
    descriptionEN: 'The first day of Eid al-Fitr.',
  },
  {
    id: 'eid-adha',
    nameTR: 'Kurban Bayramı (1. Gün)',
    nameEN: 'Eid al-Adha (Day 1)',
    hijriMonth: 12,
    hijriDay: 10,
    kind: 'day',
    descriptionTR: 'Kurban Bayramının ilk günü.',
    descriptionEN: 'The first day of Eid al-Adha.',
  },
  {
    id: 'hijri-new-year',
    nameTR: 'Hicri Yılbaşı',
    nameEN: 'Islamic New Year',
    hijriMonth: 1,
    hijriDay: 1,
    kind: 'day',
    descriptionTR: 'Yeni Hicri yılın ilk günü.',
    descriptionEN: 'The first day of the new Hijri year.',
  },
  {
    id: 'ashura',
    nameTR: 'Aşure Günü',
    nameEN: 'Day of Ashura',
    hijriMonth: 1,
    hijriDay: 10,
    kind: 'day',
    descriptionTR: 'Muharrem ayının 10. günü ve Aşure günü.',
    descriptionEN: 'The 10th day of Muharram.',
  },
  {
    id: 'mevlid',
    nameTR: 'Mevlid Kandili',
    nameEN: 'Mawlid an-Nabi',
    hijriMonth: 3,
    hijriDay: 12,
    kind: 'night',
    descriptionTR: 'Peygamber Efendimizin (s.a.v.) dünyaya teşrif ettiği gece.',
    descriptionEN: "The night of the Prophet's (pbuh) birth.",
  },
];

export const getDaysRemaining = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};
