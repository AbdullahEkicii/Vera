# Prayer Times: Azan & Qibla: Play Store growth plan

Status date: 2026-10-27. Source copy: `docs/store-listing/listings.json`.

## 1. Store listing (done as drafts, not yet published)

- 34 locales were saved as **drafts** in Play Console (Mağaza girişleri → Varsayılan mağaza girişi → Girişi düzenle).
- Locales covered: en-US, tr-TR, ar, bn-BD, cs-CZ, da-DK, de-DE, es-419, fa-IR, fi-FI, fr-FR, hi-IN, hu-HU, id, it-IT, ja-JP, ko-KR, ms-MY, nl-NL, no-NO, pl-PL, pt-BR, ro, ru-RU, sk, sq, sv-SE, th, uk, ur, vi, zh-CN.
- Not available as Play store listing languages (no option in the dropdown): Swahili (sw), Uzbek (uz), Hausa (ha). They stay in-app only.
- **Not yet published.** Drafts must be submitted in Play Console before users see them.

### Fixes made to copy
- Removed the false "Ad-Free Experience" claim. The home screen shows banner ads (`BannerAdSlot`).
- Removed "%100 uyumlu / Diyanet verileri" from the Turkish listing. It implied an official data source and affiliation. Confirm the data source before re-adding any such claim.
- Shortened the Turkish title to "Namaz Vakitleri: Ezan & Kıble", which matches common search terms.

### Title and short-description keyword plan
- Title (30 chars max): keep the prayer-time term plus one differentiator (Azan, Qibla, Ezan, Kıble).
- Short description (80 chars max): lead with the two highest-volume terms for that market (prayer times + azan/ezan/qibla), then Quran.
- Full description: first 3 lines carry the keywords (Play indexes the full description). Feature bullets repeat the same terms naturally.

## 2. Market-specific search terms

| Market | Core terms to target |
|---|---|
| Turkey (tr-TR) | namaz vakitleri, ezan, kıble, imsakiye, kur'an, hatim, tesbih, ramazan takvimi |
| US/English | prayer times, azan, qibla, muslim prayer, quran, adhan alarm, ramadan calendar |
| Indonesia (id) | jadwal sholat, adzan, kiblat, al quran, doa harian |
| Pakistan / India (ur, hi) | نماز کے اوقات, اذان, قبلہ, नमाज़ का समय, अज़ान |
| Arabic (ar) | أوقات الصلاة, أذان, قبلة, قرآن |
| Malaysia (ms) | waktu solat, azan, kiblat, al-quran |
| Bangladesh (bn) | নামাজের সময়, আজান, কিবলা |

Check current volume for these in Play's search (type each term in the Play Store, note autocomplete suggestions) before the next full copy pass.

## 3. Release notes ("Yenilikler") for the next update

English:
> New: choose a different sound for each prayer and set how many minutes before a prayer you get the early warning. Friday (Jumu'ah) reminder added. Monthly imsakiye view with sharing. Hijri date offset setting. Notification health check so you never miss an Azan alert. Improved contrast in light themes.

Turkish:
> Yeni: Her vakit için ayrı ezan sesi seçin ve vakitten kaç dakika önce uyarı alacağınızı belirleyin. Cuma hatırlatıcısı eklendi. Aylık imsakiye görünümü ve paylaşım. Hicri tarih ayarı. Ezan bildirimlerini kaçırmamanız için bildirim sağlığı kontrolü. Açık temalarda daha iyi kontrast.

Other languages: translate from the English text when the release is cut.

## 4. Store events (Play Console "Etkinlikler") calendar

Play Console's store-events page could not be opened directly by URL during this session. Find it under **Büyüme → Play Store'daki varlığı → Etkinlikler** and check eligibility.

Approximate Islamic dates for 2026–2027. These are estimates and must be checked against the official moon-sighting announcement before publishing.

| When (approx.) | Event | Action |
|---|---|---|
| Nov 2026 | Friday-prayer and winter time-change messaging | Push "Vakitler kışa göre değişti" style reminder; update the notification copy |
| Dec 2026 | Start of Rajab | Short "Rajab ayı" tip in the app |
| ~10 Jan 2027 | Laylat al-Isra wal-Mi'raj (27 Rajab) | Kandil message in the app and in store copy |
| ~25 Jan 2027 | Mid-Sha'ban (Berat Kandili) | Kandil message; invite users to set reminders |
| ~1–8 Feb 2027 | **Ramadan 1448 preparation** (peak season) | Store event 3–4 weeks before Ramadan; update screenshots with Ramadan calendar; push "Ramazan takvimi hazır" |
| ~8 Feb 2027 | **Ramadan begins** | Store event running through the month; daily Suhoor/Iftar prompt |
| ~5 Mar 2027 | Laylat al-Qadr (27 Ramadan) | Special dua and Quran reading prompt |
| ~9–10 Mar 2027 | Eid al-Fitr | Eid greeting card (existing GreetingCardModal); "Bayram tebrikleri" share |
| ~May 2027 | Hajj season, Arafat day (9 Dhu al-Hijjah) | Tasbih/dua prompt; Hajj-umrah screen highlighted |
| ~16–17 May 2027 | Eid al-Adha | Greeting card; Qurban reminder if relevant |

Event copy idea (store event banner, EN): *"Ramadan is coming. Suhoor and Iftar times, Quran, and Azan alerts, all in one app."* Provide a translated version for each event market.

## 5. Re-engagement ideas (in-app and store)

1. **Ramadan countdown** on the home screen from 60 days before Ramadan. Share the countdown as an image.
2. **Monthly imsakiye share card** (already built; promote it in screenshots).
3. **Weekly streak**: count days with all prayers checked. Use the existing prayer checklist.
4. **Screenshots**: refresh the 8 phone screenshots for each major locale. Show: prayer times, Azan alarm, Qibla compass, Quran, Ramadan calendar, imsakiye, widgets.
5. **Feature graphic and short video**: show the Azan alarm and Qibla compass working. Use a localized caption per market.
6. **Reply to every review** in the language of the review (Play → Kullanıcı puanları ve yorumlar). Replies improve visibility and retention signals.
7. **Pre-launch report**: fix any crash or ANR before Ramadan. A crash spike during peak season hurts ranking.
8. **Ratings prompt**: ask for a rating after a user has used the Azan alarm for several days, not on first open.

## 6. Next steps (need your go-ahead)

1. Review the drafts in Play Console and submit them for publishing. Publishing changes the live listing, so this needs your explicit approval.
2. Confirm the Turkish data-source wording, or give me the exact source to cite.
3. Decide whether to create the Ramadan 2027 store event now (recommended: create in Jan 2027).
