/**
 * Social Security retirement earnings test (RET) — "working while collecting" before full retirement age.
 *
 * Rules implemented (see docs/research/ss_mechanics.json and the cited pages):
 * - Who/when: applies to months before the RETIREMENT full retirement age (FRA); never from the FRA month on.
 *   Years before the FRA year count ALL earnings of the calendar year (even months before benefits start) against the
 *   lower exempt amount; the FRA year counts only earnings for months BEFORE the FRA month against the higher amount,
 *   used in full (not prorated). POMS RS 02501.021 B.1, B.4, B.6.
 * - Excess: $1 per $2 over the lower amount, $1 per $3 over the higher amount, rounded DOWN to the dollar.
 *   POMS RS 02501.080 B.1.d, B.2.a; ssa.gov/oact/cola/rtea.html. Self-employment net earnings in the FRA year are
 *   prorated evenly over the months of self-employment (divide, drop cents, multiply). RS 02501.080 B.2.c.
 * - Charging: the excess is charged against whole monthly benefits beginning with the first month of entitlement in the
 *   year, month by month, until recovered or every month is withheld; never carried into the next year. A worker's
 *   excess is charged against the TOTAL family benefit on the record (except a qualifying divorced spouse).
 *   POMS RS 02501.095 B.1–B.2. When the excess charged to the last month is less than a full benefit the whole month is
 *   suspended and the difference ("partial monthly benefit") is paid later. RS 02501.100 A, B.2.
 * - Months that cannot be charged: months not entitled, grace-year non-service months, months at/after FRA.
 *   RS 02501.095 B.5.b. Grace year (monthly earnings test): full benefit for any non-service month — wages at or below
 *   the MONTHLY exempt amount and no substantial self-employment services. RS 02501.030; RS 02505.065.
 * - Getting it back: every month with a full or partial work deduction is a crediting month (RS 00615.482 B.1);
 *   at FRA the age reduction is recomputed without those months, effective with the FRA month. 20 CFR 404.412.
 */
import { SS_YEAR } from "@/data/params/social-security";
import { RET_RATIO } from "@/data/params/earnings-test-extra";
import { earliestRetirementMonth, earlyRetirementFactor, fra as fraOf, fraMonth as fraMonthOf, type Fra } from "./ss-core";
import { fromMonthIndex, monthIndex, roundDownToDime, roundDownToDollar, roundToCents, type YMD } from "./dates";

export type RetYear = keyof typeof SS_YEAR;
export const RET_YEARS = Object.keys(SS_YEAR).map(Number) as RetYear[];

export type RetPhase = "under-fra" | "fra-year" | "after-fra";

export interface ExemptAmounts {
  annual: number;
  monthly: number;
  /** Dollars of earnings over the annual amount per $1 withheld (2 or 3). */
  ratio: number;
}

/** Annual/monthly exempt amounts and withholding ratio for a year and phase (SSA fact sheets; rtea.html). */
export function exemptAmounts(year: RetYear, phase: Exclude<RetPhase, "after-fra">): ExemptAmounts {
  const y = SS_YEAR[year].value;
  return phase === "fra-year"
    ? { annual: y.retFraYearAnnual, monthly: y.retFraYearMonthly, ratio: RET_RATIO.fraYear.value }
    : { annual: y.retUnderFraAnnual, monthly: y.retUnderFraMonthly, ratio: RET_RATIO.underFra.value };
}

/**
 * Excess earnings: (earnings − exempt amount) ÷ ratio, rounded down to the next lower dollar; 0 when not above.
 * POMS RS 02501.080 B.1.c–d and B.2.a.
 */
export function excessEarnings(earnings: number, exemptAnnual: number, ratio: number): number {
  const over = Math.floor(earnings) - exemptAnnual;
  if (over <= 0) return 0;
  return Math.floor(Math.round((over / ratio) * 1e6) / 1e6);
}

/**
 * FRA-year earnings counted for the test when only a yearly figure is known: spread evenly over the months worked
 * (cents dropped from the monthly amount), times the months before the FRA month. POMS RS 02501.080 B.2.c–d.
 */
export function prorateBeforeFra(annual: number, monthsBeforeFra: number, monthsWorked = 12): number {
  if (annual <= 0 || monthsBeforeFra <= 0 || monthsWorked <= 0) return 0;
  return Math.floor(annual / monthsWorked) * Math.min(monthsBeforeFra, monthsWorked);
}

