"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { catchUpLimits } from "@/lib/calc/plan-more";
import { CONTRIB_2026 } from "@/data/params/tax";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions } from "./kit";

const D = { by: 1965, wage: 120000, roth: true };

export function CatchUpCalculator() {
  const { state: s, set } = useUrlState(D, { by: num, wage: num, roth: bool });
  const age = 2026 - s.by;
  const r = catchUpLimits({ ageAtYearEnd: age, priorYearFicaWages: s.wage, planHasRoth: s.roth });
  useResultTrack("calc_catchup_result", JSON.stringify(s), { age, mustBeRoth: r.mustBeRoth });

  const inputs = (
    <>
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1950, 1990)} hint={`You're ${age} at the end of 2026.`} />
      <NumberField label="2025 wages from this employer (W-2 box 3)" prefix="$" value={s.wage} onChange={(v) => set("wage", v ?? 0)} min={0} max={MAX_INPUT} hint="Social Security wages — this decides the new Roth catch-up rule." />
      <Toggle label="My plan offers a Roth option" checked={s.roth} onChange={(v) => set("roth", v)} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your 2026 401(k) limit" value={money(r.planTotal)} tone="sun" sub={<>{money(r.deferral)} regular{r.catchUp ? <> + {money(r.catchUp)} catch-up{r.superCatchUp ? " (the 60–63 super catch-up)" : ""}</> : null}{r.mustBeRoth ? ", and the catch-up must go in as Roth" : ""}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Catch-up" value={money(r.catchUp)} sub={age >= 60 && age <= 63 ? "ages 60–63" : age >= 50 ? "age 50+" : "under 50"} />
        <Stat label="IRA limit" value={money(r.ira)} />
        <Stat label="Catch-up must be Roth?" value={r.mustBeRoth ? "Yes" : "No"} tone={r.mustBeRoth ? "ember" : "sage"} sub={`wages over ${money(CONTRIB_2026.value.rothCatchUpWageThreshold)}`} />
      </div>
      {r.blocked ? (
        <div className="mt-5">
          <Callout tone="ember" title="No Roth option, no catch-up">
            <p>Because your 2025 wages were over {money(CONTRIB_2026.value.rothCatchUpWageThreshold)}, your catch-up has to be Roth. If the plan has no Roth feature, you can&rsquo;t make catch-ups at all until it adds one.</p>
          </Callout>
        </div>
      ) : null}
      {age === 64 ? (
        <div className="mt-5">
          <Callout tone="sun" title="64 drops back down">
            <p>The super catch-up is only for the years you are 60, 61, 62 or 63 at year-end. At 64 you&rsquo;re back to {money(CONTRIB_2026.value.catchUp50)}.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          IRS Notice 2025-67: {money(CONTRIB_2026.value.deferral)} deferral limit, {money(CONTRIB_2026.value.catchUp50)} catch-up at 50+, {money(CONTRIB_2026.value.catchUp60to63)} for ages 60–63, IRA {money(CONTRIB_2026.value.ira)} plus {money(CONTRIB_2026.value.iraCatchUp)}. Starting in 2026, anyone whose prior-year FICA wages from that employer topped {money(CONTRIB_2026.value.rothCatchUpWageThreshold)} must make catch-ups as Roth. Age is your age on December 31.
        </p>
      </ShowMath>
      <NextStep href="/hsa-and-medicare" title="Also funding an HSA?" why="Medicare ends HSA contributions — find your stop month." />
      <div className="mt-6">
        <ShareBar tool="catchup" subject="My 2026 catch-up limits" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`2026 limit: ${money(r.planTotal)}`} />;
}
