"use client";

import { BarChart } from "@/components/tool/Charts";

/** Percent axis/tooltip: 3.77 → "3.77%", 12.5 → "12.5%", 50 → "50%". */
const fmt = (n: number) => `${Number(n.toFixed(2))}%`;

/**
 * "% of the balance you must withdraw, by age" — a thin client wrapper so server pages can pass plain data
 * (functions can't cross the server/client boundary). `data.y` is a percentage (e.g. 3.77 for 3.77%).
 */
export function RmdAgeShareChart({ data, highlight, caption, height }: { data: { x: number; y: number }[]; highlight?: number; caption: string; height?: number }) {
  return <BarChart data={data} yFormat={fmt} highlight={highlight} caption={caption} height={height} />;
}
