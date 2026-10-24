/**
 * Social Security engines for the spouse, survivor, divorced, formula, credits, apply-date, WEP/GPO, trust-fund and SSI
 * tools. Pure functions; every rule comes from src/data/params.
 */
import { earlyRetirementFactor, spousalFactor, survivorFactor, fraForCohort, survivorFraForCohort, drcPerMonth, earliestRetirementMonth, type Fra } from "./ss-core";
import { roundDownToDime, roundDownToDollar, monthIndex, fromMonthIndex } from "./dates";
import { applyColas } from "./ss-pia";
import { paymentDate, groupForBirthDay, type Payment } from "./payment-schedule";
import {
  BEND_POINTS,
  QC_HISTORY,
  CREDIT_RULES,
  SPOUSAL_RULES,
  SURVIVOR_RULES,
  DIVORCED_RULES,
  WEP_FIRST_FACTOR,
  FIRST_BEND_1990_2011,
  GPO_RULES,
  SSI_RULES,
  APPLY_RULES,
  TRUST_FUNDS,
  SS_YEAR,
} from "@/data/params/social-security";

const pos = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);

/** Claiming age (in months) relative to full retirement age → reduction or delayed-credit months. */
export function monthsFromFra(claimAgeMonths: number, fra: Fra) {
  const d = Math.round(claimAgeMonths) - fra.total;
  return { early: Math.max(0, -d), delayed: Math.max(0, Math.min(d, 70 * 12 - fra.total)) };
}

/* ───────────── Retirement benefit at an age ───────────── */

export function retirementBenefit(pia: number, birthYear: number, claimAgeMonths: number) {
  const fra = fraForCohort(birthYear);
  const { early, delayed } = monthsFromFra(Math.max(62 * 12, claimAgeMonths), fra);
  const factor = early ? earlyRetirementFactor(early) : 1 + delayed * drcPerMonth(birthYear);
  return { fra, early, delayed, factor, benefit: roundDownToDollar(pos(pia) * factor) };
}

/** Undiscounted break-even age between two claiming ages (months), ignoring COLAs (they scale both equally). */
export function breakEvenMonths(pia: number, birthYear: number, aMonths: number, bMonths: number): number | null {
  const a = retirementBenefit(pia, birthYear, aMonths).benefit;
  const b = retirementBenefit(pia, birthYear, bMonths).benefit;
  if (b <= a || bMonths <= aMonths) return null;
  // a × (t − aMonths) = b × (t − bMonths)  →  t = (b·bMonths − a·aMonths) / (b − a)
  return Math.ceil((b * bMonths - a * aMonths) / (b - a));
}

/* ───────────── Spousal ───────────── */

export interface SpousalResult {
  fra: Fra;
  early: number;
  ownBenefit: number;
  /** Spousal "excess": half the worker's PIA minus your own PIA, before any reduction. */
  excessFull: number;
  excessPaid: number;
  total: number;
  maxSpousal: number;
  deemedFiling: boolean;
}

export function spousalBenefit(input: { workerPia: number; ownPia: number; birthYear: number; claimAgeMonths: number }): SpousalResult {
  const fra = fraForCohort(input.birthYear);
  const claim = Math.max(SPOUSAL_RULES.value.minAge * 12, input.claimAgeMonths);
  const { early, delayed } = monthsFromFra(claim, fra);
  const ownPia = pos(input.ownPia);
  const maxSpousal = pos(input.workerPia) * SPOUSAL_RULES.value.maxShare;
  const ownFactor = early ? earlyRetirementFactor(early) : 1 + delayed * drcPerMonth(input.birthYear);
  const ownBenefit = ownPia > 0 ? roundDownToDollar(ownPia * ownFactor) : 0;
  const excessFull = Math.max(0, maxSpousal - ownPia);
  // The spousal portion is reduced for early claiming but never earns delayed credits.
  const excessPaid = roundDownToDollar(excessFull * (early ? spousalFactor(early) : 1));
  return {
    fra,
    early,
    ownBenefit,
    excessFull: roundDownToDime(excessFull),
    excessPaid,
    total: ownBenefit + excessPaid,
    maxSpousal: roundDownToDime(maxSpousal),
    deemedFiling: input.birthYear >= 1954,
  };
}

