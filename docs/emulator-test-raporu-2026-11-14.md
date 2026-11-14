# Emulator test raporu — 14 Kasım 2026

Ortam: Pixel 8 emulator (Android 13, x86_64), debug build, Metro dev server. Cihaz dili İngilizce, konum önce
"Not selected" (New York yedek), sonra İstanbul seçildi. Gerçek GPS yok.

## 1. Build hatası ve çözüm

| Sorun | Sebep | Çözüm |
| --- | --- | --- |
| `JAVA_HOME is set to an invalid directory` | Kullanıcı seviyesindeki `JAVA_HOME`, silinmiş `jdk-17.0.13.11` klasörünü gösteriyordu. Makine seviyesindeki doğru değeri eziyordu. | Kullanıcı `JAVA_HOME` değeri `C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot` yapıldı. |
| `Port 8081 is being used` | Benim başlattığım Metro açık kalmıştı. | Durdurdum. |
| `Unable to establish loopback connection` | JDK'nın `Pipe` çağrısı, yalnızca benim araç ortamımda düşüyor. Senin terminalinde Gradle sorunsuz çalıştı. | Derlemeyi senin terminal sekmesinde çalıştırdım. Başarılı. |

Not: Build mevcut `android/` klasörüyle yapıldı, yani `plugins/withVeraNativeAndroid.js` bu build'de çalışmadı.
Plugin'in temiz bir `expo prebuild` sonrasında çalışması hâlâ yalnızca geçici kopyada doğrulandı. Native Kotlin
dosyaları (`AlarmChannelModule` dahil) `compileDebugKotlin` ile derlendi ve `NativeModules` içinde göründü.

## 2. Emulatorda bulunan ve düzeltilen hatalar

1. **Yeni metinlerin hiçbiri çözülmüyordu.** `en.json` ve `tr.json` içinde `ramadan`, `community`, `intention`, `benim`
   blokları dosya köküne yazılmıştı. i18n yalnızca `translation` altını okur. Sonuç: Ramazan kartında ham anahtar
   (`ramadan.card.prep.1`), Türkçe-İngilizce karışık metin, halka/dua/niyet/Benim metinlerinde varsayılan Türkçe.
   Bloklar `translation` içine taşındı (çakışma yok). `tests/locale-structure.test.mts` bunu artık yakalıyor.
2. **Ramazan kartı dizi anahtarı.** `prep` ve `daily` dizi, ama kod `prep.1` diye okuyordu. Artık diziyi bütün okuyup
   indeksle seçiyor, boşsa notu hiç çizmiyor (ham anahtar basmaz).
3. **Benim sayfası.** Başlık, geri düğmesi ve üst boşluk yoktu, ilk satır durum çubuğunun altında kalıyordu.
   Diğer ekranlarla aynı düzene getirildi (arka plan, başlık, geri düğmesi, güvenli alan).
4. **Bildirim Sağlığı kartı.** Haftalık niyet hatırlatması "Sıradaki planlı alarm: Mon 9:00 AM" olarak görünüyordu.
   Hatırlatma bu hesaptan çıkarıldı. Alarm planlı değilken kart doğru olarak "No alarm scheduled" diyor.

Sonrasında: `tsc` temiz, ESLint temiz, test sayısı 90 → 96, hepsi geçiyor.

## 3. Ekran ekran durum

| Ekran | Durum |
| --- | --- |
| Açılış / karşılama / izin istekleri | Çalışıyor (bildirim ve konum izni emulatorda verildi) |
| Ana sayfa (vakitler, geri sayım, İstanbul seçimi) | Çalışıyor. Şehir seçince 100 ezan bildirimi planlandı |
| Ramazan kartı | Çalışıyor: "86 days until Ramadan", 8 Şubat 2027 (hesap doğru) |
| Benim sayfası | Çalışıyor: niyet kaydedildi, hatırlatma anahtarı açıldı, 2 WorkManager işi görüldü |
| Topluluk | Çalışıyor. Hatim halkası ve dua isteği kartı hata durumunda (bkz. 4) |
| Kur'an | Çalışıyor |
| Tesbih | Çalışıyor |
| Esmaül Hüsna ve Dualar | Çalışıyor |
| Günün içeriği | Çalışıyor |
| Kıble | Konum yok mesajı gösteriyor (emulatorda GPS yok, beklenen) |
| Ayarlar (Veri kaynakları, Gizlilik, Bildirim Sağlığı) | Çalışıyor |
| Başarılar, Zekat, Hava durumu | Çalışıyor (hava durumu uygulama içinden açılınca) |
| Namaz geçmişi, Hac ve Umre | Açıldı, hata logu yok. Görsel olarak incelenmedi |
| Reklamlar | Test bannerları yükleniyor |

