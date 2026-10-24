"use client";

import { LineChart } from "@/components/tool/Charts";
import type { TorpedoPoint } from "@/lib/calc/fed-tax";
import { money, pct } from "@/lib/format";
import { SS_INCLUSION } from "@/data/params/ss-tax-extra";

const k = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);
const pctAxis = (n: number) => `${Math.round(n * 10) / 10}%`;
/** Rates as percentages with one decimal, so the chart and the tooltip show 22.2% rather than 0.222. */
const asPct = (r: number) => Math.round(r * 1000) / 10;

/**
 * The "tax torpedo": the real federal rate on the next chunk of IRA withdrawals (finite difference from the engine)
 * against the statutory bracket, as withdrawals rise. Zones where Social Security is phasing into income are marked
 * with dashed lines and described in words underneath (the chart itself also ships a screen-reader table).
 */
export function TorpedoChart({
  points,
  zones,
  currentIra,
  delta,
}: {
  points: TorpedoPoint[];
  zones: { from: number; to: number; peak: number }[];
  currentIra: number;
  delta: number;
}) {
  if (points.length < 2) return null;
  const x0 = points[0].ira;
  const x1 = points[points.length - 1].ira;
  const span = Math.max(1, x1 - x0);
  const step = points[1].ira - points[0].ira;

  const markers: { x: number; label: string; color?: string }[] = [{ x: Math.min(Math.max(currentIra, x0), x1), label: "You", color: "var(--sun-ink)" }];
  for (const z of zones) {
    // Label the zone edges only when they don't collide with the "You" marker or each other.
    const candidates = [{ x: z.from, label: "Benefits start to be taxed" }];
    if (z.to < x1) candidates.push({ x: z.to + step, label: `${pct(SS_INCLUSION.value.maxFraction, 0)} cap reached` });
    for (const c of candidates) {
      if (markers.every((m) => Math.abs(m.x - c.x) / span > 0.16)) markers.push({ ...c, color: "var(--ember)" });
    }
  }

  const { tier1, tier2 } = SS_INCLUSION.value;
  const cents = (r: number) => `${Math.round(r * 100)}¢`;
  /** Which inclusion rates actually occur inside a zone (kink points in between are ignored). */
  const ratesIn = (z: { from: number; to: number }) => {
    const inZone = points.filter((p) => p.ira >= z.from && p.ira <= z.to);
    const has = (rate: number) => inZone.some((p) => Math.abs(p.ssPhaseIn - rate) < 0.001);
    const list = [tier1, tier2].filter(has);
    return list.length ? list.map(cents).join(" or ") : `up to ${cents(tier2)}`;
  };

  return (
    <div>
      <LineChart
        series={[
          { name: `Real tax rate on the next ${money(delta)}`, color: "var(--ember)", points: points.map((p) => ({ x: p.ira, y: asPct(p.marginal) })) },
          { name: "Your tax bracket", color: "var(--sky)", dashed: true, points: points.map((p) => ({ x: p.ira, y: asPct(p.bracket) })) },
        ]}
        xLabel="IRA withdrawals"
        xFormat={k}
        yFormat={pctAxis}
        markers={markers}
        caption={`Federal tax rate on the next ${money(delta)} of IRA withdrawals, from ${money(x0)} to ${money(x1)} of withdrawals, holding your other income fixed`}
      />
      <div className="mt-4 space-y-2 text-[1rem] leading-relaxed text-ink-2">
        {zones.length ? (
          zones.map((z) => (
            <p key={z.from}>
              From about <strong>{money(z.from)}</strong> to {z.to < x1 ? <strong>{money(z.to + step)}</strong> : <>beyond {money(x1)}</>} of IRA withdrawals, each extra dollar also makes {ratesIn(z)} of your Social
              Security taxable. That’s the torpedo zone: your real rate there peaks at <strong>{pct(z.peak, 1)}</strong>.
            </p>
          ))
        ) : (
          <p>
            With your other income, withdrawals between {money(x0)} and {money(x1)} never change how much of your Social Security is taxable, so there’s no torpedo
            zone here.
          </p>
        )}
        <p className="text-ink-3">
          Solid line: the tax you really pay on the next {money(delta)}, as a rate. Dashed line: your ordinary tax bracket. Wherever the solid line sits above the dashed
          one, Social Security (or the shrinking senior deduction, or capital gains being pushed into a higher band) is raising your real rate.
        </p>
      </div>
    </div>
  );
}
