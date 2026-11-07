"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField, Segmented, SelectField } from "@/components/ui/Fields";
import { useUrlState, date, num, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { hsaStop } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack, monthLabel, MONTH_OPTIONS, yearOptions } from "./kit";

const D = { dob: { year: 1960, month: 5, day: 12 }, am: 9, ay: 2027, fam: false };

export function HsaCalculator() {
  const { state: s, set } = useUrlState(D, { dob: date, am: num, ay: num, fam: bool });
  const r = hsaStop({ dob: s.dob, apply: { year: s.ay, month: s.am }, family: s.fam });
  useResultTrack("calc_hsa_result", `${s.dob.year}-${s.dob.month}|${s.ay}-${s.am}|${s.fam}`, { retro: r.retroApplied });

  const inputs = (
    <>
      <BirthDateField value={s.dob} onChange={(v) => set("dob", v)} minYear={1955} maxYear={1975} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="You'll apply for Medicare or Social Security in" value={s.am} onChange={(v) => set("am", v)} options={MONTH_OPTIONS} />
        <SelectField label="Year" value={s.ay} onChange={(v) => set("ay", v)} options={yearOptions(2026, 2040, false)} />
      </div>
      <Segmented label="Your HSA coverage" value={s.fam ? "family" : "self"} onChange={(v) => set("fam", v === "family")} options={[{ value: "self", label: "Self-only" }, { value: "family", label: "Family" }]} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Last month you can contribute" value={r.lastEligible >= 0 ? monthLabel(r.lastEligible) : "—"} tone="sun" sub={<>Part A will start {monthLabel(r.partAStart)}{r.retroApplied ? " — backdated up to 6 months from your application" : ""}. Your {r.year} limit shrinks to <strong>{money(r.prorated)}</strong>.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Part A coverage starts" value={monthLabel(r.partAStart)} />
        <Stat label={`Eligible months in ${r.year}`} value={String(r.monthsEligible)} />
        <Stat label={`Prorated ${r.year} limit`} value={money(r.prorated)} sub={`of ${money(r.annual)} incl. catch-up`} tone="sage" />
      </div>
      {r.retroApplied ? (
        <div className="mt-5">
          <Callout tone="ember" title="The 6-month look-back trap">
            <p>Applying for Social Security after 65 enrolls you in Part A retroactively. Contributions made in those backdated months are excess contributions — withdraw them before your tax deadline to avoid a 6% excise tax.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          You can&rsquo;t contribute to an HSA for any month you&rsquo;re enrolled in Medicare. Part A taken after 65 is backdated up to 6 months, never before the month you turned 65. The yearly limit is prorated by the months you were eligible; the $1,000 catch-up for 55+ is included. Money already in the HSA can still be spent tax-free on qualified costs, including Medicare premiums.
        </p>
      </ShowMath>
      <NextStep href="/when-can-i-sign-up-for-medicare" title="Lining up Medicare dates?" why="Your sign-up window and when coverage starts each month." />
      <div className="mt-6">
        <ShareBar tool="hsa" subject="When to stop HSA contributions" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Stop after ${monthLabel(r.lastEligible)}`} />;
}
