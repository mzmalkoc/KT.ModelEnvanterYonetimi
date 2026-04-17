# Changelog — Model Envanter Yönetim Sistemi

---

## v0.2.17 (Güncel)
- 2-Skor sistemi: Açıklama Kalitesi (8 kriter) + Bulunabilirlik (AI-based, 3 kriter)
- Açıklama Kalitesi: uzunluk, aksiyon fiili, veri kaynağı, sonuç, algoritma, regülasyon, iş değeri, hedef kullanıcı
- Bulunabilirlik: isim-açıklama uyumu (embedding), ayırt edicilik (en yakın model mesafesi), TR-EN tutarlılık
- Zenginleştirme eşikleri zorlaştırıldı (keywords ≥40, sources ≥5, standards ≥5 için max puan)
- Sonuç panelinde "Eşleşen Modelin Gereklilikleri" bölümü (keywords + standards + sources)
- Quality dashboard 3 skorlu kart sistemi + 3 kolonlu tablo

## v0.2.16
- Yeni/Benzer/Mükerrer badge'leri aynı genişlikte (min-w 70px), metinler ortalı
- Silme butonu onay dialogu: "Bu talebi silmek istediğinizden emin misiniz?"

## v0.2.15
- Toplu silme kaldırıldı → her kaydın yanında tek tek çöp kutusu ikonu
- Ok ikonu en sola taşındı (satırın başına)
- Çöp kutusu en sağa yerleşti (hover: kırmızı)
- Silme tıklandığında sadece o kayıt silinir

## v0.2.14
- "Kontrol Et" ve "Güncelle" butonları ayrıldı
- Kontrol Et: metin değiştirildiğinde aktif, değişmezse pasif
- Güncelle: kontrol edildikten sonra aktif, kontrol edilmezse pasif
- Skor yükselirse yeşil mesaj, düşerse sarı uyarı (ama yine güncellenebilir)
- Güncelle tıklanınca localStorage'daki kayıt güncellenir (ad, hedef, skor, matches)
- Benzer (similar) modellerde de düzenleme + kontrol + güncelle aktif
- Mükerrer (duplicate) salt okunur kalır

## v0.2.13
- Mükerrer/benzer: eşleşme tablosu + salt okunur talep bilgileri (düzenleme yok)
- Yeni: düzenlenebilir form + güncelle butonu + skor karşılaştırma (değişiklik yok)

## v0.2.12
- Talep Geçmişi: tüm satırlar genişletilebilir (yeni modeller dahil)
- "Yeni" modeller için düzenlenebilir Model Adı + Modelin Hedefi alanları
- "Güncelle ve Kontrol Et" butonu — yeni bilgilerle tekrar benzerlik kontrolü
- Skor karşılaştırma: yeni skor > eski → yeşil "Güncellensin mi?" mesajı
- Skor karşılaştırma: yeni skor < eski → sarı "Tespit zorlaşır, eski bilgilerden devam" uyarısı
- Mükerrer/benzer modeller için eşleşme tablosu + düzenleme formu birlikte görünür

## v0.2.11
- Talep Geçmişi: satırlara tıkla → eşleşen modeller tablosu açılır (ok ile genişlet/daralt)
- Top-5 eşleşme kaydediliyor (model adı, kategori, skor, risk seviyesi)

## v0.2.10
- "Modelin Amacı" → "Modelin Hedefi" tüm frontend + backend'de

## v0.2.9
- Departman ID yerine display name gösterimi (sonuç paneli + talep geçmişi)

## v0.2.8
- Talep Edilen Model bilgi sıralaması: Birim → Model Adı → Modelin Hedefi

## v0.2.7
- Aksiyon butonları (Mükerrer → "Mevcut Modeli İncele" + "Model Sahibiyle İletişime Geç")
- "Talep Edilen Model" bilgisi sonuç panelinde
- Toast bildirimi ("Talep başarıyla kaydedildi")
- Form gönderimden sonra otomatik sıfırlanma
- Tab badge (talep sayacı)
- Şifre doğrulama (demo: 123456)
- Departman display name düzeltmesi

