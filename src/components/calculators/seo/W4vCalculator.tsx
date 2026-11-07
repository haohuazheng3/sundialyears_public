"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { computeFedTax, w4vRateToCover } from "@/lib/calc/fed-tax";
import { SS_WITHHOLDING_RATES } from "@/data/params/tax";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { ...HH_DEFAULTS, wh: 2000 };

export function W4vCalculator() {
  const { state: s, set } = useUrlState(D, { ...HH_SCHEMA, wh: num });
  const t = computeFedTax(toHousehold(s));
  const gap = Math.max(0, t.totalTax - s.wh);
  const rate = w4vRateToCover(gap, s.ss, SS_WITHHOLDING_RATES.value);
  useResultTrack("calc_w4v_result", JSON.stringify(s), { rate });

  const inputs = (
    <>
      <HouseholdFields s={s} set={set} />
      <NumberField label="Tax already withheld from pensions or IRAs" prefix="$" value={s.wh} onChange={(v) => set("wh", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Withholding rate to choose on Form W-4V" value={gap === 0 ? "None needed" : rate == null ? "22% isn't enough" : pct(rate, 0)} tone="sun" sub={gap === 0 ? <>Your other withholding already covers your estimated {money(t.totalTax)} of 2026 federal tax.</> : <>To cover the {money(gap)} not withheld elsewhere. {rate == null ? "Add estimated payments for the rest." : `That's ${money(s.ss * rate)} a year from your benefits.`}</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Estimated 2026 federal tax" value={money(t.totalTax)} />
        <Stat label="Taxable Social Security" value={money(t.ss.taxable)} />
        <Stat label="Not yet withheld" value={money(gap)} tone={gap ? "ember" : "sage"} />
      </div>
      <MiniTable head={["W-4V rate", "Withheld per year", "Covers the gap?"]} rows={SS_WITHHOLDING_RATES.value.map((r) => [pct(r, 0), money(s.ss * r), s.ss * r >= gap ? "Yes" : "No"])} hit={rate == null ? undefined : SS_WITHHOLDING_RATES.value.indexOf(rate)} />
      <div className="mt-5">
        <Callout tone="sky" title="How to file it">
          <p>Fill in Form W-4V (name, Social Security number, claim number and one rate box), sign it and mail or fax it to your local Social Security office — not the IRS. Or set it up online in your my Social Security account. Changes start in a month or two.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          We estimate your 2026 federal tax with the IRS Social Security worksheet, the 65+ standard deduction and the senior deduction, subtract what&rsquo;s already withheld, and pick the lowest of the four allowed rates (7, 10, 12 or 22% of each payment) that covers the rest. Paying at least 100% of last year&rsquo;s tax (110% if AGI was over $150,000) through withholding avoids an underpayment penalty.
        </p>
      </ShowMath>
      <NextStep href="/taxable-social-security-calculator" title="Why is my Social Security taxed?" why="The IRS worksheet line by line, with the tax torpedo." />
      <div className="mt-6">
        <ShareBar tool="w4v" subject="My Social Security withholding rate" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={gap === 0 ? "No W-4V needed" : rate == null ? "Over 22%" : `Choose ${pct(rate, 0)}`} />;
}
