/**
 * When to claim Social Security: monthly benefit at every claiming age, cumulative totals and break-even ages,
 * survival-weighted ("expected") lifetime benefits, and the married-couple view (spousal top-up, survivor benefit).
 *
 * Rules (FRA, earliest month, reduction and credit factors come from ./ss-core — not re-implemented here):
 * - Retirement benefit = PIA × factor, rounded DOWN to $0.10; the payment is rounded DOWN to $1 (20 CFR 404.304;
 *   POMS RS 00615.101 / RS 00615.692).
 * - Delayed credits earned in the year you file (before the month you reach 70) are added the following January;
 *   credits earned in the year you reach 70 are added in the month you reach 70 (20 CFR 404.313; ssa.gov delayret).
 * - COLAs raise the PIA every December, rounded down to $0.10, from the year you reach 62 even if you have not filed
 *   (20 CFR 404.212). The official series is used where published; the user's assumption after that.
 * - Spouse (20 CFR 404.333, POMS RS 00615.201 / RS 00615.020): full spousal = ½ of the worker's PIA (never the
 *   worker's delayed-credit amount). Only the EXCESS over your own PIA is paid, reduced 25/36% per month for the first
 *   36 months before your FRA and 5/12% after; if your own benefit started at/after FRA, the spousal amount is reduced by
 *   your own benefit including delayed credits. Payable only once the worker has filed; deemed filing (BBA 2015,
 *   POMS GN 00204.035) means your own and spousal claims start together.
 * - Widow(er) (20 CFR 404.338, POMS RS 00615.301 / RS 00615.320): 100% of the deceased's benefit base — the PIA, or the
 *   delayed-credit amount if they waited past FRA (credits accrue until the month of death) — reduced up to 28.5% if
 *   started before the survivor's own survivor FRA (earliest age 60). If the deceased took a REDUCED retirement
 *   benefit, the survivor benefit is capped at the larger of what they received or 82.5% of their PIA (RIB-LIM).
 *   Survivor benefits are not subject to deemed filing; a survivor receives the larger of their own benefit and the
 *   survivor benefit (POMS RS 00615.020).
 * - Old-age entitlement ends with the month before death; survivor benefits can start in the month of death.
 * - Trust-fund scenario (2026 Trustees Report): from the quarter OASI reserves are projected to run out, benefits are
 *   paid at the stated payable percentage (flat — the Trustees project it to decline slowly after that).
 *
 * Survival uses SSA cohort life tables (2026 Trustees Report, intermediate, by sex and birth year; ages 50–119) with
 * uniform deaths within each year of age. The optional health outlook scales every q(x) by a constant
 * (HEALTH_OUTLOOK — a Sundial Years assumption, not an SSA figure). Couples are treated as independent lives.
 */
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { TRUST_FUNDS } from "@/data/params/social-security";
import { COHORT_TABLE_RANGE, HEALTH_OUTLOOK, SPOUSAL, SURVIVOR, type HealthOutlook } from "@/data/params/ss-claiming-extra";
import { age70Month, claimFactor, cohortYear, drcPerMonth, earliestRetirementMonth, fra, fraMonth, monthAtAge, spousalFactor, survivorFactor, survivorFraForCohort } from "./ss-core";
import { attainmentBase, fromMonthIndex, monthIndex, roundDownToDime, roundDownToDollar, type YMD } from "./dates";

export type Sex = "m" | "f";

export interface Person {
  dob: YMD;
  /** Monthly benefit at full retirement age (PIA) as shown on a statement read in the `asOf` month. */
  pia: number;
  sex: Sex;
  health: HealthOutlook;
}

export interface Settings {
  /** "Today". Benefits are projected for the months after this one. */
  asOf: YMD;
  /** "none" = today's dollars (PIA held flat); "cola" = future dollars with COLAs. */
  growth: "none" | "cola";
  /** Assumed COLA (%) for every December without an official figure. */
  colaPct: number;
  /** Apply the Trustees' payable percentage from the projected OASI depletion quarter on. */
  cut: boolean;
}