export interface ChargeResult {
  /** Amount of excess charged to each month (same order as the input). */
  charged: number[];
  /** Index of the month that is only partly charged (whole month suspended, rest paid later), or -1. */
  partialIndex: number;
  totalCharged: number;
  /** Excess left over after every month was withheld — dropped, never carried into the next year. */
  notCharged: number;
}

/**
 * Charge an excess against monthly benefits in order (POMS RS 02501.095 B.1; RS 02501.100 B.2).
 * Example (RS 02501.100): $562/month, excess $2,880 → January–May fully charged, June charged $70 (suspended in full,
 * $492 paid later).
 */
export function chargeExcess(excess: number, monthlyBenefits: number[]): ChargeResult {
  let left = Math.max(0, excess);
  let partialIndex = -1;
  const charged = monthlyBenefits.map((b, i) => {
    if (left <= 0 || b <= 0) return 0;
    const c = Math.min(b, left);
    left = roundToCents(left - c);
    if (c < b) partialIndex = i;
    return c;
  });
  const totalCharged = roundToCents(charged.reduce((a, b) => a + b, 0));
  return { charged, partialIndex, totalCharged, notCharged: left };
}

export interface ArfResult {
  reductionMonthsAtStart: number;
  creditingMonths: number;
  reductionMonthsAfter: number;
  factorBefore: number;
  factorAfter: number;
  /** Benefit at FRA before any reduction, estimated from the reduced benefit you entered. */
  piaEstimate: number;
  /** Monthly payment from the FRA month (rounded down to $0.10, then to $1 — 20 CFR 404.304). */
  benefitAfter: number;
  increase: number;
}

/**
 * Adjustment of the reduction factor at FRA (20 CFR 404.412; POMS RS 00615.482): the age reduction is recomputed with
 * (original reduction months − crediting months), using 5/9% for the first 36 months and 5/12% beyond.
 * Example: FRA 67, claimed at 62 (60 months), 25 crediting months → 35 months → 80.56% of the full benefit.
 * The full benefit (PIA) is estimated as the entered reduced benefit ÷ the original factor.
 */
export function adjustReductionFactor({
  monthlyBenefit,
  reductionMonths,
  creditingMonths,
}: {
  monthlyBenefit: number;
  reductionMonths: number;
  creditingMonths: number;
}): ArfResult {
  const rf = Math.max(0, reductionMonths);
  const credited = Math.max(0, Math.min(rf, creditingMonths));
  const after = rf - credited;
  const factorBefore = earlyRetirementFactor(rf);
  const factorAfter = earlyRetirementFactor(after);
  const piaEstimate = monthlyBenefit / factorBefore;
  const benefitAfter = credited === 0 ? monthlyBenefit : Math.max(monthlyBenefit, roundDownToDollar(roundDownToDime(piaEstimate * factorAfter)));
  return {
    reductionMonthsAtStart: rf,
    creditingMonths: credited,
    reductionMonthsAfter: after,
    factorBefore,
    factorAfter,
    piaEstimate: roundToCents(piaEstimate),
    benefitAfter,
    increase: roundToCents(benefitAfter - monthlyBenefit),
  };
}

export interface BreakEven {
  /** Increased monthly payments needed to repay the withheld amount. */
  months: number;
  /** Age (SSA attainment basis) once those payments have been received. */
  ageMonths: number;
  /** Calendar month index of the last payment needed. */
  monthIndex: number;
}

/** When does the higher benefit from FRA on pay back what was withheld? (Nominal dollars; future COLAs ignored.) */
export function breakEvenAfterFra(withheld: number, increase: number, fra: Fra, fraMonth: number): BreakEven | null {
  if (withheld <= 0 || increase <= 0) return null;
  const months = Math.ceil(Math.round((withheld / increase) * 1e6) / 1e6);
  return { months, ageMonths: fra.total + months, monthIndex: fraMonth + months - 1 };
}

export type MonthStatus = "not-entitled" | "at-fra" | "retired-month" | "withheld" | "partial" | "paid";

export interface MonthRow {
  /** 1–12 */
  month: number;
  status: MonthStatus;
  /** Family benefit due for the month (0 when not entitled). */
  benefit: number;
  /** Benefit lost to the earnings test for good (excess charged to this month). */
  withheld: number;
  /** Partial month: suspended now, released after SSA settles the year. */
  paidLater: number;
  /** Paid on schedule. */
  paidOnTime: number;
}

