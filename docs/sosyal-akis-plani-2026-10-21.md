# Vera: Anonim Dünya Akışı (Topluluk) Planı

Tarih: 2026-10-21 | Sürüm: 3 | Durum: plan, kod yok

## 0. Kararlar

| Konu | Karar |
|---|---|
| Yaş | Doğrulama yok. 13 yaş altı indirmez (mağaza yaş derecelendirmesi). |
| Ülke | Cihaz bölgesinden alınır. Topluluk ekranındaki ayardan değiştirilir. |
| İçerik | Serbest metin yok. Yalnızca başarılan olaylar, her dilde hazır şablonla. |
| Sahte paylaşım | Yok. Üretimde her gönderi gerçek bir olaydır. |
| Hacim | Günlük 100 üstü bekleniyor; mimari 1.000+ gönderi/gün için tasarlanır (Bölüm 6). |
| Görünüm | İki sekme: "Bugün" (varsayılan) ve "Son 7 gün". |
| Tepki | Sabit beş emoji: 🤲 ❤️ 🎉 🌙 ⭐. Yeni mesaj yok. |
| Sekme | Alt tab bar'a yeni sekme. |
| Banner | Ekranda sabit banner. Yerleşim Bölüm 5'te, risk Bölüm 9'da. |
| Analytics | Ekran, sekme, paylaşım hunisi ve tepki olayları (Bölüm 8). |

## 1. Konsept

Kullanıcı uygulamada bir olay başardığında (hatim, 1000 zikir, başarım) paylaşmak isteyip istemediğini sorulur. Paylaşım önceden hazırlanmış bir şablonla akışa düşer: "Türkiye'den biri 1.000 serbest zikir çekti." İngilizce kullanıcının gönderisi Türkiye'de Türkçe görünür, çünkü her dilde şablon hazır, çeviri anında yapılmaz.

## 2. İlkeler

1. **Yalnızca başarılan olaylar:** Serbest mesaj yok. Gönderi yalnızca uygulamanın izin verdiği şablon anahtarlarını taşır.
2. **Açık onay:** Her paylaşım o an verilen onayla yapılır. Varsayılan paylaşmamak.
3. **Anonimlik:** Ad, fotoğraf, e-posta, şehir yok. Gösterilen: "Anonim kardeş" ve isteğe bağlı ülke.
4. **Kıyas yok:** Sıralama, puan, "seni geçti" yok.
5. **Hassas veri yok:** Hangi namazın kılındığı ya da kaçırıldığı gösterilmez.
6. **Kolay çekilme:** Kullanıcı kendi gönderisini ve topluluktan çıkışını tek dokunuşla yapabilir.

## 3. Paylaşılabilir olaylar ve şablonlar

| Şablon anahtarı | Kaynak | Örnek (Türkçe) | Faz |
|---|---|---|---|
| `hatim.completed` | HatimTrackerCard | "Bir hatim tamamlandı" | 1 |
| `achievement.<id>` | achievementService | "{{title}} başarımını açtı" | 1 |
| `dhikr.milestone` | TasbihScreen | "{{country}}'den biri {{count}} serbest zikir çekti" | 2 |
| `prayer.fullday` | PrayerChecklistCard | "Bugün 5 vakit namaz kılındı" | 3 (varsayılan kapalı) |
| `kaza.completed` | KazaTrackerModal | "Bir kaza borcu kapatıldı" | 3 (varsayılan kapalı) |

Şablonlar 35 dil dosyasında `community.templates` altında tutulur. Sayılar ve ülke adları `Intl` ile yerelleştirilir. `Intl.DisplayNames` Hermes'te cihazda doğrulanmalı, desteklenmezse ISO kodu gösterilir.

Yeni olay türü eklemek hem şablon hem sunucu allowlist'i gerektirir. Bu bilinçli bir kapı.

## 4. Paylaşım akışı

1. Olay gerçekleşir, mevcut kutlama ekranı açılır.
2. Altta öneri: "Vera topluluğuyla paylaşmak ister misin?" Düğmeler: "Paylaş" ve "Şimdi değil".
3. "Paylaş" seçilirse önizleme: şablonun kullanıcının dilindeki hali, ülke, "Anonim kardeş". Metin değiştirilemez.
4. "Gönder" ile yayımlanır. Dokunuş olmadan hiçbir veri ağa çıkmaz.
5. Reddedilirse aynı olay için bir daha sorulmaz.

## 5. Topluluk ekranı

