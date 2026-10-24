"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { retirementBenefit } from "@/lib/calc/ss-more";
import { MAX_BENEFIT_2027, SS_YEAR } from "@/data/params/social-security";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions, MiniTable } from "./kit";

const D = { pia: 2600, by: 1965 };
const M = MAX_BENEFIT_2027.value;

export function MaxBenefitCalculator() {
  const { state: s, set } = useUrlState(D, { pia: num, by: num });
  const mine = (a: number) => retirementBenefit(s.pia, s.by, a * 12).benefit;
  const rows: [string, number, number][] = [
    ["62", M.age62, mine(62)],
    ["65", M.age65, mine(65)],
    ["66", M.age66, mine(66)],
    ["67", M.age67, mine(67)],
    ["70", M.age70, mine(70)],
  ];
  useResultTrack("calc_maxben_result", `${s.pia}|${s.by}`, { share: s.pia / M.age67 });

  const inputs = (
    <>
      <NumberField label="Your benefit at full retirement age" prefix="$" value={s.pia} onChange={(v) => set("pia", v ?? 0)} min={0} max={MAX_INPUT} hint="From your Social Security statement." />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1955, 1980)} />
    </>
  );

  const result = (
    <>
      <ResultHero label="2027 maximum at 70" value={money(M.age70)} tone="sun" sub={<>Your record pays <strong>{money(mine(70))}</strong> at 70 — {pct(mine(70) / M.age70, 0)} of the maximum.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Maximum at 62" value={money(M.age62)} />
        <Stat label="Maximum at 67" value={money(M.age67)} />
        <Stat label="2027 taxable maximum" value={money(SS_YEAR[2027].value.taxableMax)} sub="earnings cap per year" />
      </div>
      <MiniTable head={["Claim at", "2027 maximum", "Your benefit", "Gap"]} rows={rows.map(([a, max, me]) => [`Age ${a}`, money(max), money(me), money(Math.max(0, max - me))])} hit={4} />
      <ShowMath>
        <p>
          SSA&rsquo;s maximums are for a worker who earned at least the taxable maximum every year from 22 and starts benefits in January 2027 at that age. Your figures use your own full-retirement-age benefit with the standard early-claiming cuts and delayed credits; birth years shift full retirement age, so the ages are not identical to SSA&rsquo;s examples.
        </p>
      </ShowMath>
      <NextStep href={`/how-social-security-is-calculated`} title="See why your number is what it is" why="Run the AIME and bend-point formula on your own earnings." />
      <div className="mt-6">
        <ShareBar tool="maxben" subject="Maximum Social Security benefit vs mine" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Max at 70: ${money(M.age70)}`} />;
}
