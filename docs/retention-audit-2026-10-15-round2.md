# Vera: Erken Silinme Analizi, 2. Tur (Derin Tarama)

Tarih: 2026-10-15 · İlk rapor: `retention-audit-2026-10-15.md`

Üç ayrı kod denetimi (doğruluk/çökme, ekran UX/i18n, yayın/Play/güvenlik) + emülatörde konum izni yolu.
**Doğrulandı** = ben kodda ya da emülatörde teyit ettim. Diğerleri ajan bulgusu: kodda kanıtlı ama çalıştırılmadı.

## Bu turda düzeltilen

- **Onboarding üstüne açılan zorunlu "Konum Seç" sheet'i** (emülatörde görüldü, düzeltme doğrulandı). GPS yavaşlayınca `needsManualLocation` modalı onboarding butonlarını örtüyordu. Artık onboarding açıkken açılmıyor, modal her zaman kapatılabilir ve GPS hatasında da ana ekranda "varsayılan şehir" bandı çıkıyor ([index.tsx](../src/app/(tabs)/index.tsx)).

## P0: çok kullanıcıyı etkileyen, görünür hatalar

| # | Bulgu | Kanıt | Etki | Çözüm |
|---|---|---|---|---|
| R1 | **Çeviride `{{değişken}}` adı değişmiş, ekranda ham `{{...}}` görünüyor.** Doğrulandı: 42 dize, 23 dil | `notifications.warningBody` (de, es, fr, ru, ar, fa, ur, id, ms, ha, sw), `checklist.trustNotice` (da, es, fa, ha, hi, no, ro, sq, sv, sw, uz), `calendar.todayNotice`, `update.upToDateMessage` | 25 dk uyarı bildiriminde "{{Gebet}}" yazıyor, ana ekran güven rozeti bozuk. Hepsi büyük dillerde (ar, id, ur, fa, de, ru) | Bozuk dizeleri düzelt, `scripts/i18n-sync.mjs`'e placeholder eşleşme kontrolü ekle |
| R2 | **Ayarlar'da şehir/konum değiştirme yok.** Doğrulandı: settings.tsx'te city/location geçmiyor | `settings.tsx` | Yanlış şehir görünen kullanıcı çözümü bulamıyor | Ayarlar'ın üstüne "Konum / Şehir" satırı |
| R3 | **Onboarding GPS sonucu `MANUAL_LOCATION` olarak yazılıyor ve hiç silinmiyor.** Doğrulandı: yalnızca `setItem`, `removeItem` yok | `WelcomeOnboardingModal.tsx:139`, `useLocation.ts:162-170` | "Otomatik bul" diyen kullanıcı sonsuza dek o yerde kalıyor. Seyahatte vakitler, kıble, bildirimler eski şehirde | GPS'i yalnızca `LAST_GPS_LOCATION` olarak sakla veya `source: 'gps'` bayrağıyla yenilemeye devam et, Ayarlar'a "Konumumu kullan" ekle |
| R4 | **Saat dilimi:** Aladhan saatleri şehrin saat diliminde, uygulama cihazın saat diliminde yorumluyor | `api.ts:239-241`, `notificationService.ts:443-446,562-565`, `index.tsx:685-689` | Başka ülkeden şehir seçen veya seyahat eden kullanıcıda tüm alarm, geri sayım, widget fark kadar kayık | `meta.timezone` sakla, "HH:mm"i o bölgede epoch'a çevir |
| R5 | **Yanlış varsayılan şehir:** saat dilimi tahmini Hindistan (`Asia/Kolkata`), Cakarta (`Asia/Jakarta`), Tahran, Lagos vb. için eşleşmiyor ve İstanbul'a düşüyor | `useLocation.ts:13-112` | Cakarta/Mumbai'de izin vermeyen kullanıcı makul görünen yanlış vakit görüyor | Bölge koduyla eşle, eşleşme yoksa şehir iste |
| R6 | **Varsayılan tam ekran:** durum ve gezinme çubuğu gizli | `app.json androidStatusBar.hidden`, `ThemeContext.tsx:51,81`, `_layout.tsx:133` | Saat/pil/sinyal yok, 3 tuşlu gezinme gizli, açıklama yok | Varsayılan görünür, tam ekran isteğe bağlı |
| R7 | **Tema:** `system` tercihi sessizce `light`'a çevriliyor, varsayılan `light`. Doğrulandı | `ThemeContext.tsx:52,70-76` | Sistem koyu temadaysa uygulama açık açılıyor, `userInterfaceStyle: automatic` boşa | Varsayılan `system`, sistem temasını izle |
| R8 | **Kuran ayet sesi ağ/akış hatasında sessizce donuyor** | `quranAudioService.ts:120-135` | Çevrimdışı/404'te oynatıcı ne başlıyor ne hata veriyor | `status.error` + 8 sn zaman aşımı + çevrimdışı mesajı |
| R9 | **AB/UK rıza açığı:** Analytics, Crashlytics ve FCM konu kaydı UMP sonucundan bağımsız başlıyor | `adsConsentService.ts:55-60`, default-deny ayarı yok | Rızasız veri toplama, politika riski | `analytics_default_allow_*` meta-data veya `setAnalyticsCollectionEnabled(false)`, UMP sonucuyla `setConsent` |
| R10 | **Sürüm kontrol dosyası eski:** `minVersion/latestVersion 1.0.18`, uygulama 1.0.32 | `Vera_version_control.json` | "Güncelleme var" istemi hiç çıkmaz, iOS URL placeholder | Her sürümde JSON'u güncelle |

