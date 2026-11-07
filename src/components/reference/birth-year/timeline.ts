/**
 * Birth-year reference math for /full-retirement-age and /social-security-by-birth-year/[year].
 * Pure and deterministic: no clock reads — the "current" year is always passed in (SITE.copyrightYear).
 *
 * Rules:
 * - Full retirement age (FRA) and survivor FRA by birth date: 20 CFR 404.409; SSA OACT nra.html.
 * - Age attainment on the day before the birthday (Jan 1 births use the prior year; 1st-of-month births the prior month):
 *   POMS GN 00302.400.
 * - First month of entitlement at 62 ("62 throughout the month"): POMS RS 00202.010; 20 CFR 404.311.
 * - Early reduction 5/9% then 5/12% per month (20 CFR 404.410) and delayed credits by cohort (20 CFR 404.313,
 *   POMS RS 00615.692) — reproduced against SSA OACT ar_drc.html in the tests.
 * - COLAs apply to the PIA from the December of the year you reach 62, claimed or not: 20 CFR 404.212.
 * - Medicare Initial Enrollment Period = 7 months around the month you reach 65: 42 CFR 407.14(a).
 * - RMD applicable age: Treas. Reg. §1.401(a)(9)-2(b)(2) (born 1959 → 73 under the proposed regulations only).
 * - Senior deduction (IRC §151(d)(5)(C), tax years 2025–2028): IRS Schedule 1-A "born before January 2, …".
 */
import {
  fraForCohort,
  survivorFraForCohort,
  drcPerMonth,
  survivorFactor,
  fraMonth,
  earliestRetirementMonth,
  age70Month,
  type Fra,
} from "@/lib/calc/ss-core";
import { fromMonthIndex } from "@/lib/calc/dates";
import { rmdApplicableAge, firstRmdYear } from "@/lib/calc/rmd";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { PERIOD_LIFE_TABLE } from "@/data/generated/period-life-table";
import { SENIOR_DEDUCTION } from "@/data/params/tax";
import { SS_YEAR } from "@/data/params/social-security";
import { EARNINGS_TEST_RATIO, MEDICARE_ENROLLMENT, SS_AGES } from "@/data/params/birth-year-extra";
import { MONTHS, money } from "@/lib/format";
import { AGE_DRC_STOP, AGE_EARLY, CLAIM_AGES, isBirthYear, monthSpan, pctAtFirstPossibleMonth, pctOfPiaAtAge, medicareMonth, rmdAgeLabel } from "./basics";

export * from "./basics";

// ---------------------------------------------------------------------------------------------------------------
// Charts on /full-retirement-age
// ---------------------------------------------------------------------------------------------------------------

export interface CohortGroup {
  /** Display label, e.g. "1943–1954", "1957", "1960 or later". */
  label: string;
  from: number;
  to: number;
  /** Representative cohort year used for the numbers. */
  cohort: number;
  /** Birth-year page to link, when every year in the group has one. */
  href?: string;
}

/** Merge consecutive cohorts that share the same key into labeled groups. */
function groupCohorts(from: number, to: number, key: (c: number) => string, first: string | null, last: string | null): CohortGroup[] {
  const out: CohortGroup[] = [];
  for (let c = from; c <= to; c++) {
    const prev = out[out.length - 1];
    if (prev && key(prev.to) === key(c)) prev.to = c;
    else out.push({ label: "", from: c, to: c, cohort: c });
  }
  return out.map((g, i) => {
    let label = g.from === g.to ? `${g.from}` : `${g.from}–${g.to}`;
    if (i === 0 && first) label = first;
    if (i === out.length - 1 && last) label = last;
    const href = g.from === g.to && isBirthYear(g.from) ? `/social-security-by-birth-year/${g.from}` : undefined;
    return { ...g, label, href };
  });
}

export interface FraChartRow extends CohortGroup {
  fra: Fra;
  monthsEarlyAt62: number;
  pctAt62: number;
  drcPerYear: number;
  pctAt70: number;
}

