"""3-stage RAG retrieval pipeline.

Stage 1: Multi-view bi-encoder cosine similarity (per language, per view).
Stage 2: BM25 lexical scoring on the enriched corpora (per language).
Stage 3: Cross-encoder reranking of the top hybrid candidates.

The pipeline returns the top-5 reranked matches plus per-stage scores so the
frontend can show explainability for the final ranking.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

import numpy as np

from embeddings import (
    InventoryEmbeddings,
    InventoryItem,
    build_enriched,
    detect_language,
    encode_query,
    get_state,
    tokenize,
)

# ---------------------------------------------------------------------------
# Thresholds & weights
# ---------------------------------------------------------------------------

DUPLICATE_THRESHOLD = 0.75
SIMILAR_THRESHOLD = 0.55

TOP_K = 5
RERANK_POOL = 10  # number of stage-1+2 candidates fed to the cross-encoder

SEMANTIC_WEIGHT = 0.65
BM25_WEIGHT = 0.35

# Final score = weighted blend of hybrid (semantic+BM25) and cross-encoder rerank.
# Cross-encoder is a precision booster, not an absolute veto.
HYBRID_WEIGHT_IN_FINAL = 0.70
RERANK_WEIGHT_IN_FINAL = 0.30


ViewName = Literal["short", "normal", "enriched"]
LanguageName = Literal["tr", "en"]


# ---------------------------------------------------------------------------
# Result record
# ---------------------------------------------------------------------------


@dataclass
class MatchResult:
    item: InventoryItem
    final_score: float          # cross-encoder rerank score, 0-1
    semantic_score: float       # max of multi-view bi-encoder cosine, 0-1
    bm25_score: float           # normalised BM25 score, 0-1
    rerank_score: float         # raw cross-encoder logit
    matched_view: ViewName
    matched_language: LanguageName

    @property
    def similarity_score(self) -> float:
        """Backward-compat alias (the API used to expose only this score)."""

        return self.final_score

    @property
    def risk_level(self) -> str:
        if self.final_score >= DUPLICATE_THRESHOLD:
            return "high"
        if self.final_score >= SIMILAR_THRESHOLD:
            return "medium"
        return "low"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_language(language: str, query_text: str) -> str:
    """Map the request language option to a concrete 'tr' or 'en'."""

    language = (language or "auto").lower()
    if language in ("tr", "en"):
        return language
    return detect_language(query_text)


def _cosine_to_corpus(query_vec: np.ndarray, corpus: np.ndarray) -> np.ndarray:
    """Cosine similarity between a normalised query vec and a normalised matrix."""

    # Both inputs are L2-normalised at encode time, so cosine == dot product.
    return corpus @ query_vec


def _normalise_bm25(scores: np.ndarray) -> np.ndarray:
    """Scale BM25 scores into [0, 1] by dividing by their max (per language)."""

    if scores.size == 0:
        return scores
    peak = float(scores.max())
    if peak <= 0:
        return np.zeros_like(scores)
    return scores / peak


def _sigmoid(x: float) -> float:
    """Stable sigmoid for cross-encoder logit -> probability conversion."""

    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def compute_matches(
    name: str,
    purpose: str,
    language: str = "auto",
) -> tuple[list[MatchResult], str]:
    """Return the top reranked matches for a user query plus the detected language."""

    state: InventoryEmbeddings = get_state()

    query_text_for_lang = f"{name} {purpose}".strip()
    detected_lang = _resolve_language(language, query_text_for_lang)

    # ---- Stage 1: multi-view bi-encoder ----
    query_vec = encode_query(name, purpose)
    query_text = (f"{name}. {purpose}".strip(". ")) or name or purpose

    tr_short_s = _cosine_to_corpus(query_vec, state.tr_short)
    tr_normal_s = _cosine_to_corpus(query_vec, state.tr_normal)
    tr_enriched_s = _cosine_to_corpus(query_vec, state.tr_enriched)
    en_short_s = _cosine_to_corpus(query_vec, state.en_short)
    en_normal_s = _cosine_to_corpus(query_vec, state.en_normal)
    en_enriched_s = _cosine_to_corpus(query_vec, state.en_enriched)

    n_items = len(state.items)
    semantic_scores = np.zeros(n_items, dtype=np.float64)
    matched_views: list[ViewName] = ["normal"] * n_items
    matched_langs: list[LanguageName] = ["en"] * n_items

    view_names: tuple[ViewName, ViewName, ViewName] = ("short", "normal", "enriched")

    for i in range(n_items):
        tr_view_scores = (float(tr_short_s[i]), float(tr_normal_s[i]), float(tr_enriched_s[i]))
        en_view_scores = (float(en_short_s[i]), float(en_normal_s[i]), float(en_enriched_s[i]))

        tr_best_idx = int(np.argmax(tr_view_scores))
        en_best_idx = int(np.argmax(en_view_scores))
        tr_best = tr_view_scores[tr_best_idx]
        en_best = en_view_scores[en_best_idx]

        if tr_best >= en_best:
            semantic_scores[i] = tr_best
            matched_views[i] = view_names[tr_best_idx]
            matched_langs[i] = "tr"
        else:
            semantic_scores[i] = en_best
            matched_views[i] = view_names[en_best_idx]
            matched_langs[i] = "en"

    # ---- Stage 2: BM25 ----
    query_tokens = tokenize(query_text)
    if query_tokens:
        bm25_tr_raw = np.asarray(state.bm25_tr.get_scores(query_tokens), dtype=np.float64)
        bm25_en_raw = np.asarray(state.bm25_en.get_scores(query_tokens), dtype=np.float64)
    else:
        bm25_tr_raw = np.zeros(n_items, dtype=np.float64)
        bm25_en_raw = np.zeros(n_items, dtype=np.float64)

    bm25_tr_norm = _normalise_bm25(bm25_tr_raw)
    bm25_en_norm = _normalise_bm25(bm25_en_raw)

    # Per-language semantic MAX across the 3 views (short / normal / enriched).
    # This is the key fix: the hybrid stage must use the best-of-views semantic
    # score, not just the enriched view (which dilutes natural-language matches).
    tr_semantic_max = np.maximum.reduce([tr_short_s, tr_normal_s, tr_enriched_s])
    en_semantic_max = np.maximum.reduce([en_short_s, en_normal_s, en_enriched_s])

    # Per-item: pick the BM25 score from whichever language matched semantically
    # (and also remember the per-language max so the hybrid decision can swap
    # languages when BM25 strongly prefers the other side).
    bm25_per_item = np.zeros(n_items, dtype=np.float64)
    hybrid_scores = np.zeros(n_items, dtype=np.float64)

    for i in range(n_items):
        tr_hybrid = SEMANTIC_WEIGHT * float(tr_semantic_max[i]) + BM25_WEIGHT * float(bm25_tr_norm[i])
        en_hybrid = SEMANTIC_WEIGHT * float(en_semantic_max[i]) + BM25_WEIGHT * float(bm25_en_norm[i])

        # Prefer the side that wins the hybrid race — but only override the
        # semantic-matched language when the difference is meaningful.
        if tr_hybrid >= en_hybrid:
            hybrid_scores[i] = tr_hybrid
            if matched_langs[i] != "tr" and (tr_hybrid - en_hybrid) > 0.02:
                matched_langs[i] = "tr"
                # Re-pick the best view within the now-chosen language.
                tr_view_scores = (float(tr_short_s[i]), float(tr_normal_s[i]), float(tr_enriched_s[i]))
                tr_best_idx = int(np.argmax(tr_view_scores))
                matched_views[i] = view_names[tr_best_idx]
                semantic_scores[i] = tr_view_scores[tr_best_idx]
            bm25_per_item[i] = float(bm25_tr_norm[i])
        else:
            hybrid_scores[i] = en_hybrid
            if matched_langs[i] != "en" and (en_hybrid - tr_hybrid) > 0.02:
                matched_langs[i] = "en"
                en_view_scores = (float(en_short_s[i]), float(en_normal_s[i]), float(en_enriched_s[i]))
                en_best_idx = int(np.argmax(en_view_scores))
                matched_views[i] = view_names[en_best_idx]
                semantic_scores[i] = en_view_scores[en_best_idx]
            bm25_per_item[i] = float(bm25_en_norm[i])

    # ---- Pick the top-N candidates by hybrid score for reranking ----
    pool_size = min(RERANK_POOL, n_items)
    top_idx = np.argsort(-hybrid_scores)[:pool_size]

    # ---- Stage 3: Cross-encoder rerank ----
    pairs: list[tuple[str, str]] = []
    for i in top_idx:
        item = state.items[i]
        if matched_langs[i] == "tr":
            doc_text = build_enriched(item.name_tr, item.purpose_tr, item.keywords_tr, item.standards)
        else:
            doc_text = build_enriched(item.name_en, item.purpose_en, item.keywords_en, item.standards)
        pairs.append((query_text, doc_text))

    if pairs:
        raw_rerank = state.cross_encoder.predict(pairs, show_progress_bar=False)
        raw_rerank = np.asarray(raw_rerank, dtype=np.float64).reshape(-1)
    else:
        raw_rerank = np.zeros(0, dtype=np.float64)

    results: list[MatchResult] = []
    for rank_pos, item_idx in enumerate(top_idx):
        item_idx = int(item_idx)
        rerank_logit = float(raw_rerank[rank_pos]) if rank_pos < raw_rerank.size else 0.0
        rerank_prob = _sigmoid(rerank_logit)

        # Final score: weighted blend of hybrid (semantic+BM25) and rerank.
        # Cross-encoder is a precision booster, not a veto — so a strong
        # consensus from semantic + BM25 cannot be wiped out by a weak rerank.
        hybrid_for_item = float(hybrid_scores[item_idx])
        final_score = (
            HYBRID_WEIGHT_IN_FINAL * hybrid_for_item
            + RERANK_WEIGHT_IN_FINAL * rerank_prob
        )

        results.append(
            MatchResult(
                item=state.items[item_idx],
                final_score=final_score,
                semantic_score=float(semantic_scores[item_idx]),
                bm25_score=float(bm25_per_item[item_idx]),
                rerank_score=rerank_prob,
                matched_view=matched_views[item_idx],
                matched_language=matched_langs[item_idx],
            )
        )

    results.sort(key=lambda r: r.final_score, reverse=True)
    return results[:TOP_K], detected_lang


# ---------------------------------------------------------------------------
# Recommendation + explanation
# ---------------------------------------------------------------------------


def recommend(top_score: float) -> str:
    if top_score >= DUPLICATE_THRESHOLD:
        return "duplicate"
    if top_score >= SIMILAR_THRESHOLD:
        return "similar"
    return "new"


_VIEW_LABEL_TR: dict[str, str] = {
    "short": "kısa (yalnızca isim)",
    "normal": "normal (isim + amaç)",
    "enriched": "zenginleştirilmiş (isim + amaç + anahtar kavramlar + standartlar)",
}
_VIEW_LABEL_EN: dict[str, str] = {
    "short": "short (name only)",
    "normal": "normal (name + purpose)",
    "enriched": "enriched (name + purpose + keywords + standards)",
}
_LANG_LABEL_TR: dict[str, str] = {"tr": "Türkçe", "en": "İngilizce"}
_LANG_LABEL_EN: dict[str, str] = {"tr": "Turkish", "en": "English"}


def build_explanation(
    matches: list[MatchResult],
    recommendation: str,
    detected_language: str,
) -> str:
    """Produce a human-readable explanation in the user's language."""

    if not matches:
        if detected_language == "tr":
            return "Envanterde karşılaştırma yapılabilecek model bulunamadı."
        return "No models in the inventory could be compared against this request."

    top = matches[0]
    top_name_tr = top.item.name_tr or top.item.name_en
    top_name_en = top.item.name_en or top.item.name_tr
    final_pct = round(top.final_score * 100)
    sem_pct = round(top.semantic_score * 100)
    bm25_pct = round(top.bm25_score * 100)
    rerank_pct = round(top.final_score * 100)  # rerank shown in normalised %

    if detected_language == "tr":
        view_label = _VIEW_LABEL_TR.get(top.matched_view, top.matched_view)
        lang_label = _LANG_LABEL_TR.get(top.matched_language, top.matched_language)
        head = (
            f"Bu talep '{top_name_tr}' modeline %{final_pct} oranında benzemektedir. "
            f"Eşleşme {view_label} görünümü ve {lang_label} dili üzerinden bulundu. "
            f"(Anlamsal: %{sem_pct}, Anahtar Kelime: %{bm25_pct}, Yeniden Sıralama: %{rerank_pct})"
        )
        if recommendation == "duplicate":
            tail = " Yeni bir model geliştirmeden önce mevcut modelin yeniden kullanılması önerilir."
        elif recommendation == "similar":
            tail = " Mevcut modelin genişletilmesi veya farklılaştırılması gözden geçirilmelidir."
        else:
            tail = " Bu talep yeni bir model olarak değerlendirilebilir."
        return head + tail

    view_label = _VIEW_LABEL_EN.get(top.matched_view, top.matched_view)
    lang_label = _LANG_LABEL_EN.get(top.matched_language, top.matched_language)
    head = (
        f"This request matches the '{top_name_en}' model at {final_pct}%. "
        f"The hit came from the {view_label} view in {lang_label}. "
        f"(Semantic: {sem_pct}%, Keyword: {bm25_pct}%, Rerank: {rerank_pct}%)"
    )
    if recommendation == "duplicate":
        tail = " Reusing the existing model is recommended before building a new one."
    elif recommendation == "similar":
        tail = " Consider extending or differentiating the current model instead."
    else:
        tail = " This request can likely be treated as a new model."
    return head + tail
