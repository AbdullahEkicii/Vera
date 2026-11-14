# Vera: Erken Silinme (Uninstall) Analizi

Tarih: 2026-10-15 · Sürüm: 1.0.32 (vC34) · Yöntem: kod denetimi + emülatörde temiz kurulum akışı

## 1. Özet

Veri: 5 kurulumdan ~4'ü kısa sürede siliniyor. GA4'te `ad_failed` olayları 3 kullanıcıdan geliyordu, yani örneklem çok küçük. İstatistiksel kesinlik yok, ama kodda ve ilk açılış akışında **somut, düzeltilebilir sürtünme noktaları** var. Silme sebebi büyük olasılıkla bunların birleşimi:

1. **İlk açılış ekranı hatalı/korkutucu görünüyor** (doğrulandı, emülatörde görüldü).
2. **Varsayılan bildirim ayarları çok agresif**: günde 10 alarm tipi bildirim, sessiz modu ve DND'yi aşıyor.
3. **Mağaza sayfasında şüpheli izinler görünüyor**: mikrofon, "diğer uygulamaların üzerinde çiz", depolama.
4. **Çok fazla reklam ve boş reklam kartları.**
5. **Kapatılamayan bildirimler** (kalıcı "sıradaki vakit", günlük içerik, Kuran hatırlatması) için uygulama içi anahtar yok.

Not: Emülatördeki kurulu sürüm 1.0.30 **debug** build'i. Reklam ve performans davranışı için temsil edici değil, sadece akış/UI için kullanıldı.

## 2. Emülatörde doğrulananlar

| # | Gözlem | Kanıt |
|---|---|---|
| E1 | Temiz kurulumda, izin hiç sorulmadan "Mevcut Şehir: Konum Alınamadı (İzin Verilmedi)" yazıyor. Alt düğme: "Konum Alınamadı (İzin Verilmedi) İle Devam Et". | ekran görüntüsü s6 |
| E2 | "İzin verme" seçilince kırmızı hata kutusu çıkıyor, ama ekran aynı kalıyor ve "Konum Alınamadı" yazısı duruyor. | s8 |
| E3 | Arka plandaki ana ekran İstanbul gösteriyor (saat dilimi tahmini), tarih alanı "--". Yani yanlış şehir sessizce gösteriliyor. | s6 |
| E4 | Native splash ikonu sekizgen/kırpılmış maske içinde görünüyor (adaptive icon kenar boşluğu). | s1 |
| E5 | Manifestte `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` var. | `android/app/src/main/AndroidManifest.xml:7-15` |
| E6 | Varsayılan: 5 vakit için hem tam ezan hem 25 dk önceki uyarı açık, `respectSilentMode: false`. | `notificationService.ts:36-52` |
| E7 | Ezan kanalı `USAGE_ALARM` + `setBypassDnd(true)`. | `AlarmChannelModule.kt:54,62` |

## 3. Bulgular

### P0: Büyük olasılıkla silme sebebi

**1. Agresif ve yüksek sesli varsayılan bildirimler**
- Günde 10 alarm tipi bildirim (5 ezan + 5 erken uyarı). Alarm ses akışı, sessiz mod ve Rahatsız Etme'yi aşıyor.
- Sabah ~04:00-05:00 ilk sesli ezan veya toplantıda çalan ezan, anında silme sebebi.
- Onboarding adım 2 yalnızca "bildirim aç/kapat" soruyor, sessiz modu aşmayı söylemiyor.
- Çözüm: `respectSilentMode` varsayılanı `true`; 25 dk uyarıları varsayılan kapalı; `bypassDnd` varsayılan kapalı. Onboarding'de açık soru: "Telefon sessizdeyken de ezan çalsın mı?"

**2. Şüpheli izinler (mağaza sayfasında görünür)**
- `RECORD_AUDIO` (mikrofon) `expo-audio` eklentisinden geliyor; uygulama yalnızca ses çalıyor.
- `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` gereksiz.
- Çözüm: `app.json` içinde `["expo-audio", {"recordAudioAndroid": false}]` ve `android.blockedPermissions` listesine dört izni ekle, sonra prebuild. `ACCESS_FINE_LOCATION` yerine yalnızca coarse yeterli olabilir.

**3. İlk açılış konum ekranı karışık**
- `WelcomeOnboardingModal.tsx:249-250`: `currentCity === 'İstanbul'` "ayarlanmamış" sayılıyor, ama Türk kullanıcıların saat dilimi tahmini İstanbul. İzin sorulmadan hata metni çıkıyor.
- Atla düğmesi hata metnini şehir adı gibi kullanıyor.
- Çözüm: nötr durum ("Konum seçilmedi") + iki net düğme (otomatik bul / listeden seç). "X ile devam et" düğmesini kaldır veya gerçek fallback şehri göster.

**4. GPS verildiği halde "konum alınamadı" gösterilebiliyor**
- `getCurrentPositionAsync` zaman aşımsız (`:81-84`); `reverseGeocodeAsync` korumasız (`:86`). Google geocoder olmayan/çevrimdışı cihazda geçerli koordinatlar atılıp hata gösteriliyor.
- Çözüm: geocode'u try/catch'e al, "Mevcut konum" etiketiyle koordinatları koru; 6-8 sn zaman aşımı ekle.

**5. Namaz vakti ağ çağrısında zaman aşımı yok**
- `api.ts:225-247`: iki ardışık fetch, `AbortController` yok. Yeni kurulumda önbellek olmadığı için kötü bağlantıda ilk içerik "Yükleniyor…" ekranında kalıyor.
- Çözüm: 6-8 sn'de iptal et, cihaz içi hesaplamaya (`adhan`) düş; önce yerel tahmini göster, sonra API ile iyileştir.

