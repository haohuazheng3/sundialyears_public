"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { mspCheck } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { cp: false, inc: 1500, res: 6000 };
const PAYS: Record<string, string> = {
  QMB: "Part A and B premiums, deductibles, coinsurance and copays",
  SLMB: "your Part B premium",
  QI: "your Part B premium (first come, first served; reapply each year)",
};

export function MspCalculator() {
  const { state: s, set } = useUrlState(D, { cp: bool, inc: num, res: num });
  const r = mspCheck({ couple: s.cp, monthlyIncome: s.inc, resources: s.res });
  useResultTrack("calc_msp_result", `${s.cp}|${s.inc}|${s.res}`, { program: r.program });

  const inputs = (
    <>
      <Segmented label="Household" value={s.cp ? "couple" : "one"} onChange={(v) => set("cp", v === "couple")} options={[{ value: "one", label: "Single" }, { value: "couple", label: "Married couple" }]} />
      <NumberField label="Monthly income (gross)" prefix="$" value={s.inc} onChange={(v) => set("inc", v ?? 0)} min={0} max={MAX_INPUT} hint="Social Security before Medicare is deducted, pensions, wages." />
      <NumberField label="Savings and investments" prefix="$" value={s.res} onChange={(v) => set("res", v ?? 0)} min={0} max={MAX_INPUT} hint="Home, one car and burial plots don't count." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Medicare Savings Program (2026)" value={r.program ?? "Not under federal limits"} tone={r.program ? "sage" : "ember"} sub={r.program ? <>It pays {PAYS[r.program]} — at least {money2(r.partBYearly)} a year — and qualifies you for Extra Help automatically.</> : <>{r.byIncome && !r.resourcesOk ? `Income qualifies for ${r.byIncome}, but savings are over ${money(r.resourceLimit)}.` : "Income is above the QI limit."} Many states use higher limits — apply through your state Medicaid office anyway.</>} />
      <MiniTable
        head={["Program", "Monthly income limit", "Pays"]}
        rows={[
          ["QMB", money(r.limits.qmb), "Premiums + cost-sharing"],
          ["SLMB", money(r.limits.slmb), "Part B premium"],
          ["QI", money(r.limits.qi), "Part B premium"],
        ]}
        hit={r.program === "QMB" ? 0 : r.program === "SLMB" ? 1 : r.program === "QI" ? 2 : undefined}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Resource limit" value={money(r.resourceLimit)} tone={r.resourcesOk ? "sage" : "ember"} />
        <Stat label="Part B premium it covers" value={money2(r.partBYearly)} sub="per year, 2026" />
      </div>
      <div className="mt-5">
        <Callout tone="sky" title="Check your state's rules">
          <p>The figures are the federal floors (they include the $20 income disregard). Several states have no asset test or higher income limits, and Alaska and Hawaii limits are higher.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>QMB covers income up to 100% of the poverty level, SLMB 100–120% and QI 120–135%, each with a small built-in disregard. Resource limits are the same for all three.</p>
      </ShowMath>
      <NextStep href="/extra-help-medicare-eligibility" title="See what Extra Help pays on top" why="Lower drug costs and no Part D penalty." />
      <div className="mt-6">
        <ShareBar tool="msp" subject="Medicare Savings Program check" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.program ? `Qualifies: ${r.program}` : "Over federal limits"} />;
}
