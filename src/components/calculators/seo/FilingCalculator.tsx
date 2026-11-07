"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { filingRequirement } from "@/lib/calc/tax-more";
import { standardDeduction } from "@/lib/calc/fed-tax";
import { FS_OPTIONS, type Fs } from "./household";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { fs: "single" as Fs, age65: 1, ss: 26000, oth: 9000, tei: 0, se: 0, wh: 0 };

export function FilingCalculator() {
  const { state: s, set } = useUrlState(D, { fs: str(FS_OPTIONS.map((o) => o.value)), age65: num, ss: num, oth: num, tei: num, se: num, wh: num });
  const max65 = s.fs === "mfj" ? 2 : 1;
  const r = filingRequirement({ filingStatus: s.fs, people65: Math.min(s.age65, max65), ssBenefits: s.ss, otherGross: s.oth, taxExempt: s.tei, selfEmployment: s.se });
  useResultTrack("calc_filing_result", JSON.stringify(s), { mustFile: r.mustFile });

  const inputs = (
    <>
      <SelectField label="Filing status" value={s.fs} onChange={(v) => set("fs", v)} options={[...FS_OPTIONS]} />
      <SelectField label="People 65 or older" value={Math.min(s.age65, max65)} onChange={(v) => set("age65", v)} options={Array.from({ length: max65 + 1 }, (_, i) => ({ value: i, label: String(i) }))} />
      <NumberField label="Social Security (yearly, gross)" prefix="$" value={s.ss} onChange={(v) => set("ss", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="All other income (pension, IRA, wages, interest, gains)" prefix="$" value={s.oth} onChange={(v) => set("oth", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Tax-exempt interest" prefix="$" value={s.tei} onChange={(v) => set("tei", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Net self-employment income" prefix="$" value={s.se} onChange={(v) => set("se", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Federal tax withheld (any source)" prefix="$" value={s.wh} onChange={(v) => set("wh", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Do you have to file a 2026 return?" value={r.mustFile ? "Yes" : "No"} tone={r.mustFile ? "ember" : "sage"} sub={r.selfEmployment ? <>Self-employment income of $400 or more always requires a return.</> : <>Your gross income for the filing test is {money(r.grossIncome)}{r.includesSs ? ` (including ${money(r.taxableSs)} of taxable Social Security)` : " — Social Security doesn't count because half of it plus your other income is under the base amount"}; the threshold is {money(r.threshold)}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Your filing threshold" value={money(r.threshold)} />
        <Stat label="Income that counts" value={money(r.grossIncome)} />
        <Stat label="Taxable Social Security" value={money(r.taxableSs)} />
      </div>
      {!r.mustFile && s.wh > 0 ? (
        <div className="mt-5">
          <Callout tone="sage" title="File anyway to get your money back">
            <p>You had {money(s.wh)} withheld. The only way to get it refunded is to file a return.</p>
          </Callout>
        </div>
      ) : null}
      <MiniTable head={["2026 filing threshold", "Under 65", "65 or older"]} rows={(["single", "hoh", "mfj"] as const).map((f) => [FS_OPTIONS.find((o) => o.value === f)!.label, money(standardDeduction(f, 0, 0).total), f === "mfj" ? `${money(standardDeduction(f, 1, 0).total)} / ${money(standardDeduction(f, 2, 0).total)}` : money(standardDeduction(f, 1, 0).total)])} />
      <ShowMath>
        <p>
          IRS Publication 501: you must file if your gross income is at least your standard deduction including the extra amount for age (married filing separately: $5). Social Security counts only when half of it plus your other income and tax-exempt interest exceeds $25,000 ($32,000 joint), and then only the taxable part. The $6,000 senior deduction doesn&rsquo;t raise the threshold.
        </p>
      </ShowMath>
      <NextStep href="/taxable-social-security-calculator" title="How much of your Social Security is taxable?" why="The full IRS worksheet with the tax estimate." />
      <div className="mt-6">
        <ShareBar tool="filing" subject="Do I have to file taxes?" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.mustFile ? "You must file" : "No return required"} />;
}
