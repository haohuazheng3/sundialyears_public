/**
 * Lifetime required minimum distributions for account owners.
 * Rules: IRC §401(a)(9) as amended by SECURE 2.0 §107; Treas. Reg. §1.401(a)(9)-2 (applicable age),
 * §1.401(a)(9)-5 (amount), §1.401(a)(9)-9 (tables, distribution years 2022+); IRS Pub. 590-B.
 */
import { UNIFORM_LIFETIME, JOINT_LIFE } from "@/data/params/rmd";
import type { YMD } from "./dates";

export type AccountType = "ira" | "employer" | "roth-ira" | "roth-401k";

/** Applicable age for the owner's date of birth (70.5, 72, 73 or 75). Born 1959 → 73 (proposed regs; statute ambiguous). */
export function rmdApplicableAge(dob: YMD): 70.5 | 72 | 73 | 75 {
  const key = dob.year * 10000 + dob.month * 100 + dob.day;
  if (key < 19490701) return 70.5;
  if (dob.year <= 1950) return 72;
  if (dob.year <= 1959) return 73;
  return 75;
}

/** Calendar year in which the owner reaches the applicable age (first distribution year). */
export function firstRmdYear(dob: YMD): number {
  const age = rmdApplicableAge(dob);
  if (age === 70.5) {
    // 70½ is reached 6 calendar months after the 70th birthday.
    return dob.year + 70 + (dob.month + 6 > 12 ? 1 : 0);
  }
  return dob.year + age;
}

/** Required beginning date: April 1 of the year after the first distribution year. */
export function requiredBeginningDate(dob: YMD, opts?: { stillWorkingException?: boolean; retirementYear?: number }) {
  const base = opts?.stillWorkingException && opts.retirementYear ? Math.max(firstRmdYear(dob), opts.retirementYear) : firstRmdYear(dob);
  return { year: base + 1, month: 4, day: 1, distributionYear: base };
}

/** Age used for the table lookup: the age the owner attains on their birthday in the distribution year. */
export const tableAge = (dob: YMD, year: number) => year - dob.year;

export interface PeriodLookup {
  period: number;
  table: "uniform" | "joint";
  ownerAge: number;
  spouseAge?: number;
}

/**
 * Distribution period. Joint and Last Survivor table only when the spouse is the SOLE beneficiary for the whole
 * year and more than 10 years younger (dates of birth more than 10 years apart); otherwise the Uniform Lifetime table.
 * (The Uniform table equals the Joint table at a 10-year age gap, so the Joint table always yields ≥ the Uniform period.)
 */
export function distributionPeriod(dob: YMD, year: number, spouse?: { dob: YMD; soleBeneficiary: boolean }): PeriodLookup {
  const ownerAge = Math.min(120, tableAge(dob, year));
  if (spouse?.soleBeneficiary && moreThanTenYearsYounger(dob, spouse.dob)) {
    const spouseAge = Math.max(0, Math.min(120, tableAge(spouse.dob, year)));
    return { period: JOINT_LIFE[ownerAge][spouseAge], table: "joint", ownerAge, spouseAge };
  }
  return { period: UNIFORM_LIFETIME[Math.max(72, ownerAge)], table: "uniform", ownerAge };
}

export function moreThanTenYearsYounger(owner: YMD, spouse: YMD) {
  const tenYearsLater = { year: owner.year + 10, month: owner.month, day: owner.day };
  const a = spouse.year * 10000 + spouse.month * 100 + spouse.day;
  const b = tenYearsLater.year * 10000 + tenYearsLater.month * 100 + tenYearsLater.day;
  return a > b;
}

export interface RmdInput {
  dob: YMD;
  year: number; // distribution calendar year
  priorYearEndBalance: number; // Dec 31 of year - 1
  accountType: AccountType;
  spouse?: { dob: YMD; soleBeneficiary: boolean };
  /** Employer plan only: still employed by the plan sponsor and not a 5% owner. */
  stillWorkingException?: boolean;
}

