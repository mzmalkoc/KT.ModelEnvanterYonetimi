"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import type { Language, QualityModel, QualityResponse } from "@/types";
import { getQualityCheck } from "@/lib/api";
import { getStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface QualityDashboardProps {
  language: Language;
}

type SortKey = "no" | "name" | "description" | "findability" | "enrichment";

interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-700";
  if (score >= 70) return "text-yellow-700";
  return "text-red-700";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-green-50 border-green-200";
  if (score >= 70) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function scoreIndicator(score: number): string {
  if (score >= 90) return "bg-green-600";
  if (score >= 70) return "bg-yellow-500";
  return "bg-red-600";
}

export function QualityDashboard({ language }: QualityDashboardProps) {
  const [data, setData] = useState<QualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<SortState>({ key: "no", direction: "asc" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getQualityCheck()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const t = getStrings(language);

  const sortedModels = useMemo(() => {
    if (!data) return [] as QualityModel[];
    const arr = [...data.models];
    const dir = sort.direction === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case "no":
          return (a.no - b.no) * dir;
        case "name": {
          const an = language === "tr" ? a.name_tr : a.name_en;
          const bn = language === "tr" ? b.name_tr : b.name_en;
          return an.localeCompare(bn) * dir;
        }
        case "description":
          return (a.description_quality - b.description_quality) * dir;
        case "findability":
          return (a.findability_score - b.findability_score) * dir;
        case "enrichment":
          return (a.enrichment_score - b.enrichment_score) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [data, sort, language]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t.healthHeading}
        </h2>
        <p className="text-sm text-slate-500">{t.healthSubheading}</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t.errorTitle}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <p className="text-xs opacity-80">{t.errorHint}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {t.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<Sparkles className="h-4 w-4" />}
              label={t.cardTotal}
              value={data.summary.total}
              tone="info"
            />
            <SummaryCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={t.cardExcellent}
              value={data.summary.excellent}
              tone="success"
            />
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4" />}
              label={t.cardGood}
              value={data.summary.good}
              tone="warning"
            />
            <SummaryCard
              icon={<AlertCircle className="h-4 w-4" />}
              label={t.cardNeedsImprovement}
              value={data.summary.needs_improvement}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.cardDescriptionQuality}</CardTitle>
                <CardDescription>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      scoreColor(data.summary.avg_description),
                    )}
                  >
                    {data.summary.avg_description.toFixed(1)}
                  </span>
                  <span className="ml-1 text-sm text-slate-400">/ 100</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, Math.max(0, data.summary.avg_description))}
                  indicatorClassName={scoreIndicator(data.summary.avg_description)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.cardFindability}</CardTitle>
                <CardDescription>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      scoreColor(data.summary.avg_findability),
                    )}
                  >
                    {data.summary.avg_findability.toFixed(1)}
                  </span>
                  <span className="ml-1 text-sm text-slate-400">/ 100</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, Math.max(0, data.summary.avg_findability))}
                  indicatorClassName="bg-purple-600"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.cardEnrichment}</CardTitle>
                <CardDescription>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      scoreColor(data.summary.average_enrichment),
                    )}
                  >
                    {data.summary.average_enrichment.toFixed(1)}
                  </span>
                  <span className="ml-1 text-sm text-slate-400">/ 100</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, Math.max(0, data.summary.average_enrichment))}
                  indicatorClassName="bg-blue-600"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.qualityTableHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <SortableHeader
                        active={sort.key === "no"}
                        direction={sort.direction}
                        onClick={() => toggleSort("no")}
                        className="w-[60px]"
                      >
                        {t.colNo}
                      </SortableHeader>
                      <SortableHeader
                        active={sort.key === "name"}
                        direction={sort.direction}
                        onClick={() => toggleSort("name")}
                      >
                        {t.colName}
                      </SortableHeader>
                      <SortableHeader
                        active={sort.key === "description"}
                        direction={sort.direction}
                        onClick={() => toggleSort("description")}
                        className="w-[140px]"
                      >
                        {t.colDescriptionQuality}
                      </SortableHeader>
                      <SortableHeader
                        active={sort.key === "findability"}
                        direction={sort.direction}
                        onClick={() => toggleSort("findability")}
                        className="w-[140px]"
                      >
                        {t.colFindability}
                      </SortableHeader>
                      <SortableHeader
                        active={sort.key === "enrichment"}
                        direction={sort.direction}
                        onClick={() => toggleSort("enrichment")}
                        className="w-[140px]"
                      >
                        {t.colEnrichment}
                      </SortableHeader>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedModels.map((m) => {
                      const isExpanded = expandedId === m.no;
                      const name = language === "tr" ? m.name_tr : m.name_en;
                      return (
                        <Fragment key={m.no}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : m.no)
                            }
                            aria-expanded={isExpanded}
                          >
                            <TableCell className="font-mono text-xs text-slate-500">
                              {m.no}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {name}
                            </TableCell>
                            <TableCell>
                              <ScoreCell score={m.description_quality} />
                            </TableCell>
                            <TableCell>
                              <ScoreCell score={m.findability_score} />
                            </TableCell>
                            <TableCell>
                              <ScoreCell score={m.enrichment_score} />
                            </TableCell>
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                              <TableCell colSpan={6} className="p-4">
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {t.issuesHeading}
                                  </p>
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <IssueList
                                      label={t.colDescriptionQuality}
                                      score={m.description_quality}
                                      issues={m.description_issues}
                                      noIssuesText={t.noIssues}
                                    />
                                    <IssueList
                                      label={t.colFindability}
                                      score={m.findability_score}
                                      issues={m.findability_issues}
                                      noIssuesText={t.noIssues}
                                    />
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                                      <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                          {t.colEnrichment}
                                        </p>
                                        <Badge variant="outline" className="font-mono text-xs text-blue-700">
                                          {m.enrichment_score}
                                        </Badge>
                                      </div>
                                      <div className="space-y-1 text-xs text-slate-700">
                                        <p>{t.colKeywords} TR: <strong>{m.keyword_count_tr}</strong> | EN: <strong>{m.keyword_count_en}</strong></p>
                                        <p>{t.colSources}: <strong>{m.source_count}</strong></p>
                                        <p>Standartlar: <strong>{m.has_standards ? "+" : "-"}</strong></p>
                                      </div>
                                      {m.enrichment_issues.length > 0 ? (
                                        <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-slate-600">
                                          {m.enrichment_issues.map((issue, idx) => (
                                            <li key={idx}>{issue}</li>
                                          ))}
                                        </ul>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t.loading}
        </p>
      ) : null}
    </div>
  );
}

