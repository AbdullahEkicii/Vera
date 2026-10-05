export interface HajjUmrahStep {
  id: string;
  appliesTo: ('umrah' | 'hajj')[];
  order: number;
  titleTR: string;
  titleEN: string;
  descTR: string;
  descEN: string;
  duaArabic?: string;
  duaTransliteration?: string;
  duaTR?: string;
  duaEN?: string;
}

export const HAJJ_UMRAH_STEPS: HajjUmrahStep[] = [
  {
    id: 'ihram',
    appliesTo: ['umrah', 'hajj'],
    order: 1,
    titleTR: 'İhrama Girmek',
    titleEN: 'Entering the State of Ihram',
    descTR: 'Mikat sınırında gusül abdesti alınır, ihram kıyafeti giyilir ve niyet edilerek telbiye getirilir. İhrama girdikten sonra dikişli elbise giyme, koku sürünme gibi yasaklar başlar.',
    descEN: 'At the miqat boundary, perform ghusl, wear the ihram garments, make the intention (niyyah) and recite the Talbiyah. Certain restrictions begin once in ihram (no stitched clothing, perfume, etc.).',
    duaArabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
    duaTransliteration: "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni'mata laka wal-mulk, la sharika lak.",
    duaTR: 'Buyur Allah\'ım buyur! Emrindeyim, buyur! Senin ortağın yoktur, buyur! Şüphesiz hamd, nimet ve mülk Sanadır. Senin ortağın yoktur.',
    duaEN: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, favor and sovereignty belong to You. You have no partner.',
  },
  {
    id: 'tawaf',
    appliesTo: ['umrah', 'hajj'],
    order: 2,
    titleTR: 'Tavaf',
    titleEN: 'Tawaf (Circling the Kaaba)',
    descTR: 'Hacer-i Esved hizasından başlayarak Kabe\'nin etrafında saat yönünün tersine 7 kez dönülür. Her turda mümkünse Hacer-i Esved selamlanır.',
    descEN: 'Starting from the Black Stone, circle the Kaaba seven times counter-clockwise, saluting the Black Stone at the start of each circuit if possible.',
    duaArabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    duaTransliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar.",
    duaTR: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.',
    duaEN: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
  },
  {
    id: 'sayi',
    appliesTo: ['umrah', 'hajj'],
    order: 3,
    titleTR: 'Sa\'y (Safa ile Merve Arasında)',
    titleEN: "Sa'i (Between Safa and Marwah)",
    descTR: 'Safa tepesinden başlayarak Merve tepesine, oradan tekrar Safa\'ya olmak üzere toplam 7 kez gidilip gelinir. Hz. Hacer\'in su arayışı anılır.',
    descEN: "Walk briskly seven times between the hills of Safa and Marwah, commemorating Hajar's search for water.",
  },
  {
    id: 'halq',
    appliesTo: ['umrah', 'hajj'],
    order: 4,
    titleTR: 'Traş Olmak / Kısaltmak (Halk-Taksir)',
    titleEN: 'Shaving or Trimming Hair (Halq/Taqsir)',
    descTR: 'Erkekler saçlarını tamamen tıraş eder veya kısaltır; kadınlar saçlarından bir parmak ucu kadar keser. Bu işlemle umre tamamlanmış, ihram yasakları sona ermiş olur.',
    descEN: 'Men shave their heads completely or trim their hair; women cut a fingertip\'s length. This completes Umrah and ends the ihram restrictions.',
  },
  {
    id: 'arafat',
    appliesTo: ['hajj'],
    order: 5,
    titleTR: 'Arafat\'ta Vakfe (9 Zilhicce)',
    titleEN: 'Standing at Arafat (9th Dhul-Hijjah)',
    descTR: 'Haccın en önemli rüknüdür. Zilhicce\'nin 9. günü öğleden gün batımına kadar Arafat\'ta bulunulur; dua, zikir ve tövbe ile geçirilir.',
    descEN: 'The most essential pillar of Hajj. Pilgrims stand at Arafat from noon until sunset on the 9th of Dhul-Hijjah, engaging in supplication, remembrance and repentance.',
    duaArabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    duaTransliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir.",
    duaTR: 'Allah\'tan başka ilah yoktur, O tektir, ortağı yoktur. Mülk O\'nundur, hamd O\'nadır ve O her şeye kadirdir.',
    duaEN: 'There is no deity but Allah alone, without partner. His is the dominion and His is the praise, and He is over all things omnipotent.',
  },
  {
    id: 'muzdalifah',
    appliesTo: ['hajj'],
    order: 6,
    titleTR: 'Müzdelife\'de Gecelemek',
    titleEN: 'Staying Overnight at Muzdalifah',
    descTR: 'Arafat dönüşü Müzdelife\'ye gelinir, akşam ve yatsı namazları birleştirilerek kılınır, gece burada geçirilir ve şeytan taşlama için taşlar toplanır.',
    descEN: 'After Arafat, pilgrims move to Muzdalifah, combine Maghrib and Isha prayers, spend the night there, and gather pebbles for the stoning ritual.',
  },
  {
    id: 'jamarat',
    appliesTo: ['hajj'],
    order: 7,
    titleTR: 'Şeytan Taşlama (Cemreler)',
    titleEN: 'Stoning the Jamarat',
    descTR: 'Mina\'da bulunan cemrelere belirlenen günlerde taş atılır. Bu, İbrahim (a.s.)\'ın şeytanı taşlamasının anılmasıdır.',
    descEN: 'Pebbles are thrown at the Jamarat pillars in Mina on the designated days, commemorating Prophet Ibrahim\'s (AS) rejection of Satan.',
  },
  {
    id: 'qurban',
    appliesTo: ['hajj'],
    order: 8,
    titleTR: 'Kurban Kesmek',
    titleEN: 'Sacrifice (Qurbani)',
    descTR: 'Hac menasikinin bir parçası olarak kurban kesilir; bu Kurban Bayramı\'nın da başlangıcıdır.',
    descEN: 'A sacrifice is offered as part of the Hajj rites, marking the start of Eid al-Adha.',
  },
  {
    id: 'farewell_tawaf',
    appliesTo: ['hajj'],
    order: 9,
    titleTR: 'Veda Tavafı',
    titleEN: 'Farewell Tawaf',
    descTR: 'Mekke\'den ayrılmadan önce yapılan son tavaftır; hac ibadetinin tamamlanmasının bir işaretidir.',
    descEN: 'The final tawaf performed before leaving Mecca, marking the completion of the Hajj rites.',
  },
];

