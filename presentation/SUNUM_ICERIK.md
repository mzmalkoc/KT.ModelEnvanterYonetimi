# Kuveyt Turk Yapay Zeka Laboratuvari -- Case Study Sunumu

**Aday:** Mahmut Zahid Malkoc
**Pozisyon:** Bilgisayar Muhendisi
**Konu:** Model Envanteri icin Akilli Mukerrer Tespit ve Yeni Talep Sistemi
**Sure:** 2 gun | **Versiyon:** v0.2.17 (25 versiyon)

> Bu dokuman: tam sunum icerigi (18 slayt) + savunma cumleleri + demo protokolu + Q&A hazirligi + teknik ek + kontrol listesi.

---

# BOLUM 1 -- SUNUM SLAYTLARI (18 Slayt)

## SLAYT 1 -- Kapak

**Baslik:**
> Model Envanteri icin Akilli Mukerrer Tespit ve Yeni Talep Sistemi

**Alt baslik:**
> 3-Asamali RAG + 3-Skorlu Kalite Sistemi + Kurumsal Is Akisi

**Aday:** Mahmut Zahid Malkoc
**Pozisyon:** Bilgisayar Muhendisi -- Kuveyt Turk Yapay Zeka Laboratuvari
**Versiyon:** v0.2.17
**Tarih:** Nisan 2026

---

## SLAYT 2 -- Problem Tanimi

### Mevcut Durum
- Banka genelinde birden fazla is birimi kendi ihtiyaclarina gore AI/ML model talep ediyor
- Talep edilen modelin **envanterde zaten var olup olmadigi bilinmiyor**
- Ayni veya benzer modeller **farkli isimlerle birden cok kez gelistiriliyor**

### Sonuc
- **Mukerrer is** -- kaynak israfi (ayni modeli iki farkli ekip gelistiriyor)
- **Tutarsiz model ciktilari** -- karar birligi bozuluyor
- **Kaybedilen kurumsal hafiza** -- yeniden ogrenme maliyeti

### Cozum Hedefi
> Yeni model talebini alip envanterle karsilastiran, benzer model varsa **otomatik uyari veren**, yoksa **yeni talep olarak kaydeden** akilli bir sistem.

---

## SLAYT 3 -- Cozum Yaklasimi: Semantic Similarity Search

Kullanici **dogal dilde** model talebini girer:
> "Kredi karti islemlerinde anormal aktiviteleri tespit eden model"

Sistem **anlamsal vektor uzayinda** envanteri tarar:
- "Card Fraud Detection" -- benzerlik %87 (UYARI)
- "Transaction Fraud Detection" -- benzerlik %74 (UYARI)
- "ATM Cash Forecast" -- benzerlik %12 (TEMIZ)

### Neden Sadece Anahtar Kelime Eslestirme Yetmez?
- "Musteri risk skorlama" ve "Customer risk assessment" -- kelime eslesmiyor
- Ama anlami ayni! -- **Embedding tabanli yaklasim** zorunlu
- Buna ek olarak: bankacilik jargonlari (KKB, OFAC, PCI-DSS) icin **keyword search** de gerekli
- En dogru sonuc icin **ikisini birlestirmek** gerekiyor

---

## SLAYT 4 -- Mimari (3-Asamali RAG)

```
FRONTEND  Next.js 14 + TS + Tailwind + shadcn/ui  (port 3000)
  Login | 4 sekme (Talep, Envanter, Sagligi, Gecmis) | Bilingual UI | KT branding
                          | REST API (Pydantic)
BACKEND   3-Asamali RAG Pipeline  (port 8000)
  ASAMA 1  Multi-View Bi-Encoder (3 vektor x 2 dil = 6/model)
           paraphrase-multilingual-MiniLM-L12-v2 (384-d, 50+ dil)
  ASAMA 2  BM25 Lexical Search (Okapi BM25, TR + EN ayri index)
           HIBRIT SKOR = 0.65 x semantic + 0.35 x bm25 --> TOP-10
  ASAMA 3  Cross-Encoder Reranking (mmarco-mMiniLMv2, multilingual)
           FINAL SKOR  = 0.70 x hybrid + 0.30 x rerank
  + Self-validation Engine (3-skorlu kalite sistemi)
                          |
VERI      model_inventory.csv (30 model, 9 kolon, TR+EN)
          model_sources.json (30 model x 3+ kaynak)
```

> **Anahtar mesaj:** Bu mimari ChatGPT, Perplexity, Claude gibi modern AI sistemlerinin retrieval temelidir.

---

## SLAYT 5 -- Cok Dilli (Multilingual) Eslestirme

### Bankada Gercek Senaryo
- Turk calisan: *"Kredi basvurularinda risk degerlendirmesi yapan model"*
- Yabanci calisan: *"Risk assessment for loan applications"*

**Her ikisi de ayni modeli (Credit Scoring) bulmali.**

### Multilingual Embedding Modelinin Sihri

`paraphrase-multilingual-MiniLM-L12-v2` farkli dillerdeki **ayni anlamli cumleleri** vektor uzayinda **cok yakin noktalara** yerlestirir:

```
"kredi skorlama" (TR)  ----+
                            |--- similarity = 0.85 (COK YAKIN!)
"credit scoring" (EN)  ----+

"kredi skorlama" (TR)  ---- "ATM cash" (EN)
                       similarity = 0.15 (UZAK)
```

### Avantajlar
- Ceviri servisi gerektirmez -- **ek maliyet yok**
- Veri lokalize kalir -- **KVKK uyumlu**
- Lokal embedding -- **veri bankadan disari cikmaz**
- 50+ dil destegi -- ileride genislet

> **Sunumda soyle:** "Kuveyt Turk gibi bir kurumda hem Turk hem yabanci calisanlarin talep gonderecegi gercegini goz onune aldim. Multilingual sentence transformer ile capraz dilli semantik arama kurguladim."

---

## SLAYT 6 -- Knowledge-Augmented Retrieval

### Problem
Kullanici kisa yazarsa (`"fraud"`, `"OFAC"`) sistem zayif eslestirme verir.

### Cozum: Kaynak-Destekli Envanter Zenginlestirme

90+ otoriter kaynak (BIS, FATF, FICO, IEEE, Nature, McKinsey...) **gercekten okunup** her model icin domain-spesifik terimler cikarildi ve embedding'lere eklendi:

```
Card Fraud Detection (zenginlestirilmis):
"Kredi/banka karti islemlerini gercek zamanli analiz eder...
 [Kavramlar: kart fraud; CNP; chargeback; skimming; PCI-DSS; 3D Secure; EMV; SMOTE...]
 [Standartlar: PCI-DSS v4.0; EMV 3DS; FFIEC; Visa Compromise]"
```

**Rakamlar:**
- 90+ otoriter kaynak sayfasi okundu
- **558 yeni Ingilizce** + **441 yeni Turkce** terim cikarildi
- Her modelin keyword sayisi ~10 --> ~27 (ortalama **%170 artis**)

### Multi-View Yaklasimi
Her model icin **3 ayri vektor** saklanir:
- **Kisa (Short):** sadece isim --> tek kelimeli sorgular icin
- **Normal:** isim + amac --> orta uzunluk sorgular icin
- **Zenginlestirilmis (Enriched):** + anahtar kavramlar + standartlar --> jargon icin

Sistem her sorguya **en uygun gorunumu** otomatik secer ve "Matched View" badge'i ile gosterir.

### Uzman Jargon Testi Sonuclari (Zenginlestirmenin Kaniti)

Bu terimler **sadece kaynaklardan cikarildi** -- orijinal envanterde yoktu:

