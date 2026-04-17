# KT Model Inventory Manager — Frontend

Bilingual (TR/EN) Next.js 14 frontend for the **Model Inventory Duplicate Detection** case study built for the Kuveyt Türk AI Lab.

Displays a **3-stage RAG scoring breakdown** (semantic + BM25 + cross-encoder rerank) with matched view indicators and knowledge-enriched model details.

## Tech Stack

- **Next.js 14.2** (App Router)
- **TypeScript** (strict mode, zero `any`)
- **Tailwind CSS** + **shadcn/ui** primitives
- **lucide-react** icons
- Native `fetch` for API calls

## Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- npm 9+
- Backend running at `http://localhost:8000` (configurable via env)

## Setup

```bash
cd frontend
npm install
```

> shadcn/ui components are pre-vendored under `components/ui/`. No need to run `npx shadcn add`.

(Optional) Configure backend URL:
```bash
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_BASE_URL if backend runs elsewhere
```

## Run (Development)

```bash
npm run dev
```
Open http://localhost:3000

## Build (Production)

```bash
npm run build
npm start
```

## Features

### Tab 1: Yeni Model Talebi / New Model Request (Default)

**Left:** Form with:
- Language toggle (TR/EN) — switches all UI text dynamically
- Model name input
- Model purpose textarea
- Language detection mode selector (Auto / TR / EN)
- Submit button with loading spinner

**Right:** Results panel with:
- **Top alert** based on recommendation:
  - `duplicate` → red alert (HIGH RISK)
  - `similar` → yellow alert
  - `new` → green alert
- **Explanation text** (from backend, bilingual)
- **Top-5 match cards** each showing:
  - Model name (TR + EN) + category badge
  - **Matched View badge** (new):
    - ✨ `enriched` → green "Zenginleştirilmiş" badge with Sparkles icon
    - 📄 `normal` → slate "Normal Görünüm" badge with FileText icon
    - 🔤 `short` → blue "Kısa Görünüm" badge with Type icon
  - Similarity score as color-coded Progress bar
  - Risk level badge + matched language indicator
  - **Score Breakdown** (new, collapsible):
    - Anlamsal Eşleşme (semantic_score) — blue bar
    - Anahtar Kelime BM25 (bm25_score) — blue bar
    - Yeniden Sıralama (rerank_score) — blue bar
    - ━━━━━━━━━━━━━━━━
    - Final Skor (similarity_score) — primary color bar
  - Expandable full bilingual description

### Tab 2: Model Envanteri / Model Inventory

- Search input (filters by name or purpose)
- Category dropdown filter
- Language toggle (TR/EN) — switches table columns
- Sortable table: No | Model Adı | Kategori | Amacı
- **Click row to expand** (enhanced):
  - Full bilingual description (TR + EN)
  - **Anahtar Kavramlar** (new) — displayed as badges, split from semicolons
  - **İlgili Standartlar** (new) — displayed as outline badges
  - Locale-aware: keywords switch with table language

### Tab 3: Envanter Sağlığı / Inventory Health (Self-Validation)

- 4 summary cards: Total | Excellent | Good | Needs Improvement
- Average score progress bar
- Per-model table with TR + EN quality scores (sortable)
- Color coding: green ≥90, yellow 70-89, red <70
- Click row → detected issues for that model

## Backend API Contract

The frontend connects to a backend at `http://localhost:8000` (default) with 4 endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service health check |
| GET | `/api/inventory` | Returns 30 models with keywords + standards |
| POST | `/api/check-similarity` | 3-stage similarity check (returns score breakdown) |
| GET | `/api/quality-check` | Description quality scores |

### Key Response Types

```typescript
// Model record (includes enrichment data)
interface InventoryModel {
  no: number;
  name_tr: string;
  name_en: string;
  category: string;
  purpose_tr: string;
  purpose_en: string;
  keywords_tr?: string;   // semicolon-separated
  keywords_en?: string;
  standards?: string;
}

// Similarity match (includes score breakdown)
interface SimilarityMatch {
  model: InventoryModel;
  similarity_score: number;     // final blended score
  risk_level: 'high' | 'medium' | 'low';
  matched_language: 'tr' | 'en';
  semantic_score?: number;      // multi-view bi-encoder max
  bm25_score?: number;          // normalized BM25
  rerank_score?: number;        // cross-encoder probability
  matched_view?: 'short' | 'normal' | 'enriched';
}
```

Full type definitions: [`types/index.ts`](./types/index.ts)

## Defensive Design

- **Backend down:** All tabs render; API errors show red Alert with connection hint + Retry button
- **Legacy backend (pre-upgrade):** Score breakdown gracefully hidden if new fields are absent (optional types with fallbacks)
- **Empty states:** Helpful placeholder messages on all tabs

## i18n

Simple object lookup in [`lib/i18n.ts`](./lib/i18n.ts). Includes strings for:
- All UI elements (form, results, tabs, headers)
- Score breakdown labels (Anlamsal Eşleşme, Anahtar Kelime, Yeniden Sıralama, Final Skor)
- Matched view labels (Kısa Görünüm, Normal Görünüm, Zenginleştirilmiş)
- Keywords and standards section headers

Language is managed via `useState` at page level, propagated via props.

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout, Inter font, metadata
│   ├── page.tsx                # Main page with 3 tabs
│   └── globals.css             # Tailwind + shadcn CSS variables
├── components/
│   ├── ui/                     # 12 shadcn primitives (button, input, table, ...)
│   ├── header.tsx              # App title + language toggle
│   ├── footer.tsx              # "Kuveyt Türk AI Lab" + version
│   ├── language-toggle.tsx     # TR/EN pill toggle
│   ├── similarity-form.tsx     # Model request form
│   ├── results-panel.tsx       # Match cards + score breakdown + matched view badges
│   ├── inventory-table.tsx     # Searchable table + keywords/standards expansion
│   └── quality-dashboard.tsx   # Summary cards + quality score table
├── lib/
│   ├── api.ts                  # Typed fetch wrappers (ApiClientError)
│   ├── i18n.ts                 # TR + EN string table
│   └── utils.ts                # cn() shadcn utility
├── types/
│   └── index.ts                # Full backend API type definitions
├── components.json             # shadcn/ui config
├── tailwind.config.ts
├── tsconfig.json               # strict: true
├── next.config.mjs
├── postcss.config.mjs
├── .env.local.example
└── package.json
```

## Accessibility

- `aria-expanded` on all collapsible sections
- `aria-label` on icon-only buttons
- `htmlFor`/`id` pairs on form fields
- Keyboard navigation: Tab through all interactive elements
- Screen reader compatible badges and alerts

## Responsive Design

| Breakpoint | Behavior |
|---|---|
| < 640px (mobile) | Single column, cards stack, compact layout |
| 640-768px (sm) | Two-column where space allows |
| 768px+ (md) | Full layout, all columns visible |
| 1024px+ (lg) | Optimal — form + results side by side |
