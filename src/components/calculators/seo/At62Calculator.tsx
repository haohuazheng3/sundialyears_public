"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { retirementBenefit, breakEvenMonths } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions, MiniTable, ageLabelMonths } from "./kit";

const D = { pia: 2200, by: 1964, to: 85 };

export function At62Calculator() {
  const { state: s, set } = useUrlState(D, { pia: num, by: num, to: num });
  const a62 = retirementBenefit(s.pia, s.by, 62 * 12);
  const a67 = retirementBenefit(s.pia, s.by, 67 * 12);
  const a70 = retirementBenefit(s.pia, s.by, 70 * 12);
  const be = breakEvenMonths(s.pia, s.by, 62 * 12, 67 * 12);
  const life = (b: number, start: number) => Math.max(0, s.to * 12 - start) * b;
  useResultTrack("calc_at62_result", `${s.pia}|${s.by}`, { by: s.by });

  const inputs = (
    <>
      <NumberField label="Your benefit at full retirement age" prefix="$" value={s.pia} onChange={(v) => set("pia", v ?? 0)} min={0} max={MAX_INPUT} hint="From your my Social Security statement (ssa.gov/myaccount)." />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1955, 1980)} />
      <SelectField label="Compare lifetime totals to age" value={s.to} onChange={(v) => set("to", v)} options={[75, 80, 85, 90, 95].map((a) => ({ value: a, label: `Age ${a}` }))} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your check at 62" value={money(a62.benefit)} tone="sun" sub={<>That&rsquo;s {pct(a62.factor, 1)} of your full benefit — a {pct(1 - a62.factor, 1)} cut for {a62.early} months early, for life (before COLAs).</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="At 67" value={money(a67.benefit)} sub={`+${money(a67.benefit - a62.benefit)}/mo vs 62`} />
        <Stat label="At 70" value={money(a70.benefit)} tone="sage" />
        <Stat label="62 vs 67 break-even" value={be ? ageLabelMonths(be) : "—"} sub="age when waiting catches up" />
      </div>
      <MiniTable
        head={["Start at", "Monthly", `Total by ${s.to}`]}
        rows={[62, 63, 64, 65, 66, 67, 68, 69, 70].map((a) => {
          const b = retirementBenefit(s.pia, s.by, a * 12).benefit;
          return [`Age ${a}`, money(b), money(life(b, a * 12))];
        })}
        hit={0}
      />
      <div className="mt-5">
        <Callout tone="ember" title="Still working at 62?">
          <p>Before full retirement age, the earnings test holds back $1 of benefits for every $2 you earn over the limit. Run it before you file.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          The first 36 months early cost 5/9 of 1% each; every month beyond that costs 5/12 of 1%. With a full retirement age of {a62.fra.label}, 62 is {a62.early} months early. Waiting past full retirement age adds 2/3 of 1% a month until 70. Totals ignore COLAs because they raise every option by the same percentage.
        </p>
      </ShowMath>
      <NextStep href={`/social-security-earnings-limit-calculator?ben=${a62.benefit}`} title="Working while you collect?" why="See how much the earnings test would hold back at 62." />
      <div className="mt-6">
        <ShareBar tool="at62" subject="My Social Security at 62" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`At 62: ${money(a62.benefit)}/mo`} />;
}
