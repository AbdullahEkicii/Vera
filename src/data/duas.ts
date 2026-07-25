export interface DuaItem {
  id: string;
  category: string;
  title_tr: string;
  title_en: string;
  arabic: string;
  transliteration: string;
  tr: string;
  en: string;
}

export const DUAS: DuaItem[] = [
  {
    id: 'morning_1',
    category: 'morning_evening',
    title_tr: 'Sabah/Akşam Duası',
    title_en: 'Morning/Evening Supplication',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahilladhi la yadurru ma'as-mihi shai'un fil-ardi wa la fis-sama'i, wa Huwas-Sami'ul-'Alim.",
    tr: "İsmiyle yerde ve gökte hiçbir şeyin zarar veremeyeceği Allah'ın adıyla. O, hakkıyla işitendir, hakkıyla bilendir.",
    en: 'In the Name of Allah with Whose Name there is protection against every kind of harm in the earth or in the heaven, and He is the All-Hearing and All-Knowing.'
  },
  {
    id: 'waking_up',
    category: 'daily',
    title_tr: 'Uyanınca Okunacak Dua',
    title_en: 'Supplication Upon Waking',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilaihin-nushur.",
    tr: "Bizi öldürdükten sonra dirilten Allah'a hamdolsun. Dönüş ancak O'nadır.",
    en: 'All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection.'
  },
  {
    id: 'sleeping',
    category: 'daily',
    title_tr: 'Uyumadan Önce',
    title_en: 'Before Sleeping',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya.',
    tr: "Senin adınla Allah'ım, ölür ve dirilirim (uyur ve uyanırım).",
    en: 'In Your name, O Allah, I die and I live.'
  },
  {
    id: 'eating',
    category: 'daily',
    title_tr: 'Yemeğe Başlarken',
    title_en: 'Before Eating',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    tr: "Allah'ın adıyla.",
    en: 'In the name of Allah.'
  },
  {
    id: 'eating_done',
    category: 'daily',
    title_tr: 'Yemekten Sonra',
    title_en: 'After Eating',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    transliteration: "Alhamdu lillahil-ladhi at'amana wa saqana wa ja'alana muslimeen.",
    tr: 'Bizi doyuran, içiren ve Müslüman kılan Allah\'a hamdolsun.',
    en: 'Praise be to Allah Who has fed us and given us drink, and made us Muslims.'
  },
  {
    id: 'leaving_home',
    category: 'daily',
    title_tr: 'Evden Çıkarken',
    title_en: 'Leaving the Home',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: "Bismillahi tawakkaltu 'alallahi, la hawla wa la quwwata illa billah.",
    tr: "Allah'ın adıyla. Allah'a tevekkül ettim. Güç ve kuvvet ancak Allah'tandır.",
    en: 'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.'
  },
  {
    id: 'entering_home',
    category: 'daily',
    title_tr: 'Eve Girerken',
    title_en: 'Entering the Home',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna.",
    tr: "Allah'ın adıyla girdik, Allah'ın adıyla çıktık ve sadece Rabbimize tevekkül ettik.",
    en: 'In the Name of Allah we enter, in the Name of Allah we leave, and upon our Lord we depend.'
  }
];
