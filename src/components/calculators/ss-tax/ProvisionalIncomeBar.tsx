import { money, pct } from "@/lib/format";

const ZONE_COLORS = {
  none: "color-mix(in srgb, var(--sage) 38%, transparent)",
  fifty: "color-mix(in srgb, var(--sun) 48%, transparent)",
  eightyFive: "color-mix(in srgb, var(--ember) 42%, transparent)",
} as const;

type ZoneKey = keyof typeof ZONE_COLORS;

/** Round a scale maximum up to a friendly number ($10k steps, $25k above $100k). */
function niceCeil(v: number) {
  const step = v > 100000 ? 25000 : 10000;
  return Math.max(step, Math.ceil(v / step) * step);
}

const k = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : money(n));

/**
 * Provisional income against the IRC §86 base and adjusted base amounts, as one horizontal bar.
 * The bar is decorative (aria-hidden); the list underneath names every zone, its dollar range and which one you are in,
 * so color is never the only signal.
 */
export function ProvisionalIncomeBar({
  provisionalIncome,
  base,
  adjustedBase,
  tier1,
  tier2,
}: {
  provisionalIncome: number;
  base: number;
  adjustedBase: number;
  /** 0.5 — first inclusion rate (from SS_INCLUSION). */
  tier1: number;
  /** 0.85 — second inclusion rate / cap (from SS_INCLUSION). */
  tier2: number;
}) {
  const pi = Math.max(0, provisionalIncome);
  const max = niceCeil(Math.max(adjustedBase * 1.5, pi * 1.15, 1));
  const at = (x: number) => Math.min(100, Math.max(0, (x / max) * 100));
  const zeroBase = adjustedBase <= 0;

  const zones: { key: ZoneKey; from: number; to: number; label: string; range: string }[] = zeroBase
    ? [{ key: "eightyFive", from: 0, to: max, label: `Up to ${pct(tier2, 0)} taxable`, range: "from the first dollar (married filing separately, lived together)" }]
    : [
        { key: "none", from: 0, to: base, label: "None taxable", range: `up to ${money(base)}` },
        { key: "fifty", from: base, to: adjustedBase, label: `Up to ${pct(tier1, 0)} taxable`, range: `${money(base)} to ${money(adjustedBase)}` },
        { key: "eightyFive", from: adjustedBase, to: max, label: `Up to ${pct(tier2, 0)} taxable`, range: `over ${money(adjustedBase)}` },
      ];
  const mine: ZoneKey = zeroBase ? (pi > 0 ? "eightyFive" : "none") : pi <= base ? "none" : pi <= adjustedBase ? "fifty" : "eightyFive";
  const youAt = at(pi);
  // Threshold tick labels collide with "$0" and with each other once the scale is stretched by a very large income;
  // the list below names every range in words, so drop the ticks rather than overprint them.
  const showTicks = !zeroBase && at(base) >= 9 && at(adjustedBase) - at(base) >= 9 && at(adjustedBase) <= 88;
  const labelShift = youAt < 14 ? "0%" : youAt > 86 ? "-100%" : "-50%";

  return (
    <figure className="mt-7">
      <figcaption className="text-[1.0625rem] font-bold text-ink">Your provisional income vs. the IRS thresholds</figcaption>
      <div className="relative mt-10" aria-hidden="true">
        <span
          className="num absolute -top-8 whitespace-nowrap rounded-full bg-[var(--ink)] px-2.5 py-0.5 text-[0.875rem] font-bold text-[var(--card)]"
          style={{ left: `${youAt}%`, transform: `translateX(${labelShift})` }}
        >
          You: {money(pi)}
        </span>
        <div className="flex h-7 w-full overflow-hidden rounded-full bg-[var(--card-sunk)]">
          {zones.map((z, i) => (
            <span
              key={z.key}
              className={i ? "border-l-2 border-[var(--card)]" : undefined}
              style={{ width: `${at(z.to) - at(z.from)}%`, background: ZONE_COLORS[z.key] }}
            />
          ))}
        </div>
        <span className="absolute -top-1.5 h-10 w-[3px] rounded-full bg-[var(--ink)]" style={{ left: `calc(${youAt}% - 1.5px)` }} />
        <div className="num relative mt-1.5 h-6 text-[0.875rem] text-ink-3">
          <span className="absolute left-0">$0</span>
          {showTicks ? (
            <>
              <span className="absolute -translate-x-1/2" style={{ left: `${at(base)}%` }}>
                {k(base)}
              </span>
              <span className="absolute -translate-x-1/2" style={{ left: `${at(adjustedBase)}%` }}>
                {k(adjustedBase)}
              </span>
            </>
          ) : null}
          <span className="absolute right-0">{k(max)}</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-[0.98rem]">
        {zones.map((z) => (
          <li key={z.key} className={`flex items-center gap-2.5 ${z.key === mine ? "font-bold text-ink" : "text-ink-2"}`}>
            <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: ZONE_COLORS[z.key] }} aria-hidden="true" />
            <span>
              {z.label}: provisional income {z.range}
              {z.key === mine ? <span className="ml-1.5 text-sun-ink">← you are here</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {zeroBase && pi <= 0 ? <p className="mt-1.5 text-[0.98rem] font-bold text-ink">Your provisional income is {money(pi)}, so none of your benefits is taxable.</p> : null}
    </figure>
  );
}
