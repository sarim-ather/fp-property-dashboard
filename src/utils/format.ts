export function fmtAED(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `AED ${(value / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `AED ${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${e.toLocaleString('en', { month: 'short', year: 'numeric' })}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

export function fmtNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function signClass(value: number): string {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-red-700';
  return 'text-ink-500';
}

export function signPrefix(value: number): string {
  return value > 0 ? '+' : '';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
