"""Loads the model inventory CSV and produces multi-view multilingual embeddings.

Stage-1 (bi-encoder + multi-view), stage-2 (BM25 lexical) and stage-3
(cross-encoder reranker) artifacts are all initialised here as module-level
singletons so the heavy models are only loaded once per process.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
# Multilingual cross-encoder re-ranker (works for both TR and EN).
CROSS_ENCODER_MODEL = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"

# Resolve the CSV path relative to the project root (../data/model_inventory.csv).
_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
DEFAULT_CSV_PATH = _PROJECT_ROOT / "data" / "model_inventory.csv"
DEFAULT_SOURCES_PATH = _PROJECT_ROOT / "data" / "model_sources.json"


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------


@dataclass
class InventoryItem:
    """Plain Python record for one row of the model inventory CSV."""

    no: int
    name_tr: str
    name_en: str
    category: str
    purpose_tr: str
    purpose_en: str
    keywords_tr: str
    keywords_en: str
    standards: str
    sources: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "no": self.no,
            "name_tr": self.name_tr,
            "name_en": self.name_en,
            "category": self.category,
            "purpose_tr": self.purpose_tr,
            "purpose_en": self.purpose_en,
            "keywords_tr": self.keywords_tr,
            "keywords_en": self.keywords_en,
            "standards": self.standards,
            "sources": self.sources,
        }


@dataclass
class InventoryEmbeddings:
    """Precomputed encoder + inventory artifacts used by the similarity layer."""

    items: list[InventoryItem]
    # Per-language, per-view bi-encoder embeddings (each shape (N, D)).
    tr_short: np.ndarray
    tr_normal: np.ndarray
    tr_enriched: np.ndarray
    en_short: np.ndarray
    en_normal: np.ndarray
    en_enriched: np.ndarray
    encoder: SentenceTransformer
    # Stage-2: BM25 lexical indices over the enriched corpora.
    bm25_tr: BM25Okapi
    bm25_en: BM25Okapi
    # Stage-3: cross-encoder reranker shared across both languages.
    cross_encoder: CrossEncoder


# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------

_state: Optional[InventoryEmbeddings] = None


def _safe_str(value: object) -> str:
    """Defensively coerce a CSV cell to a stripped string (NaN -> '')."""

    if value is None:
        return ""
    if isinstance(value, float) and np.isnan(value):
        return ""
    text = str(value).strip()
    if text.lower() == "nan":
        return ""
    return text


def _load_sources(sources_path: Path) -> dict[int, list[dict]]:
    """Load per-model reference sources from JSON."""

    if not sources_path.exists():
        return {}
    with open(sources_path, encoding="utf-8") as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}


def _load_inventory(csv_path: Path, sources_path: Path = DEFAULT_SOURCES_PATH) -> list[InventoryItem]:
    df = pd.read_csv(csv_path)
    required_cols = {
        "No",
        "Model Adı (TR)",
        "Model Name (EN)",
        "Kategori",
        "Amacı (TR)",
        "Purpose (EN)",
    }
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing required columns: {missing}")

    # Optional new-schema columns. Default to empty string when absent so the
    # loader still works against an older CSV revision.
    optional_cols = ("Anahtar Kavramlar (TR)", "Keywords (EN)", "Standartlar")
    for col in optional_cols:
        if col not in df.columns:
            df[col] = ""

    sources_map = _load_sources(sources_path)

    items: list[InventoryItem] = []
    for _, row in df.iterrows():
        model_no = int(row["No"])
        items.append(
            InventoryItem(
                no=model_no,
                name_tr=_safe_str(row["Model Adı (TR)"]),
                name_en=_safe_str(row["Model Name (EN)"]),
                category=_safe_str(row["Kategori"]),
                purpose_tr=_safe_str(row["Amacı (TR)"]),
                purpose_en=_safe_str(row["Purpose (EN)"]),
                keywords_tr=_safe_str(row["Anahtar Kavramlar (TR)"]),
                keywords_en=_safe_str(row["Keywords (EN)"]),
                standards=_safe_str(row["Standartlar"]),
                sources=sources_map.get(model_no, []),
            )
        )
    return items


# ---------------------------------------------------------------------------
# View text builders
# ---------------------------------------------------------------------------


def _build_short(name: str) -> str:
    """Short view: model name only."""

    return (name or "").strip()


def _build_normal(name: str, purpose: str) -> str:
    """Normal view: name + purpose (matches the legacy behaviour)."""

    name = (name or "").strip()
    purpose = (purpose or "").strip()
    if name and purpose:
        return f"{name}. {purpose}"
    return name or purpose


def _build_enriched(name: str, purpose: str, keywords: str, standards: str) -> str:
    """Enriched view: name + purpose + keywords + standards."""

    parts: list[str] = []
    name = (name or "").strip()
    purpose = (purpose or "").strip()
    if name:
        parts.append(name)
    if purpose:
        parts.append(purpose)
    if keywords:
        parts.append(f"Anahtar kavramlar: {keywords.strip()}")
    if standards:
        parts.append(f"Standartlar: {standards.strip()}")
    return ". ".join(parts)


# Back-compat alias (used by other modules / tests of the older API).
def _build_text(name: str, purpose: str) -> str:
    return _build_normal(name, purpose)


# ---------------------------------------------------------------------------
# BM25 tokenisation
# ---------------------------------------------------------------------------


_TOKEN_RE = re.compile(r"\w+", flags=re.UNICODE)


def tokenize(text: str) -> list[str]:
    """Lowercase + Unicode-aware alphanumeric tokeniser used for BM25."""

    if not text:
        return []
    return _TOKEN_RE.findall(text.lower())


# ---------------------------------------------------------------------------
# Encoding helpers
# ---------------------------------------------------------------------------


def _encode_texts(encoder: SentenceTransformer, texts: list[str]) -> np.ndarray:
    return encoder.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )


def initialize(csv_path: Path | str = DEFAULT_CSV_PATH) -> InventoryEmbeddings:
    """Load encoders + inventory + multi-view embeddings + BM25. Idempotent."""

    global _state
    if _state is not None:
        return _state

    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Model inventory CSV not found at {csv_path}")

    encoder = SentenceTransformer(MODEL_NAME)
    cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)
    items = _load_inventory(csv_path)

    # ----- Build the three text views per language -----
    tr_short_texts = [_build_short(it.name_tr) for it in items]
    tr_normal_texts = [_build_normal(it.name_tr, it.purpose_tr) for it in items]
    tr_enriched_texts = [
        _build_enriched(it.name_tr, it.purpose_tr, it.keywords_tr, it.standards)
        for it in items
    ]
    en_short_texts = [_build_short(it.name_en) for it in items]
    en_normal_texts = [_build_normal(it.name_en, it.purpose_en) for it in items]
    en_enriched_texts = [
        _build_enriched(it.name_en, it.purpose_en, it.keywords_en, it.standards)
        for it in items
    ]

    # ----- Bi-encoder embeddings per view per language -----
    tr_short = _encode_texts(encoder, tr_short_texts)
    tr_normal = _encode_texts(encoder, tr_normal_texts)
    tr_enriched = _encode_texts(encoder, tr_enriched_texts)
    en_short = _encode_texts(encoder, en_short_texts)
    en_normal = _encode_texts(encoder, en_normal_texts)
    en_enriched = _encode_texts(encoder, en_enriched_texts)

    # ----- BM25 lexical indices (built on enriched corpora) -----
    tr_corpus = [tokenize(t) for t in tr_enriched_texts]
    en_corpus = [tokenize(t) for t in en_enriched_texts]
    bm25_tr = BM25Okapi(tr_corpus)
    bm25_en = BM25Okapi(en_corpus)

    _state = InventoryEmbeddings(
        items=items,
        tr_short=tr_short,
        tr_normal=tr_normal,
        tr_enriched=tr_enriched,
        en_short=en_short,
        en_normal=en_normal,
        en_enriched=en_enriched,
        encoder=encoder,
        bm25_tr=bm25_tr,
        bm25_en=bm25_en,
        cross_encoder=cross_encoder,
    )
    return _state


def get_state() -> InventoryEmbeddings:
    """Return the lazily-initialized embeddings state."""

    if _state is None:
        return initialize()
    return _state


def is_loaded() -> bool:
    return _state is not None


def encode_query(name: str, purpose: str) -> np.ndarray:
    """Encode a user query into a normalized embedding vector."""

    state = get_state()
    text = _build_normal(name, purpose)
    vec = _encode_texts(state.encoder, [text])
    return vec[0]


# Re-exported helpers for other modules (similarity).
def build_enriched(name: str, purpose: str, keywords: str, standards: str) -> str:
    return _build_enriched(name, purpose, keywords, standards)


def build_normal(name: str, purpose: str) -> str:
    return _build_normal(name, purpose)


def build_short(name: str) -> str:
    return _build_short(name)


# ---------------------------------------------------------------------------
# Lightweight language detection
# ---------------------------------------------------------------------------

_TURKISH_CHARS = set("çğıöşüÇĞİÖŞÜ")
_TURKISH_HINT_WORDS = {
    "ve",
    "ile",
    "için",
    "bir",
    "bu",
    "müşteri",
    "kredi",
    "risk",
    "skoru",
    "model",
    "modeli",
    "tahmin",
    "tespit",
    "analiz",
    "değerlendirme",
    "başvuru",
    "işlem",
    "veri",
    "hesap",
    "para",
    "bireysel",
    "kurumsal",
    "şube",
    "ödeme",
}
_ENGLISH_HINT_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "model",
    "customer",
    "credit",
    "risk",
    "score",
    "scoring",
    "fraud",
    "detection",
    "prediction",
    "analysis",
    "transaction",
    "data",
    "account",
    "payment",
    "individual",
    "corporate",
    "branch",
}


def detect_language(text: str) -> str:
    """Heuristic Turkish-vs-English detector. Returns 'tr' or 'en'."""

    if not text:
        return "en"

    if any(ch in _TURKISH_CHARS for ch in text):
        return "tr"

    tokens = [t.strip(".,;:!?\"'()[]{}").lower() for t in text.split()]
    tr_hits = sum(1 for t in tokens if t in _TURKISH_HINT_WORDS)
    en_hits = sum(1 for t in tokens if t in _ENGLISH_HINT_WORDS)

    if tr_hits > en_hits:
        return "tr"
    return "en"
