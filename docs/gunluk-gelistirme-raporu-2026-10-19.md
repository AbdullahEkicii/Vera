# Vera: Günlük Geliştirme ve Güzelleştirme Raporu

Tarih: 2026-10-19 | Sürüm: 1.0.33 (versionCode 35) | Platform: Android (Expo 54, RN 0.81)

Bu rapor, önceki denetimlerin (elde tutma, pil/RAM, ANR/çökme, çeviri) ve bu oturumdaki emülatör gözlemlerinin üzerine kurulu. Yeni bir cihaz turu yapılmadı. Her madde "neden" ve "nasıl" ile yazıldı; kolay olandan zora, etkisi yüksek olandan düşüğe doğru sıralı.

Etiketler: **[S]** küçük (1-2 saat), **[M]** orta (yarım-1 gün), **[L]** büyük (birkaç gün). Etki: **Y** yüksek, **O** orta, **D** düşük.

---

## 0. Yayın öncesi zorunlu işler (geliştirme değil, engelleyici)

| # | İş | Neden |
|---|----|-------|
| 0.1 | `scripts/build-release.ps1` ile AAB'yi kendi terminalinizde alın | Gradle benim ortamımda çalışmıyor; sürüm/versionCode (1.0.33 / 35) ve yeni ses dosyaları hazır |
| 0.2 | `src/config/links.ts` içinde `PRIVACY_POLICY_URL` doldurun | Boşken ayarlardaki satır gizli; Play Console formu ve UMP için gerekli |
| 0.3 | `Vera_version_control.json` değerini yayından sonra 1.0.33 yapın | Şu an 1.0.32; yanlış sürüm uyarısı verir |
| 0.4 | Play Console'daki `NullPointerException` çökmesinin Java stack'ini alın | Kaynağı kesin bilinmiyor, aday noktaları sağlamlaştırdım ama doğrulanmadı |
| 0.5 | `adblog.txt` repodan çıkarılsın; `.jks`/`.pem` repo dışına taşınsın | Anahtar sızıntısı riski |
| 0.6 | `USE_EXACT_ALARM` kararı | Play politikası: yalnızca alarm/takvim uygulamaları için; ret nedeni olabilir |
| 0.7 | Gerçek cihazda ezan sesi, 25% ilk ses seviyesi, alarm/bildirim akışı testi | Emülatörde sesli doğrulama yapılamadı |

---

## 1. Yüksek etkili: ilk 24 saat ve silinme oranı

Silinme oranının en büyük kısmı ilk oturumda ve ilk günde oluşuyor. Burası en iyi getiri.

### 1.1 İlk açılışta "değeri hemen göster" [S] Y
- Onboarding sonrası ilk ekranda yalnızca vakit kartı ve geri sayım öne çıksın. Bu oturumda konum ve bildirim kartlarını sadeleştirdik; kalan sıra: konum uyarısı kartı hâlâ en üstte. Reklamın altına almak aynı mantıkla önerilir.
- İlk açılışta tek bir net hedef: "Ezan bildirimini aç". Bildirim izni isteğini, kullanıcı geri sayımı gördükten sonra (ör. 5-10 sn sonra veya ikinci açılışta) bağlamıyla isteyin. Şu an uyarı kartı var; izin penceresini tetikleyen metin "Ezan vaktinde haber verelim mi?" biçiminde fayda odaklı olmalı.

### 1.2 Bildirim güvenilirliği panosu [M] Y
Ezan bildirimi gelmezse kullanıcı uygulamayı siler; bu en sessiz silme nedeni.
- Ayarlarda "Bildirim sağlığı" kartı: izin durumu, tam zamanlı alarm izni, pil kısıtlaması, DND durumu, son planlama zamanı, bir sonraki alarm saati. Her satırda yeşil/sarı durum ve tek dokunuşla düzeltme.
- "Test bildirimi gönder (10 sn sonra)" düğmesi: kullanıcı kendi cihazında ezanın çaldığını görsün.
- Pil kısıtı kartını kaldırdık; bunun yerine bu panonun içinde, yalnızca sorun tespit edilirse göstermek daha az rahatsız edici.

### 1.3 Üreticiye özel pil yönergeleri [S] O
Xiaomi, Huawei, Oppo, Samsung'ta otomatik başlatma/arka plan kısıtı ezanı öldürür. Cihaz markasına göre kısa, görsel adımlı bir yönerge sayfası (Ayarlar > Bildirim sağlığı içinden) ve "dontkillmyapp" tarzı doğrudan ayar intent'leri.

