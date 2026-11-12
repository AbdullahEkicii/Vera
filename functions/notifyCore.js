// Pure rules for the push that announces an automatic community post. No Firebase imports.
//
// Cadence (counted over notifications already sent):
// - the first DAILY_PHASE_COUNT notifications: at most one a day
// - the next ones, up to SPACED_PHASE_END in total: every 2 or 3 days
// - after that: once a week
// Quiet hours (Istanbul time) never send; the next publishing run sends instead.

import { LANGUAGE_COUNTRIES } from './autoPublishCore.js';

export const DAILY_PHASE_COUNT = 5;
export const SPACED_PHASE_END = 15;
export const NOTIFY_CHANNEL_ID = 'ezan_campaign_notifications';
export const FEED_NOTIFICATION_TYPE = 'community_feed';

const DAY_MS = 24 * 60 * 60 * 1000;
const QUIET_START_HOUR = 23;
const QUIET_END_HOUR = 8;
const ISTANBUL_OFFSET_HOURS = 3;

/** Milliseconds to wait after a notification, given how many were already sent. */
export function nextNotifyDelayMs(sentCount, rnd) {
  if (sentCount < DAILY_PHASE_COUNT) return DAY_MS;
  if (sentCount < SPACED_PHASE_END) return (2 + Math.floor(rnd() * 2)) * DAY_MS;
  return 7 * DAY_MS;
}

