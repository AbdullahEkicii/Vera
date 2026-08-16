export interface DuaItem {
  id: string;
  category: string;
  title_tr: string;
  title_en: string;
  occasion_tr: string;
  occasion_en: string;
  arabic: string;
  transliteration: string;
  tr: string;
  en: string;
}

export const DUAS: DuaItem[] = [
  {
    id: 'shifa_hastalik',
    category: 'shifa',
    title_tr: 'Şifa ve Hastalıktan Kurtulma Duası',
    title_en: 'Supplication for Healing & Recovery',
    occasion_tr: 'Maddi ve manevi her türlü hastalık ve rahatsızlık anında okunur.',
    occasion_en: 'Recited for physical and spiritual healing during illness.',
    arabic: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ اشْفِ أَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمًا',
    transliteration: "Allahumma Rabban-nasi adhhibil-ba'sa, ishfi antash-Shafi, la shifa'a illa shifa'uka, shifa'an la yughadiru saqama.",
    tr: "Ey insanların Rabbi olan Allah'ım! Bu ızdırabı gider, şifa ver. Sen şifa verensin; Senin şifandan başka şifa yoktur. Öyle bir şifa ver ki hiçbir hastalık bırakmasın.",
    en: "O Allah, Lord of mankind, remove the affliction and grant recovery, for You are the Healer. There is no healing except Your healing—a healing that leaves no illness."
  },
  {
    id: 'nazar_korunma',
    category: 'protection',
    title_tr: 'Nazar ve Kötülüklerden Korunma (Ayet-el Kürsi)',
    title_en: 'Protection from Evil Eye & Harm (Ayat al-Kursi)',
    occasion_tr: 'Göz değmesi, nazar, vesvese ve her türlü kötülükten korunmak için sabah-akşam okunur.',
    occasion_en: 'Recited morning and evening for divine protection against the evil eye and harm.',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm, lahu ma fis-samawati wa ma fil-ard.",
    tr: "Allah, O'ndan başka ilah olmayandır; Hayy'dır (diridir), Kayyûm'dur (bütün varlığı yönetendir). O'nu ne bir uyuklama tutar ne de bir uyku. Göklerde ve yerde olan her şey O'nundur.",
    en: "Allah—there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth."
  },
  {
    id: 'rizik_bereket',
    category: 'sustenance',
    title_tr: 'Rızık, Bereket ve Borçtan Kurtulma Duası',
    title_en: 'Supplication for Sustenance, Provision & Debt Relief',
    occasion_tr: 'Geçim darlığı, borç yükü ve işlerin bereketlenmesi için okunur.',
    occasion_en: 'Recited for financial abundance, barakah in provision, and relief from debt.',
    arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
    transliteration: "Allahummak-fini bi-halalika 'an haramika, wa aghnini bi-fadlika 'amman siwaka.",
    tr: "Allah'ım! Bana helâlinden vererek haramdan koru. Lütfunla beni Senden başkasına muhtaç etme.",
    en: "O Allah, suffice me with what You have made lawful against what You have made unlawful, and enrich me by Your grace above all others."
  },
  {
    id: 'ferahlik_sikinti',
    category: 'distress',
    title_tr: 'Sıkıntı, Keder ve Darlık Duası (Hz. Yunus Duası)',
    title_en: 'Supplication in Times of Distress (Prophet Yunus)',
    occasion_tr: 'Gönül darlığı, çaresizlik, korku ve zor anlarda feraha kavuşmak için okunur.',
    occasion_en: 'Recited during times of severe hardship, anxiety, helplessness, and grief.',
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: "La ilaha illa Anta subhanaka inni kuntu minaz-zalimin.",
    tr: "Senden başka ilah yoktur. Seni her türlü noksanlıktan tenzih ederim. Gerçekten ben kendi nefsine zulmedenlerden oldum.",
    en: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers."
  },
  {
    id: 'sinav_zihin',
    category: 'knowledge',
    title_tr: 'Sınav, Zihin Açıklığı ve Kolaylık Duası',
    title_en: 'Supplication for Knowledge, Exams & Mental Clarity',
    occasion_tr: 'Sınava girerken, ilim öğrenirken ve zor bir işe başlarken zihin açıklığı için okunur.',
    occasion_en: 'Recited before exams, studying, or embarking on difficult intellectual tasks.',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي',
    transliteration: "Rabbish-rah li sadri wa yassir li amri, wahlul 'uqdatam-mil-lisani yafqahu qawli.",
    tr: "Rabbim! Göğsüme genişlik ver, işimi bana kolaylaştır ve dilimdeki düğümü çöz ki sözümü iyi anlasınlar.",
    en: "My Lord, expand for me my chest with assurance, ease for me my task, and untie the knot from my tongue so that they may understand my speech."
  },
  {
    id: 'seyyidul_istigfar',
    category: 'forgiveness',
    title_tr: 'Seyyidül İstiğfar (Tevbe Duası)',
    title_en: 'Sayyid al-Istighfar (Chief of Prayers for Forgiveness)',
    occasion_tr: 'Günahların affı ve bağışlanma için sabah ve akşam okunur. Cennet vesilesidir.',
    occasion_en: 'Recited morning and evening for sincere repentance and forgiveness of sins.',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    transliteration: "Allahumma Anta Rabbi la ilaha illa Ant, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu.",
    tr: "Allah'ım! Sen benim Rabbimsin. Senden başka ilah yoktur. Beni Sen yarattın, ben Senin kulunum. Gücüm yettiğince Sana verdiğim söz ve ahid üzerindeyim.",
    en: "O Allah, You are my Lord; there is no deity except You. You created me, and I am Your servant, and I uphold Your covenant and promise as much as I am able."
  },
  {
    id: 'anne_baba',
    category: 'family',
    title_tr: 'Anne, Baba ve Aileye Dua',
    title_en: 'Supplication for Parents & Family',
    occasion_tr: 'Anne ve babanın sağlığı, affı ve ahirette rahmete ermesi için her namaz sonrası okunur.',
    occasion_en: 'Recited for the forgiveness, health, and mercy of parents and family.',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: "Rabbir-hamhuma kama rabbayani saghira.",
    tr: "Rabbim! Onlar beni küçükken nasıl özenle yetiştirdilerse, Sen de onlara öyle merhamet eyle.",
    en: "My Lord, have mercy upon them as they brought me up when I was small."
  },
  {
    id: 'ezan_sonrasi',
    category: 'prayer',
    title_tr: 'Ezan Sonrası Okunacak Dua',
    title_en: 'Supplication After Hearing the Adhan',
    occasion_tr: 'Ezan bittikten hemen sonra okunur; Peygamberimizin şefaatine vesile olur.',
    occasion_en: 'Recited immediately after the Adhan to gain the intercession of the Prophet.',
    arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
    transliteration: "Allahumma Rabba hadhihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah, wab'ath-hu maqamam-mahmudanil-ladhi wa'adtah.",
    tr: "Ey bu eksiksiz davetin ve kılınacak namazın Rabbi olan Allah'ım! Hz. Muhammed'e vesileyi ve fazileti ver. O'nu vaad ettiğin Makam-ı Mahmud'a ulaştır.",
    en: "O Allah, Lord of this perfect call and established prayer, grant Muhammad the station of Wasilah and distinction, and raise him to the praised status You have promised him."
  },
  {
    id: 'iftar_oruc',
    category: 'fasting',
    title_tr: 'İftar ve Oruç Açma Duası',
    title_en: 'Supplication Upon Breaking the Fast (Iftar)',
    occasion_tr: 'Akşam ezanı okunup oruç açılırken okunur.',
    occasion_en: 'Recited at the moment of breaking the fast at sunset.',
    arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    transliteration: "Allahumma laka sumtu, wa bika amantu, wa 'alayka tawakkaltu, wa 'ala rizqika aftartu.",
    tr: "Allah'ım! Senin rızan için oruç tuttum, Sana inandım, Sana güvendim ve Senin rızkınla iftar ettim.",
    en: "O Allah, for You I have fasted, in You I have believed, upon You I have relied, and with Your provision I have broken my fast."
  },
  {
    id: 'morning_1',
    category: 'morning_evening',
    title_tr: 'Sabah ve Akşam Korunma Duası',
    title_en: 'Morning & Evening Divine Shield Supplication',
    occasion_tr: 'Sabah ve akşam üçer defa okuyan kişiye hiçbir şey zarar veremez.',
    occasion_en: 'Recited 3 times morning and evening for complete protection from all harm.',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahilladhi la yadurru ma'as-mihi shai'un fil-ardi wa la fis-sama'i, wa Huwas-Sami'ul-'Alim.",
    tr: "İsmiyle yerde ve gökte hiçbir şeyin zarar veremeyeceği Allah'ın adıyla. O, hakkıyla işitendir, hakkıyla bilendir.",
    en: "In the Name of Allah with Whose Name there is protection against every kind of harm in the earth or in the heaven, and He is the All-Hearing and All-Knowing."
  },
  {
    id: 'leaving_home',
    category: 'daily',
    title_tr: 'Evden Çıkarken Okunacak Dua',
    title_en: 'Supplication When Leaving the Home',
    occasion_tr: 'Evden dışarı çıkarken kazalardan, belalardan ve kötülüklerden korunmak için okunur.',
    occasion_en: 'Recited upon stepping out of the house for divine safety and guidance.',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: "Bismillahi tawakkaltu 'alallahi, la hawla wa la quwwata illa billah.",
    tr: "Allah'ın adıyla. Allah'a tevekkül ettim. Güç ve kuvvet ancak Allah'tandır.",
    en: "In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah."
  },
  {
    id: 'entering_home',
    category: 'daily',
    title_tr: 'Eve Girerken Okunacak Dua',
    title_en: 'Supplication When Entering the Home',
    occasion_tr: 'Eve girerken haneye bereket ve huzur girmesi için okunur.',
    occasion_en: 'Recited upon entering home for peace, blessing and protection.',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna.",
    tr: "Allah'ın adıyla girdik, Allah'ın adıyla çıktık ve sadece Rabbimize tevekkül ettik.",
    en: "In the Name of Allah we enter, in the Name of Allah we leave, and upon our Lord we depend."
  },
  {
    id: 'waking_up',
    category: 'daily',
    title_tr: 'Uyanınca Okunacak Şükür Duası',
    title_en: 'Supplication Upon Waking Up',
    occasion_tr: 'Uykudan uyanıldığında yeni bir güne sağlıkla erişmenin şükrü olarak okunur.',
    occasion_en: 'Recited upon waking in gratitude for the renewal of life and strength.',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilaihin-nushur.",
    tr: "Bizi öldürdükten (uyuttuktan) sonra dirilten Allah'a hamdolsun. Dönüş ancak O'nadır.",
    en: "All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection."
  },
  {
    id: 'sleeping',
    category: 'daily',
    title_tr: 'Uyumadan Önce Okunacak Dua',
    title_en: 'Supplication Before Sleeping',
    occasion_tr: 'Yatağa yatarken huzurlu bir uyku ve korunma niyetiyle okunur.',
    occasion_en: 'Recited when going to sleep for tranquility and divine safekeeping.',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: "Bismika Allahumma amutu wa ahya.",
    tr: "Senin adınla Allah'ım, ölür ve dirilirim (uyur ve uyanırım).",
    en: "In Your name, O Allah, I die and I live."
  },
  {
    id: 'sukr_hamd',
    category: 'gratitude',
    title_tr: 'Şükür ve Nimet Duası',
    title_en: 'Supplication of Gratitude & Blessings',
    occasion_tr: 'Güzel bir haber alındığında, nimetlere şükretmek ve bereketi artırmak için okunur.',
    occasion_en: 'Recited in gratitude when receiving blessings and good tidings.',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
    transliteration: "Alhamdu lillahil-ladhi bi ni'matihi tatimmus-salihat.",
    tr: "Nimetleriyle bütün güzellikleri ve hayırları tamamlayan Allah'a hamdolsun.",
    en: "All praise is due to Allah, by Whose grace and blessings good things are accomplished."
  }
];