**Konum:** Alt tab bar'a yeni sekme. Mevcut sekmeler korunur, namaz vakti ekranı ilk sekme kalır. Tab etiketi 35 dilde `tabs` altına eklenmeli.

**Üst bölüm:** "Bugün" | "Son 7 gün" seçici, ülke seçici (bayrak ve ad), ayarlar simgesi.

**"Bugün" görünümü (varsayılan):**
- Başlıkta bugünkü özet: "Bugün 12 hatim, 340 zikir paylaşımı". Yalnızca eşik üstü sayılar gösterilir (Bölüm 7).
- Gönderi akışı, en yeni üstte, sayfalı (20'lik).
- Boş durum: "Bugün ilk paylaşımı sen yapabilirsin" ve olay tamamlanınca paylaşım önerisi.

**"Son 7 gün" görünümü:**
- Günlere göre gruplu: "Bugün", "Dün", "19 Ekim" gibi.
- Her gün tek satır özet, dokununca o günün gönderileri açılır.

**Gönderi kartı:** Üstte "Anonim kardeş · Türkiye · 12 dk önce", ortada şablon metni, altta tepki çubuğu.

**Tepkiler:** 🤲 ❤️ 🎉 🌙 ⭐. Kişi başı her emojiden en fazla bir tepki, tekrar dokunmak geri alır. Gönderiye yazı eklenmez.

**Banner (sabit):** Alt kısımda, tab bar'ın hemen üstünde, sabit yüksekliği olan bir banner. Gönderi kartlarının tepki düğmelerinden ayrı bir şeritte durur. Placement adı `community`. Banner ekran açıkken yüklü kalır, gizlenen sekmede yenilenmez (mevcut `isVisible` deseni).

**Ayarlar (topluluk ekranından):** Ülke seçimi (varsayılan cihaz bölgesi), ülkeyi gösterme açık/kapalı, topluluğa katılım açık/kapalı, kendi gönderilerimi sil.

## 6. Ölçek: günlük 1.000+ gönderi

Ölçek için tasarlanan parçalar:
- **Okuma:** Akış `createdAt` aralığıyla ve sayfalamayla okunur (20'lik sayfa). Gün ve `status` için bileşik indeks gerekir.
- **Yazma:** Gönderi tek belge yazımı. Yazma sayısı kullanıcı başına günlük limitle sınırlanır (örnek: 20).
- **Tepkiler:** Tepki kendi belgesinde (`uid_emoji` kimliği). Sayaç ayrı bir belgede, toplu yazım (`FieldValue.increment`) ile. Çok tepkili tek gönderide sıcak belge riski için sayaç parçalara (shard) bölünür.
- **Günlük özet:** Zamanlanmış Cloud Function her gece ve her saat başı toplam sayaçları `stats/daily/{yyyymmdd}` altına yazar. Ekran özeti buradan okur, her açılışta büyük sorgu yapmaz.
- **Maliyet kontrolü:** Ekran açılışında okunan belge sayısı sınırlı. Ayda okuma sayısı Firebase bütçe uyarısıyla izlenir. Tahmini maliyet için okuma sayısı = açılış sayısı × sayfa boyutu formülü kullanılır.
- **Acil durdurma:** Firebase Remote Config bayrağıyla paylaşım ve akış geçici olarak kapatılabilir.
- **Kötüye kullanım:** Saatlik gönderi sayısı anormal artışta Cloud Function uyarı üretir. Limitler Remote Config'ten ayarlanır, kod güncellemesi gerekmez.

**Moderasyon ölçeği:** Serbest metin olmadığı için içerik incelemesi çok daha az. Raporlar eşik üstünde (örnek: 3) otomatik gizlenir. Gizlenen gönderiler bir inceleme kuyruğuna düşer. Hacim 1.000'e yaklaşırsa kuyruk örneklemeyle (rastgele %10) ve günlük özetle yönetilir.

## 7. Güven ve dürüst canlılık

- Akışta yalnızca gerçek paylaşımlar yer alır. Üretimde sahte gönderi girmez.
- Günlük sayılar belirli bir eşiği geçmedikçe gösterilmez (örnek: 50 gönderi). Düşük hacimde "1 kişi" yazmak anonimliği bozar.
- Erken dönemde boş durum dürüst olur. Ekip duyuruları ve ortak kampanyalar canlılığı destekler.
- Geliştirme sırasında yerel sahte veri, dev bayrağı arkasında, üretime gitmez.

## 8. Analytics

Mevcut `analyticsService` (`logEvent`, `logScreenView`) kullanılır. Kişisel veri gönderilmez: uid, gönderi metni ve namaz ayrıntısı analitiğe girmez.

**Olaylar:**

| Olay | Parametreler | Ne ölçer |
|---|---|---|
| `community_opened` | `source` (tab, banner, notification, share_success) | Ekrana giriş kaynağı |
| `community_tab_changed` | `tab` (today, week) | Görünüm tercihi |
| `community_feed_page` | `tab`, `page`, `count` | Kaydırma derinliği |
| `community_share_prompt_shown` | `template_key` | Öneri sayısı |
| `community_share_prompt_answer` | `template_key`, `answer` (accept, decline, later) | Öneri kabul oranı |
| `community_share_submitted` | `template_key`, `country_visible` | Gerçek paylaşım |
| `community_share_failed` | `template_key`, `reason` | Hata analizi |
| `community_reaction` | `emoji`, `action` (add, remove) | Tepki kullanımı |
| `community_post_reported` | `template_key` | Kalite sinyali |
| `community_user_blocked` | — | Kötüye kullanım sinyali |
| `community_post_deleted` | `template_key` | Geri çekme oranı |
| `community_setting_changed` | `setting` (country, visibility, participation), `value` | Ayar kullanımı |

**Kullanıcı özellikleri:** `community_participant` (bool), `community_shares_bucket` (0, 1-5, 6+).

**Banner:** Mevcut `logAdRequest`, `logAdLoaded`, `logAdFailed` `community` placement'ı ile çalışır. Ek olarak tıklama ve gösterim oranı için ayrı olay yok, AdMob raporlarından okunur.

**Huni (funnel):** Ekran açılışı → paylaşım önerisi → kabul → gönderi başarılı → en az bir tepki. Firebase Analytics içinde özel huni olarak kurulur. Her adım için dönüşüm oranı haftalık izlenir.

**Gösterge paneli:** Firebase Analytics kontrol paneli ve BigQuery dışa aktarımı (opsiyonel). Haftalık tablo: açılış, paylaşım oranı, tepki oranı, rapor oranı, banner gelirinin ekran başına değeri.

## 9. Banner: gelir ve riskler

Sabit banner gelirini artırır, ama iki risk var, ikisi de kararını gerektirir:

1. **Yanlışlıkla tıklama:** AdMob politikası, reklamın yanlışlıkla tıklanmasını teşvik edecek yerleşimleri yasaklar. Banner tepki düğmelerinin hemen yanında olmamalı. Yerleşim, ayrı bir şeritte olmalı, tab bar'ın üstünde ve tepki düğmelerinden en az bir boşluk uzakta.
2. **Kullanıcı şikayeti:** Projenin kendi araştırması, rakiplerin en büyük şikayetinin reklam olduğunu ve Vera'nın reklamı ibadet ekranlarından uzak tutmasının fark yaratabileceğini söylüyor. Topluluk ekranı bir sosyal akış olduğu için, akışın ortasına yerleşen bir banner bu farkı zayıflatır. Sabit banner tam olarak bunu yapar. Bu yüzden: ekran, ibadet ekranı değil sosyal ekran olarak konumlandırılsın (önerim), ya da sabit banner yerine yerel reklam (native) kullanılsın (akış listesine her N gönderide bir). PRODUCT.md, liste ekranlarında native reklam kullanılmasını söylüyor.

Önerim: sabit banner, Bölüm 5'teki yerleşimle. Native reklam seçeneği ölçülüp karşılaştırılabilir.

## 10. Veri modeli ve güvenlik kuralları

```
posts/{postId}
  templateKey: string        // allowlist'te olmalı
  params: {
    count?: number           // 0 < count <= 1000000
    country?: string         // ISO 3166-1 alpha-2, büyük harf
    title?: string           // yalnızca achievement; allowlist anahtarı
  }
  lang: string               // sunucu doğrular
  authorUid: string          // yalnızca sahibi silebilir
  createdAt: timestamp
  status: 'visible' | 'hidden' | 'removed'
  reactionCounts: map        // yalnızca Cloud Function / transaction
  reportCount: number

posts/{postId}/reactions/{uid_emoji}   // emoji sabit küme içinde
reports/{reportId}                     // yalnızca oluşturulabilir
stats/daily/{yyyymmdd}                 // Cloud Function yazar
config/community                       // Remote Config ile yönetilir (bayraklar, limitler)
```

**Kurallar, özet:** Şablon ve alan allowlist'i. `authorUid` `request.auth.uid` ile eşleşir. `status`, `reportCount`, `reactionCounts` istemci tarafından yazılamaz. Okuma yalnızca `visible`. Tepki yalnızca kendi uid'siyle.

## 11. Yasal ve platform

- **Yaş:** Doğrulama yok. Mağaza yaş derecelendirmesi ve uygulamanın mevcut hedef kitlesi ile uyumlu. Uygulama 13 yaş altını hedeflemiyor, bu da açıklama metninde belirtilmeli.
- **KVKK:** Paylaşım için açık rıza metni (ayrı onay), gizlilik politikası güncellemesi, saklama süresi (örnek: gönderiler 12 ay, silinince anında).
- **Google Play:** UGC politikası (rapor, engelleme), Data safety formu (ülke, anonim kimlik, etkinlik), yaş derecelendirme anketinin güncellenmesi.
- **Apple:** Benzer UGC gereksinimleri.
- **Firebase:** Blaze planı, App Check, Anonymous Auth, Remote Config.

## 12. Uygulama fazları

**Faz 0: Hukuk ve tasarım**
- KVKK metinleri, gizlilik politikası, Play Data safety taslağı.
- Banner yerleşiminin ve native/sabit kararının netleşmesi.
- Topluluk ekranı tasarım incelemesi (tab bar'da sekme etiketi ve ikon).

**Faz 1: Temel akış**
- Anonim auth, App Check, Remote Config bayrakları.
- Firestore kuralları ve emulator testleri.
- Şablonlar (hatim, başarım) 35 dilde.
- Paylaşım önerisi, önizleme, onay.
- Topluluk ekranı: Bugün ve Son 7 gün, boş durumlar, sabit banner.
- Tepkiler (5 emoji). Rapor ve engelleme. Ayarlar.
- Analytics olayları (Bölüm 8).

**Faz 2: Zikir ve sayaçlar**
- `dhikr.milestone`, eşik kuralları, günlük özet Cloud Function.

**Faz 3: Hassas olaylar (varsayılan kapalı)**
- `prayer.fullday` ve `kaza.completed`, ek onay ekranı.

**Faz 4: Ortak kampanyalar**
- Ekip hedefleri, gerçek katkı sayacı. Ramazan teması ile.

**Faz 5: Ölçüm ve optimizasyon**
- Huni raporu, banner ve native reklam karşılaştırması, elde tutma farkı (yalnızca gözlem).

## 13. Açık kararlar (senden)

1. **Banner:** Sabit banner mi, native reklam mı, yoksa ikisinin karşılaştırması mı? (Önerim sabit banner, ama yerleşim Bölüm 5'te ayrılmış.)
2. **Yayın:** Önce Türkiye'de mi, yoksa tüm dillerde birlikte mi açılsın?
3. **Hassas paylaşımlar:** 5/5 namaz ve kaza Faz 3'te mi, yoksa hiç olmasın mı?

## 14. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| Boş akış ilk günlerde kullanıcıyı çeker | Yüksek | Dürüst boş durum, duyurular, ortak kampanyalar |
| Banner yanlışlıkla tıklanma / politika | Yüksek | Ayrı şerit, tepki düğmelerinden uzak yerleşim |
| Banner ile reklam şikayeti | Orta | Sosyal ekran konumu, native alternatif ölçümü |
| 1.000+ gönderi/gün maliyet ve yük | Orta | Sayfalama, önceden toplanan sayaçlar, Remote Config limitleri |
| Şablon çevirisi kalitesi | Orta | Her dil için ana dil okuyucu incelemesi |
| Gizlilik (kimlik sızması) | Çok yüksek | Anonim uid, şehir yok, sınırlı alanlar |
| Play politika reddi | Yüksek | UGC gereksinimleri (rapor, engelleme) baştan |
| Tepki spam'i | Düşük | Kişi başı emoji sınırı, hız limiti |

## 15. Ölçüt

- Topluluk açılış sayısı, sekme oranı ("Bugün" / "Son 7 gün").
- Paylaşım önerisi kabul oranı ve gerçek paylaşım oranı.
- Tepki oranı (gönderi başına ortalama), tepki dağılımı.
- Rapor oranı (gönderi başına). Eşik üstüne çıkarsa faz durdurulur.
- Banner: gösterim, doluluk, ekran başına gelir.
- Elde tutma: paylaşanlar ve paylaşmayanlar arasında D7 ve D30 farkı (yalnızca gözlem).