## v0.2.6
- Talep Geçmişi sekmesi (4. tab)
- localStorage'da kalıcı kayıt (max 100)
- Birim ve sonuç bazlı filtreleme
- Temizle butonu

## v0.2.5
- Login sistemi (e-posta + şifre, localStorage session)
- Header'da kullanıcı profili + çıkış butonu
- Kuveyt Türk logosu (login + header + watermark)
- Favicon + sayfa başlığı güncellemesi

## v0.2.4
- Kuveyt Türk departman dropdown'u (18 birim, A-Z sıralı)
- "Diğer" seçilince metin kutusu
- Öncelik alanı (Düşük/Orta/Yüksek/Acil)
- Kurumsal e-posta alanı
- Zorunlu alan işaretleri (kırmızı yıldız)

## v0.2.3
- Envanter Sağlığı: Zenginleştirme Skoru kartı + Enrichment kolonu
- Birleşik skor hesaplaması (purpose + enrichment)
- Eşik etiketleri düzeltmesi (85/65)

## v0.2.2
- Referans kaynak linkleri envanter tablosunda tıklanabilir
- Wikipedia linkleri → BIS, EBA, FICO, FATF
- model_sources.json (30 model × 3+ kaynak)

## v0.2.1
- Kaynak-destekli envanter zenginleştirme
- 90+ otoriter kaynak okundu, 558 EN + 441 TR yeni terim
- Keyword sayısı ~10 → ~27 (%170 artış)
- Uzman jargon testi: 10/12 doğru (%83)

## v0.2.0 — Mimari Yükseltme: Hibrit RAG
- 3-Aşamalı RAG mimarisi (Multi-View + BM25 + Cross-Encoder)
- 6 embedding vektörü per model (3 view × 2 dil)
- BM25 Okapi lexical search
- Cross-encoder reranking (mmarco-mMiniLMv2)
- Skor breakdown (anlamsal + BM25 + rerank)
- Matched View badge
- CSV'ye Anahtar Kavramlar + Standartlar kolonları
- A/B test: +%44.7 ortalama iyileşme

---

## v0.1.6
- KAYNAKLAR.md oluşturuldu (66+ otoriter kaynak)
- Basel, FATF, MASAK, OFAC, FICO, McKinsey, IEEE, Nature referansları
- 5-Tier kaynak hiyerarşisi

## v0.1.5
- Root README.md + backend/README.md + frontend/README.md
- SUNUM_ICERIK.md (sunum içeriği ilk versiyon)
- .gitignore

## v0.1.4
- Backend ↔ Frontend E2E entegrasyon
- CORS yapılandırması (localhost:3000)
- Tüm endpoint'ler canlı test edildi

## v0.1.3
- Next.js 14 + TypeScript + Tailwind + shadcn/ui frontend
- 3 sekme: Yeni Model Talebi, Model Envanteri, Envanter Sağlığı
- Bilingual UI (TR/EN toggle)
- Responsive tasarım

## v0.1.2
- Self-validation katmanı (quality.py)
- 4 kriter (uzunluk, aksiyon fiili, veri kaynağı, sonuç)
- Envanter kalite skorlama (0-100)

## v0.1.1
- FastAPI backend (main.py, embeddings.py, similarity.py, schemas.py)
- paraphrase-multilingual-MiniLM-L12-v2 bi-encoder
- Multilingual cross-lingual eşleştirme (50+ dil)
- Swagger UI otomatik dokümantasyon

## v0.1.0 — İlk Prototip
- Proje iskeleti (backend/, frontend/, data/, presentation/)
- 30 bankacılık modeli CSV (TR + EN açıklamalar, 6 kategori)
- Temel cosine similarity eşleştirme mantığı

---

## v1.0.0 (Production — Planlandı)
- PostgreSQL + audit log
- FAISS/Qdrant vector DB
- LDAP/Active Directory
- API gateway + rate limiting
- Prometheus + Grafana
- BPM iş akışı
- Aktif öğrenme
