"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, money2, pct } from "@/lib/format";
import { partBPenalty } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack, MiniTable } from "./kit";

const D = { year: 2027, ml: 30, yrs: 20 };

export function PartBPenaltyCalculator() {
  const { state: s, set } = useUrlState(D, { year: num, ml: num, yrs: num });
  const year = (s.year === 2026 ? 2026 : 2027) as 2026 | 2027;
  const r = partBPenalty(year, s.ml);
  useResultTrack("calc_partbpen_result", `${year}|${s.ml}`, { periods: r.periods });

  const inputs = (
    <>
      <Segmented label="Premium year" value={year} onChange={(v) => set("year", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <NumberField label="Months you went without Part B (after your window)" suffix="mo" value={s.ml} onChange={(v) => set("ml", v ?? 0)} min={0} max={600} hint="Count from the end of your Initial Enrollment Period to when Part B started. Months covered by a current employer's plan don't count." />
      <NumberField label="Years you expect to pay it" suffix="yrs" value={s.yrs} onChange={(v) => set("yrs", v ?? 0)} min={1} max={40} />
    </>
  );

  const result = (
    <>
      <ResultHero label={`Your Part B penalty (${year})`} value={`${money2(r.monthly)}/mo`} tone={r.periods ? "ember" : "sage"} sub={r.periods ? <>{pct(r.pct, 0)} added to the {money2(r.standard)} standard premium — {money2(r.total)} a month, for as long as you have Part B.</> : <>Fewer than 12 months late: no penalty, though coverage may still start later.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Full 12-month periods" value={String(r.periods)} />
        <Stat label="Per year" value={money(r.yearly)} />
        <Stat label={`Over ${s.yrs} years`} value={money(r.yearly * s.yrs)} sub="at today's premium" tone="ember" />
      </div>
      <MiniTable head={["Months late", "Penalty", "Monthly cost"]} rows={[12, 24, 36, 48, 60].map((m) => { const x = partBPenalty(year, m); return [String(m), pct(x.pct, 0), money2(x.monthly)]; })} />
      <div className="mt-5">
        <Callout tone="sage" title="No penalty if…">
          <p>You had group health coverage from your or your spouse&rsquo;s current job and sign up within 8 months of that job or coverage ending. COBRA and retiree plans don&rsquo;t count.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          The penalty is 10% of the standard Part B premium for each full 12 months you could have had Part B but didn&rsquo;t, rounded to the nearest 10 cents. It rises every year with the premium and lasts for life (if you&rsquo;re under 65 on disability, it ends at 65).
        </p>
      </ShowMath>
      <NextStep href="/when-can-i-sign-up-for-medicare" title="Avoid it: find your sign-up window" why="Your exact 7-month Initial Enrollment Period." />
      <div className="mt-6">
        <ShareBar tool="partbpen" subject="My Medicare Part B penalty" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Part B penalty: ${money2(r.monthly)}/mo`} />;
}