## P1

### Bildirim ve alarm
- **Uygulama 8+ gün açılmazsa alarmlar susuyor.** 7 günlük pencere var, yenileme yalnızca en iyi çabayla çalışan arka plan görevinde (`notificationService.ts:433,447`, `backgroundTaskService.ts:44-47`). Xiaomi/Huawei/Oppo'da ve yalnızca Ramazan'da açanlarda sorun.
- `cancelTriggerNotifications()` tüm tetikleyicileri siliyor, "değişmedi" atlaması izin iptali/OS temizliğini görmüyor (`notificationService.ts:424,403-407`).
- Yatsı gece yarısından sonraysa (yüksek enlem) alarm yanlış gece kuruluyor (`api.ts:157-161`, `notificationService.ts:564-566`).
- Ana ekran gece yarısını geçince eski tarihi gösteriyor, ertesi gün imsak geri sayımı bugünün imsak saatiyle hesaplanıyor (`PrayerTimeCard.tsx:147-161`, `index.tsx:700-702`).
- Bildirime dokunma deep link'i 2 dk (uygulama içi) / 10 dk sonra düşüyor (`_layout.tsx:41-55`, `index.js:12-22`).

### Konum
- Önbellekli konum varken bile izin reddi / zaman aşımı / "yalnızca bu seferlik" modal açıyor (`useLocation.ts:207-213,253`).
- Eşzamanlı `initLocation` çağrıları: izin verdikten sonra bile şehir modalı çıkabilir (`useLocation.ts:264-268`).
- `getLastKnownPositionAsync` yaş sınırı yok, günler önceki konum "mevcut" sayılıyor (`useLocation.ts:221`, `qibla.tsx:95`).

### Hesaplama
- Hesaplama yöntemi cihaz bölgesinden seçiliyor, konumdan değil. `tz.includes('america')` tüm Amerika'yı ISNA yapıyor, Endonezya/Malezya/İran için uygun yöntemler yok (`calcMethod.ts:48`, `api.ts:59-102`).
- Mezhep (Hanefi ikindi) ayarı yok, Hindistan/Pakistan/Bangladeş/Orta Asya'da ikindi erken. Çevrimdışı hesap yöntem 14'ü yanlış açılarla yapıyor (`offlinePrayerService.ts:41-43`).
- Fallback önbellek bugünü kapsamıyorsa boş/eski ekran, boş `data: []` bir ay önbelleğe yazılıyor (`api.ts:248,276,283-296`).
- Kıble: gerçek konum yoksa sessizce İstanbul kıblesi, `trueHeading` yokken sapma düzeltmesi yok, manyetometre yoksa ölü pusula ve mesaj yok (`qibla.tsx:117-120,134`).

### UX ve erişilebilirlik
- Alt çubukta 6 yalnızca ikonlu sekme, etiket yok, `book`/`book-open` ayırt edilemez (`AnimatedTabBar.tsx`, `index.tsx:84-91`).
- Ana ekran aşırı yüklü. Zekat/Hac/Başarılar hem ana ekranda hem Ayarlar'da (`index.tsx:1085-1165`, `settings.tsx:971-1005`).
- Kontrast: altın/zümrüt üstünde beyaz metin ~2.1:1 (`PrayerTimeCard.tsx:380-395`), düşük alfa metinler ~3:1.
- Neredeyse hiç `accessibilityLabel` yok (settings 0/28, Quran 0, SimpleHome 0), 40dp altı dokunma alanları.
- RTL desteği yok (`I18nManager` yok), ar/fa/ur gönderiliyor.
- Günün ayeti/hadisi `translate.googleapis.com` gayriresmi uç noktasıyla çalışma anında makine çevirisi, atıfsız (`daily.ts:~29-36`).
- Yakındaki Camiler: konum yokken sonsuz spinner, ağ hatası "cami yok" gibi görünüyor, arama sorgusu Türkçe "Cami" (`NearbyMosquesModal.tsx:36,47,69`, `mosqueService.ts:~92`).
- Nominatim kullanıcı-ajanında uydurma e-posta, hata sessiz yutuluyor (`CitySearchModal.tsx:~131`).
- Ayarlar: hesaplama yöntemi açıklamasız, bildirim reddedilince sistem ayarını açma yolu yok, gizlilik politikası bağlantısı ve "Bizi puanla" yok.
- iOS izin metinleri yalnızca Türkçe.