### 1.4 Elde tutma döngüleri [M] Y
- Günlük vird/hedef: Kuran sayfa hedefi ve zikir hedefi için bildirim varsayılanları kapalı (doğru karar); bunun yerine ilk hafta sonunda "Haftalık özet" kartı (kılınan vakit sayısı, seri) ile geri dönüş sağlayın.
- Seri (streak) görselliği: ana ekranda küçük bir "7 gündür" rozeti; bozulduğunda suçlayıcı değil, teşvik edici metin.
- Cuma, Kandil, Ramazan gibi günler için zaten selamlama kartları var; bunları yıl takvimine bağlayıp bir gün önce hatırlatma sunun (varsayılan açık olan `greetingReminders` bunu karşılıyor, içeriklerin kalitesini kontrol edin).

---

## 2. Tasarım ve görsel cilalama

### 2.1 Ana ekran [M] Y
- **Bilgi hiyerarşisi:** Konum etiketi > sonraki vakit geri sayımı > altı vakit ızgarası > reklam > hızlı özellikler sırası doğru. Ek kart sayısı (konum, bildirim, batarya, güven rozeti, ipucu metni, tahmini vakit uyarısı) aynı anda 3'ü geçmemeli. Bir "kart sırası/öncelik" kuralı: aynı anda en fazla bir bilgilendirme kartı göster, diğerleri sıraya girsin.
- **Reklam yerleşimi:** Banner, vakit kartının hemen altında; kartla arasındaki boşluk ve kenar yuvarlaklığı çevre kartlarla aynı ölçüde olsun. Reklam yüklenmediğinde alan çöküyor (iyi); çökme ve açılma anında kayma yaşanmaması için açılışta animasyonlu (200 ms) yükseklik geçişi eklenebilir.
- **Animasyon bütçesi:** Sonsuz döngülü ortam animasyonlarını kaldırdık (CPU %139 > %37). Yeni animasyon eklerken aynı kural: giriş animasyonları tek seferlik, sürekli olanlar yalnızca görünürken ve 15 sn gibi sınırlı sürede.
- **Boş/hata durumları:** İnternet yok ve önbellek yok durumunda tahmini (cihazda hesaplanan) vakit uyarısı var; iyi. Metni daha sıcak ve kısa yapın, "Yeniden dene" ile "Şehir seç" birincil/ikincil düğme ayrımı net olsun.

### 2.2 Tab çubuğu [S] O
- Etiketler artık dile canlı uyuyor. Kalan: İtalyanca "Duas" ve başlıkta "e Duas" İngilizce kalmış (`names.tabDuas`, `names.title`). Diğer Latin yazılı dillerde de aynı kontrolü yapın.
- Etiket uzunluğu: Almanca/Rusça gibi uzun etiketlerde tek satır ve `numberOfLines={1}` ile taşma kontrolü yapılmalı; küçük ekranda (320 dp) test.
- Aktif sekme göstergesi (pill) RTL'de doğru; Arapça/Farsça/Urduca ile bir kez gerçek cihazda bakın.

### 2.3 Tipografi ve renk [M] O
- Outfit yazı tipi 4 ağırlıkla yükleniyor; Arapça/Urduca/Farsça için ayrı bir okunaklı font (Kuran metni dışında arayüz için Noto Sans Arabic benzeri) düşünün. Aksi halde sistem fontuna düşüyor ve satır yüksekliği bozuluyor.
- Erişilebilirlik: altın tonlu metinlerin koyu arka planda kontrast oranı en az 4.5:1 olmalı. Sistemli bir kontrast taraması (özellikle `textSecondary` ve `primary + '15'` zeminler) yapın.
- Tema: sistem temasını izleme zaten eklendi. Açık tema ekran görüntüleri yok; her ana ekran için açık/koyu ekran görüntüsü alıp karşılaştırın.

### 2.4 Mikro etkileşimler [S] D
- Vakit kartı uzun basma için hafif haptik geri bildirim (`expo-haptics`).
- Zikirmatik: her dokunuşta çok kısa haptik, hedefe ulaşınca belirgin titreşim ve küçük kutlama animasyonu.
- Kuran okurken son kalınan yerin otomatik açılması ve "Kaldığın yerden devam" şeridi.

---

## 3. Özellik geliştirmeleri

