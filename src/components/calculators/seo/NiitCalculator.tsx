"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { niit } from "@/lib/calc/tax-more";
import { FS_OPTIONS, type Fs } from "./household";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { fs: "mfj" as Fs, other: 190000, nii: 90000 };

export function NiitCalculator() {
  const { state: s, set } = useUrlState(D, { fs: str(FS_OPTIONS.map((o) => o.value)), other: num, nii: num });
  const magi = s.other + s.nii;
  const r = niit({ filingStatus: s.fs, magi, nii: s.nii });
  useResultTrack("calc_niit_result", JSON.stringify(s), { owes: r.tax > 0 });

  const inputs = (
    <>
      <SelectField label="Filing status" value={s.fs} onChange={(v) => set("fs", v)} options={[...FS_OPTIONS]} />
      <NumberField label="Net investment income" prefix="$" value={s.nii} onChange={(v) => set("nii", v ?? 0)} min={0} max={MAX_INPUT} hint="Interest, dividends, capital gains, rents, royalties, passive business income — minus related expenses." />
      <NumberField label="All other income in AGI" prefix="$" value={s.other} onChange={(v) => set("other", v ?? 0)} min={0} max={MAX_INPUT} hint="Wages, pensions, IRA and 401(k) withdrawals, Roth conversions, taxable Social Security." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Net investment income tax" value={money(r.tax)} tone={r.tax ? "ember" : "sage"} sub={r.tax ? <>3.8% of {money(r.base)} — the smaller of your investment income or the {money(r.over)} your MAGI is over {money(r.threshold)}.</> : <>Your MAGI of {money(magi)} is under the {money(r.threshold)} threshold.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Threshold" value={money(r.threshold)} sub="fixed since 2013" />
        <Stat label="MAGI" value={money(magi)} />
        <Stat label="Taxed at 3.8%" value={money(r.base)} />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="IRA withdrawals aren't investment income — but they still trigger it">
          <p>RMDs, IRA withdrawals and Roth conversions aren&rsquo;t subject to the 3.8% themselves, but they raise MAGI, which can expose your dividends and gains to it.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          NIIT = 3.8% × the lesser of net investment income or MAGI above $200,000 (single, head of household), $250,000 (joint, qualifying surviving spouse) or $125,000 (married filing separately). The thresholds are set in law and never adjusted for inflation. Gains from selling a main home within the $250,000/$500,000 exclusion, Social Security, and retirement plan distributions are not investment income.
        </p>
      </ShowMath>
      <NextStep href="/capital-gains-tax-over-65-calculator" title="How much of your gain is taxed at 0%?" why="Gain harvesting with Social Security in the picture." />
      <div className="mt-6">
        <ShareBar tool="niit" subject="My net investment income tax" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`NIIT: ${money(r.tax)}`} />;
}
