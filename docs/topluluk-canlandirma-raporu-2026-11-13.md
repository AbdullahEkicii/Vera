# Topluluk: paylaşım çeşitlendirme ve canlandırma raporu

Tarih: 2026-11-13 | Kapsam: mevcut kod ve `docs/sosyal-akis-plani-2026-10-21.md` karşılaştırması | Durum: analiz, kod değişikliği yok

## 1. Mevcut durum (kodda doğrulandı)

**Akış ve etkileşim**
- Üç görünüm: "Bugün", "Son 7 gün", "Benim" (`src/components/CommunityScreen.tsx`). 30 sn'de bir yenileme, 20'lik sayfalama.
- Beş sabit tepki: 🤲 ❤️ 🎉 🌙 ⭐. Tepki, işlem (transaction) ile sayaçla birlikte yazılır (`src/services/communityService.ts`).
- Rapor var (`reports` koleksiyonu). Engelleme yalnızca cihazda çalışır (`blockedUids`).
- Vera'nın günlük mesajı: 8 sabit metin (`community.vera.m0…`). Gerçek kullanıcı verisi içermez.
- Alt kısımda `community_feed` banner'ı.

**Paylaşım tetikleyicileri (hepsi tek buton: "Paylaş" / "Şimdi değil")**
- Hatim tamamlanınca: `HatimTrackerCard.tsx`
- Başarım açılınca: `app/achievements.tsx`
- Zikir kutlaması: `TasbihScreen.tsx`
- 5/5 namaz kutlaması: `PrayerChecklistCard.tsx:308`. Plan bunu Faz 3'te ve varsayılan kapalı öngörüyordu; şu an açık.

**Dış paylaşım (topluluğa bağlı değil)**
- Görsel kart: `StoryCardShareModal.tsx` (`Sharing` / `Share`).
- Mağaza linki + utm: `referralService.ts` (`ShareSource`: `greeting | story | invite`).

**Arka plan**
- Otomatik gönderi: `functions/autoPublishCore.js`. Günde en az 2, gerçek gönderi arttıkça ek. Ağırlık: 5/5 namaz %50, zikir %20, hatim %15, başarım %15. Yazar: `community-auto`.
- Bildirimler: `community_reminder` (yatsı + 30 dk), `community_feed`.
- Analitik: plandaki olayların çoğu `analyticsService.ts` içinde var.

**Boşluklar**
- `reports` yalnızca yazılabilir (`firestore.rules`). Okuyan bir mekanizma yok: otomatik gizleme (plandaki "3 rapor") yok, inceleme ekranı yok.
- Tek çeşit gönderi: şablon metni. Dua, niyet, ortak hedef, kişisel özet gibi çeşitlilik yok.

## 2. Önce karar gerektiren konu: otomatik gönderiler

Plan, Bölüm 0 ve 7'de şunu söylüyor: **"Sahte paylaşım yok. Üretimde her gönderi gerçek bir olaydır."**

Kod ise `community-auto` yazarıyla şunları üretiyor:
- "Bugün 5 vakit namaz kılındı" (%50 ağırlıkla en sık)
- Gerçek olmayan sayılarla "{{ülke}}'den biri 1000 zikir çekti"

Bu, kimsenin yapmadığı bir ibadeti ve kimsenin çekmediği zikri, insanların gerçek sonuçlarıymış gibi gösterir. Sonuçları şunlardır:
- Plandaki ilkeyle doğrudan çelişiyor.
- Hassas ibadet bilgisini gerçek kişiye atfetmeden de olsa sahte gösteriyor.
- Topluluğa güvenen kullanıcı bunu fark ettiğinde güven kaybı büyük olur.
- Mağaza politikaları (yanıltıcı içerik) açısından risk taşır.

**Önerim:** Otomatik yazarı kapat (`functions/index.js` içindeki zamanlanmış fonksiyon). Yerine şunları koy:
- Açıkça "Vera" etiketli, gerçek veri içermeyen içerik (örn. "Bugünün hedefi: 1 hatim"). Zaten `CommunityScreen` içinde bu yapı var.
- Gerçek kullanıcı paylaşımlarından türetilen toplu sayaçlar (bölüm 3). Eşik altında gizli.

