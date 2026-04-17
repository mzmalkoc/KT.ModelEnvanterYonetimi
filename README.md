# Model Envanter Mükerrer Tespit ve Yeni Talep Sistemi

> Kuveyt Türk Yapay Zeka Laboratuvarı — Bilgisayar Mühendisi Case Study
> **Aday:** Mahmut Zahid Malkoç | **Versiyon:** v0.2.17

Bu proje, banka genelinde model envanteri yönetiminde **mükerrer iş riskini önlemek** ve **yeni model taleplerini yönetmek** için tasarlanmış bir uygulamadır. İş birimlerinin talepleri envanterle anlamsal + leksikal olarak karşılaştırılır; benzer model varsa otomatik uyarı verir.

**Mimari:** 3-Aşamalı RAG + 3-Skorlu Kalite Sistemi + Kurumsal İş Akışı

**Öne Çıkan Özellikler:**
- 3-Aşamalı RAG (Multi-View Embedding + BM25 + Cross-Encoder Reranking)
- 3-Skorlu kalite sistemi (Açıklama Kalitesi + Bulunabilirlik + Zenginleştirme)
- Login sistemi + Kuveyt Türk departman yönetimi (18 birim)
- Talep geçmişi + düzenleme + skor karşılaştırma
- 90+ otoriter kaynaktan 999 terim ile bilgi zenginleştirme
- Bilingual UI (TR/EN) + kurumsal branding

---

## 🎯 Problem

Banka içinde birden fazla iş birimi kendi ihtiyaçlarına göre model talebinde bulunur. Talep edilen modelin **envanterde zaten var olup olmadığı bilinmez**. Bu durum:

- Mükerrer geliştirme maliyeti
- Tutarsız model çıktıları
- Kaybedilen kurumsal hafıza

riskini doğurur.

## 💡 Çözüm

**3-aşamalı RAG (Retrieval-Augmented Generation) mimarisi** ile akıllı eşleştirme:

1. **Multi-View Bi-Encoder** — Her model için 3 farklı vektör (kısa/normal/zenginleştirilmiş)
2. **BM25 Hybrid Search** — Bankacılık jargonu (KKB, OFAC, PCI-DSS) için keyword match
3. **Cross-Encoder Reranking** — Multilingual presizyon artırıcı

Sorgu hem Türkçe hem İngilizce olabilir; sistem multilingual embedding sayesinde **çapraz dilli (cross-lingual) arama** yapar.

---

## 🏗️ Mimari

