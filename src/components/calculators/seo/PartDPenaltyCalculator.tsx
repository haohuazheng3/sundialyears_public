"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { partDPenalty } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack } from "./kit";

const D = { year: 2027, mu: 22, yrs: 20 };

export function PartDPenaltyCalculator() {
  const { state: s, set } = useUrlState(D, { year: num, mu: num, yrs: num });
  const year = (s.year === 2026 ? 2026 : 2027) as 2026 | 2027;
  const r = partDPenalty(year, s.mu);
  useResultTrack("calc_partdpen_result", `${year}|${s.mu}`, { months: r.months });

  const inputs = (
    <>
      <Segmented label="Premium year" value={year} onChange={(v) => set("year", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <NumberField label="Full months without creditable drug coverage" suffix="mo" value={s.mu} onChange={(v) => set("mu", v ?? 0)} min={0} max={600} hint="After your Initial Enrollment Period ended, in any stretch longer than 63 days." />
      <NumberField label="Years you expect to pay it" suffix="yrs" value={s.yrs} onChange={(v) => set("yrs", v ?? 0)} min={1} max={40} />
    </>
  );

  const result = (
    <>
      <ResultHero label={`Your Part D penalty (${year})`} value={`${money2(r.monthly)}/mo`} tone={r.monthly ? "ember" : "sage"} sub={<>{r.months}% of the {money2(r.base)} national base premium, rounded to the nearest 10 cents, added to your plan premium.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Per year" value={money(r.yearly)} />
        <Stat label={`Over ${s.yrs} years`} value={money(r.yearly * s.yrs)} sub="before the base premium rises" tone="ember" />
        <Stat label="Base premium" value={money2(r.base)} sub={String(year)} />
      </div>
      <div className="mt-5">
        <Callout tone="sage" title="Extra Help erases it">
          <p>If you qualify for Extra Help, the Part D late enrollment penalty is waived. You can also ask your plan for a reconsideration if you had creditable coverage you didn&rsquo;t report.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Penalty = 1% × national base beneficiary premium × uncovered months, rounded to the nearest $0.10. Because the base premium is reset every year, the dollar penalty is recalculated each January for life. A gap of 63 days or less doesn&rsquo;t count.
        </p>
      </ShowMath>
      <NextStep href="/extra-help-medicare-eligibility" title="Check whether Extra Help wipes this out" why="1-minute check with the 2026 income and resource limits." />
      <div className="mt-6">
        <ShareBar tool="partdpen" subject="My Medicare Part D penalty" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Part D penalty: ${money2(r.monthly)}/mo`} />;
}