export interface EarningsTestInput {
  dob: YMD;
  year: RetYear;
  /** Your own monthly benefit before Medicare premiums or tax withholding. */
  monthlyBenefit: number;
  /** Wages plus net self-employment earnings for the whole calendar year. */
  annualEarnings: number;
  /** FRA year only: earnings in the months before the FRA month. When omitted, the yearly figure is prorated. */
  earningsBeforeFra?: number | null;
  /** Month index (year*12 + month0) of the first month of entitlement. Clamped to the earliest possible month. */
  benefitStart: number;
  /** Apply the monthly earnings test (grace year). */
  graceYear?: boolean;
  /** Grace year: months (1–12) with wages ≤ the monthly exempt amount and no substantial self-employment. */
  nonServiceMonths?: number[];
  /** Monthly benefits of a spouse/children on YOUR record (not a qualifying divorced spouse): charged with your excess. */
  familyOnRecord?: number;
}

export type EarningsTestStatus = "after-fra" | "starts-at-fra" | "not-collecting" | "under-limit" | "protected" | "withheld";

export interface EarningsTestResult {
  status: EarningsTestStatus;
  phase: RetPhase;
  fra: Fra;
  fraMonth: number;
  fraYear: number;
  benefitStart: number;
  startClamped: boolean;
  exempt: ExemptAmounts;
  /** Months of the year before the FRA month (12 in years before the FRA year). */
  monthsBeforeFraInYear: number;
  countedEarnings: number;
  excess: number;
  familyMonthly: number;
  months: MonthRow[];
  /** Family benefits due for entitled months of the year. */
  benefitsDue: number;
  totalWithheld: number;
  excessNotCharged: number;
  totalPaid: number;
  fullMonthsWithheld: number;
  /** 1–12, or null. */
  partialMonth: number | null;
  creditingMonths: number;
  /** Benefits in months the excess can be charged to. */
  chargeableBenefits: number;
  /** Counted earnings at which every chargeable month is fully withheld (null when nothing is chargeable). */
  earningsToWithholdAll: number | null;
  /** How much more could be earned before any withholding (0 when already over). */
  headroom: number;
  /** Your share of what was withheld (family charging splits each month in proportion to the benefits). */
  workerWithheld: number;
  /** Your own benefits due for entitled months of the year (excludes family members). */
  workerBenefitsDue: number;
  /** Your own benefits actually received for the year (due − your share withheld; partial months included). */
  workerPaid: number;
  /** Grace year only: what would have been withheld without the monthly test. */
  withheldWithoutGrace: number | null;
  graceApplied: boolean;
  /** Months of entitlement before FRA when benefits started (the original age reduction). */
  reductionMonths: number;
  /** Full-retirement-age benefit (PIA) implied by the entered benefit and start month; null if benefits start at/after FRA. */
  piaEstimate: number | null;
  arf: ArfResult | null;
  breakEven: BreakEven | null;
}

/** Empty, negative, NaN or infinite money inputs count as $0. */
const nonNegative = (x: number | null | undefined) => (x != null && Number.isFinite(x) && x > 0 ? x : 0);

/** Calendar year in which full retirement age is reached. */
export function fraYearOf(dob: YMD) {
  return fromMonthIndex(fraMonthOf(dob)).year;
}