// ── Month helpers ─────────────────────────────────────────────────────────────────────────────────────────────
export const asOfMonth = (asOf: YMD) => monthIndex(asOf.year, asOf.month);
/** Month index of the SSA "birth month" (attainment base): age in whole months during month m = m − this. */
export const birthMonth = (dob: YMD) => {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month);
};
/** Age (in whole months) attained during month `m`. */
export const ageMonthsIn = (dob: YMD, m: number) => m - birthMonth(dob);
/** Month in which the person reaches 120 (end of the life tables). */
export const lastMonth = (dob: YMD) => birthMonth(dob) + 120 * 12;

/** "80 and 7 months" / "70" */
export function ageLabel(totalMonths: number) {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths - y * 12;
  return m === 0 ? `${y}` : `${y} and ${m} month${m === 1 ? "" : "s"}`;
}
/** "80y 7m" style short label for charts. */
export const ageShort = (totalMonths: number) => {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths - y * 12;
  return m === 0 ? `${y}` : `${y}y ${m}m`;
};

/** The first month a person who has not filed yet could start, as of `asOf` (never retroactive before FRA). */
export function firstAvailableMonth(dob: YMD, asOf: YMD) {
  return Math.max(earliestRetirementMonth(dob), asOfMonth(asOf) + 1);
}

/** Claim month for "start at age X years Y months" — moved to the earliest legal month if needed (ss-core). */
export function claimMonthForAge(dob: YMD, ageMonths: number) {
  return claimFactor(dob, birthMonth(dob) + ageMonths).claimMonth;
}

// ── Trust-fund scenario ───────────────────────────────────────────────────────────────────────────────────────
const TF = TRUST_FUNDS.value.oasiDepletion;
/** First month of the projected OASI depletion quarter (2032 Q4 → October 2032). */
export const DEPLETION_MONTH = monthIndex(TF.year, (TF.quarter - 1) * 3 + 1);
export const PAYABLE_SHARE = TF.payablePct / 100;
export const cutFactorFor = (m: number, cut: boolean) => (cut && m >= DEPLETION_MONTH ? PAYABLE_SHARE : 1);

// ── PIA path (COLAs) ──────────────────────────────────────────────────────────────────────────────────────────
/**
 * Growth applied to the PIA in December of `year`: the official COLA where published, else the assumption.
 * For people not yet 62 (no COLAs on their PIA yet), the same yearly growth stands in for the wage indexing that will
 * raise their statement's today's-dollar estimate — this only affects "future dollars" figures, never today's dollars.
 */
export function piaGrowthRate(year: number, s: Pick<Settings, "growth" | "colaPct">) {
  if (s.growth === "none") return 0;
  const official = COLA_BY_EFFECTIVE_YEAR[year];
  return (official ?? s.colaPct) / 100;
}

/** PIA in benefit month `month`: the statement PIA plus every December COLA from the `asOf` month through `month`. */
export function piaAt(pia: number, s: Pick<Settings, "asOf" | "growth" | "colaPct">, month: number): number {
  const start = asOfMonth(s.asOf);
  let p = pia;
  for (let y = s.asOf.year; monthIndex(y, 12) <= month; y++) if (monthIndex(y, 12) >= start) p = roundDownToDime(p * (1 + piaGrowthRate(y, s)));
  return p;
}

/**
 * PIA for every month from `from` to `to` (inclusive). The statement PIA applies to the `asOf` month (and, as an
 * approximation, to any earlier month); each December from then on adds that year's COLA, rounded down to the dime
 * (Social Security Act §215(i)).
 */
export function piaPath(pia: number, s: Pick<Settings, "asOf" | "growth" | "colaPct">, from: number, to: number): Float64Array {
  const out = new Float64Array(Math.max(0, to - from + 1));
  if (!out.length) return out;
  let p = piaAt(pia, s, from);
  out[0] = p;
  const start = asOfMonth(s.asOf);
  for (let k = 1; k < out.length; k++) {
    const m = from + k;
    const { year, month } = fromMonthIndex(m);
    if (month === 12 && m >= start) p = roundDownToDime(p * (1 + piaGrowthRate(year, s)));
    out[k] = p;
  }
  return out;
}

