/** Small, pure label helpers for the claiming calculator and its page (safe in server components). */
import { describeMonth } from "@/lib/calc/ss-core";
import { ageLabel } from "@/lib/calc/ss-claiming";
import type { YMD } from "@/lib/calc/dates";

/** 0.0055556 (5/9 of 1%) → "5/9 of 1%"; 0.0066667 → "2/3 of 1%"; falls back to a decimal percent. */
export function fractionOfOnePercent(rate: number): string {
  const x = rate * 100;
  for (let d = 1; d <= 48; d++) {
    const n = Math.round(x * d);
    if (n > 0 && Math.abs(n / d - x) < 1e-9) return d === 1 ? `${n}%` : `${n}/${d} of 1%`;
  }
  return `${x.toFixed(3)}%`;
}

/** 1.24 → "124%", 0.704166 → "70.4%". */
export const pctOfPia = (factor: number) => `${(Math.round(factor * 1000) / 10).toString()}%`;

/** "June 2032" */
export const monthName = (idx: number) => describeMonth(idx).label;

/** "Age 62 and 1 month" → used in headings. */
export const startAgeText = (ageMonths: number) => `age ${ageLabel(ageMonths)}`;

/** Y-M-D for the cross-calculator URL contract. */
export const dobParam = (d: YMD) => `${d.year}-${d.month}-${d.day}`;

/** "62", "66 and 10 months", "70" with an optional "(full retirement age)" suffix. */
export function optionLabel(ageMonths: number, fraTotal: number) {
  return ageMonths === fraTotal ? `${ageLabel(ageMonths)} (full retirement age)` : ageLabel(ageMonths);
}

/** Probability as a whole percent, never showing 0% or 100% for real (non-certain) odds. */
export function oddsText(p: number) {
  const v = Math.round(p * 100);
  if (p > 0 && v === 0) return "under 1%";
  if (p < 1 && v === 100) return "over 99%";
  return `${v}%`;
}
