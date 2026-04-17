// Types matching the backend API contract.

export type Language = "tr" | "en";
export type LanguageMode = "auto" | "tr" | "en";

export interface SourceLink {
  title: string;
  url: string;
}

export interface InventoryModel {
  no: number;
  name_tr: string;
  name_en: string;
  category: string;
  purpose_tr: string;
  purpose_en: string;
  // Optional enrichment fields (added in backend upgrade — kept optional
  // so the UI still works against the legacy backend during transition).
  keywords_tr?: string; // semicolon-separated
  keywords_en?: string; // semicolon-separated
  standards?: string; // semicolon-separated
  sources?: SourceLink[]; // authoritative reference links
}

export interface InventoryResponse {
  models: InventoryModel[];
}

export type RiskLevel = "high" | "medium" | "low";
export type Recommendation = "duplicate" | "similar" | "new";
export type MatchedView = "short" | "normal" | "enriched";

export interface Department {
  id: string;
  name_tr: string;
  name_en: string;
}

export type Priority = "low" | "medium" | "high" | "critical";

export interface SimilarityRequest {
  name: string;
  purpose: string;
  language: LanguageMode;
  department: string;
  department_other?: string;
  priority: Priority;
  requester_email: string;
}

export interface SimilarityMatch {
  model: InventoryModel;
  similarity_score: number; // 0-1, equals rerank_score in upgraded backend
  risk_level: RiskLevel;
  matched_language: Language;
  // Optional multi-stage scoring fields (added in backend upgrade — kept
  // optional so the UI degrades gracefully when called against the legacy
  // backend that returns only `similarity_score`).
  semantic_score?: number; // 0-1, multi-view bi-encoder max
  bm25_score?: number; // 0-1, normalized BM25 (keyword)
  rerank_score?: number; // 0-1, cross-encoder reranker
  matched_view?: MatchedView;
}

export interface SimilarityResponse {
  input: {
    name: string;
    purpose: string;
    detected_language: Language;
    department?: string;
    priority?: string;
    requester_email?: string;
  };
  matches: SimilarityMatch[];
  recommendation: Recommendation;
  explanation: string;
}

export interface QualityModel {
  no: number;
  name_tr: string;
  name_en: string;
  description_quality: number;
  findability_score: number;
  enrichment_score: number;
  description_issues: string[];
  findability_issues: string[];
  enrichment_issues: string[];
  keyword_count_tr: number;
  keyword_count_en: number;
  source_count: number;
  has_standards: boolean;
}

export interface QualitySummary {
  total: number;
  excellent: number;
  good: number;
  needs_improvement: number;
  avg_description: number;
  avg_findability: number;
  average_enrichment: number;
}

export interface QualityResponse {
  summary: QualitySummary;
  models: QualityModel[];
}

export interface ApiError {
  message: string;
  status?: number;
}