| Uzman Sorgusu | Bulunan Model | Skor |
|---|---|---|
| `Tobit regression` | LGD Model | 0.709 |
| `SHAP explanation churn` | Churn Prediction | 0.656 |
| `CDD EDD KYC` | AML Model | 0.641 |
| `Pareto/NBD` | CLV Model | **0.899** |
| `Jaro-Winkler fuzzy` | Sanctions Screening | **0.755** |
| `Markowitz mean-variance` | Investment Recommendation | **0.791** |
| `Whisper Wav2Vec2 ASR` | Speech-to-Text | **0.806** |
| `MASAK STR supheli islem` | AML Model | 0.681 |

> **10/12 dogru eslestirme (%83)** -- kaynak zenginlestirme olmadan bu terimlerin **hicbiri** bulunamazdi.

> **Sunumda soyle:** "Kaynak zenginlestirme sayesinde sistem, bankacilik uzmanlarinin kullandigi akademik ve duzenleyici terimleri de taniyor. Ornegin bir risk uzmani 'Tobit regression' veya 'Basel CRE36' yazsa, bir uyum uzmani 'CDD EDD' yazsa, bir veri bilimci 'SHAP churn' yazsa -- sistem dogru modeli buluyor. Bu, 90+ otoriter kaynaktan cikarilan 558 Ingilizce + 441 Turkce terimin embedding'lere eklenmesiyle mumkun oldu."

---

## SLAYT 7 -- 3-Skorlu Kalite Sistemi (YENI -- v0.2.17)

### Skor 1: Aciklama Kalitesi (8 kriter, 100 puan)

Her model aciklamasi (TR + EN ortalama) 8 kriter uzerinden puanlanir:

| Kriter | Puan | Kontrol |
|---|---|---|
| **Uzunluk** | 13 pt | Ideal: 50-80 kelime |
| **Aksiyon Fiili** | 13 pt | "tahmin", "hesapla", "tespit", "analiz" |
| **Veri Kaynagi** | 13 pt | "musteri", "islem", "gecmis", "veri" |
| **Sonuc/Karar** | 13 pt | "skor", "karar", "oneri", "uyari" |
| **Algoritma/Teknik** (yeni) | 12 pt | "XGBoost", "LSTM", "lojistik regresyon" |
| **Duzenleyici Referans** (yeni) | 12 pt | "Basel", "BDDK", "KVKK", "GDPR" |
| **Is Degeri** (yeni) | 12 pt | "maliyet", "verimlilik", "risk azaltma" |
| **Hedef Kullanici** (yeni) | 12 pt | "musteri", "ekip", "yonetici", "analist" |

