/**
 * Social Security core rules shared by every SS calculator.
 * Sources: 20 CFR 404.409 (FRA), 404.410 (reductions), 404.313 (DRCs), 404.311 (entitlement);
 * SSA POMS GN 00302.400 (age attainment), RS 00615.101/.201/.301/.692; ssa.gov/oact/ProgData/ar_drc.html.
 */
import { attainmentBase, fromMonthIndex, monthIndex, type YMD } from "./dates";

export interface Fra {
  years: number;
  months: number;
  /** total months, e.g. 66y10m → 802 */
  total: number;
  label: string; // "66 and 10 months"
}

const mk = (years: number, months: number): Fra => ({
  years,
  months,
  total: years * 12 + months,
  label: months ? `${years} and ${months} month${months === 1 ? "" : "s"}` : `${years}`,
});

/** Retirement (and spousal) full retirement age by SSA cohort year (= year of the day before the birthday). */
export function fraForCohort(cohortYear: number): Fra {
  if (cohortYear <= 1937) return mk(65, 0);
  if (cohortYear <= 1942) return mk(65, (cohortYear - 1937) * 2);
  if (cohortYear <= 1954) return mk(66, 0);
  if (cohortYear <= 1959) return mk(66, (cohortYear - 1954) * 2);
  return mk(67, 0);
}

/** Survivor (widow/widower) full retirement age by the survivor's cohort year — differs from retirement FRA. */
export function survivorFraForCohort(cohortYear: number): Fra {
  if (cohortYear <= 1911) return mk(62, 0);
  if (cohortYear <= 1939) return mk(65, 0);
  if (cohortYear <= 1944) return mk(65, (cohortYear - 1939) * 2);
  if (cohortYear <= 1956) return mk(66, 0);
  if (cohortYear <= 1961) return mk(66, (cohortYear - 1956) * 2);
  return mk(67, 0);
}

export function cohortYear(dob: YMD) {
  return attainmentBase(dob).year;
}

export function fra(dob: YMD): Fra {
  return fraForCohort(cohortYear(dob));
}

/** Month index (year*12 + month0) in which FRA is attained. */
export function fraMonth(dob: YMD): number {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month) + fra(dob).total;
}

/** Month in which age 70 is attained (DRCs stop accruing; claiming any later adds nothing). */
export function age70Month(dob: YMD): number {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month) + 70 * 12;
}

/**
 * First month a retirement benefit can be paid: the first month the person is 62 THROUGHOUT the month.
 * Attained on the 1st (born on the 1st or 2nd) → that month; otherwise the following month.
 */
export function earliestRetirementMonth(dob: YMD): number {
  const a = attainmentBase(dob);
  const m62 = monthIndex(a.year, a.month) + 62 * 12;
  return a.day === 1 ? m62 : m62 + 1;
}

/** Monthly delayed-retirement-credit rate by cohort (fraction of PIA per month). */
export function drcPerMonth(cohort: number): number {
  if (cohort >= 1943) return 2 / 3 / 100;
  if (cohort >= 1941) return 5 / 8 / 100;
  if (cohort >= 1939) return 7 / 12 / 100;
  if (cohort >= 1937) return 13 / 24 / 100;
  if (cohort >= 1935) return 1 / 2 / 100;
  if (cohort >= 1933) return 11 / 24 / 100;
  return 0;
}

/** Retirement benefit as a fraction of PIA for `rf` months of early entitlement (5/9% then 5/12%). */
export function earlyRetirementFactor(rf: number): number {
  if (rf <= 0) return 1;
  const first = Math.min(rf, 36);
  const rest = Math.max(rf - 36, 0);
  return 1 - first * (5 / 9 / 100) - rest * (5 / 12 / 100);
}

/** Spousal benefit as a fraction of the full spousal amount (25/36% then 5/12%). */
export function spousalFactor(rf: number): number {
  if (rf <= 0) return 1;
  const first = Math.min(rf, 36);
  const rest = Math.max(rf - 36, 0);
  return 1 - first * (25 / 36 / 100) - rest * (5 / 12 / 100);
}

/** Survivor benefit factor: 28.5% total reduction spread over the months from 60 to survivor FRA. */
export function survivorFactor(rf: number, survivorFra: Fra): number {
  if (rf <= 0) return 1;
  const n = survivorFra.total - 60 * 12;
  return 1 - (Math.min(rf, n) * 0.285) / n;
}

export interface ClaimResult {
  claimMonth: number; // month index of first entitlement
  monthsEarly: number; // RF
  monthsDelayed: number; // DRC months
  factor: number; // fraction of PIA (before rounding)
  ageAtClaim: { years: number; months: number };
}

/**
 * Benefit factor (fraction of PIA) when retirement benefits start in `claimMonth`.
 * Claims before the earliest month are moved to it; claims after the age-70 month earn no more credits.
 */
export function claimFactor(dob: YMD, claimMonth: number): ClaimResult {
  const earliest = earliestRetirementMonth(dob);
  const m = Math.max(claimMonth, earliest);
  const f = fraMonth(dob);
  const m70 = age70Month(dob);
  const a = attainmentBase(dob);
  const birthIdx = monthIndex(a.year, a.month);
  const ageMonths = m - birthIdx;
  if (m < f) {
    const rf = f - m;
    return { claimMonth: m, monthsEarly: rf, monthsDelayed: 0, factor: earlyRetirementFactor(rf), ageAtClaim: { years: Math.floor(ageMonths / 12), months: ageMonths % 12 } };
  }
  const drcMonths = Math.min(m, m70) - f;
  return {
    claimMonth: m,
    monthsEarly: 0,
    monthsDelayed: drcMonths,
    factor: 1 + drcMonths * drcPerMonth(cohortYear(dob)),
    ageAtClaim: { years: Math.floor(ageMonths / 12), months: ageMonths % 12 },
  };
}

/** Month index at which the person is exactly `years`+`months` old under SSA attainment rules. */
export function monthAtAge(dob: YMD, years: number, months = 0) {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month) + years * 12 + months;
}

export function describeMonth(idx: number) {
  const { year, month } = fromMonthIndex(idx);
  return { year, month, label: `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1]} ${year}` };
}

/** First year a person reaches FRA (for the earnings-test "year you reach FRA" limit). */
export function fraYear(dob: YMD) {
  return fromMonthIndex(fraMonth(dob)).year;
}