### Gözlemlenebilirlik (silme sebebini ölçmek için)
- `onboarding_permission` içinde `granted: boolean`. Firebase yalnızca string/sayı kabul eder, boolean atlanabilir. `granted` ve `type` custom dimension yapılmalı.
- Eksik olaylar: `location_result` (neden), `notification_permission_result`, `onboarding_skipped`, `onboarding_abandoned`, `first_prayer_screen_shown`, `time_to_first_content_ms`. Kullanıcı özellikleri: `app_language`, `calc_method`, `notif_enabled`.
- `onboarding_step_*` modal yeniden açılınca tekrar sayılabilir. `selected_city` konum düzeyinde kişisel veri. `first_open` ayrılmış ad, `firebase_screen*` ayrılmış önek (`analyticsService.ts:42-54,94`).
- Prod'da her ekran görüntülemede `console.log`.

## Yayın, Play ve güvenlik
- EAS bulut build'i büyük olasılıkla çalışmaz: `withAndroidSigning.js` env yoksa fırlatıyor, `.jks` git'te değil. Sürüm kaynağı karışık (`appVersionSource: remote` + autoIncrement ile yerel build).
- Gizlilik politikası bağlantısı uygulama içinde yok. Data Safety formu konum, reklam kimliği, analiz, çökme günlüğü, FCM, serbest metin geri bildirim için doldurulmuş olmalı (Console'dan doğrulayın).
- UMP: çevrimdışı ilk açılışta `canRequestAds` yanlış kalabiliyor ve yeniden denenmiyor, reklam kaybı (`adsConsentService.ts:55-69`).
- `ezanapp://` deep link'i kısıtsız. `invite&ref=` doğrulanmadan saklanıp analytics'e gidiyor (`referralService.ts:55-61`): `^[A-Z2-9]{6}$` ile sınırlayın.
- Firestore kuralları repoda yok. Anonim `app_feedback` yazımı için kuralları (yalnızca create, boyut sınırı, App Check) Console'da doğrulayın. Firebase API anahtarı repoda açık (normaldir), paket adı ve SHA-1 ile kısıtlayın.
- Repo büyük olasılıkla herkese açık (VersionChecker raw.githubusercontent kullanıyor). İzlenen `adblog.txt` (4.5 MB logcat) kaldırılmalı, proje kökündeki `.jks`/`.pem` dosyaları repo dışına taşınmalı. `androidUrl` doğrulamasız `Linking.openURL`'e gidiyor (`VersionChecker.tsx:~110`), `https://play.google.com/` ile sınırlayın.
- `react-native-google-mobile-ads` `^16.0.0` iken yama `16.4.0` için: tam sürüme sabitleyin. `react-native-nitro-modules` package.json'da yok (geçişli bağımlılık). x86/x86_64 ABI'leri üretimde gereksiz.
- İki bildirim yığını (expo-notifications + notifee): çift kanal/izin riski.

## P2 (özet)
Gün anahtarı UTC (`daily.ts:50`, Türkiye'de 3 saat erken devir). `Dimensions.get` modül yüklenirken (yatay/katlanır cihazlarda bozuk). Font ölçeği ve RTL. Kullanılmayan ~389 çeviri anahtarı. Emojili arayüz metinleri. Hicri tarih kaynağı ekranlar arası 1 gün sapabilir. Kuran indirmesi yarıda kalırsa 'Downloading' takılı kalır. Çoğu `t()` varsayılanı Türkçe. Ayet sesinde duraklat/devam yok.

## Önerilen uygulama sırası
1. **Hızlı ve yüksek etki:** R1 (çeviri placeholder + CI kontrolü), R2 + R3 (Ayarlar'da konum, GPS'in kilitlenmemesi), R5 (konum tahmini), R6 + R7 (varsayılan tam ekran ve tema).
2. **Ölçüm ve uyum:** R9 (AB rıza varsayılanı), analytics olay düzeltmeleri.
3. **Daha büyük, ayrı test gerektirir:** R4 (saat dilimi), alarm penceresi (8 gün sorunu).
4. **Sonra:** R8 (Kuran sesi hata yönetimi), kıble, mezhep ayarı.

## Doğrulama sınırları
Emülatör debug build 1.0.30, ağ yavaş/kısıtlıydı (zaman aşımları doğal), GPS sabit konum verilmediği için konum zaman aşımı yolunu test ettim. Ajan bulgularının çoğu çalıştırılmadı. Belirsiz olanlar raporlarda "uncertain" işaretli, burada özetlenmedi.
