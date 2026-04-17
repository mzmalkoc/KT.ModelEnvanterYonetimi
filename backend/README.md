# KT AI - Model Inventory Backend

FastAPI backend for the **Model Inventory Duplicate Detection** case study (Kuveyt Türk AI Lab).

Uses a **3-stage RAG (Retrieval-Augmented Generation) pipeline**:
1. **Multi-View Bi-Encoder** — 3 embedding views per model per language (6 vectors per model)
2. **BM25 Lexical Search** — keyword matching for banking jargon (KKB, OFAC, PCI-DSS)
3. **Cross-Encoder Reranking** — multilingual precision booster

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| Python | 3.13 | Runtime |
| FastAPI | 0.115 | REST framework + auto Swagger |
| Uvicorn | 0.34 | ASGI server |
| sentence-transformers | 3.3 | Bi-encoder + Cross-encoder |
| rank-bm25 | 0.2.2 | BM25 Okapi lexical search |
| scikit-learn | 1.6 | Matrix operations |
| pandas | 2.2 | CSV ingestion |
| pydantic | 2.10 | Type-safe schemas |

### AI Models (auto-downloaded on first run)

| Model | Purpose | Size |
|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` | Bi-encoder (50+ languages, 384-d vectors) | ~120 MB |
| `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | Multilingual reranker (mMARCO) | ~250 MB |

## Prerequisites

- Python 3.11+ (3.13 tested)
- The CSV at `../data/model_inventory.csv` (9 columns: No, names, category, purposes, keywords, standards)
- Internet access on first run (~370 MB model download)
- ~1 GB RAM after models are loaded

## Install

```bash
cd backend

# 1. Create + activate venv
python -m venv venv
venv\Scripts\activate          # Windows CMD/PowerShell
# source venv/bin/activate     # Mac/Linux/WSL

# 2. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --port 8000
```

**First-run cold-start:** ~65 seconds (model download + embedding computation).
**Warm restart (cached models):** ~30-60 seconds.

Open the interactive API docs at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

CORS is preconfigured for `http://localhost:3000` (Next.js dev server).

## 3-Stage Pipeline Details

### Stage 1: Multi-View Bi-Encoder

Each inventory model gets **3 embedding views** per language (**6 total**):

| View | Content | Best For |
|---|---|---|
| **short** | Model name only | Single-word queries (`"fraud"`, `"churn"`) |
| **normal** | Name + purpose | Natural language queries |
| **enriched** | Name + purpose + keywords + standards | Jargon queries (`"OFAC"`, `"PCI-DSS"`) |

Query is compared against all 6 views per model; **MAX score** is selected.

### Stage 2: BM25 Lexical Search

Okapi BM25 over enriched corpus (TR + EN separate indices). Catches exact keyword matches that semantic embedding may miss (banking abbreviations, regulation codes).

**Hybrid score:** `0.65 × semantic_max + 0.35 × bm25_normalized`

Top-10 candidates selected by hybrid score.

### Stage 3: Cross-Encoder Reranking

Top-10 candidates are re-scored by a **cross-encoder** that evaluates query-document pairs jointly (much more accurate than bi-encoder, but slower).

**Final score:** `0.70 × hybrid + 0.30 × rerank_prob`

### Thresholds

| Score | Risk Level | Recommendation |
|---|---|---|
| ≥ 0.75 | **high** | `duplicate` — strongly consider reusing existing model |
| 0.55 – 0.74 | **medium** | `similar` — review existing model |
| < 0.55 | **low** | `new` — proceed with new model |

## Endpoints

### `GET /api/health`
```json
{ "status": "ok", "model_loaded": true }
```

### `GET /api/inventory`
Returns all 30 models with full details (including `keywords_tr`, `keywords_en`, `standards`).

### `POST /api/check-similarity`

**Request:**
```json
{
  "name": "Müşteri risk skoru",
  "purpose": "Bireysel müşteri kredi başvurusu risk değerlendirmesi",
  "language": "auto"
}
```

`language` accepts `"tr"`, `"en"`, or `"auto"` (default — auto-detected via heuristic).
`purpose` is optional (can be empty for short/jargon queries like `"OFAC"`).

**Response:**
```json
{
  "input": {
    "name": "Müşteri risk skoru",
    "purpose": "Bireysel müşteri kredi başvurusu risk değerlendirmesi",
    "detected_language": "tr"
  },
  "matches": [
    {
      "model": {
        "no": 1,
        "name_tr": "Kredi Skorlama Modeli",
        "name_en": "Credit Scoring Model",
        "category": "Kredi Riski",
        "purpose_tr": "Bireysel müşterilerin kredi başvurularında...",
        "purpose_en": "Analyzes individual customer credit...",
        "keywords_tr": "kredi skoru; kredi notu; FICO benzeri skor...",
        "keywords_en": "credit score; credit rating; FICO model...",
        "standards": "Basel III IRB; FICO Score; VantageScore; KKB; BDDK"
      },
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
  "explanation": "Bu talep 'Kredi Skorlama Modeli' modeline %89 oranında benzemektedir..."
}
```