// ── Retirement benefit ────────────────────────────────────────────────────────────────────────────────────────
export interface FactorSchedule {
  /** First month of entitlement (after moving to the earliest legal month). */
  start: number;
  /** Factor paid from `start` until `stepUp` (fewer delayed credits — those earned in the filing year come later). */
  initial: number;
  /** Month from which the full factor is paid. */
  stepUp: number;
  full: number;
}

/**
 * When retirement benefits start in `claim`: the factor schedule including the January step-up for delayed credits
 * earned in the year of filing (20 CFR 404.313(c); credits earned in the year you reach 70 arrive in the month you reach 70).
 */
export function factorSchedule(dob: YMD, claim: number): FactorSchedule {
  const cf = claimFactor(dob, claim);
  const m70 = age70Month(dob);
  if (cf.monthsDelayed === 0 || cf.claimMonth >= m70) return { start: cf.claimMonth, initial: cf.factor, stepUp: cf.claimMonth, full: cf.factor };
  const claimYear = fromMonthIndex(cf.claimMonth).year;
  const credited = Math.min(cf.monthsDelayed, Math.max(0, monthIndex(claimYear, 1) - fraMonth(dob)));
  // Every credit was earned in an earlier calendar year (e.g. filing in January): nothing is left to add later.
  if (credited === cf.monthsDelayed) return { start: cf.claimMonth, initial: cf.factor, stepUp: cf.claimMonth, full: cf.factor };
  return { start: cf.claimMonth, initial: 1 + credited * drcPerMonth(cohortYear(dob)), stepUp: Math.min(monthIndex(claimYear + 1, 1), m70), full: cf.factor };
}

const factorFrom = (fs: FactorSchedule, month: number) => (month < fs.start ? 0 : month < fs.stepUp ? fs.initial : fs.full);

/** Fraction of PIA paid for benefit month `month` when retirement benefits start in `claim` (0 before the start). */
export function factorInMonth(dob: YMD, claim: number, month: number): number {
  return factorFrom(factorSchedule(dob, claim), month);
}

/** Monthly benefit (dime) and payment (dollar) from a PIA and factor, with the optional trust-fund haircut. */
export function payment(pia: number, factor: number, cut = 1) {
  const benefit = roundDownToDime(pia * factor);
  return roundDownToDollar(benefit * cut);
}

export interface ClaimRow {
  /** Age at the start month, in months. */
  ageMonths: number;
  label: string;
  claimMonth: number;
  monthsEarly: number;
  monthsDelayed: number;
  /** Final factor (after any January step-up). */
  factor: number;
  /** Payment in today's dollars (PIA × factor, rounded per SSA). */
  monthlyToday: number;
  /** First payment in future dollars (COLAs through the start month), before any step-up. */
  firstPayment: number;
  /** Payment once all delayed credits are in, future dollars. */
  fullPayment: number;
  /** Month the full factor starts (later than claimMonth only when delayed credits arrive the next January / at 70). */
  stepUpMonth: number;
  isFra: boolean;
  /** Start month is before the first month still available today. */
  past: boolean;
}

/** One row per whole age 62–70, plus FRA if it is not a whole year. */
export function claimTable(person: Person, s: Settings): ClaimRow[] {
  const { dob } = person;
  const f = fra(dob);
  const avail = firstAvailableMonth(dob, s.asOf);
  const ages = new Set<number>();
  for (let y = 62; y <= 70; y++) ages.add(y * 12);
  ages.add(f.total);
  const future: Settings = { ...s, growth: "cola" };
  return [...ages]
    .sort((a, b) => a - b)
    .map((ageMonths) => {
      const cm = claimMonthForAge(dob, ageMonths);
      const cf = claimFactor(dob, cm);
      const fs = factorSchedule(dob, cf.claimMonth);
      const startAge = ageMonthsIn(dob, cf.claimMonth);
      return {
        ageMonths: startAge,
        label: ageLabel(startAge),
        claimMonth: cf.claimMonth,
        monthsEarly: cf.monthsEarly,
        monthsDelayed: cf.monthsDelayed,
        factor: cf.factor,
        monthlyToday: payment(person.pia, cf.factor),
        firstPayment: payment(piaAt(person.pia, future, cf.claimMonth), fs.initial),
        fullPayment: payment(piaAt(person.pia, future, fs.stepUp), cf.factor),
        stepUpMonth: fs.stepUp,
        isFra: ageMonths === f.total,
        past: cf.claimMonth < avail,
      };
    });
}

