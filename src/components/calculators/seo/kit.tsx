"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { MONTHS } from "@/lib/format";

export const MAX_INPUT = 1e9;

/** Fire one analytics event per settled result (debounced), keyed so identical results don't re-fire. */
export function useResultTrack(event: string, key: string, payload: Record<string, unknown>) {
  const last = useRef("");
  const json = JSON.stringify(payload);
  useEffect(() => {
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track(event, JSON.parse(json) as Record<string, unknown>);
    }, 1200);
    return () => clearTimeout(t);
  }, [event, key, json]);
}

/** "Next step" link under a result — the reason to keep going, not just a link. */
export function NextStep({ href, title, why }: { href: string; title: string; why: string }) {
  return (
    <Link href={href} className="float-soft float-lift group mt-6 flex items-center justify-between gap-4 p-4">
      <span>
        <span className="block text-[0.9rem] font-semibold text-ink-3">Next step</span>
        <span className="mt-0.5 block font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.95rem] leading-snug text-ink-2">{why}</span>
      </span>
      <Icon name="arrow" size={20} className="shrink-0 text-sun-ink transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** Small responsive table for result breakdowns. */
export function MiniTable({ head, rows, hit }: { head: React.ReactNode[]; rows: React.ReactNode[][]; hit?: number }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl">
      <table className="table-sy text-[1rem]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === hit ? "is-hit" : undefined}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "strong" : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const monthLabel = (idx: number) => `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;
export const ageLabelMonths = (m: number) => (m % 12 ? `${Math.floor(m / 12)} and ${m % 12} mo` : `${Math.floor(m / 12)}`);

/** Whole-year claiming ages 62–70 (or 60–FRA for survivors) as select options, in months. */
export const ageOptions = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ value: (from + i) * 12, label: `Age ${from + i}` }));

export const yearOptions = (from: number, to: number, desc = true) => {
  const out: { value: number; label: string }[] = [];
  for (let y = from; y <= to; y++) out.push({ value: y, label: String(y) });
  return desc ? out.reverse() : out;
};

export const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: i + 1, label: m }));
