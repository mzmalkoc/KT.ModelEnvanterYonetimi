"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Department, Language, LanguageMode, Priority } from "@/types";
import { getStrings } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface SimilarityFormProps {
  language: Language;
  name: string;
  purpose: string;
  mode: LanguageMode;
  department: string;
  departmentOther: string;
  priority: Priority;
  requesterEmail: string;
  loading: boolean;
  validationError: string | null;
  onChangeName: (value: string) => void;
  onChangePurpose: (value: string) => void;
  onChangeMode: (value: LanguageMode) => void;
  onChangeDepartment: (value: string) => void;
  onChangeDepartmentOther: (value: string) => void;
  onChangePriority: (value: Priority) => void;
  onChangeRequesterEmail: (value: string) => void;
  onSubmit: () => void;
}

export function SimilarityForm({
  language,
  name,
  purpose,
  mode,
  department,
  departmentOther,
  priority,
  requesterEmail,
  loading,
  validationError,
  onChangeName,
  onChangePurpose,
  onChangeMode,
  onChangeDepartment,
  onChangeDepartmentOther,
  onChangePriority,
  onChangeRequesterEmail,
  onSubmit,
}: SimilarityFormProps) {
  const t = getStrings(language);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/departments`)
      .then((r) => r.json())
      .then((data: Department[]) => setDepartments(data))
      .catch(() => setDepartments([]));
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{t.formHeading}</CardTitle>
        <CardDescription>{t.formSubheading}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requester-email">{t.fieldRequesterEmail}</Label>
              <Input
                id="requester-email"
                type="email"
                value={requesterEmail}
                disabled
                className="bg-slate-50 text-slate-600"
              />
              <p className="text-[10px] text-slate-400 italic">{t.fieldRequesterEmailHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t.fieldDepartment} <span className="text-red-500">*</span></Label>
              <Select
                value={department}
                onValueChange={onChangeDepartment}
              >
                <SelectTrigger id="department" aria-label={t.fieldDepartment}>
                  <SelectValue placeholder={t.fieldDepartmentPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {language === "tr" ? d.name_tr : d.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {department === "diger" ? (
                <Input
                  value={departmentOther}
                  onChange={(e) => onChangeDepartmentOther(e.target.value)}
                  placeholder={t.fieldDepartmentOther}
                  className="mt-2"
                  autoFocus
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-name">{t.fieldName} <span className="text-red-500">*</span></Label>
            <Input
              id="model-name"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder={t.fieldNamePlaceholder}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-purpose">{t.fieldPurpose} <span className="text-red-500">*</span></Label>
            <Textarea
              id="model-purpose"
              value={purpose}
              onChange={(e) => onChangePurpose(e.target.value)}
              placeholder={t.fieldPurposePlaceholder}
              rows={4}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">{t.fieldPriority}</Label>
              <Select
                value={priority}
                onValueChange={(v) => onChangePriority(v as Priority)}
              >
                <SelectTrigger id="priority" aria-label={t.fieldPriority}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.priorityLow}</SelectItem>
                  <SelectItem value="medium">{t.priorityMedium}</SelectItem>
                  <SelectItem value="high">{t.priorityHigh}</SelectItem>
                  <SelectItem value="critical">{t.priorityCritical}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-mode">{t.fieldLanguageMode}</Label>
              <Select
                value={mode}
                onValueChange={(v) => onChangeMode(v as LanguageMode)}
              >
                <SelectTrigger id="lang-mode" aria-label={t.fieldLanguageMode}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t.langAuto}</SelectItem>
                  <SelectItem value="tr">{t.langTr}</SelectItem>
                  <SelectItem value="en">{t.langEn}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {validationError ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {validationError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                {t.submit}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