/** Payments for months `from`…`to` for a retirement benefit starting in `claim`. */
export function ownPayments(person: Person, claim: number, s: Settings, from: number, to: number): Float64Array {
  const path = piaPath(person.pia, s, from, to);
  const fs = factorSchedule(person.dob, claim);
  const out = new Float64Array(path.length);
  for (let k = 0; k < out.length; k++) {
    const m = from + k;
    const f = factorFrom(fs, m);
    out[k] = f ? payment(path[k], f, cutFactorFor(m, s.cut)) : 0;
  }
  return out;
}

// ── Cumulative totals and break-even ──────────────────────────────────────────────────────────────────────────
export interface BreakEven {
  /** Benefit month in which the later start catches up. */
  month: number;
  /** Age (months) at the END of that month — by then the later start has collected at least as much. */
  ageMonths: number;
}

/**
 * Break-even between two start months: the first month in which the cumulative total of the later start is at least
 * the cumulative total of the earlier start. Null if it never catches up before age 120.
 */
export function breakEven(person: Person, claimA: number, claimB: number, s: Settings): BreakEven | null {
  const a = claimFactor(person.dob, claimA).claimMonth;
  const b = claimFactor(person.dob, claimB).claimMonth;
  if (a === b) return null;
  const early = Math.min(a, b);
  const late = Math.max(a, b);
  const end = lastMonth(person.dob);
  const pe = ownPayments(person, early, s, early, end);
  const pl = ownPayments(person, late, s, early, end);
  let ce = 0;
  let cl = 0;
  for (let k = 0; k < pe.length; k++) {
    ce += pe[k];
    cl += pl[k];
    if (early + k >= late && cl >= ce && pl[k] > pe[k]) return { month: early + k, ageMonths: ageMonthsIn(person.dob, early + k) + 1 };
  }
  return null;
}

/** Cumulative total collected by the end of each whole year of age from `fromAge` to `toAge` (chart points). */
export function cumulativeByAge(person: Person, claim: number, s: Settings, fromAge: number, toAge: number): { x: number; y: number }[] {
  const b = birthMonth(person.dob);
  const start = claimFactor(person.dob, claim).claimMonth;
  const from = Math.min(start, b + fromAge * 12);
  const to = b + toAge * 12;
  const pay = ownPayments(person, start, s, from, to);
  const pts: { x: number; y: number }[] = [];
  let cum = 0;
  for (let k = 0; k < pay.length; k++) {
    const m = from + k;
    if (m - b >= fromAge * 12 && (m - b) % 12 === 0) pts.push({ x: (m - b) / 12, y: Math.round(cum) });
    cum += pay[k];
  }
  return pts;
}

// ── Survival (SSA cohort life tables) ─────────────────────────────────────────────────────────────────────────
export interface QxTable {
  source?: string;
  ages: [number, number];
  male: Record<string, number[]>;
  female: Record<string, number[]>;
}

export interface SurvivalModel {
  firstAge: number;
  /** l(x) at integer ages firstAge … firstAge+len−1 (last entry = 0 at age 120). */
  lx: Float64Array;
  birthYear: number;
  multiplier: number;
}

/** Cohort life table for a sex and calendar birth year (clamped to 1935–1980), with the health multiplier on q(x). */
export function survivalModel(table: QxTable, sex: Sex, birthYear: number, health: HealthOutlook): SurvivalModel {
  const by = Math.min(COHORT_TABLE_RANGE.lastBirthYear, Math.max(COHORT_TABLE_RANGE.firstBirthYear, birthYear));
  const qx = (sex === "f" ? table.female : table.male)[String(by)];
  if (!qx) throw new Error(`No cohort life table for ${sex} ${by}`);
  const k = HEALTH_OUTLOOK[health].qxMultiplier;
  const lx = new Float64Array(qx.length + 1);
  lx[0] = 1;
  for (let i = 0; i < qx.length; i++) lx[i + 1] = lx[i] * (1 - Math.min(1, qx[i] * k));
  lx[qx.length] = 0; // nobody survives past the end of the table (age 120)
  return { firstAge: table.ages[0], lx, birthYear: by, multiplier: k };
}

