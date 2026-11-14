# Kullanıcı tutma, topluluk, reklam ve güven raporu

Tarih: 2026-11-14 | Kapsam: kod denetimi (ilgili dosya:satır referansları ile), `docs/reklam-ve-elde-tutma-raporu-2026-11-13.md`, `docs/topluluk-canlandirma-raporu-2026-11-13.md`, `docs/retention-audit-2026-10-15*.md`, `docs/store-listing/*` | Durum: analiz. Kod değiştirilmedi.

Not: Bu rapor bir kod denetimidir. AdMob, Play Console, Firebase verisine erişim yok; "doğrulanmadı" diye işaretlenen her madde cihaz, konsol veya build çıktısında teyit edilmelidir.

---

## 0. Özet

1. **Dünya genelinde indirme var, kalıcılık yok.** Tek kesin sebep kodda görünmüyor. Kanıtlı beş aday var (Bölüm 3). En güçlü iki aday: (a) ezan alarmının Kotlin kodu git'te izlenmiyor ve bulut build'de eksik kalabilir, (b) bildirim ve vakit güvenilirliği (8 günden uzun açılmayan kullanıcı, pil optimizasyonu, eşleşmeyen bölgede tahmini konum). Hangisinin baskın olduğu Play Console'daki **ülke × gün kaldırma** verisiyle ayrılır.
2. **Reklam: istek sayısı şişiyor.** Her sekme dönüşünde `BannerAd` yeniden mount oluyor ve her mount yeni bir reklam isteği. Görünmeden biten istekler gösterim oranını düşürüyor. Tüm yerleşimler tek birimde, bu yüzden AdMob'da ekran bazında teşhis de yapılamıyor.
3. **Topluluk: önce güven, sonra özellik.** Otomatik gönderiler rastgele ülke ve rastgele zikir sayısı ile gerçek kullanıcı gönderisi gibi yazılıyor. Bu kapatılmadan yeni topluluk özelliği eklemek riskli.
4. **Profil: şimdi tam profil değil.** Kimlik modeli anonim, dini ibadet verisi özel nitelikli veri, moderasyon yükü yüksek. Öneri: özel bir "Benim" özet sayfası şimdi; takma ad ve ülke rozeti ancak Ramazan sonrası ve A/B ile.
5. **Güven: en acil eksik gizlilik politikası linki.** `PRIVACY_POLICY_URL` boş (`src/config/links.ts:6`), bu yüzden uygulama içinde politika bağlantısı gösterilmiyor. Ayrıca "doğrulanmış vakitler" ifadesi, resmi kaynak izlenimi veren Diyanet adı ve gayriresmi bir çeviri uç noktası güven açısından düzeltilmeli.

---

## 1. Yöntem ve sınırlar

- Kod okundu, her madde için dosya:satır verildi.
- 2026-10-15 ve 2026-11-13 raporlarındaki maddeler kodla tek tek karşılaştırıldı. Kapanan maddeler Bölüm 2'de işaretli.
- Doğrulanmadı: cihazda çalışma, release build içeriği, AdMob/Firebase/Play verisi.
- Rakam yorumu: Bölüm 4.1'de verilen reklam oranları, senin verdiğin sayılardan hesaplandı.

---

## 2. Önceki raporlardan ne kapandı, ne açık