Bu karar senin. Kodu değiştirmedim.

## 3. Gerçek veriyle canlılık (sahte olmadan)

| Kaynak | Gösterim | Not |
|---|---|---|
| Bugünkü toplam paylaşım sayıları | "Bugün topluluk: 12 hatim, 340 zikir paylaşımı" | Cloud Function ile `stats/daily/{yyyymmdd}` (plan Bölüm 6). Eşik altında gizle (örn. 50). |
| Haftalık ortak hedef | "Bu hafta hedef 1000 hatim: 412" ilerleme çubuğu | Hedef `config/community` içinde. İlerleme sayaçtan. Plan Faz 4. |
| Dini gün teması | "Kadir Gecesi: bu gece 1 hatim hedefi" | `src/data/religiousDays.ts` zaten gün tanımlarını içeriyor. Vera etiketli. |
| Editör seçimi | "Vera'nın seçtikleri" | Gerçek gönderiden, admin işaretiyle (`featured: true`). Moderasyon gerektirir. |

## 4. Paylaşım seçenekleri (çeşitlendirme)

Hepsi serbest metin olmadan, şablon/kategori tabanlı. Bu, planın "kapı" ilkesini korur.

| # | Seçenek | Ne yapar | Değer | Zorluk | Risk |
|---|---|---|---|---|---|
| 1 | **Dua isteği** | Kategori seçilir (sağlık, aile, imtihan, rızık, rehberlik, vefat). Gönderi "Dua istekleri" görünümünde. 🤲 "Amin" olarak çalışır. | Çok yüksek: topluluğun kalbi | Orta | Hassas veri. Yalnızca kategori, metin yok. Rapor/moderasyon şart. |
| 2 | **Niyet kartı** | "Bu hafta Yasin okuyacağım", "Bu ay 3 hatim hedefi" gibi hazır niyetler. Haftalık geri dönüşle takip edilir. | Yüksek: geri dönüş | Düşük | Düşük |
| 3 | **Dış paylaşım kartı** | Topluluk gönderisi veya kişisel başarı, `StoryCardShareModal` ile görsel kart olarak Instagram/WhatsApp'a. Altında mağaza linki (`ShareSource: 'community'`). | Yüksek: büyüme (viral) | Orta | Düşük. Kart Vera markalı. |
| 4 | **Kişisel aylık özet** | "Bu ay 3 hatim, 12.000 zikir." Yerel veriden (`AppStorage`) üretilir, yalnızca kişiye, paylaşılabilir kart. | Orta-yüksek | Düşük | Düşük. Veri cihazda kalır. |
| 5 | **Ortak hedef** | Bölüm 3'teki haftalık kampanya, katkı sayacıyla. | Yüksek: "birlikte" hissi | Orta | Hedef gerçekçi olmalı. Yanlış hedef güveni kırar. |
| 6 | **Ramazan / bayram teması** | Dini gün kartı + özel şablonlar (iftar duası, teravih niyeti). | Yüksek, mevsimsel | Orta | Zamanlama. Ramazan'a kadar hazır olmalı. |
| 7 | **Vera'nın seçtikleri** | Haftalık, insan onaylı gerçek gönderi listesi. | Orta: kalite hissi | Düşük (manuel) | Moderatör iş yükü. |
| 8 | **Paylaşım merkezi** | Topluluk başlığında "Ne paylaşmak istersin?" sayfası: dua, niyet, özet, hedef. Şu an paylaşım yalnızca etkinlik sonrası açılıyor. | Yüksek: keşfedilebilirlik | Düşük-orta | Düşük |

**En etkili üçlü (önerim):** 1 (dua isteği), 3 (dış paylaşım kartı), 8 (paylaşım merkezi). Birlikte çalışırlar: merkez seçenekleri gösterir, dua isteği topluluk duygusu üretir, kart dışarıya taşır.

## 5. Uygulama fazları

