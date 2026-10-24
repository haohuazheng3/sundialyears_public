/**
 * 2026 federal income tax estimate for a retiree household, built around the taxable-Social-Security worksheet.
 *
 * Order of computation (Form 1040; research rule "Taxable income and tax computation order (retiree)"):
 *  1. Income other than Social Security → taxable benefits via Pub 915 Worksheet 1 (./ss-tax.ts, IRC §86).
 *  2. AGI = other income + taxable benefits − adjustments.
 *  3. Deduction = larger of itemized or standard. Standard = basic (Rev. Proc. 2025-32 §4.14(1)) + additional amount
 *     per box checked for 65+ / blind (IRC §63(f); $2,050 unmarried, $1,650 married or surviving spouse, 2026).
 *  4. Senior deduction (P.L. 119-21 §70103, IRC §151(d)(5)(C); Schedule 1-A Part V), tax years 2025–2028 only:
 *     $6,000 per qualified individual 65+, each reduced by 6% of MAGI over $75,000 ($150,000 joint). MAGI = AGI here
 *     (no foreign-income exclusions). Married individuals must file jointly. Taken below AGI, with either deduction.
 *  5. Tax on ordinary taxable income from the 2026 rate schedules (Rev. Proc. 2025-32 §4.01), plus qualified
 *     dividends / net long-term gains at 0% / 15% / 20%, stacked on top of ordinary income (§1(h); 1040 Qualified
 *     Dividends and Capital Gain Tax Worksheet; breakpoints Rev. Proc. 2025-32 §4.03).
 *  6. Optional Net Investment Income Tax (IRC §1411): 3.8% × min(NII, MAGI − threshold). Social Security is not NII.
 *
 * Simplifications (stated in the UI): uses the rate schedules, not the $50-band Tax Table (a few dollars' difference
 * under $100,000); no credits (e.g. Schedule R), no AMT, no non-itemizer charitable deduction, no dependents, no
 * capital-loss netting (negative gains are treated as 0), no state tax.
 */
import {
  BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  ADDITIONAL_STD_2026,
  CAP_GAINS_2026,
  SENIOR_DEDUCTION,
  NIIT,
  type FilingStatus,
} from "@/data/params/tax";
import { CAP_GAINS_RATES } from "@/data/params/ss-tax-extra";
import { taxableSocialSecurity, type TaxableSsResult } from "./ss-tax";

/** Tax years this engine has official IRS parameters for. 2027 brackets are not announced yet (as of 2026-10-23). */
export const FED_TAX_YEARS = [2026] as const;
export type FedTaxYear = (typeof FED_TAX_YEARS)[number];

type ScheduleKey = "single" | "mfj" | "hoh" | "mfs";

/** Rate-schedule column for a filing status (QSS uses the joint schedule; both MFS variants use the MFS schedule). */
export function scheduleKey(fs: FilingStatus): ScheduleKey {
  if (fs === "mfj" || fs === "qss") return "mfj";
  if (fs === "mfs" || fs === "mfsApart") return "mfs";
  return fs;
}

/** Married for the §63(f) additional amount: everyone except single and head of household ("unmarried and not a surviving spouse"). */
const isUnmarriedForAdditional = (fs: FilingStatus) => fs === "single" || fs === "hoh";

/** Most people whose 65+/blind boxes this return can check: two on a joint return, otherwise one. */
export const maxPeople = (fs: FilingStatus) => (fs === "mfj" ? 2 : 1);

/** Tax on ordinary taxable income from the 2026 rate schedule (Rev. Proc. 2025-32 §4.01), unrounded. */
export function ordinaryTax(taxableIncome: number, fs: FilingStatus): number {
  const ti = Math.max(0, taxableIncome);
  const rows = BRACKETS_2026.value[scheduleKey(fs)];
  let row = rows[0];
  for (const r of rows) if (ti > r[0]) row = r;
  return round2(row[2] + (ti - row[0]) * row[1]);
}

/** Statutory bracket rate that applies to the next dollar of ordinary taxable income. */
export function bracketRate(taxableIncome: number, fs: FilingStatus): number {
  const rows = BRACKETS_2026.value[scheduleKey(fs)];
  let rate = rows[0][1];
  for (const r of rows) if (taxableIncome >= r[0]) rate = r[1];
  return rate;
}

/** Standard deduction 2026: basic + additional amount × (number of 65+ boxes + blind boxes). */
export function standardDeduction(fs: FilingStatus, people65: number, peopleBlind: number) {
  const basicKey = fs === "mfsApart" ? "mfs" : fs;
  const basic = STANDARD_DEDUCTION_2026.value[basicKey];
  const each = isUnmarriedForAdditional(fs) ? ADDITIONAL_STD_2026.value.unmarried : ADDITIONAL_STD_2026.value.married;
  const boxes = clampPeople(people65, fs) + clampPeople(peopleBlind, fs);
  return { basic, each, boxes, total: basic + each * boxes };
}