| Madde | Durum | Kanıt |
|---|---|---|
| Sessiz mod ezanı sessizce aşıyordu | Kapandı. Varsayılan `respectSilentMode: true` | `src/services/notificationService.ts:77` |
| 25 dk erken uyarılar varsayılan açıktı (günde 10 alarm) | Kapandı. Opt-in | `notificationService.ts:65`, `:81` |
| Mikrofon izni (`RECORD_AUDIO`) | Kapandı. Engellendi | `app.json:39`, `:96` (`recordAudioAndroid: false`) |
| Sistem teması sessizce açık tema oluyordu | Kapandı. Yeni kurulum sistemi izler | `src/context/ThemeContext.tsx:51`, `:84` |
| Hicri/vakit saat dilimi karışıklığı | Kapandı. Verinin kendi `meta.timezone` değeri kullanılıyor | `src/services/api.ts:591-606`, `notificationService.ts:281` |
| Hanefi ikindi ayarı yoktu | Kapandı | `src/app/(tabs)/settings.tsx:632-666` |
| Güven rozeti tahmini konumda da görünüyordu | Kapandı. Tahmin ve yaklaşık vakitte gizli, ilk 15 açılışla sınırlı | `src/app/(tabs)/index.tsx:1111` |
| ATT ve UMP durumu kullanıcı özelliği olarak yazılmıyordu | Kapandı | `adsConsentService.ts:114-118` |
| Konum seçimi kalıcı kilit (`MANUAL_LOCATION` yanlışlıkla yazılıyordu) | Kapandı | `WelcomeOnboardingModal.tsx:155-158`, `useLocation.ts:453-457` |
| Yöntem sadece cihaz bölgesinden seçiliyordu | Kısmen. Konuma göre güncelleniyor (`updateMethodForLocation`), şehir tablosu ~80 ülke | `src/utils/calcMethod.ts` (`updateMethodForLocation`), `src/hooks/useLocation.ts:18-107` |
| Konum eşleşmezse İstanbul | Açık (tahmin). Tabloda olmayan ülkede İstanbul düşüyor | `src/hooks/useLocation.ts:213` |
| AB/UK analitik rızası | Kısmen. `setConsent` uygulanıyor, ama varsayılan analitik izni açık başlıyor | `consentPropagation.ts:11-22`, firebase.json (yorum `consentPropagation.ts:12-14`) |
| Yerel Kotlin alarm kodu | **Açık, yüksek risk.** Bkz. Bölüm 3, A1 | `.gitignore:48-49`, `android/app/src/main/java/com/abdllhekc/vera/AlarmChannelModule.kt` |
| Gizlilik politikası linki uygulamada | **Açık, yüksek.** URL boş | `src/config/links.ts:6`, `settings.tsx:1381` (koşullu gösterim) |
| Reklam yerleşimi başına birim | **Açık.** Harita boş | `src/components/BannerAdSlot.tsx:15` (`AD_UNIT_OVERRIDES = {}`) |
| Sekme dönüşünde reklam isteği | **Açık.** Bkz. Bölüm 4 | `BannerAdSlot.tsx:201`, `:218` |
| Otomatik topluluk gönderileri | **Açık, kritik.** Bkz. Bölüm 5.2 | `functions/autoPublishCore.js:156-160` |
| Topluluk raporlarına yanıt/gizleme | **Açık.** Raporlar yalnız yazılıyor | `docs/topluluk-canlandirma-raporu-2026-11-13.md:30` (kodda doğrulandı) |
| Günlük içerik çevirisi (gayriresmi Google uç noktası) | **Açık.** | `src/utils/daily.ts:41` |
| `Vera_version_control.json` eski | **Açık, küçük.** `latestVersion: 1.0.35` | `Vera_version_control.json:2` |

Sonuç: Önceki raporların ölçüm ve kullanıcı akışı maddelerinin çoğu kapanmış. Açık kalan en önemli iki kalem **alarm native kodunun kaynağı** ve **topluluk içeriğinin dürüstlüğü**.

---

## 3. Dünya genelinde indirme var, geri gidiyor: aday sebepler

Kanıtlanmış bir tek sebep yok. Aşağıdaki adaylar kodda izlenebilir. Sıralama, kullanıcıya etkisi ile kanıt gücünün birleşimi.

