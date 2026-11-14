# Reklam doldurma ve elde tutma raporu

Tarih: 2026-11-13 | Kapsam: `BannerAdSlot.tsx`, `adsConsentService.ts`, `consentPropagation.ts`, `analyticsService.ts`, `_layout.tsx`, mevcut retention denetimleri (`docs/retention-audit-*.md`) | Durum: analiz. Reklam kodu değiştirilmedi.

## 0. Yapılan düzeltme: `tasbih.dailyDhikrs`

Anahtar eksik değildi. `tr.json` içinde 5 elemanlı bir dizi olarak duruyor, tüm dillerde de var. Hata `scripts/i18n-sync.mjs` içindeki `flatten` fonksiyonundaydı: diziyi nesne sanıp her elemanı ayrı anahtar gibi sayıyordu. Düzeltme: diziler tek yaprak (leaf) olarak sayılıyor. `check` artık 0 eksik gösteriyor.

## 1. "İstek/gösterim yüzde 50" ne anlama geliyor

Önce hangi metriğe baktığını netleştirmek gerekiyor, çünkü üç farklı ölçüm karışabiliyor:

| Kaynak | Metrik | Not |
|---|---|---|
| AdMob konsolu | Requests, Impressions, Match rate (eşleşme) | Gerçek talep ve gösterim. Yüzde 50 büyük olasılıkla burada "eşleşme oranı" ya da "gösterim / istek". |
| Firebase Analytics | `ad_request`, `ad_loaded`, `ad_failed` | Uygulamanın kendi sayımı. Bölüm 2'deki hatalar nedeniyle AdMob'la birebir tutmaz. |
| Uygulama içi | Yok | |

Yüzde 50 tek başına kötü değil. Banner reklamlarda pazar ve platform bazında eşleşme oranı değişir. Türkiye'de düşük eCPM nedeniyle yüzde 50 civarı olağan olabilir. Ama kodda oranı kötüleştiren ya da ölçümü bozan birkaç şey var.

## 2. Kod kaynaklı ölçüm hataları

Bunları düzeltmeden hangi oranın doğru olduğunu söylemek mümkün değil.

**a) Yeniden mount edilen reklam ilk yüklemeyi "yenileme" olarak sayıyor.**
`BannerAdSlot.tsx` satır 124: `logAdRequest` yalnızca `ready` değiştiğinde çalışıyor. Sekme değişip geri dönüldüğünde `BannerAd` yeniden mount oluyor ama `ready` true kaldığı için istek loglanmıyor. Satır 179'da `loadedFor.current === attempt` olduğu için gerçek ilk yükleme `ad_refreshed` olarak yazılıyor. Sonuç: Firebase'de `ad_loaded` eksik kalıyor, `ad_request` da bu geçişleri sayamıyor. AdMob ise yeni isteği sayıyor. İki kaynak birbirini tutmuyor.

**b) Tek reklam birimi tüm yerleşimleri taşıyor.**
`PRODUCTION_BANNER_AD_UNIT_ID` (satır 12) 17 farklı `placement` değeri için aynı. AdMob'da yerleşime göre ayrım yok. Yerleşim bilgisi sadece Firebase parametresinde var, AdMob'da hangi ekranın düşük doldurduğu görülemiyor.

**c) Yeniden deneme istek sayısını şişiriyor.**
`QUICK_RETRY_DELAYS_MS = [10s, 20s, 30s]` ve `SLOW_RETRY_DELAY_MS = 5 dk`, `MAX_SLOW_RETRIES = 6` (satır 23–25). Doldurulamayan tek bir slot, tek bir kullanıcıda **1 + 3 + 6 = 10 istek** üretiyor ve gösterim sayısı 0 kalabiliyor. Bu, istek paydasını doğrudan büyütüyor. Yavaş yeniden deneme, kullanıcı ekranda kaldığı sürece 30 dakika boyunca istek atıyor.

**d) Gösterilmeden biten istekler.**
Sekme geçişi sırasında kısa süre mount olan reklamlar istek atıyor ama kullanıcı görmeden kapanıyor. Bu, gösterimi düşürüyor ama isteği değil.

## 3. Doldurmayı düşürebilecek olası nedenler

Bunların hiçbiri şu an ölçülmüyor. Hepsi hipotez, doğrulanması gerekiyor.

