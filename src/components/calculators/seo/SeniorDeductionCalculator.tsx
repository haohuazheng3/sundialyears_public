"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { useUrlState } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { taxDelta } from "@/lib/calc/tax-more";
import { SENIOR_DEDUCTION } from "@/data/params/tax";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack } from "./kit";

const D = { ...HH_DEFAULTS, pen: 60000, ira: 45000 };

export function SeniorDeductionCalculator() {
  const { state: s, set } = useUrlState(D, HH_SCHEMA);
  const base = toHousehold(s, { applySeniorDeduction: false });
  const d = taxDelta(base, { applySeniorDeduction: true });
  const sd = d.after.senior;
  const P = SENIOR_DEDUCTION.value;
  const start = s.fs === "mfj" ? P.phaseoutStart.mfj : P.phaseoutStart.single;
  useResultTrack("calc_seniordeduct_result", JSON.stringify(s), { amount: Math.round(sd.total) });

  const inputs = <HouseholdFields s={s} set={set} />;

  const result = (
    <>
      <ResultHero label="Your senior deduction (2026)" value={money(sd.total)} tone="sage" sub={<>It lowers your federal tax by <strong>{money(-d.delta)}</strong>. {s.fs === "mfs" ? "Married filing separately can't claim it." : `The phase-out starts at ${money(start)} of MAGI.`}</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Maximum" value={money(P.perPerson * Math.min(s.age65, s.fs === "mfj" ? 2 : 1))} sub={`${money(P.perPerson)} per person 65+`} />
        <Stat label="Your MAGI" value={money(sd.magi)} />
        <Stat label="Lost to the phase-out" value={money(Math.max(0, P.perPerson * Math.min(s.age65, s.fs === "mfj" ? 2 : 1) - sd.total))} />
      </div>
      <div className="mt-5">
        <Callout tone="sky" title="It doesn't change how much Social Security is taxed">
          <p>The deduction comes off taxable income after the Social Security worksheet, so the share of benefits that&rsquo;s taxable stays the same. You get it whether you itemize or not.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          {money(P.perPerson)} for each person 65 or older by year-end, 2025 through 2028, minus 6% of MAGI over {money(P.phaseoutStart.single)} ({money(P.phaseoutStart.mfj)} on a joint return). Married couples must file jointly. Each spouse needs a valid Social Security number.
        </p>
      </ShowMath>
      <NextStep href="/retirement-tax-calculator" title="See your full 2026 tax bill" why="All income, both standard deductions and the senior deduction together." />
      <div className="mt-6">
        <ShareBar tool="seniordeduct" subject="My $6,000 senior deduction" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Senior deduction: ${money(sd.total)}`} />;
}