/** Run the earnings test for one calendar year. */
export function computeEarningsTest(input: EarningsTestInput): EarningsTestResult {
  const { dob, year } = input;
  const ben = nonNegative(input.monthlyBenefit);
  const aux = nonNegative(input.familyOnRecord);
  const familyMonthly = roundToCents(ben + aux);
  const fra = fraOf(dob);
  const fm = fraMonthOf(dob);
  const fy = fromMonthIndex(fm).year;
  const earliest = earliestRetirementMonth(dob);
  const benefitStart = Math.max(input.benefitStart, earliest);
  const startClamped = input.benefitStart < earliest;
  const jan = monthIndex(year, 1);
  const dec = monthIndex(year, 12);

  const monthsBeforeFraInYear = year < fy ? 12 : year === fy ? fm - jan : 0;
  const phase: RetPhase = monthsBeforeFraInYear === 0 ? "after-fra" : year === fy ? "fra-year" : "under-fra";
  const exempt = exemptAmounts(year, phase === "fra-year" ? "fra-year" : "under-fra");

  const earnings = nonNegative(input.annualEarnings);
  const beforeFra = input.earningsBeforeFra;
  const countedEarnings =
    phase === "after-fra"
      ? 0
      : phase === "fra-year"
        ? beforeFra != null && Number.isFinite(beforeFra)
          ? Math.max(0, beforeFra)
          : prorateBeforeFra(earnings, monthsBeforeFraInYear)
        : earnings;
  const excess = phase === "after-fra" ? 0 : excessEarnings(countedEarnings, exempt.annual, exempt.ratio);

  const nsm = new Set(input.graceYear ? (input.nonServiceMonths ?? []) : []);
  const rows: MonthRow[] = [];
  const chargeIdx: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const idx = monthIndex(year, m);
    const entitled = idx >= benefitStart;
    const benefit = entitled ? familyMonthly : 0;
    let status: MonthStatus;
    if (!entitled) status = "not-entitled";
    else if (idx >= fm) status = "at-fra";
    else if (nsm.has(m)) status = "retired-month";
    else {
      status = "paid";
      chargeIdx.push(m - 1);
    }
    rows.push({ month: m, status, benefit, withheld: 0, paidLater: 0, paidOnTime: benefit });
  }

  const chargeableBenefits = roundToCents(chargeIdx.length * familyMonthly);
  const charge = chargeExcess(
    excess,
    chargeIdx.map(() => familyMonthly),
  );
  charge.charged.forEach((c, k) => {
    if (c <= 0) return;
    const row = rows[chargeIdx[k]];
    row.withheld = c;
    row.paidOnTime = 0;
    row.paidLater = roundToCents(row.benefit - c);
    row.status = row.paidLater > 0 ? "partial" : "withheld";
  });

  let withheldWithoutGrace: number | null = null;
  const graceApplied = Boolean(input.graceYear) && rows.some((r) => r.status === "retired-month");
  if (graceApplied) {
    const all = rows.filter((r) => r.status !== "not-entitled" && r.status !== "at-fra").length;
    withheldWithoutGrace = chargeExcess(excess, Array.from({ length: all }, () => familyMonthly)).totalCharged;
  }

  const benefitsDue = roundToCents(rows.reduce((a, r) => a + r.benefit, 0));
  const totalWithheld = charge.totalCharged;
  const fullMonthsWithheld = rows.filter((r) => r.status === "withheld").length;
  const partialRow = rows.find((r) => r.status === "partial");
  const creditingMonths = fullMonthsWithheld + (partialRow ? 1 : 0);
  const workerWithheld = familyMonthly > 0 ? roundToCents((totalWithheld * ben) / familyMonthly) : 0;
  const workerBenefitsDue = roundToCents(rows.filter((r) => r.benefit > 0).length * ben);

  let status: EarningsTestStatus;
  if (phase === "after-fra") status = "after-fra";
  else if (benefitStart >= fm) status = "starts-at-fra";
  else if (benefitStart > dec) status = "not-collecting";
  else if (excess === 0) status = "under-limit";
  else if (totalWithheld === 0) status = "protected";
  else status = "withheld";

  const reductionMonths = Math.max(0, fm - benefitStart);
  const arf = ben > 0 && reductionMonths > 0 && status === "withheld" ? adjustReductionFactor({ monthlyBenefit: ben, reductionMonths, creditingMonths }) : null;
  const piaEstimate = ben > 0 && reductionMonths > 0 ? roundToCents(ben / earlyRetirementFactor(reductionMonths)) : null;
  const breakEven = arf ? breakEvenAfterFra(workerWithheld, arf.increase, fra, fm) : null;

  return {
    status,
    phase,
    fra,
    fraMonth: fm,
    fraYear: fy,
    benefitStart,
    startClamped,
    exempt,
    monthsBeforeFraInYear,
    countedEarnings,
    excess,
    familyMonthly,
    months: rows,
    benefitsDue,
    totalWithheld,
    excessNotCharged: charge.notCharged,
    totalPaid: roundToCents(benefitsDue - totalWithheld),
    fullMonthsWithheld,
    partialMonth: partialRow ? partialRow.month : null,
    creditingMonths,
    chargeableBenefits,
    // floor((E − limit) ÷ ratio) ≥ benefits ⇔ E ≥ limit + ratio × (benefits rounded up to the dollar).
    earningsToWithholdAll: chargeableBenefits > 0 ? exempt.annual + exempt.ratio * Math.ceil(Math.round(chargeableBenefits * 100) / 100) : null,
    headroom: phase === "after-fra" ? 0 : Math.max(0, exempt.annual - countedEarnings),
    workerWithheld,
    workerBenefitsDue,
    workerPaid: roundToCents(workerBenefitsDue - workerWithheld),
    withheldWithoutGrace,
    graceApplied,
    reductionMonths,
    piaEstimate,
    arf,
    breakEven,
  };
}
