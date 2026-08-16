export interface ReligiousDay {
  id: string;
  nameTR: string;
  nameEN: string;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string;
  descriptionTR?: string;
  descriptionEN?: string;
}

export const RELIGIOUS_DAYS: ReligiousDay[] = [
  {
    id: '1',
    nameTR: 'Regaip Kandili',
    nameEN: 'Regaip Night (Nisfu Sya\'ban / Raghaib)',
    gregorianDate: '2026-01-15',
    hijriDate: '5 Recep 1447',
    descriptionTR: 'Üç ayların başlangıcı ve rahmet gecesi.',
  },
  {
    id: '2',
    nameTR: 'Miraç Kandili',
    nameEN: 'Isra and Mi\'raj',
    gregorianDate: '2026-02-05',
    hijriDate: '27 Recep 1447',
    descriptionTR: 'Peygamber Efendimizin (s.a.v.) ilahi huzura yükselişi.',
  },
  {
    id: '3',
    nameTR: 'Berat Kandili',
    nameEN: 'Shab-e-Barat (Bara\'at Night)',
    gregorianDate: '2026-02-23',
    hijriDate: '15 Şaban 1447',
    descriptionTR: 'Günahlardan arınma ve kederlerden kurtuluş gecesi.',
  },
  {
    id: '4',
    nameTR: 'Ramazan Başlangıcı',
    nameEN: 'First Day of Ramadan',
    gregorianDate: '2026-03-01',
    hijriDate: '1 Ramazan 1447',
    descriptionTR: 'Mübarek Ramazan ayının ilk oruç günü.',
  },
  {
    id: '5',
    nameTR: 'Kadir Gecesi',
    nameEN: 'Laylat al-Qadr (Night of Power)',
    gregorianDate: '2026-03-26',
    hijriDate: '27 Ramazan 1447',
    descriptionTR: 'Bin aydan daha hayırlı olan mübarek gece.',
  },
  {
    id: '6',
    nameTR: 'Ramazan Bayramı (1. Gün)',
    nameEN: 'Eid al-Fitr (Day 1)',
    gregorianDate: '2026-03-31',
    hijriDate: '1 Şevval 1447',
    descriptionTR: 'Ramazan Bayramının ilk günü.',
  },
  {
    id: '7',
    nameTR: 'Kurban Bayramı (1. Gün)',
    nameEN: 'Eid al-Adha (Day 1)',
    gregorianDate: '2026-06-07',
    hijriDate: '10 Zilhicce 1447',
    descriptionTR: 'Hac ibadetinin eda edildiği ve kurban bayramının ilk günü.',
  },
  {
    id: '8',
    nameTR: 'Hicri Yılbaşı (1448)',
    nameEN: 'Islamic New Year (1448 AH)',
    gregorianDate: '2026-06-26',
    hijriDate: '1 Muharrem 1448',
    descriptionTR: 'Yeni Hicri yılın ilk günü.',
  },
  {
    id: '9',
    nameTR: 'Aşure Günü',
    nameEN: 'Day of Ashura',
    gregorianDate: '2026-07-05',
    hijriDate: '10 Muharrem 1448',
    descriptionTR: 'Muharrem ayının 10. günü ve Aşure günü.',
  },
  {
    id: '10',
    nameTR: 'Mevlid Kandili',
    nameEN: 'Mawlid an-Nabi (Prophet\'s Birthday)',
    gregorianDate: '2026-09-04',
    hijriDate: '12 Rebiülevvel 1448',
    descriptionTR: 'Peygamber Efendimizin (s.a.v.) dünyaya teşrif ettiği gece.',
  },
];

export const getDaysRemaining = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};
