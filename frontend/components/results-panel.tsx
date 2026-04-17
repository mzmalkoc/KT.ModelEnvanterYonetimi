"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Inbox,
  Info,
  Loader2,
  Sparkles,
  Type,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import type {
  Language,
  MatchedView,
  RiskLevel,
  SimilarityMatch,
  SimilarityResponse,
} from "@/types";
import { getStrings, type Strings } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  language: Language;
  loading: boolean;
  error: string | null;
  result: SimilarityResponse | null;
}

const riskBadgeVariant: Record<
  RiskLevel,
  "destructive" | "warning" | "success"
> = {
  high: "destructive",
  medium: "warning",
  low: "success",
};

function progressColor(score: number): string {
  if (score > 75) return "bg-red-600";
  if (score > 55) return "bg-yellow-500";
  return "bg-green-600";
}

function languageFlag(lang: Language): string {
  return lang === "tr" ? "🇹🇷" : "🇬🇧";
}

export function ResultsPanel({
  language,
  loading,
  error,
  result,
}: ResultsPanelProps) {
  const t = getStrings(language);

  if (loading) {
    return (
      <Card className="flex h-full min-h-[420px] items-center justify-center">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm">{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">{t.resultsHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.errorTitle}</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <p className="mt-2 text-xs opacity-80">{t.errorHint}</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="flex h-full min-h-[420px] items-center justify-center border-dashed">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center text-slate-400">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">{t.resultsPlaceholder}</p>
        </CardContent>
      </Card>
    );
  }

  const recommendationContent = (() => {
    switch (result.recommendation) {
      case "duplicate":
        return {
          variant: "destructive" as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: t.recommendationDuplicate,
        };
      case "similar":
        return {
          variant: "warning" as const,
          icon: <Info className="h-4 w-4" />,
          title: t.recommendationSimilar,
        };
      case "new":
      default:
        return {
          variant: "success" as const,
          icon: <CheckCircle2 className="h-4 w-4" />,
          title: t.recommendationNew,
        };
    }
  })();

  const topMatches = result.matches.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{t.resultsHeading}</CardTitle>
        <CardDescription>
          {t.detectedLanguage}:{" "}
          <span className="font-medium uppercase text-slate-700">
            {result.input.detected_language}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {language === "tr" ? "Talep Edilen Model" : "Requested Model"}
          </p>
          <div className="space-y-1.5">
            {result.input.department ? (
              <div className="flex gap-2">
                <span className="text-xs font-medium text-slate-500 min-w-[80px]">
                  {language === "tr" ? "Birim:" : "Department:"}
                </span>
                <span className="text-xs text-slate-700">{result.input.department}</span>
              </div>
            ) : null}
            <div className="flex gap-2">
              <span className="text-xs font-medium text-slate-500 min-w-[80px]">
                {language === "tr" ? "Model Adı:" : "Model Name:"}
              </span>
              <span className="text-xs font-semibold text-slate-800">{result.input.name}</span>
            </div>
            {result.input.purpose ? (
              <div className="flex gap-2">
                <span className="text-xs font-medium text-slate-500 min-w-[80px]">
                  {language === "tr" ? "Modelin Hedefi:" : "Model Objective:"}
                </span>
                <span className="text-xs text-slate-700">{result.input.purpose}</span>
              </div>
            ) : null}
          </div>
        </div>

        <Alert variant={recommendationContent.variant}>
          {recommendationContent.icon}
          <AlertTitle>{recommendationContent.title}</AlertTitle>
          <AlertDescription>
            <p className="leading-relaxed">{result.explanation}</p>
            {result.recommendation === "duplicate" && result.matches[0] ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
                  {language === "tr" ? "📋 Mevcut Modeli İncele" : "📋 Review Existing Model"}
                </button>
                <button className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
                  {language === "tr" ? "📧 Model Sahibiyle İletişime Geç" : "📧 Contact Model Owner"}
                </button>
              </div>
            ) : null}
            {result.recommendation === "similar" && result.matches[0] ? (
              <div className="mt-3">
                <button className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
                  {language === "tr" ? "🔍 Benzer Modelleri Karşılaştır" : "🔍 Compare Similar Models"}
                </button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>

        {(result.recommendation === "duplicate" ||
          result.recommendation === "similar") &&
        result.matches[0] ? (
          <ModelRequirementsSection
            match={result.matches[0]}
            language={language}
          />
        ) : null}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t.topMatches}
          </h3>
          {topMatches.length === 0 ? (
            <p className="text-sm text-slate-400">{t.noMatches}</p>
          ) : (
            <div className="space-y-3">
              {topMatches.map((match) => (
                <MatchCard
                  key={match.model.no}
                  match={match}
                  language={language}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelRequirementsSectionProps {
  match: SimilarityMatch;
  language: Language;
}

function ModelRequirementsSection({
  match,
  language,
}: ModelRequirementsSectionProps) {
  const t = getStrings(language);
  const model = match.model;

  const keywordsRaw =
    language === "tr" ? model.keywords_tr : model.keywords_en;
  const keywords = keywordsRaw
    ? keywordsRaw
        .split(";")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const standards = model.standards
    ? model.standards
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const sources = model.sources ?? [];

  // Don't render the section if there is nothing to show
  if (keywords.length === 0 && standards.length === 0 && sources.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {language === "tr"
            ? "Eşleşen Modelin Gereklilikleri"
            : "Matched Model Requirements"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {keywords.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>📊</span>
              {language === "tr" ? "Anahtar Kavramlar" : "Keywords"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {standards.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>📋</span>
              {t.standards}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {standards.map((std) => (
                <Badge key={std} variant="outline" className="text-xs">
                  {std}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {sources.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>🔗</span>
              {t.sources}
            </p>
            <ul className="space-y-1">
              {sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {src.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface MatchCardProps {
  match: SimilarityMatch;
  language: Language;
}

function MatchCard({ match, language }: MatchCardProps) {
  const t = getStrings(language);
  const [expanded, setExpanded] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const scorePct = Math.round(match.similarity_score * 100);
  const indicatorColor = progressColor(scorePct);
  const riskLabel =
    match.risk_level === "high"
      ? t.riskHigh
      : match.risk_level === "medium"
        ? t.riskMedium
        : t.riskLow;

  // Defensive defaults: if the backend hasn't been upgraded yet, fall back
  // to similarity_score for any missing component score so the breakdown
  // remains coherent rather than showing 0% bars.
  const semantic = match.semantic_score ?? match.similarity_score;
  const bm25 = match.bm25_score ?? match.similarity_score;
  const rerank = match.rerank_score ?? match.similarity_score;

  // Show the multi-stage breakdown only if the backend actually returned
  // at least one of the new fields. Otherwise it adds noise.
  const hasBreakdown =
    match.semantic_score !== undefined ||
    match.bm25_score !== undefined ||
    match.rerank_score !== undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {language === "tr" ? match.model.name_tr : match.model.name_en}
            </p>
            {match.matched_view ? (
              <MatchedViewBadge view={match.matched_view} t={t} />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {language === "tr" ? match.model.name_en : match.model.name_tr}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="text-xs">
            {match.model.category}
          </Badge>
          <span
            className="text-xs"
            title={t.matchedLanguage}
            aria-label={`${t.matchedLanguage}: ${match.matched_language}`}
          >
            {languageFlag(match.matched_language)}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{t.similarityScore}</span>
          <span className="font-mono font-semibold">{scorePct}%</span>
        </div>
        <Progress
          value={scorePct}
          indicatorClassName={indicatorColor}
          aria-label={`${t.similarityScore}: ${scorePct}%`}
        />
      </div>

      {hasBreakdown ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setBreakdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
            aria-expanded={breakdownOpen}
          >
            {t.scoreBreakdown}
            {breakdownOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {breakdownOpen ? (
            <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <ScoreBar
                label={t.semanticMatch}
                value={semantic}
                indicatorClassName="bg-blue-500"
              />
              <ScoreBar
                label={t.keywordMatch}
                value={bm25}
                indicatorClassName="bg-blue-500"
              />
              <ScoreBar
                label={t.rerankScore}
                value={rerank}
                indicatorClassName="bg-blue-500"
              />
              <div className="my-1 border-t border-dashed border-slate-300" />
              <ScoreBar
                label={t.finalScore}
                value={match.similarity_score}
                indicatorClassName="bg-primary"
                emphasis
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={riskBadgeVariant[match.risk_level]} className="text-xs">
          {t.riskLevel}: {riskLabel}
        </Badge>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700",
          )}
          aria-expanded={expanded}
        >
          {expanded ? t.hideDetails : t.showDetails}
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-400">
              TR
            </p>
            <p className="mt-1">{match.model.purpose_tr}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-400">
              EN
            </p>
            <p className="mt-1">{match.model.purpose_en}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number; // 0-1
  indicatorClassName: string;
  emphasis?: boolean;
}

function ScoreBar({ label, value, indicatorClassName, emphasis }: ScoreBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center justify-between text-xs",
          emphasis ? "font-semibold text-slate-900" : "text-slate-600",
        )}
      >
        <span
          className={cn(
            emphasis ? "uppercase tracking-wide" : "",
          )}
        >
          {label}
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <Progress
        value={pct}
        className="h-2"
        indicatorClassName={indicatorClassName}
        aria-label={`${label}: ${pct}%`}
      />
    </div>
  );
}

interface MatchedViewBadgeProps {
  view: MatchedView;
  t: Strings;
}

function MatchedViewBadge({ view, t }: MatchedViewBadgeProps) {
  switch (view) {
    case "enriched":
      return (
        <Badge
          variant="success"
          className="inline-flex items-center gap-1 text-[10px]"
          title={t.matchedViewEnriched}
        >
          <Sparkles className="h-3 w-3" />
          {t.matchedViewEnriched}
        </Badge>
      );
    case "short":
      return (
        <Badge
          variant="info"
          className="inline-flex items-center gap-1 text-[10px]"
          title={t.matchedViewShort}
        >
          <Type className="h-3 w-3" />
          {t.matchedViewShort}
        </Badge>
      );
    case "normal":
    default:
      return (
        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1 text-[10px]"
          title={t.matchedViewNormal}
        >
          <FileText className="h-3 w-3" />
          {t.matchedViewNormal}
        </Badge>
      );
  }
}