**Faz A: Temizlik ve güven (küçük, önce bu)**
1. Otomatik yazarı kapat veya Vera etiketine çevir (`functions/autoPublishCore.js`, `functions/index.js`).
2. 5/5 namaz paylaşım prompt'unu `PrayerChecklistCard.tsx` içinde ayarla gate'le: varsayılan kapalı, ayarlardan açılır (plan Faz 3).
3. Rapor okuma mekanizması: raporlu gönderiyi gizleme (`status: 'hidden'`) ve basit admin inceleme. Apple UGC kuralı, raporlara zamanında yanıt bekler. Bugün bu yok.
4. Engelleme sunucu tarafında da çalışmalı, yoksa yalnızca bu cihazda gizlenir.

**Faz B: Yeni paylaşım türleri (1–2 hafta)**
1. Dua isteği: `templateKey: 'dua.request'`, `params.category` (allowlist). Görünüm: "Dua istekleri". 🤲 ile amin.
2. Dış paylaşım kartı: `StoryCardShareModal` yeniden kullanılır. `ShareSource`'a `community` eklenir.
3. Paylaşım merkezi: topluluk başlığında sayfa.
4. Niyet kartı: hazır niyet listesi, yerel hatırlatma (haftalık).

**Faz C: Gerçek sayaçlar ve kampanya**
1. `stats/daily/{yyyymmdd}` (Cloud Function, `onCreate` ile posts'tan).
2. Eşik altı gizleme ve "Bugün topluluk" başlığı.
3. Haftalık ortak hedef (`config/community`).
4. Dini gün kartı (`religiousDays.ts`).

**Faz D: Ölçüm**
- Plandaki analitik olaylarına ek: `dua_request_created`, `share_card_exported`, `share_card_store_click`, `campaign_progress_viewed`.
- Haftalık huni: açılış → paylaşım merkezi → gönderi → tepki/amin.

## 6. Teknik etkiler (bir şablon eklemek için)

Yeni bir `templateKey` eklemek şu dosyalara dokunur:
- `src/utils/community.ts`: `COMMUNITY_TEMPLATES`, `isValidPostPayload` allowlist.
- `src/utils/communityText.ts`: `templateText` case'i.
- `src/localization/*.json` (37 dosya): `community.templates.*`.
- `firestore.rules` satır 48: `templateKey in [...]` listesi. Deploy gerekir.
- `functions/autoPublishCore.js` (otomatik gönderi istenirse).

Bu, "yeni olay türü = bilinçli kapı" ilkesinin karşılığı. Yeni tür eklemek için kural ve istemci birlikte güncellenmeli.

## 7. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| Sahte gönderi güveni kırar | Çok yüksek | Bölüm 2'deki karar |
| Dua isteği hassas veri içerir | Yüksek | Yalnızca kategori, metin yok, rapor ve gizleme |
| Raporlar işlenmiyor (UGC) | Yüksek (mağaza reddi) | Faz A3 |
| Boş akış ilk dönemde | Yüksek | Dürüst boş durum, Vera mesajları, gerçek sayaçlar |
| Dış paylaşım kartı Vera dışında yayılır | Düşük | Kart üzerinde kaynak ve mağaza linki |
| Ortak hedef yanlış hesaplanır | Orta | Hedef, sayaçtan bağımsız ve ulaşılabilir ayarlanır |
| Ramazan'a kadar yetişmez | Orta | Faz B'den önce Ramazan kartı için kısa hedef |

## 8. Ölçüt

- Paylaşım merkezi açılma oranı ve kaynağı.
- Dua isteği başına amin (🤲) sayısı. Dua isteklerinin cevap oranı.
- Dış paylaşım kartı: oluşturma, paylaşma, mağaza tıklama.
- Haftalık hedef ilerlemesi ve tamamlanma.
- Rapor sayısı ve yanıt süresi (Faz A3 sonrası).
- D7/D30 elde tutma: paylaşanlar ile paylaşmayanlar arasında (yalnızca gözlem).

## 9. Açık kararlar

1. Otomatik gönderiler: kapatılsın mı, yoksa "Vera" etiketli ve gerçek veri içermeyen bir biçime mi dönüştürülsün?
2. Dua isteği özelliği istenir mi? (Önerim evet, kategori tabanlı.)
3. Dış paylaşım kartı (Instagram/WhatsApp) öncelik olsun mu?
4. Ramazan teması için zamanlama ne? Kampanya Faz B'den önce mi?
5. Raporları kim inceleyecek? Ben bir admin ekranı yazabilirim, ama işlemeyi sen yapmalısın.