## 4. Çalışmayanlar ve doğrulanamayanlar

- **Hatim halkası ve dua isteği: Firestore `PERMISSION_DENIED`.** `hatimRings/ramazan-1448/parts`, `duaRequests` ve
  `amens` sorgularının üçü de reddediliyor, çünkü yeni `firestore.rules` ve `firestore.indexes.json` canlı projeye
  deploy edilmedi. Ekranlar çökmüyor, "Something went wrong / Try again" gösteriyor. Cüz alma, bitirme, bırakma,
  dua isteği ve amin akışı bu yüzden **test edilemedi**.
- Denenmedi: paylaşım kartı modalı, widget ekleme, gerçek ezan/hatırlatma tetiklenmesi, "Send a test alert in 10 s".
- Pazartesi 09:00 hatırlatmasının zamanında gelmesi cihazda gözlenemez.
- Rules ve indexes için emulator testi yapılmadı.
- Diğer 32 dilde yeni anahtarlar İngilizceye düşer. "Doğrulanmış" metni orada eski kaldı.

## 5. Önceden var olan küçük bulgular (dokunulmadı)

- İngilizce arayüzde Türkçe yüzde biçimi: `%0`, `%87`.
- Kur'an ekranında "Quran Khatm Trac..." başlığı kesiliyor.
- Yüzen tab bar, kaydırılan içeriğin üstüne biniyor (tasarım gereği şeffaf, alt boşluk yeterli mi kontrol edilebilir).

## 6. Yaptığım ortam değişiklikleri

- Temurin JDK 17.0.21 kuruldu (winget). Kullanıcı `JAVA_HOME` değeri güncellendi.
- Emulatorda bildirim ve konum izni verildi, bir niyet kaydedildi, hatırlatma açıldı, İstanbul seçildi.
- Metro, "Vera android build" terminal sekmesinde çalışıyor.

## 7. Sıradaki adımlar

1. `firestore.rules` ve `firestore.indexes.json` deploy (onayın gerekir). Sonra hatim halkası ve dua akışını emulatorda tekrar dene.
2. Temiz `expo prebuild` ile native plugin'i gerçek build'de doğrula.
3. Gizlilik politikası URL'si, AdMob ekran birimleri.
4. 32 dil için yeni anahtarlar ve "hesaplanmış" metni.
5. Commit (istediğinde).

## 8. İkinci tur: PERMISSION_DENIED kaynağı, topluluk düzeni, banner istekleri

### PERMISSION_DENIED kaynağı
Sebep: yeni `firestore.rules` ve `firestore.indexes.json` canlı projeye (`vera-azan`) deploy edilmedi. Kanıtlar:
- Reddedilen üç sorgu, yalnızca yeni koleksiyonlara ait: `hatimRings/ramazan-1448/parts`, `duaRequests`, `amens`. Eski `posts` ve `reactions` sorguları çalışıyor.
- `firebase firestore:indexes` canlıda yalnızca iki `posts` indeksini gösteriyor. `duaRequests (status, expiresAt)` indeksi canlıda yok.
- Canlıdaki son kural `match /{document=**}` ile her şeyi reddediyor, yeni koleksiyonlar bu yüzden düşüyor.
- `firebase deploy --only firestore:rules --dry-run`: kural dosyası hatasız derleniyor. Hiçbir şey yayınlanmadı.
- Yerel indeks dosyası, canlıdaki iki indeksi de içeriyor ve bir tane ekliyor. Deploy yalnızca ekleme yapar, silme yapmaz.

Notlar: kurallar ve indeks dosyası git'te yok (untracked). Kurallar emulatorda davranış olarak test edilmedi, yalnızca derleme doğrulandı.

