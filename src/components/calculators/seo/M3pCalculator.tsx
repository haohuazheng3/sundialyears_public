"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { m3pSchedule } from "@/lib/calc/medicare-more";
import { PART_D } from "@/data/params/medicare";
import { NextStep, useResultTrack, MAX_INPUT, MONTH_OPTIONS, MiniTable } from "./kit";
import { MONTHS } from "@/lib/format";

const D = { year: 2027, start: 1, prior: 0, big: 1800, bm: 1, mo: 60 };

export function M3pCalculator() {
  const { state: s, set } = useUrlState(D, { year: num, start: num, prior: num, big: num, bm: num, mo: num });
  const year = (s.year === 2026 ? 2026 : 2027) as 2026 | 2027;
  const cap = PART_D[year].value.outOfPocketCap;
  const costs = Array.from({ length: 12 }, (_, i) => (i + 1 === s.bm ? s.big : 0) + (i + 1 >= s.start ? s.mo : 0));
  const rows = m3pSchedule({ annualCap: cap, startMonth: s.start, priorOop: s.prior, monthlyCosts: costs });
  const first = rows[0];
  const maxBill = Math.max(...rows.map((r) => r.bill));
  const total = rows.reduce((t, r) => t + r.bill, 0);
  useResultTrack("calc_m3p_result", `${year}|${s.start}|${s.prior}|${s.big}|${s.bm}|${s.mo}`, { year });

  const inputs = (
    <>
      <Segmented label="Plan year" value={year} onChange={(v) => set("year", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <SelectField label="Month you join the payment plan" value={s.start} onChange={(v) => set("start", v)} options={MONTH_OPTIONS} />
      <NumberField label="Out-of-pocket drug costs already paid this year" prefix="$" value={s.prior} onChange={(v) => set("prior", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="A large prescription cost" prefix="$" value={s.big} onChange={(v) => set("big", v ?? 0)} min={0} max={MAX_INPUT} hint="What you'd pay at the pharmacy for an expensive fill." />
      <SelectField label="…in this month" value={s.bm} onChange={(v) => set("bm", v)} options={MONTH_OPTIONS} />
      <NumberField label="Regular monthly drug costs" prefix="$" value={s.mo} onChange={(v) => set("mo", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your first monthly bill" value={first ? money2(first.bill) : "—"} tone="sun" sub={<>Instead of paying the pharmacy, you pay your plan in monthly installments — never more than {money2(maxBill)} in any month this year.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label={`${year} out-of-pocket cap`} value={money(cap)} />
        <Stat label="Highest monthly bill" value={money2(maxBill)} />
        <Stat label="Total billed this year" value={money2(total)} sub="same total, spread out" />
      </div>
      <MiniTable head={["Month", "Pharmacy cost", "Your bill"]} rows={rows.map((r) => [MONTHS[r.month - 1], money2(r.incurred), money2(r.bill)])} />
      <div className="mt-5">
        <Callout tone="sky" title="It spreads costs; it doesn't cut them">
          <p>The payment plan is free and interest-free, but you pay the same total. It helps most when a big fill lands early in the year.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          First month&rsquo;s maximum: ({money(cap)} cap − {money(s.prior)} already paid) ÷ {first ? 13 - first.month : 0} months left = {first ? money2(first.cap) : "—"}; you&rsquo;re billed the lower of that and what you actually owed. Each later month: (unbilled balance + new costs) ÷ months left (42 CFR 423.137).
        </p>
      </ShowMath>
      <NextStep href="/extra-help-medicare-eligibility" title="Could Extra Help cut the costs instead?" why="Extra Help lowers what you owe; the payment plan only spreads it." />
      <div className="mt-6">
        <ShareBar tool="m3p" subject="My Medicare Prescription Payment Plan bills" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={first ? `First bill: ${money2(first.bill)}` : undefined} />;
}
