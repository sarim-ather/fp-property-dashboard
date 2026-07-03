import type { AppData } from '../types';

const STORAGE_KEY = 'fp_event_dashboard_v1';

export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('localStorage write failed');
  }
}

export function loadFromStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function exportJSON(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fp-events-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

export interface CSVCostRow {
  phase: string;
  category: string;
  description: string;
  amount: string;
  isActual: string;
  date: string;
}

export function parseCSVCosts(file: File): Promise<CSVCostRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const lines = (e.target?.result as string).split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ''])) as unknown as CSVCostRow;
        });
        resolve(rows);
      } catch {
        reject(new Error('CSV parse error'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}