/* ───────────── Survivor ───────────── */

export interface SurvivorResult {
  survivorFra: Fra;
  base: number;
  ribLimApplied: boolean;
  factor: number;
  benefit: number;
}

/**
 * Widow(er) benefit. `deceasedBenefit` = what the worker was actually receiving (null if they died before claiming).
 * If the worker claimed early, the survivor gets the larger of the worker's benefit or 82.5% of PIA (RIB-LIM),
 * but never more than the survivor-reduced PIA.
 */
export function survivorBenefit(input: { deceasedPia: number; deceasedBenefit: number | null; survivorBirthYear: number; claimAgeMonths: number }): SurvivorResult {
  const sfra = survivorFraForCohort(input.survivorBirthYear);
  const pia = pos(input.deceasedPia);
  const actual = input.deceasedBenefit == null ? null : pos(input.deceasedBenefit);
  const claim = Math.max(SURVIVOR_RULES.value.minAge * 12, Math.min(input.claimAgeMonths, sfra.total));
  const rf = Math.max(0, sfra.total - claim);
  const factor = survivorFactor(rf, sfra);
  let base = actual != null && actual > pia ? actual : pia; // delayed credits carry over
  let benefit = base * factor;
  let ribLimApplied = false;
  if (actual != null && actual < pia) {
    const limit = Math.max(actual, pia * SURVIVOR_RULES.value.ribLimShare);
    if (benefit > limit) {
      benefit = limit;
      ribLimApplied = true;
    }
    base = pia;
  }
  return { survivorFra: sfra, base: roundDownToDime(base), ribLimApplied, factor, benefit: roundDownToDollar(benefit) };
}

/* ───────────── Divorced spouse ───────────── */

export interface DivorcedCheck {
  eligible: boolean;
  reasons: { ok: boolean; text: string }[];
}

export function divorcedEligibility(i: { marriageYears: number; remarried: boolean; age: number; exAlive: boolean; exAge: number; exClaimed: boolean; yearsDivorced: number; remarriedAfter60: boolean }): DivorcedCheck {
  const R = DIVORCED_RULES.value;
  const reasons: { ok: boolean; text: string }[] = [];
  reasons.push({ ok: i.marriageYears >= R.marriageYears, text: `Married at least ${R.marriageYears} years` });
  if (i.exAlive) {
    reasons.push({ ok: !i.remarried, text: "You are not remarried now" });
    reasons.push({ ok: i.age >= R.minAge, text: `You are at least ${R.minAge}` });
    reasons.push({ ok: i.exAge >= R.minAge, text: `Your ex is at least ${R.minAge}` });
    reasons.push({
      ok: i.exClaimed || i.yearsDivorced >= R.independentAfterYears,
      text: i.exClaimed ? "Your ex has started benefits" : `Divorced at least ${R.independentAfterYears} years (so your ex doesn't have to have filed)`,
    });
  } else {
    reasons.push({ ok: !i.remarried || i.remarriedAfter60, text: `Not remarried before age ${R.survivorRemarryAge}` });
    reasons.push({ ok: i.age >= SURVIVOR_RULES.value.minAge, text: `You are at least ${SURVIVOR_RULES.value.minAge}` });
  }
  return { eligible: reasons.every((r) => r.ok), reasons };
}

/* ───────────── Benefit formula ───────────── */

export function bendPointsFor(eligibilityYear: number) {
  const years = Object.keys(BEND_POINTS).map(Number);
  const y = Math.min(Math.max(eligibilityYear, Math.min(...years)), Math.max(...years));
  return { year: y, pia: BEND_POINTS[y].pia, latest: eligibilityYear > Math.max(...years) };
}