type SummaryTone = "info" | "success" | "warning" | "danger";

const SUMMARY_TONE_CLASSES: Record<SummaryTone, string> = {
  info: "from-blue-50 to-white border-blue-200 text-blue-700",
  success: "from-green-50 to-white border-green-200 text-green-700",
  warning: "from-yellow-50 to-white border-yellow-200 text-yellow-700",
  danger: "from-red-50 to-white border-red-200 text-red-700",
};

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: SummaryTone;
}) {
  const toneClasses = SUMMARY_TONE_CLASSES;
  return (
    <Card
      className={cn(
        "border bg-gradient-to-br shadow-sm",
        toneClasses[tone],
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {label}
          </p>
          <span className="opacity-70">{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ScoreCell({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <div className="w-16">
        <Progress
          value={value}
          indicatorClassName={scoreIndicator(score)}
          aria-label={`Score: ${score}`}
        />
      </div>
      <span
        className={cn(
          "font-mono text-xs font-semibold tabular-nums",
          scoreColor(score),
        )}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

function IssueList({
  label,
  score,
  issues,
  noIssuesText,
}: {
  label: string;
  score: number;
  issues: string[];
  noIssuesText: string;
}) {
  return (
    <div
      className={cn("rounded-md border p-3 text-sm", scoreBg(score))}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Badge
          variant="outline"
          className={cn("font-mono text-xs", scoreColor(score))}
        >
          {Math.round(score)}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="text-xs text-slate-500">{noIssuesText}</p>
      ) : (
        <ul className="ml-4 list-disc space-y-1 text-xs text-slate-700">
          {issues.map((issue, idx) => (
            <li key={idx}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortableHeader({
  children,
  active,
  direction,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
          active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
        )}
      >
        {children}
        <ArrowUpDown
          className={cn(
            "h-3 w-3 transition-transform",
            active && direction === "desc" ? "rotate-180" : "",
            active ? "opacity-100" : "opacity-40",
          )}
        />
      </button>
    </TableHead>
  );
}