**Score breakdown:**
- `semantic_score` — Multi-view bi-encoder max (which view matched is in `matched_view`)
- `bm25_score` — Normalized BM25 keyword score (0-1)
- `rerank_score` — Cross-encoder sigmoid probability (0-1)
- `similarity_score` — Final blended score (used for thresholding)

### `GET /api/quality-check`

3-Skorlu kalite sistemi. Her model 3 ayrı metrikle değerlendirilir:

**Skor 1 — Açıklama Kalitesi (8 kriter, toplam 100pt):**
- Uzunluk (13pt), Aksiyon fiili (13pt), Veri kaynağı (13pt), Sonuç/karar (13pt)
- Algoritma/teknik (12pt), Düzenleyici referans (12pt), İş değeri (12pt), Hedef kullanıcı (12pt)

**Skor 2 — Bulunabilirlik (AI-based, 3 kriter, toplam 100pt):**
- İsim-açıklama uyumu (40pt), Ayırt edicilik (35pt), TR-EN tutarlılık (25pt)

**Skor 3 — Zenginleştirme (3 kriter, toplam 100pt):**
- Keyword zenginliği (40pt, ≥40 ideal), Kaynak sayısı (35pt, ≥5 ideal), Standart (25pt, ≥5 ideal)

```json
{
  "summary": { "total": 30, "excellent": 0, "good": 25, "needs_improvement": 5, "avg_description": 62, "avg_findability": 84, "average_enrichment": 63 },
  "models": [
    { "no": 1, "name_tr": "...", "name_en": "...", "description_quality": 71, "findability_score": 90, "enrichment_score": 74, "description_issues": [...], "findability_issues": [...], "enrichment_issues": [...] }
  ]
}
```

## Example curl Calls

```bash
# Health
curl http://localhost:8000/api/health

# Inventory (30 models with keywords + standards)
curl http://localhost:8000/api/inventory

# Similarity — Turkish natural language
curl -X POST http://localhost:8000/api/check-similarity \
  -H "Content-Type: application/json" \
  -d '{"name":"Müşteri risk skoru","purpose":"Bireysel müşteri kredi başvurusu risk değerlendirmesi","language":"auto"}'

# Similarity — English cross-lingual
curl -X POST http://localhost:8000/api/check-similarity \
  -H "Content-Type: application/json" \
  -d '{"name":"Customer risk scoring","purpose":"Individual customer loan application risk assessment","language":"auto"}'

# Similarity — Banking jargon (short query, no purpose)
curl -X POST http://localhost:8000/api/check-similarity \
  -H "Content-Type: application/json" \
  -d '{"name":"OFAC","purpose":"","language":"auto"}'

# Quality check
curl http://localhost:8000/api/quality-check
```

## A/B Testing

Run the full comparison test suite:
```bash
./venv/Scripts/python.exe ab_test.py
```

7 tests covering: short queries, jargon, cross-lingual, long natural language, negative control. Reports per-stage score breakdown + comparison with baseline.

## Project Layout

```
backend/
├── main.py              # FastAPI app + lifespan (v2.0.0)
├── embeddings.py        # Multi-view encoder + BM25 + cross-encoder loader
├── similarity.py        # 3-stage pipeline + score blending
├── quality.py           # 3-Skorlu kalite sistemi (8 kriter + AI findability + enrichment)
├── schemas.py           # Pydantic request/response models
├── ab_test.py           # A/B comparison test script
├── requirements.txt
├── README.md            # this file
└── .gitignore
```

## Performance

| Metric | Value |
|---|---|
| Cold-start (first run) | ~65 seconds |
| Warm restart (cached) | ~30-60 seconds |
| Query response time | ~300-800 ms |
| Memory usage | ~1 GB |
| Disk (cached models) | ~370 MB |

## Notes

- All models loaded **once** at startup via FastAPI `lifespan` handler.
- 30 models × 3 views × 2 languages = **180 embeddings** computed once, cached in memory.
- BM25 indices built once per language (TR + EN).
- Cross-encoder evaluates **only TOP-10** candidates per request (not all 30) for speed.
- Language detection is heuristic (Turkish characters + hint-word voting); actual matching is multilingual.