/** FRA chart from "1937 or earlier" to "1960 or later" (20 CFR 404.409(a)). Numbers for the first row are the 1937 cohort's. */
export function fraChartRows(): FraChartRow[] {
  const groups = groupCohorts(1937, 1960, (c) => `${fraForCohort(c).total}|${drcPerMonth(c)}`, "1937 or earlier", "1960 or later");
  return groups.map((g) => {
    const fra = fraForCohort(g.cohort);
    return {
      ...g,
      fra,
      monthsEarlyAt62: fra.total - AGE_EARLY * 12,
      pctAt62: pctOfPiaAtAge(g.cohort, AGE_EARLY),
      drcPerYear: drcPerMonth(g.cohort) * 12,
      pctAt70: pctOfPiaAtAge(g.cohort, AGE_DRC_STOP),
    };
  });
}

export interface ClaimingRow extends CohortGroup {
  fra: Fra;
  /** Fraction of PIA at each of CLAIM_AGES. */
  pcts: number[];
}

/** Benefit % at every claiming age 62–70 for cohorts 1943 and later (same groups as SSA's ar_drc table). */
export function claimingRows(): ClaimingRow[] {
  return groupCohorts(1943, 1960, (c) => `${fraForCohort(c).total}`, null, "1960 or later").map((g) => ({
    ...g,
    fra: fraForCohort(g.cohort),
    pcts: CLAIM_AGES.map((a) => pctOfPiaAtAge(g.cohort, a)),
  }));
}

export interface SurvivorRow extends CohortGroup {
  fra: Fra;
  monthsFrom60: number;
  pctAt60: number;
}

