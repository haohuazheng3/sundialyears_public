"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { survivorBenefit, retirementBenefit } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, ageOptions, yearOptions, MiniTable } from "./kit";

const D = { dpia: 2600, claimed: true, dben: 2100, pia: 1200, by: 1962, age: 62 * 12 };

export function SurvivorCalculator() {
  const { state: s, set } = useUrlState(D, { dpia: num, claimed: bool, dben: num, pia: num, by: num, age: num });
  const dBen = s.claimed ? s.dben : null;
  const sv = (m: number) => survivorBenefit({ deceasedPia: s.dpia, deceasedBenefit: dBen, survivorBirthYear: s.by, claimAgeMonths: m });
  const fraM = sv(60 * 12).survivorFra.total;
  const r = sv(Math.min(s.age, fraM));
  const full = sv(fraM);
  const own62 = retirementBenefit(s.pia, s.by, 62 * 12).benefit;
  const own70 = retirementBenefit(s.pia, s.by, 70 * 12).benefit;
  const strategy =
    s.pia <= 0
      ? "survivor"
      : own70 > full.benefit
        ? "survivor-first"
        : own62 < full.benefit
          ? "own-first"
          : "own";
  useResultTrack("calc_survivor_result", `${s.dpia}|${s.claimed}|${s.dben}|${s.pia}|${s.by}|${s.age}`, { strategy });

  const ages = [60, 61, 62, 63, 64, 65, 66, 67].filter((a) => a * 12 <= fraM + 11);
  const inputs = (
    <>
      <NumberField label="Late spouse's benefit at full retirement age" prefix="$" value={s.dpia} onChange={(v) => set("dpia", v ?? 0)} min={0} max={MAX_INPUT} hint="Their PIA, from their Social Security statement or the SSA letter." />
      <Toggle label="My spouse was already collecting" checked={s.claimed} onChange={(v) => set("claimed", v)} />
      {s.claimed ? <NumberField label="What they were receiving each month" prefix="$" value={s.dben} onChange={(v) => set("dben", v ?? 0)} min={0} max={MAX_INPUT} hint="Before Medicare premiums were taken out." /> : null}
      <NumberField label="Your own benefit at full retirement age" prefix="$" value={s.pia} onChange={(v) => set("pia", v ?? 0)} min={0} max={MAX_INPUT} hint="Enter 0 if you have no work record of your own." />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1950, 1975)} />
      <SelectField label="Age you start the survivor benefit" value={s.age} onChange={(v) => set("age", v)} options={ageOptions(60, 67)} hint={`Your survivor full retirement age is ${full.survivorFra.label}.`} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label="Your survivor benefit"
        value={money(r.benefit)}
        tone="sun"
        sub={
          <>
            {pct(r.benefit / Math.max(1, r.base), 1)} of {money(r.base)}
            {r.ribLimApplied ? " — capped by the widow's limit because your spouse claimed early." : "."} Waiting until {full.survivorFra.label} pays <strong>{money(full.benefit)}</strong>.
          </>
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="At survivor full retirement age" value={money(full.benefit)} tone="sage" />
        <Stat label="Your own at 62" value={money(own62)} />
        <Stat label="Your own at 70" value={money(own70)} />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="Which to take first">
          {strategy === "survivor-first" ? (
            <p>Take the survivor benefit early and let your own grow to {money(own70)} at 70 — you can switch once, and survivor benefits never block your own delayed credits.</p>
          ) : strategy === "own-first" ? (
            <p>Start your own reduced benefit ({money(own62)} at 62) and switch to the full survivor benefit ({money(full.benefit)}) at your survivor full retirement age.</p>
          ) : strategy === "own" ? (
            <p>Your own benefit beats the survivor benefit even at 62, so it is the one to claim; the survivor benefit adds nothing.</p>
          ) : (
            <p>With no record of your own, the survivor benefit is the only one. Each month you wait before {full.survivorFra.label} raises it permanently.</p>
          )}
        </Callout>
      </div>
      <MiniTable head={["Start at", "Survivor benefit", "Share"]} rows={ages.map((a) => { const x = sv(a * 12); return [`Age ${a}`, money(x.benefit), pct(x.benefit / Math.max(1, x.base), 1)]; })} hit={ages.indexOf(Math.floor(s.age / 12))} />
      <ShowMath>
        <p>
          At 60 a widow(er) gets 71.5% of the late worker&rsquo;s benefit; the 28.5% cut shrinks evenly each month until survivor full retirement age, when it is 100%. If the worker claimed early, the survivor gets the larger of what the worker was receiving or 82.5% of the worker&rsquo;s PIA (the &ldquo;widow&rsquo;s limit&rdquo;), but never more than the age-reduced amount. Delayed credits the worker earned carry over in full.
        </p>
      </ShowMath>
      <NextStep href="/qualifying-surviving-spouse-calculator" title="Your tax filing status after a death" why="See which years you can still use joint tax brackets and what filing single costs." />
      <div className="mt-6">
        <ShareBar tool="survivor" subject="My survivor benefit estimate" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Survivor benefit: ${money(r.benefit)}/mo`} />;
}
