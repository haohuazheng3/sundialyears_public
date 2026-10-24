"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { piaFromAverage, retirementBenefit } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions, MiniTable } from "./kit";

const D = { avg: 62000, yrs: 35, by: 1965 };

export function FormulaCalculator() {
  const { state: s, set } = useUrlState(D, { avg: num, yrs: num, by: num });
  const r = piaFromAverage(s.avg, s.yrs, s.by);
  const at62 = retirementBenefit(r.pia, s.by, 62 * 12).benefit;
  const at70 = retirementBenefit(r.pia, s.by, 70 * 12).benefit;
  useResultTrack("calc_formula_result", `${s.avg}|${s.yrs}|${s.by}`, { yrs: s.yrs });

  const inputs = (
    <>
      <NumberField label="Average yearly earnings, in today's dollars" prefix="$" value={s.avg} onChange={(v) => set("avg", v ?? 0)} min={0} max={MAX_INPUT} hint="Average of your best working years after indexing for wage growth — roughly your typical salary in today's money, capped at the taxable maximum each year." />
      <NumberField label="Years with earnings (up to 35 count)" suffix="yrs" value={s.yrs} onChange={(v) => set("yrs", v ?? 0)} min={0} max={50} hint="Fewer than 35 years means zeros are averaged in." />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1950, 1990)} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your full-retirement-age benefit (PIA)" value={money2(r.pia)} tone="sun" sub={<>Average indexed monthly earnings of <strong>{money(r.aime)}</strong> run through the {r.bendYear} formula.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="AIME" value={money(r.aime)} sub="total ÷ 420 months" />
        <Stat label="At 62" value={money(at62)} />
        <Stat label="At 70" value={money(at70)} tone="sage" />
      </div>
      <MiniTable
        head={["Step", "Formula", "Amount"]}
        rows={[
          ["1. Total indexed earnings", `${money(s.avg)} × ${Math.min(35, s.yrs)} years`, money(r.totalIndexed)],
          ["2. AIME", "÷ 420 months, rounded down", money(r.aime)],
          ["3. First bend", `90% of the first ${money(r.bend[0])}`, money2(r.parts[0].amount)],
          ["4. Second bend", `32% from ${money(r.bend[0])} to ${money(r.bend[1])}`, money2(r.parts[1].amount)],
          ["5. Above", `15% over ${money(r.bend[1])}`, money2(r.parts[2].amount)],
          ["PIA", "sum, rounded down to the dime", money2(r.pia)],
        ]}
        hit={5}
      />
      {r.usesLatestBend ? (
        <div className="mt-5">
          <Callout tone="sky" title="You turn 62 after 2027">
            <p>Your bend points aren&rsquo;t set yet, so the 2027 ones stand in. In real life both your earnings and the bend points rise with national wages, so the result in today&rsquo;s dollars is about right.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          SSA indexes each year&rsquo;s earnings to wage levels in the year you turn 60, keeps your highest 35 years, divides the total by 420 months to get the AIME, then applies 90%, 32% and 15% to the slices of AIME split at the bend points for the year you turn 62. Cost-of-living raises are added from 62 onward.
        </p>
      </ShowMath>
      <NextStep href={`/social-security-break-even-calculator?pia=${Math.round(r.pia)}`} title="Now pick a claiming age" why="See this benefit at every age from 62 to 70 and where each choice breaks even." />
      <div className="mt-6">
        <ShareBar tool="formula" subject="My Social Security formula" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`PIA: ${money2(r.pia)}/mo`} />;
}
