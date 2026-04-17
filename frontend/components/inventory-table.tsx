"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { Skeleton } from "@/components/ui/skeleton";

import type { InventoryModel, Language } from "@/types";
import { getInventory } from "@/lib/api";
import { getStrings } from "@/lib/i18n";

interface InventoryTableProps {
  globalLanguage: Language;
}

export function InventoryTable({ globalLanguage }: InventoryTableProps) {
  const [tableLanguage, setTableLanguage] = useState<Language>(globalLanguage);
  const [models, setModels] = useState<InventoryModel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Track global language changes
  useEffect(() => {
    setTableLanguage(globalLanguage);
  }, [globalLanguage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInventory()
      .then((res) => {
        if (cancelled) return;
        setModels(res.models);
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

  const t = getStrings(globalLanguage);
  const tt = getStrings(tableLanguage);

  const categories = useMemo(() => {
    if (!models) return [] as string[];
    const set = new Set(models.map((m) => m.category));
    return Array.from(set).sort();
  }, [models]);

  const filtered = useMemo(() => {
    if (!models) return [] as InventoryModel[];
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (category !== "__all__" && m.category !== category) return false;
      if (!q) return true;
      const haystack = [
        m.name_tr,
        m.name_en,
        m.purpose_tr,
        m.purpose_en,
        m.category,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [models, search, category]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">{t.inventoryHeading}</CardTitle>
          <CardDescription>{t.inventorySubheading}</CardDescription>
        </div>
        <LanguageToggle
          value={tableLanguage}
          onChange={setTableLanguage}
          className="self-start"
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr,220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label={t.colCategory}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.filterCategoryAll}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {!loading && !error && models ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[60px]">{tt.colNo}</TableHead>
                  <TableHead>{tt.colName}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {tt.colCategory}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {tt.colPurpose}
                  </TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      {t.emptyInventory}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((model) => {
                    const isExpanded = expandedId === model.no;
                    const name =
                      tableLanguage === "tr" ? model.name_tr : model.name_en;
                    const purpose =
                      tableLanguage === "tr"
                        ? model.purpose_tr
                        : model.purpose_en;
                    return (
                      <Fragment key={model.no}>
                        <TableRow
                          onClick={() =>
                            setExpandedId(isExpanded ? null : model.no)
                          }
                          className="cursor-pointer"
                          aria-expanded={isExpanded}
                        >
                          <TableCell className="font-mono text-xs text-slate-500">
                            {model.no}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {model.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden max-w-[420px] truncate text-slate-600 lg:table-cell">
                            {purpose}
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
                            <TableCell colSpan={5} className="p-4">
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <DetailBlock
                                    label="🇹🇷 TR"
                                    name={model.name_tr}
                                    purpose={model.purpose_tr}
                                  />
                                  <DetailBlock
                                    label="🇬🇧 EN"
                                    name={model.name_en}
                                    purpose={model.purpose_en}
                                  />
                                </div>
                                <EnrichmentSection
                                  model={model}
                                  language={tableLanguage}
                                  keywordsLabel={tt.keywords}
                                  standardsLabel={tt.standards}
                                  sourcesLabel={tt.sources}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {loading ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t.loading}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DetailBlock({
  label,
  name,
  purpose,
}: {
  label: string;
  name: string;
  purpose: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900">{name}</p>
      <p className="mt-2 text-slate-600">{purpose}</p>
    </div>
  );
}

function splitSemicolonList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

interface EnrichmentSectionProps {
  model: InventoryModel;
  language: Language;
  keywordsLabel: string;
  standardsLabel: string;
  sourcesLabel: string;
}

function EnrichmentSection({
  model,
  language,
  keywordsLabel,
  standardsLabel,
  sourcesLabel,
}: EnrichmentSectionProps) {
  const keywordsRaw =
    language === "tr" ? model.keywords_tr : model.keywords_en;
  const keywords = splitSemicolonList(keywordsRaw);
  const standards = splitSemicolonList(model.standards);
  const sources = model.sources ?? [];

  if (keywords.length === 0 && standards.length === 0 && sources.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {keywords.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {keywordsLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw, idx) => (
              <Badge
                key={`${idx}-${kw}`}
                variant="secondary"
                className="text-[11px] font-normal"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {standards.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {standardsLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {standards.map((std, idx) => (
              <Badge
                key={`${idx}-${std}`}
                variant="outline"
                className="text-[11px] font-normal"
              >
                {std}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {sources.length > 0 ? (
        <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 md:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
            {sourcesLabel}
          </p>
          <ul className="space-y-1.5">
            {sources.map((src, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500" />
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 hover:decoration-blue-500"
                >
                  {src.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
