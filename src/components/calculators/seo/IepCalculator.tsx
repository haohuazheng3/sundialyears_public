"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField } from "@/components/ui/Fields";
import { useUrlState, date } from "@/hooks/useUrlState";
import { initialEnrollment } from "@/lib/calc/medicare-more";
import { NextStep, useResultTrack, monthLabel, MiniTable } from "./kit";

const D = { dob: { year: 1961, month: 11, day: 20 } };

export function IepCalculator() {
  const { state: s, set } = useUrlState(D, { dob: date });
  const r = initialEnrollment(s.dob);
  const born1st = s.dob.day === 1;
  useResultTrack("calc_iep_result", `${s.dob.year}-${s.dob.month}-${s.dob.day}`, { born1st });

  const inputs = (
    <>
      <BirthDateField value={s.dob} onChange={(v) => set("dob", v)} minYear={1955} maxYear={1975} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Your Medicare sign-up window" value={`${monthLabel(r.first).split(" ")[0]} – ${monthLabel(r.last)}`} tone="sun" sub={<>Sign up by the end of <strong>{monthLabel(r.m65 - 1)}</strong> and coverage starts <strong>{monthLabel(r.m65).replace(" ", " 1, ")}</strong>, with no gap.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Window opens" value={monthLabel(r.first)} />
        <Stat label="Medicare month" value={monthLabel(r.m65)} sub={born1st ? "born on the 1st: a month early" : "your 65th birthday month"} tone="sage" />
        <Stat label="Window closes" value={monthLabel(r.last)} sub="last day of the month" />
      </div>
      <MiniTable
        head={["If you sign up in", "Coverage starts"]}
        rows={r.rows.map((x) => [monthLabel(x.signup), `${monthLabel(x.coverage).replace(" ", " 1, ")}${x.phase === "before" ? " (no gap)" : ""}`])}
      />
      <div className="mt-5">
        <Callout tone="ember" title="Miss the window and Part B costs more for life">
          <p>Unless you have job-based coverage from current work, signing up later means waiting for the January–March General Enrollment Period and a 10% Part B penalty for each full year late.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Your Initial Enrollment Period is 7 months: the 3 months before the month you turn 65, that month, and the 3 months after. Since 2023, signing up during or after your birthday month starts coverage the first day of the following month. People born on the 1st reach 65 the day before, so everything moves one month earlier. If you already get Social Security, enrollment in Parts A and B is automatic.
        </p>
      </ShowMath>
      <NextStep href="/medigap-open-enrollment-period" title="Your Medigap window starts with Part B" why="Find the 6 months when insurers can't turn you down." />
      <div className="mt-6">
        <ShareBar tool="iep" subject="My Medicare sign-up window" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Sign up: ${monthLabel(r.first)} – ${monthLabel(r.last)}`} />;
}