### Topluluk düzeni
- Hatim halkası, dua istekleri ve "Neleri paylaşabilirim?" artık tek satırlık kompakt kartlar. İçerikleri alttan açılan pencerede (`CommunitySheet`).
- Özet kartı (paylaşım sayısı) ve Vera kartı küçültüldü. Akışın ilk gönderisi ilk ekranda görünüyor.
- Hatim halkası ve dua listesi penceresi emulatorda açılamadı, çünkü Firestore izin vermiyor. "Neleri paylaşabilirim?" penceresi açıldı ve çalışıyor.

### Banner istekleri
- Tüm yerleşimler zaten `lazy` idi, ama kural gevşekti: ekranın 80dp altındaki ve tab bar'ın arkasındaki banner için de istek atılıyordu.
- Yeni kural (`src/utils/adViewport.ts`, testli): slotun tamamı görünür alanın içinde olmalı (tab bar hariç), yan sayfalar sayılmaz, ve slot aynı yerde 1,5 sn durmalı. Yeni başlıyan sayfada Ramazan kartı gibi geç yüklenen içerik banner'ı aşağı itiyordu, istek yine de atılıyordu. Bu da artık atılmıyor.
- Emulator ölçümü (istek sayısı, kaydırmadan): Ana sayfa 0 → kaydırınca 1; Zekat 1 → 0; Başarılar 1 → 0; Namaz geçmişi 1; Hac-Umre 1 (ikisinde banner tamamen görünüyor, istek yerinde).
- Test sayısı 107, hepsi geçiyor.

## 9. Deploy ve canlı doğrulama

Deploy: `firebase deploy --only firestore:rules,firestore:indexes` ile `vera-azan` projesine yapıldı. Kurallar yayınlandı, `duaRequests (status, expiresAt)` indeksi eklendi (kısa süre "building" durumundaydı, sonra kullanıma açıldı). Mevcut iki `posts` indeksine dokunulmadı.

Emulatorda doğrulananlar:
- Hatim halkası canlı veriyi okuyor: 0 / 30 cüz. 30 cüz belgesi oluşuyor.
- Cüz alma, bırakma, tekrar alma ve "Okudum" akışı çalışıyor. "Okudum" sonrası sheet kapanıyor ve paylaşım kartı açılıyor. Alınan cüz uygulama yeniden başlayınca da duruyor.
- Dua istekleri kartı hatasız: "Henüz dua isteği yok."

Bu testleri canlı halkada değil, geçici bir test halkasında (`hatimRings/emulator-test-1`) yaptım, çünkü "Okudum" istemciden geri alınamaz. Sabit `HATIM_RING_ID` testten sonra `ramazan-1448` olarak geri alındı. Test halkasının belgeleri veritabanında duruyor (zararsız, uygulama okumuyor).
Silmek için: `firebase firestore:delete /hatimRings/emulator-test-1 --recursive`

Düzeltme: halka oluşturucu aynı anda iki döngü çalıştırıyordu ve ikinci döngünün yazıları kurallar tarafından reddediliyordu (zararsız ama gürültülü). Artık tek döngü çalışıyor.

Yapılmayanlar:
- Dua isteği oluşturma ve amin: Canlı veritabanına silinemeyecek istek yazmamak için denenmedi. Kendi isteğine amin kuralla yasak, ikinci kullanıcı gerekir.
- Kurallar emulator (rules unit test) ile test edilmedi.

## 10. Üçüncü tur: topluluk arayüzü, banner sıklığı, tab bar bulanıklığı, sürüm

### Topluluk arayüzü
- Sayfanın düz arka planı kaldırıldı; diğer sekmelerdeki gibi uygulama arka planı görünüyor.
- Tüm kartlar ortak bir cam stiline (`CommunityGlass.tsx`) geçti: yarı saydam yüzey, parlak ince kenar, üstte hafif ışıma. Canlı blur kullanılmadı, uzun listede kaydırma ucuz kalıyor.
- Gönderi kartlarında türün rengiyle ince kenar şeridi var. Kendi gönderin hâlâ ayrı vurgulu.
- Üst başlık, sekme seçici ve yuvarlak düğmeler de cam yüzeyli.

