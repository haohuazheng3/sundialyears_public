"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money, pct } from "@/lib/format";
import { withdrawalTax } from "@/lib/calc/tax-more";
import { computeIrmaa } from "@/lib/calc/irmaa";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { ...HH_DEFAULTS, ira: 0, rmd: 30000 };

export function RmdTaxCalculator() {
  const { state: s, set } = useUrlState(D, { ...HH_SCHEMA, rmd: num });
  const r = withdrawalTax(toHousehold(s), s.rmd);
  const fs = s.fs === "mfj" ? "mfj" : s.fs === "mfs" ? "mfs" : "single";
  const people = s.fs === "mfj" ? 2 : 1;
  const i0 = computeIrmaa({ year: 2027, filingStatus: fs, magi: r.before.agi, people });
  const i1 = computeIrmaa({ year: 2027, filingStatus: fs, magi: r.after.agi, people });
  useResultTrack("calc_rmdtax_result", JSON.stringify(s), { rate: Math.round(r.rate * 100) });

  const inputs = (
    <>
      <NumberField label="Your RMD" prefix="$" value={s.rmd} onChange={(v) => set("rmd", v ?? 0)} min={0} max={MAX_INPUT} />
      <HouseholdFields s={s} set={set} show={["ss", "pen", "int", "cg"]} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Federal tax caused by your RMD" value={money(r.delta)} tone="sun" sub={<>An effective {pct(r.rate, 1)} on the {money(s.rmd)} withdrawal; your next dollar is taxed at the {pct(r.after.bracket, 0)} bracket.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Extra Social Security taxed" value={money(r.extraTaxableSs)} />
        <Stat label="AGI with RMD" value={money(r.after.agi)} />
        <Stat label="IRMAA tier (2 yrs later)" value={i1.tier === 0 ? "None" : `Tier ${i1.tier}`} sub={i1.tier > i0.tier ? "RMD pushes you up" : "unchanged"} tone={i1.tier > i0.tier ? "ember" : undefined} />
      </div>
      {r.extraTaxableSs > 0 ? (
        <div className="mt-5">
          <Callout tone="ember" title="The tax torpedo">
            <p>Each RMD dollar also makes up to 85 cents of Social Security taxable, so the real rate on the RMD ({pct(r.rate, 1)}) can beat your bracket.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          We compute your 2026 federal tax twice — with and without the RMD — using your filing status, the standard deduction (with the 65+ add-ons and the senior deduction) and the IRS Social Security worksheet. The difference is the RMD&rsquo;s tax. RMDs are ordinary income; withholding can be taken from the RMD itself to cover it.
        </p>
      </ShowMath>
      <NextStep href="/qcd-calculator" title="Give to charity? Use your RMD." why="A QCD satisfies the RMD with none of this tax." />
      <div className="mt-6">
        <ShareBar tool="rmdtax" subject="Tax on my RMD" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`RMD tax: ${money(r.delta)}`} />;
}
