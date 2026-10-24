"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { safeWithdrawal, moneyDuration } from "@/lib/calc/plan-more";
import { SAFE_WITHDRAWAL } from "@/data/params/planning";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { sav: 1000000, inf: 2.5, ret: 5, inc: 30000 };
const W = SAFE_WITHDRAWAL.value;

export function FourPctCalculator() {
  const { state: s, set } = useUrlState(D, { sav: num, inf: num, ret: num, inc: num });
  const four = safeWithdrawal(s.sav, W.classicRule, W.horizonYears, s.inf);
  const ms = safeWithdrawal(s.sav, W.morningstar2026, W.horizonYears, s.inf);
  const test = moneyDuration({ savings: s.sav, spending: four.first, income: 0, returnPct: s.ret, inflationPct: s.inf, age: 65 });
  useResultTrack("calc_fourpct_result", JSON.stringify(s), { sav: s.sav });

  const inputs = (
    <>
      <NumberField label="Retirement savings" prefix="$" value={s.sav} onChange={(v) => set("sav", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Social Security and pensions (yearly)" prefix="$" value={s.inc} onChange={(v) => set("inc", v ?? 0)} min={0} max={MAX_INPUT} hint="To see your total income, not just the withdrawal." />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Expected return" suffix="%" decimals={1} value={s.ret} onChange={(v) => set("ret", v ?? 0)} min={-5} max={15} />
        <NumberField label="Inflation" suffix="%" decimals={1} value={s.inf} onChange={(v) => set("inf", v ?? 0)} min={0} max={10} />
      </div>
    </>
  );

  const result = (
    <>
      <ResultHero label="4% rule: first-year withdrawal" value={money(four.first)} tone="sun" sub={<>{money(four.monthly)} a month, raised with inflation each year. With your other income that&rsquo;s {money(four.first + s.inc)} a year.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label={`Morningstar 2026 (${(W.morningstar2026 * 100).toFixed(1)}%)`} value={money(ms.first)} sub="30 yrs, 90% success" />
        <Stat label="Year 10 withdrawal" value={money(four.schedule[9]?.amount ?? 0)} />
        <Stat label={`At ${s.ret}% steady return`} value={test.years == null ? "Never runs out" : `${test.years.toFixed(0)} years`} tone="sage" />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="Our take">
          <p>Treat 4% as a starting point, not a promise. It was built for a 30-year retirement starting at 65 with a stock-bond mix and no flexibility. Retiring at 70 can justify more; retiring at 55, or refusing to cut spending in a bad year, calls for less.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          The rule comes from 1990s research (Bengen; the Trinity study) that found a 4% first-year withdrawal, adjusted for inflation, survived every 30-year period in U.S. history with a balanced portfolio. Morningstar&rsquo;s 2026 &ldquo;State of Retirement Income&rdquo; puts the starting safe rate at {(W.morningstar2026 * 100).toFixed(1)}% for {W.horizonYears} years at a 90% probability of success. The steady-return test uses your inputs, not history.
        </p>
      </ShowMath>
      <NextStep href="/how-long-will-my-money-last-calculator" title="Test your own spending" why="Year-by-year balance with Social Security included." />
      <div className="mt-6">
        <ShareBar tool="fourpct" subject="My 4% rule withdrawal" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`4% rule: ${money(four.first)}/yr`} />;
}
