# Vera: Geri Dönüş ve Ayırt Edici Özellik Sentezi

Tarih: 2026-10-21 | Kaynak: 5 paralel araştırma (rakip analizi, elde tutma, ayırt edici özellikler, görsel tasarım, platform)

Önceki rapor (`gelistirme-arastirmasi-v2-2026-10-19.md`) alarm güvenilirliği, sesler, erken uyarı, Cuma, widget ve aylık takvimi zaten kapsıyor. Bu rapor onların üstüne eklenen, kullanıcıyı geri getirecek ve Vera'yı ayırt edecek yeni fikirleri topluyor.

## Güven notu

Pazar verisi çoğunlukla rakip blogu, mağaza ilanı ve satıcı iddiası. Store puanları, yorum sayıları ve streak'in gerçek etkisi doğrulanamadı. Aşağıda "kanıt" yerine "gözlem" ve "eğilim" ayrımı yapıldı.

## 1. Kullanıcıyı geri getiren şeyler (gözlem)

- Ezan saati ve ana ekran / kilit ekranı widget'ı: kullanıcıları günde birkaç kez açtıran temel neden.
- Namaz işaretleme (kılındı) ve sonraki vakit geri sayımı.
- Kaldığın yerden devam: son okunan sure ve yer imleri.
- Rakiplerin en sık şikayetleri, Vera'nın fark yaratabileceği boşluklar: ibadet ekranlarında reklam, ezanın Android'de geç veya hiç çalmaması, seyahatte yanlış hesaplama yöntemi, ücret duvarı, çevrimdışı ses ve yer imi senkronu.

## 2. Elde tutma ilkeleri (kanıt zayıf-orta)

- Streak'lerin kısa vadeli etkisi zayıf-orta kanıtla destekleniyor. Kırılan streak'in kullanıcıyı bırakmaya yaklaştırabildiğine dair daha tutarlı bulgular var.
- Dini uygulama için en güvenli yön: kırılma anını yumuşatan, ibadeti sayıdan ayıran tasarım.
- Kaçınılacaklar: streak için ödeme veya "koruma" satın alımı, aile / arkadaş sıralaması, namaz için puan ve rozet dili, kaçırılan namaz için suçlayıcı metin.
- Başlangıç hedefi küçük tutulmalı (tek namaz, tek sayfa). "Son 7 günde X gün" gibi tutarlılık görünümü seri yerine kullanılabilir.

## 3. Ayırt edici özellikler (önerilen sıra)

| # | Özellik | Neden ayırt eder | Efor | Risk |
|---|---|---|---|---|
| 1 | Nazik seri kurtarma (kırılınca suçlamayan dil, "son 7 gün" görünümü, seriyi kapatma seçeneği) | Rakiplerin çoğu kırılmayı cezalandırıyor | S | Düşük |
| 2 | Ayet bazlı tefekkür günlüğü, namazdan sonra hatırlatma | Rakipler var ama namaz ve Kur'an verisiyle bağlı değil | S/M | Düşen veri hassasiyeti: cihazda tut, yedekleme açık onayla |
| 3 | Namaz bağlantılı hifz takibi | Vera'nın Kur'an okuma ekranı ve namaz verisi ile birleşir | M | Mushaf farkları (Hafs/Medine) ve sayfa eşlemesi hatası |
| 4 | Paylaşılabilir ayet/dua kartı genişletme (9:16) | StoryCardShareModal zaten var | S/M | Arapça render (font, RTL), Kur'an çevirisi lisansı |
| 5 | Vakit anı kartı (ezan / iqamah anında sessiz tam ekran durak) | Dekorasyonsuz, dikkat dağıtmayan an | S/M | Ses ve sessiz mod |
| 6 | Görsel abdest ve namaz öğrenme, namaz kontrol listesine bağlı | Öğrenme ile günlük takip birleşir | S/M | Mezhep farkları, din bilgini incelemesi |
| 7 | Güneş yayı ana ekran kahramanı | Vakit beklemeyi yolculuk hissine çevirir | M | Düşük uçta animasyon maliyeti; statik yedek |
| 8 | Vakit dönemine göre ortam arka planı | Görsel kimlik, kullanıcı kapatabilir | M | İki temada kontrast |
| 9 | Ramazan ve Bayram tema iskeleti | Ramazan en yüksek trafik dönemi (PRODUCT.md) | M | Kısa süreli değer, altın kuralı |
| 10 | iOS Live Activity / Dynamic Island geri sayımı | Kilit ekranında sonraki vakit | L | Expo native eklenti, arşivlenmiş paket riski |

