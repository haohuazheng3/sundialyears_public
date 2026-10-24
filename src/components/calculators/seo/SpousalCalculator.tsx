"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { spousalBenefit } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, ageOptions, yearOptions, MiniTable } from "./kit";

const D = { spia: 2400, pia: 600, by: 1962, age: 67 * 12 };

export function SpousalCalculator() {
  const { state: s, set } = useUrlState(D, { spia: num, pia: num, by: num, age: num });
  const r = spousalBenefit({ workerPia: s.spia, ownPia: s.pia, birthYear: s.by, claimAgeMonths: s.age });
  const atFra = spousalBenefit({ workerPia: s.spia, ownPia: s.pia, birthYear: s.by, claimAgeMonths: r.fra.total });
  const rows = [62, 63, 64, 65, 66, 67].map((a) => {
    const x = spousalBenefit({ workerPia: s.spia, ownPia: s.pia, birthYear: s.by, claimAgeMonths: a * 12 });
    return [`Age ${a}`, money(x.ownBenefit), money(x.excessPaid), money(x.total)];
  });
  useResultTrack("calc_spousal_result", `${s.spia}|${s.pia}|${s.by}|${s.age}`, { age: s.age / 12, hasOwn: s.pia > 0 });

  const inputs = (
    <>
      <NumberField label="Your spouse's benefit at full retirement age" prefix="$" value={s.spia} onChange={(v) => set("spia", v ?? 0)} min={0} max={MAX_INPUT} hint="Their PIA — the full-retirement-age amount on their Social Security statement, not what they get if they claimed early." />
      <NumberField label="Your own benefit at full retirement age" prefix="$" value={s.pia} onChange={(v) => set("pia", v ?? 0)} min={0} max={MAX_INPUT} hint="Enter 0 if you never worked under Social Security." />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1950, 1975)} />
      <SelectField label="Age you start benefits" value={s.age} onChange={(v) => set("age", v)} options={ageOptions(62, 70)} hint={`Your full retirement age is ${r.fra.label}. Spousal benefits stop growing there.`} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label="Your monthly check"
        value={money(r.total)}
        tone="sun"
        sub={
          <>
            {r.ownBenefit > 0 ? (
              <>
                Your own {money(r.ownBenefit)} plus a spousal top-up of <strong>{money(r.excessPaid)}</strong>
              </>
            ) : (
              <>
                All spousal: <strong>{money(r.excessPaid)}</strong> on your spouse&rsquo;s record
              </>
            )}
            {r.early ? `, cut for claiming ${r.early} months early.` : "."}
          </>
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Most a spouse can get" value={money(r.maxSpousal)} sub="50% of their full benefit" />
        <Stat label="At your full retirement age" value={money(atFra.total)} tone="sage" />
        <Stat label="Spousal top-up" value={money(r.excessFull)} sub="before any early cut" />
      </div>
      {r.excessFull === 0 ? (
        <div className="mt-5">
          <Callout tone="sky" title="No spousal top-up">
            <p>Your own benefit is already at least half of your spouse&rsquo;s, so Social Security pays you on your own record only.</p>
          </Callout>
        </div>
      ) : null}
      <MiniTable head={["Start at", "Own benefit", "Spousal top-up", "Total"]} rows={rows} hit={Math.min(5, Math.max(0, Math.floor(s.age / 12) - 62))} />
      <ShowMath>
        <p>
          Spousal top-up = 50% × {money(s.spia)} − your benefit {money(s.pia)} = {money(r.excessFull)}. Claimed {r.early} months before full retirement age, the top-up is cut 25/36 of 1% a month for the first 36 months and 5/12 of 1% after that.
          Your own benefit is cut 5/9 of 1% and 5/12 of 1%, or earns 2/3 of 1% a month if you wait past full retirement age. Your spouse must have filed for their own benefit before the spousal top-up is paid.
        </p>
      </ShowMath>
      {r.deemedFiling ? (
        <div className="mt-5">
          <Callout tone="sun" title="Deemed filing applies to you">
            <p>Born in 1954 or later, filing for one benefit files for both — you can&rsquo;t take the spousal benefit now and switch to your own later at a higher amount.</p>
          </Callout>
        </div>
      ) : null}
      <NextStep href={`/social-security-break-even-calculator?pia=${s.pia}`} title="When should you claim your own benefit?" why="Compare 62, full retirement age and 70 for your own record, with break-even ages." />
      <div className="mt-6">
        <ShareBar tool="spousal" subject="My Social Security spousal benefit" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Spousal check: ${money(r.total)}/mo`} />;
}
