"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { wepRepeal } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions } from "./kit";

const D = { ey: 2018, ys: 22, pen: 2400 };

export function WepCalculator() {
  const { state: s, set } = useUrlState(D, { ey: num, ys: num, pen: num });
  const r = wepRepeal({ eligibilityYear: s.ey, yearsSubstantial: s.ys, pension: s.pen });
  useResultTrack("calc_wep_result", `${s.ey}|${s.ys}|${s.pen}`, { ys: s.ys });

  const inputs = (
    <>
      <SelectField label="Year you turned 62" value={s.ey} onChange={(v) => set("ey", v)} options={yearOptions(1990, 2027)} />
      <NumberField label="Years of substantial Social Security earnings" suffix="yrs" value={s.ys} onChange={(v) => set("ys", v ?? 0)} min={0} max={45} hint="Years your covered earnings were above SSA's 'substantial earnings' line — your old WEP letter lists it." />
      <NumberField label="Monthly pension from non-covered work" prefix="$" value={s.pen} onChange={(v) => set("pen", v ?? 0)} min={0} max={MAX_INPUT} hint="The government or foreign pension that triggered WEP." />
    </>
  );

  const result = r ? (
    <>
      <ResultHero label="Monthly increase from the repeal" value={money(r.increaseNow)} tone="sage" sub={<>In 2027 dollars — the {money(r.reductionAtEligibility)} WEP took at 62, grown by {r.colaYears} cost-of-living raises.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="WEP first-bend rate" value={pct(r.factor, 0)} sub="instead of 90%" />
        <Stat label="First bend point" value={money(r.bend)} sub={`year ${s.ey}`} />
        <Stat label="Yearly, from 2027" value={money(r.increaseNow * 12)} />
      </div>
      {r.cappedByPension ? (
        <div className="mt-5">
          <Callout tone="sky" title="Your WEP was capped by the pension rule">
            <p>WEP could never take more than half of the non-covered pension, so the restored amount is limited to {money(r.reductionAtEligibility)} at 62.</p>
          </Callout>
        </div>
      ) : null}
      {s.ys >= 30 ? (
        <div className="mt-5">
          <Callout tone="sky" title="30+ years: WEP never reduced you">
            <p>With 30 or more years of substantial earnings the full 90% applied, so the repeal didn&rsquo;t change your benefit.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          Under WEP, the first slice of your earnings used {pct(r.factor, 0)} instead of 90%: a loss of {pct(0.9 - r.factor, 0)} × {money(r.bend)} = {money((0.9 - r.factor) * r.bend)}, capped at half your pension. The Social Security Fairness Act ended that for benefits from January 2024; SSA paid the back pay as a lump sum in 2025. Your exact figure depends on rounding and the month you started.
        </p>
      </ShowMath>
      <NextStep href="/government-pension-offset-calculator" title="Spouse or widow benefits too?" why="The GPO repeal restored those — estimate what you get now." />
      <div className="mt-6">
        <ShareBar tool="wep" subject="My WEP repeal increase" />
      </div>
    </>
  ) : (
    <ResultHero label="Monthly increase" value="—" sub="Pick a year from 1990 on." />
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r ? `+${money(r.increaseNow)}/mo` : undefined} />;
}