/** l(age) for a real age, uniform deaths within each year; ages before the table start count as l = 1. */
export function lAt(model: SurvivalModel, age: number): number {
  const x = age - model.firstAge;
  if (x <= 0) return 1;
  const i = Math.floor(x);
  if (i >= model.lx.length - 1) return 0;
  const f = x - i;
  return model.lx[i] - f * (model.lx[i] - model.lx[i + 1]);
}

/** Probability of living from `fromAge` to `toAge` (real ages in years). */
export function probSurvive(model: SurvivalModel, fromAge: number, toAge: number) {
  if (toAge <= fromAge) return 1;
  const l0 = lAt(model, fromAge);
  return l0 > 0 ? Math.min(1, lAt(model, toAge) / l0) : 0;
}

/** Remaining life expectancy (complete, in years) at a real age — numerical integral of the survival curve. */
export function lifeExpectancy(model: SurvivalModel, fromAge: number) {
  let e = 0;
  const step = 1 / 12;
  for (let t = fromAge; t < 120; t += step) e += ((probSurvive(model, fromAge, t) + probSurvive(model, fromAge, t + step)) / 2) * step;
  return e;
}

/** Exact age (years, fractional) at the start of month `m` (calendar birthday, 30.4375-day months). */
export function exactAgeAtMonthStart(dob: YMD, m: number) {
  return (m - monthIndex(dob.year, dob.month) - (dob.day - 1) / 30.4375) / 12;
}
export const exactAge = (dob: YMD, on: YMD) => (monthIndex(on.year, on.month) - monthIndex(dob.year, dob.month) + (on.day - dob.day) / 30.4375) / 12;

/** P(alive at the END of benefit month t0+k | alive today), k = 0 … n−1. */
export function survivalByMonth(model: SurvivalModel, dob: YMD, asOf: YMD, t0: number, n: number): Float64Array {
  const now = exactAge(dob, asOf);
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = probSurvive(model, now, exactAgeAtMonthStart(dob, t0 + k + 1));
  return out;
}

/** Probability of being alive at a given age (in months, measured at the end of that SSA age month). */
export function probAliveAtAgeMonths(model: SurvivalModel, dob: YMD, asOf: YMD, ageMonths: number) {
  return probSurvive(model, exactAge(dob, asOf), exactAgeAtMonthStart(dob, birthMonth(dob) + ageMonths));
}

// ── Expected (survival-weighted) lifetime benefits, in today's dollars ────────────────────────────────────────
export interface ExpectedSettings {
  asOf: YMD;
  cut: boolean;
  /** Real (after-inflation) discount rate, % per year. 0 = simply add up today's dollars. */
  realDiscountPct: number;
}

const todaysDollars = (e: ExpectedSettings): Settings => ({ asOf: e.asOf, growth: "none", colaPct: 0, cut: e.cut });
const discountVector = (n: number, pct: number) => {
  const v = new Float64Array(n);
  const monthly = Math.pow(1 + pct / 100, -1 / 12);
  let d = 1;
  for (let k = 0; k < n; k++) v[k] = d *= monthly;
  return v;
};

/** Survival-weighted present value of one person's own retirement benefits (today's dollars). */
export function expectedLifetime(person: Person, claim: number, e: ExpectedSettings, model: SurvivalModel): number {
  return expectedByClaimMonths(person, [claim], e, model)[0].value;
}

export interface ExpectedCurvePoint {
  claimMonth: number;
  ageMonths: number;
  value: number;
}

function expectedByClaimMonths(person: Person, claims: number[], e: ExpectedSettings, model: SurvivalModel): ExpectedCurvePoint[] {
  const t0 = asOfMonth(e.asOf) + 1;
  const end = lastMonth(person.dob);
  const n = Math.max(0, end - t0 + 1);
  const s = survivalByMonth(model, person.dob, e.asOf, t0, n);
  const v = discountVector(n, e.realDiscountPct);
  const w = new Float64Array(n);
  for (let k = 0; k < n; k++) w[k] = s[k] * v[k];
  const first = firstAvailableMonth(person.dob, e.asOf);
  const settings = todaysDollars(e);
  return claims.map((c) => {
    const claim = Math.max(c, first);
    const pay = ownPayments(person, claim, settings, t0, end);
    let total = 0;
    for (let k = 0; k < n; k++) total += pay[k] * w[k];
    return { claimMonth: claim, ageMonths: ageMonthsIn(person.dob, claimFactor(person.dob, claim).claimMonth), value: total };
  });
}