### Banner sıklığı
- Sayfa açılışında, sekmelerin hemen altında bir banner var. Bugün, Son 7 gün ve Paylaşımlarım sekmelerinin her biri kendi reklam gösterimini alıyor (sekme değişince yeni reklam).
- Akış içinde: 2. gönderiden sonra, sonra her 3 gönderide bir (eskiden her 4'te bir). Üst sınır 4'ten 6'ya çıktı. Kısa listede son gönderiden sonra bir banner.
- Banner artık uyarlanabilir boyutta (kart genişliğinde), eski sabit 320x50 yerine.
- İstek kuralı aynı: yalnızca tamamı ekranda görünen ve 1,5 sn yerinde duran slot için istek atılıyor. Liste sonundaki banner'ın görünebilmesi için alt boşluk, tab bar + bulanık bant + banner yüksekliği kadar yapıldı. Önceki halinde liste sonundaki banner hiç yüklenmiyordu, emulatorda görüldü ve düzeltildi.

### Tab bar arkası bulanıklığı
- Dock'un arkasında ve üstünde tam genişlikte bulanık bir bant var (hafif ve güçlü iki katman + renk geçişi). Altında kalan içerik bulanıklaşıyor.
- Android'de `dimezisBlurView` yöntemiyle gerçek bulanıklık. Emulatorda doğrulandı. Gerçek cihazda kaydırma performansı denenmedi.
- Bant, banner kuralına da sayıldı: bandın altında kalan banner görünür sayılmıyor.

### Sürüm
- `app.json`: 1.0.39 → 1.0.41, versionCode 41 → 42. 1.0.40 atlandı: üretilmiş Gradle dosyasında 1.0.40 / 41 yazıyordu, Play'deki durumu göremediğim için görünenlerin hepsinin üstüne çıktım.
- EAS bulut build kullanılamaz: EAS'ın uzak Android sürüm sayacı 8, Play'e yüklenenler 40 ve üstü. Release paketi yerelde, mevcut imza yapılandırmasıyla alınıyor (`gradlew bundleRelease`).
- `Vera_version_control.json` (uygulama içi güncelleme uyarısı) değiştirilmedi: `latestVersion` zaten eski (1.0.35). Paket Play'de yayına çıkmadan güncellenirse kullanıcılara henüz olmayan sürüm önerilir.

### Tab bar düzeltmesi
Bulanık bant kaldırıldı. Bulanıklık artık yalnızca tab bar'ın kendisi: aynı hap şekli, aynı boyut. Dock'un cam katmanı Android'de gerçek bulanıklıkla çalışıyor (`dimezisBlurView`). Dock'un üstündeki eski yumuşak renk geçişi aynen duruyor (blur değil). Banner kuralı ve topluluk alt boşluğu bandın eklenmeden önceki değerlerine döndü. AAB bu haliyle yeniden alındı (1.0.41 / 42).

### Tab bar şeffaflığı ve paylaşım merkezi
- Tab bar'ın cam yüzeyi artık şeffaf: yüzey tonu çok hafifletildi, blur yoğunluğu 70'ten 35'e indi, tonlama `default`. Arkasından geçen içerik bulanık görünüyor. İnce bir cam kenarı tüm çevreyi sarıyor. Eski tam çerçeve yok, hap şekli aynı.
- Topluluk sayfasında tek satır kaldı: "Neleri paylaşabilirim?". Ortak Hatim Halkası ve Dua İstekleri bu satırın açtığı pencerenin içine alındı. Pencere sırası: hatim halkası (30 cüz tablosu açık), dua istekleri (liste satır içinde, "Dua iste" kategori seçimi), "Paylaşım fikirleri" (namaz, hatim, zikir, başarım).
- Halka ve dua istekleri yalnızca pencere açıkken Firestore'u dinliyor (eskiden sayfa açıldığı anda dinliyordu).
- Cüz bitirme: pencere kapanıyor ve paylaşım kartı açılıyor, iki pencere üst üste binmiyor. Test halkasında (`emulator-test-1`) doğrulandı, sabit id `ramazan-1448`'e geri alındı. Test halkasında 5. ve 6. cüz "okundu" durumunda kaldı.
- AAB yeniden alındı (1.0.41 / 42).