export interface HajjUmrahChecklistItem {
  id: string;
  labelTR: string;
  labelEN: string;
}

export const HAJJ_UMRAH_CHECKLIST: HajjUmrahChecklistItem[] = [
  { id: 'ihram_clothes', labelTR: 'İhram kıyafeti (erkekler için 2 parça dikişsiz beyaz kumaş)', labelEN: 'Ihram garments (2 pieces of unstitched white cloth for men)' },
  { id: 'passport', labelTR: 'Pasaport, vize ve seyahat belgeleri', labelEN: 'Passport, visa and travel documents' },
  { id: 'health', labelTR: 'Sağlık sigortası ve gerekli aşılar', labelEN: 'Health insurance and required vaccinations' },
  { id: 'comfortable_sandals', labelTR: 'Rahat, kolay çıkarılabilir sandalet', labelEN: 'Comfortable, easy-to-remove sandals' },
  { id: 'unscented_soap', labelTR: 'Kokusuz sabun ve kişisel bakım ürünleri', labelEN: 'Unscented soap and personal care products' },
  { id: 'dua_book', labelTR: 'Dua ve menasik kitabı (veya bu uygulama)', labelEN: 'Dua and rites guidebook (or this app)' },
  { id: 'money_belt', labelTR: 'Güvenli para/belge çantası', labelEN: 'Secure money/document pouch' },
  { id: 'medication', labelTR: 'Kişisel ilaçlar ve reçeteler', labelEN: 'Personal medication and prescriptions' },
];