### P1

**6. Boş reklam kartı kalıcı.** `BannerAdSlot.tsx`: `minHeight: 56` kart, reklam gelmeyince (özellikle Fas/Malezya gibi düşük dolgu bölgelerinde) boş çerçeve olarak kalıyor. Çözüm: ilk başarılı yüklemeye kadar yüksekliği 0 yap.

**7. Reklam yoğunluğu yüksek (~19 yuva).** Ayarlar'da 2, Kuran'da 3, Hava'da 2. Çözüm: ekran başına en fazla 1.

**8. Kalıcı "sıradaki vakit" bildirimi** varsayılan açık, kaydırılamıyor, onboarding'de anlatılmıyor, vakit geçince eskiyebiliyor.

**9. Günlük içerik, Kuran hatırlatması, tebrik ve FCM duyuruları için uygulama içi anahtar yok.** Bildirimler birikince kullanıcı tek çıkış yolu olarak uygulamayı siliyor. Çözüm: Ayarlar'a anahtarlar; Kuran hatırlatması ve günlük içeriği varsayılan kapalı yap.

**10. Çevrimdışı/eski önbellek yanlış şehri gösterebilir** (`api.ts:262-272`): fallback konum/ay/yöntem kontrolü yapmıyor.

**11. "Doğrulanmış vakitler" rozeti** saat dilimi tahmini şehirde de görünüyor (`index.tsx:1111-1120`).

**12. Kapatılamayan şehir modalı.** İzin reddi veya GPS zaman aşımı sonrası `CitySearchModal` kapatılamıyor, geri tuşu da çalışmıyor; arama Nominatim'e bağlı, çevrimdışı işe yaramıyor. Çözüm: kapatılabilir yap, "Şimdilik İstanbul" seçeneği ver.

**13. `android/` klasörü git'te yok.** `AlarmChannelModule.kt`, `PrayerAlarmReceiver.kt`, widget kodu yalnızca yerelde. Temiz checkout/EAS build'de widget ve alarm kanalı sessizce kaybolur, ezan sessiz modu dinleyen standart kanala düşer. Çözüm: Kotlin kaynaklarını config plugin ile sürüme al. (Üretim build'lerinin nasıl alındığı doğrulanamadı.)

### P2

14. Yapay açılış gecikmesi ~1.4 sn (`AnimatedSplashScreen.tsx:61-69`); 600-800 ms'ye indir veya ilk açılıştan sonra atla.
15. Her açılışta ~40 bildirim kanalı silinip yeniden oluşturuluyor ve onboarding'den önce bekleniyor (`index.tsx:351-378`).
16. 5. açılışta puanlama + widget tanıtımı + izin istemleri üst üste biniyor.
17. `quran-husrev.ttf` (1.6 MB) kullanılmıyor gibi; `adhan.mp3` ve `adhan_25minutes.mp3` aynı boyutta (muhtemelen kopya).
18. `USE_EXACT_ALARM` Play politikası açısından inceleme riski taşıyor.
19. `ErrorBoundary` "Tekrar Dene" aynı ağacı yeniden çiziyor, deterministik çökme döngüye giriyor.
20. Widget adları ve "Duyurular" kanal adı Türkçe sabit.

### Sorun olmayanlar
i18n (35 dilde 0 eksik anahtar), asset boyutu (toplam 3.6 MB), OTA kapalı, widget/arka plan pil etkisi ihmal edilebilir, ezan alarmı `SET_ALARM_CLOCK` ile Doze'da güvenilir, reklam ve rıza onboarding sonrasına ertelenmiş.

## 4. Önerilen sıra

1. **Bir sürümde (hızlı kazanım):** P0-1 (sessiz mod varsayılanı), P0-2 (izinler), P0-3/4 (onboarding konum metni + geocode koruması), P0-5 (fetch zaman aşımı), P1-6 (boş reklam kartı).
2. **Sonraki sürüm:** P1-7/8/9 (reklam sayısı, bildirim anahtarları ve varsayılanları), P1-12.
3. **Altyapı:** P1-13 (native kodu sürüme al).

## 5. Gerçek sebebi veriyle bulma

Kod denetimi sebep adayı üretir; hangisinin baskın olduğunu veri söyler:

- **Play Console → İstatistikler → Kaldırmalar**: kurulumdan kaç gün sonra siliniyor? Aynı gün silinme = ilk açılış/izin/ses; 1-3 gün sonra = bildirim/ezan sorunu.
- **Play Console → Android vitals**: çökme ve ANR oranı, cihaz/sürüm kırılımı.
- **Crashlytics**: ilk oturumdaki çökmeler.
- **GA4 onboarding hunisi** (olaylar zaten loglanıyor): `onboarding_step_1` → `onboarding_permission` (`type: location/notification`, `granted`) → `onboarding_step_2` → `onboarding_completed`. Hangi adımda kayıp var? `onboarding_permission` için `granted` ve `type` custom dimension olarak kaydedilmeli.
- **Oturum süresi**: `user_engagement` ve `screen_view` sayısı kurulum başına; hiç `onboarding_completed` olmayanlar ilk ekranda çıkıyor demektir.
- **Mağaza yorumları ve Play "geri bildirim"** metinleri.
- Uygulamaya **silme anketi** koymak mümkün değil; yerine ilk 7 günde bir kez "bir sorun mu var?" geri bildirim yolu eklenebilir.

## 6. Doğrulama sınırları

Emülatör testi yalnızca 1.0.30 debug build'inde, izin reddi yoluyla yapıldı. İzin verme yolu, bildirim izni adımı, gerçek ezan sesi seviyesi ve release build'deki reklam davranışı gerçek cihazda doğrulanmadı.