/** Survivor (widow/widower) full retirement age by the survivor's birth year (20 CFR 404.409(b); POMS RS 00615.301). */
export function survivorRows(): SurvivorRow[] {
  const { earliestSurvivor } = SS_AGES.value;
  return groupCohorts(1939, 1962, (c) => `${survivorFraForCohort(c).total}`, "1939 or earlier", "1962 or later").map((g) => {
    const fra = survivorFraForCohort(g.cohort);
    const n = fra.total - earliestSurvivor * 12;
    return { ...g, fra, monthsFrom60: n, pctAt60: survivorFactor(n, fra) };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// One birth year
// ---------------------------------------------------------------------------------------------------------------

export interface BirthMonthRow {
  month: number; // 1–12
  monthName: string;
  fraMonth: number;
  fraYear: number;
  earliestClaim: number;
  medicare: number;
  iepStart: number;
  iepEnd: number;
  age70: number;
}

/** Key months for a birthday in each month of `year` (assumes a birthday between the 3rd and the last day of the month). */
export function birthMonthRows(year: number): BirthMonthRow[] {
  const { monthsBefore, monthsAfter } = MEDICARE_ENROLLMENT.value;
  return MONTHS.map((name, i) => {
    const dob = { year, month: i + 1, day: 15 };
    const fm = fraMonth(dob);
    const med = medicareMonth(dob);
    return {
      month: i + 1,
      monthName: name,
      fraMonth: fm,
      fraYear: fromMonthIndex(fm).year,
      earliestClaim: earliestRetirementMonth(dob),
      medicare: med,
      iepStart: med - monthsBefore,
      iepEnd: med + monthsAfter,
      age70: age70Month(dob),
    };
  });
}

export interface YearGroup {
  year: number;
  months: number[]; // birth months (1–12)
}

function groupByYear(rows: { month: number; y: number }[]): YearGroup[] {
  const out: YearGroup[] = [];
  for (const r of rows) {
    const g = out.find((x) => x.year === r.y);
    if (g) g.months.push(r.month);
    else out.push({ year: r.y, months: [r.month] });
  }
  return out;
}

export interface RmdGroup {
  age: 70.5 | 72 | 73 | 75;
  firstYear: number;
  months: number[];
}

/** RMD applicable age and first distribution year by birth month (the 1949 cohort splits at July 1; 70½ cohorts split by half-year). */
export function rmdGroups(year: number): RmdGroup[] {
  const out: RmdGroup[] = [];
  for (let m = 1; m <= 12; m++) {
    const dob = { year, month: m, day: 15 };
    const age = rmdApplicableAge(dob);
    const firstYear = firstRmdYear(dob);
    const g = out.find((x) => x.age === age && x.firstYear === firstYear);
    if (g) g.months.push(m);
    else out.push({ age, firstYear, months: [m] });
  }
  return out;
}


/** Tax years (of 2025–2028) in which someone born in `year` qualifies for the senior deduction by age. */
export function seniorDeductionYears(year: number) {
  const { years, birthCutoff } = SENIOR_DEDUCTION.value;
  const cutoff = (t: number) => birthCutoff[t as keyof typeof birthCutoff];
  return {
    /** Born January 2 – December 31. */
    typical: years.filter((t) => `${year}-12-31` < cutoff(t)),
    /** Born January 1 (treated as 65 a year earlier). */
    jan1: years.filter((t) => `${year}-01-01` < cutoff(t)),
    all: years,
  };
}

export interface ColaRow {
  effectiveDec: number;
  paidJan: number;
  pct: number;
}

/**
 * COLAs credited to the PIA since the year the cohort turned 62 (20 CFR 404.212): every COLA effective in December
 * of the age-62 year or later, whether or not benefits were claimed. `cumulative` ignores SSA's dime rounding.
 */
export function colasSince62(year: number) {
  const firstEffective = year + AGE_EARLY;
  const keys = Object.keys(COLA_BY_EFFECTIVE_YEAR)
    .map(Number)
    .sort((a, b) => a - b);
  const latest = keys[keys.length - 1];
  const rows: ColaRow[] = [];
  for (let y = firstEffective; y <= latest; y++) {
    const pct = COLA_BY_EFFECTIVE_YEAR[y];
    if (pct === undefined) throw new Error(`COLA history is missing December ${y}`);
    rows.push({ effectiveDec: y, paidJan: y + 1, pct });
  }
  const cumulative = rows.reduce((f, r) => f * (1 + r.pct / 100), 1) - 1;
  return {
    firstEffective,
    latest,
    rows,
    cumulative,
    /** COLAs that actually raised benefits (December 2009, 2010 and 2015 had none). */
    raises: rows.filter((r) => r.pct > 0).length,
    /**
     * COLA effective in the December before the age-62 year: a January 1 birthday attains 62 on December 31 of that year
     * (POMS GN 00302.400), so this COLA applies to them too. 0 means there was no COLA that December.
     */
    jan1Extra: COLA_BY_EFFECTIVE_YEAR[firstEffective - 1] as number | undefined,
  };
}

/** 2023 period life table e(x) (SSA OACT table4c6, 2026 Trustees Report). */
export function periodLifeExpectancy(age: number) {
  const r = PERIOD_LIFE_TABLE.find((x) => x[0] === age);
  if (!r) throw new Error(`no period life table row for age ${age}`);
  return { male: r[3], female: r[6] };
}

/**
 * Complete life expectancy at exact age `x` from one-year death probabilities q (q[0] is for `firstAge`), assuming deaths
 * are spread evenly within each year of age: e(x) = Σ (l(t) + l(t+1)) / 2 / l(x). Matches SSA's published cohort e(x)
 * to ±0.01 year (see tests).
 */
export function lifeExpectancyFromQ(q: readonly number[], firstAge: number, x: number): number {
  let l = 1;
  let t = 0;
  for (let a = x; a - firstAge < q.length; a++) {
    const next = l * (1 - q[a - firstAge]);
    t += (l + next) / 2;
    l = next;
  }
  return t;
}

/** Probability of surviving from exact age `x` to exact age `target`. */
export function survivalFromQ(q: readonly number[], firstAge: number, x: number, target: number): number {
  let l = 1;
  for (let a = x; a < target; a++) l *= 1 - q[a - firstAge];
  return l;
}

/** Every date and percentage for one birth year. `refYear` = the site's planning year (SITE.copyrightYear). */
export function birthYearProfile(year: number, refYear: number) {
  const fra = fraForCohort(year);
  const jan1Dob = { year, month: 1, day: 1 };
  const jan1Fra = fraForCohort(year - 1);
  const months = birthMonthRows(year);
  const fraYears = groupByYear(months.map((r) => ({ month: r.month, y: r.fraYear })));
  const mainFraYear = [...fraYears].sort((a, b) => b.months.length - a.months.length)[0].year;
  const pcts = CLAIM_AGES.map((a) => pctOfPiaAtAge(year, a));
  const survivorFra = survivorFraForCohort(year);
  const n60 = survivorFra.total - SS_AGES.value.earliestSurvivor * 12;
  const age62Year = year + AGE_EARLY;
  const age65Year = year + MEDICARE_ENROLLMENT.value.eligibilityAge;
  const age70Year = year + AGE_DRC_STOP;
  return {
    year,
    refYear,
    /** Age reached on the birthday in refYear, and the age before it. */
    ageInRefYear: { before: refYear - year - 1, after: refYear - year },
    fra,
    fraYears,
    mainFraYear,
    jan1: { cohort: year - 1, fra: jan1Fra, fraMonth: fraMonth(jan1Dob), sameFra: jan1Fra.total === fra.total },
    claimAges: CLAIM_AGES,
    pcts,
    pctAt62: pcts[0],
    pctAt70: pcts[pcts.length - 1],
    pctFirstPossibleMonth: pctAtFirstPossibleMonth(year),
    monthsEarlyAt62: fra.total - AGE_EARLY * 12,
    drcPerMonth: drcPerMonth(year),
    survivorFra,
    survivorPctAt60: survivorFactor(n60, survivorFra),
    months,
    age62Year,
    age65Year,
    age70Year,
    rmd: rmdGroups(year),
    senior: seniorDeductionYears(year),
    colas: colasSince62(year),
    period62: periodLifeExpectancy(AGE_EARLY),
    period65: periodLifeExpectancy(MEDICARE_ENROLLMENT.value.eligibilityAge),
  };
}

export type BirthYearProfile = ReturnType<typeof birthYearProfile>;

export type Phase = "past70" | "turning70" | "fraTo70" | "reachingFra" | "62toFra" | "before62";

/** Where the cohort stands in `refYear` (by its most common FRA year). */
export function phaseOf(p: BirthYearProfile): Phase {
  const r = p.refYear;
  if (p.age70Year < r) return "past70";
  if (p.age70Year === r) return "turning70";
  if (p.fraYears.every((g) => g.year < r)) return "fraTo70";
  if (p.fraYears.some((g) => g.year === r || g.year === r + 1) && p.age62Year < r) return "reachingFra";
  if (p.age62Year <= r) return "62toFra";
  return "before62";
}

/** Short labels for the hub grid, derived from the rules (never typed per year). */
export function cohortTags(year: number, refYear: number): string[] {
  const tags: string[] = [];
  const fra = (c: number) => fraForCohort(c).total;
  const f = fraForCohort(year);
  if (drcPerMonth(year) !== drcPerMonth(year - 1)) tags.push(`First year with ${+(drcPerMonth(year) * 1200).toFixed(2)}% delayed credits`);
  if (fra(year) !== fra(year - 1) && fra(year) === fra(year + 1)) tags.push(`First year with FRA ${f.label}`);
  else if (fra(year) === fra(year - 1) && fra(year) !== fra(year + 1)) tags.push(`Last year with FRA ${f.label}`);
  else if (fra(year) !== fra(year - 1) && fra(year) !== fra(year + 1)) tags.push(`FRA phase-in: ${f.label}`);
  const rg = rmdGroups(year);
  const rmdAgeChanges = new Set(rg.map((g) => g.age)).size > 1;
  if (rmdAgeChanges) tags.push("RMD age changes on July 1");
  else if (year === 1959) tags.push("RMD age not final in law");
  else if (rg[0].age !== rmdGroups(year - 1)[rmdGroups(year - 1).length - 1].age) tags.push(`First year with RMD age ${rmdAgeLabel(rg[0].age)}`);
  if (year + AGE_EARLY === refYear) tags.push(`Turns 62 in ${refYear}`);
  if (year + MEDICARE_ENROLLMENT.value.eligibilityAge === refYear) tags.push(`Turns 65 in ${refYear}`);
  if (year + AGE_DRC_STOP === refYear) tags.push(`Turns 70 in ${refYear}`);
  if (rg.some((g) => g.firstYear === refYear)) tags.push(`First RMD in ${refYear}`);
  return tags;
}

/** Page title and meta description for a birth-year page (lengths are checked in the tests). */
export function birthYearMeta(p: BirthYearProfile) {
  const title = `Born in ${p.year}: Social Security, Medicare & RMD Dates`;
  const fraYrs = p.fraYears.map((g) => g.year);
  const fraWhen = fraYrs.length === 1 ? `${fraYrs[0]}` : `${Math.min(...fraYrs)}–${String(Math.max(...fraYrs)).slice(2)}`;
  const ages = [...new Set(p.rmd.map((g) => g.age))];
  const yrs = [...new Set(p.rmd.map((g) => g.firstYear))];
  const rmd = ages.length > 1 ? `RMDs at ${ages.map(rmdAgeLabel).join(" or ")}` : `RMDs at ${rmdAgeLabel(ages[0])} in ${yrs.join(" or ")}`;
  const span = `${AGE_EARLY}–${AGE_DRC_STOP}`;
  let description = `Born in ${p.year}? Full retirement age ${p.fra.label} (${fraWhen}), Medicare at ${MEDICARE_ENROLLMENT.value.eligibilityAge} in ${p.age65Year}, ${rmd}. Your benefit % at ${span}, COLAs and life expectancy.`;
  if (description.length > 160) description = description.replace(", COLAs and life expectancy", " and COLAs");
  if (description.length < 140) description = description.replace(`Your benefit % at ${span}`, `Plus your exact benefit % at every age ${span}`);
  return { title, description };
}

export type SsYear = keyof typeof SS_YEAR;

export interface EarningsTestRow {
  year: SsYear;
  who: string;
  limit: string;
  rule: string;
}

/**
 * Earnings-test limit that applies to a birth year in `refYear` and the next year (POMS RS 02501.021): the lower limit
 * ($1 per $2) in years before the FRA year once benefits can start, the higher limit ($1 per $3, months before the FRA
 * month only) in the FRA year, none after. One row per year when every birth month is in the same situation.
 */
export function earningsTestRows(p: BirthYearProfile): EarningsTestRow[] {
  const rows: EarningsTestRow[] = [];
  const { beforeFraYear, fraYear } = EARNINGS_TEST_RATIO.value;
  for (const y of [p.refYear, p.refYear + 1]) {
    if (!(y in SS_YEAR)) continue;
    const year = y as SsYear;
    const fig = SS_YEAR[year].value;
    for (const g of p.fraYears) {
      const who = p.fraYears.length > 1 ? `Born ${monthSpan(g.months)}` : `Born in ${p.year}`;
      if (g.year < y) rows.push({ year, who, limit: "No limit", rule: "Past full retirement age" });
      else if (g.year === y) rows.push({ year, who, limit: money(fig.retFraYearAnnual), rule: `$1 per $${fraYear} over; only earnings before your full-retirement-age month count` });
      else if (p.age62Year <= y) rows.push({ year, who, limit: money(fig.retUnderFraAnnual), rule: `$1 withheld per $${beforeFraYear} over` });
    }
  }
  return rows.flatMap((r) => {
    const same = rows.filter((x) => x.year === r.year);
    if (same.length < 2 || !same.every((x) => x.limit === r.limit)) return [r];
    return same[0] === r ? [{ ...r, who: `Born in ${p.year}` }] : [];
  });
}

/** Benefit % for someone in a cohort who starts in `refYear` at the age they reach that year (62 means 62 and 1 month). */
export function pctIfClaimingIn(p: BirthYearProfile) {
  const age = p.ageInRefYear.after;
  if (age < AGE_EARLY) return null;
  if (age === AGE_EARLY) return { age, label: `${AGE_EARLY} and 1 month`, pct: p.pctFirstPossibleMonth };
  return { age, label: String(age), pct: pctOfPiaAtAge(p.year, Math.min(age, AGE_DRC_STOP)) };
}
