"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BirthDateField } from "@/components/ui/Fields";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { useUrlState, date } from "@/hooks/useUrlState";
import { drcPerMonth } from "@/lib/calc/ss-core";
import type { YMD } from "@/lib/calc/dates";
import { MONTHS } from "@/lib/format";
import { SRC } from "@/data/params/sources";
import { CLAIMING_RULES } from "@/data/params/social-security";
import { EARLY_REDUCTION, MEDICARE_ENROLLMENT, SS_AGES } from "@/data/params/birth-year-extra";
import { track } from "@/lib/analytics";
import {
  isBirthYear,
  monthLabel,
  pct1,
  pct3,
  pctOfPiaAtAge,
  drcPerYearLabel,
  fractionOfOnePct,
  finderDob,
  fraFinder,
  AGE_EARLY,
  AGE_DRC_STOP,
  FINDER_DEFAULT_DOB,
  FINDER_FIRST_YEAR,
  FINDER_LAST_YEAR,
} from "./basics";

const TIER = EARLY_REDUCTION.value.firstTierMonths;
const fmtDob = (d: YMD) => `${d.year}-${d.month}-${d.day}`;
const longDob = (d: YMD) => `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;

/**
 * "Enter your birth date → your full retirement age month" (20 CFR 404.409; POMS GN 00302.400 day-before rule;
 * POMS RS 00202.010 first month at 62; 20 CFR 404.410 / 404.313 for the percentages). Math lives in basics.fraFinder.
 */
export function FraFinder() {
  const { state: s, set } = useUrlState({ dob: FINDER_DEFAULT_DOB }, { dob: date });
  const dob = finderDob(s.dob);
  const r = fraFinder(dob);
  const { fra: f, cohort, fraMonth: fm, earliest, early, late, survivorFra: surv, medicare: med, base, baseMonth, jan1, firstOfMonth, born2nd, calendarFra } = r;

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    const key = `${cohort}|${f.total}|${jan1}|${firstOfMonth}|${born2nd}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_fra_result", { cohort, fraMonths: f.total, jan1, firstOfMonth, born2nd });
    }, 1200);
    return () => clearTimeout(t);
  }, [cohort, f.total, jan1, firstOfMonth, born2nd]);

  const inputs = (
    <>
      <BirthDateField
        label="Your date of birth"
        value={dob}
        onChange={(v) => set("dob", v)}
        minYear={FINDER_FIRST_YEAR}
        maxYear={FINDER_LAST_YEAR}
        hint="The exact day matters: Social Security treats people born on the 1st (and January 1) differently."
      />
      <p className="text-[1rem] leading-relaxed text-ink-3">
        Married? Run it again with your spouse’s birth date — each of you has your own full retirement age.
      </p>
    </>
  );

  const links: { href: string; icon: AnyIcon; title: string; sub: string }[] = [
    ...(isBirthYear(dob.year)
      ? [{ href: `/social-security-by-birth-year/${dob.year}`, icon: "calendar" as const, title: `Every date for people born in ${dob.year}`, sub: "Medicare, RMDs, COLAs and life expectancy" }]
      : []),
    { href: `/social-security-break-even-calculator?dob=${fmtDob(dob)}`, icon: "clock", title: "When should I claim?", sub: `Compare ${AGE_EARLY}, ${f.label} and ${AGE_DRC_STOP} in dollars` },
    { href: `/social-security-earnings-limit-calculator?dob=${fmtDob(dob)}`, icon: "work", title: "Working before full retirement age?", sub: "See what the earnings test withholds" },
    { href: `/rmd-calculator?dob=${fmtDob(dob)}`, icon: "rmd", title: "When do my RMDs start?", sub: "Your required minimum distribution age" },
  ];

  const result = (
    <>
      <ResultHero
        label={`Full retirement age: ${f.label}`}
        value={monthLabel(fm)}
        sub={
          <>
            Born {longDob(dob)}, you reach full retirement age in <strong>{monthLabel(fm)}</strong>. From that month Social Security pays 100% of your benefit,
            and the earnings test stops.
          </>
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Earliest month you can claim" value={monthLabel(earliest)} sub={`Pays ${pct1(early.factor)} of your full benefit, for life`} />
        <Stat label={`Biggest check: age ${AGE_DRC_STOP}`} value={monthLabel(late.claimMonth)} sub={`Pays ${pct1(late.factor)} — no credits after this`} tone="sage" />
        <Stat label={`Medicare at ${MEDICARE_ENROLLMENT.value.eligibilityAge}`} value={monthLabel(med)} sub="Not tied to your full retirement age" />
        <Stat label="Survivor full retirement age" value={surv.label} sub="If you claim as a widow or widower" />
      </div>

      {jan1 ? (
        <div className="mt-5">
          <Callout tone="sky" title={`Born on January 1: SSA counts you with ${dob.year - 1}`}>
            You reach every age on December 31, the day before your birthday, so your full retirement age is <strong>{f.label}</strong>
            {f.total !== calendarFra.total ? <> — not the {calendarFra.label} that applies to the rest of {dob.year}</> : null}. You can also claim in your
            birthday month and Medicare starts in December.
          </Callout>
        </div>
      ) : firstOfMonth ? (
        <div className="mt-5">
          <Callout tone="sky" title="Born on the 1st: everything moves one month earlier">
            Social Security treats you as born in {MONTHS[(dob.month + 10) % 12]}, so you reach full retirement age, Medicare and 70 one month before your
            birthday month. You can start benefits in the month of your {AGE_EARLY}nd birthday instead of the month after, but by Social Security’s count
            that is already {AGE_EARLY} and 1 month: it pays {pct1(early.factor)} of your full benefit, not the {pct1(pctOfPiaAtAge(cohort, AGE_EARLY))} someone born
            on the 2nd gets for that month.
          </Callout>
        </div>
      ) : born2nd ? (
        <div className="mt-5">
          <Callout tone="sky" title="Born on the 2nd: you can start a month sooner">
            You are {AGE_EARLY} for the whole of your birthday month, so benefits can start in {monthLabel(earliest)} — most people must wait until the month
            after their {AGE_EARLY}nd birthday.
          </Callout>
        </div>
      ) : null}

      <ShowMath>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Social Security says you reach each age on the day before your birthday: <strong>{longDob(base)}</strong>. That puts you in the{" "}
            <strong>{cohort}</strong> birth-year group.
          </li>
          <li>
            Full retirement age for {cohort} (20 CFR 404.409): <strong>{f.label}</strong>. {monthLabel(baseMonth)} + {f.years} years
            {f.months ? ` ${f.months} months` : ""} = <strong>{monthLabel(fm)}</strong>.
          </li>
          <li>
            You must be {AGE_EARLY} for the whole month to start early, so the first month is <strong>{monthLabel(earliest)}</strong>: {early.monthsEarly} months
            early. Reduction: {fractionOfOnePct(CLAIMING_RULES.earlyFirst36PerMonth)} for each of the first {Math.min(early.monthsEarly, TIER)} months
            {early.monthsEarly > TIER ? (
              <>
                , plus {fractionOfOnePct(CLAIMING_RULES.earlyBeyond36PerMonth)} for the other {early.monthsEarly - TIER}
              </>
            ) : null}{" "}
            → <strong>{pct3(early.factor)}</strong> of your full benefit.
          </li>
          <li>
            Waiting past full retirement age earns {drcPerYearLabel(cohort)} a year ({pct3(drcPerMonth(cohort))} a month) until {AGE_DRC_STOP}:{" "}
            {late.monthsDelayed} months → <strong>{pct3(late.factor)}</strong>.
          </li>
          <li>
            Survivor benefits use their own schedule: full at <strong>{surv.label}</strong>, or {pct1(r.survivorPctAt60)} of the deceased’s benefit at{" "}
            {SS_AGES.value.earliestSurvivor}.
          </li>
        </ol>
        <p className="mt-3">
          Sources:{" "}
          <a className="link" href={SRC.ssaFra.url} target="_blank" rel="noopener">
            SSA full retirement age by birth year
          </a>{" "}
          and{" "}
          <a className="link" href={SRC.ssaArDrc.url} target="_blank" rel="noopener">
            SSA’s early and delayed retirement table
          </a>
          .
        </p>
      </ShowMath>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
            <Icon name={l.icon} size={20} className="mt-0.5 shrink-0 text-sun-ink" />
            <span>
              <span className="block font-bold text-ink">{l.title}</span>
              <span className="mt-1 block text-[0.95rem] text-ink-3">{l.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <CalculatorShell
      id="fra-finder"
      inputsTitle="Your birth date"
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="fra" subject="My Social Security full retirement age" />
          </div>
        </>
      }
      mobileSummary={`Full retirement age: ${monthLabel(fm)}`}
    />
  );
}