export type RmdStatus = "not-required-roth" | "not-yet" | "deferred-still-working" | "first-year" | "required";

export interface RmdResult {
  status: RmdStatus;
  amount: number; // dollars, rounded to cents
  pctOfBalance: number;
  lookup?: PeriodLookup;
  applicableAge: number;
  firstYear: number;
  rbd: { year: number; month: number; day: number };
  deadline: string; // human text
  /** If the first-year RMD is delayed to April 1, the second RMD is also due by Dec 31 of that year. */
  doubleUpYear?: number;
}

const roundCents = (x: number) => Math.round(x * 100) / 100;

export function computeRmd(input: RmdInput): RmdResult {
  const { dob, year, priorYearEndBalance, accountType } = input;
  const applicableAge = rmdApplicableAge(dob);
  const firstYear = firstRmdYear(dob);
  const rbdInfo = requiredBeginningDate(dob);
  const base = { applicableAge, firstYear, rbd: { year: rbdInfo.year, month: 4, day: 1 } };
  const balance = Math.max(0, priorYearEndBalance || 0);

  if (accountType === "roth-ira" || (accountType === "roth-401k" && year >= 2024)) {
    return { ...base, status: "not-required-roth", amount: 0, pctOfBalance: 0, deadline: "No lifetime RMDs for this account." };
  }
  if (year < firstYear) {
    return { ...base, status: "not-yet", amount: 0, pctOfBalance: 0, deadline: `Your first RMD is for ${firstYear}.` };
  }
  if (accountType === "employer" && input.stillWorkingException) {
    return {
      ...base,
      status: "deferred-still-working",
      amount: 0,
      pctOfBalance: 0,
      deadline: "Not due from this plan while you keep working for the employer (unless you own more than 5% of the company). Your first RMD is for the year you retire, due April 1 of the next year.",
    };
  }
  const lookup = distributionPeriod(dob, year, input.spouse);
  const amount = roundCents(balance / lookup.period);
  const isFirst = year === firstYear;
  return {
    ...base,
    status: isFirst ? "first-year" : "required",
    amount,
    pctOfBalance: lookup.period > 0 ? 1 / lookup.period : 1,
    lookup,
    deadline: isFirst ? `April 1, ${year + 1} at the latest (or by December 31, ${year} to avoid doubling up)` : `December 31, ${year}`,
    doubleUpYear: isFirst ? year + 1 : undefined,
  };
}

export interface ProjectionRow {
  year: number;
  age: number;
  startBalance: number; // prior Dec 31
  period: number;
  rmd: number;
  pct: number;
}

/**
 * Year-by-year projection: each year's RMD is based on the prior Dec 31 balance; the remainder grows at `growth`.
 * Assumes only the RMD is withdrawn, at year-end. Educational estimate — real returns vary.
 */
export function projectRmds(opts: { dob: YMD; startYear: number; balance: number; growth: number; throughAge?: number; spouse?: { dob: YMD; soleBeneficiary: boolean } }): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const first = firstRmdYear(opts.dob);
  let bal = Math.max(0, opts.balance);
  const lastYear = opts.dob.year + (opts.throughAge ?? 100);
  for (let y = opts.startYear; y <= lastYear; y++) {
    let rmd = 0;
    let period = 0;
    if (y >= first) {
      period = distributionPeriod(opts.dob, y, opts.spouse).period;
      rmd = roundCents(Math.min(bal, bal / period));
    }
    rows.push({ year: y, age: y - opts.dob.year, startBalance: roundCents(bal), period, rmd, pct: period ? 1 / period : 0 });
    bal = Math.max(0, (bal - rmd) * (1 + opts.growth));
  }
  return rows;
}

/** RMD as a % of the balance at a given age (Uniform Lifetime table). */
export function uniformPct(age: number) {
  return 1 / UNIFORM_LIFETIME[Math.min(120, Math.max(72, age))];
}