- Mevcut 4 kriter (v0.1.2'den): uzunluk, aksiyon fiili, veri kaynagi, sonuc
- Yeni 4 kriter (v0.2.17): algoritma/teknik, duzenleyici referans, is degeri, hedef kullanici

### Skor 2: Bulunabilirlik (AI-based, 3 kriter, 100 puan)

Embedding vektorleri kullanarak modelin semantik arama ile ne kadar kolay bulunacagini olcer:

| Kriter | Puan | Hesaplama |
|---|---|---|
| **Isim-aciklama uyumu** | 40 pt | Embedding cosine(isim, aciklama) -- isim ile amac tutarli mi? |
| **Ayirt edicilik** | 35 pt | En yakin modele mesafe -- diger modellerden ne kadar farkli? |
| **TR-EN tutarlilik** | 25 pt | cosine(TR_normal, EN_normal) -- iki dil birbirine uyumlu mu? |

- Bu skor tamamen AI-based: embedding modelinden gelen vektorlerle hesaplaniyor
- Dusuk bulunabilirlik = model adi ile aciklamasi uyumsuz veya baska bir modelle karistirilabilir

### Skor 3: Zenginlestirme (Zorlastirilmis Esikler)

Model envanter zenginlestirme kalitesini olcer:

| Kriter | Max Puan | Esik (max icin) |
|---|---|---|
| **Anahtar kavram zenginligi** | 40 pt | >= 40 keyword = max puan |
| **Referans kaynak sayisi** | 35 pt | >= 5 kaynak = max puan |
| **Standart referansi** | 25 pt | >= 5 standart = max puan |

- v0.2.17'de esikler zorlastirildi (eskiden daha dusuktu)
- Her model icin TR + EN ortalamasini alir

### Gercek Veriler (30 Model Ortalamasi)

| Skor | Ortalama | Yorum |
|---|---|---|
| Aciklama Kalitesi | **62** | 8 kritere gore degerlendirme; yeni 4 kriter ortalamayi dusurdu |
| Bulunabilirlik | **84** | AI-based; modellerin cogu iyi ayirt edilebilir |
| Zenginlestirme | **63** | Zorlastirilmis esikler (>=40 keyword, >=5 kaynak, >=5 standart) |

> **Sunumda soyle:** "3-skorlu kalite sistemi, envanterdeki her modeli 3 farkli boyutta denetliyor: aciklama ne kadar iyi yazilmis, model semantik aramada ne kadar kolay bulunuyor, ve zenginlestirme ne kadar kapsamli. Bu self-validation sayesinde 'garbage in, garbage out' riskini en aza indiriyoruz."

---

## SLAYT 8 -- Self-Validation Katmani

### Envanter Sagligi Dashboard

- 3 skor karti (Aciklama: 62, Bulunabilirlik: 84, Zenginlestirme: 63)
- Sortable tablo (her kolona gore siralama, 30 model)
- Satira tikla: detayli sorunlar listesi (her skor icin ayri issue listesi)
- Renk kodlama: yesil (>=90), sari (70-89), kirmizi (<70)
- Bucket dagilimi: Mukemmel (>=85) | Iyi (65-84) | Gelistirilmeli (<65)

> **Sunumda soyle:** "Modelin sadece kullanici talebini degil, kendi envanterini de kalite acisindan denetleyen bir self-validation katmani ekledim. Garbage in, garbage out prensibiyle envanter kalitesi dustukce AI eslestirme dogrulugu da duser -- bu yuzden self-correcting sistem kurguladim."

---

## SLAYT 9 -- Kaynak Dogrulama

### 30 Modelin Aciklamalari Nereden Geldi?

Aciklamalar **rastgele uretilmedi** -- `KAYNAKLAR.md` dokumaninda **80+ tiklanabilir kaynak** ile dogrulanmis.

**Sifir Wikipedia bagimliligi** -- tum Wikipedia linkleri BIS, EBA, FICO, FATF gibi otoriter kaynaklarla degistirildi.

### 5-Tier Kaynak Hiyerarsisi

| Tier | Kaynak Tipi | Ornekler |
|---|---|---|
| **1** | Duzenleyici Kuruluslar | Basel III (BIS), FATF, **MASAK 5549**, BDDK, OFAC, ECB |
| **2** | Endustri Liderleri | FICO, IBM, BioCatch, Feedzai, Vanguard, Klippa, Sumsub |
| **3** | Akademik | Nature, IEEE, Springer, ScienceDirect, arXiv, MDPI |
| **4** | Genel Referans | Investopedia, CFPB, Corporate Finance Institute |
| **5** | **Turk Bankaciligi** | Akbank, Yapi Kredi, BKM faaliyet raporlari, MASAK, Sabanci Uni. |

### Turk Bankaciligin Ozel Kanitlar
- **Akbank 2026 Ocak:** 750 GPU yapay zeka altyapi yatirimi (Fintechtime haberi)
- **Yapi Kredi:** "Sorumlu Yapay Zeka Ilkeleri" yayimladi (Fintechdunyasi)
- **Sabanci Universitesi:** ATM nakit tahmini akademik tezi
- **BKM 2024 Faaliyet Raporu:** Turkiye kart islem ve fraud verileri

> **Sunumda soyle:** "Envanterdeki 30 model rastgele uretilmemistir. Her biri Basel III/IV, FATF, MASAK, OFAC, FICO, McKinsey gibi uluslararasi ve yerel otoriter kaynaklarda standart olarak tanimlanmis modellerdir. KAYNAKLAR.md dokumaninda 80+ tiklanabilir referans mevcuttur -- sifir Wikipedia."

---

## SLAYT 10 -- Kurumsal Is Akisi (YENI -- v0.2.x)

### Login Sistemi (v0.2.5)
- E-posta + sifre ile giris
- localStorage session yonetimi
- Header'da kullanici profili + cikis butonu
- Kuveyt Turk logosu (login + header + watermark)
- Favicon + sayfa basligi guncellendi

> **Production'da LDAP/Active Directory ile entegre edilir.**

### Talep Formu (v0.2.4)
- **Kuveyt Turk departman dropdown'u:** 18 birim (A-Z sirali) + "Diger" (metin kutusu)
- **Oncelik secimi:** Dusuk / Orta / Yuksek / Acil
- **Kurumsal e-posta alani** (otomatik doldurulur)
- **Zorunlu alanlar:** kirmizi yildiz isareti ile belirtilmis
- Model Adi + Modelin Hedefi + Departman + Oncelik

### Sonuc Paneli (v0.2.7-v0.2.17)
- "Talep Edilen Model" bilgisi (Birim, Model Adi, Modelin Hedefi)
- **Aksiyon butonlari:**
  - Mukerrer --> "Mevcut Modeli Incele" + "Model Sahibiyle Iletisime Gec"
  - Benzer --> Ayni butonlar
  - Yeni --> Kaydedilir
- **Eslesen Modelin Gereklilikleri** bolumu (v0.2.17):
  - Keywords (anahtar kavramlar)
  - Standards (ilgili standartlar)
  - Sources (referans kaynak linkleri)
- Toast bildirimi ("Talep basariyla kaydedildi")
- Form gonderimden sonra otomatik sifirlama

---

## SLAYT 11 -- Talep Gecmisi (YENI -- v0.2.x)

### 4. Sekme: Talep Gecmisi (v0.2.6+)
- Tab badge ile talep sayaci gosterilir
- localStorage'da kalici kayit (max 100)

### Filtreleme
- Birim bazli filtreleme (departman dropdown)
- Sonuc bazli filtreleme (Mukerrer / Benzer / Yeni)

### Genisletilebilir Satirlar (v0.2.11+)
- Her satira tiklandiginda ok ile genisletilir/daraltilir
- Eslesen modeller tablosu acilir (Top-5 eslestirme: model adi, kategori, skor, risk seviyesi)

### Duzenleme ve Guncelleme (v0.2.12-v0.2.14)
- **Mukerrer (duplicate):** salt okunur -- duzenleme yok
- **Benzer (similar):** duzenlenebilir + Kontrol Et + Guncelle
- **Yeni (new):** duzenlenebilir Model Adi + Modelin Hedefi + Kontrol Et + Guncelle

**Kontrol Et butonu:** metin degistirildiginde aktif, degismezse pasif
**Guncelle butonu:** kontrol edildikten sonra aktif, kontrol edilmezse pasif

### Skor Karsilastirma
- Yeni skor > eski skor --> **yesil mesaj** ("Skor yuceldi, guncellensin mi?")
- Yeni skor < eski skor --> **sari uyari** ("Tespit zorlasir, eski bilgilerden devam")
- Her iki durumda da guncelleme yapilabilir

### Silme (v0.2.15-v0.2.16)
- Her kaydin yaninda **tek tek cop kutusu ikonu**
- Hover: kirmizi vurgu
- Tiklandiginda onay dialogu: "Bu talebi silmek istediginizden emin misiniz?"
- Onaylaninca sadece o kayit silinir

### UX Detaylari (v0.2.7)
- Badge genislikleri esit (min-w 70px), metinler ortali
- Ok ikonu en solda, cop kutusu en sagda
- Toast bildirimi tum islemlerde

---

## SLAYT 12 -- Genellestirme Testi

> Kritik soru: "30 modeli egittik, peki envantere yakin veya tamamen farkli bir sey yazarsak ne olur?"

### Test 1: Envantere YAKIN Ama Farkli Ifade (Bulmali)

| Sorgu | Bulunan Model | Skor | Sonuc |
|---|---|---|---|
| "Musteri memnuniyetsizligi olcumu -- sikayet ve geri bildirimlerden duygu cikarimi" | Sentiment Analysis | **0.829** | Mukemmel eslestirme |
| "Otomatik belge tanima sistemi -- kimlik, ehliyet ve faturalardan bilgi cikarma" | Document OCR | **0.840** | Mukemmel eslestirme |
| "Bankanin nakit pozisyonu tahmini" | Liquidity Forecasting | 0.516 | Dogru model, dusuk skor |
| "Kredi karti harcamalarinda supheli aktivite tespiti" | AML (0.479), Card Fraud (0.464) | -- | Dogru model 2. sirada |

**Yorum:** Detayli aciklama yazildiginda **mukemmel** (0.83-0.84). Kisa/soyut yazildiginda dogru modeli buluyor ama skor dusuk.

### Test 2: Envantere BENZER Ama FARKLI Amacli (Orta Skor Vermeli)

| Sorgu | Bulunan Model | Skor | Sonuc |
|---|---|---|---|
| "Kurumsal kredi risk modeli -- KOBI ve buyuk sirketler icin temerrit riski" | EAD Model | **0.827** | Kredi riski ailesine yonlendirdi |
| "Ic denetim anomali tespiti -- banka ici sureclerde usulsuzluk" | Transaction Fraud | 0.513 | Farkli oldugunu anladi |
| "Calisan performans tahmini" | Branch Footfall | 0.789 | "Workforce" kelimesi yaniltti |

**Yorum:** Sistem benzer aileye yonlendiriyor -- "kurumsal kredi" yazani kredi riski modeline, "ic denetim" yazani fraud modeline yaklastiriyor. Bu **dogru davranis** cunku is birimini uyariyor: "Benzer model var, inceleyiniz."

### Test 3: Envanterde HIC OLMAYAN Model (Reddetmeli)

| Sorgu | En Yakin | Skor | Karar |
|---|---|---|---|
| "Karbon ayak izi hesaplama -- portfoyun karbon emisyon etkisi" | VaR (0.480) | YENI | Dogru red |
| "Deprem risk sigortasi fiyatlama" | OpRisk (0.462) | YENI | Dogru red |
| "Sosyal medya marka algisi izleme" | Customer Acq (0.391) | YENI | Dogru red |
| "Drone ile sube guvenlik izleme" | Chatbot (0.422) | YENI | Dogru red |
| "Agricultural credit weather model" (EN) | Credit Scoring (0.464) | YENI | Dogru red |

**5/5 dogru red.** Envanterde olmayan modeller guvenle "Yeni model talebi" olarak isaretleniyor.

### Ozet Tablo

| Kategori | Dogruluk | Kritik Bulgu |
|---|---|---|
| Yakin (farkli ifade) | **%75** | Detayli yazildiginda mukemmel |
| Benzer ama farkli | **%67** | Ilgili aileye yonlendiriyor |
| **Yeni model (envanterde yok)** | **%100** | Kesin red, yanlis pozitif yok |
| **GENEL** | **%83** | Production'da feedback ile iyilestirilir |

> **Sunumda soyle:** "Sistem, envanterde olan modelleri %83 dogrulukla buluyor; olmayan modelleri %100 dogrulukla reddediyor. Mukerrer is riskini guvenle onler, gereksiz yere yeni model talebini engellemez."

---

## SLAYT 13 -- A/B Test Sonuclari (Olculen Iyilesme)

### Ayni Sorgular, Eski vs Yeni Sistem

| Test | Eski Sistem | Yeni Sistem | Iyilesme |
|---|---|---|---|
| `"fraud"` (1 kelime) | 0.42 | **0.605** | **+44%** |
| `"OFAC"` (jargon) | 0.40 | **0.638** | **+60%** |
| `"KKB raporu..."` | 0.50 | **0.711** | **+42%** |
| EN cross-lingual | 0.74 | **0.880** | **+19%** |
| TR uzun, dogal | 0.756 | **0.894** | **+18%** |
| `"PCI-DSS kart fraud"` | 0.50 | **0.864** | **+73%** |

### Ozet
- **6/6 testte iyilesme**
- **Ortalama: +%44.7**
- **Sifir gerileme**
- Negatif kontrol dogru reddediliyor

> **Sunumda soyle:** "Bu mimari ChatGPT'nin retrieval katmaniyla ayni paradigmayi kullanir. Her gelistirme adimini A/B testleri ile olctum. Final mimari, eski sisteme kiyasla 6 farkli sorgu tipinde ortalama %44.7 iyilesme sagladi."

---

## SLAYT 14 -- Gelistirme Sureci ve Versiyonlama

### Semantic Versioning ile Takip Edilen Gelistirme

```
v0.1.x -- TEK MODEL (Bi-Encoder) -- 7 versiyon
--------------------------------------------------
v0.1.0  Proje iskeleti + 30 model CSV
v0.1.1  FastAPI backend (bi-encoder, multilingual)
v0.1.2  Self-validation katmani (kalite skorlama, 4 kriter)
v0.1.3  Next.js frontend (3 sekme, bilingual UI)
v0.1.4  E2E entegrasyon (CORS, backend <-> frontend)
v0.1.5  Dokumantasyon (README + sunum)
v0.1.6  Kaynak arastirmasi (KAYNAKLAR.md, 66+ kaynak)

=========== MIMARI YUKSELTME ===========

v0.2.x -- HIBRIT RAG (Multi-View + BM25 + Cross-Encoder) -- 18 versiyon
--------------------------------------------------
v0.2.0   3-Asamali RAG mimarisine gecis (+%44.7 iyilesme)
v0.2.1   Kaynak zenginlestirme (90+ kaynak, 558 EN + 441 TR yeni terim)
v0.2.2   Referans linkleri (Wikipedia --> otoriter kaynaklar)
v0.2.3   Envanter Sagligi enrichment guncellemesi
v0.2.4   Departman, oncelik, e-posta alanlari
v0.2.5   Login sistemi + kurumsal branding (KT logo, favicon)
v0.2.6   Talep gecmisi sekmesi (4. tab, localStorage)
v0.2.7   Aksiyon butonlari, toast, form reset, tab badge, sifre dogrulama
v0.2.8   Talep Edilen Model bilgi siralamasi (Birim -> Model Adi -> Hedef)
v0.2.9   Departman ID yerine display name gosterimi
v0.2.10  "Modelin Amaci" --> "Modelin Hedefi" tum sistemde
v0.2.11  Genisletilebilir satirlar (Top-5 eslestirme tablosu)
v0.2.12  Yeni modeller duzenleme + guncelle + skor karsilastirma
v0.2.13  Mukerrer/benzer salt okunur; yeni duzenlenebilir
v0.2.14  Kontrol Et / Guncelle buton ayriligi + skor yesil/sari mesajlar
v0.2.15  Toplu silme -> tek tek cop kutusu + ok ikonu en sol
v0.2.16  Badge genislikleri esit + silme onay dialogu
v0.2.17  3-skorlu kalite sistemi (8 kriter + AI bulunabilirlik + zenginlestirme)
```

**Toplam: 25 versiyon (v0.1.0 - v0.2.17), 2 gun, 1 mimari yukseltme**

### Semantic Versioning Aciklamasi
- **v0.MAJOR.MINOR** -- case study icin pre-release
- **MAJOR** (0.1.x --> 0.2.x): mimari degisiklik (tek model --> 3-asamali RAG)
- **MINOR** (.0, .1, .2...): her yeni ozellik veya iyilestirme
- Production'da **v1.0.0** olacak

### Vibe Coding Sureci
> "Vibe Coding destekli bir uygulama" -- case study'nin ozel gereksinimi. AI agent'lari ile paralel gelistirme: backend + frontend ayni anda. Ben mimari kararlari, domain bilgisini ve kalite kontrolunu sagladim -- AI implementasyonu hizlandirdi.

> "AI kod yazar, insan **dogru sorulari sorar** ve **kararlari verir**."

---

## SLAYT 15 -- Muhendislik Durustlugu (Bug Hikayesi)

### Yasanan Olay
Ilk A/B testinde uzun Turkce sorgu icin sistem **eski surumden %17 daha dusuk** skor gibi gorundu.

### Detayli Debug
Manual cosine similarity hesaplamasiyla celiski ortaya cikti:
- API sonucu: 0.45 (dusuk)
- Manuel hesaplama (ayni veriyle): 0.45 (esit ama dusuk)
- Turkce diakritikli versiyon: **0.77** (gercek skor!)

### Kok Neden
Test script'te **Windows console encoding sorunu** yuzunden Turkce karakterler ASCII'ye cevrilmisti:
```
"Musteri" (test) != "Musteri" (CSV)  <-- multilingual model icin farkli tokenler!
```

Unicode karakterler (`u`, `s`, `i`) ile ASCII karsiliklari (`u`, `s`, `i`) multilingual tokenizer'da tamamen farkli token ID'lerine donusuyor.

### Duzeltme Sonrasi
**TEST 5 gercek skoru: 0.756 --> 0.894 (+%18 artis)**

### Cikarilan Ders
- **Test verin temiz mi?** Always validate.
- **Multilingual model nuance'i:** Unicode tokenization onemli.
- **Karar:** "Sistem bozuk" demeden once "Test bozuk olabilir mi?" sor.

> Bu hikaye sunumda **kalite muhendisligi bilinci** mesaji verir.

---

## SLAYT 16 -- Sonuclar & Kazanimlar

### Bu Prototip Neyi Cozdu?

**3-Asamali RAG Mimarisi:**
- Mukerrer is riskini 3-asamali RAG ile tespit ediyor (+%44.7 iyilesme)
- Cross-lingual (TR<->EN) calisiyor -- banka calisan profili gercegi
- Bankacilik jargonu ile calisiyor (OFAC, KKB, PCI-DSS, Basel CRE36)
- Veri guvenligi (lokal embedding, KVKK uyumlu)

**3-Skorlu Kalite Sistemi:**
- Aciklama Kalitesi (8 kriter, 100 puan)
- Bulunabilirlik (AI-based, 3 kriter, 100 puan)
- Zenginlestirme (zorlastirilmis esikler, 100 puan)
- Self-validation: envanter kendini denetliyor

**Kurumsal Is Akisi:**
- Login sistemi (e-posta + sifre)
- Kuveyt Turk departman dropdown'u (18 birim)
- Oncelik secimi + zorunlu alanlar
- Aksiyon butonlari (Mevcut Modeli Incele / Model Sahibiyle Iletisime Gec)
- Eslesen Modelin Gereklilikleri (keywords + standards + sources)
- Talep Gecmisi (filtreleme, genisletme, duzenleme, guncelleme, silme)

**Kalite Guvencesi:**
- Kaynak dogrulanabilir (80+ otoriter kaynak, 999 zenginlestirilmis terim)
- Genellestirme testi (%83 eslestirme, %100 yeni model reddi)
- A/B olculmus ve semantic versioning ile takip edilmis
- v0.1.0 --> v0.2.17, 25 versiyon, 2 gun

### Teknoloji Yigini
- **AI:** 3-stage RAG (Multi-View + BM25 + Cross-Encoder) + Knowledge Augmentation
- **Backend:** FastAPI + Python 3.13 + sentence-transformers + rank-bm25
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **UX:** Login, 4 sekme, bilingual UI, talep gecmisi, aksiyon butonlari
- **Dokumantasyon:** CHANGELOG, KAYNAKLAR, README, SUNUM (hepsi guncel)

---

## SLAYT 17 — Neyi Neden Seçtik? (Teknoloji Kararları ve Gerekçeleri)

### AI Tarafı

| Karar | Seçim | Neden? | Alternatif Neden Değil? |
|---|---|---|---|
| **Embedding modeli** | paraphrase-multilingual-MiniLM-L12-v2 (lokal) | Veri bankadan dışarı çıkmaz (KVKK), 50+ dil desteği, ücretsiz, CPU'da çalışır | OpenAI API: veri dışarı çıkar, maliyet var, internet bağımlı |
| **Neden tek model yetmedi?** | 3-Aşamalı RAG'a geçtik | Tek bi-encoder kısa sorgularda (%42) ve jargonlarda (%40) zayıftı | Tek modelde "OFAC", "KKB" gibi kısaltmalar bulunamıyordu |
| **Neden BM25 ekledik?** | Keyword eşleştirme | Bankacılık jargonu (OFAC, PCI-DSS, KKB) semantik olarak zayıf → exact match gerekli | Sadece semantic: jargon sorgularda %40 → BM25 ile %60+ |
| **Neden Cross-Encoder?** | mmarco-mMiniLMv2 (multilingual reranker) | Bi-encoder her cümleyi ayrı değerlendirir, cross-encoder ikisini birlikte → presizyon artar | Sadece bi-encoder: yanlış pozitif oranı yüksek |
| **Neden Multi-View?** | 3 embedding (kısa/normal/zenginleştirilmiş) | Tek kelime sorguları "short" view'da, detaylı açıklamalar "normal"da, jargon "enriched"da en iyi eşleşir | Tek view: ya kısa ya uzun sorgularda zayıf |
| **Neden kaynak zenginleştirme?** | 90+ kaynaktan 999 terim | "Tobit regression" gibi akademik terimler orijinal açıklamada yoktu → kaynaklardan eklendi | Zenginleştirme olmadan uzman jargon testlerinde %0 doğruluk |

### Frontend Tarafı

| Karar | Seçim | Neden? |
|---|---|---|
| **Next.js 14** | App Router + TypeScript | Modern bankacılık projeleri standartı, SSR, type-safe |
| **TypeScript** | Strict mode | Backend ↔ Frontend arasında type-safe iletişim, hata erken yakalanır |
| **Tailwind + shadcn/ui** | Utility-first CSS + hazır komponentler | 2 günde kurumsal görünüm, sıfırdan CSS yazmaya gerek yok |
| **Neden Streamlit değil?** | Next.js seçtik | Production-grade mimari mesajı, frontend/backend ayrımı bankacılık standardı |

### Backend Tarafı

| Karar | Seçim | Neden? |
|---|---|---|
| **FastAPI** | Python REST framework | Otomatik Swagger dokümantasyon, type-safe (Pydantic), async desteği |
| **Neden Flask/Django değil?** | FastAPI | Flask eski tarz, Django bu case için aşırı ağır, FastAPI modern ve hızlı |
| **CSV (veritabanı değil)** | Düz dosya | 30 model için yeterli, paylaşılabilir, şeffaf. Production'da PostgreSQL'e geçiş kolay |

### Kalite Sistemi

| Karar | Seçim | Neden? |
|---|---|---|
| **Neden 3 ayrı skor?** | Açıklama + Bulunabilirlik + Zenginleştirme | Tek skor her şeyi anlatamaz: iyi yazılmış ama bulunamayan vs iyi bulunan ama zayıf yazılmış modeller farklı aksiyon gerektirir |
| **Neden eşikler zorlaştırıldı?** | Keywords ≥40, Sources ≥5 | Herkes 100 alıyorsa sınav kolay demektir → iyileştirme alanı görünmez |
| **Neden AI-based bulunabilirlik?** | Embedding cosine ile ölçüm | Kelime aramayla ölçülemez — modelin gerçekten bulunup bulunmadığını ancak AI anlayabilir |

### Kurumsal Özellikler

| Karar | Seçim | Neden? |
|---|---|---|
| **Neden login sistemi?** | E-posta + şifre | Kim ne talep etti izlenebilmeli. Production'da LDAP/AD |
| **Neden departman dropdown'u?** | Kuveyt Türk gerçek birimleri | "Hangi birim en çok talep ediyor?" analizi yapılabilir, mükerrer talepler birim bazlı izlenir |
| **Neden Talep Geçmişi?** | localStorage + filtreleme | Talepler kaybolmamalı, birim yöneticisi ekibinin taleplerini görebilmeli |
| **Neden Kontrol Et / Güncelle ayrı?** | İki aşamalı süreç | Kullanıcı önce değişikliğin etkisini görsün, sonra bilinçli karar versin |

---

## SLAYT 18 — Gelecek Geliştirmeler ve Production Yol Haritası

### Kısa Vadeli (v0.3.0 — Hemen Yapılabilir)

| Geliştirme | Etki | Neden Gerekli? |
|---|---|---|
| **LLM ile "Neden benzer?" açıklaması** | Kullanıcıya doğal dilde neden eşleştiğini anlat | Şu an sadece skor var, sebep yok → kullanıcı karar veremez |
| **E-posta bildirimi** | Mükerrer tespit edildiğinde model sahibine otomatik e-posta | İş birimi modelin var olduğunu bilmeyebilir |
| **Dashboard analitik** | "Hangi birim en çok talep gönderiyor?" grafiği | Yönetici görünümü, kaynak planlama |
| **Model sahibi atama** | Her modele sorumlu kişi/birim atama | "Model Sahibiyle İletişime Geç" butonu gerçekten çalışır |
| **PDF/Excel export** | Talep geçmişini rapor olarak indir | Yöneticiye raporlama |

### Orta Vadeli (v1.0.0 — Production Release)

| Geliştirme | Etki | Neden Gerekli? |
|---|---|---|
| **PostgreSQL + audit log** | Kalıcı veri, 10K+ model ölçeklenmesi | CSV ve localStorage production'da yeterli değil |
| **FAISS / Qdrant vector DB** | Sub-saniye arama, ölçeklenebilir | In-memory NumPy 10K+ modelde yavaşlar |
| **LDAP / Active Directory** | Otomatik kullanıcı yönetimi | Manuel login production'da güvensiz |
| **API gateway + rate limiting** | Güvenlik, yük dengeleme | Bankacılık güvenlik standardı |
| **Prometheus + Grafana** | Model kalite izleme, drift detection | Embedding kalitesi zamanla düşebilir |
| **BPM iş akışı** | Talep → İnceleme → Onay/Red süreci | Şu an talep gönderiliyor ama onay mekanizması yok |

### Uzun Vadeli (v2.0.0 — İleri Özellikler)

| Geliştirme | Etki | Neden Gerekli? |
|---|---|---|
| **Aktif öğrenme** | Kullanıcı feedback ile eşik auto-tune | Sabit eşikler her domain'e uymaz |
| **Model yaşam döngüsü** | Talep → Geliştirme → Test → Production → Emekli | Sadece envanter değil, tam model yönetimi |
| **Otomatik envanter güncelleme** | Yeni model geliştirildiğinde envanter otomatik güncellenir | Manuel güncelleme unutulur |
| **Çapraz banka karşılaştırma** | Sektörel benchmark | "Bu modeli diğer bankalar da kullanıyor mu?" |
| **Fine-tuned embedding** | Bankacılık domain'ine özel sentence-transformer | Generic model vs domain-specific: %10-20 doğruluk artışı beklenir |

### Mevcut vs Production Karşılaştırma

| Özellik | Şu An (v0.2.17) | Production (v1.0.0) |
|---|---|---|
| Login | localStorage session | LDAP/AD SSO |
| Talep geçmişi | localStorage (max 100) | PostgreSQL + audit log |
| Embedding | In-memory NumPy | FAISS / Qdrant |
| Monitoring | Yok | Prometheus + Grafana |
| İş akışı | Bilgilendirme | Onay/red süreci (BPM) |
| Model sahipliği | Yok | Her modele sorumlu atanır |
| Bildirim | Toast (anlık) | E-posta + Slack |

---

## SLAYT 19 — Kapanış

> *"İyi mühendislik sadece kod yazmak değil — **doğru problemi tanımlamak**, **her kararın nedenini bilmek**, **sürdürülebilir çözüm** üretmek ve **her adımı ölçmektir**."*

**Model Envanteri için Akıllı Mükerrer Tespit ve Yeni Talep Sistemi**
3-Aşamalı RAG + 3-Skorlu Kalite Sistemi + Kurumsal İş Akışı
v0.1.0 → v0.2.17 | 25 versiyon | 2 gün

**Q&A için hazırım.**

**Mahmut Zahid Malkoç**
mzmalkoc@gmail.com

---

# BOLUM 2 -- SAVUNMA CUMLELERI (12 Adet)

> Sunum sirasinda veya Q&A'da dogrudan kullanabilecek **hazir cumleler**.

## Cumle 1 -- Mimari Genel Tanitimi
> "Sistemi 3 asamali RAG (Retrieval-Augmented Generation) mimarisine yukselttim: Multi-View Embedding ile her model icin kisa/normal/zenginlestirilmis 3 vektor, BM25 hybrid search ile bankacilik jargonu destegi, ve cross-encoder reranking ile multilingual presizyon. Bu mimari ChatGPT, Perplexity gibi modern AI sistemlerinin temelidir."

## Cumle 2 -- Veri Guvenligi (Bankacilik icin Kritik)
> "Multilingual sentence-transformer'i **lokal** calistirdim. Veri bankadan disari cikmiyor, ceviri servisi gerektirmiyor -- KVKK uyumu saglandi, ek maliyet yok. Production'da da ayni model lokal GPU'da calisir."

## Cumle 3 -- Kaynak Dogrulama
> "Envanterdeki 30 model rastgele uretilmedi. Her biri Basel III/IV (kredi riski), FATF ve MASAK (kara para aklama), OFAC (yaptirim), FICO (kredi skorlama), McKinsey (musteri analitigi) gibi uluslararasi ve yerel otoriter kaynaklarda standart olarak tanimlanmis modellerdir. KAYNAKLAR.md dokumaninda 80+ tiklanabilir referans mevcuttur -- sifir Wikipedia."

## Cumle 4 -- Turk Bankaciligi Baglantisi
> "Modellerin Turk bankaciligin fiilen kullanildigi, Akbank'in 2026 Ocak'ta acikladi 750 GPU'luk AI altyapi yatirimindan, Yapi Kredi'nin yayimladigi 'Sorumlu Yapay Zeka Ilkeleri'nden ve Sabanci Universitesi'nin ATM nakit tahmini akademik tezinden dogrulanabilir."

## Cumle 5 -- Multilingual Mesaji
> "Kuveyt Turk gibi bir kurumda hem Turk hem yabanci calisanlarin talep gonderecegi gercegini goz onune aldim. Multilingual sentence transformer ile capraz dilli (cross-lingual) semantik arama kurguladim. Turkce envantere Ingilizce sorgu, ya da tersi durumda bile sistem dogru eslestirmeyi buluyor."

## Cumle 6 -- Self-Validation ve 3-Skor Sistemi
> "Modelin sadece kullanici talebini degil, kendi envanterini de kalite acisindan denetleyen bir 3-skorlu self-validation sistemi kurguladim. Aciklama Kalitesi 8 kriter ile olcer, Bulunabilirlik embedding vektorleri ile hesaplar, Zenginlestirme keyword/kaynak/standart zenginligini degerlendirir. Bu 3 boyutlu denetim sayesinde 'garbage in, garbage out' riskini en aza indirdim."

## Cumle 7 -- Knowledge Augmentation
> "Her model icin sadece kullanici tanimi degil, uluslararasi standartlar (Basel III, FATF, OFAC), endustri terminolojisi (PCI-DSS, FICO, EMV) ve es anlamli kavramlar ile zenginlestirilmis embedding sakladim. Kullanici kisa yazsa bile sistem modelin tum bilgi katmanlarina karsi eslestirme yapar. Bu yaklasim McKinsey ve Anthropic raporlarinda 'Knowledge Graph Augmented RAG' olarak adlandiriliyor."

## Cumle 8 -- Kaynak Zenginlestirme Etkisi
> "Kaynak zenginlestirme sayesinde sistem, bankacilik uzmanlarinin kullandigi akademik ve duzenleyici terimleri de taniyor. Ornegin bir risk uzmani 'Tobit regression' veya 'Basel CRE36' yazsa, bir uyum uzmani 'CDD EDD' yazsa, bir veri bilimci 'SHAP churn' yazsa -- sistem dogru modeli buluyor. Bu, 90+ otoriter kaynaktan cikarilan 558 Ingilizce + 441 Turkce terimin embedding'lere eklenmesiyle mumkun oldu. Uzman jargon testlerinde 10/12 (%83) dogru eslestirme -- zenginlestirme olmadan bu terimlerin hicbiri bulunamazdi."

## Cumle 9 -- Kurumsal Is Akisi
> "Prototipi sadece bir AI demo'su olarak degil, kurumsal is akisina uygun olarak gelistirdim. Login sistemi, Kuveyt Turk'un 18 birimi icin departman secimi, oncelik belirleme, talep gecmisi ile takip, aksiyon butonlari, eslesen modelin gereklilikleri gibi ozellikler production'a yakin bir UX sagliyor. Login sistemi production'da LDAP/Active Directory ile entegre edilir, talep gecmisi PostgreSQL'e tasir."

## Cumle 10 -- Genellestirme
> "Sistemi 12 farkli genellestirme senaryosu ile test ettim: envantere yakin ama farkli ifadeli sorgular, benzer ama farkli amacli talepler ve envanterde hic olmayan yeni model talepleri. Sonuc: sistem envanterdeki modelleri %83 dogrulukla buluyor; envanterde olmayan modelleri %100 dogrulukla reddediyor. Mukerrer is riskini guvenle onluyor, gereksiz yere yeni model talebini engellemiyor."

## Cumle 11 -- Versiyonlama ve Gelistirme Sureci
> "Projeyi semantic versioning ile takip ettim. v0.1.x serisinde tek model bi-encoder ile 7 versiyon, v0.2.x serisinde hibrit RAG mimarisine gecis ile 18 versiyon -- toplam 25 versiyon, 2 gunde. Her versiyon CHANGELOG.md'de belgelenmis. Bu, iteratif gelistirme ve muhendislik disiplini gosteriyor."

## Cümle 12 — Mühendislik Dürüstlüğü
> "Geliştirme sırasında bir testte sistem geriliyor gibi göründü. Detaylı debug ile gerçek sebep ortaya çıktı: test script'imde Windows encoding sorunu yüzünden Türkçe karakterleri ASCII'ye çevirmiştim. Multilingual model için 'Müşteri' ve 'Musteri' farklı tokenler — bu yüzden skor düşüktü. Düzeltme sonrası gerçek artış %18'di. Buradaki ders: 'Sistem bozuk' demeden önce 'Test bozuk olabilir mi?' sormak."

## Cümle 13 — Neden Bu Teknolojiler? (YENİ)
> "Her teknoloji kararının somut bir gerekçesi var. Lokal embedding seçtim çünkü bankada veri dışarı çıkmamalı. BM25 ekledim çünkü OFAC, KKB gibi kısaltmalar semantik modelde kayboluyordu. Cross-encoder ekledim çünkü bi-encoder yanlış pozitif veriyordu. 3 ayrı skor koydum çünkü tek skor her şeyi anlatamıyor — iyi yazılmış ama bulunamayan model ile kötü yazılmış ama bulunan model farklı aksiyon gerektirir. Her seçimin arkasında A/B test ile kanıtlanmış bir veri var."

## Cümle 14 — Gelecek Vizyon (YENİ)
> "Bu prototip v0.2.17'de. Production için PostgreSQL, LDAP, monitoring gerekiyor ama mimari hazır — sadece altyapı swap'ı yeterli. Uzun vadede aktif öğrenme ile sistem kendi eşik değerlerini ayarlayacak, LLM ile 'neden benzer?' sorusuna doğal dilde cevap verecek, ve model yaşam döngüsü yönetimi ile sadece envanter değil tam model governance sağlanacak."

---

# BÖLÜM 3 — Q&A HAZIRLIĞI (12 Soru)

> Mulakatcinin soracagi muhtemel sorular ve cevap iskeletleri.

## Soru 1: "Bu modeller gercek mi, yoksa uydurma mi?"
**Cevap:** Cumle 3 + Cumle 4'u kullan. KAYNAKLAR.md dokumanini goster.
- 80+ tiklanabilir otoriter kaynak (sifir Wikipedia)
- 5-Tier hiyerarsi: Basel, FATF, MASAK, FICO, McKinsey, Nature, IEEE
- Turk bankaciligina ozel kanitlar: Akbank 750 GPU, Yapi Kredi AI Ilkeleri
- "Dokumani acip herhangi bir modelin kaynagini tiklayabilirsiniz."

## Soru 2: "Production'a almak icin ne yapman gerekir?"
**Cevap:** Slayt 17'deki yol haritasini anlat. Ozellikle:
- PostgreSQL + audit log (CSV'den goc)
- FAISS/Qdrant vector DB (10K+ model icin in-memory yetmez)
- LDAP/SSO (localStorage session yerine)
- Prometheus + Grafana monitoring + drift detection
- BPM is akisi entegrasyonu (talep onay/red sureci)
- "Mimari degisikligi minimal -- sadece storage ve auth katmanini swap etmek yeterli."

## Soru 3: "Neden lokal embedding, OpenAI/Azure degil?"
**Cevap:** Cumle 2'yi kullan. Veri lokalizasyonu yasal zorunluluk (KVKK, BDDK). Maliyet kontrolu, latency garantisi (lokal ms vs API saniye), offline capability. "120 MB lokal model -- OpenAI API'ye veri gondermek compliance ile uyumsuz."

## Soru 4: "Cross-encoder neden mmarco modeli?"
**Cevap:** mMARCO = multilingual MS-MARCO (Turkce + Ingilizce). Apache 2.0, ~250MB, CPU'da calisir. "Iki dilli envanterde precision boost icin multilingual cross-encoder zorunluydu."

## Soru 5: "BM25 ne ise yariyor, sadece embedding yetmedi mi?"
**Cevap:** Embedding semantic ama abstract -- "OFAC", "KKB" gibi kisaltmalarda zayif. BM25 exact keyword match -- jargon icin kritik. Test ile kanitlandi: jargon +%60-73 artis. "'OFAC' bi-encoder 0.40 --> BM25 ile 0.638."

## Soru 6: "3-skor sistemi nedir, neden 3 ayri skor?"
**Cevap:** Cumle 6'yi kullan. Ek olarak:
- Aciklama Kalitesi: model aciklamasi ne kadar iyi yazilmis? (8 kriter)
- Bulunabilirlik: model semantik aramada ne kadar kolay bulunuyor? (AI-based)
- Zenginlestirme: keyword, kaynak, standart ne kadar kapsamli?
- "Her biri farkli bir boyutu olcer. Aciklama iyi ama isim uyumsuzsa bulunabilirlik duser. Aciklama iyi ama keyword yoksa zenginlestirme duser. 3 boyut birlikte envanter sagliginin tam resmini verir."

## Soru 7: "Bulunabilirlik nasil hesaplaniyor?"
**Cevap:** AI-based, 3 kriter: isim-aciklama uyumu (cosine), ayirt edicilik (en yakin modele mesafe), TR-EN tutarlilik. "Adi 'Fraud Detection' ama aciklamasi likidite tahmininden bahsediyorsa uyum duser, bulunabilirlik cok dusuk cikar."

## Soru 8: "Login sistemi production'da nasil calisacak?"
**Cevap:** Su an demo amacli localStorage session. Production'da LDAP/AD/SSO ile entegre. Departman + e-posta otomatik LDAP'tan cekilir. "Mimari hazir -- sadece auth provider'i swap etmek yeterli."

## Soru 9: "Talep gecmisi neden localStorage?"
**Cevap:** 2 gunluk case study -- prototipleme hizi onceliklendi. Max 100 kayit limiti var. "Prototype'da localStorage, production'da PostgreSQL. Veri modeli ayni, sadece persistence katmani degisiyor."

## Soru 10: "Esik degerleri (0.55, 0.75) nasil belirledin?"
**Cevap:** 30 modellik manuel kalibrasyon. 0.75 = duplicate, 0.55 = similar. "A/B testlerinden gelen gercek skorlara bakarak kalibre ettim. 'OFAC' 0.638 = similar. 'Musteri risk skoru' 0.894 = duplicate. Production'da aktif ogrenme ile auto-tune edilir."

## Soru 11: "10.000 modele nasil olceklenir?"
**Cevap:** Su an in-memory NumPy (30 model, sub-ms). 10K+: FAISS/Qdrant vector DB. Cross-encoder sadece TOP-10'a uygulanir (N'den bagimsiz). "Bottleneck yok. FAISS milyonlarca vektorde sub-saniye arama yapar."

## Soru 12: "Vibe Coding ne demek senin icin?"
**Cevap:** AI ile insan isbirligi -- AI implements, human decides. "2 gunde 25 versiyon cikarabildim cunku AI implementasyonu hizlandirdi, ben mimari kararlari, domain bilgisini ve kalite kontrolunu sagladim."

---

# BOLUM 4 -- DEMO PROTOKOLU (8 Adim)

> Canli demo sirasinda izlenecek siralama.

## Hazirlik (Sunum oncesi)
- [ ] Backend `localhost:8000` calisiyor (`curl localhost:8000/api/health`)
- [ ] Frontend `localhost:3000` calisiyor
- [ ] Tarayici tab'lari hazir
- [ ] KAYNAKLAR.md ve SUNUM_ICERIK.md hazir
- [ ] Demo sifre: 123456

## Adim 1 (1 dk) -- Login
- Login ekranina gel
- Kuveyt Turk logosunu goster
- E-posta gir (ornek: demo@kuveytturk.com.tr)
- Sifre gir (123456)
- Giris yap --> header'da kullanici profili gorunur
- "Production'da LDAP ile entegre edilir."

## Adim 2 (1 dk) -- Envanter Sekmesi
- "Model Envanteri" sekmesine gec
- "30 model, hepsi gercek bankacilik modeli -- KAYNAKLAR.md'de 80+ kaynak ile dogrulanmis."
- Bir satira tikla, anahtar kavramlar + standartlar + kaynak linklerini goster
- "Her modelin keyword, standart ve referans kaynagi var."

## Adim 3 (2 dk) -- Turkce Mukerrer Tespit
- "Yeni Model Talebi" sekmesine gec
- Departman sec: "Yapay Zeka Laboratuvari"
- Oncelik: "Yuksek"
- Model Adi: `Musteri risk skoru`
- Modelin Hedefi: `Bireysel musteri kredi basvurusu risk degerlendirmesi`
- Buton tikla --> 0.894 HIGH RISK kirmizi uyari
- Skor breakdown'i goster --> semantic + BM25 + rerank ayri bar'lar
- "Eslesen Modelin Gereklilikleri" bolumunu goster (keywords + standards + sources)
- "3 farkli NLP teknigi skorun uretimine katki sagliyor. Ek olarak eslesen modelin gereksinimlerini de gorebiliyoruz."

## Adim 4 (1.5 dk) -- Cross-Lingual
- Ayni talebi Ingilizce yaz: `Predict customers leaving the bank`
- --> Musteri Kaybi Tahmin Modeli 0.90 HIGH RISK
- "Ingilizce sorgu Turkce envantere uydu -- multilingual sayesinde."

## Adim 5 (1.5 dk) -- Jargon Demosu (En Etkileyici!)
- Model Adi: `OFAC`
- Modelin Hedefi: (bos)
- --> Yaptirim Listesi Tarama Modeli 0.638
- "Tek kelime jargon. BM25 keyword match olmadan bu eslestirme imkansizdi."

## Adim 6 (2 dk) -- Talep Gecmisi
- "Talep Gecmisi" sekmesine gec
- Tab badge'da sayi gorunur
- Onceki talepleri goster
- Bir satiri genislet --> eslestirme tablosu
- Yeni modelde duzenleme yap, "Kontrol Et" tikla, skor karsilastirmayi goster
- "Mukerrer salt okunur, yeni ve benzer modeller duzenlenebilir."

## Adim 7 (1.5 dk) -- Envanter Sagligi
- "Envanter Sagligi" sekmesine gec
- 3 skor kartini goster: Aciklama (62), Bulunabilirlik (84), Zenginlestirme (63)
- Tabloda siralama yap (bulunabilirliga gore)
- Dusuk puanli modeli genislet, sorunlari goster
- "3 farkli boyutta denetim: aciklama kalitesi, AI-based bulunabilirlik, ve zenginlestirme."

## Adim 8 (30 sn) -- Cikis
- Header'dan cikis butonuna tikla
- Login ekranina don
- "Oturum guvenle kapatildi."

## Toplam Demo Suresi: ~11 dakika

---

# BOLUM 5 -- TEKNIK EK (Q&A icin Hazir)

## Embedding Model Detaylari
- **Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Boyut:** 384-dimensional vector
- **Diller:** 50+ (Turkce + Ingilizce dahil)
- **Lisans:** Apache 2.0 (ticari kullanim uygun)
- **Disk:** ~120 MB lokal
- **Kullanim:** Multi-view encoding (short/normal/enriched x TR/EN = 6 vektor per model)

## Cross-Encoder Detaylari
- **Model:** `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`
- **Tipi:** Multilingual reranker (mMARCO datasetinde fine-tuned)
- **Disk:** ~250 MB lokal
- **Lisans:** Apache 2.0
- **Kullanim:** TOP-10 adayi yeniden siralama (Stage 3)

## BM25 Detaylari
- **Kutuphane:** `rank-bm25` (Python)
- **Algoritma:** Okapi BM25 (klasik olcek)
- **Tokenization:** Unicode-aware regex `\w+`
- **Per-language:** TR ve EN ayri index
- **Kullanim:** Bankacilik jargonu (KKB, OFAC, PCI-DSS) icin keyword match

## Performans Metrikleri
- Cold-start: ~65 saniye (ilk model yuklemesi, bi-encoder + cross-encoder)
- Warm query: ~300-800 ms (cross-encoder dahil)
- Memory: ~500 MB RAM (tum modeller + 30 model embeddings)
- CPU: GPU gerektirmez (CPU-only inference)

## 3-Skor Formulleri

### Aciklama Kalitesi (0-100)
```
aciklama_skoru = uzunluk(13) + aksiyon_fiili(13) + veri_kaynagi(13) + sonuc(13)
              + algoritma(12) + regulasyon(12) + is_degeri(12) + hedef_kullanici(12)

final = round((TR_skor + EN_skor) / 2)
```

### Bulunabilirlik (0-100)
```
isim_amac_uyumu = cosine(encode(isim), encode(amac))  --> 0-40 pt
ayirt_edicilik = 1 - max_similarity_to_other_models   --> 0-35 pt
tr_en_tutarlilik = cosine(TR_normal_vec, EN_normal_vec) --> 0-25 pt

bulunabilirlik = isim_amac_uyumu + ayirt_edicilik + tr_en_tutarlilik
```

### Zenginlestirme (0-100)
```
keyword_zenginligi = f(keyword_count)    --> 0-40 pt  (>=40 = max)
kaynak_referans = f(source_count)        --> 0-35 pt  (>=5 = max)
standart_referans = f(standard_count)    --> 0-25 pt  (>=5 = max)

zenginlestirme = keyword_zenginligi + kaynak_referans + standart_referans
final = round((TR_skor + EN_skor) / 2)
```

## RAG Pipeline Skor Formulu
```
hybrid_score = 0.65 x semantic_score + 0.35 x bm25_score
final_score  = 0.70 x hybrid_score   + 0.30 x rerank_score

rerank_score = sigmoid(cross_encoder_logit)
```

## Skor Esik Degerleri
- `>= 0.75` --> **Yuksek benzerlik** (Mukerrer riski) --> `duplicate`
- `0.55 - 0.75` --> **Orta benzerlik** (Inceleme onerilir) --> `similar`
- `< 0.55` --> **Dusuk benzerlik** (Yeni model) --> `new`

## API Endpoints (Guncel -- v0.2.17)

| Endpoint | Method | Aciklama |
|---|---|---|
| `/api/health` | GET | Servis durumu kontrolu (`status`, `model_loaded`) |
| `/api/departments` | GET | 18 Kuveyt Turk birimi listesi (A-Z + "Diger") |
| `/api/inventory` | GET | 30 modelin tamami (keywords, standards, sources dahil) |
| `/api/check-similarity` | POST | Yeni talep kontrolu (name, purpose, department, priority, email) |
| `/api/quality-check` | GET | 3-skorlu envanter sagligi raporu (description + findability + enrichment) |
| `/docs` | GET | Otomatik uretilen Swagger UI dokumantasyonu |

Detayli request/response ornekleri icin: `localhost:8000/docs` (Swagger UI)

---

# BOLUM 6 -- KONTROL LISTESI (Sunum Oncesi)

## Teknik Hazirlik
- [ ] Backend ayakta (`curl localhost:8000/api/health` --> `{"status":"ok","model_loaded":true}`)
- [ ] Frontend ayakta (`http://localhost:3000` --> Login ekrani)
- [ ] Tarayici tab'lari hazir (localhost:3000 + localhost:8000/docs)
- [ ] Internet baglantisi (yedek -- sistem lokal calisir)
- [ ] Demo sifre hatirla: 123456

## Dokuman Hazirlik
- [ ] SUNUM_ICERIK.md (bu dokuman -- v3.0)
- [ ] KAYNAKLAR.md (referans olarak -- 80+ kaynak)
- [ ] CHANGELOG.md (versiyon gecmisi -- v0.1.0 --> v0.2.17)
- [ ] README.md (mimari genel bakis)
- [ ] Kaynak kodlar zip'li (yedek)

## Demo Hazirlik
- [ ] Login akisi test edildi
- [ ] Turkce mukerrer tespit calisiyor (0.894)
- [ ] Cross-lingual calisiyor (EN sorgu --> TR sonuc)
- [ ] Jargon demosu calisiyor (OFAC --> 0.638)
- [ ] Talep gecmisi calisiyor (genisletme, duzenleme, silme)
- [ ] Envanter Sagligi calisiyor (3 skor karti)
- [ ] Cikis calisiyor (login ekranina donuyor)

## Mental Hazirlik
- [ ] Cumle 1-12 ezberlendi (ozellikle 1, 2, 3, 6)
- [ ] Demo akisi denendi (5+ kez, 8 adim)
- [ ] Q&A 1-12 cevaplari hazir
- [ ] Kaynak gosterme refleksi (KAYNAKLAR.md tiklama)
- [ ] Bug hikayesi akici anlatilabiliyor (Slayt 15)
- [ ] 3-skor sistemi aciklamasi akici (Slayt 7)

## Zamanlama
- [ ] Sunum: ~25 dakika (18 slayt)
- [ ] Demo: ~11 dakika (8 adim)
- [ ] Q&A: ~10 dakika (12 soru hazir)
- [ ] Toplam: ~45-50 dakika

---

> **Hazirlayan:** Mahmut Zahid Malkoc
> **Tarih:** 17 Nisan 2026
> **Dokuman versiyonu:** 3.0 (3-Asamali RAG + 3-Skorlu Kalite + Kurumsal Is Akisi + Talep Gecmisi)
> **Sistem versiyonu:** v0.2.17 (25 versiyon, v0.1.0 --> v0.2.17)