/** Expected lifetime benefits for every start month still available (today … the month you reach 70). */
export function expectedByClaimMonth(person: Person, e: ExpectedSettings, model: SurvivalModel): ExpectedCurvePoint[] {
  const first = firstAvailableMonth(person.dob, e.asOf);
  const last = Math.max(first, age70Month(person.dob));
  const claims: number[] = [];
  for (let m = first; m <= last; m++) claims.push(m);
  return expectedByClaimMonths(person, claims, e, model);
}

export function bestOf(points: ExpectedCurvePoint[]): ExpectedCurvePoint {
  return points.reduce((best, p) => (p.value > best.value + 1e-9 ? p : best), points[0]);
}

// ── Couples: spousal top-up and survivor benefit ──────────────────────────────────────────────────────────────
/**
 * Spousal top-up (dime) paid to `own` on `other`'s record in benefit month `month`, while both are alive.
 * Starts when both have filed (deemed filing ties it to your own claim). POMS RS 00615.020 / RS 00615.201.
 */
export function spousalTopUp(own: Person, ownClaim: number, other: Person, otherClaim: number, month: number, piaOwn = own.pia, piaOther = other.pia): number {
  const cOwn = claimFactor(own.dob, ownClaim);
  const cOther = claimFactor(other.dob, otherClaim).claimMonth;
  const start = Math.max(cOwn.claimMonth, cOther);
  if (month < start) return 0;
  const full = roundDownToDime(SPOUSAL.value.basePctOfPia * piaOther);
  const sf = spousalFactor(Math.max(0, fraMonth(own.dob) - start));
  if (cOwn.monthsEarly > 0) return roundDownToDime(Math.max(0, full - piaOwn) * sf);
  const ownBenefit = roundDownToDime(piaOwn * factorInMonth(own.dob, ownClaim, month));
  return Math.max(0, roundDownToDime(full * sf) - ownBenefit);
}

export interface SurvivorTerms {
  /** First month the survivor benefit is paid (month of death, or the month the survivor reaches 60). */
  start: number;
  /** Deceased's benefit base as a fraction of their PIA (1, or more with delayed credits). */
  baseFactor: number;
  /** The deceased's reduced retirement factor when they took a reduced benefit (RIB-LIM applies), else null. */
  deceasedReducedFactor: number | null;
  /** Months of reduction before the survivor's survivor FRA. */
  reductionMonths: number;
  /** Survivor age-reduction factor (1 at survivor FRA, 0.715 at 60). */
  reductionFactor: number;
}

/** Terms of a widow(er) benefit when `deceased` (who planned to start in `deceasedClaim`) dies in `deathMonth`. */
export function survivorTerms(deceased: Person, deceasedClaim: number, deathMonth: number, survivor: Person): SurvivorTerms {
  const cf = claimFactor(deceased.dob, deceasedClaim);
  const entitled = deathMonth > cf.claimMonth; // entitlement ends with the month before death
  let baseFactor = 1;
  let deceasedReducedFactor: number | null = null;
  if (entitled) {
    if (cf.monthsEarly > 0) deceasedReducedFactor = cf.factor;
    else baseFactor = cf.factor; // includes every delayed credit (all apply to survivors from the month of death)
  } else {
    // Never filed: deemed-life PIA plus delayed credits earned through the month before death.
    const drc = Math.max(0, Math.min(deathMonth, age70Month(deceased.dob)) - fraMonth(deceased.dob));
    baseFactor = 1 + drc * drcPerMonth(cohortYear(deceased.dob));
  }
  const start = Math.max(deathMonth, monthAtAge(survivor.dob, SURVIVOR.value.minAge));
  const sFra = survivorFraForCohort(cohortYear(survivor.dob));
  const reductionMonths = Math.max(0, monthAtAge(survivor.dob, sFra.years, sFra.months) - start);
  return { start, baseFactor, deceasedReducedFactor, reductionMonths, reductionFactor: survivorFactor(reductionMonths, sFra) };
}

