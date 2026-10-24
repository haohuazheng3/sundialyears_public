"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, date } from "@/hooks/useUrlState";
import { applyPlan } from "@/lib/calc/ss-more";
import { prettyDate } from "@/lib/calc/payment-schedule";
import { NextStep, useResultTrack, monthLabel, MONTH_OPTIONS, yearOptions } from "./kit";

const D = { dob: { year: 1964, month: 9, day: 18 }, sm: 10, sy: 2026 };

export function ApplyDateCalculator() {
  const { state: s, set } = useUrlState(D, { dob: date, sm: num, sy: num });
  const p = applyPlan(s.dob, { year: s.sy, month: s.sm });
  const pay = prettyDate(p.firstPayment.date);
  useResultTrack("calc_apply_result", `${s.dob.year}-${s.dob.month}-${s.dob.day}|${s.sy}-${s.sm}`, { moved: p.movedToEarliest });

  const inputs = (
    <>
      <BirthDateField value={s.dob} onChange={(v) => set("dob", v)} minYear={1950} maxYear={1975} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Benefits start in" value={s.sm} onChange={(v) => set("sm", v)} options={MONTH_OPTIONS} />
        <SelectField label="Year" value={s.sy} onChange={(v) => set("sy", v)} options={yearOptions(2026, 2045, false)} />
      </div>
    </>
  );

  const result = (
    <>
      <ResultHero label="Apply any time from" value={monthLabel(p.applyFrom)} tone="sun" sub={<>Your first check — for {monthLabel(p.startMonth)} — arrives <strong>{pay.weekday}, {pay.label}</strong>.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="First benefit month" value={monthLabel(p.startMonth)} />
        <Stat label="First payment" value={pay.short} sub={pay.weekday} tone="sage" />
        <Stat label="Earliest possible start" value={monthLabel(p.earliestStart)} sub="62 for the whole month" />
      </div>
      {p.movedToEarliest ? (
        <div className="mt-5">
          <Callout tone="ember" title="Too early">
            <p>You can&rsquo;t be paid before {monthLabel(p.earliestStart)} — you must be 62 for the entire month — so the plan starts there.</p>
          </Callout>
        </div>
      ) : null}
      <div className="mt-5">
        <Callout tone="sky" title="Sign up for Medicare separately if you're near 65">
          <p>Filing for Social Security at 65 or later enrolls you in Medicare automatically; before 65 it doesn&rsquo;t, and Medicare has its own deadlines.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          SSA accepts applications up to four months before the first month you want benefits. Benefits are paid the month after the month they&rsquo;re for, on the second, third or fourth Wednesday depending on your birth day ({s.dob.day <= 10 ? "1st–10th: second" : s.dob.day <= 20 ? "11th–20th: third" : "21st–31st: fourth"} Wednesday).
        </p>
      </ShowMath>
      <NextStep href={`/social-security-payment-schedule?bd=${s.dob.day}`} title="Every payment date after that" why="Your full payment calendar for 2026 and 2027." />
      <div className="mt-6">
        <ShareBar tool="apply" subject="When to apply for Social Security" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Apply from ${monthLabel(p.applyFrom)}`} />;
}