- **iOS ATT reddi:** ATT'yi reddeden kullanıcılara kişiselleştirilmemiş reklam gidiyor. Bu, doldurma ve eCPM'i düşürür. ATT durumu (authorized/denied) Firebase'e yazılmıyor.
- **AB/İngiltere UMP reddi:** `canRequestAds` false ise slot tamamen kapanıyor (`BannerAdSlot` satır 152). Oranı hiçbir yerde ölçülmüyor.
- **İlk açılışta çevrimdışı durum:** UMP sonucu kesinleşmezse reklam yok. Uygulama ön plana geldiğinde yeniden deniyor, ama bu süre boyunca doldurma sıfır.
- **Banner boyutu:** `ANCHORED_ADAPTIVE` genişliği kartın iç genişliğine göre belirleniyor. Dar kartlarda doldurma düşebilir. Boyut kırılımı yok.
- **Analitik rızası:** EU/UK'da reddedenler için Firebase analitiği kapalı (`consentPropagation.ts`). Firebase oranı yalnızca rıza verenleri, AdMob ise herkesi sayıyor. İki popülasyon farklı.

## 4. Ne yapılabilir (öncelik sırasıyla)

### P0: Önce doğru ölçüm (kod, yaklaşık 1–2 gün)
1. **İstek ve yüklemeyi mount başına say.** `ad_request`'i `BannerAd`'in gerçekten istek yaptığı anda logla. `loadedFor` ref'ini her mount'ta sıfırla, böylece her ilk yükleme `ad_loaded` olur.
2. **Hata kodlarını kırılımla say.** AdMob'un `code 3` (no fill) ile ağ hatalarını ayır. Şu an hepsi `ad_failed` altında tek bir sayı.
3. **Yerleşim başına ayrı reklam birimi.** 17 yerleşim için AdMob'da en az 4–5 grup (ana ekran, liste ekranları, ayarlar, araçlar). Böylece AdMob raporu yerleşime göre ayrılır.
4. **ATT ve UMP durumunu kullanıcı özelliği olarak yaz.** `ad_consent_state` (ATT: authorized/denied/unavailable, UMP: canRequestAds). Doldurmayı bu segmentle okuyabilirsin.
5. **AdMob raporunu ülke ve platform bazında al.** Hangi pazarın doldurmayı düşürdüğü, kodsuz ve hemen görülür.

### P1: İstek verimini artır
6. **Yeniden denemeyi sadeleştir.** İki hızlı deneme, oturum başına en fazla bir yavaş deneme. No-fill durumunda aynı oturumda tekrar istek atma. Bu, istek paydasını düşürür ve kullanıcıya gereksiz istek göndermez.
7. **Sekme geçişinde yeniden mount etme.** Reklamı gizleyip göstermek, ya da 10 dakika içinde aynı yerleşim için önbelleğe alınmış reklamı yeniden kullanmak. İstek sayısı düşer, görünmeyen istekler azalır.
8. **Liste içi (native) reklam.** `PRODUCT.md` liste ekranlarında native reklamı öneriyor. Topluluk akışı için planda zaten var. Doldurma farkını A/B ile ölç.

### P2: Doldurma ve gelir
9. **AdMob mediation** (ör. Meta Audience Network, Unity, Pangle). Türkiye'de doldurmayı artırabilir. Önce AdMob medyasyon politikasını ve gizlilik beyanını kontrol et.
10. **Gelir olayı:** `onPaid` callback'i ile gerçek ad değerini Firebase'e yaz. Böylece eCPM'i yerleşime ve ülkeye göre hesaplayabilirsin.
11. **Reklam yoğunluğu testi:** Reklam sayısını azaltan bir grupla elde tutma karşılaştır. Dikkat: `PRODUCT.md` ibadet ekranlarında reklamı sınırlamayı öneriyor, bu test buna göre tasarlanmalı.

## 5. Elde tutma (retention)

### Mevcut ölçüm
- Firebase otomatik: `first_open`, oturum, D1/D7 raporları.
- Uygulama olayları: `prayer_logged` (seri sayısı dahil), `hatim_progress`, `dhikr_completed`, `quran_surah_read`, `kaza_updated`, `community_*`.
- Kullanıcı özellikleri: `app_language`, `calc_method`, `notif_enabled`. Bunlar ayarlanıyor (`(tabs)/index.tsx:672–682`, `NotificationHealthCard.tsx:80`).

### Eksikler
- **Bildirimden dönüş ölçülmüyor.** `_layout.tsx` içindeki PRESS ve FCM açılış işleyicilerinde hiçbir olay loglanmıyor. Öneri: `notif_opened { type }`.
- **"Aktif gün" tanımı yok.** D1/D7 yalnızca uygulama açılışına bakıyor. Önerilen: gerçek değer anı (namaz işaretleme, zikir, kuran okuma) için `active_day` olayı. Bu, açılıp kapanan oturumları ayırır.
- **Onboarding'den ilk değere süre ölçülmüyor.** `first_prayer_screen_shown` var ama "ilk namaz işaretleme" yok. Öneri: `time_to_first_prayer_log`.
- **Round-2 denetiminde önerilen `onboarding_abandoned` olayı kodda yok.** Doğrulandı.
- **Round-2 P0 (günde 10 alarm bildirimi → silme) çözüldü mü belirsiz.** Denetim dosyası bu durumu kapatmıyor, ayrıca doğrulanmalı.

