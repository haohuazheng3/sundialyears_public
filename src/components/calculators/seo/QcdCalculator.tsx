"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { qcdSavings } from "@/lib/calc/tax-more";
import { computeIrmaa } from "@/lib/calc/irmaa";
import { QCD } from "@/data/params/tax";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { ...HH_DEFAULTS, ira: 0, rmd: 24000, gift: 6000, item: 0 };

export function QcdCalculator() {
  const { state: s, set } = useUrlState(D, { ...HH_SCHEMA, rmd: num, gift: num, item: num });
  const limit = QCD[2026].value.limit;
  const gift = Math.min(s.gift, limit * (s.fs === "mfj" ? 2 : 1));
  const r = qcdSavings(toHousehold(s), { rmd: s.rmd, gift, itemizedOther: s.item });
  const irmaaFs = s.fs === "mfj" ? "mfj" : s.fs === "mfs" ? "mfs" : "single";
  const before = computeIrmaa({ year: 2027, filingStatus: irmaaFs, magi: r.cash.agi, people: s.fs === "mfj" ? 2 : 1 });
  const after = computeIrmaa({ year: 2027, filingStatus: irmaaFs, magi: r.qcd.agi, people: s.fs === "mfj" ? 2 : 1 });
  const irmaaSaved = Math.max(0, before.annual.surcharge - after.annual.surcharge);
  useResultTrack("calc_qcd_result", JSON.stringify(s), { saved: Math.round(r.saved) });

  const inputs = (
    <>
      <NumberField label="Your RMD this year" prefix="$" value={s.rmd} onChange={(v) => set("rmd", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Amount you plan to give to charity" prefix="$" value={s.gift} onChange={(v) => set("gift", v ?? 0)} min={0} max={MAX_INPUT} hint={`QCD limit for 2026: ${money(limit)} per IRA owner aged 70½+.`} />
      <HouseholdFields s={s} set={set} show={["ss", "pen", "int", "cg"]} />
      <NumberField label="Other itemized deductions" prefix="$" value={s.item} onChange={(v) => set("item", v ?? 0)} min={0} max={MAX_INPUT} hint="Mortgage interest, state and local taxes, medical over 7.5% — 0 if you take the standard deduction." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Federal tax saved with a QCD" value={money(r.saved)} tone="sage" sub={<>Giving {money(gift)} straight from the IRA instead of taking it and writing a check lowers your AGI by <strong>{money(r.agiDrop)}</strong>{r.agiDrop > gift ? " — more than the gift, because less of your Social Security becomes taxable" : ""}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Tax: cash gift" value={money(r.cash.totalTax)} sub={r.cashItemized ? "itemizing" : "standard deduction"} />
        <Stat label="Tax: QCD" value={money(r.qcd.totalTax)} tone="sage" />
        <Stat label="IRMAA saved (2 years later)" value={money(irmaaSaved)} sub="at 2027 thresholds" />
      </div>
      {!r.cashItemized ? (
        <div className="mt-5">
          <Callout tone="sun" title="Why the QCD wins here">
            <p>You take the standard deduction, so a cash gift earns no deduction at all. A QCD keeps the money out of income entirely.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          Both scenarios use 2026 federal law with your income. A QCD counts toward your RMD, isn&rsquo;t taxable and doesn&rsquo;t need itemizing. It must go directly from an IRA to a qualified charity (not a donor-advised fund or private foundation), you must be 70½ or older on the date of the transfer, and the {money(limit)} limit is per person. Report it on Form 1040 line 4b with &ldquo;QCD&rdquo;.
        </p>
      </ShowMath>
      <NextStep href="/irmaa-calculator" title="Close to an IRMAA line?" why="See your tier and how far a QCD moves you." />
      <div className="mt-6">
        <ShareBar tool="qcd" subject="My QCD tax savings" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`QCD saves ${money(r.saved)}`} />;
}
