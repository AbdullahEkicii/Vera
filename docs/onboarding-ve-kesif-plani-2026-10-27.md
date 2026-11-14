# Onboarding sadeleştirme ve kademeli özellik keşfi planı

Tarih: 2026-10-27 · Sürüm: 1.0.34 (debug, emülatör) · Kapsam: hata taraması, silinme nedenleri, onboarding, özellik keşfi

## 1. Emülatörde yapılan kontroller

- Debug APK (`app-debug.apk`, 24 Ekim) emülatöre kuruldu, JS kodu Metro (8081) üzerinden çalıştırıldı.
- İlk açılış çöküş vermedi. Logcat'te `FATAL`, `AndroidRuntime` veya `ANR` kaydı yok.
- Metro logunda hata/uyarı yok. Yalnızca bilgi logları var (alarm kanalları oluşturuldu, vakitler çekildi, analitik ekran görüntüleme).
- İlk ekran, konum seçilmeden onboarding modalıyla açılıyor. Üstte iki adımlı gösterge ve üç özellik etiketi (Kuran & Ses, Kıble, Zikir Sayacı) var.

Not: Emülatör konumu New York olarak gelmiş; bu yüzden ana ekranda "New York" yazıyor. Bu bir hata değil, test ortamı.

## 2. Kullanıcılar neden siliyor? (en olası sebepler)

Önceki denetim (`docs/retention-audit-2026-10-15.md`) ve tekrar denetimi (`retention-audit-2026-10-15-round2.md`) aynı sonuçlara varmıştı. Bu oturumda veri sağlayamadım: Play Console'da Kaldırmalar metriğine tarayıcıdan ulaşamadım (sayfa zaman aşımına uğradı). Aşağıdakiler kod ve akış kanıtlarına dayanıyor, istatistiksel olarak doğrulanmış değil.

| Sıra | Neden | Kanıt |
|---|---|---|
| 1 | Sabah erken saatte sesli ezan ve alarm kanalı sessiz modu/DND'yi aşıyor | `AlarmChannelModule.kt` `setBypassDnd(true)`, varsayılan 10 bildirim |
| 2 | Onboarding konum adımı belirsiz; izin verilmeden "Konum Alınamadı" görünüyor | `WelcomeOnboardingModal.tsx:249-250` (İstanbul varsayılanı) |
| 3 | Kapatılamayan şehir modalı ve çevrimdışı arama | `CitySearchModal` (round2 bulgusu) |
| 4 | Boş reklam kartları ve yüksek reklam yoğunluğu | `BannerAdSlot.tsx` minHeight 56; ~19 reklam yuvası |
| 5 | Mağaza izinleri (mikrofon, üstte çizim, depolama) güven kaybettiriyor | `AndroidManifest.xml` |
| 6 | Bildirimler için uygulama içi kapatma anahtarı yok | `notificationService.ts` varsayılanları |

## 3. Onboarding: kısa ve anlaşılır hale getirme

Hedef: ilk açılışta en fazla **iki ekran**, her ekran tek karar.

**Ekran 1: Konum.** Başlık: "Vakitleri sana göre hesaplayalım". İki düğme: "Konumumu bul" (birincil), "Şehir seç" (ikincil). Alt satır: "Sonra ayarlardan değiştirebilirsin." "Şimdilik atla" varsa, vakitler yerel hesaplamayla gösterilsin ve ana ekranda şehir bandı çıksın.

**Ekran 2: Bildirim.** Başlık: "Ezanı kaçırma". İki düğme: "Ezan bildirimlerini aç" (birincil), "Sonra". Alt satır, izin istemeden önce: "Telefon sessizdeyken ezan çalmaz; istersen bunu ayarlardan değiştirebilirsin." Bu, round1'deki sessiz mod kararını onboarding'e taşır.

Onboarding'den çıkınca dil, hesaplama yöntemi ve reklam gösterilmez. Bunlar ayarlara taşınır.

## 4. Kademeli özellik keşfi (progressive disclosure)

Tüm özellikleri ilk gün göstermek yerine her özelliği ilgili anda tanıtmak.

**Kural tabanlı ipuçları (coach mark)**: Her özellik için bir tetikleyici, bir kez gösterim ve bir "tamam" düğmesi. Örnekler:

| Tetikleyici | Gösterilen ipucu |
|---|---|
| 2. açılış | "Kıble için pusulayı kullanmak üzere telefonu düz tut." |
| İlk namaz işaretlemesi | "Namazlarını işaretledikçe seri (streak) oluşur." |
| 3. gün | "Ezanı kendi sesinde duymak için bildirim sesini ayarlardan seç." |
| Ramazan başlangıcından 3 gün önce | "Sahur ve iftar hatırlatmalarını aç." |
| 7. gün | "Günlük ibadetini paylaşmak için kartı topluluğa gönder." |

**Ortak kurallar**: Bir oturumda en fazla bir ipucu. Kullanıcı kapatırsa bir daha gösterilmez. Ayarlarda "İpuçlarını sıfırla" bulunur. Depolama: MMKV (uygulama zaten kullanıyor).

**Özellik özet kartı**: Ana ekranda, kullanılmayan bir özellik olduğunda tek satırlık kart ("Kıble pusulası: Mekke yönünü bul"). Haftada en fazla bir kez.

## 5. Ölçüm (değişikliklerin işe yarayıp yaramadığını görmek için)

- Onboarding huni olayları: `onboarding_step_1`, `onboarding_location_result` (gps/manual/skipped), `onboarding_notification_result`, `onboarding_completed`.
- İpucu olayları: `tip_shown` (id), `tip_dismissed` (id), `tip_action` (id).
- 1. ve 7. gün dönüş oranı, 1. gün silinme oranı (Play Kaldırmalar ile karşılaştır).

## 6. Önerilen sıra

1. Onboarding'i iki ekrana indir ve konum metinlerini düzelt (P0-3, round1).
2. Bildirim varsayılanlarını ve sessiz mod davranışını değiştir (P0-1).
3. Kapatılabilir şehir modalı ve boş reklam kartı (P1-6, P1-12).
4. Coach mark sistemi ve ilk üç ipucu (MMKV tabanlı).
5. Olay ölçümünü ekle, iki haftalık veriyle karşılaştır.

## 7. Açık konular

- Play Console → İstatistikler → Kaldırmalar verisi bu oturumda okunamadı. Sen bakıp kaç gün sonra silindiğini paylaşırsan sebep önceliği netleşir.
- Ezan sesinin sessiz modda çalıp çalmayacağı kararı (ürün kararı).
- Adım 3'teki ipuçlarının metinleri 35 dile çevrilecek; i18n anahtarları eklenmeli.
