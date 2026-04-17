import type { Language } from "@/types";
import { getStrings } from "@/lib/i18n";

interface FooterProps {
  language: Language;
}

export function Footer({ language }: FooterProps) {
  const t = getStrings(language);
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
        <p>{t.footer}</p>
        <p className="font-mono">{t.version}</p>
      </div>
    </footer>
  );
}