/** RIB-LIM: the larger of the deceased's reduced benefit and 82.5% of their PIA (POMS RS 00615.320). */
export function ribLim(piaDeceased: number, deceasedReducedFactor: number): number {
  return Math.max(roundDownToDime(piaDeceased * deceasedReducedFactor), roundDownToDime(piaDeceased * SURVIVOR.value.ribLimFloorPctOfPia));
}

/** Widow(er) benefit (dime) from the terms and the deceased's PIA at that time. */
export function survivorAmount(t: SurvivorTerms, piaDeceased: number): number {
  const ob = roundDownToDime(piaDeceased * t.baseFactor);
  let wib = roundDownToDime(ob * t.reductionFactor);
  if (t.deceasedReducedFactor != null) wib = Math.min(wib, ribLim(piaDeceased, t.deceasedReducedFactor));
  return wib;
}

export interface HouseholdExpected {
  total: number;
  you: number;
  spouse: number;
}

/**
 * Expected household lifetime benefits (today's dollars, survival-weighted, discounted at the real rate):
 * both alive → own + spousal top-up each; after the first death the survivor gets the larger of their own benefit and
 * the widow(er) benefit. Independent lives; the survivor benefit starts in the month of death (or at 60).
 */
export function householdExpected(
  you: Person,
  youClaim: number,
  spouse: Person,
  spouseClaim: number,
  e: ExpectedSettings,
  youModel: SurvivalModel,
  spouseModel: SurvivalModel,
): HouseholdExpected {
  const t0 = asOfMonth(e.asOf) + 1;
  const end = Math.max(lastMonth(you.dob), lastMonth(spouse.dob));
  const n = Math.max(0, end - t0 + 1);
  const v = discountVector(n, e.realDiscountPct);
  const sY = survivalByMonth(youModel, you.dob, e.asOf, t0, n);
  const sS = survivalByMonth(spouseModel, spouse.dob, e.asOf, t0, n);
  const cut = new Float64Array(n);
  for (let k = 0; k < n; k++) cut[k] = cutFactorFor(t0 + k, e.cut);

  const side = (p: Person, pClaim: number, q: Person, qClaim: number, sP: Float64Array, sQ: Float64Array) => {
    // Own benefit (dime, no haircut yet) and spousal top-up while both alive.
    const own = new Float64Array(n);
    const both = new Float64Array(n);
    const fs = factorSchedule(p.dob, pClaim);
    for (let k = 0; k < n; k++) {
      const m = t0 + k;
      const f = factorFrom(fs, m);
      own[k] = f ? roundDownToDime(p.pia * f) : 0;
      both[k] = own[k] + spousalTopUp(p, pClaim, q, qClaim, m);
    }
    // Survivor benefit if q dies in month t0+d.
    const wib = new Float64Array(n);
    const wibStart = new Int32Array(n);
    const die = new Float64Array(n);
    for (let d = 0; d < n; d++) {
      die[d] = (d === 0 ? 1 : sQ[d - 1]) - sQ[d];
      if (die[d] <= 0) continue;
      const t = survivorTerms(q, qClaim, t0 + d, p);
      wib[d] = survivorAmount(t, q.pia);
      wibStart[d] = t.start - t0;
    }
    let total = 0;
    for (let k = 0; k < n; k++) {
      if (sP[k] <= 0) break;
      let widowed = 0;
      for (let d = 0; d <= k; d++) {
        if (die[d] <= 0) continue;
        const w = k >= wibStart[d] ? wib[d] : 0;
        widowed += die[d] * roundDownToDollar(Math.max(own[k], w) * cut[k]);
      }
      total += sP[k] * (sQ[k] * roundDownToDollar(both[k] * cut[k]) + widowed) * v[k];
    }
    return total;
  };

  const y = side(you, youClaim, spouse, spouseClaim, sY, sS);
  const sp = side(spouse, spouseClaim, you, youClaim, sS, sY);
  return { total: y + sp, you: y, spouse: sp };
}
