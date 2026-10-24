/**
 * Light, client-safe helpers shared by the birth-year pages and the FRA finder widget (no large tables imported here).
 * Rules: 20 CFR 404.409/404.410/404.313 via ss-core; Medicare age eligibility 42 CFR 407.14 (month you attain 65).
 */
import {
  fraForCohort,
  earlyRetirementFactor,
  drcPerMonth,
  fra,
  cohortYear,
  fraMonth,
  earliestRetirementMonth,
  age70Month,
  claimFactor,
  survivorFraForCohort,
  survivorFactor,
} from "@/lib/calc/ss-core";
import { attainmentBase, daysInMonth, fromMonthIndex, monthIndex, type YMD } from "@/lib/calc/dates";
import { MEDICARE_ENROLLMENT, SS_AGES } from "@/data/params/birth-year-extra";
import { MONTHS, MONTHS_SHORT } from "@/lib/format";

export const BIRTH_YEAR_FIRST = 1943;
export const BIRTH_YEAR_LAST = 1975;
export const BIRTH_YEARS: number[] = Array.from({ length: BIRTH_YEAR_LAST - BIRTH_YEAR_FIRST + 1 }, (_, i) => BIRTH_YEAR_FIRST + i);
export const isBirthYear = (y: number) => Number.isInteger(y) && y >= BIRTH_YEAR_FIRST && y <= BIRTH_YEAR_LAST;

export const { earliestRetirement: AGE_EARLY, drcStops: AGE_DRC_STOP } = SS_AGES.value;

/** Claiming ages shown in the tables: 62, 63, … 70. */
export const CLAIM_AGES: number[] = Array.from({ length: AGE_DRC_STOP - AGE_EARLY + 1 }, (_, i) => AGE_EARLY + i);

// ---------------------------------------------------------------------------------------------------------------
// Month helpers
// ---------------------------------------------------------------------------------------------------------------