### 3.1 Widget'lar [M] Y
`widgetService` ve yerel Kotlin kodu mevcut. Beklenen iyileştirmeler:
- Widget'ta sonraki vakit + kalan süre; dakikada bir güncelleme yerine alarm tabanlı güncelleme (pil).
- Küçük (2x1), orta (4x2) ve koyu/açık varyantlar; tıklayınca doğrudan ana ekran.
- Zaman dilimi farkı: uzak şehir seçiliyken widget şehir saatine göre göstermeli (`zonedTime` ile uyumlu mu doğrulayın).

### 3.2 Kıble [S] O
- Manyetik sapma (declination) düzeltmesi yok; birkaç derece hata olabilir. `expo-sensors` ile birlikte basit bir WMM tabanlı sapma tablosu ya da cihazın `getHeadingAsync` doğruluk bilgisi kullanılabilir.
- Titreşimle "Kıble'desin" geri bildirimi (±3 derece).

### 3.3 Kuran [L] Y
- Arka planda sesli okuma için foreground service yok (bilinçli ertelendi). Ekran kilitliyken ses kesiliyorsa kullanıcı bunu bir eksik olarak görür; media-playback türünde foreground service ve kilit ekranı kontrolleri.
- Çevrimdışı indirme yönetimi: indirme boyutu, kalan alan, tek tek silme, Wi-Fi'de indir seçeneği. SQLite `prepareAsync` geçici hatası için tek yeniden deneme eklendi; indirme tarafında da aynı sağlamlık var.
- Arama: sure/ayet arama, sık okunanlar.

### 3.4 Bildirim özelleştirme [M] O
- Vakit bazlı ses seçimi (Sabah ezanı farklı, diğerleri farklı) ve vakitten önce hatırlatma (ör. 15 dk önce).
- "Sessize alma" (`respectSilentMode`) varsayılanı kapalı yapıldı; ayarlardaki açıklama metni bunun sonucunu net anlatmalı (telefon sessizdeyken de ezan çalar).
- Cuma ve bayram için ayrı bildirim kanalı ve sesi.

### 3.5 Takvim ve dini günler [S] D
- Hicri takvimde gün düzeltmesi (±1 gün) seçeneği; ülkeye göre farklılık yaygın şikayet konusu.
- Önümüzdeki dini gün için ana ekranda küçük "X gün kaldı" şeridi.

---

## 4. Performans, pil ve RAM

Önceki ölçümler: arka plan pil etkisi ihmal edilebilir, sekmeler arası bellek sızıntısı yok, ana ekran CPU %37.

| # | Öneri | Etki | Boyut |
|---|-------|------|-------|
| 4.1 | Başlangıç süresini ölçün (cold start): splash animasyonu bitmeden ana ekran render'ı başlasın; `AnimatedSplashScreen` süresini 1.2 sn altına çekmeyi deneyin | Y | S |
| 4.2 | Liste ekranlarında (Kuran, İsimler, Dualar) `FlashList` veya `getItemLayout` ile sanallaştırma; uzun listeler `ScrollView` içindeyse değiştirin | O | M |
| 4.3 | Görseller: `expo-image` ile önbellek ve uygun boyut; ağır PNG'leri WebP'e çevirin | O | S |
| 4.4 | Hermes bytecode ve `minifyEnabled`/`shrinkResources` açık mı doğrulayın; AAB boyutunu `bundletool` ile ölçün | O | S |
| 4.5 | `console.log` çağrılarının üretimde kapalı olması (babel `transform-remove-console`) | D | S |
| 4.6 | Reklam: `BannerAd` yeniden yükleme aralıkları (10/20/30 sn, ardından 5 dk) ve 6 yavaş deneme sınırı yerinde; ANR'ın WebView kaynaklı olduğu bilindiği için reklam başlatma 5 sn sessiz başlangıçtan sonra yapılıyor, bunu koruyun | O | - |

---

## 5. Kalite, erişilebilirlik ve yerelleştirme

### 5.1 Çeviriler [M] Y
- 35 dilin tamamı dolu ve yer tutucu denetimi (`scripts/i18n-placeholders.mjs`) var. Anadili konuşan gözüyle gözden geçirme gereken diller: Hausa (ha), Özbekçe (uz), Svahili (sw), Arnavutça (sq). Mağaza açıklamaları (Play listing) de bu dillerde yerelleştirilmeli.
- İmla: "Duas/Dua/Süplikler" gibi ortak terimleri dil başına bir sözlükte sabitleyin; tab etiketi ile başlık tutarsız kalmasın.
- Süre: Play Console'da zorunlu olmasa da ekran görüntülerini en çok kullanılan 5 dilde (tr, en, ar, id, ur) hazırlayın.