| # | Aday | Kod kanıtı | Neden silinme olur | Durum | Nasıl doğrulanır |
|---|---|---|---|---|---|
| **A1** | **Ezan alarm native kodu git'te yok** | `.gitignore:49` (`/android`). `git ls-files android` boş. `AlarmChannelModule.kt`, `AlarmChannelPackage.kt`, `PrayerAlarmReceiver.kt` yalnız yerelde. `plugins/` altında alarm plugin'i yok. JS tarafı yoksa standart kanala düşüyor: `notificationService.ts:152-165` | Bulut build veya temiz checkout'ta ezan sesi, alarm akışı ve Rahatsız Etme davranışı değişir. Kullanıcı "ezan çalmadı" der | **Yüksek olasılık, doğrulanmadı.** EAS CLI varsayılan olarak `.gitignore`'a uyar | Store'daki sürümün AAB/APK'sinde `AlarmChannelModule` sınıfını ara (`unzip -l` veya `bundletool`). Build loglarında `prebuild` adımını kontrol et |
| **A2** | **Alarm güvenilirliği: 8+ gün açılmayan kullanıcı, pil optimizasyonu** | Pencere 7 gün, yenileme en iyi çabayla çalışan arka plan görevinde (round-2 raporu: `notificationService.ts:433,447`, `backgroundTaskService.ts:44-47`). Xiaomi, Huawei, Oppo gibi üreticilerde görev öldürülüyor. Round-2 raporu: `docs/retention-audit-2026-10-15-round2.md` | Ezan kurulu ama çalmaz; kullanıcı uygulamayı silmek ister. Asya ve Ortadoğu'da Android payı yüksek, bu yüzden dünya geneli etkisi büyük | Açık | Play vitals ve Firebase'de cihaz üreticisi × D7. `BatteryOptimizationCard` gösterim sayısı |
| **A3** | **Konum ve vakit tahmini** | Tabloda olmayan ülke ve saat diliminde İstanbul (`useLocation.ts:213`). Konum izni verilmezse hangi şehrin vakti görüneceği cihazda doğrulanmadı | Yanlış şehrin vakti, 2–4 saat kayık, yanlış alarm. Kullanıcı "vakitler yanlış" der | Kısmen düzeltilmiş. ~80 ülke eşleşiyor | Play'de ülke × kaldırma. Tabloda olmayan ülkelerde D1 |
| **A4** | **İlk açılış izin yükü** | Konum, bildirim, iOS ATT ve UMP art arda. Beşinci açılışta puanlama, widget tanıtımı ve izinler üst üste (`index.tsx:1089`, round-1 P2-16). Onboarding konum metni için round-1 P0-3 | İlk değeri görmeden kapatma | Kısmen | Firebase huni: `onboarding_step_*` → `onboarding_completed`, ülke bazında |
| **A5** | **Reklam yoğunluğu ve boş alan** | 17 yerleşim (Bölüm 4). Ana sayfa, hava durumu ve tesbih `lazy={false}` ile mount'ta istek atar (`index.tsx:1145`, `weather.tsx:304`, `TasbihScreen.tsx:432`). Reklam dolunca kart 0'dan ~56 px'e sıçruyor (`BannerAdSlot.tsx:24`, `:261`; dolmadan kart şeffaf, boş çerçeve yok). Düşük doldurma ülkelerinde kart iki deneme sonra çöker | Düşük eCPM ülkelerde reklam deneyimi, gelir düşük; kullanıcı kötü deneyim yaşar | Kısmen (ekran başına en fazla 1 yuva yapıldı) | AdMob ülke × show rate. Firebase `ad_loaded`/`ad_failed` ülke bazında |
| **A6** | **Mağaza beklentisi ve dil** | Mağazada 33 dil, uygulamada 34 dil. Desteklenmeyen dizelerde İngilizce'ye düşüş (`PRODUCT.md`, "Localization"). Türkçe terimler (İmsak, Hatim, Kaza) tüm dillerde kullanılıyor (bilinçli karar, `PRODUCT.md`) | Kurulumdan sonra "bu uygulama bana göre değil" hissi | Hipotez | Ülke × `app_language` ile D1. Desteklenmeyen dize sayısı |
| **A7** | **Güven sinyali eksikliği** | Gizlilik politikası linki yok (Bölüm 6). Veri kaynakları ve çeviri atıfı yok | Uygulamayı kötü bulan kullanıcı yorum yazar, mağaza puanı düşer, yeni kurulum azalır | Açık | Mağaza yorumlarında "güven/gizlilik/yanlış vakit" kelimeleri |

**Yorum.** A1 ve A2 birlikte düşünülmeli: ezan alarmı, uygulamanın tek kritik vaadi (`PRODUCT.md`, ilke 1: "adhan alert must never silently fail"). Bu vaat dağıtılan build'de tutmuyorsa diğer tüm iyileştirmeler ikinci planda kalır. Bu yüzden A1 doğrulanması, bu raporun en acil işidir.

**Kaldırma verisinin okunma yöntemi (Play Console → İstatistikler → Kaldırmalar):**
- Kurulumdan aynı gün silinme: ilk açılış, izin veya ses sorunu (A3, A4).
- 1–3 gün sonra silinme: bildirim ve ezan sorunu (A1, A2).
- 7+ gün sonra silinme: içerik ve alışkanlık sorunu (A6, A7).
- Ülkeye göre dağılım, A3 ve A6 için en net ayrıcı verir.

---

## 4. Reklam: 49 istek, 16 gösterim

### 4.1 Sayıların yorumu

Verdiğin değerler: 49 istek, 16 gösterim, eşleşme oranı %51.

