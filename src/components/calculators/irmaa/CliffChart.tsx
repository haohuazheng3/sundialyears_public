/**
 * IRMAA cliff chart: the yearly surcharge as a step function of MAGI, with vertical cliffs at the exact bracket lines,
 * each step labelled with its yearly cost, and the reader's income marked. Every tier is drawn the same width (the axis
 * is labelled with the exact lines), because on a true dollar scale the $500,000 tier squeezes tiers 1–3 into slivers.
 *
 * Local to the IRMAA calculator because the shared LineChart picks x-axis ticks from the data points (which bunch up
 * at the bracket edges) and cannot label steps. Screen readers get a short tier table instead of the drawing.
 */
import { money } from "@/lib/format";
import { tierName, type Tier } from "@/lib/calc/irmaa";

export interface CliffPoint {
  x: number;
  y: number;
  tier: Tier;
}

const W = 720;
/** SVG text is sized in viewBox units, so phones (where the 720-unit chart shrinks to ~330px) get bigger units. */
const AXIS = "text-[28px] sm:text-[14px]";
const LABEL = "text-[25px] font-bold sm:text-[13px]";
const H = 300;
const PAD = { l: 76, r: 18, t: 50, b: 50 };

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * exp).find((v) => v >= raw) ?? 10 * exp;
}

const k = (n: number) => (Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}k`);
const kY = (n: number) => (n === 0 ? "$0" : n % 1000 === 0 ? k(n) : `$${(n / 1000).toFixed(1)}k`);

export function CliffChart({
  points,
  from,
  to,
  magi,
  lines,
  caption,
  rows,
}: {
  /** Output of surchargeSteps(): first and last whole dollar of each tier inside [from, to]. */
  points: CliffPoint[];
  from: number;
  to: number;
  magi: number;
  /** The bracket lines in increasing order (e.g. 109,000 … 500,000); the axis is evenly spaced between them. */
  lines: number[];
  caption: string;
  /** For screen readers: one row per tier. */
  rows: { tier: Tier; range: string; yearly: number }[];
}) {
  const yRaw = Math.max(...points.map((p) => p.y), 0);
  const yStep = niceStep(yRaw / 4);
  const yMax = yRaw <= 0 ? 1000 : Math.ceil(yRaw / yStep) * yStep;
  // Piecewise-linear x scale: [from, line1, …, lineN, to] are evenly spaced knots.
  const knots = [from, ...lines.filter((l) => l > from && l < to), to];
  const segW = (W - PAD.l - PAD.r) / Math.max(1, knots.length - 1);
  const sx = (x: number) => {
    const c = Math.min(to, Math.max(from, x));
    let j = 0;
    while (j < knots.length - 2 && c > knots[j + 1]) j++;
    return PAD.l + (j + (c - knots[j]) / Math.max(1, knots[j + 1] - knots[j])) * segW;
  };
  const sy = (y: number) => PAD.t + (1 - y / yMax) * (H - PAD.t - PAD.b);

  // Step path (value holds until the next point, then jumps).
  let d = "";
  points.forEach((p, i) => {
    if (i === 0) d += `M${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
    else d += ` L${sx(p.x).toFixed(1)},${sy(points[i - 1].y).toFixed(1)} L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
  });
  d += ` L${sx(to).toFixed(1)},${sy(points[points.length - 1]?.y ?? 0).toFixed(1)}`;

  // One segment per tier, for the labels.
  const segs: { tier: Tier; x0: number; x1: number; y: number }[] = [];
  for (const p of points) {
    const last = segs[segs.length - 1];
    if (last && last.tier === p.tier) last.x1 = p.x;
    else segs.push({ tier: p.tier, x0: p.x, x1: p.x, y: p.y });
  }
  if (segs.length) segs[segs.length - 1].x1 = to;

  const xTicks = knots.slice(1, -1);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 0.5; v += yRaw <= 0 ? yMax : yStep) yTicks.push(v);

  const mx = sx(Math.min(to, Math.max(from, magi)));
  const myY = segs.find((s) => magi >= s.x0 && magi <= s.x1)?.y ?? (magi < from ? 0 : (points[points.length - 1]?.y ?? 0));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" aria-hidden="true">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="var(--hairline-2)" strokeDasharray={v === 0 ? undefined : "3 5"} />
            <text x={PAD.l - 10} y={sy(v) + 6} textAnchor="end" className={AXIS} fill="var(--ink-3)">
              {kY(v)}
            </text>
          </g>
        ))}
        {xTicks.map((x) => (
          <g key={x}>
            <line x1={sx(x)} x2={sx(x)} y1={H - PAD.b} y2={H - PAD.b + 6} stroke="var(--ink-3)" />
            <text x={sx(x)} y={H - 10} textAnchor="middle" className={AXIS} fill="var(--ink-3)">
              {k(x)}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--sun)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {segs.map((s) => {
          const w = sx(s.x1) - sx(s.x0);
          if (w < 52) return null;
          return (
            <text key={s.tier} x={(sx(s.x0) + sx(s.x1)) / 2} y={sy(s.y) - 10} textAnchor="middle" className={LABEL} fill="var(--ink-2)">
              {s.y === 0 ? "$0" : money(s.y)}
            </text>
          );
        })}
        <line x1={mx} x2={mx} y1={PAD.t - 8} y2={H - PAD.b} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={mx} cy={sy(myY)} r="6" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x={Math.min(Math.max(mx, PAD.l + 30), W - PAD.r - 30)} y={PAD.t - 24} textAnchor="middle" className={LABEL} fill="var(--ink)">
          You: {k(magi)}
        </text>
      </svg>
      <figcaption className="mt-2 text-[0.9375rem] text-ink-2">
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1 w-6 rounded-full" style={{ background: "var(--sun)" }} />
            Yearly surcharge
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-0 border-l-2 border-dashed border-[var(--ink)]" />
            Your income
          </span>
        </span>
        <span className="mt-1 block text-ink-3">
          Each tier is drawn the same width so all of them are readable; the numbers under the axis are the exact lines.
        </span>
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Income range</th>
              <th scope="col">Yearly surcharge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tier}>
                <td>{tierName(r.tier)}</td>
                <td>{r.range}</td>
                <td>{money(r.yearly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
