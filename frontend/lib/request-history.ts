import type { Priority, Recommendation } from "@/types";

export interface HistoryMatch {
  name_tr: string;
  name_en: string;
  category: string;
  score: number;
  risk_level: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  requesterEmail: string;
  requesterDisplayName: string;
  department: string;
  departmentDisplayName: string;
  modelName: string;
  modelPurpose: string;
  priority: Priority;
  topMatchName: string;
  topMatchScore: number;
  recommendation: Recommendation;
  matches: HistoryMatch[];
}

const STORAGE_KEY = "kt_ai_request_history";
const MAX_ENTRIES = 100;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): void {
  const history = getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  history.unshift(newEntry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function deleteEntry(id: string): void {
  const history = getHistory();
  const filtered = history.filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