export function isQuietHour(ms) {
  const hour = new Date(ms + ISTANBUL_OFFSET_HOURS * 3600 * 1000).getUTCHours();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** Whether a notification may go out now, given the stored state. */
export function shouldNotifyNow({ state, now }) {
  if (isQuietHour(now)) return false;
  return now >= (state?.nextAllowedMs ?? 0);
}

// Title is shared per language; each body matches one shareable template. Languages not listed
// here fall back to English. Copy is short and says what happened without naming anyone.
const COPY = {
  ar: ['مجتمع الأمة', 'شخص أتم صلوات اليوم الخمس 🤲', 'شخص بلغ هدف الذكر ✨', 'شخص أتم ختمة قرآن 📖', 'شخص فتح إنجازاً جديداً 🏅'],
  bn: ['উম্মাহ ফিড', 'একজন আজ ৫ ওয়াক্ত নামাজ পূর্ণ করেছেন 🤲', 'একজন যিকিরের লক্ষ্যে পৌঁছেছেন ✨', 'একজন কুরআন খতম সম্পন্ন করেছেন 📖', 'একজন নতুন অর্জন আনলক করেছেন 🏅'],
  cs: ['Komunitní kanál', 'Někdo dnes splnil všech 5 modliteb 🤲', 'Někdo dosáhl milníku zikru ✨', 'Někdo dokončil chatmu 📖', 'Někdo odemkl nový úspěch 🏅'],
  da: ['Fællesskabsfeed', 'Nogen fuldførte alle 5 bønner i dag 🤲', 'Nogen nåede en dhikr-milepæl ✨', 'Nogen fuldførte en Koran-khatm 📖', 'Nogen låste en ny præstation op 🏅'],
  de: ['Gemeinschafts-Feed', 'Jemand hat heute alle 5 Gebete geschafft 🤲', 'Jemand hat einen Dhikr-Meilenstein erreicht ✨', 'Jemand hat eine Koran-Khatma beendet 📖', 'Jemand hat eine neue Errungenschaft freigeschaltet 🏅'],
  en: ['Community feed', 'Someone completed all 5 prayers today 🤲', 'Someone reached a dhikr milestone ✨', 'Someone completed a Quran khatm 📖', 'Someone unlocked a new achievement 🏅'],
  es: ['Feed de la comunidad', 'Alguien completó hoy los 5 rezos 🤲', 'Alguien alcanzó una meta de dhikr ✨', 'Alguien completó un jatm del Corán 📖', 'Alguien desbloqueó un nuevo logro 🏅'],
  fa: ['خوراک جامعه', 'یک نفر امروز هر ۵ نماز را خواند 🤲', 'یک نفر به نقطه‌ی عطف ذکر رسید ✨', 'یک نفر یک ختم قرآن را تمام کرد 📖', 'یک نفر یک دستاورد جدید باز کرد 🏅'],
  fi: ['Yhteisön syöte', 'Joku suoritti tänään kaikki 5 rukousta 🤲', 'Joku saavutti dhikr-tavoitteen ✨', 'Joku suoritti Koraanin khatmin 📖', 'Joku avasi uuden saavutuksen 🏅'],
  fr: ['Fil de la communauté', "Quelqu'un a accompli les 5 prières aujourd'hui 🤲", 'Quelqu’un a atteint un palier de dhikr ✨', 'Quelqu’un a terminé une khatma du Coran 📖', 'Quelqu’un a débloqué un nouveau succès 🏅'],
  ha: ["Labarin al'umma", 'Wani ya kammala sallah 5 yau 🤲', 'Wani ya kai matakin zikiri ✨', "Wani ya kammala khatm na Alkur'ani 📖", 'Wani ya buɗe sabon nasara 🏅'],
  hi: ['समुदाय फ़ीड', 'किसी ने आज 5 नमाज़ें पूरी कीं 🤲', 'किसी ने ज़िक्र का लक्ष्य पूरा किया ✨', 'किसी ने कुरआन का ख़त्म पूरा किया 📖', 'किसी ने नई उपलब्धि अनलॉक की 🏅'],
  hu: ['Közösségi hírfolyam', 'Valaki ma mind az 5 imát elvégezte 🤲', 'Valaki elérte a zikr-mérföldkövet ✨', 'Valaki befejezett egy Korán-khatmot 📖', 'Valaki új eredményt oldott fel 🏅'],
  id: ['Feed komunitas', 'Seseorang hari ini menyelesaikan 5 waktu shalat 🤲', 'Seseorang mencapai target dzikir ✨', "Seseorang menyelesaikan khatam Al-Qur'an 📖", 'Seseorang membuka pencapaian baru 🏅'],
  it: ['Feed della comunità', 'Qualcuno oggi ha completato le 5 preghiere 🤲', 'Qualcuno ha raggiunto una tappa di dhikr ✨', 'Qualcuno ha completato un khatm del Corano 📖', 'Qualcuno ha sbloccato un nuovo traguardo 🏅'],
  ja: ['コミュニティ フィード', '今日、誰かが5回のお祈りを全て終えました 🤲', '誰かがズィクルの目標に到達しました ✨', '誰かがコーランのハトムを完了しました 📖', '誰かが新しい実績を解除しました 🏅'],
  ko: ['커뮤니티 피드', '누군가 오늘 5번의 기도를 모두 마쳤어요 🤲', '누군가 zikr 목표를 달성했어요 ✨', '누군가 코란 한 독(하툼)을 완료했어요 📖', '누군가 새로운 업적을 달성했어요 🏅'],
  ms: ['Suapan komuniti', 'Seseorang hari ini menyempurnakan 5 waktu solat 🤲', 'Seseorang mencapai sasaran zikir ✨', 'Seseorang menamatkan khatam Al-Quran 📖', 'Seseorang membuka pencapaian baharu 🏅'],
  nl: ['Gemeenschapsfeed', 'Iemand heeft vandaag alle 5 gebeden voltooid 🤲', 'Iemand heeft een dhikr-mijlpaal bereikt ✨', 'Iemand heeft een Koran-khatm voltooid 📖', 'Iemand heeft een nieuwe prestatie ontgrendeld 🏅'],
  no: ['Fellesskapsfeed', 'Noen fullførte alle 5 bønner i dag 🤲', 'Noen nådde en dhikr-milepæl ✨', 'Noen fullførte en Koran-khatm 📖', 'Noen låste opp en ny prestasjon 🏅'],
  pl: ['Kanał społeczności', 'Ktoś dziś ukończył wszystkie 5 modlitw 🤲', 'Ktoś osiągnął cel dhikru ✨', 'Ktoś ukończył khatm Koranu 📖', 'Ktoś odblokował nowe osiągnięcie 🏅'],
  pt: ['Feed da comunidade', 'Alguém completou as 5 orações hoje 🤲', 'Alguém alcançou uma meta de dhikr ✨', 'Alguém completou um khatm do Alcorão 📖', 'Alguém desbloqueou uma nova conquista 🏅'],
  ro: ['Fluxul comunității', 'Cineva a încheiat azi cele 5 rugăciuni 🤲', 'Cineva a atins un prag de dhikr ✨', 'Cineva a încheiat un khatm al Coranului 📖', 'Cineva a deblocat o nouă realizare 🏅'],
  ru: ['Лента сообщества', 'Кто-то сегодня выполнил все 5 намазов 🤲', 'Кто-то достиг цели по зикру ✨', 'Кто-то завершил хатм Корана 📖', 'Кто-то открыл новое достижение 🏅'],
  sk: ['Komunitný kanál', 'Niekto dnes splnil všetkých 5 modlitieb 🤲', 'Niekto dosiahol míľnik zikru ✨', 'Niekto dokončil chatmu 📖', 'Niekto odomkol nový úspech 🏅'],
  sq: ['Rrjedha e komunitetit', 'Dikush sot i përfundoi 5 namazet 🤲', 'Dikush arriti një objektiv dhikri ✨', 'Dikush përfundoi një khatm të Kuranit 📖', 'Dikush zhbllokoi një arritje të re 🏅'],
  sv: ['Gemenskapsflöde', 'Någon slutförde alla 5 böner idag 🤲', 'Någon nådde en dhikr-milstolpe ✨', 'Någon slutförde en Koran-khatm 📖', 'Någon låste upp en ny prestation 🏅'],
  sw: ['Mlisho wa jamii', 'Mtu fulani leo amekamilisha sala 5 🤲', 'Mtu fulani amefikia lengo la dhikr ✨', "Mtu fulani amekamilisha khatm ya Qur'ani 📖", 'Mtu fulani amefungua mafanikio mapya 🏅'],
  th: ['ฟีดชุมชน', 'มีคนละหมาดครบ 5 เวลาวันนี้ 🤲', 'มีคนถึงเป้าหมายซิกร์ ✨', 'มีคนอ่านอัลกุรอานจบหนึ่งรอบ 📖', 'มีคนปลดล็อกความสำเร็จใหม่ 🏅'],
  tr: ['Ümmet akışı', 'Birisi bugün 5/5 namazını tamamladı 🤲', 'Birisi zikir hedefine ulaştı ✨', 'Birisi bir hatim tamamladı 📖', 'Birisi yeni bir başarım açtı 🏅'],
  uk: ['Стрічка спільноти', 'Хтось сьогодні виконав усі 5 намазів 🤲', 'Хтось досяг цілі зікру ✨', 'Хтось завершив хатм Корану 📖', 'Хтось відкрив нове досягнення 🏅'],
  ur: ['کمیونٹی فیڈ', 'کسی نے آج 5 نمازیں مکمل کیں 🤲', 'کسی نے ذکر کا ہدف پورا کیا ✨', 'کسی نے قرآن کا ختم مکمل کیا 📖', 'کسی نے نئی کامیابی حاصل کی 🏅'],
  uz: ['Jamoa lentasi', "Kimdir bugun 5 vaqt namozni ado etdi 🤲", 'Kimdir zikr maqsadiga yetdi ✨', "Kimdir Qur'on xatmini tugatdi 📖", 'Kimdir yangi yutuqni ochdi 🏅'],
  vi: ['Bảng tin cộng đồng', 'Hôm nay có người đã hoàn thành đủ 5 lần cầu nguyện 🤲', 'Có người đã đạt mốc dhikr ✨', "Có người đã hoàn thành một lượt khatm Kinh Qur'an 📖", 'Có người vừa mở khóa một thành tích mới 🏅'],
  zh: ['社区动态', '今天有人完成了全部5次拜功 🤲', '有人达成了赞念目标 ✨', '有人完成了一次古兰经读毕 📖', '有人解锁了新成就 🏅'],
};

const BODY_INDEX = { 'prayer.fullday': 1, 'dhikr.milestone': 2, 'hatim.completed': 3, achievement: 4 };

/** Title and body in the language, English when the language has no copy. */
export function notificationCopy(lang, templateKey) {
  const row = COPY[lang] ?? COPY.en;
  const body = row[BODY_INDEX[templateKey]] ?? row[1];
  return { title: row[0], body };
}

/** The post a notification is about: a random one of the posts just published (keeps variety). */
export function pickNotifiedPost(publishedPosts, rnd) {
  return publishedPosts[Math.floor(rnd() * publishedPosts.length)];
}

/** Topic a language's users are subscribed to (see pushNotificationService.ts campaignTopics). */
export function languageTopic(lang) {
  return `lang_${lang}`;
}

export const NOTIFY_LANGUAGES = Object.keys(LANGUAGE_COUNTRIES);

/** FCM payload for one language topic. Tapping opens the app on the Ummah tab's daily feed. */
export function buildNotifyMessage(lang, templateKey) {
  const { title, body } = notificationCopy(lang, templateKey);
  return {
    topic: languageTopic(lang),
    notification: { title, body },
    data: { type: FEED_NOTIFICATION_TYPE, view: 'today', templateKey },
    android: { notification: { channelId: NOTIFY_CHANNEL_ID } },
    apns: { payload: { aps: { sound: 'default' } } },
  };
}
