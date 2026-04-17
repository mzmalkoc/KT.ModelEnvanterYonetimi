"use client";

import { Languages } from "lucide-react";

import type { Language } from "@/types";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
  className?: string;
}

export function LanguageToggle({
  value,
  onChange,
  className,
}: LanguageToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Language toggle"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm",
        className,
      )}
    >
      <Languages
        aria-hidden="true"
        className="ml-2 h-3.5 w-3.5 text-slate-400"
      />
      {(["tr", "en"] as const).map((lang) => {
        const isActive = value === lang;
        return (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(lang)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
              isActive
                ? "bg-blue-600 text-white shadow"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