| Okuma | Eşleşen istek | Gösterim | İstek başına gösterim | Eşleşen başına gösterim | Kayıp |
|---|---|---|---|---|---|
| Eşleşme = %51 (AdMob "match rate") | ~25 | 16 | %33 | %64 | ~24 doldurulmadı, ~9 gösterilmedi |
| Gösterim/eşleşme = %51 (AdMob "show rate") | ~31 | 16 | %33 | %51 | ~18 doldurulmadı, ~15 gösterilmedi |

Tanımlar AdMob konsolunda kontrol edilmeli. İki okumada da kayıp iki yerde: **doldurmama** ve **gösterilmeme**. Hangi okumanın doğru olduğu gösterimi ayırır, ama kod tarafında düzeltilmesi gereken iki kaynak zaten belli.

Dikkat: 49 istek, reklam birimi sayısı değil, mount sayısıdır. Aşağıdaki kod analizi, bu sayının neden bu kadar yüksek olabileceğini gösteriyor.

### 4.2 Kök nedenler (kodla doğrulandı)

**R1. Her sekme dönüşü yeni istek.** `BannerAdSlot.tsx:201`: `!shouldBeActive` olduğunda bileşen `null` döndürüyor, bu da `AdInstance`'ı unmount ediyor. Sekmeye dönüşte `ready` true kaldığı için (`:169`) `AdInstance` yeniden mount oluyor, `logAdRequest` (`:59-61`) ve `BannerAd` yeniden istek atıyor. Yani görünmeden biten her sekme geçişi bir istek üretiyor.

**R2. Görünürlük toleransı.** `:130` görünürlük toleransı alttan +80 px, üstten -50 px. Ekran dışına yakın slot istek atıyor, kullanıcı görmeden kaydırıyor. `lazy={false}` olan üç yerleşim (`index.tsx:1145`, `weather.tsx:304`, `TasbihScreen.tsx:432`) mount'ta istek atıyor, görünür alan dışında olsa bile.

**R3. Tek birim.** `BannerAdSlot.tsx:12` tüm yerleşimler için aynı birim, `:15` harita boş. AdMob'da ekran bazında doldurma ayrımı yapılamıyor. Hangi ekranın doldurmadığı görünmüyor.

**R4. Yeniden deneme bütçesi.** `:30-33`: iki hızlı, bir yavaş deneme. Bir slot örneği için en fazla 4 istek. Yavaş deneme ekran açıkken çalışır (`:157-163`). Bu makul, ama R1 ile birleşince sayı büyüyor.

**R5. Konsept boşluğu.** `onPaid` ile değer loglanıyor (`:78`), ama gösterim (impression) olayı loglanmıyor. Gösterim sayısı yalnız AdMob konsolunda görünüyor.

### 4.3 Düzeltme önerileri (öncelik sırasıyla)

| # | Öneri | Dosya | Efor | Kabul ölçütü |
|---|---|---|---|---|
| 1 | Mount'u koru: sekme değişiminde `null` döndürmek yerine reklamı gizle (yükseklik 0, konum dışı) ya da son başarılı reklamı 60 sn içinde yeniden kullan. Yenileme kuralını AdMob'un güncel banner politikasına göre ayarla | `BannerAdSlot.tsx:201`, `:218` | S–M | `ad_request / ad_loaded` oranı yükselir; aynı ekrana kısa sürede dönüşte yeni istek yok |
| 2 | `lazy={false}` olan üç yerleşimi görünür olduğunda isteyecek şekilde değiştir | `index.tsx:1145`, `weather.tsx:304`, `TasbihScreen.tsx:432` | S | Mount sayısı düşer; kaydırılan kartlar istek atmaz |
| 3 | Yerleşim başına birim: AdMob'da 4–5 birim (ana ekran, listeler, araçlar, Kuran, ayarlar) aç ve `AD_UNIT_OVERRIDES`'ı doldur | `BannerAdSlot.tsx:15` | S (konsol + kod) | AdMob'da ekran bazında doldurma ve gösterim görünür |
| 4 | Gösterim olayı: SDK'nın sağladığı impression callback'i varsa `ad_impression` logla. Yoksa AdMob raporuyla karşılaştır | `BannerAdSlot.tsx` | S | `ad_request` ile `ad_impression` farkı ölçülür |
| 5 | Yükseklik sıçraması: dolunca kart 0'dan ~56 px'e atlıyor. Yumuşak geçiş (animasyon) veya ilk dolumdan önce yer ayırma tercihi, ürün kararı | `BannerAdSlot.tsx:24`, `:257-261` | S | Açılışta görünür sıçrama yok (ya da bilinçli tercih olarak belgelenmiş) |
| 6 | Reklam yoğunluğu A/B (Bölüm 4.4) | — | M | Kaldırma ve D7 ile gelir birlikte ölçülür |

