"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { LineChart } from "@/components/tool/Charts";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { moneyDuration } from "@/lib/calc/plan-more";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { sav: 800000, spend: 70000, inc: 36000, ret: 5, inf: 2.5, age: 65 };

export function MoneyLastCalculator() {
  const { state: s, set } = useUrlState(D, { sav: num, spend: num, inc: num, ret: num, inf: num, age: num });
  const r = moneyDuration({ savings: s.sav, spending: s.spend, income: s.inc, returnPct: s.ret, inflationPct: s.inf, age: s.age });
  const table = [40000, 50000, 60000, 80000, 100000].map((sp) => {
    const x = moneyDuration({ savings: 1000000, spending: sp, income: 0, returnPct: s.ret, inflationPct: s.inf, age: 65 });
    return [money(sp), x.years == null ? "45+ years" : `${x.years.toFixed(1)} years`];
  });
  useResultTrack("calc_moneylast_result", JSON.stringify(s), { years: r.years });

  const inputs = (
    <>
      <NumberField label="Savings today" prefix="$" value={s.sav} onChange={(v) => set("sav", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Yearly spending" prefix="$" value={s.spend} onChange={(v) => set("spend", v ?? 0)} min={0} max={MAX_INPUT} hint="Everything you spend, before taxes come out of withdrawals." />
      <NumberField label="Social Security and pensions (yearly)" prefix="$" value={s.inc} onChange={(v) => set("inc", v ?? 0)} min={0} max={MAX_INPUT} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Return" suffix="%" decimals={1} value={s.ret} onChange={(v) => set("ret", v ?? 0)} min={-5} max={15} />
        <NumberField label="Inflation" suffix="%" decimals={1} value={s.inf} onChange={(v) => set("inf", v ?? 0)} min={0} max={10} />
      </div>
      <NumberField label="Your age" suffix="yrs" value={s.age} onChange={(v) => set("age", v ?? 65)} min={40} max={100} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your money lasts" value={r.years == null ? `Past ${r.lastsPastAge}` : `${r.years.toFixed(1)} years`} tone={r.years == null || r.years > 30 ? "sage" : r.years < 20 ? "ember" : "sun"} sub={r.years == null ? <>Withdrawals never exhaust it within the horizon.</> : <>Savings run out around age <strong>{Math.floor(s.age + r.years)}</strong>, withdrawing {money(Math.max(0, s.spend - s.inc))} the first year and more each year with inflation.</>} />
      <div className="mt-6">
        <LineChart series={[{ name: "Savings", color: "var(--sun)", points: r.rows.map((x) => ({ x: x.age, y: Math.max(0, x.end) })) }]} xLabel="Age" caption="Savings balance by age" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="First-year withdrawal" value={money(Math.max(0, s.spend - s.inc))} />
        <Stat label="Withdrawal rate" value={`${((Math.max(0, s.spend - s.inc) / Math.max(1, s.sav)) * 100).toFixed(1)}%`} />
        <Stat label="Real return" value={`${(s.ret - s.inf).toFixed(1)}%`} />
      </div>
      <p className="mt-6 font-bold text-ink">How long $1 million lasts at {s.ret}% return, {s.inf}% inflation</p>
      <MiniTable head={["Spending per year", "Lasts"]} rows={table} />
      <div className="mt-5">
        <Callout tone="sun" title="Average returns hide bad sequences">
          <p>A steady return is a planning shortcut. A crash in the first few years of retirement shortens the timeline more than the same crash later — keep a margin.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>Each year we withdraw spending minus your other income (both rising with inflation) at the start of the year, and the rest grows at your return. Taxes on withdrawals aren&rsquo;t modeled; include them in spending if your savings are pre-tax.</p>
      </ShowMath>
      <NextStep href="/4-percent-rule-calculator" title="What's a safe amount to withdraw?" why="The 4% rule next to Morningstar's 2026 research." />
      <div className="mt-6">
        <ShareBar tool="moneylast" subject="How long my money will last" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.years == null ? `Lasts past ${r.lastsPastAge}` : `Lasts ${r.years.toFixed(1)} years`} />;
}
