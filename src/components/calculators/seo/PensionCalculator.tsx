"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { pensionCompare } from "@/lib/calc/plan-more";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { lump: 320000, mo: 1900, cola: 0, age: 65, start: 65, sex: "m" as "m" | "f", rate: 5 };

export function PensionCalculator() {
  const { state: s, set } = useUrlState(D, { lump: num, mo: num, cola: num, age: num, start: num, sex: str(["m", "f"] as const), rate: num });
  const r = pensionCompare({ lump: s.lump, monthly: s.mo, colaPct: s.cola, ageNow: s.age, startAge: Math.max(s.age, s.start), sex: s.sex, ratePct: s.rate });
  const annuityWins = r.expectedPv > s.lump;
  useResultTrack("calc_pension_result", JSON.stringify(s), { annuityWins });

  const inputs = (
    <>
      <NumberField label="Lump sum offered" prefix="$" value={s.lump} onChange={(v) => set("lump", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Monthly pension offered" prefix="$" value={s.mo} onChange={(v) => set("mo", v ?? 0)} min={0} max={MAX_INPUT} hint="Single-life amount, for an apples-to-apples comparison." />
      <NumberField label="Yearly cost-of-living increase in the pension" suffix="%" decimals={1} value={s.cola} onChange={(v) => set("cola", v ?? 0)} min={0} max={10} hint="Most private pensions: 0%." />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Your age now" suffix="yrs" value={s.age} onChange={(v) => set("age", v ?? 65)} min={40} max={90} />
        <NumberField label="Pension starts at" suffix="yrs" value={s.start} onChange={(v) => set("start", v ?? 65)} min={40} max={90} />
      </div>
      <Segmented label="Sex (for life expectancy)" value={s.sex} onChange={(v) => set("sex", v)} options={[{ value: "f", label: "Female" }, { value: "m", label: "Male" }]} />
      <NumberField label="Return you could earn on the lump sum" suffix="%" decimals={1} value={s.rate} onChange={(v) => set("rate", v ?? 0)} min={0} max={15} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Return the pension pays you" value={r.impliedReturn == null ? "Below 0%" : pct(r.impliedReturn / 100, 1)} tone="sun" sub={<>If you live to {r.lifeExpectancyAge.toFixed(0)} (average for your age). To beat it, the lump sum would have to earn more than that every year, after fees.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Break-even age" value={r.breakEvenAge ? r.breakEvenAge.toFixed(1) : "—"} sub="payments add up to the lump sum" />
        <Stat label="Chance you live past it" value={r.oddsPastBreakEven == null ? "—" : pct(r.oddsPastBreakEven, 0)} tone="sage" />
        <Stat label={`Pension's value at ${s.rate}%`} value={money(r.expectedPv)} sub="weighted by survival odds" />
      </div>
      <div className="mt-5">
        <Callout tone={annuityWins ? "sage" : "sun"} title={annuityWins ? "The pension is worth more than the lump sum" : "The lump sum is worth more on paper"}>
          <p>{annuityWins ? `At a ${s.rate}% return, the survival-weighted value of the payments (${money(r.expectedPv)}) beats ${money(s.lump)}. And it can't run out.` : `At a ${s.rate}% return the lump sum is worth more — but only if you actually earn that return and don't outlive the money.`}</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Break-even ignores interest: the age when payments received equal the lump sum. The implied return is the discount rate at which payments to your life expectancy are worth exactly the lump sum. The survival-weighted value discounts each year&rsquo;s payments by your chosen return and the probability of being alive (SSA 2023 period life table, 2026 Trustees Report). PBGC insures most private pensions up to legal limits.
        </p>
      </ShowMath>
      <NextStep href="/life-expectancy-calculator" title="How long are you likely to live?" why="Your odds of reaching 80, 90 and 100 from SSA's tables." />
      <div className="mt-6">
        <ShareBar tool="pension" subject="Pension lump sum vs annuity" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.impliedReturn == null ? "Return below 0%" : `Pension pays ${pct(r.impliedReturn / 100, 1)}`} />;
}
