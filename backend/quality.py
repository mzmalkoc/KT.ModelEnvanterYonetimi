"""Self-validation: scores each model description for documentation quality.

Each description is scored on 8 axes (total 100):
1. Length (13 pts, target 50-80 words)
2. Action verb present (13 pts)
3. Data source mentioned (13 pts)
4. Outcome / decision mentioned (13 pts)
5. Algorithm / technique mentioned (12 pts)
6. Regulatory reference (12 pts)
7. Business value (12 pts)
8. Target user (12 pts)

The vocabulary lists below intentionally cover both Turkish and English
because the same scorer is reused for `purpose_tr` and `purpose_en`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from embeddings import InventoryEmbeddings

# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

ACTION_VERBS = {
    # Turkish stems / forms
    "tahmin",
    "hesapla",
    "tespit",
    "sınıflandır",
    "analiz",
    "öner",
    "değerlendir",
    "skorla",
    "modelle",
    "optimize",
    "tanı",
    "izle",
    "doğrula",
    "yönlendir",
    "üret",
    "ölç",
    "karşılaştır",
    "kümele",
    # English stems
    "predict",
    "calculate",
    "detect",
    "classify",
    "analyze",
    "analyse",
    "recommend",
    "evaluate",
    "score",
    "model",
    "optimize",
    "identify",
    "monitor",
    "validate",
    "route",
    "generate",
    "estimate",
    "measure",
    "compare",
    "cluster",
    "forecast",
}

DATA_SOURCES = {
    # Turkish
    "müşteri",
    "işlem",
    "veri",
    "bilgi",
    "geçmiş",
    "kayıt",
    "rapor",
    "transkript",
    "doküman",
    "log",
    "sinyal",
    "hesap",
    "portföy",
    "kart",
    "demografik",
    "davranış",
    "ödeme",
    # English
    "customer",
    "transaction",
    "data",
    "information",
    "history",
    "historical",
    "record",
    "report",
    "transcript",
    "document",
    "signal",
    "account",
    "portfolio",
    "card",
    "demographic",
    "behavior",
    "behaviour",
    "payment",
}

OUTCOMES = {
    # Turkish
    "skor",
    "karar",
    "öneri",
    "tahmin",
    "uyarı",
    "alarm",
    "sınıf",
    "etiket",
    "olasılık",
    "risk",
    "segment",
    "aksiyon",
    "rapor",
    "öngörü",
    # English
    "score",
    "decision",
    "recommendation",
    "prediction",
    "alert",
    "warning",
    "class",
    "label",
    "probability",
    "risk",
    "segment",
    "action",
    "report",
    "forecast",
    "insight",
}

ALGORITHMS = {
    # ML techniques / model types
    "xgboost",
    "lstm",
    "random forest",
    "lojistik regresyon",
    "logistic regression",
    "neural network",
    "deep learning",
    "clustering",
    "classification",
    "regression",
    "time series",
    "anomaly detection",
    "gradient boosting",
    "decision tree",
    "svm",
    "naive bayes",
    "transformer",
    "cnn",
    "rnn",
    "ensemble",
    "reinforcement learning",
    "nlp",
    "bert",
    "gpt",
    "word2vec",
    "k-means",
    "pca",
    "autoencoder",
    "gan",
    "bayesian",
    "derin öğrenme",
    "sinir ağı",
    "kümeleme",
    "sınıflandırma",
    "regresyon",
    "zaman serisi",
    "anomali tespiti",
    "karar ağacı",
}

REGULATORY_REFS = {
    "basel",
    "fatf",
    "masak",
    "bddk",
    "pci-dss",
    "kvkk",
    "gdpr",
    "ifrs",
    "ofac",
    "spk",
    "tcmb",
    "eba",
    "brsa",
    "pci",
}

BUSINESS_VALUE = {
    # Turkish
    "maliyet",
    "verimlilik",
    "risk",
    "hızlandır",
    "azalt",
    "artır",
    "iyileştir",
    "tasarruf",
    "karlılık",
    "performans",
    # English
    "cost",
    "efficiency",
    "optimize",
    "reduce",
    "improve",
    "save",
    "profit",
    "performance",
    "revenue",
    "growth",
    "benefit",
    "value",
    "roi",
    "streamline",
}

TARGET_USERS = {
    # Turkish
    "müşteri",
    "ekip",
    "yönetici",
    "analist",
    "birim",
    "departman",
    "uzman",
    "personel",
    "operatör",
    # English
    "customer",
    "team",
    "manager",
    "analyst",
    "department",
    "unit",
    "specialist",
    "staff",
    "operator",
    "user",
    "stakeholder",
}

LENGTH_PERFECT = (50, 80)
LENGTH_GOOD = (30, 120)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


@dataclass
class QualityScore:
    score: int
    issues: list[str]


_TOKEN_RE = re.compile(r"[A-Za-zÇĞİıÖŞÜçğıöşü0-9]+")


def _tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in _TOKEN_RE.finditer(text or "")]


def _contains_any(tokens: list[str], vocabulary: set[str]) -> bool:
    """Return True if any token starts with any vocabulary stem."""

    for token in tokens:
        for stem in vocabulary:
            if token == stem or token.startswith(stem):
                return True
    return False


def _length_score(word_count: int, language: str) -> tuple[int, str | None]:
    if LENGTH_PERFECT[0] <= word_count <= LENGTH_PERFECT[1]:
        return 13, None
    if LENGTH_GOOD[0] <= word_count <= LENGTH_GOOD[1]:
        msg = (
            f"Açıklama uzunluğu ideal değil ({word_count} kelime; ideal 50-80)."
            if language == "tr"
            else f"Description length is not ideal ({word_count} words; ideal 50-80)."
        )
        return 8, msg
    msg = (
        f"Açıklama uzunluğu uygunsuz ({word_count} kelime)."
        if language == "tr"
        else f"Description length is out of range ({word_count} words)."
    )
    return 0, msg


def _contains_any_phrase(text_lower: str, tokens: list[str], vocabulary: set[str]) -> bool:
    """Check for multi-word phrases in text, or single-word stems in tokens."""
    for term in vocabulary:
        if " " in term:
            # Multi-word phrase: search in raw text
            if term in text_lower:
                return True
        else:
            # Single word: use stem matching on tokens
            for token in tokens:
                if token == term or token.startswith(term):
                    return True
    return False


def score_description(text: str, language: str = "tr") -> QualityScore:
    """Score a single description (TR or EN). Returns a 0-100 score + issue list.

    8 criteria: 4 x 13 pts + 4 x 12 pts = 100 pts.
    """

    issues: list[str] = []
    tokens = _tokenize(text)
    text_lower = (text or "").lower()
    word_count = len(tokens)

    # 1. Length (13 pts)
    length_pts, length_issue = _length_score(word_count, language)
    if length_issue:
        issues.append(length_issue)

    # 2. Action verb (13 pts)
    if _contains_any(tokens, ACTION_VERBS):
        action_pts = 13
    else:
        action_pts = 0
        issues.append(
            "Eylem fiili eksik (ör. tahmin, hesapla, tespit)."
            if language == "tr"
            else "Missing action verb (e.g. predict, calculate, detect)."
        )

    # 3. Data source (13 pts)
    if _contains_any(tokens, DATA_SOURCES):
        data_pts = 13
    else:
        data_pts = 0
        issues.append(
            "Veri kaynağı belirtilmemiş (ör. müşteri, işlem, veri)."
            if language == "tr"
            else "No data source mentioned (e.g. customer, transaction, data)."
        )

    # 4. Outcome / decision (13 pts)
    if _contains_any(tokens, OUTCOMES):
        outcome_pts = 13
    else:
        outcome_pts = 0
        issues.append(
            "Çıktı/karar belirtilmemiş (ör. skor, karar, öneri)."
            if language == "tr"
            else "No outcome/decision stated (e.g. score, decision, recommendation)."
        )

    # 5. Algorithm / technique mentioned (12 pts)
    if _contains_any_phrase(text_lower, tokens, ALGORITHMS):
        algo_pts = 12
    else:
        algo_pts = 0
        issues.append(
            "Algoritma/teknik belirtilmemiş (ör. XGBoost, LSTM, lojistik regresyon)."
            if language == "tr"
            else "No algorithm/technique mentioned (e.g. XGBoost, LSTM, logistic regression)."
        )

    # 6. Regulatory reference (12 pts)
    if _contains_any_phrase(text_lower, tokens, REGULATORY_REFS):
        reg_pts = 12
    else:
        reg_pts = 0
        issues.append(
            "Düzenleyici referans eksik (ör. Basel, BDDK, KVKK, GDPR)."
            if language == "tr"
            else "No regulatory reference (e.g. Basel, FATF, GDPR, PCI-DSS)."
        )

    # 7. Business value (12 pts)
    if _contains_any_phrase(text_lower, tokens, BUSINESS_VALUE):
        biz_pts = 12
    else:
        biz_pts = 0
        issues.append(
            "İş değeri belirtilmemiş (ör. maliyet, verimlilik, risk azaltma)."
            if language == "tr"
            else "No business value stated (e.g. cost, efficiency, risk reduction)."
        )

    # 8. Target user (12 pts)
    if _contains_any_phrase(text_lower, tokens, TARGET_USERS):
        user_pts = 12
    else:
        user_pts = 0
        issues.append(
            "Hedef kullanıcı belirtilmemiş (ör. müşteri, ekip, yönetici, analist)."
            if language == "tr"
            else "No target user mentioned (e.g. customer, team, manager, analyst)."
        )

    total = length_pts + action_pts + data_pts + outcome_pts + algo_pts + reg_pts + biz_pts + user_pts
    return QualityScore(score=total, issues=issues)


# ---------------------------------------------------------------------------
# Findability scoring (AI-based using embeddings)
# ---------------------------------------------------------------------------


@dataclass
class FindabilityScore:
    score: int
    issues: list[str]


def score_findability(
    item_index: int,
    state: "InventoryEmbeddings",
) -> FindabilityScore:
    """Score how findable a model is via semantic search. 0-100.

    Criteria:
    1. Name-Purpose alignment (40 pts): cosine(name_embedding, purpose_embedding)
    2. Distinctiveness (35 pts): distance to nearest OTHER model
    3. TR-EN consistency (25 pts): cosine(tr_normal, en_normal)
    """
    issues: list[str] = []
    item = state.items[item_index]

    # 1. Name-Purpose alignment (40 pts)
    # Encode name and purpose separately
    name_text = item.name_tr + " " + item.name_en
    purpose_text = item.purpose_tr + " " + item.purpose_en
    vecs = state.encoder.encode(
        [name_text, purpose_text],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    name_vec = vecs[0]
    purpose_vec = vecs[1]
    name_purpose_sim = float(np.dot(name_vec, purpose_vec))

    if name_purpose_sim >= 0.6:
        align_pts = 40
    elif name_purpose_sim >= 0.4:
        align_pts = 30
    elif name_purpose_sim >= 0.2:
        align_pts = 20
    else:
        align_pts = 10
    if align_pts < 40:
        issues.append(
            f"Model adı ve amacı arasındaki uyum düşük (benzerlik: {name_purpose_sim:.2f})."
        )

    # 2. Distinctiveness (35 pts) — distance to nearest OTHER model
    my_emb = state.tr_normal[item_index]  # shape (D,)
    all_emb = state.tr_normal  # shape (N, D)
    similarities = np.dot(all_emb, my_emb)  # shape (N,)
    # Mask self
    similarities[item_index] = -1.0
    max_sim = float(np.max(similarities))

    if max_sim < 0.7:
        distinct_pts = 35
    elif max_sim < 0.8:
        distinct_pts = 25
    elif max_sim < 0.9:
        distinct_pts = 15
    else:
        distinct_pts = 5
    if distinct_pts < 35:
        # Find the most similar model for the issue message
        most_similar_idx = int(np.argmax(similarities))
        similar_name = state.items[most_similar_idx].name_tr
        issues.append(
            f"Başka bir modele çok benzer: \"{similar_name}\" (benzerlik: {max_sim:.2f})."
        )

    # 3. TR-EN consistency (25 pts)
    tr_vec = state.tr_normal[item_index]
    en_vec = state.en_normal[item_index]
    tr_en_sim = float(np.dot(tr_vec, en_vec))

    if tr_en_sim >= 0.8:
        consist_pts = 25
    elif tr_en_sim >= 0.6:
        consist_pts = 18
    elif tr_en_sim >= 0.4:
        consist_pts = 10
    else:
        consist_pts = 0
    if consist_pts < 25:
        issues.append(
            f"TR ve EN açıklamalar arasındaki tutarlılık düşük (benzerlik: {tr_en_sim:.2f})."
        )

    total = align_pts + distinct_pts + consist_pts
    return FindabilityScore(score=total, issues=issues)


# ---------------------------------------------------------------------------
# Aggregate buckets
# ---------------------------------------------------------------------------


def bucket(score: int) -> str:
    """Map a 0-100 score to one of three quality buckets."""

    if score >= 85:
        return "excellent"
    if score >= 65:
        return "good"
    return "needs_improvement"


# ---------------------------------------------------------------------------
# Enrichment scoring (keywords, sources, standards)
# ---------------------------------------------------------------------------


@dataclass
class EnrichmentScore:
    score: int
    issues: list[str]
    keyword_count: int
    source_count: int
    has_standards: bool


def score_enrichment(
    keywords: str,
    sources: list[dict],
    standards: str,
    language: str = "tr",
) -> EnrichmentScore:
    """Score the enrichment quality of a model (keywords + sources + standards). 0-100."""

    issues: list[str] = []

    kw_list = [k.strip() for k in (keywords or "").split(";") if k.strip()]
    keyword_count = len(kw_list)
    src_count = len(sources) if sources else 0
    has_std = bool(standards and standards.strip())

    # Keyword richness (40 pts) — progressive scale, 100 is hard to reach
    if keyword_count >= 40:
        kw_pts = 40
    elif keyword_count >= 30:
        kw_pts = 32
    elif keyword_count >= 20:
        kw_pts = 24
    elif keyword_count >= 10:
        kw_pts = 16
    elif keyword_count >= 5:
        kw_pts = 8
    else:
        kw_pts = 0
    if keyword_count < 30:
        issues.append(
            f"Anahtar kavram zenginleştirilebilir ({keyword_count} adet; hedef >=40)."
            if language == "tr"
            else f"Keywords can be enriched ({keyword_count}; target >=40)."
        )

    # Source references (35 pts) — 5+ for max
    if src_count >= 5:
        src_pts = 35
    elif src_count >= 4:
        src_pts = 28
    elif src_count >= 3:
        src_pts = 21
    elif src_count >= 2:
        src_pts = 14
    elif src_count >= 1:
        src_pts = 7
    else:
        src_pts = 0
    if src_count < 5:
        issues.append(
            f"Referans kaynak artırılabilir ({src_count} adet; hedef >=5)."
            if language == "tr"
            else f"Reference sources can be increased ({src_count}; target >=5)."
        )

    # Standards (25 pts) — 5+ for max
    std_items = [s.strip() for s in (standards or "").split(";") if s.strip()]
    std_count = len(std_items)
    if std_count >= 5:
        std_pts = 25
    elif std_count >= 3:
        std_pts = 18
    elif std_count >= 1:
        std_pts = 10
    else:
        std_pts = 0
    if std_count < 5:
        issues.append(
            f"Standart referansı artırılabilir ({std_count} adet; hedef >=5)."
            if language == "tr"
            else f"Standard references can be increased ({std_count}; target >=5)."
        )

    total = kw_pts + src_pts + std_pts
    return EnrichmentScore(
        score=total,
        issues=issues,
        keyword_count=keyword_count,
        source_count=src_count,
        has_standards=has_std,
    )