Ekran başına en fazla bir reklam yuvası kuralı zaten sağlanıyor (her ekranda bir aktif slot; Kuran'da iki slot farklı sekmelerde). Bunu koruyun.

### 4.4 Gelir ve elde tutma dengesi

- Reklam azaltımı kısa vadede gelir düşürür. Uzun vadede D7 ve kaldırma oranını iyileştirebilir. İkisi kod tarafından ölçülemez, A/B gerekir.
- `PRODUCT.md` ibadet ekranlarında reklamı sınırlamayı öneriyor. Test bu ekranlar dışında (araçlar, listeler) başlatılmalı, ibadet ekranlarında değil.
- Gelir tahmini yapmıyorum: AdMob'daki eCPM ve ülke kırılımı olmadan sayı uydurmak olur.

---

## 5. Topluluk

### 5.1 Mevcut durum (kodda doğrulandı)

- Görünümler: "Bugün", "Son 7 gün", "Benim" (`src/components/CommunityScreen.tsx`). 30 sn yenileme, 20'lik sayfa.
- Tepkiler: 🤲 ❤️ 🎉 🌙 ⭐ (işlem ile sayaç).
- Kimlik: anonim Firebase Auth (`communityService.ts:83-85`). Görünen ad yok. Gönderide yalnız `templateKey`, `params`, `lang`, `authorUid`, tepki sayıları (`communityService.ts:50-58`). Ülke bayrağı/adı `params.country` ile gösteriliyor (`CommunityScreen.tsx:393`, `:423`).
- Engelleme: yalnız cihazda (`blockedUids`, `communityService.ts:39-40`).
- Raporlar: yazılabiliyor (`reportPost`, `CommunityScreen.tsx:353-357`), ama inceleme, gizleme veya sunucu tarafı engelleme yok.

### 5.2 Acil: otomatik gönderiler dürüst değil

`functions/autoPublishCore.js`:
- `:156` ve `:157`: her otomatik gönderide dil ve ülke rastgele seçiliyor (`pickLanguageAndCountry`). Gerçek kullanıcının ülkesi değil.
- `:160`: zikir gönderisinde `count` rastgele bir eşikten seçiliyor (100, 500, 1000 ...). Gerçek bir zikir sayısı değil.
- `:162-163`: başarım başlığı rastgele seçiliyor.
- `source: 'auto'` alanı yazılıyor, ama `src/` içinde bu alana bakan kod bulunamadı. Gönderi istemcide gerçek gönderiyle aynı görünüyor.

Sonuç: "Egypt'ten biri 1000 zikir çekti" gibi gönderiler, kimsenin yapmadığı bir ibadeti gerçekmiş gibi gösteriyor. Plan (`docs/sosyal-akis-plani-2026-10-21.md`) "Sahte paylaşım yok" diyor. Bu koşul sağlanmıyor. Mağaza politikası (yanıltıcı içerik) ve kullanıcı güveni açısından kritik.

**Önerim:**
1. Otomatik yazarı kapat (`functions/index.js` içindeki zamanlanmış fonksiyon). Bu bir dağıtım kararı, senin onayınla yapılmalı.
2. Yerine yalnız "Vera" etiketli, gerçek veri içermeyen içerik (tek cümle günlük mesaj zaten var, `CommunityScreen.tsx:558`).
3. Gerçek toplu sayaç, yalnız eşik üstünde (örn. 50+ paylaşım), Bölüm 5.4'te.

### 5.3 Moderasyon (Faz A3, hâlâ açık)

- Raporlara yanıt ve gizleme yok. `status: 'hidden'` alanı yok.
- Engelleme yalnız cihazda. Engellenen yazar başka cihazdan yine görünür.
- Google Play ve Apple, UGC uygulamalarından raporlara zamanında yanıt ve engelleme bekliyor. Mağaza reddi riski.
- Minimum: `reports` koleksiyonunu okuyan bir Cloud Function (eşik: 3 rapor → `hidden`), basit bir admin ekranı ya da Firebase Console kuralı, sunucu tarafı engelleme (`blockedUids` Firestore'da da).

### 5.4 Yeni özellikler: değer, efor, risk

Mevcut iki raporun (`topluluk-canlandirma-raporu-2026-11-13.md`, `sosyal-akis-plani-2026-10-21.md`) önerileri kodla karşılaştırıldı. Ek olarak bir öneri ekledim (Ortak hatim halkası).

| Özellik | Değer | Efor | Risk | Karar |
|---|---|---|---|---|
| **Ortak hatim halkası** (Ramazan): cüz üstlenme, toplam ilerleme, gerçek veri. `hatimService.ts` var | Çok yüksek, Ramazan için en güçlü | M | Düşük | **İlk öncelik** (Ramazan 2027 öncesi) |
| **Dua isteği**: kategori seçimi (sağlık, aile, imtihan, rızık, rehberlik, vefat), metin yok, 7 gün görünür, 🤲 "amin" | Yüksek, topluluk duygusu | M | Orta: hassas veri. Kategori dışında metin olmamalı, rapor ve gizleme şart | **İkinci öncelik** (Faz A3 bittikten sonra) |
| **Paylaşım merkezi**: topluluk başlığında "Ne paylaşmak istersin?" | Orta-yüksek, keşfedilebilirlik | S–M | Düşük | Üçüncü |
| **Dış paylaşım kartı**: `StoryCardShareModal` yeniden kullanımı. `ShareSource`'a `community` eklenir (`referralService.ts:32`, şu an `greeting \| story \| invite`) | Yüksek, büyüme | M | Düşük (kart Vera markalı) | Ramazan öncesi |
| **Niyet kartı** + haftalık yerel hatırlatma | Orta, geri dönüş | S | Düşük | Kolay kazanım |
| **Gerçek toplu sayaç** ("Bugün topluluk: 12 hatim") eşik altında gizli | Orta, canlılık | M (Cloud Function) | Eşik olmadan yanıltıcı. Eşik şart | Faz C |
| **"Benim" kişisel özet** (yerel, cihazda): ay sonu hatim, zikir sayısı, paylaşılabilir kart | Orta, cihazda kalır | S | Düşük | Kolay kazanım |

Ortak hatim halkası için kısa tarif: Ramazan'ın 30 cüzünü kullanıcılar üstlenir, her cüzün durumu gerçek zamanlı görünür, tamamlanan cüzde küçük bir tebrik gelir. Bu hem topluluk hem hatim alışkanlığını birleştirir. Ramazan takvimi ile zamanlanabilir.

Dikkat: dua isteği ve ortak hatim, dini hassasiyet barındırır. Metin serbest bırakılmamalı; yalnız şablon ve kategori.

### 5.5 Profil: getirmek mantıklı mı?

Varsayım: "profil getirmek" = topluluğa kullanıcı profili eklemek (ad, foto, biyografi, rozet, takipçi). Şu anki karar: **tam profil şimdi değil.**

Gerekçeler, kod kanıtıyla:

1. **Kimlik kırılgan.** Kimlik anonim Firebase Auth (`communityService.ts:83-85`). Uygulama silinip kurulduğunda uid değişir. Profil bu uid'e bağlanırsa kaybolur. Kalıcı profil için Google/Apple ile hesap bağlama gerekir: sürtünme artar, hesap silme yükümlülüğü gelir.
2. **Veri özel nitelikli.** Profil, ibadet serisi (streak), hatim sayısı ve zikir gibi veriler içerir. Dini inanç, GDPR Art. 9 ve KVKK m.6 kapsamında özel nitelikli veri kategorisinde. Bir ibadet serisinin bu kategoriye girdiği yorumu hukuki değerlendirme ister; güvenli tarafta kalmak için açık rıza ve ayrı saklama planlanmalı. Hukuki görüş için avukata danış.
3. **Dini hassasiyet.** İbadetin herkese açık gösterilmesi bazı kullanıcılar için hassas bir konu olabilir (riyâ kaygısı). Gösterim isteğe bağlı kalmalı, varsayılan gizli.
4. **Moderasyon yükü.** Ad, foto ve biyografi, mevcut raporlama ve moderasyon eksiklerini büyütür (Bölüm 5.3). Önce bu kapatılmalı.
5. **Kazanç belirsiz.** Mevcut sorun (topluluk canlılığı, güven) profille çözülmüyor. Dua isteği ve ortak hatim daha düşük riskle daha fazla katılım getirir.

**Önerilen yol:**
- **Şimdi:** "Benim" kişisel özet sayfası (cihazda, Bölüm 5.4). Profil hissi, risk yok.
- **Ramazan 2027 sonrası, A/B ile:** isteğe bağlı takma ad ve ülke rozeti. Tam profil (foto, biyografi, takipçi) yok.
- **Hesap bağlama** ancak kalıcı profil kararı alındıktan sonra; mevcut anonim kimlik kalmalı.

---

## 6. Güven: kullanıcıya verilen sinyaller

| Sinyal | Durum | Kanıt | Öneri | Öncelik |
|---|---|---|---|---|
| **Gizlilik politikası linki** | Yok. URL boş, bu yüzden Ayarlar'da gösterilmiyor. Repo'daki yorum Play'in uygulama içinden erişim beklediğini yazıyor | `src/config/links.ts:3-6`, `settings.tsx:1381` | Politikayı yayınla, URL'yi ayarla, Ayarlar'a ve onboarding'e ekle. Play Data Safety formuyla birebir tutmalı | **P0** |
| **Gizlilik tercihleri (reklam rızası)** | Var | `settings.tsx:1367-1375` | Koru, ek olarak konum ve bildirim izinleri için de açıklama | Koru |
| **Analitik rıza sırası** | Firebase analitiği varsayılan açık başlıyor, UMP sonucu sonradan uygulanıyor | `consentPropagation.ts:12-14` (kod yorumu bunu kabul ediyor) | Varsayılanı kapalı yap; UMP sonucu sonrası aç. AB/UK kullanıcıları için hukuki değerlendirme | **P0** (AB/UK) |
| **Veri kaynakları** | Ayarlar'da yok. Aladhan (vakit), `adhan` kütüphanesi (çevrimdışı), Open-Meteo (hava), Nominatim (şehir arama), Google (çeviri) | `api.ts`, `useLocation.ts`, `CitySearchModal.tsx` | Ayarlar'a "Vakit verisi: …" satırı ve kaynak listesi | P1 |
| **"Diyanet İşleri" yöntem adı** | Yöntem adı olarak var. Hesap Diyanet açılarıyla (18°/17°) yapılıyor. Mağaza metninde "Diyanet verileri" iddiası kaldırıldı | `calcMethod.ts:14` (ad), `calcMethod.ts:31` (açılar), `docs/store-listing/rapor.md` | Adı koru ama "Diyanet hesap yöntemi" gibi tarif et, "resmi veri" izlenimi verme | P1 |
| **"Doğrulanmış vakitler" ifadesi** | "bölgeniz için doğrulanmış vakitler" yazıyor. "Doğrulanmış" resmi onay izlenimi veriyor | `index.tsx:1127` | "hesaplanmış vakitler" olarak değiştir | P1 |
| **Günlük içerik çevirisi** | Gayriresmi Google uç noktası ile dinî metin makine çevirisi, atıf yok, zaman aşımı 8 sn | `src/utils/daily.ts:41`, `:33-60` | İnsan onaylı çeviri paketlerine geç; yoksa kaynak dili göster; çeviri başlığını "otomatik çeviri" olarak etiketle | **P0** (dinî metin) |
| **Topluluk içeriğinin dürüstlüğü** | Otomatik gönderiler uydurma (Bölüm 5.2) | `autoPublishCore.js:156-163` | Kapat (Bölüm 5.2) | **P0** |
| **Rapor ve geri bildirim** | Rapor var, yanıt yok. Vakit uyuşmazlığı için geri bildirim linki var | `CommunityScreen.tsx:353`, `index.tsx:1104` | Yanıt kanalı, "bildirim alındı" durumu. Vakit uyuşmazlığı geri bildirimini geri dönüşle kapat | P1 |
| **Vakit doğruluğu iddiası** | "Çevrimdışı garanti" iddiası `PRODUCT.md`'de. Mağaza metninde "her zaman" dili varsa dikkat | `PRODUCT.md` (Positioning) | İddiayı test edilebilir tut: "Vakitler internet olmadan da hesaplanır" gibi | P2 |
| **Sürüm kontrolü** | `latestVersion: 1.0.35`. Yayındaki sürüm 1.0.38 bekliyor | `Vera_version_control.json:2` | Her sürümde güncelle (checklist'e ekle) | P2 |
| **Reklam etiketi** | Reklam olduğu belli (reklamsız iddiası kaldırıldı) | `docs/store-listing/rapor.md` | Koru | Koru |

---

## 7. Uygulama planı

Ramazan 2027 yaklaşık 8 Şubat 2027 (`docs/store-listing/events-and-growth-plan.md`). Bugünden yaklaşık 12 hafta var. Plan bu süreye göre kurgulandı.

### Sprint 0: ölçüm (1–2 gün, kod gerektirmez)
1. Play Console: Kaldırmalar × ülke × gün (Bölüm 3).
2. Bulut build çıktısı ve release AAB'de `AlarmChannelModule` kontrolü (A1).
3. AdMob: son 7 gün, ülke × platform, metrik tanımları (match / show rate).
4. Firebase: son 7 gün `ad_request`, `ad_loaded`, `ad_failed`, `onboarding_step_*`, `onboarding_completed` ülke bazında.

### Sprint 1: güven ve dürüstlük (1 hafta)
1. Otomatik topluluk gönderilerini kapat (`functions/index.js`, `autoPublishCore.js`). Onay gerekli.
2. Gizlilik politikası yayını ve linki (`links.ts:6`, Ayarlar, onboarding).
3. Analitik varsayılanını AB/UK için kapalı yap (`consentPropagation.ts`, `firebase.json`).
4. "Doğrulanmış" → "hesaplanmış" (`index.tsx:1127`). Diyanet tarifi (`calcMethod.ts`).
5. Günlük içerik çevirisi: gayriresmi uç noktayı kaldır ya da etiketle (`daily.ts:41`).
6. `Vera_version_control.json` güncelle.

### Sprint 2: ezan güvenilirliği (1–2 hafta)
1. Alarm native kodunu repoya kalıcı al: `plugins/` altında config plugin ile `AlarmChannelModule.kt`, `AlarmChannelPackage.kt`, `PrayerAlarmReceiver.kt` üret (A1). Önce EAS build'in gerçekten bu kodu içerdiğini doğrula.
2. Pil optimizasyonu ekranı (üreticiye özel yönerge) ve 8 gün kuralı için yenileme önceliği (A2).
3. Cihazda test: sessiz mod, DND, kilit ekranı, Xiaomi/Samsung. Test sonuçlarını kayda geçir.

### Sprint 3: reklam (1 hafta)
1. Mount koruma (öneri 1), `lazy` düzeltmesi (öneri 2), yerleşim birimleri (öneri 3), `ad_impression` (öneri 4).
2. Dört hafta boyunca ölçüm: `ad_request / ad_loaded`, `ad_failed` (no-fill), ülke kırılımı.

### Sprint 4: topluluk özellikleri (2–4 hafta, Ocak 2027'ye kadar)
1. Faz A3: rapor okuma, gizleme, sunucu tarafı engelleme.
2. Ortak hatim halkası (Ramazan).
3. Dua isteği (kategori tabanlı).
4. Paylaşım merkezi ve dış paylaşım kartı (`ShareSource: community`).

### Sprint 5: profil kararı (Ramazan sonrası)
1. "Benim" özet sayfası (Sprint 4'e eklenebilir, düşük risk).
2. Takma ad ve ülke rozeti: A/B ile, Ramazan sonrası. Tam profil yok.

---

## 8. Elde tutma ölçütleri

- D1, D7, D30 kohort, ülke ve platform bazında.
- Kaldırma: kurulumdan sonra gün ve ülke bazında (Play Console).
- Onboarding huni: `onboarding_step_*` → `onboarding_completed`, izin sonucu ile.
- Ezan güvenilirliği: planlanan alarm sayısı ve bildirim açılış oranı (`notif_opened`, var).
- Reklam: `ad_request / aktif kullanıcı`, `ad_loaded / ad_request`, `ad_failed` (no-fill) oranı.
- Topluluk: dua isteği başına amin sayısı, ortak hatim tamamlanma, paylaşım merkezi açılma.
- Güven: mağaza yorumlarında "yanlış vakit", "reklam", "gizlilik" kelime sayısı.

---

## 9. Senden gereken karar ve veriler

1. **Otomatik topluluk gönderileri kapatılsın mı?** (Önerim: evet.)
2. **Gizlilik politikası URL'i var mı?** Yoksa birlikte yazabiliriz (hukuki gözden geçirme gerekir).
3. **Play Console kaldırma verisi** (ülke × gün, son 60 gün) ve **AdMob son 7 gün** (metrik tanımı ile).
4. **Bulut build'den alınmış bir AAB veya APK** ya da son release build'in çıktısı: A1 kontrolü için.
5. **Ortak hatim halkası** Ramazan 2027 için öncelik olsun mu?
6. **Profil yönü:** "Benim" özet sayfası şimdi, tam profil yok. Bu yönü onaylıyor musun?

---

Bu raporu paylaşmak istersen bir artifact olarak yayınlayabilirim.
