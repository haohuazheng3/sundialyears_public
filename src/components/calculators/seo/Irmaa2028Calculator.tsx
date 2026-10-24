"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { irmaa2028Projection, tierFor } from "@/lib/calc/medicare-more";
import { TR_ECON } from "@/data/params/social-security";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { fs: "mfj" as "single" | "mfj", magi: 230000, inf: TR_ECON.value.cpiUltimate };

export function Irmaa2028Calculator() {
  const { state: s, set } = useUrlState(D, { fs: str(["single", "mfj"] as const), magi: num, inf: num });
  const p = irmaa2028Projection(s.inf);
  const bounds = s.fs === "mfj" ? p.joint : p.individual;
  const tier = tierFor(s.magi, bounds);
  const headroom = tier < 5 ? bounds[tier] - s.magi : 0;
  const lo = irmaa2028Projection(Math.max(0, s.inf - 1));
  const hi = irmaa2028Projection(s.inf + 1);
  useResultTrack("calc_irmaa2028_result", `${s.fs}|${s.magi}|${s.inf}`, { tier });

  const rangeRow = (k: number) => {
    const b = bounds;
    if (k === 0) return `${money(b[0])} or less`;
    if (k === 5) return `${money(b[4])} or more`;
    return `${money(b[k - 1] + 1)} – ${k === 4 ? money(b[4] - 1) : money(b[k])}`;
  };

  const inputs = (
    <>
      <Segmented label="2026 tax return filed as" value={s.fs} onChange={(v) => set("fs", v)} size="lg" options={[{ value: "single", label: "Single" }, { value: "mfj", label: "Married jointly" }]} />
      <NumberField label="Expected 2026 MAGI" prefix="$" value={s.magi} onChange={(v) => set("magi", v ?? 0)} min={0} max={MAX_INPUT} hint="AGI plus tax-exempt interest from your 2026 return (filed in 2027)." />
      <NumberField label="Inflation assumed for Sep 2026 – Aug 2027" suffix="%" decimals={1} value={s.inf} onChange={(v) => set("inf", v ?? 0)} min={-2} max={10} hint="Default: the Social Security Trustees' long-run CPI assumption." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Projected 2028 IRMAA tier" value={tier === 0 ? "No IRMAA" : `Tier ${tier}`} tone={tier === 0 ? "sage" : "ember"} sub={tier < 5 ? <>{money(headroom)} of room before the {tier === 0 ? "first" : "next"} projected threshold of {money(bounds[tier])}{tier === 4 ? "" : ""}.</> : <>At the top tier, which starts at {money(bounds[4])}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="First threshold" value={money(bounds[0])} sub={`at ${s.inf}% inflation`} />
        <Stat label="If inflation is 1 pt lower" value={money((s.fs === "mfj" ? lo.joint : lo.individual)[0])} />
        <Stat label="If 1 pt higher" value={money((s.fs === "mfj" ? hi.joint : hi.individual)[0])} />
      </div>
      <MiniTable head={["Tier", `2026 MAGI (${s.fs === "mfj" ? "joint" : "single"})`, "Premium share"]} rows={[0, 1, 2, 3, 4, 5].map((k) => [k === 0 ? "Standard" : `Tier ${k}`, rangeRow(k), k === 0 ? "25%" : `${p.pct[k]}%`])} hit={tier} />
      <div className="mt-5">
        <Callout tone="sun" title="Projected, not official">
          <p>CMS sets 2028 thresholds in late 2027 from actual inflation. The math below is the same formula CMS uses, with the one input that isn&rsquo;t known yet replaced by an assumption you can change.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Each threshold = statutory base × (average CPI-U, Sep 2026–Aug 2027 ÷ average Sep 2017–Aug 2018), rounded to the nearest $1,000; joint thresholds are double. The Sep 2026–Aug 2027 average is projected from the latest 12-month average at {s.inf}% inflation. The top threshold ($500,000 single, $750,000 joint) begins inflation indexing in 2029. Premium shares are the share of Part B program cost each tier pays.
        </p>
      </ShowMath>
      <NextStep href="/roth-conversion-calculator" title="Planning a Roth conversion in 2026?" why="It lands on this 2028 bill — see how much fits under the line." />
      <div className="mt-6">
        <ShareBar tool="irmaa2028" subject="My projected 2028 IRMAA tier" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`2028: ${tier === 0 ? "No IRMAA" : `Tier ${tier}`}`} />;
}
