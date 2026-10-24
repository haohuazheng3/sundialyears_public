"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { extraHelpCheck } from "@/lib/calc/medicare-more";
import { PART_D } from "@/data/params/medicare";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { cp: false, inc: 21000, res: 9000 };

export function ExtraHelpCalculator() {
  const { state: s, set } = useUrlState(D, { cp: bool, inc: num, res: num });
  const r = extraHelpCheck({ couple: s.cp, annualIncome: s.inc, resources: s.res });
  const d = PART_D[2026].value;
  const deductible = d.deductible;
  useResultTrack("calc_extrahelp_result", `${s.cp}|${s.inc}|${s.res}`, { eligible: r.eligible });

  const inputs = (
    <>
      <Segmented label="Household" value={s.cp ? "couple" : "one"} onChange={(v) => set("cp", v === "couple")} options={[{ value: "one", label: "Single" }, { value: "couple", label: "Married, living together" }]} />
      <NumberField label="Yearly income (before deductions)" prefix="$" value={s.inc} onChange={(v) => set("inc", v ?? 0)} min={0} max={MAX_INPUT} hint="Social Security, pensions, wages, interest — gross amounts." />
      <NumberField label="Savings and investments" prefix="$" value={s.res} onChange={(v) => set("res", v ?? 0)} min={0} max={MAX_INPUT} hint="Bank accounts, stocks, bonds, IRAs. Your home and one car don't count." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Extra Help (2026 limits)" value={r.eligible ? "Likely eligible" : "Over the limit"} tone={r.eligible ? "sage" : "ember"} sub={r.eligible ? <>Extra Help would cover your Part D plan premium (up to a benchmark plan) and the {money(deductible)} deductible, and cap your copays — and erase any late penalty.</> : <>{!r.incomeOk ? `Income is above ${money(r.incomeLimit)}. ` : ""}{!r.resourcesOk ? `Resources are above ${money(r.resourceLimit)}.` : ""}</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Income limit" value={money(r.incomeLimit)} sub={r.incomeOk ? "you're under it" : "you're over it"} tone={r.incomeOk ? "sage" : "ember"} />
        <Stat label="Resource limit" value={money(r.resourceLimit)} sub={r.resourcesOk ? "you're under it" : "you're over it"} tone={r.resourcesOk ? "sage" : "ember"} />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="Close to the line? Apply anyway">
          <p>SSA subtracts some income before comparing (for example $20 of most income and part of wages), so people a little over these figures often still qualify. Applying is free at ssa.gov/extrahelp.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          The 2026 limits Medicare.gov publishes are {money(r.incomeLimit)} of yearly income (150% of the federal poverty level) and {money(r.resourceLimit)} in resources for {s.cp ? "a married couple" : "one person"}. Medicaid, SSI and Medicare Savings Program enrollees get Extra Help automatically.
        </p>
      </ShowMath>
      <NextStep href="/medicare-savings-program-eligibility" title="Your state may also pay your Part B premium" why="Check QMB, SLMB and QI — they also qualify you for Extra Help." />
      <div className="mt-6">
        <ShareBar tool="extrahelp" subject="Extra Help eligibility" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.eligible ? "Extra Help: likely eligible" : "Extra Help: over the limit"} />;
}
