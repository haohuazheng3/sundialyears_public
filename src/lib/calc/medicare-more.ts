/**
 * Medicare engines for the enrollment-window, Medigap, penalty, Part A, Prescription Payment Plan, Extra Help, MSP,
 * IRMAA-2028, SSA-44 and HSA tools. Pure functions; rules and figures from src/data/params.
 */
import { monthIndex, fromMonthIndex, roundToDime, roundToCents } from "./dates";
import { indexThresholds } from "./irmaa";
import {
  ENROLLMENT_RULES,
  EXTRA_HELP_2026,
  MSP_2026,
  PART_B,
  PART_D,
  PENALTIES,
  IRMAA_2027,
  IRMAA_2027_INDEXING,
  IRMAA_PCT,
} from "@/data/params/medicare";
import { HSA_LIMITS } from "@/data/params/tax";

export type YM = { year: number; month: number };
const pos = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);
export const ym = (idx: number): YM => fromMonthIndex(idx);

/* ───────────── Initial Enrollment Period ───────────── */

export interface IepRow {
  signup: number;
  coverage: number;
  phase: "before" | "birthday" | "after";
}

/** Medicare "turning 65" month: the birthday month, or the month before if you were born on the 1st. */
export function medicare65Month(dob: { year: number; month: number; day: number }) {
  return monthIndex(dob.year + ENROLLMENT_RULES.value.eligibilityAge, dob.month) - (dob.day === 1 ? 1 : 0);
}

export function initialEnrollment(dob: { year: number; month: number; day: number }) {
  const R = ENROLLMENT_RULES.value;
  const m65 = medicare65Month(dob);
  const rows: IepRow[] = [];
  for (let m = m65 - R.iepMonthsBefore; m <= m65 + R.iepMonthsAfter; m++) {
    rows.push({ signup: m, coverage: m < m65 ? m65 : m + 1, phase: m < m65 ? "before" : m === m65 ? "birthday" : "after" });
  }
  return { m65, first: m65 - R.iepMonthsBefore, last: m65 + R.iepMonthsAfter, rows };
}

/* ───────────── Medigap open enrollment ───────────── */

/** Starts the first month you are 65+ AND enrolled in Part B; lasts 6 months. */
export function medigapOep(dob: { year: number; month: number; day: number }, partBStart: YM) {
  const m65 = monthIndex(dob.year + 65, dob.month) - (dob.day === 1 ? 1 : 0);
  const b = monthIndex(partBStart.year, partBStart.month);
  const start = Math.max(m65, b);
  return { start, end: start + ENROLLMENT_RULES.value.medigapOepMonths - 1, under65: b < m65 };
}

/* ───────────── Late penalties ───────────── */

export type PremiumYear = 2026 | 2027;

export function partBPenalty(year: PremiumYear, monthsLate: number) {
  const standard = PART_B[year].value.premium;
  const periods = Math.floor(pos(monthsLate) / 12);
  const pct = PENALTIES.value.partBPerFull12Months * periods;
  const total = roundToDime(standard * (1 + pct));
  return { standard, periods, pct, monthly: roundToCents(total - standard), total, yearly: roundToCents((total - standard) * 12) };
}

export function partDPenalty(year: PremiumYear, monthsUncovered: number) {
  const base = PART_D[year].value.baseBeneficiaryPremium;
  const months = Math.floor(pos(monthsUncovered));
  const raw = PENALTIES.value.partDPerMonth * base * months;
  const monthly = raw > 0 ? roundToDime(raw) : 0;
  return { base, months, raw, monthly, yearly: roundToCents(monthly * 12) };
}

/** Months without coverage between two months (exclusive of the month coverage starts). */
export const monthsBetween = (from: YM, to: YM) => Math.max(0, monthIndex(to.year, to.month) - monthIndex(from.year, from.month));

/* ───────────── Prescription Payment Plan ───────────── */

export interface M3pRow {
  month: number; // 1–12
  incurred: number; // out-of-pocket costs at the pharmacy this month (after the annual cap is reached these are 0)
  cap: number;
  bill: number;
  carry: number; // unbilled balance after this month
}

/**
 * 42 CFR 423.137: first month cap = (annual OOP cap − costs already incurred) ÷ months left (including this one);
 * the first bill is the lower of that cap and the month's actual costs. Later months bill (unbilled balance + new
 * costs) ÷ months left.
 */
