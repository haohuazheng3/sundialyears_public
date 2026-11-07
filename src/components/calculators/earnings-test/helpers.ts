/**
 * Small, deterministic helpers shared by the earnings-test calculator (client) and its page (server).
 * Kept local to this folder so the shared lib files stay untouched.
 */
import { MONTHS } from "@/lib/format";
import { fromMonthIndex, monthIndex } from "@/lib/calc/dates";

/** "June 2030" for a month index (year*12 + month0). */
export function monthLabel(idx: number) {
  const { year, month } = fromMonthIndex(idx);
  return `${MONTHS[month - 1]} ${year}`;
}

/** "January–May" (months 1–12, same year); a single month when from === to. */
export function monthSpan(from: number, to: number) {
  if (from === to) return MONTHS[from - 1];
  return `${MONTHS[from - 1]}–${MONTHS[to - 1]}`;
}

/** [1, 2, 3, 4, 6] → "January–April and June". */
export function monthsList(months: number[]) {
  const runs: [number, number][] = [];
  for (const m of [...months].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else runs.push([m, m]);
  }
  const parts = runs.map(([a, b]) => monthSpan(a, b));
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * A rate written as SSA writes it: 5/9 (of 1%) instead of 0.5556. Finds the smallest denominator ≤ 100 that makes the
 * value whole; falls back to two decimals.
 */
export function fractionLabel(x: number) {
  for (let d = 1; d <= 100; d++) {
    const n = x * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return d === 1 ? String(Math.round(n)) : `${Math.round(n)}/${d}`;
  }
  return x.toFixed(2);
}

/** Age in months → "79 and 10 months". */
export function ageLabel(totalMonths: number) {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m ? `${y} and ${m} month${m === 1 ? "" : "s"}` : `${y}`;
}

/**
 * The worked example used as the calculator's starting point and quoted on the page (illustrative inputs, not
 * parameters): born June 15, 1963, collecting $1,600 a month since July 2025, earning $40,000 in 2027.
 */
export const EXAMPLE = {
  year: 2027 as const,
  dob: { year: 1963, month: 6, day: 15 },
  start: monthIndex(2025, 7),
  ben: 1600,
  earn: 40000,
};

type Codec<T> = { parse: (raw: string) => T | undefined; format: (v: T) => string };

/** URL codec for a calendar month stored as a month index: "2025-7" ⇄ 2025*12 + 6. */
export const monthCodec: Codec<number> = {
  parse: (r) => {
    const m = /^(\d{4})-(\d{1,2})$/.exec(r);
    if (!m) return undefined;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12 || year < 1900 || year > 2100) return undefined;
    return monthIndex(year, month);
  },
  format: (v) => {
    const { year, month } = fromMonthIndex(v);
    return `${year}-${month}`;
  },
};

/** URL codec for a set of months (1–12): "7.8.9" ⇄ [7, 8, 9]. */
export const monthsCodec: Codec<number[]> = {
  parse: (r) => {
    if (r === "") return [];
    const parts = r.split(".").map(Number);
    if (parts.some((n) => !Number.isInteger(n) || n < 1 || n > 12)) return undefined;
    return Array.from(new Set(parts)).sort((a, b) => a - b);
  },
  format: (v) => v.join("."),
};