### 5.2 Erişilebilirlik [M] O
- Ana ekran, ayarlar ve kıble için etiketler eklendi. Kalan: Kuran okuyucu, zikirmatik ve takvim modalları için `accessibilityLabel`/`role`.
- Yazı boyutu ölçeği: sistem yazı tipi 1.3x iken vakit kartları taşıyor mu bakın (`allowFontScaling` sınırları, `maxFontSizeMultiplier`).
- Dokunma hedefleri en az 48 dp.

### 5.3 RTL [M] O
- RTL yönü yalnızca bir sonraki açılışta uygulanıyor (Android sınırlaması); dil değişince "yeniden başlat" uyarısı eklendi. Arapça ve Urduca'da tüm ekranların gerçek cihazda gözle kontrolü hâlâ yapılmadı (ikonlar `directionalIconStyle` ile çevriliyor, ancak özel çizimler, ilerleme çubukları ve PagerView yönü doğrulanmalı).

### 5.4 Test altyapısı [M] O
- `zonedTime` Node'da denendi ama birim testi olarak repoya girmedi. Zaman dilimi, `computePrayerState`, `notificationService` zamanlama penceresi (21 gün, 230 alarm sınırı) ve `calcMethod` için Jest testleri ekleyin; bunlar en pahalı hataların (yanlış vakit, çalmayan ezan) yaşandığı yerler.
- Uçtan uca: Maestro ile onboarding > konum atla > ana ekran > dil değiştir akışı.

---

## 6. Ölçüm ve analitik

- GA4 özel tanımlarını (custom dimensions) tanımlayın; olaylar gönderiliyor ama raporlarda görünmüyor olabilir. Önerilen: `onboarding_step`, `location_source` (gps/manual/fallback), `notif_permission_result`, `ad_placement`.
- Elde tutma hunisi: açılış > onboarding bitti > konum seçildi > bildirim izni verildi > ilk ezan bildirimi alındı > 2. gün dönüş. Bu huni, silmenin nerede olduğunu gösterir; şu an eksik halka "ilk ezan bildiriminin gerçekten teslim edildiği" olayı.
- Crashlytics: `reportError` ile sarılı yerlerde sürüm ve ekran bilgisi (`setCustomKey`) ekleyin.
- Play Console: ANR oranı ve çökme oranı için eşik uyarıları (bad behavior threshold: %0.47 ANR, %1.09 çökme).

---

## 7. Güvenlik ve bakım

- Firestore kuralları (`firestore.rules`) ve analytics onay varsayılanları (`firebase.json`) hazır; Firebase Console'a dağıtım yapılmalı.
- Bağımlılık sabitleme: `react-native-google-mobile-ads` 16.0.0, nitro-modules 0.37.1, RNFB 25.1.0 sabit. Yükseltmeleri tek tek, ayrı sürümlerde yapın.
- `android/` klasörü gitignore'da ve özel Kotlin kodu içeriyor; **`prebuild --clean` çalıştırmayın**. Bu kodu `plugins/` altında bir config plugin'e taşımak orta vadede riski bitirir [L].
- Yinelenen bildirim yığınları ve kullanılmayan çeviri anahtarları temizlenebilir (bilinçli ertelendi) [M].

---

## 8. Önerilen çalışma sırası

**Bu hafta (yayın + hızlı kazanımlar)**
1. 0.1-0.7 yayın öncesi işler.
2. 1.1 bildirim izni zamanlaması ve konum kartı sırası.
3. 2.2 İtalyanca "Duas" ve diğer tab/başlık tutarsızlıkları.
4. 4.1 cold start ölçümü.

**Gelecek hafta**
5. 1.2 bildirim sağlığı panosu + test bildirimi.
6. 5.4 zaman/bildirim birim testleri.
7. 6 analitik tanımları ve huni.

**Bu ay**
8. 3.3 Kuran arka plan sesi (foreground service).
9. 3.1 widget iyileştirmeleri.
10. 5.1 yerel konuşur çeviri incelemesi, 5.3 RTL gerçek cihaz turu.

---

## 9. Bilinen sınırlar (bu raporun dürüst notları)

- Emülatörde doğrulandı: onboarding akışı, ayarlar bölümleri, tema/tam ekran varsayılanları, canlı dil değişimi ile tab etiketleri, ana ekran CPU ölçümü, sekmeler arası bellek.
- Doğrulanmadı: gerçek cihazda ses/ezan seviyesi, RTL düzen, uzak şehirde zaman dilimi, reklam davranışı, üretim (release) derlemesi.
- Bu oturumda yapılan son değişiklik (bildirim ve batarya kartlarının reklamın altına alınması) tip kontrolünden geçti, emülatörde gözle denenmedi.

