"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { rothConversion } from "@/lib/calc/tax-more";
import { irmaa2028Projection, tierFor } from "@/lib/calc/medicare-more";
import { TR_ECON } from "@/data/params/social-security";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { ...HH_DEFAULTS, ira: 10000, conv: 40000 };

export function RothConversionCalculator() {
  const { state: s, set } = useUrlState(D, { ...HH_SCHEMA, conv: num });
  const r = rothConversion(toHousehold(s), s.conv);
  const proj = irmaa2028Projection(TR_ECON.value.cpiUltimate);
  const bounds = s.fs === "mfj" ? proj.joint : proj.individual;
  const t0 = tierFor(r.before.agi, bounds);
  const t1 = tierFor(r.after.agi, bounds);
  const irmaaRoom = t1 < 5 ? bounds[t1] - r.after.agi : 0;
  useResultTrack("calc_roth_result", JSON.stringify(s), { rate: Math.round(r.rate * 100), t1 });

  const inputs = (
    <>
      <NumberField label="Amount to convert in 2026" prefix="$" value={s.conv} onChange={(v) => set("conv", v ?? 0)} min={0} max={MAX_INPUT} />
      <HouseholdFields s={s} set={set} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Federal tax on the conversion" value={money(r.delta)} tone="sun" sub={<>{pct(r.rate, 1)} of {money(s.conv)}. You have <strong>{money(r.room)}</strong> more room before your next dollar leaves the {pct(r.before.bracket, 0)} bracket.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Bracket after converting" value={pct(r.after.bracket, 0)} />
        <Stat label="Extra Social Security taxed" value={money(r.extraTaxableSs)} />
        <Stat label="2028 IRMAA (projected)" value={t1 === 0 ? "None" : `Tier ${t1}`} sub={t1 > t0 ? "conversion pushes you up" : t1 < 5 ? `${money(irmaaRoom)} to the next line` : "top tier"} tone={t1 > t0 ? "ember" : "sage"} />
      </div>
      {t1 > t0 ? (
        <div className="mt-5">
          <Callout tone="ember" title="This conversion crosses an IRMAA line">
            <p>Your 2026 MAGI sets your 2028 Medicare premiums. Converting about {money(Math.max(0, s.conv - (r.after.agi - bounds[t0] + 1)))} instead would keep you in the lower tier.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          The tax is your 2026 federal tax with the conversion minus without it, so it includes extra Social Security becoming taxable and the senior deduction phasing out. Bracket room is how much more ordinary income fits before the next bracket. The IRMAA check uses projected 2028 thresholds at the Trustees&rsquo; {TR_ECON.value.cpiUltimate}% inflation assumption. Pay the tax from outside the IRA if you can.
        </p>
      </ShowMath>
      <NextStep href="/irmaa-brackets-2028" title="The 2028 IRMAA lines in detail" why="Projected brackets for 2026 income, single and joint." />
      <div className="mt-6">
        <ShareBar tool="roth" subject="My Roth conversion tax" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Tax: ${money(r.delta)} (${pct(r.rate, 0)})`} />;
}