export const monthLabel = (idx: number) => {
  const { year, month } = fromMonthIndex(idx);
  return `${MONTHS[month - 1]} ${year}`;
};
export const monthShort = (idx: number) => {
  const { year, month } = fromMonthIndex(idx);
  return `${MONTHS_SHORT[month - 1]} ${year}`;
};
/** "Mar – Sep 2025" or "Nov 2024 – May 2025". */
export function monthRange(a: number, b: number) {
  const A = fromMonthIndex(a);
  const B = fromMonthIndex(b);
  return A.year === B.year ? `${MONTHS_SHORT[A.month - 1]} – ${MONTHS_SHORT[B.month - 1]} ${B.year}` : `${monthShort(a)} – ${monthShort(b)}`;
}
/** "January–February" / "March–December" / "June". */
export function monthSpan(months: number[]) {
  if (!months.length) return "";
  const first = MONTHS[months[0] - 1];
  const last = MONTHS[months[months.length - 1] - 1];
  return months.length === 1 ? first : `${first}–${last}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Claiming percentages (SSA OACT ar_drc convention)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Benefit as a fraction of the PIA when retirement benefits start in the month the person attains exactly `age`
 * (the convention of SSA OACT's "Effect of early or delayed retirement" table). Early: 5/9% for the first 36 months,
 * 5/12% beyond (20 CFR 404.410). Late: the cohort's monthly delayed retirement credit, no credits past 70 (404.313).
 */
export function pctOfPiaAtAge(cohort: number, age: number): number {
  const f = fraForCohort(cohort);
  const m = age * 12;
  if (m < f.total) return earlyRetirementFactor(f.total - m);
  return 1 + (Math.min(m, AGE_DRC_STOP * 12) - f.total) * drcPerMonth(cohort);
}

/** Benefit fraction for someone (birthday between the 3rd and the 31st) who starts in the first possible month: 62 and 1 month. */
export function pctAtFirstPossibleMonth(cohort: number) {
  const f = fraForCohort(cohort);
  return earlyRetirementFactor(f.total - AGE_EARLY * 12 - 1);
}

/** Month (index) a person first meets Medicare's age requirement: the month they attain 65 (day-before rule). */
export function medicareMonth(dob: YMD) {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month) + MEDICARE_ENROLLMENT.value.eligibilityAge * 12;
}

export const pct1 = (x: number) => `${(x * 100).toFixed(1).replace(/\.0$/, "")}%`;
/** Delayed retirement credit per year for a cohort, e.g. "8%" or "6.5%". */
export const drcPerYearLabel = (cohort: number) => pct1(drcPerMonth(cohort) * 12);
/** Percent with up to 3 decimals, as SSA prints its fractions (86⅔ → 86.667%). */
export const pct3 = (x: number) => `${(Math.round(x * 100000) / 1000).toString()}%`;

export const rmdAgeLabel = (age: number) => (age === 70.5 ? "70½" : String(age));

/** "2025–26" for consecutive years, "2019 or 2021" otherwise. */
export const shortRange = (ys: number[]) =>
  ys.length < 2 ? String(ys[0]) : ys[ys.length - 1] - ys[0] === ys.length - 1 ? `${ys[0]}–${String(ys[ys.length - 1]).slice(2)}` : ys.join(" or ");

/**
 * A per-month rate as SSA writes it: 5/9/100 → "5/9 of 1%", 2/3/100 → "2/3 of 1%", 0.08 → "8%".
 * Used so prose shows the exact fraction from params (CLAIMING_RULES) instead of a typed-in number.
 */
export function fractionOfOnePct(rate: number): string {
  const x = rate * 100;
  for (let d = 1; d <= 48; d++) {
    const n = Math.round(x * d);
    if (n > 0 && Math.abs(x * d - n) < 1e-9) return d === 1 ? `${n}%` : `${n}/${d} of 1%`;
  }
  return `${+x.toFixed(3)}%`;
}

// ---------------------------------------------------------------------------------------------------------------
// Full-retirement-age finder (/full-retirement-age)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Birth years the finder offers. The first is 1934 because a January 1, 1934 birthday belongs to the 1933 cohort, the
 * earliest one ss-core has a delayed-credit rate for (POMS RS 00615.692: 11/24 of 1%); January 1, 1933 would fall in 1932.
 */
export const FINDER_FIRST_YEAR = 1934;
export const FINDER_LAST_YEAR = 1995;
export const FINDER_DEFAULT_DOB: YMD = { year: 1960, month: 6, day: 15 };

/** Keep a date (e.g. from ?dob=) inside what the finder supports: unknown years fall back to the default, day 31 → month end. */
export function finderDob(d: YMD): YMD {
  if (!Number.isInteger(d.year) || d.year < FINDER_FIRST_YEAR || d.year > FINDER_LAST_YEAR) return FINDER_DEFAULT_DOB;
  if (!Number.isInteger(d.month) || d.month < 1 || d.month > 12) return FINDER_DEFAULT_DOB;
  return { ...d, day: Math.max(1, Math.min(d.day, daysInMonth(d.year, d.month))) };
}

/**
 * Everything the finder shows for one birth date. Rules: FRA by cohort (20 CFR 404.409) with the day-before attainment
 * rule (POMS GN 00302.400); first month at 62 = first month the person is 62 throughout (POMS RS 00202.010) — so only a
 * birthday on the 1st or 2nd can start in the birthday month, and only the 2nd gets the full number of reduction months;
 * reductions 20 CFR 404.410; delayed credits to the month of 70 (404.313); survivor FRA 404.409(b); Medicare 42 CFR 407.14.
 */
export function fraFinder(dob: YMD) {
  const f = fra(dob);
  const cohort = cohortYear(dob);
  const base = attainmentBase(dob);
  const survivorFra = survivorFraForCohort(cohort);
  const jan1 = dob.month === 1 && dob.day === 1;
  return {
    fra: f,
    cohort,
    /** The day SSA says you attain each age (the day before the birthday). */
    base,
    baseMonth: monthIndex(base.year, base.month),
    fraMonth: fraMonth(dob),
    earliest: earliestRetirementMonth(dob),
    early: claimFactor(dob, earliestRetirementMonth(dob)),
    late: claimFactor(dob, age70Month(dob)),
    medicare: medicareMonth(dob),
    survivorFra,
    survivorPctAt60: survivorFactor(survivorFra.total - SS_AGES.value.earliestSurvivor * 12, survivorFra),
    jan1,
    firstOfMonth: dob.day === 1 && !jan1,
    born2nd: dob.day === 2,
    /** FRA for the calendar birth year (differs from `fra` only for some January 1 birthdays). */
    calendarFra: fraForCohort(dob.year),
  };
}