export interface FormulaResult {
  totalIndexed: number;
  aime: number;
  bend: [number, number];
  bendYear: number;
  usesLatestBend: boolean;
  parts: { rate: number; amount: number; upTo: number | null }[];
  pia: number;
}

/** Average indexed annual earnings × years worked (max 35) → AIME → PIA at the eligibility-year bend points. */
export function piaFromAverage(avgIndexedEarnings: number, yearsWorked: number, birthYear: number): FormulaResult {
  const years = Math.max(0, Math.min(35, Math.round(yearsWorked)));
  const totalIndexed = pos(avgIndexedEarnings) * years;
  const aime = Math.floor(totalIndexed / 420);
  const b = bendPointsFor(birthYear + 62);
  const [b1, b2] = b.pia;
  const p1 = 0.9 * Math.min(aime, b1);
  const p2 = 0.32 * Math.max(0, Math.min(aime, b2) - b1);
  const p3 = 0.15 * Math.max(0, aime - b2);
  return {
    totalIndexed,
    aime,
    bend: [b1, b2],
    bendYear: b.year,
    usesLatestBend: b.latest,
    parts: [
      { rate: 0.9, amount: p1, upTo: b1 },
      { rate: 0.32, amount: p2, upTo: b2 },
      { rate: 0.15, amount: p3, upTo: null },
    ],
    pia: roundDownToDime(p1 + p2 + p3),
  };
}

/* ───────────── Work credits ───────────── */

export const qcAmount = (year: number) => QC_HISTORY.value[year] ?? QC_HISTORY.value[Math.max(...Object.keys(QC_HISTORY.value).map(Number))];

export function creditsForEarnings(earnings: number, year: number) {
  return Math.min(CREDIT_RULES.value.maxPerYear, Math.floor(pos(earnings) / qcAmount(year)));
}

/** Years (from `startYear`) until 40 credits at a steady annual income; the latest QC amount is used for future years. */
export function yearsToCredits(current: number, annualEarnings: number, startYear: number, target = CREDIT_RULES.value.retirement) {
  let credits = Math.max(0, Math.floor(current));
  const rows: { year: number; earned: number; total: number }[] = [];
  for (let y = startYear; credits < target && y < startYear + 45; y++) {
    const earned = creditsForEarnings(annualEarnings, y);
    if (earned === 0) return { reached: null as number | null, rows };
    credits = Math.min(target, credits + earned);
    rows.push({ year: y, earned, total: credits });
  }
  return { reached: credits >= target ? (rows.length ? rows[rows.length - 1].year : startYear - 1) : null, rows };
}

/* ───────────── Apply date & first check ───────────── */

export interface ApplyPlan {
  startMonth: number; // month index of the first benefit month
  earliestStart: number; // first month you can be paid (62 all month)
  movedToEarliest: boolean;
  applyFrom: number; // month index you can file from
  firstPaymentMonth: number;
  firstPayment: Payment;
}

export function applyPlan(dob: { year: number; month: number; day: number }, wantStart: { year: number; month: number }): ApplyPlan {
  // You must be 62 for the whole month (SSA attains ages the day before the birthday).
  const earliestStart = earliestRetirementMonth(dob);
  const want = monthIndex(wantStart.year, wantStart.month);
  const startMonth = Math.max(want, earliestStart);
  const applyFrom = startMonth - APPLY_RULES.value.monthsInAdvance;
  const firstPaymentMonth = startMonth + 1;
  const { year, month } = fromMonthIndex(firstPaymentMonth);
  return { startMonth, earliestStart, movedToEarliest: want < earliestStart, applyFrom, firstPaymentMonth, firstPayment: paymentDate(groupForBirthDay(dob.day), year, month) };
}

/* ───────────── WEP / GPO repeal ───────────── */

export function firstBendPoint(eligibilityYear: number): number | null {
  if (BEND_POINTS[eligibilityYear]) return BEND_POINTS[eligibilityYear].pia[0];
  return FIRST_BEND_1990_2011.value[eligibilityYear] ?? null;
}

