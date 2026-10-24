"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField } from "@/components/ui/Fields";
import { useUrlState, date } from "@/hooks/useUrlState";
import { rmdApplicableAge, firstRmdYear } from "@/lib/calc/rmd";
import { RMD_AGE_RULES } from "@/data/params/rmd";
import { NextStep, useResultTrack, MiniTable } from "./kit";

const D = { dob: { year: 1953, month: 6, day: 14 } };

export function RmdAgeCalculator() {
  const { state: s, set } = useUrlState(D, { dob: date });
  const age = rmdApplicableAge(s.dob);
  const first = firstRmdYear(s.dob);
  const dobStr = `${s.dob.year}-${String(s.dob.month).padStart(2, "0")}-${String(s.dob.day).padStart(2, "0")}`;
  const rule = RMD_AGE_RULES.value.find((r) => r.bornBefore == null || dobStr < r.bornBefore)!;
  useResultTrack("calc_rmdage_result", dobStr, { age, first });

  const inputs = <BirthDateField value={s.dob} onChange={(v) => set("dob", v)} minYear={1940} maxYear={1975} />;

  const result = (
    <>
      <ResultHero label="Your RMD age" value={String(age)} tone="sun" sub={<>Your first RMD is for <strong>{first}</strong>. You can take it as late as <strong>April 1, {first + 1}</strong>, but every later one is due by December 31.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="First RMD year" value={String(first)} />
        <Stat label="First deadline" value={`Apr 1, ${first + 1}`} tone="ember" />
        <Stat label="Second deadline" value={`Dec 31, ${first + 1}`} />
      </div>
      <div className="mt-5">
        <Callout tone="ember" title="The double-RMD trap">
          <p>Waiting until April 1, {first + 1} puts two RMDs — {first} and {first + 1} — in the same tax year. That can push you into a higher bracket and an IRMAA tier two years later. Most people are better off taking the first one by December 31, {first}.</p>
        </Callout>
      </div>
      <MiniTable head={["Born", "RMD age"]} rows={RMD_AGE_RULES.value.map((r) => [r.label, String(r.age)])} hit={RMD_AGE_RULES.value.indexOf(rule)} />
      <ShowMath>
        <p>
          SECURE 2.0 set the RMD age at 73 for people born 1951–1959 and 75 for 1960 or later. Your first RMD is for the year you reach that age; the deadline for that first one is April 1 of the next year (the &ldquo;required beginning date&rdquo;). Roth IRAs and, since 2024, Roth 401(k)s have no lifetime RMDs. Still working? Your current employer&rsquo;s plan may let you wait until you retire (not for IRAs, and not if you own 5%+ of the company).
        </p>
      </ShowMath>
      <NextStep href={`/rmd-calculator?dob=${s.dob.year}-${s.dob.month}-${s.dob.day}`} title="Now see the dollar amount" why="Your RMD from your balance, with the year-by-year projection." />
      <div className="mt-6">
        <ShareBar tool="rmdage" subject="My RMD age and deadline" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`RMD age ${age} · first for ${first}`} />;
}
