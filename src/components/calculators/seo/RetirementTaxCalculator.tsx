"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { useUrlState } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { computeFedTax, marginalRate } from "@/lib/calc/fed-tax";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack, MiniTable } from "./kit";

export function RetirementTaxCalculator() {
  const { state: s, set } = useUrlState(HH_DEFAULTS, HH_SCHEMA);
  const input = toHousehold(s);
  const t = computeFedTax(input);
  const mr = marginalRate(input);
  useResultTrack("calc_rettax_result", JSON.stringify(s), { eff: Math.round(t.effectiveRate * 100) });

  const inputs = <HouseholdFields s={s} set={set} />;

  const result = (
    <>
      <ResultHero label="Your 2026 federal income tax" value={money(t.totalTax)} tone="sun" sub={<>{pct(t.effectiveRate, 1)} of everything you receive. Your next $1,000 of IRA income would be taxed at about {pct(mr, 0)}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Taxable Social Security" value={money(t.ss.taxable)} sub={`of ${money(s.ss)}`} />
        <Stat label="Deductions" value={money(t.deduction + t.senior.total)} sub="standard + 65+ + senior" />
        <Stat label="Bracket" value={pct(t.bracket, 0)} />
      </div>
      <MiniTable
        head={["Line", "Amount"]}
        rows={[
          ["Total received", money(t.grossIncome)],
          ["Adjusted gross income", money(t.agi)],
          [`${t.deductionType === "standard" ? "Standard" : "Itemized"} deduction`, money(t.deduction)],
          ["Senior deduction", money(t.senior.total)],
          ["Taxable income", money(t.taxableIncome)],
          ["Tax on ordinary income", money(t.ordinaryTax)],
          ["Tax on gains & qualified dividends", money(t.pref.tax)],
          ["Net investment income tax", money(t.niit)],
          ["Total federal tax", money(t.totalTax)],
        ]}
        hit={8}
      />
      <ShowMath>
        <p>
          2026 federal law (Rev. Proc. 2025-32 brackets and standard deductions, the 65+ additional deduction, the 2025–2028 senior deduction), Social Security taxed by the IRS Publication 915 worksheet, gains and qualified dividends at 0/15/20%. State taxes aren&rsquo;t included. The marginal rate measures what $1,000 more of IRA income really costs, including extra Social Security taxed.
        </p>
      </ShowMath>
      <NextStep href="/state-retirement-taxes" title="Add your state" why="Which states tax Social Security, pensions and IRA withdrawals." />
      <div className="mt-6">
        <ShareBar tool="rettax" subject="My 2026 retirement tax estimate" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`2026 tax: ${money(t.totalTax)}`} />;
}