export function wepFactor(yearsSubstantial: number) {
  const t = WEP_FIRST_FACTOR.value;
  const y = Math.max(20, Math.min(30, Math.round(yearsSubstantial)));
  return t[y];
}

export interface WepRepealResult {
  bend: number;
  factor: number;
  reductionAtEligibility: number;
  cappedByPension: boolean;
  increaseNow: number;
  colaYears: number;
}

/**
 * The monthly amount WEP was taking (now restored): (90% − WEP %) × first bend point, never more than half the
 * non-covered pension, carried forward with every COLA from the eligibility year through December 2026.
 */
export function wepRepeal(i: { eligibilityYear: number; yearsSubstantial: number; pension: number }): WepRepealResult | null {
  const bend = firstBendPoint(i.eligibilityYear);
  if (bend == null) return null;
  const factor = wepFactor(i.yearsSubstantial);
  let reduction = (0.9 - factor) * bend;
  const cap = pos(i.pension) / 2;
  const cappedByPension = cap < reduction;
  reduction = Math.min(reduction, cap);
  const through = 2026; // COLA effective December 2026 → paid January 2027
  const from = i.eligibilityYear;
  const now = from <= through ? applyColas(reduction, from, through).pia : reduction;
  return { bend, factor, reductionAtEligibility: roundDownToDime(reduction), cappedByPension, increaseNow: roundDownToDime(now), colaYears: Math.max(0, through - from + 1) };
}

export function gpoRepeal(i: { entitlement: number; pension: number }) {
  const offset = pos(i.pension) * GPO_RULES.value.offsetShare;
  const before = Math.max(0, pos(i.entitlement) - offset);
  return { offset: roundDownToDime(offset), before: roundDownToDollar(before), after: roundDownToDollar(pos(i.entitlement)), increase: roundDownToDollar(pos(i.entitlement) - before) };
}

/* ───────────── Trust fund ───────────── */

export function trustFundCut(benefit: number, birthYear: number) {
  const tf = TRUST_FUNDS.value;
  const oasi = tf.oasiDepletion;
  const combined = tf.oasdiDepletion;
  const b = pos(benefit);
  return {
    oasi: { year: oasi.year, quarter: oasi.quarter, pct: oasi.payablePct, after: roundDownToDollar((b * oasi.payablePct) / 100), age: oasi.year - birthYear },
    combined: { year: combined.year, quarter: combined.quarter, pct: combined.payablePct, after: roundDownToDollar((b * combined.payablePct) / 100), age: combined.year - birthYear },
    longRun: { year: 2100, pct: tf.oasiPayable2100, after: roundDownToDollar((b * tf.oasiPayable2100) / 100) },
  };
}

/* ───────────── SSI + Social Security ───────────── */

export type SsiYear = keyof typeof SS_YEAR;

export function ssiWithSocialSecurity(i: { year: SsiYear; couple: boolean; socialSecurity: number; earned: number }) {
  const R = SSI_RULES.value;
  const fbr = i.couple ? SS_YEAR[i.year].value.ssiCouple : SS_YEAR[i.year].value.ssiIndividual;
  const ss = pos(i.socialSecurity);
  const unusedGeneral = Math.max(0, R.generalExclusion - ss);
  const countableUnearned = Math.max(0, ss - R.generalExclusion);
  const countableEarned = Math.max(0, (pos(i.earned) - unusedGeneral - R.earnedExclusion) * R.earnedCountedShare);
  const countable = countableUnearned + countableEarned;
  const ssi = Math.max(0, fbr - countable);
  return {
    fbr,
    countableUnearned,
    countableEarned,
    countable,
    ssi: Math.floor(ssi * 100) / 100,
    total: ss + Math.floor(ssi * 100) / 100,
    breakEvenSocialSecurity: fbr + R.generalExclusion,
    eligible: ssi > 0,
  };
}
