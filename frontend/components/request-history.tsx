"use client";

import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Clock, Filter, Loader2, RefreshCw, Trash2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { Language } from "@/types";
import { checkSimilarity } from "@/lib/api";
import { getStrings } from "@/lib/i18n";
import { deleteEntry, getHistory, type HistoryEntry } from "@/lib/request-history";

interface RequestHistoryProps {
  language: Language;
  refreshKey: number;
}

function recBadge(rec: string, lang: Language) {
  const cls = "text-[10px] inline-flex items-center justify-center min-w-[70px] text-center";
  switch (rec) {
    case "duplicate":
      return <Badge variant="destructive" className={cls}>{lang === "tr" ? "Mükerrer" : "Duplicate"}</Badge>;
    case "similar":
      return <Badge variant="warning" className={cls}>{lang === "tr" ? "Benzer" : "Similar"}</Badge>;
    default:
      return <Badge variant="success" className={cls}>{lang === "tr" ? "Yeni" : "New"}</Badge>;
  }
}

function priorityBadge(p: string, lang: Language) {
  const labels: Record<string, Record<string, string>> = {
    low: { tr: "Düşük", en: "Low" },
    medium: { tr: "Orta", en: "Medium" },
    high: { tr: "Yüksek", en: "High" },
    critical: { tr: "Acil", en: "Critical" },
  };
  const colors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${colors[p] ?? colors.medium}`}>
      {labels[p]?.[lang] ?? p}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ExpandedDetail({ entry, language }: { entry: HistoryEntry; language: Language }) {
  const matches = entry.matches ?? [];
  const [editName, setEditName] = useState(entry.modelName);
  const [editPurpose, setEditPurpose] = useState(entry.modelPurpose);
  const [checking, setChecking] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    type: "improved" | "worsened";
    oldScore: number;
    newScore: number;
    newMatches: Array<{ name_tr: string; name_en: string; category: string; score: number; risk_level: string }>;
    newRecommendation: string;
    message: string;
  } | null>(null);

  function handleNameChange(val: string) {
    setEditName(val);
    setHasChanged(val !== entry.modelName || editPurpose !== entry.modelPurpose);
    setHasChecked(false);
    setCheckResult(null);
  }
  function handlePurposeChange(val: string) {
    setEditPurpose(val);
    setHasChanged(editName !== entry.modelName || val !== entry.modelPurpose);
    setHasChecked(false);
    setCheckResult(null);
  }

  async function handleCheck() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await checkSimilarity({
        name: editName.trim(),
        purpose: editPurpose.trim(),
        language: "auto",
        department: entry.department,
        priority: entry.priority,
        requester_email: entry.requesterEmail,
      });
      const newTopScore = res.matches[0]?.similarity_score ?? 0;
      const oldTopScore = entry.topMatchScore;
      const newMatches = res.matches.slice(0, 5).map((m) => ({
        name_tr: m.model.name_tr,
        name_en: m.model.name_en,
        category: m.model.category,
        score: m.similarity_score,
        risk_level: m.risk_level,
      }));

      setCheckResult({
        type: newTopScore >= oldTopScore ? "improved" : "worsened",
        oldScore: oldTopScore,
        newScore: newTopScore,
        newMatches,
        newRecommendation: res.recommendation,
        message: newTopScore >= oldTopScore
          ? (language === "tr"
            ? `Skor: ${oldTopScore.toFixed(3)} → ${newTopScore.toFixed(3)} (+${((newTopScore - oldTopScore) * 100).toFixed(1)}%)`
            : `Score: ${oldTopScore.toFixed(3)} → ${newTopScore.toFixed(3)} (+${((newTopScore - oldTopScore) * 100).toFixed(1)}%)`)
          : (language === "tr"
            ? `Modelin hedefi tespit etmesi zorlaşmaktadır (${oldTopScore.toFixed(3)} → ${newTopScore.toFixed(3)}). Yine de güncelleyebilirsiniz.`
            : `Model objective makes detection harder (${oldTopScore.toFixed(3)} → ${newTopScore.toFixed(3)}). You can still update.`),
      });
      setHasChecked(true);
    } catch {
      setCheckResult({
        type: "worsened",
        oldScore: 0,
        newScore: 0,
        newMatches: [],
        newRecommendation: "new",
        message: language === "tr" ? "Kontrol sırasında hata oluştu." : "Error during check.",
      });
    } finally {
      setChecking(false);
    }
  }

  function handleApplyUpdate() {
    if (!checkResult) return;
    const allHistory = getHistory();
    const idx = allHistory.findIndex((h) => h.id === entry.id);
    if (idx >= 0) {
      allHistory[idx].modelName = editName.trim();
      allHistory[idx].modelPurpose = editPurpose.trim();
      allHistory[idx].topMatchScore = checkResult.newScore;
      allHistory[idx].topMatchName = checkResult.newMatches[0]?.name_tr ?? "";
      allHistory[idx].recommendation = checkResult.newRecommendation as "duplicate" | "similar" | "new";
      allHistory[idx].matches = checkResult.newMatches;
      localStorage.setItem("kt_ai_request_history", JSON.stringify(allHistory));
    }
    setHasChanged(false);
    setHasChecked(false);
    setCheckResult(null);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {matches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {language === "tr" ? "Eşleşen Modeller" : "Matching Models"}
          </p>
          <div className="rounded-md border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-3 py-2 font-medium text-slate-500">#</th>
                  <th className="px-3 py-2 font-medium text-slate-500">{language === "tr" ? "Model" : "Model"}</th>
                  <th className="px-3 py-2 font-medium text-slate-500">{language === "tr" ? "Kategori" : "Category"}</th>
                  <th className="px-3 py-2 font-medium text-slate-500">{language === "tr" ? "Skor" : "Score"}</th>
                  <th className="px-3 py-2 font-medium text-slate-500">{language === "tr" ? "Risk" : "Risk"}</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {language === "tr" ? m.name_tr : m.name_en}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{m.category}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold">
                      <span className={m.score >= 0.75 ? "text-red-600" : m.score >= 0.55 ? "text-yellow-600" : "text-green-600"}>
                        {m.score.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {m.risk_level === "high"
                        ? <Badge variant="destructive" className="text-[10px]">{language === "tr" ? "Yüksek" : "High"}</Badge>
                        : m.risk_level === "medium"
                        ? <Badge variant="warning" className="text-[10px]">{language === "tr" ? "Orta" : "Medium"}</Badge>
                        : <Badge variant="success" className="text-[10px]">{language === "tr" ? "Düşük" : "Low"}</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {entry.recommendation === "duplicate" ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {language === "tr" ? "Talep Bilgileri" : "Request Details"}
          </p>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-slate-500 min-w-[100px]">{language === "tr" ? "Model Adı:" : "Model Name:"}</span>
            <span className="text-xs text-slate-800 font-semibold">{entry.modelName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-slate-500 min-w-[100px]">{language === "tr" ? "Modelin Hedefi:" : "Model Objective:"}</span>
            <span className="text-xs text-slate-700">{entry.modelPurpose || "—"}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {language === "tr" ? "Model Bilgilerini Düzenle" : "Edit Model Details"}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">
                {language === "tr" ? "Model Adı" : "Model Name"}
              </label>
              <Input
                value={editName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-medium text-slate-600">
                {language === "tr" ? "Modelin Hedefi" : "Model Objective"}
              </label>
              <Textarea
                value={editPurpose}
                onChange={(e) => handlePurposeChange(e.target.value)}
                className="text-xs bg-white"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheck}
              disabled={checking || !hasChanged || !editName.trim()}
              className="text-xs"
            >
              {checking ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" />{language === "tr" ? "Kontrol ediliyor..." : "Checking..."}</>
              ) : (
                <><RefreshCw className="mr-1 h-3 w-3" />{language === "tr" ? "Kontrol Et" : "Check"}</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleApplyUpdate}
              disabled={!hasChecked}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              {language === "tr" ? "Güncelle" : "Update"}
            </Button>
          </div>

          {checkResult ? (
            <Alert variant={checkResult.type === "improved" ? "success" : "warning"} className="mt-2">
              {checkResult.type === "improved" ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="text-xs">
                {checkResult.message}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function RequestHistory({ language, refreshKey }: RequestHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [recFilter, setRecFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = getStrings(language);

  useEffect(() => {
    setHistory(getHistory());
  }, [refreshKey]);

  const deptMap = new Map<string, string>();
  history.forEach((h) => {
    if (h.department) deptMap.set(h.department, h.departmentDisplayName || h.department);
  });

  const filtered = history.filter((h) => {
    if (deptFilter !== "all" && h.department !== deptFilter) return false;
    if (recFilter !== "all" && h.recommendation !== recFilter) return false;
    return true;
  });

  function handleDelete(id: string) {
    deleteEntry(id);
    setHistory(getHistory());
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {language === "tr" ? "Talep Geçmişi" : "Request History"}
        </h2>
        <p className="text-sm text-slate-500">
          {language === "tr"
            ? "Bu oturumda yapılan tüm model talepleri ve sonuçları."
            : "All model requests and results from this session."}
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {language === "tr"
                ? "Henüz talep geçmişi yok. Yeni Model Talebi sekmesinden bir talep oluşturun."
                : "No request history yet. Create a request from the New Model Request tab."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder={language === "tr" ? "Tüm Birimler" : "All Departments"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "tr" ? "Tüm Birimler" : "All Departments"}</SelectItem>
                  {Array.from(deptMap.entries()).map(([id, displayName]) => (
                    <SelectItem key={id} value={id}>{displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={recFilter} onValueChange={setRecFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder={language === "tr" ? "Tüm Sonuçlar" : "All Results"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "tr" ? "Tüm Sonuçlar" : "All Results"}</SelectItem>
                  <SelectItem value="duplicate">{language === "tr" ? "Mükerrer" : "Duplicate"}</SelectItem>
                  <SelectItem value="similar">{language === "tr" ? "Benzer" : "Similar"}</SelectItem>
                  <SelectItem value="new">{language === "tr" ? "Yeni" : "New"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <span className="text-xs text-slate-400">
                {filtered.length} / {history.length} {language === "tr" ? "kayıt" : "records"}
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[32px]" />
                      <TableHead className="text-xs">{language === "tr" ? "Tarih" : "Date"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Talep Eden" : "Requester"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Birim" : "Department"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Model Talebi" : "Model Request"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Öncelik" : "Priority"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "En Yakın Model" : "Top Match"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Skor" : "Score"}</TableHead>
                      <TableHead className="text-xs">{language === "tr" ? "Sonuç" : "Result"}</TableHead>
                      <TableHead className="w-[32px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((h) => {
                      const isExpanded = expandedId === h.id;
                      const matches = h.matches ?? [];
                      return (
                        <Fragment key={h.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedId(isExpanded ? null : h.id)}
                            aria-expanded={isExpanded}
                          >
                            <TableCell className="px-1">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(h.timestamp)}</TableCell>
                            <TableCell className="text-xs font-medium">{h.requesterDisplayName || h.requesterEmail.split("@")[0]}</TableCell>
                            <TableCell className="text-xs">{h.departmentDisplayName || h.department || "—"}</TableCell>
                            <TableCell className="text-xs font-medium max-w-[200px] truncate">{h.modelName}</TableCell>
                            <TableCell>{priorityBadge(h.priority, language)}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{h.topMatchName || "—"}</TableCell>
                            <TableCell className="text-xs font-mono">{h.topMatchScore > 0 ? h.topMatchScore.toFixed(3) : "—"}</TableCell>
                            <TableCell>{recBadge(h.recommendation, language)}</TableCell>
                            <TableCell className="px-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = language === "tr"
                                    ? "Bu talebi silmek istediğinizden emin misiniz?"
                                    : "Are you sure you want to delete this request?";
                                  if (window.confirm(msg)) handleDelete(h.id);
                                }}
                                className="rounded p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                aria-label={language === "tr" ? "Sil" : "Delete"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                              <TableCell colSpan={10} className="p-4">
                                <ExpandedDetail entry={h} language={language} />
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
      )}
    </div>
  );
}