Kaynaklı dini soru-cevap bu listede yok. Fetva niteliği, hadis derecesi ve halüsinasyon riski yüksek; kürasyonlu kaynak ve bilim insanı incelemesi olmadan yayımlanmamalı.

## 4. Platform notları

- **USE_EXACT_ALARM izni (önce kontrol edilmeli):** `app.json` içinde tanımlı. Google Play bu izni yalnızca alarm ve takvim türü uygulamalara tanıyor. Play Console beyanı ve gerekçesi gözden geçirilmeli. Ajan bu maddeyi ikincil kaynaktan aktardı, resmi metin doğrulanmadı.
- iOS widget (next-prayer geri sayımı): yüksek etki. `expo-widgets` SDK 54 ile çalışıp çalışmadığı doğrulanmadı.
- Android kalıcı bildirim: mevcut notifee geri sayımını ProgressStyle'a çevirmek. Android 16 desteği belirsiz, eski cihazlar için düz bildirim fallback'i şart.
- `expo-live-activity` deposu arşivlenmiş görünüyor. Kullanılacaksa alternatif değerlendirilmeli.
- Topluluk özellikleri (Firestore): Google UGC politikası moderasyon ve raporlama ister. Efor ve gizlilik yükü yüksek, şimdilik ertelenmeli.
- Background task 15 dakikadan sık çalışmaz. Geri sayım arka plan işine bağlanmamalı; zamanlanmış bildirimler ve widget tarih farkı cihazda hesaplanmalı.

## 5. Görsel kurallar (DESIGN.md ile uyumlu)

- Altın tek vurgu kalır, üçüncü altın hex eklenmez. Gold glow yalnızca etkileşim ve kutlama anlarında.
- Arapça metin serif kalır, dekoratif kaligrafi kullanılmaz.
- İnsan, hayvan veya peygamber ya da Kâbe tasviri süs olarak kullanılmaz. Gökyüzü, güneş ve geometri soyut kalır.
- Renk tek bilgi taşımaz; her görsel öğe metinle de etiketlenir.
- Azaltılmış hareket tercihine saygı: animasyonlar kapatılabilir, Android'de "Transition animation scale" ayarı da kontrol edilir.

## 6. Önerilen uygulama sırası

1. Nazik seri kurtarma (S, düşük risk, etik olarak en net kazanım)
2. Ayet bazlı tefekkür günlüğü (S/M)
3. Paylaşılabilir kart genişletme (S/M, mevcut modal)
4. Vakit anı kartı (S/M)
5. Güneş yayı ana ekran (M, cihazda görsel doğrulama gerekir)
6. Namaz bağlantılı hifz takibi (M)
7. Ramazan tema iskeleti (M)
8. Platform: USE_EXACT_ALARM kontrolü (hemen, kod dışı) ve iOS widget (M-L)

## 7. Doğrulanamayanlar

- Store puanları ve yorum dağılımı, streak'in gerçek kullanıcı etkisi.
- Diyanet resmi uygulaması ve Türkiye'ye özgü kullanıcı beklentileri için Türkçe kaynak taraması.
- Ödüllü namaz uygulaması bulunamadı; görsel öneriler mağaza ilanları ve geliştirici iddialarına dayanıyor.
- Expo SDK 54 ile widget ve Live Activity desteği.
- Play politikalarının resmi metni (USE_EXACT_ALARM, foreground service).
