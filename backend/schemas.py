"""Pydantic request/response models for the Model Inventory API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Shared model representation
# ---------------------------------------------------------------------------


class SourceLink(BaseModel):
    title: str
    url: str


class ModelRecord(BaseModel):
    """A single AI model from the inventory CSV."""

    no: int
    name_tr: str
    name_en: str
    category: str
    purpose_tr: str
    purpose_en: str
    keywords_tr: str = ""
    keywords_en: str = ""
    standards: str = ""
    sources: list[SourceLink] = []


class InventoryResponse(BaseModel):
    models: list[ModelRecord]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: Literal["ok"] = "ok"
    model_loaded: bool


# ---------------------------------------------------------------------------
# Similarity check
# ---------------------------------------------------------------------------

LanguageOption = Literal["tr", "en", "auto"]
DetectedLanguage = Literal["tr", "en"]
RiskLevel = Literal["high", "medium", "low"]
Recommendation = Literal["duplicate", "similar", "new"]
MatchedView = Literal["short", "normal", "enriched"]


class SimilarityRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Proposed model name")
    purpose: str = Field(default="", description="Proposed model objective / description")
    language: LanguageOption = Field(
        default="auto",
        description="Preferred query language: tr, en, or auto-detect",
    )
    department: str = Field(default="", description="Requesting department/unit")
    priority: str = Field(default="medium", description="Request priority: low, medium, high, critical")
    requester_email: str = Field(default="", description="Email of the requester (auto-filled via SSO in production)")


class SimilarityInputEcho(BaseModel):
    name: str
    purpose: str
    detected_language: DetectedLanguage
    department: str = ""
    priority: str = "medium"
    requester_email: str = ""


class SimilarityMatch(BaseModel):
    # Disable pydantic v2's "protected namespace" warning for the `model` field name,
    # which is intentional here (the API contract uses "model" to mean the matched record).
    model_config = ConfigDict(protected_namespaces=())

    model: ModelRecord
    similarity_score: float       # = final_score (kept for backward compatibility)
    risk_level: RiskLevel
    matched_language: DetectedLanguage
    # Per-stage scores from the new 3-stage retrieval pipeline.
    semantic_score: float         # multi-view bi-encoder max (0-1)
    bm25_score: float             # normalised BM25 score (0-1)
    rerank_score: float           # cross-encoder score (sigmoid-normalised, 0-1)
    matched_view: MatchedView


class SimilarityResponse(BaseModel):
    input: SimilarityInputEcho
    matches: list[SimilarityMatch]
    recommendation: Recommendation
    explanation: str


# ---------------------------------------------------------------------------
# Quality check
# ---------------------------------------------------------------------------


class QualityModelEntry(BaseModel):
    no: int
    name_tr: str
    name_en: str
    description_quality: int = 0
    findability_score: int = 0
    enrichment_score: int = 0
    description_issues: list[str] = []
    findability_issues: list[str] = []
    enrichment_issues: list[str] = []
    keyword_count_tr: int = 0
    keyword_count_en: int = 0
    source_count: int = 0
    has_standards: bool = False


class QualitySummary(BaseModel):
    total: int
    excellent: int
    good: int
    needs_improvement: int
    avg_description: int = 0
    avg_findability: int = 0
    average_enrichment: int = 0


class QualityResponse(BaseModel):
    summary: QualitySummary
    models: list[QualityModelEntry]