### Önerilen elde tutma hedefleri
- D1, D7, D30 (kohort: ilk açılış tarihine göre).
- Haftalık aktif kullanıcı (`active_day` ile).
- Bildirim açılış oranı (`notif_opened` / gönderilen).
- İlk 3 gün içinde ilk namaz işaretleme oranı.
- Uyarı: reklam gösterimi ile D7 arasındaki ilişki korelasyondur, nedensellik değildir. Reklam testi yalnızca A/B ile sonuç verir.

## 6. Önerilen sıra

1. **Bir hafta ölçüm sprinti:** P0'daki 1–5 maddeleri yap. Bu bitmeden doldurma kararı verilmemeli.
2. **Verimlilik:** P1'deki 6–7. İstek sayısını düşürüp gösterim oranını yükseltir.
3. **Gelir ve elde tutma testleri:** P2 ve bölüm 5'teki eksik olaylar, ölçüm sprintinden sonra.

## 7. Senden gereken veriler

- AdMob'da hangi metrik yüzde 50? (İstek/gösterim mi, eşleşme oranı mı?) Son 7 gün, ülke ve platform kırılımıyla.
- Firebase'de son 7 günün `ad_request` ve `ad_loaded` sayıları.
- iOS ATT onay oranı biliniyor mu?
- Round-2 P0 (alarm bildirimleri) kapatıldı mı?

## 8. Ölçüt

- AdMob eşleşme oranı, platform × ülke.
- İstek başına gösterim (gösterim / istek).
- `ad_failed` kırılımı: no-fill oranı ve ağ hatası oranı.
- D1, D7, D30 ve bildirim açılış oranı.

## 9. Uygulananlar (2026-11-13)

| Rapor maddesi | Durum | Dosya |
|---|---|---|
| 1. İstek ve yükleme mount başına sayılıyor | Uygulandı | `BannerAdSlot.tsx` (`AdInstance`) |
| 2. Hata kodları kırılımlı | Zaten vardı (`error_code`), değişmedi | `analyticsService.ts` |
| 3. Yerleşim başına reklam birimi | Altyapı hazır (`AD_UNIT_OVERRIDES`). AdMob'da birim açıp ID eklemek gerekiyor | `BannerAdSlot.tsx` |
| 4. ATT ve UMP durumu kullanıcı özelliği | Uygulandı (`att_status`, `ads_consent`) | `adsConsentService.ts` |
| 5. Ülke ve platform kırılımı | AdMob konsolunda yapılır, kod değişikliği yok | — |
| 6. Yeniden deneme sadeleştirildi | Uygulandı: 2 hızlı + 1 yavaş deneme | `BannerAdSlot.tsx` |
| 7. Sekme geçişinde yeniden mount yok | Yapılmadı: AdMob yenileme ayarına bağlı, ayrı test gerekir | — |
| 8. Liste içi native reklam | Yapılmadı: tasarım kararı gerekir | — |
| 9. Mediation | Yapılmadı: AdMob politikası ve gizlilik beyanı gerekir | — |
| 10. Gelir olayı (`ad_paid`) | Uygulandı: `onPaid` ile değer ve para birimi | `BannerAdSlot.tsx`, `analyticsService.ts` |
| 11. Reklam yoğunluğu testi | Yapılmadı: deney tasarımı gerekir | — |
| Elde tutma: bildirim açılışı | Uygulandı (`notif_opened`) | `_layout.tsx`, `analyticsService.ts` |
| Elde tutma: aktif gün | Uygulandı (`active_day`, gün başına bir kez) | `analyticsService.ts` |
| Elde tutma: ilk namaz işaretleme | Uygulandı (`first_prayer_logged`, bir kez) | `analyticsService.ts` |
| Topluluk paylaşımı Firebase'e kaydı | Mevcut (`community_share_submitted`, sunucu onayından sonra) | `CommunitySharePrompt.tsx` |

**Analitikte göreceğin olaylar (yeni ya da düzeltilmiş):** `ad_request`, `ad_loaded`, `ad_refreshed`, `ad_failed`, `ad_paid`, `notif_opened`, `active_day`, `first_prayer_logged`, `community_share_submitted`.

**Firebase konsolunda yapılacaklar:** Parametrelerin raporlarda görünmesi için şu özel boyutları (custom dimension) tanımla: `placement`, `template_key`, `country_visible`, `type`, `source`, `att_status`, `ads_consent`. Olay listesinde gelen olaylar 24 saate kadar gecikebilir. Anlık görmek için DebugView kullan.