export interface SeniorDeductionResult {
  eligibleStatus: boolean;
  qualifying: number;
  magi: number;
  threshold: number;
  reductionPerPerson: number;
  perPerson: number;
  total: number;
  /** MAGI at which the per-person amount reaches $0. */
  zeroAt: number;
}

/** OBBBA senior deduction (IRC §151(d)(5)(C); Schedule 1-A lines 31–37 of the 2025 form). */
export function seniorDeduction(fs: FilingStatus, people65: number, magi: number, year: number = 2026): SeniorDeductionResult {
  const p = SENIOR_DEDUCTION.value;
  const threshold = fs === "mfj" ? p.phaseoutStart.mfj : p.phaseoutStart.single;
  const zeroAt = threshold + p.perPerson / p.phaseoutRate;
  // Married individuals must file a joint return to claim it (§151(d)(5)(C)(v); IRS FS-2025-03).
  const eligibleStatus = !(p.marriedMustFileJointly && (fs === "mfs" || fs === "mfsApart")) && p.years.includes(year);
  const qualifying = eligibleStatus ? clampPeople(people65, fs) : 0;
  const reductionPerPerson = Math.max(0, magi - threshold) * p.phaseoutRate;
  const perPerson = qualifying > 0 ? Math.max(0, p.perPerson - reductionPerPerson) : 0;
  return { eligibleStatus, qualifying, magi, threshold, reductionPerPerson, perPerson, total: round2(perPerson * qualifying), zeroAt };
}

export interface PreferentialTax {
  /** Qualified dividends + net LTCG actually inside taxable income. */
  amount: number;
  at0: number;
  at15: number;
  at20: number;
  tax: number;
  /**
   * Worksheet line 25 picked line 24 (regular rates on all taxable income) because it was smaller than the stacked
   * computation — possible only when the gains sit in the sliver between the top of the 0% band and the top of the
   * 12% bracket. The at0/at15/at20 split then explains the stacked figure, not `tax`.
   */
  usedRegularRates: boolean;
}

/**
 * Qualified Dividends and Capital Gain Tax Worksheet (Form 1040 instructions), 2026 breakpoints.
 * Returns the total regular tax (min of the stacked computation and the all-ordinary computation, line 25) and the split.
 */
export function taxWithPreferential(taxableIncome: number, prefIncome: number, fs: FilingStatus): { total: number; ordinary: number; pref: PreferentialTax } {
  const ti = Math.max(0, taxableIncome);
  const l4 = Math.min(Math.max(0, prefIncome), ti); // line 4 (can't exceed taxable income)
  const l5 = ti - l4; // ordinary taxable income
  const [zeroMax, fifteenMax] = CAP_GAINS_2026.value[scheduleKey(fs)];
  const { zero, mid, top } = CAP_GAINS_RATES.value;
  const l7 = Math.min(ti, zeroMax);
  const l8 = Math.min(l5, l7);
  const l9 = l7 - l8; // taxed at 0%
  const l10 = Math.min(ti, l4);
  const l12 = l10 - l9;
  const l14 = Math.min(ti, fifteenMax);
  const l15 = l5 + l9;
  const l16 = Math.max(0, l14 - l15);
  const l17 = Math.min(l12, l16); // taxed at 15%
  const l20 = l10 - (l9 + l17); // taxed at 20%
  const l22 = ordinaryTax(l5, fs);
  const stacked = round2(l9 * zero + l17 * mid + l20 * top + l22);
  const allOrdinary = ordinaryTax(ti, fs);
  const total = round2(Math.min(stacked, allOrdinary));
  return {
    total,
    ordinary: l22,
    pref: { amount: l4, at0: l9, at15: l17, at20: l20, tax: round2(total - l22), usedRegularRates: allOrdinary < stacked },
  };
}

export interface FedTaxInput {
  year?: FedTaxYear;
  filingStatus: FilingStatus;
  /** Total Social Security benefits for the year (both spouses on a joint return). */
  ssBenefits: number;
  wages?: number;
  /** Taxable pensions and annuities. */
  pension?: number;
  /** Taxable IRA / 401(k) / 403(b) withdrawals, including RMDs (after any QCD). */
  iraDistributions?: number;
  taxableInterest?: number;
  /** Qualified dividends plus net long-term capital gains (taxed at 0/15/20%). */
  qualifiedDividendsLtcg?: number;
  /** Any other ordinary taxable income (non-qualified dividends, short-term gains, rental or business profit…). */
  otherOrdinary?: number;
  taxExemptInterest?: number;
  /** Schedule 1 adjustments (lowers AGI and provisional income). */
  adjustments?: number;
  itemizedDeductions?: number;
  /** People on the return who are 65 or older by December 31 (0–2; 0–1 unless married filing jointly). */
  people65?: number;
  peopleBlind?: number;
  /** Include the 3.8% Net Investment Income Tax. Default true. */
  includeNiit?: boolean;
  /** Apply the 2025–2028 senior deduction. Default true (turn off to measure what it is worth). */
  applySeniorDeduction?: boolean;
}

