"use client";

import Image from "next/image";
import { LogOut, User } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/types";
import { getStrings } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function Header({ language, onLanguageChange }: HeaderProps) {
  const t = getStrings(language);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-60 transition-opacity duration-200">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg shadow">
            <Image
              src="/logo.jpg"
              alt="Kuveyt Türk"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">
              {t.appTitle}
            </p>
            <p className="text-xs text-slate-500">{t.appSubtitle}</p>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <LanguageToggle value={language} onChange={onLanguageChange} />
          {user ? (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-slate-700">{user.displayName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="ml-1 h-6 w-6 rounded-full p-0 text-slate-400 hover:text-red-600"
                aria-label={language === "tr" ? "Çıkış Yap" : "Sign Out"}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
