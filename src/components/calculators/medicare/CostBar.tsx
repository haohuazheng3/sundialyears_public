import { money2 } from "@/lib/format";

export interface CostSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * One horizontal bar split into the pieces of the monthly bill. The bar is decorative (aria-hidden);
 * the legend underneath carries every label and dollar amount, so color is never the only signal.
 */
export function CostBar({ segments, caption }: { segments: CostSegment[]; caption: string }) {
  const segs = segments.filter((s) => s.value > 0.004);
  const total = segs.reduce((a, s) => a + s.value, 0);
  if (!segs.length || total <= 0) return null;
  return (
    <figure>
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-[var(--card-sunk)]" aria-hidden="true">
        {segs.map((s, i) => (
          <span
            key={s.label}
            className={i ? "border-l-2 border-[var(--card)]" : undefined}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.98rem] sm:grid-cols-2">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
            <span className="num font-bold text-ink">{money2(s.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