export interface FedTaxResult {
  year: FedTaxYear;
  ss: TaxableSsResult;
  /** Worksheet 1 line 3: all taxable income other than Social Security. */
  otherIncome: number;
  /** Everything received: all benefits + other income + tax-exempt interest (denominator of the effective rate). */
  grossIncome: number;
  agi: number;
  standard: ReturnType<typeof standardDeduction>;
  deductionType: "standard" | "itemized";
  deduction: number;
  senior: SeniorDeductionResult;
  taxableIncome: number;
  ordinaryTaxableIncome: number;
  ordinaryTax: number;
  pref: PreferentialTax;
  incomeTax: number;
  niit: number;
  niitBase: { nii: number; magi: number; threshold: number };
  totalTax: number;
  /** totalTax ÷ grossIncome. */
  effectiveRate: number;
  /** Statutory bracket of the next dollar of ordinary taxable income (0 when taxable income is 0). */
  bracket: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
/**
 * Sanity ceiling for any single dollar input ($1 quadrillion). Far beyond any real return, but it keeps sums of
 * several inputs finite, so a pasted 300-digit number can never turn the result into Infinity/NaN.
 */
export const MAX_AMOUNT = 1e15;
const pos = (x: number | undefined) => (x != null && Number.isFinite(x) ? Math.min(MAX_AMOUNT, Math.max(0, x)) : 0);
function clampPeople(n: number | undefined, fs: FilingStatus) {
  return Math.max(0, Math.min(maxPeople(fs), Math.floor(pos(n))));
}

export function computeFedTax(input: FedTaxInput): FedTaxResult {
  const year: FedTaxYear = input.year ?? 2026;
  const fs = input.filingStatus;
  const prefIn = pos(input.qualifiedDividendsLtcg);
  const interest = pos(input.taxableInterest);
  const otherIncome = pos(input.wages) + pos(input.pension) + pos(input.iraDistributions) + interest + prefIn + pos(input.otherOrdinary);
  const adjustments = pos(input.adjustments);
  const tei = pos(input.taxExemptInterest);
  const benefits = pos(input.ssBenefits);

  const ss = taxableSocialSecurity({ filingStatus: fs, benefits, otherIncome, taxExemptInterest: tei, adjustments });
  const agi = Math.max(0, otherIncome + ss.taxable - adjustments);

  const people65 = clampPeople(input.people65, fs);
  const standard = standardDeduction(fs, people65, pos(input.peopleBlind));
  const itemized = pos(input.itemizedDeductions);
  const deductionType = itemized > standard.total ? "itemized" : "standard";
  const deduction = deductionType === "itemized" ? itemized : standard.total;

  const senior = input.applySeniorDeduction === false ? seniorDeduction(fs, 0, agi, year) : seniorDeduction(fs, people65, agi, year);
  const taxableIncome = round2(Math.max(0, agi - deduction - senior.total));

  const { total: incomeTax, ordinary, pref } = taxWithPreferential(taxableIncome, prefIn, fs);
  const ordinaryTaxableIncome = taxableIncome - pref.amount;

  const niitKey = fs === "mfsApart" ? "mfs" : fs;
  const niitThreshold = NIIT.value.thresholds[niitKey];
  const nii = interest + prefIn;
  const niit = input.includeNiit === false ? 0 : round2(NIIT.value.rate * Math.max(0, Math.min(nii, agi - niitThreshold)));

  const totalTax = round2(incomeTax + niit);
  const grossIncome = otherIncome + benefits + tei;
  return {
    year,
    ss,
    otherIncome,
    grossIncome,
    agi,
    standard,
    deductionType,
    deduction,
    senior,
    taxableIncome,
    ordinaryTaxableIncome,
    ordinaryTax: ordinary,
    pref,
    incomeTax,
    niit,
    niitBase: { nii, magi: agi, threshold: niitThreshold },
    totalTax,
    effectiveRate: grossIncome > 0 ? totalTax / grossIncome : 0,
    bracket: taxableIncome > 0 ? bracketRate(ordinaryTaxableIncome, fs) : 0,
  };
}

export interface MarginalDetail {
  /** Extra federal tax per extra dollar of IRA withdrawals. */
  rate: number;
  /** Extra taxable Social Security per extra dollar (0, 0.5 or 0.85 — in between at a kink). */
  ssPhaseIn: number;
  /** Senior deduction lost per extra dollar (0.06 per qualifying person while it phases out). */
  seniorLoss: number;
  /** Extra tax in dollars for the whole `delta`. */
  extraTax: number;
  delta: number;
}

/** What `delta` more dollars of IRA withdrawals do to the return (finite difference: +$1,000 by default). */
export function marginalDetail(input: FedTaxInput, delta = 1000): MarginalDetail {
  const here = computeFedTax(input);
  const next = computeFedTax({ ...input, iraDistributions: pos(input.iraDistributions) + delta });
  const extraTax = round2(next.totalTax - here.totalTax);
  return {
    rate: (next.totalTax - here.totalTax) / delta,
    ssPhaseIn: (next.ss.taxable - here.ss.taxable) / delta,
    seniorLoss: (here.senior.total - next.senior.total) / delta,
    extraTax,
    delta,
  };
}

/** Extra federal tax caused by `delta` more dollars of IRA withdrawals, as a rate (finite difference). */
export function marginalRate(input: FedTaxInput, delta = 1000): number {
  return marginalDetail(input, delta).rate;
}

export interface TorpedoPoint {
  ira: number;
  /** Real marginal rate on the next $delta of IRA withdrawals. */
  marginal: number;
  /** The statutory bracket at that point. */
  bracket: number;
  /** Share of the next dollar that also makes Social Security taxable (0, 0.5, 0.85 — or in between at a kink). */
  ssPhaseIn: number;
  totalTax: number;
}

/** Upper bound on the number of points `torpedoCurve` computes (each is two whole-return computations). */
export const TORPEDO_MAX_POINTS = 401;

/**
 * The "tax torpedo": marginal federal rate as IRA withdrawals rise, everything else held constant.
 * Inside the Social Security phase-in, each extra $1 of income also makes $0.50 or $0.85 of benefits taxable,
 * so the real rate is the bracket × 1.5 or × 1.85 (and higher where the senior deduction is phasing out).
 */
export function torpedoCurve(input: FedTaxInput, opts: { from?: number; to?: number; step?: number; delta?: number } = {}): TorpedoPoint[] {
  const from = pos(opts.from ?? 0);
  const to = pos(opts.to ?? 150000);
  const delta = opts.delta != null && Number.isFinite(opts.delta) && opts.delta > 0 ? opts.delta : 1000;
  // A zero, negative or non-finite step would never reach `to` (an endless loop that freezes the page); and never
  // sample more than TORPEDO_MAX_POINTS points, whatever the caller asks for.
  const minStep = (to - from) / (TORPEDO_MAX_POINTS - 1);
  const rawStep = opts.step ?? 2500;
  const step = Number.isFinite(rawStep) && rawStep > 0 ? Math.max(rawStep, minStep) : Math.max(2500, minStep);
  const pts: TorpedoPoint[] = [];
  if (!(step > 0) || to < from) return pts;
  for (let i = 0; i < TORPEDO_MAX_POINTS; i++) {
    const ira = from + i * step;
    if (ira > to + 1e-9) break;
    const here = computeFedTax({ ...input, iraDistributions: ira });
    const next = computeFedTax({ ...input, iraDistributions: ira + delta });
    pts.push({
      ira,
      marginal: (next.totalTax - here.totalTax) / delta,
      bracket: here.bracket,
      ssPhaseIn: (next.ss.taxable - here.ss.taxable) / delta,
      totalTax: here.totalTax,
    });
  }
  return pts;
}

/** Contiguous IRA-withdrawal ranges in which more income also makes more Social Security taxable. */
export function torpedoZones(points: TorpedoPoint[]): { from: number; to: number; peak: number }[] {
  const zones: { from: number; to: number; peak: number }[] = [];
  let cur: { from: number; to: number; peak: number } | null = null;
  for (const p of points) {
    if (p.ssPhaseIn > 0) {
      if (!cur) cur = { from: p.ira, to: p.ira, peak: p.marginal };
      cur.to = p.ira;
      cur.peak = Math.max(cur.peak, p.marginal);
    } else if (cur) {
      zones.push(cur);
      cur = null;
    }
  }
  if (cur) zones.push(cur);
  return zones;
}

/** Smallest Form W-4V withholding rate that covers `tax` from `benefits` (null when even the highest is not enough). */
export function w4vRateToCover(tax: number, benefits: number, rates: readonly number[]): number | null {
  if (tax <= 0) return 0;
  if (benefits <= 0) return null;
  const need = tax / benefits;
  const sorted = [...rates].sort((a, b) => a - b);
  return sorted.find((r) => r >= need) ?? null;
}
