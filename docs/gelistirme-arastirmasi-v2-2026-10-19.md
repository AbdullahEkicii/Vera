# Vera: Derinleştirilmiş Geliştirme Araştırması (v2)

Tarih: 2026-10-19 | Sürüm: 1.0.33

Önceki rapor (`gunluk-gelistirme-raporu-2026-10-19.md`) iç denetimlere dayanıyordu. Bu rapor iki şey ekliyor: (1) rakip ve kullanıcı şikayeti araştırması, (2) bu araştırmayla karşılaştırılan, kodda doğruladığım eksikler. Her öneride "ne", "neden (kanıt)", "nasıl (dosya/yaklaşım)", "risk" ve "ölçüt" var.

## 1. Araştırma bulguları ve güvenilirlik

Web araştırması sınırlı ve yönsel; hiçbiri Play Store'un ham verisi değil.

| Bulgu | Kaynak | Güven |
|---|---|---|
| Kategoride en sık şikayet: ezanın hiç çalmaması, yanlış saatte veya sessiz çalması, Xiaomi/Huawei/Oppo/Samsung pil yöneticisinin uygulamayı öldürmesi | [unstar.app sıralaması](https://unstar.app/blog/muslim-pro-quran-majeed-athan-pillars-tarteel-quran-prayer-apps-ranked-2026) | Orta (editoryal derleme) |
| Muslim Pro'da ana şikayet reklamlar (açılışta tam ekran, ezan çevresinde video) ve eski veri paylaşımı itibarı | aynı kaynak | Orta |
| Küçük bir uygulamada başlıca şikayet: hesaplama hatası ve widget ile ana uygulama arasında senkron sorunu; istenenler: aylık takvim ve vakit başlangıcı geri sayımı | [Salatuk analizi](https://marlvel.ai/api/llm/apps/lifestyle/com-masarat-salati) (68 yorum) | Düşük (küçük örnek) |
| Kullanıcı beklentisi: her vakit için bildirim, sıradaki vakit vurgusu ve geri sayım, vakitleri elle düzeltme, birden çok hesaplama yöntemi | [Prayer Times listeleri](https://justuseapp.com/en/app/1587151803/prayer-times-azan-pro-muslim/reviews) | Orta |
| Resmi e-Diyanet uygulamasında yorumlar: vakitlerin yüklenmemesi, kıble erişiminin zahmetli ve konum güncellemesinin yavaş olması | [App Store sayfası](https://apps.apple.com/us/app/id6745179920) | Düşük (az yorum, iOS) |
| Üçüncü taraf Diyanet tabanlı uygulamalar öne çıkarıyor: ezan sesi seçimi, çoklu şehir, internetsiz 30 günlük vakit | [Ezan Vakti Pro](https://apps.apple.com/cn/app/ezan-vakti-namaz-vakitleri-pro/id1372054007) | Orta |
| Xiaomi/Redmi'de alarmların hiç görünmemesi ve çözümün üretici otomatik başlatma ayarı olduğu bildirimi; Android 14'te tek bir otomatik başlatma ayarının yettiği anekdotu | [App Inventor forumu](https://community.appinventor.mit.edu/t/paid-alarm-manager-extension-with-notification-or-autostart/19408/147) | Düşük (tek anekdot) |

Eksik kalan: Google Play'in gerçek yorumları, Android 14/15 resmi tam zamanlı alarm belgesi, HyperOS ve One UI'a özel ayrıntılar. Bunlar için Play Console'daki kendi yorumlarınızı ve `developer.android.com` sayfasını okumak gerekir; tahminle doldurmadım.

**Çıkarım:** Pazarda kazanan şey özellik sayısı değil "ezan her zaman, doğru saatte çalar" güvencesi. Vera bunun altyapısını (alarm, bildirim sağlığı kartı) kurdu; aşağıdaki öneriler buna güvenilirlik katmanı ve rakiplerde görülen eksikleri ekliyor.

## 2. Kodda doğrulanan mevcut durum

| Konu | Durum | Kanıt |
|---|---|---|
| Ezan sesi | Tüm vakitler için tek ses (`exactSound`) | `notificationService.ts` `NotificationPrefs` |
| Erken uyarı | Sabit 25 dk, vakit başına aç/kapa | `notificationService.ts:712` |
| Cuma | Sabah 09:00 selamlama kartı var, cuma namazına özel hatırlatma yok | `FRIDAY_HOUR = 9` |
| Çoklu şehir | Yok; yalnızca son aramalar listesi (`RecentCity`) | `CitySearchModal.tsx` |
| Widget | İki sağlayıcı: koyu ve açık (`prayer_widget_info`, `prayer_widget_light_info`) | `res/xml`, Kotlin |
| DND (rahatsız etmeyin) | Uygulamada DND farkındalığı yok | arama sonucu boş |
| Aylık takvim | Haftalık imsakiye var, aylık görünüm yok | `WeeklyImsakiyeModal`, `UnifiedCalendarModal` |

## 3. Öneriler (öncelik sırasıyla)

### A. Güvenilirlik (en yüksek getiri)

**A1. Vakit başına ses ve düzey seçimi [M]**
- Ne: Her vakit için ayrı ses (ör. sabah ezanı ayrı, öğle sessiz bildirim) ve "yalnızca bildirim, ses yok" seçeneği.
- Neden: Rakip listelerinde "ezan sesi seçimi" öne çıkarılıyor; şu an tek ses var.
- Nasıl: `NotificationPrefs`'e `sounds: Partial<Record<PrayerKey, string>>` ekleyin; eski `exactSound` varsayılan kalsın (geri uyum). Kanal kimliği ses adına göre zaten türetiliyor (`getExactChannelId`), yeni kanal sayısı ses sayısıyla sınırlı (3). `schedulePrayerNotifications` içinde vakit başına ses okunur.
- Risk: Kanal başına ses değişmez (Android); mevcut yapı bunu zaten ses adıyla çözüyor. Test: her vakit için bildirim kanalı doğru mu.
- Ölçüt: Ayarlarda vakit başına seçim; test bildirimi her vakit için çalar.

**A2. Erken uyarı süresini seçilebilir yapma (5/10/15/25/30 dk) [S]**
- Neden: 25 dk koda sabitlenmiş; kullanıcılar genelde 10-15 dk ister.
- Nasıl: `warnMinutes` pref'i, `notificationService.ts:712`'de `25 * 60 * 1000` yerine pref. Test bildirimi metni dakikayı göstersin. Çeviri anahtarı "25 dakika kaldı" ifadesi parametreye çevrilmeli (35 dilde `{{minutes}}`; `scripts/i18n-placeholders.mjs` yer tutucu uyumunu denetler).
- Risk: Kanal adı "(25 dk)" sabit; "Ezan Yaklaşıyor" olarak genelleştirin.

**A3. Alarm teslim denetimi ("kaçırılan ezan" tespiti) [M]**
- Ne: Bir vakit geçtiğinde, planlı alarmın gerçekten tetiklenip tetiklenmediğini uygulama bir sonraki açılışta anlasın; tetiklenmediyse Bildirim Sağlığı kartında "Son 7 günde X ezan teslim edilmedi olabilir" desin ve nedenini (pil, izin) önersin.
- Nasıl: `notifee.onBackgroundEvent`/`onForegroundEvent` `DELIVERED` olayını `AppStorage`'a yaz (`delivered_log`: vakit anahtarı + zaman). Açılışta planlanan ile teslim edilen karşılaştırılır. Analitik: `alert_delivery_rate` kullanıcı özelliği.
- Neden: Silinme sebebinin en sessizi budur; bugün ölçülmüyor. Bu veri, A4 ve Play Console eşiklerini yönlendirir.
- Risk: Notifee `DELIVERED` olayı bazı üretici ekranlarında gelmeyebilir; eksik veri "teslim edilmedi" sayılmamalı (güven aralığı).

**A4. Üreticiye özel kısa kılavuz [S]**
- Bildirim Sağlığı kartında `getPowerManagerInfo().manufacturer` ile marka bilinir; Xiaomi/Huawei/Oppo/Samsung için 2-3 adımlık metin göster ("Otomatik başlatma: Aç"). Forum bulgusu otomatik başlatmanın kritik olduğunu söylüyor, ama tek anekdot; metni gerçek cihazda doğrulayın.

**A5. Rahatsız Etmeyin (DND) uyarısı [S]**
- `respectSilentMode=false` alarm akışını kullanıyor; DND'de alarmlar genelde geçer, ama "yalnızca öncelikli" modunda üreticiye göre değişir. Kartta "Ezan sesi telefon sessizken de çalar/çalmaz" açıklaması ve gerçek cihaz testi.

### B. Doğruluk ve güven

**B1. Vakit doğrulama rozeti ve kaynak şeffaflığı [S]**
- Ana ekranda yöntem + kaynak ("Diyanet", "MWL") görünür; yöntem farkı >5 dk ise bölgeye uygun yöntemi öner (zaten `updateMethodForLocation` var). Hesaplama şikayetleri kategoride baskın; şeffaflık güveni artırır.

**B2. Yüksek enlem kuralı bildirimi [S]**
- `latitudeAdjustmentMethod=3` yalnızca >45 derece için uygulanıyor. Kullanıcıya "Kuzey enlemlerde yatsı/imsak yaklaşık hesaplanır" notu ve yöntem seçimi.

**B3. Çevrimdışı 30 gün garanti [M]**
- Üçüncü taraf rakipler bunu öne çıkarıyor. Şu an 21 günlük alarm penceresi ve aylık önbellek var; ay sonunda internet yoksa cihazda hesaplama (`offlinePrayerService`) devreye giriyor. Önbelleği iki aydan 45 güne uzatıp arka plan görevini (6 saat) bu pencereyi yenilemeye bağlayın; ölçüt: uçak modunda 30 gün boyunca alarm planı eksiksiz.

### C. Ürün özellikleri

**C1. Çoklu şehir ve "seyahat modu" [M]**
- `RecentCity` altyapısı var. En fazla 5 sabitlenmiş şehir, ana ekranda şehir çipleri; seyahat ederken otomatik konum ile sabit şehir arasında seçim. Zaman dilimi altyapısı (`zonedTime`) çok şehirli kullanıma hazır.

**C2. Aylık takvim görünümü ve yazdırılabilir/paylaşılabilir imsakiye [M]**
- Rakip şikayet/isteklerinde aylık takvim var. `UnifiedCalendarModal` genişletilip aylık tablo (6 vakit x gün) ve görsel paylaşım.

**C3. Cuma namazı hatırlatması [S]**
- Cuma günü öğle vaktinden X dk önce "Cuma namazına hazırlan" bildirimi (isteğe bağlı, varsayılan kapalı); mevcut cuma selamlama 09:00 kartı ile çakışmaması için tek bildirimde birleştirme seçeneği.

**C4. Vakit başlangıcı geri sayımı widget'ı ve senkron [M]**
- Rakipte widget-uygulama senkron sorunu şikayet. Vera'da `PrayerWidgetProvider` 288 satır; widget güncellemesinin alarm tabanlı olduğunu ve uygulama vakitleri değişince (şehir, yöntem, düzeltme, Hicri) `WidgetModule` ile anında yenilendiğini doğrulayan bir test listesi çıkarın. Hicri düzeltmesi ve vakit farkı değişince widget da yenilenmeli (şu an yenilenmiyor olabilir; kontrol edin).

**C5. Kaza (borç) namaz ve Kuran hedefi iyileştirmeleri [M]**
- `KazaTrackerModal` ve `HatimTrackerCard` var; günlük hedef önerisi ("30 günde hatim için günde X sayfa") ve haftalık özet kartı. Elde tutma için seri koruma (1 gün esneme).

### D. Gelir ve itibar (reklam şikayeti)

**D1. Reklam rahatsızlığını sınırlama [S]**
- Rakiplerde en çok şikayet edilen şey ezan çevresindeki reklam. Vera yalnızca banner kullanıyor (iyi). Bunu mağaza metninde ("açılışta tam ekran reklam yok") öne çıkarın; ezan bildirimi gününde reklam yoğunluğunu artırmayın. Banner yenileme/yüklenmeme kuralları yerinde.
- Opsiyonel: tek seferlik "reklamsız" satın alma (Play Billing) ve destek; gelir etkisini önce GA4'te reklam gelir verisiyle tahmin edin.

**D2. Değerlendirme istemi zamanı [S]**
- `maybeRequestReview('open_5')` açılış sayısına bağlı. Daha iyi zaman: ezan bildirimi başarıyla teslim edildikten (A3) veya hedef tamamlandıktan sonra. Olumsuz deneyimde (teslim edilmeyen alarm) isteme.

### E. Teknik borç (güvenilirlik için)

- **E1.** `android/` gitignore'da ve özel Kotlin içeriyor; `plugins/` altında config plugin'e taşıma (prebuild güvenliği) [L].
- **E2.** İki bildirim yığını ve kullanılmayan çeviri anahtarları temizliği [M].
- **E3.** `useLocation`, `notificationService`, `api.ts` için daha fazla birim testi (zonedTime testleri örnek; Node `--test`, ek bağımlılık yok) [M]. En değerli: `schedulePrayerNotifications` pencere/sınır testi (230 alarm sınırı, 21 gün).
- **E4.** Ağır dosyalar: `index.tsx` ve `settings.tsx` çok büyük; bölümleri (ör. `NotificationHealthCard` gibi) bileşenlere ayırın, React Compiler önbellek hatalarını (bkz. sekme etiketi olayı) azaltır. Aynı derleyici etkisi `ct()` çağrılarında başka ekranlarda da çıkabilir; hepsini `useTranslation().t`'ye taşıyan bir tarama yapılmalı [M].

## 4. Önerilen uygulama sırası

1. A2 (erken uyarı süresi) + A4 (üretici kılavuzu): küçük, hemen görünür.
2. A3 (teslim denetimi): ölçüm olmadan diğer güvenilirlik işleri kör kalır.
3. A1 (vakit başına ses).
4. C3 (cuma hatırlatması) + B1 (kaynak rozeti).
5. C1 (çoklu şehir) ve C2 (aylık takvim).
6. B3, C4, E4.

## 5. Ölçüm planı

- Başarı ölçütleri: ezan teslim oranı (A3), 1. gün/7. gün tutma, bildirim izni verme oranı, Bildirim Sağlığı kartında "Düzelt" tıklama ve sonrasında teslim oranı değişimi, reklam dışı oturum süresi.
- Her özellik GA4 olayı ve Remote Config bayrağıyla (varsa) kademeli açılsın.

## 6. Dürüst sınırlar

- Rakip ve şikayet verisi gerçek Play Store yorumları değil; küçük ve editoryal kaynaklardan. Karar vermeden önce Play Console > Yorumlar bölümündeki kendi yorumlarınızı ve ANR/çökme verinizi inceleyin.
- A1-E4'ün hiçbiri bu oturumda kodlanmadı; yalnızca durum kodda doğrulandı. Emülatör kapalıydı, hiçbir ekran canlı denenmedi.

## 7. Uygulama durumu (rapor sonrası)

Tip kontrolü temiz, 12 birim testi geçiyor. Emülatör kapalıydı: aşağıdakilerin hiçbiri ekranda veya cihazda denenmedi.

| Madde | Durum | Not |
|---|---|---|
| A1 Vakit başına ses | Yapıldı | Ayarlar > Bildirimler: satıra dokunmak sesi döndürür (varsayılan, 3 ses). Her kullanılan ses için kanal oluşturuluyor (`initNotifications`). Alarm sesi akışı (`AlarmChannelModule`) ile test edilmeli |
| A2 Erken uyarı süresi | Yapıldı | 5/10/15/25/30 dk; çeviriler "25" sayısı çalışma anında değiştirilerek kullanılıyor (`withMinutes`) |
| A3 Teslim denetimi | Yapıldı (sınırlı) | `deliveryLog.ts`: planlanan ve DELIVERED/PRESS olayıyla doğrulanan ezanlar. Android her teslimde JS'i çalıştırmayabilir; bu yüzden yalnızca >= 6 örnekte ve < %50 ise uyarı gösteriliyor, aksi halde bilgi satırı. Gerçek cihazda doğruluk oranı ölçülmeli |
| A4 Üretici kılavuzu | Yapıldı | Xiaomi, Huawei/Honor, Oppo/Realme/OnePlus, Samsung için kısa adımlar. Menü adları genel bilgiye dayanıyor, gerçek cihazda doğrulanmadı |
| A5 DND notu | Yapıldı (metin) | Bildirim Sağlığı kartında açıklama; DND davranışı üreticiye göre değişir, test bildirimiyle denenmeli |
| B1 Kaynak rozeti | Yapıldı | Ana ekranda hesaplama yöntemi satırı |
| B2 Yüksek enlem | Yapıldı | 48 dereceden yüksekte imsak/yatsı notu |
| B3 Çevrimdışı 30 gün | Zaten karşılanıyor | Ay + sonraki ay önbelleği ve 35 günlük cihaz içi hesaplama; ek iş gerekmedi |
| C1 Çoklu şehir | Yapıldı (hafif) | Şehir aramada yıldızla kaydetme (en fazla 5), kayıtlı şehirler üstte ve silinmiyor; ana ekranda ayrı çip şeridi yapılmadı |
| C2 Aylık takvim | Yapıldı | İmsakiye penceresinde 7/30 gün seçimi ve paylaşma |
| C3 Cuma hatırlatması | Yapıldı | Ayarlar'da aç/kapa (varsayılan kapalı) ve 30/45/60 dk |
| C4 Widget senkronu | Doğrulandı, değişiklik yok | Widget, ana ekran vakit durumu değişince güncelleniyor; Hicri tarih widget'ta yok |
| C5 Hatim hedefi | Yapıldı | Kalan sayfa ve gün üzerinden "günde ~N sayfa" |
| D1 Reklam | Kod değişikliği yok | Yalnızca banner kullanılıyor; mağaza metninde vurgulanmalı |
| D2 Değerlendirme zamanı | Yapılmadı | Play politikası kullanıcı memnuniyetine göre isteği ayırmayı yasaklıyor; mevcut tetikleyiciler (5 açılış, 5 vakit, hatim) zaten olumlu anlar |
| E1 Config plugin | Yapılmadı | Büyük ve derleme gerektiriyor; ayrı iş olarak planlanmalı |
| E2 Temizlik | Yapılmadı | Kullanılmayan anahtar ve yinelenen bildirim yığınları ayrı bir temizlik turu |
| E3 Testler | Kısmen | `notifPrefs` ve tema kontrastı testleri eklendi; `schedulePrayerNotifications` React Native'e bağlı olduğu için Node testine uygun değil |
| E4 `ct()` taraması | Yapıldı | `useCt()` kancası: Achievements, Hajj, Quran okuyucu, Selamlama kartı, Kuran duaları, İsimler ve Dualar; Dini günler ve Hicri ay adı için dil parametresi |

Çeviri kapsamı: yeni metinler tr, en, de, fr, es, it, pt, ru, ar, id, ur dillerinde; diğer 24 dil İngilizceye düşüyor.