```
┌────────────────────────────────────────────────────────────┐
│  FRONTEND - Next.js 14 + TypeScript + Tailwind + shadcn   │
│  • Bilingual UI (TR/EN dynamic toggle)                     │
│  • 3 sekme: Talep | Envanter | Sağlık                      │
│  • Skor breakdown + matched view göstergesi                │
│  • Port: 3000                                              │
└────────────────────────────────────────────────────────────┘
                  ↕ REST API (Pydantic kontratları)
┌────────────────────────────────────────────────────────────┐
│  BACKEND - 3-Aşamalı RAG Pipeline                          │
│                                                            │
│  AŞAMA 1: Multi-View Bi-Encoder                            │
│    ├ Her model için 3 vektör per dil = 6 toplam            │
│    │  • short:    sadece isim                              │
│    │  • normal:   isim + amaç                              │
│    │  • enriched: + anahtar kavramlar + standartlar        │
│    └ paraphrase-multilingual-MiniLM-L12-v2 (384-d, 50+ dil)│
│                                                            │
│  AŞAMA 2: BM25 Lexical Search                              │
│    └ rank-bm25 (Okapi BM25), TR + EN ayrı index           │
│                                                            │
│  HİBRİT SKOR: 0.65 × semantic + 0.35 × bm25               │
│  → TOP-10 aday                                             │
│                                                            │
│  AŞAMA 3: Cross-Encoder Reranking                          │
│    └ cross-encoder/mmarco-mMiniLMv2-L12-H384-v1            │
│                                                            │
│  FİNAL SKOR: 0.7 × hybrid + 0.3 × rerank                   │
│                                                            │
│  + 3-Skorlu Kalite Sistemi (Açıklama + Bulunabilirlik + Zenginleştirme) │
│  • Port: 8000                                              │
└────────────────────────────────────────────────────────────┘
                  ↕
┌────────────────────────────────────────────────────────────┐
│  VERİ - data/model_inventory.csv (9 kolon)                 │
│  • 30 bankacılık modeli (TR + EN)                          │
│  • Anahtar kavramlar (TR + EN)                             │
│  • İlgili düzenleyici standartlar                          │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Teknoloji Yığını

### Backend
| Bileşen | Versiyon | Amaç |
|---|---|---|
| Python | 3.13 | Runtime |
| FastAPI | 0.115 | REST API + Swagger |
| Uvicorn | 0.34 | ASGI server |
| Pydantic | 2.10 | Type-safe schemas |
| sentence-transformers | 3.3 | Bi-encoder + Cross-encoder |
| rank-bm25 | 0.2.2 | BM25 lexical search |
| scikit-learn | 1.6 | (opsiyonel matrix ops) |
| pandas | 2.2 | CSV okuma |

### Frontend
| Bileşen | Versiyon | Amaç |
|---|---|---|
| Next.js | 14.2 | App Router framework |
| TypeScript | strict | Type-safe development |
| Tailwind CSS | 3.4 | Utility-first CSS |
| shadcn/ui | latest | Kurumsal UI komponentleri |
| lucide-react | latest | İkon kütüphanesi |

### AI Modelleri
| Model | Boyut | Dil | Lisans |
|---|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` | ~120 MB | 50+ | Apache 2.0 |
| `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | ~250 MB | Multilingual | Apache 2.0 |

---

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler
- Python 3.11+ (3.13 ile test edildi)
- Node.js 18+ (v25 ile test edildi)
- ~500 MB disk alanı (AI modelleri için)
- ~1 GB RAM (modeller yüklendikten sonra)

### 1. Backend Kurulumu

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**Not:** İlk çalıştırmada AI modelleri (~370 MB) HuggingFace'den indirilir (~2-3 dk). Sonraki çalıştırmalar cache'ten yüklenir (~30-60 saniye).

Backend açıldığında: http://localhost:8000/docs (Swagger UI)

### 2. Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

Frontend açıldığında: http://localhost:3000

---

## 🎬 Kullanım Senaryoları

### Senaryo 1: Klasik Mükerrer Tespit (TR)
1. "Yeni Model Talebi" sekmesi
2. Form:
   - Adı: `Müşteri risk skoru`
   - Amacı: `Bireysel müşteri kredi başvurusu risk değerlendirmesi`
3. Sonuç: 🔴 **Credit Scoring Model — 0.894 (HIGH RISK)**

### Senaryo 2: Cross-Lingual (EN sorgu, TR envanter)
1. Form:
   - Name: `Predict customers leaving the bank`
   - Purpose: (boş)
2. Sonuç: 🔴 **Müşteri Kaybı Tahmin Modeli — 0.90 (HIGH RISK)**

   İngilizce sorgu, Türkçe envantere uydu — multilingual embedding sayesinde.

### Senaryo 3: Bankacılık Jargonu (BM25 Etkisi)
1. Form:
   - Adı: `OFAC`
   - Amacı: (boş)
2. Sonuç: 🟡 **Yaptırım Listesi Tarama Modeli — 0.638**

   Tek kelime jargon — BM25 keyword match olmadan bulunamazdı.

### Senaryo 4: Envanter Sağlığı (3-Skorlu Kalite Sistemi)
1. "Envanter Sağlığı" sekmesi
2. 3 skor kartı: Açıklama Kalitesi (62), Bulunabilirlik (84), Zenginleştirme (63)
3. 30 model sortable tablo + genişletilebilir detay (issues)

---

## 📊 A/B Test Sonuçları

Eski sürüm (sadece bi-encoder) vs Yeni sürüm (3-aşamalı RAG):

| Test | Eski | Yeni | İyileşme |
|---|---|---|---|
| `"fraud"` (1 kelime) | 0.42 | **0.605** | **+44%** |
| `"OFAC"` (jargon) | 0.40 | **0.638** | **+60%** |
| `"KKB raporu..."` | 0.50 | **0.711** | **+42%** |
| EN cross-lingual | 0.74 | **0.880** | **+19%** |
| TR uzun, doğal | 0.756 | **0.894** | **+18%** |
| `"PCI-DSS kart fraud"` | 0.50 | **0.864** | **+73%** |

**Ortalama iyileşme: +%42.6** | **6/6 testte iyileşme** | **Sıfır gerileme**

---

## 📁 Proje Yapısı

```
kt.ai/
├── backend/                       # 3-Aşamalı RAG backend
│   ├── main.py                    # FastAPI app + lifespan
│   ├── embeddings.py              # Multi-view encoder + BM25 + cross-encoder
│   ├── similarity.py              # 3-stage pipeline + score blending
│   ├── quality.py                 # 3-Skorlu kalite sistemi (8 kriter + AI findability)
│   ├── schemas.py                 # Pydantic kontratları
│   ├── ab_test.py                 # A/B test scripti
│   ├── requirements.txt
│   └── README.md                  # Backend kurulum detayları
│
├── frontend/                      # Next.js 14 + TS + Tailwind
│   ├── app/
│   │   ├── page.tsx               # Ana sayfa (4 tab + login kontrolü)
│   │   ├── layout.tsx             # AuthProvider + watermark
│   │   └── globals.css            # Tailwind + watermark CSS
│   ├── components/
│   │   ├── login-screen.tsx       # Login ekranı (e-posta + şifre)
│   │   ├── similarity-form.tsx    # Talep formu (departman + öncelik)
│   │   ├── results-panel.tsx      # Skor breakdown + gereklilikler
│   │   ├── request-history.tsx    # Talep geçmişi (genişletilebilir)
│   │   ├── inventory-table.tsx    # Envanter + keywords/standards/sources
│   │   ├── quality-dashboard.tsx  # 3-skorlu kalite dashboard
│   │   ├── header.tsx             # Logo + kullanıcı profili + çıkış
│   │   ├── footer.tsx
│   │   ├── language-toggle.tsx
│   │   └── ui/                    # shadcn/ui komponentleri
│   ├── lib/
│   │   ├── api.ts                 # Backend fetch wrapper
│   │   ├── auth.tsx               # Auth context (localStorage session)
│   │   ├── request-history.ts     # Talep geçmişi localStorage
│   │   ├── i18n.ts                # TR/EN string tablosu
│   │   └── utils.ts
│   ├── types/index.ts             # API tip tanımları
│   └── package.json
│
├── data/
│   ├── model_inventory.csv        # 30 model x 9 kolon
│   └── model_sources.json         # 30 model x 3+ kaynak linki
│
├── presentation/
│   └── SUNUM_ICERIK.md            # 18 slayt + Q&A + demo akışı
│
├── KAYNAKLAR.md                   # 80+ otoriter kaynak referansı
├── CHANGELOG.md                   # v0.1.0 → v0.2.17 versiyon geçmişi
├── README.md                      # bu dosya
└── .gitignore
```

---

## 🔑 Tasarım Kararları

### Neden 3-Aşamalı RAG?
Tek başına bi-encoder embedding semantik kavrayışı iyi yapar, ama:
- **Çok kısa sorgularda** (`"fraud"`) zayıf
- **Bankacılık jargonunda** (KKB, OFAC) yetersiz
- **Yanıltıcı eşleşmeleri** elemekte zayıf

3-aşamalı yaklaşım her zayıf noktayı kapatır:
- **Multi-view embedding** → kısa sorgu desteği
- **BM25** → exact keyword match (jargon)
- **Cross-encoder** → top-K precision boost

### Neden Lokal Embedding (OpenAI değil)?
- ✅ Veri bankadan dışarı çıkmaz → **KVKK + BDDK uyumu**
- ✅ Ek API maliyeti yok
- ✅ Latency garantisi (lokal ms vs API saniye)
- ✅ Internet bağımsız çalışır

### Neden Multilingual Model?
Banka çalışan profilinin gerçeği — hem Türk hem yabancı çalışanlar talep gönderir. `paraphrase-multilingual-MiniLM-L12-v2` 50+ dili **aynı vektör uzayında** anlar; çeviri servisi gerekmez, çapraz dilli arama otomatik çalışır.

### Neden Knowledge Enrichment?
Her model için sadece kullanıcı amaç metnini değil, **uluslararası standartlar (Basel III, FATF), endüstri terminolojisi (PCI-DSS, FICO) ve eş anlamlı kavramları** da embed ederek bilgi tabanını zenginleştirdik. McKinsey ve Anthropic raporlarında bu yaklaşım **"Knowledge Graph Augmented RAG"** olarak adlandırılır.

### Self-Validation → 3-Skorlu Kalite Sistemi
Sistem sadece kullanıcı talebini değil, **kendi envanterini de** 3 boyutta denetler:
- **Açıklama Kalitesi** (8 kriter): metin ne kadar iyi yazılmış?
- **Bulunabilirlik** (AI-based): model arandığında bulunabilir mi?
- **Zenginleştirme**: keyword/kaynak/standart yeterli mi?

Garbage in, garbage out — bu 3 boyutlu denetim iyileştirme alanlarını net gösterir.

### Kaynak Doğrulama
Envanterdeki 30 modelin açıklamaları rastgele üretilmedi — `KAYNAKLAR.md` dosyasında **80+ otoriter kaynak** ile referanslanmıştır (Basel, FATF, MASAK, OFAC, FICO, McKinsey, Akbank/Yapı Kredi faaliyet raporları vs.). Sıfır Wikipedia — tümü BIS, EBA, IEEE, Nature gibi kurumlardan.

### 3-Skorlu Kalite Sistemi (v0.2.17)
Her model 3 ayrı metrik ile değerlendiriliyor:
- **Açıklama Kalitesi (8 kriter):** uzunluk, aksiyon fiili, veri kaynağı, sonuç/karar, algoritma/teknik, düzenleyici referans, iş değeri, hedef kullanıcı
- **Bulunabilirlik (AI-based):** isim-açıklama embedding uyumu, ayırt edicilik (en yakın model mesafesi), TR-EN tutarlılık
- **Zenginleştirme:** keyword zenginliği (≥40 ideal), kaynak sayısı (≥5 ideal), standart referansları (≥5 ideal)

### Kurumsal İş Akışı
- Login sistemi (e-posta + şifre, localStorage session)
- Kuveyt Türk departman dropdown'u (18 birim, A-Z sıralı, "Diğer" metin kutusu)
- Öncelik seçimi (Düşük/Orta/Yüksek/Acil)
- Talep geçmişi (localStorage, filtreleme, genişletilebilir satırlar, Kontrol Et/Güncelle, tek tek silme)
- Eşleşen modelin gereklilikleri (keywords + standards + sources sonuç panelinde)
- Aksiyon butonları (Mevcut Modeli İncele / Model Sahibiyle İletişime Geç)

### Semantic Versioning
Proje v0.1.0'dan v0.2.17'ye kadar 19 versiyon ile geliştirildi. `CHANGELOG.md` dosyasında tüm versiyon geçmişi mevcuttur.

---

## 🚦 API Endpoints

### `GET /api/health`
Servis durumu kontrolü.
```json
{ "status": "ok", "model_loaded": true }
```

### `GET /api/inventory`
30 modelin tamamı (yeni alanlar dahil: `keywords_tr`, `keywords_en`, `standards`).

### `POST /api/check-similarity`
**Request:**
```json
{
  "name": "Müşteri risk skoru",
  "purpose": "Bireysel kredi risk değerlendirmesi",
  "language": "auto"
}
```

**Response:**
```json
{
  "input": { "name": "...", "purpose": "...", "detected_language": "tr" },
  "matches": [
    {
      "model": { /* model record (yeni alanlarla) */ },
      "similarity_score": 0.894,
      "semantic_score": 0.768,
      "bm25_score": 1.000,
      "rerank_score": 0.894,
      "matched_view": "enriched",
      "matched_language": "tr",
      "risk_level": "high"
    }
  ],
  "recommendation": "duplicate",
  "explanation": "Bu talep 'Kredi Skorlama Modeli'ne %89 oranında benzemektedir..."
}
```

### `GET /api/quality-check`
Envanter sağlık raporu — 3 skor: Açıklama Kalitesi (8 kriter), Bulunabilirlik (AI-based), Zenginleştirme.

### `GET /docs`
Otomatik üretilen Swagger UI dokümantasyonu.

---

## 🧪 A/B Test Çalıştırma

Tüm karşılaştırmalı testler `backend/ab_test.py` içinde:

```bash
cd backend
./venv/Scripts/python.exe ab_test.py
```

7 test (kısa/jargon/cross-lingual/uzun/PCI-DSS/negatif/bonus) çalıştırılır, her birinin skor breakdown'u + eski sistemle karşılaştırması raporlanır.

---

## 📊 Production'a Geçiş Yol Haritası

| Aşama | Yapılacak | Beklenen Etki |
|---|---|---|
| **Veri** | CSV → PostgreSQL + audit log | 10K+ model ölçeklenmesi |
| **Vector Storage** | In-memory NumPy → FAISS / Qdrant | Sub-saniye arama |
| **Auth** | LDAP / SSO entegrasyonu | Banka kullanıcı yönetimi |
| **API** | Rate limiting + API gateway + mTLS | Güvenlik |
| **Monitoring** | Prometheus + Grafana + drift detection | Model kalite izleme |
| **Workflow** | BPM entegrasyonu (talep onay/red akışı) | Operasyonel verimlilik |
| **LLM Augmentation** | "Neden benzer?" otomatik açıklama | UX iyileştirme |
| **Aktif Öğrenme** | Kullanıcı feedback ile fine-tune | Sürekli iyileşme |

---

## 📚 Belgeler

| Doküman | İçerik |
|---|---|
| [SUNUM_ICERIK.md](presentation/SUNUM_ICERIK.md) | 18 slayt sunum + Q&A + demo akışı |
| [KAYNAKLAR.md](KAYNAKLAR.md) | 80+ otoriter kaynak referansı |
| [CHANGELOG.md](CHANGELOG.md) | v0.1.0 → v0.2.17 versiyon geçmişi |
| [backend/README.md](backend/README.md) | Backend kurulum + API detayları |
| [frontend/README.md](frontend/README.md) | Frontend kurulum + bileşenler |

---

## 📝 Lisans

Bu proje case study amaçlıdır. AI modelleri (Apache 2.0) ticari kullanıma uygundur.

## 🤝 İletişim

**Mahmut Zahid Malkoç** — mzmalkoc@gmail.com
