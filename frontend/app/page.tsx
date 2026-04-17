"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Clock, Database, HeartPulse } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { InventoryTable } from "@/components/inventory-table";
import { LoginScreen } from "@/components/login-screen";
import { QualityDashboard } from "@/components/quality-dashboard";
import { RequestHistory } from "@/components/request-history";
import { ResultsPanel } from "@/components/results-panel";
import { SimilarityForm } from "@/components/similarity-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { checkSimilarity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getStrings } from "@/lib/i18n";
import { addToHistory, getHistory } from "@/lib/request-history";
import type {
  Department,
  Language,
  LanguageMode,
  Priority,
  SimilarityResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function HomePage() {
  const { user, login, loading: authLoading } = useAuth();
  const [language, setLanguage] = useState<Language>("tr");

  // Form state
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [mode, setMode] = useState<LanguageMode>("auto");
  const [department, setDepartment] = useState("");
  const [departmentOther, setDepartmentOther] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<SimilarityResponse | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const t = getStrings(language);

  useEffect(() => {
    fetch(`${API_BASE}/api/departments`)
      .then((r) => r.json())
      .then((data: Department[]) => setDepartments(data))
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setError(null);

    if (!name.trim() || !purpose.trim() || !department) {
      setValidationError(
        language === "tr"
          ? "Talep eden birim, model adı ve modelin amacı zorunludur."
          : "Department, model name and model purpose are required."
      );
      return;
    }

    const deptObj = departments.find((d) => d.id === department);
    const deptDisplayName = department === "diger"
      ? departmentOther.trim()
      : (language === "tr" ? deptObj?.name_tr : deptObj?.name_en) ?? department;

    setLoading(true);
    try {
      const res = await checkSimilarity({
        name: name.trim(),
        purpose: purpose.trim(),
        language: mode,
        department: deptDisplayName,
        priority,
        requester_email: user?.email ?? "",
      });
      setResult(res);

      const topMatch = res.matches[0];
      addToHistory({
        requesterEmail: user?.email ?? "",
        requesterDisplayName: user?.displayName ?? "",
        department: deptDisplayName,
        departmentDisplayName: deptDisplayName,
        modelName: name.trim(),
        modelPurpose: purpose.trim(),
        priority,
        topMatchName: topMatch?.model?.name_tr ?? "",
        topMatchScore: topMatch?.similarity_score ?? 0,
        recommendation: res.recommendation,
        matches: res.matches.slice(0, 5).map((m) => ({
          name_tr: m.model.name_tr,
          name_en: m.model.name_en,
          category: m.model.category,
          score: m.similarity_score,
          risk_level: m.risk_level,
        })),
      });
      setHistoryKey((k) => k + 1);
      setName("");
      setPurpose("");
      setDepartment("");
      setDepartmentOther("");
      setPriority("medium");
      setToast(language === "tr" ? "Talep başarıyla kaydedildi." : "Request saved successfully.");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [name, purpose, mode, department, departmentOther, priority, user, t.validationMissing]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen language={language} onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header language={language} onLanguageChange={setLanguage} />

      <main className="container flex-1 py-8">
        <Tabs defaultValue="request" className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 bg-slate-100 p-1 sm:inline-flex sm:h-10 sm:w-auto sm:grid-cols-4">
            <TabsTrigger value="request" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>{t.tabRequest}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              <span>{language === "tr" ? "Talep Geçmişi" : "Request History"}</span>
              {getHistory().length > 0 ? (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                  {getHistory().length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Database className="h-4 w-4" />
              <span>{t.tabInventory}</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="h-4 w-4" />
              <span>{t.tabHealth}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <div className="grid gap-6 lg:grid-cols-2">
              <SimilarityForm
                language={language}
                name={name}
                purpose={purpose}
                mode={mode}
                department={department}
                departmentOther={departmentOther}
                priority={priority}
                requesterEmail={user.email}
                loading={loading}
                validationError={validationError}
                onChangeName={setName}
                onChangePurpose={setPurpose}
                onChangeMode={setMode}
                onChangeDepartment={setDepartment}
                onChangeDepartmentOther={setDepartmentOther}
                onChangePriority={setPriority}
                onChangeRequesterEmail={() => {}}
                onSubmit={handleSubmit}
              />
              <ResultsPanel
                language={language}
                loading={loading}
                error={error}
                result={result}
              />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <RequestHistory language={language} refreshKey={historyKey} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryTable globalLanguage={language} />
          </TabsContent>

          <TabsContent value="health">
            <QualityDashboard language={language} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer language={language} />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-green-700">✓ {toast}</p>
        </div>
      ) : null}
    </div>
  );
}
