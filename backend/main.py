"""FastAPI application entrypoint for the Model Inventory backend."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import embeddings
import quality
import similarity
from schemas import (
    HealthResponse,
    InventoryResponse,
    ModelRecord,
    QualityModelEntry,
    QualityResponse,
    QualitySummary,
    SimilarityInputEcho,
    SimilarityMatch,
    SimilarityRequest,
    SimilarityResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kt-ai-backend")


# ---------------------------------------------------------------------------
# Lifespan: load models + embeddings once on startup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Loading 3-stage retrieval pipeline: bi-encoder=%s, cross-encoder=%s ...",
        embeddings.MODEL_NAME,
        embeddings.CROSS_ENCODER_MODEL,
    )
    t0 = time.perf_counter()
    embeddings.initialize()
    state = embeddings.get_state()
    elapsed = time.perf_counter() - t0
    logger.info(
        "Loaded %d inventory items; bi-encoder dim=%d; multi-view embeddings ready "
        "(short/normal/enriched x tr/en); BM25 indices built; cross-encoder loaded. "
        "Cold-start took %.2fs.",
        len(state.items),
        state.tr_normal.shape[1],
        elapsed,
    )
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="KT AI - Model Inventory Duplicate Detection",
    description=(
        "Backend for the Kuveyt Türk AI Lab case study. "
        "Detects duplicate / overlapping AI model proposals against an inventory of 30 banking models "
        "using a 3-stage retrieval pipeline (multi-view bi-encoder + BM25 + cross-encoder rerank)."
    ),
    version="0.2.17",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_record(item: embeddings.InventoryItem) -> ModelRecord:
    return ModelRecord(**item.to_dict())


DEPARTMENTS = sorted(
    [
        {"id": "arge", "name_tr": "AR-GE Merkezi", "name_en": "R&D Center"},
        {"id": "bilgi_teknolojileri", "name_tr": "Bilgi Teknolojileri", "name_en": "Information Technology"},
        {"id": "bireysel_isletme", "name_tr": "Bireysel ve İşletme Bankacılık", "name_en": "Retail & SME Banking"},
        {"id": "dijital_bankacilik", "name_tr": "Dijital Bankacılık ve Ödeme Sistemleri", "name_en": "Digital Banking & Payment Systems"},
        {"id": "dijital_donusum", "name_tr": "Dijital Dönüşüm", "name_en": "Digital Transformation"},
        {"id": "dijital_pazarlama", "name_tr": "Dijital Pazarlama", "name_en": "Digital Marketing"},
        {"id": "hazine", "name_tr": "Hazine ve Uluslararası Bankacılık", "name_en": "Treasury & International Banking"},
        {"id": "ic_kontrol", "name_tr": "İç Kontrol", "name_en": "Internal Control"},
        {"id": "insan_kaynaklari", "name_tr": "İnsan Kaynakları ve Strateji", "name_en": "HR & Strategy"},
        {"id": "kurumsal_ticari", "name_tr": "Kurumsal ve Ticari Bankacılık", "name_en": "Corporate & Commercial Banking"},
        {"id": "muhasebe_mali", "name_tr": "Muhasebe ve Mali İşler", "name_en": "Accounting & Finance"},
        {"id": "ozel_bankacilik", "name_tr": "Özel Bankacılık", "name_en": "Private Banking"},
        {"id": "proje_yonetimi", "name_tr": "Proje Yönetimi ve Kalite", "name_en": "Project Management & Quality"},
        {"id": "risk_kontrol_uyum", "name_tr": "Risk, Kontrol ve Uyum", "name_en": "Risk, Control & Compliance"},
        {"id": "teftis", "name_tr": "Teftiş Kurulu", "name_en": "Internal Audit"},
        {"id": "uyum", "name_tr": "Uyum (Compliance)", "name_en": "Compliance"},
        {"id": "yapay_zeka_lab", "name_tr": "Yapay Zeka Laboratuvarı", "name_en": "AI Laboratory"},
    ],
    key=lambda d: d["name_tr"],
) + [{"id": "diger", "name_tr": "Diğer", "name_en": "Other"}]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=embeddings.is_loaded())


@app.get("/api/departments", tags=["meta"])
def get_departments() -> list[dict]:
    return DEPARTMENTS


@app.get("/api/inventory", response_model=InventoryResponse, tags=["inventory"])
def get_inventory() -> InventoryResponse:
    state = embeddings.get_state()
    return InventoryResponse(models=[_to_record(it) for it in state.items])


@app.post("/api/check-similarity", response_model=SimilarityResponse, tags=["similarity"])
def check_similarity(req: SimilarityRequest) -> SimilarityResponse:
    try:
        matches, detected_language = similarity.compute_matches(
            name=req.name, purpose=req.purpose, language=req.language
        )
    except Exception as exc:  # noqa: BLE001 - surface unexpected errors as 500
        logger.exception("Similarity computation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    top_score = matches[0].final_score if matches else 0.0
    recommendation = similarity.recommend(top_score)
    explanation = similarity.build_explanation(matches, recommendation, detected_language)

    return SimilarityResponse(
        input=SimilarityInputEcho(
            name=req.name,
            purpose=req.purpose,
            detected_language=detected_language,  # type: ignore[arg-type]
            department=req.department,
            priority=req.priority,
            requester_email=req.requester_email,
        ),
        matches=[
            SimilarityMatch(
                model=_to_record(m.item),
                similarity_score=round(m.final_score, 4),
                risk_level=m.risk_level,  # type: ignore[arg-type]
                matched_language=m.matched_language,  # type: ignore[arg-type]
                semantic_score=round(m.semantic_score, 4),
                bm25_score=round(m.bm25_score, 4),
                rerank_score=round(m.final_score, 4),  # sigmoid-normalised 0-1 for UI display
                matched_view=m.matched_view,  # type: ignore[arg-type]
            )
            for m in matches
        ],
        recommendation=recommendation,  # type: ignore[arg-type]
        explanation=explanation,
    )


@app.get("/api/quality-check", response_model=QualityResponse, tags=["quality"])
def quality_check() -> QualityResponse:
    state = embeddings.get_state()

    entries: list[QualityModelEntry] = []
    desc_total = 0
    find_total = 0
    enrichment_total = 0
    bucket_counts = {"excellent": 0, "good": 0, "needs_improvement": 0}

    for idx, item in enumerate(state.items):
        # Score 1: Description Quality (combined TR+EN average, 8 criteria)
        tr = quality.score_description(item.purpose_tr, language="tr")
        en = quality.score_description(item.purpose_en, language="en")
        description_quality = round((tr.score + en.score) / 2)
        description_issues = tr.issues + en.issues

        # Score 2: Findability (AI-based using embeddings)
        findability = quality.score_findability(idx, state)

        # Score 3: Enrichment (existing logic)
        enrich_tr = quality.score_enrichment(
            item.keywords_tr, item.sources, item.standards, language="tr"
        )
        enrich_en = quality.score_enrichment(
            item.keywords_en, item.sources, item.standards, language="en"
        )
        enrichment_avg = round((enrich_tr.score + enrich_en.score) / 2)

        entries.append(
            QualityModelEntry(
                no=item.no,
                name_tr=item.name_tr,
                name_en=item.name_en,
                description_quality=description_quality,
                findability_score=findability.score,
                enrichment_score=enrichment_avg,
                description_issues=description_issues,
                findability_issues=findability.issues,
                enrichment_issues=enrich_tr.issues + enrich_en.issues,
                keyword_count_tr=enrich_tr.keyword_count,
                keyword_count_en=enrich_en.keyword_count,
                source_count=enrich_tr.source_count,
                has_standards=enrich_tr.has_standards,
            )
        )

        combined_avg = round((description_quality + findability.score + enrichment_avg) / 3)
        desc_total += description_quality
        find_total += findability.score
        enrichment_total += enrichment_avg
        bucket_counts[quality.bucket(combined_avg)] += 1

    total_models = len(state.items)
    avg_description = round(desc_total / total_models) if total_models else 0
    avg_findability = round(find_total / total_models) if total_models else 0
    average_enrichment = round(enrichment_total / total_models) if total_models else 0

    return QualityResponse(
        summary=QualitySummary(
            total=total_models,
            excellent=bucket_counts["excellent"],
            good=bucket_counts["good"],
            needs_improvement=bucket_counts["needs_improvement"],
            avg_description=avg_description,
            avg_findability=avg_findability,
            average_enrichment=average_enrichment,
        ),
        models=entries,
    )