---

## 10. Uygulama durumu (2026-10-19, rapor sonrası)

Uygulandı (tip kontrolü ve birim testleri geçti, emülatörde görülmedi):
- 1.1: Konum, bildirim ve batarya kartları reklamın altına taşındı ve aynı anda yalnızca biri gösteriliyor (önce konum, sonra bildirim, sonra batarya). Bildirim uyarısı reklamı artık itmiyor.
- 1.2 ve 1.3: Ayarlar'da yeni "Bildirim Sağlığı" kartı (`src/components/NotificationHealthCard.tsx`): bildirim izni, tam zamanlı alarm, pil kısıtlaması, üretici güç yöneticisi (otomatik başlatma), sıradaki planlı alarm, her satırda "Düzelt" ve 10 sn sonra test bildirimi. Eski batarya kartının yerini aldı. Çeviriler: tr, en, de, fr, es, it, pt, ru, ar, id, ur; diğer diller İngilizceye düşüyor.
- 2.2: Latin yazılı 20 dilde "Duas" etiketi ve başlığı "Dua" biçimine çevrildi (ha, th, nl, id yerel yazımla).
- 4.5: `metro.config.js` eklendi; release paketinde `console.log/info/debug` çağrıları siliniyor (warn/error kalıyor).
- 5.4: `tests/zonedTime.test.mts` (8 test) ve `npm test` komutu.
- 6: Bildirim sağlığı GA4 kullanıcı özelliklerine (`notif_permission`, `exact_alarm`, `battery_restricted`) ve Crashlytics bağlamına yazılıyor.
- 7: `adblog.txt` git izinden çıkarıldı (dosya diskte duruyor, `.gitignore` zaten kapsıyordu). `.jks`/`.pem` zaten izlenmiyor.

Kodda zaten vardı (rapor yazılırken bilmediğim): tab etiketi `numberOfLines`, zikirmatik ve kıble haptikleri, seri rozeti, Hermes ve küçültme ayarları. Bu yüzden 1.4, 2.4, 3.2 haptik ve 4.4 için ek iş gerekmedi.

Bilinçli yapılmadı:
- 3.5 Hicri gün düzeltmesi: tarih ana ekran, dini günler ve Ramazan takviminde ayrı ayrı hesaplanıyor; tek ekranda kaydırmak tutarsızlık yaratır, ortak bir tarih katmanı gerekir.
- 3.3 Kuran arka plan sesi (foreground service), 3.1 widget yenileme, 4.1 cold start ölçümü, 4.2 liste sanallaştırma, 5.3 RTL turu: gerçek cihaz veya derleme gerektiriyor.
- 2.3 Kontrast: metin renkleri uygun (ana 16:1, ikincil 6.7:1). Tema vurgu renkleri açık temada metin olarak kullanılırsa düşük (Altın 1.9:1, Zümrüt 2.3:1, Okyanus 2.5:1); vurgu rengi yalnızca ikon/zemin için kullanılmalı, metinde `readableTextOn` kullanılmalı.
- 0.x ve 5.1 insan işleri (build, gizlilik URL'si, Play Console, native çeviri incelemesi).

### 10.1 Sonradan tamamlananlar
- **Hicri gün düzeltmesi (3.5):** Ayarlar'da -2..+2 gün seçici. Tek ortak değer (`HIJRI_DAY_OFFSET`, `src/services/api.ts`) ana ekran Hicri tarihine, dini gün/kandil tarihlerine ve Ramazan imsakiyesinin takvim tarihlerine birlikte uygulanıyor; önbellekteki ham veri değişmiyor. Aladhan'ın `adjustment` parametresi denendi, işe yaramıyor (Diyanet takviminde yok sayılıyor), bu yüzden yerelde uygulandı. Sınır: önbellek penceresinin en ucundaki gün için gün numarası aritmetikle kaydırılıyor; zamanlanmış dini gün bildirimleri bir sonraki yenilemede güncelleniyor.
- **Vurgu rengi kontrastı (2.3):** Temaya `primaryText` eklendi (`accentForText`, WCAG 4.5:1). Açık temada tüm paletler artık >= 4.5:1, koyu temada >= 4.7:1. Metin olarak kullanılan 40'a yakın `theme.colors.primary` kullanımı `primaryText`'e çevrildi; ikonlar, düğme zeminleri ve Kuran okuyucunun kendi teması değişmedi.
