"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField, SelectField } from "@/components/ui/Fields";
import { useUrlState, date, num } from "@/hooks/useUrlState";
import { medigapOep } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack, monthLabel, MONTH_OPTIONS, yearOptions } from "./kit";

const D = { dob: { year: 1961, month: 11, day: 20 }, bm: 11, by: 2026 };

export function MedigapOepCalculator() {
  const { state: s, set } = useUrlState(D, { dob: date, bm: num, by: num });
  const r = medigapOep(s.dob, { year: s.by, month: s.bm });
  useResultTrack("calc_medigapoep_result", `${s.dob.year}-${s.dob.month}|${s.by}-${s.bm}`, { under65: r.under65 });

  const inputs = (
    <>
      <BirthDateField value={s.dob} onChange={(v) => set("dob", v)} minYear={1950} maxYear={1975} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Part B starts (month)" value={s.bm} onChange={(v) => set("bm", v)} options={MONTH_OPTIONS} />
        <SelectField label="Year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(2015, 2040, false)} />
      </div>
    </>
  );

  const result = (
    <>
      <ResultHero label="Your Medigap open enrollment" value={`${monthLabel(r.start)} – ${monthLabel(r.end)}`} tone="sun" sub={<>During these 6 months any Medigap insurer in your state must sell you any policy it offers, at its best rate, with no health questions.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Starts" value={`${monthLabel(r.start).replace(" ", " 1, ")}`} />
        <Stat label="Ends" value={`last day of ${monthLabel(r.end)}`} tone="ember" />
      </div>
      {r.under65 ? (
        <div className="mt-5">
          <Callout tone="sky" title="Part B before 65">
            <p>Your federal window waits until you turn 65, even though Part B started earlier. Some states give people under 65 their own Medigap rights.</p>
          </Callout>
        </div>
      ) : null}
      <div className="mt-5">
        <Callout tone="ember" title="It happens once">
          <p>The window can&rsquo;t be paused or repeated. Starting Part B starts the clock, even if you have other coverage — delay Part B if you&rsquo;re still covered by a large employer.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Federal law gives a 6-month Medigap open enrollment period that begins the first month you are both 65 or older and enrolled in Part B. After it ends, insurers in most states can use medical underwriting — charge more or refuse — except in specific guaranteed-issue situations such as losing employer coverage or leaving a Medicare Advantage plan within a trial period.
        </p>
      </ShowMath>
      <NextStep href="/medicare-premium-calculator" title="What Part B and D will cost you" why="Your 2026 and 2027 premiums, including IRMAA." />
      <div className="mt-6">
        <ShareBar tool="medigapoep" subject="My Medigap open enrollment dates" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Medigap: ${monthLabel(r.start)} – ${monthLabel(r.end)}`} />;
}