export function m3pSchedule(i: { annualCap: number; startMonth: number; priorOop: number; monthlyCosts: number[] }): M3pRow[] {
  const rows: M3pRow[] = [];
  let spent = pos(i.priorOop);
  let carry = 0;
  for (let m = Math.max(1, Math.min(12, Math.round(i.startMonth))); m <= 12; m++) {
    const left = 13 - m;
    const want = pos(i.monthlyCosts[m - 1] ?? 0);
    const incurred = Math.max(0, Math.min(want, i.annualCap - spent));
    spent += incurred;
    let cap: number;
    let bill: number;
    if (rows.length === 0) {
      cap = Math.max(0, i.annualCap - pos(i.priorOop)) / left;
      bill = Math.min(cap, incurred);
    } else {
      cap = (carry + incurred) / left;
      bill = cap;
    }
    bill = Math.round(bill * 100) / 100;
    carry = Math.max(0, Math.round((carry + incurred - bill) * 100) / 100);
    rows.push({ month: m, incurred, cap: Math.round(cap * 100) / 100, bill, carry });
  }
  return rows;
}

/* ───────────── Extra Help & Medicare Savings Programs ───────────── */

export function extraHelpCheck(i: { couple: boolean; annualIncome: number; resources: number }) {
  const L = EXTRA_HELP_2026.value;
  const incomeLimit = i.couple ? L.incomeCouple : L.incomeSingle;
  const resourceLimit = i.couple ? L.resourcesCouple : L.resourcesSingle;
  const incomeOk = pos(i.annualIncome) <= incomeLimit;
  const resourcesOk = pos(i.resources) <= resourceLimit;
  return { incomeLimit, resourceLimit, incomeOk, resourcesOk, eligible: incomeOk && resourcesOk };
}

export type MspProgram = "QMB" | "SLMB" | "QI" | null;

export function mspCheck(i: { couple: boolean; monthlyIncome: number; resources: number }) {
  const L = MSP_2026.value;
  const k = i.couple ? "couple" : "single";
  const inc = pos(i.monthlyIncome);
  const resourceLimit = L.resources[k];
  const resourcesOk = pos(i.resources) <= resourceLimit;
  const byIncome: MspProgram = inc <= L.qmb[k] ? "QMB" : inc <= L.slmb[k] ? "SLMB" : inc <= L.qi[k] ? "QI" : null;
  return {
    limits: { qmb: L.qmb[k], slmb: L.slmb[k], qi: L.qi[k] },
    resourceLimit,
    resourcesOk,
    byIncome,
    program: resourcesOk ? byIncome : null,
    partBYearly: roundToCents(PART_B[2026].value.premium * 12),
  };
}

/* ───────────── IRMAA 2028 projection ───────────── */

/**
 * 2028 thresholds = statutory base amounts × (average CPI-U Sep 2026–Aug 2027 ÷ average Sep 2017–Aug 2018), rounded to
 * $1,000. The Sep 2026–Aug 2027 average is projected from the 2027 window at an assumed inflation rate. The top
 * ($500,000 / $750,000) threshold only starts indexing for 2029.
 */
export function irmaa2028Projection(inflationPct: number) {
  const I = IRMAA_2027_INDEXING.value;
  const window = I.avgSep2025Aug2026_11mo * (1 + inflationPct / 100);
  const idx = indexThresholds(I.baseAmounts, window, I.baseAvgSep2017Aug2018, IRMAA_2027.topIndividual);
  return {
    inflationPct,
    individual: [...idx.individual, IRMAA_2027.topIndividual] as number[],
    joint: [...idx.joint, IRMAA_2027.topJoint] as number[],
    unrounded: idx.unrounded,
    pct: IRMAA_PCT,
  };
}

export function tierFor(magi: number, bounds: number[]) {
  // bounds: [t1, t2, t3, t4, top]; tier k applies when MAGI > bounds[k-1] (≥ top for tier 5)
  if (magi >= bounds[4]) return 5;
  for (let k = 3; k >= 0; k--) if (magi > bounds[k]) return k + 1;
  return 0;
}

/* ───────────── HSA and Medicare ───────────── */

/**
 * Part A (taken at or after 65) is backdated up to 6 months but not before the month you turned 65; HSA contributions
 * must stop the month before coverage starts. Returns the last eligible month and that year's prorated limit.
 */
export function hsaStop(i: { dob: { year: number; month: number; day: number }; apply: YM; family: boolean }) {
  const m65 = monthIndex(i.dob.year + 65, i.dob.month) - (i.dob.day === 1 ? 1 : 0);
  const applyIdx = monthIndex(i.apply.year, i.apply.month);
  const partAStart = applyIdx <= m65 ? m65 : Math.max(m65, applyIdx - ENROLLMENT_RULES.value.partARetroMonths);
  const lastEligible = partAStart - 1;
  const { year } = ym(partAStart);
  const limits = (HSA_LIMITS as Record<number, (typeof HSA_LIMITS)[2026]>)[year]?.value ?? HSA_LIMITS[2027].value;
  const monthsEligible = Math.max(0, Math.min(12, lastEligible - monthIndex(year, 1) + 1));
  const annual = (i.family ? limits.family : limits.self) + limits.catchUp55;
  return { partAStart, lastEligible, year, monthsEligible, annual, prorated: Math.floor((annual * monthsEligible) / 12), retroApplied: partAStart < applyIdx };
}
