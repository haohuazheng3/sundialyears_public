"use client";

import { useId, useMemo, useRef, useState } from "react";

export interface Series {
  name: string;
  color: string; // CSS color or var(--x)
  points: { x: number; y: number }[];
  dashed?: boolean;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M` : Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

/**
 * Accessible multi-series line chart with a touch/hover crosshair.
 * Screen readers get the data as a table; the SVG itself is aria-hidden.
 */
export function LineChart({
  series,
  xLabel,
  yFormat = compact,
  xFormat = (x: number) => String(x),
  markers = [],
  height = 300,
  caption,
}: {
  series: Series[];
  xLabel: string;
  yFormat?: (n: number) => string;
  xFormat?: (n: number) => string;
  markers?: { x: number; label: string; color?: string }[];
  height?: number;
  caption: string;
}) {
  const id = useId();
  const W = 720;
  const H = height;
  const pad = { l: 64, r: 18, t: 16, b: 42 };
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const yMax = niceMax(Math.max(...ys, 0));
  const yMin = Math.min(0, ...ys);
  const sx = (x: number) => pad.l + ((x - x0) / Math.max(1e-9, x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - yMin) / Math.max(1e-9, yMax - yMin)) * (H - pad.t - pad.b);
  const ticks = 4;
  const [hoverX, setHoverX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allX = useMemo(() => Array.from(new Set(xs)).sort((a, b) => a - b), [xs]);
  const xTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(allX.length / 6));
    return allX.filter((_, i) => i % step === 0);
  }, [allX]);

  const onMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    let best = allX[0];
    for (const x of allX) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;
    setHoverX(best);
  };

  return (
    <figure className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        aria-hidden="true"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHoverX(null)}
      >
        {Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--hairline-2)" strokeDasharray={v === 0 ? undefined : "3 5"} />
            <text x={pad.l - 10} y={sy(v) + 5} textAnchor="end" fontSize="17" fill="var(--ink-3)">
              {yFormat(v)}
            </text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={x} x={sx(x)} y={H - 14} textAnchor="middle" fontSize="17" fill="var(--ink-3)">
            {xFormat(x)}
          </text>
        ))}
        {markers.map((m) => (
          <g key={`${m.x}-${m.label}`}>
            <line x1={sx(m.x)} x2={sx(m.x)} y1={pad.t} y2={H - pad.b} stroke={m.color ?? "var(--sun)"} strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={Math.min(sx(m.x) + 6, W - pad.r - 4)} y={pad.t + 14} fontSize="13" fontWeight="700" fill={m.color ?? "var(--sun-ink)"} textAnchor={sx(m.x) > W - 140 ? "end" : "start"}>
              {m.label}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.name}
            d={s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? "7 6" : undefined}
          />
        ))}
        {hoverX != null ? (
          <g>
            <line x1={sx(hoverX)} x2={sx(hoverX)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeWidth="1" />
            {series.map((s) => {
              const p = s.points.find((q) => q.x === hoverX);
              return p ? <circle key={s.name} cx={sx(p.x)} cy={sy(p.y)} r="5.5" fill="var(--card)" stroke={s.color} strokeWidth="3" /> : null;
            })}
          </g>
        ) : null}
      </svg>
      {hoverX != null ? (
        <div
          className="float-soft pointer-events-none absolute top-2 z-10 min-w-[12rem] p-3 text-[0.9375rem]"
          style={{ left: `clamp(0.5rem, calc(${(sx(hoverX) / W) * 100}% - 6rem), calc(100% - 13rem))` }}
        >
          <p className="font-bold text-ink">
            {xLabel} {xFormat(hoverX)}
          </p>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === hoverX);
            return p ? (
              <p key={s.name} className="num mt-1 flex items-center justify-between gap-3 text-ink-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-bold text-ink">{yFormat(p.y)}</span>
              </p>
            ) : null;
          })}
        </div>
      ) : null}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem] text-ink-2">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2">
            <span className="inline-block h-1 w-6 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="sr-only">{caption}</span>
      </figcaption>
      <div className="sr-only">
      <table aria-labelledby={`${id}-cap`}>
        <caption id={`${id}-cap`}>{caption}</caption>
        <thead>
          <tr>
            <th>{xLabel}</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allX.map((x) => (
            <tr key={x}>
              <td>{xFormat(x)}</td>
              {series.map((s) => (
                <td key={s.name}>{yFormat(s.points.find((p) => p.x === x)?.y ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

/** Simple vertical bars (e.g., RMD by year). Highlights one bar. */
export function BarChart({
  data,
  yFormat = compact,
  highlight,
  height = 260,
  caption,
  color = "var(--sun)",
}: {
  data: { x: number | string; y: number }[];
  yFormat?: (n: number) => string;
  highlight?: number | string;
  height?: number;
  caption: string;
  color?: string;
}) {
  const W = 720;
  const H = height;
  const pad = { l: 60, r: 10, t: 14, b: 38 };
  const yMax = niceMax(Math.max(...data.map((d) => d.y), 0));
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  const sy = (y: number) => pad.t + (1 - y / yMax) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.ceil(data.length / 7));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true" onPointerLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(yMax * f)} y2={sy(yMax * f)} stroke="var(--hairline-2)" strokeDasharray={f === 0 ? undefined : "3 5"} />
            <text x={pad.l - 8} y={sy(yMax * f) + 5} textAnchor="end" fontSize="16" fill="var(--ink-3)">
              {yFormat(yMax * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const isHi = d.x === highlight || hover === i;
          return (
            <g key={String(d.x)} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect
                x={pad.l + i * bw + bw * 0.16}
                y={sy(d.y)}
                width={bw * 0.68}
                height={Math.max(0, H - pad.b - sy(d.y))}
                rx={Math.min(6, bw * 0.2)}
                fill={isHi ? "var(--ink)" : color}
                opacity={isHi ? 1 : 0.85}
              />
              {i % step === 0 ? (
                <text x={pad.l + i * bw + bw / 2} y={H - 12} textAnchor="middle" fontSize="16" fill="var(--ink-3)">
                  {d.x}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover != null ? (
        <div className="float-soft pointer-events-none absolute top-1 z-10 p-2.5 text-[0.9375rem]" style={{ left: `clamp(0.5rem, calc(${((pad.l + hover * bw) / W) * 100}% - 4rem), calc(100% - 10rem))` }}>
          <span className="font-bold text-ink">{data[hover].x}</span>
          <span className="num ml-2 text-ink-2">{yFormat(data[hover].y)}</span>
        </div>
      ) : null}
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
