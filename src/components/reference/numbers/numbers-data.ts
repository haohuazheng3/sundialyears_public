/**
 * Every 2026 → 2027 retirement number in one structure, assembled from the cited parameter files.
 * Pure data (no React), safe to import from server components and tests. Nothing here is typed by hand:
 * every value is read from src/data/params/* or src/data/generated/*.
 */
import type { Source, Status } from "@/data/params/types";
import { SRC } from "@/data/params/sources";
import { COLA, SS_YEAR, MAX_BENEFIT_2027 } from "@/data/params/social-security";
import { PART_A, PART_B, PART_D, IRMAA_2026, IRMAA_2027 } from "@/data/params/medicare";
import { QCD, SENIOR_DEDUCTION, SS_TAX_THRESHOLDS, STANDARD_DEDUCTION_2026, ADDITIONAL_STD_2026, CAP_GAINS_2026, NIIT } from "@/data/params/tax";
import { RMD_AGE_RULES, RMD_EXCISE } from "@/data/params/rmd";
import { AWI } from "@/data/generated/awi";
import {
  MAX_BENEFIT_2026,
  MAX_EXAMPLE_AGE62,
  PART_A_LIFETIME_RESERVE_DAYS,
  PAYROLL_TAX,
  PENDING_2027_EXTRA,
  PIA_FACTORS,
  RET_WITHHOLDING,
  SS_BENEFIT_TAXABLE_SHARE,
  SSI_RESOURCE_LIMITS,
  SRC_EXTRA,
  WORK_CREDITS,
} from "@/data/params/numbers-extra";
import { fraForCohort } from "@/lib/calc/ss-core";
import { longDate, money, money2 } from "@/lib/format";
import type { IconName } from "@/lib/tools";
import { PARAM_STATUS_SUMMARY } from "@/data/params";

export type Per = "mo" | "yr" | "day" | "person";

/** A single cell value. `per` is shown after money values. */
export type Cell =
  | { t: "usd"; v: number; per?: Per }
  | { t: "usd2"; v: number; per?: Per }
  /** Two dollar amounts shown as "a / b" (e.g. single / joint). */
  | { t: "pair"; v: readonly [number, number]; per?: Per }
  | { t: "pct"; v: number }
  | { t: "num"; v: number }
  | { t: "text"; v: string }
  | { t: "pending" };

export interface NumberRow {
  id: string;
  label: string;
  /** One short line of plain-English context. */
  detail?: string;
  y2026: Cell;
  y2027: Cell;
  /** Status of the 2027 figure (every 2026 figure is final). */
  status: Status;
  source: Source;
  /** Our calculator or reference page for this number. */
  href?: string;
  /** Overrides the computed "change" text (for text cells). */
  changeNote?: string;
}

export interface NumberGroup {
  id: string;
  title: string;
  icon: IconName;
  blurb: string;
  rows: NumberRow[];
}

const usd = (v: number, per?: Per): Cell => ({ t: "usd", v, per });
const usd2 = (v: number, per?: Per): Cell => ({ t: "usd2", v, per });
const pair = (a: number, b: number, per?: Per): Cell => ({ t: "pair", v: [a, b], per });
const pct = (v: number): Cell => ({ t: "pct", v });
const pending: Cell = { t: "pending" };

const ss26 = SS_YEAR[2026].value;
const ss27 = SS_YEAR[2027].value;
const age = (k: string) => Number(k.replace("age", ""));

/** Maximum Social Security (OASDI) tax for one employee = taxable maximum × employee rate. */
export const maxOasdiTax = (taxableMax: number) => Math.round(taxableMax * PAYROLL_TAX.value.oasdiEmployee) / 100;

const rmdAge73 = RMD_AGE_RULES.value.find((r) => r.age === 73)!;
const rmdAge75 = RMD_AGE_RULES.value.find((r) => r.age === 75)!;

const ssRows: NumberRow[] = [
  {
    id: "cola",
    label: "Cost-of-living adjustment (COLA)",
    detail: "The raise in Social Security and SSI checks that starts that January.",
    y2026: pct(COLA[2026].value),
    y2027: pct(COLA[2027].value),
    status: COLA[2027].status,
    source: COLA[2027].source,
    href: "/social-security-cola",
  },
  {
    id: "avg-retired",
    label: "Average retired-worker benefit",
    detail: "SSA’s estimate for January, after that year’s COLA.",
    y2026: usd(ss26.avgRetiredWorkerAfterCola, "mo"),
    y2027: usd(ss27.avgRetiredWorkerAfterCola, "mo"),
    status: SS_YEAR[2027].status,
    source: SS_YEAR[2027].source,
    href: "/social-security-cola",
  },
  {
    id: "avg-couple",
    label: "Average benefit, retired couple",
    detail: "Both spouses receiving benefits, January after the COLA.",
    y2026: usd(ss26.avgCoupleAfterCola, "mo"),
    y2027: usd(ss27.avgCoupleAfterCola, "mo"),
    status: SS_YEAR[2027].status,
    source: SS_YEAR[2027].source,
  },
  {
    id: "max-fra",
    label: "Maximum benefit at full retirement age",
    // SSA's example worker reaching full retirement age in January 2026 was born in 1959; in January 2027, born in 1960.
    detail: `Top earner retiring that January at full retirement age (${fraForCohort(1959).label} in 2026, ${fraForCohort(1960).label} in 2027).`,
    y2026: usd(ss26.maxBenefitAtFra, "mo"),
    y2027: usd(ss27.maxBenefitAtFra, "mo"),
    status: SS_YEAR[2027].status,
    source: SS_YEAR[2027].source,
    href: "/social-security-break-even-calculator",
  },
  ...(["age62", "age70"] as const).map(
    (k): NumberRow => ({
      id: `max-${k}`,
      label: `Maximum benefit when claiming at ${age(k)}`,
      detail: k === "age62" ? `SSA’s top-earner example, starting benefits that January at ${MAX_EXAMPLE_AGE62.value.label}.` : "SSA’s top-earner example, starting benefits that January.",
      y2026: usd(MAX_BENEFIT_2026.value[k], "mo"),
      y2027: usd(MAX_BENEFIT_2027.value[k], "mo"),
      status: MAX_BENEFIT_2027.status,
      source: MAX_BENEFIT_2027.source,
      href: "/social-security-break-even-calculator",
    }),
  ),
  {
    id: "ret-under",
    label: "Earnings-test limit before full retirement age",
    detail: `Earn more and SSA holds back $1 of benefits for every $${RET_WITHHOLDING.value.beforeFraYear} over the limit.`,
    y2026: usd(ss26.retUnderFraAnnual, "yr"),
    y2027: usd(ss27.retUnderFraAnnual, "yr"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaRet,
    href: "/social-security-earnings-limit-calculator",
  },
  {
    id: "ret-fra-year",
    label: "Earnings-test limit in the year you reach full retirement age",
    detail: `Counts only earnings before the month you reach it; $1 held back for every $${RET_WITHHOLDING.value.inFraYear} over.`,
    y2026: usd(ss26.retFraYearAnnual, "yr"),
    y2027: usd(ss27.retFraYearAnnual, "yr"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaRet,
    href: "/social-security-earnings-limit-calculator",
  },
  {
    id: "taxable-max",
    label: "Taxable maximum (pay subject to Social Security tax)",
    detail: `Pay above it is free of the ${PAYROLL_TAX.value.oasdiEmployee}% Social Security tax; the Medicare tax has no cap.`,
    y2026: usd(ss26.taxableMax, "yr"),
    y2027: usd(ss27.taxableMax, "yr"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaCbb,
  },
  {
    id: "max-tax",
    label: "Most Social Security tax one employee can pay",
    detail: `${PAYROLL_TAX.value.oasdiEmployee}% of the taxable maximum (your employer pays the same).`,
    y2026: usd2(maxOasdiTax(ss26.taxableMax), "yr"),
    y2027: usd2(maxOasdiTax(ss27.taxableMax), "yr"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaCbb,
  },
  {
    id: "payroll-rate",
    label: "Payroll tax rate (employee share)",
    detail: `${PAYROLL_TAX.value.oasdiEmployee}% Social Security + ${PAYROLL_TAX.value.hiEmployee}% Medicare; ${PAYROLL_TAX.value.combinedSelfEmployed}% if self-employed.`,
    y2026: pct(PAYROLL_TAX.value.combinedEmployee),
    y2027: pct(PAYROLL_TAX.value.combinedEmployee),
    status: PAYROLL_TAX.status,
    source: PAYROLL_TAX.source,
  },
  {
    id: "qc",
    label: "Earnings for one work credit (quarter of coverage)",
    detail: `You can earn up to ${WORK_CREDITS.value.maxPerYear} credits a year; ${WORK_CREDITS.value.neededForRetirement} credits qualify you for retirement benefits.`,
    y2026: usd(ss26.quarterOfCoverage),
    y2027: usd(ss27.quarterOfCoverage),
    status: SS_YEAR[2027].status,
    source: SRC_EXTRA.ssaQc,
  },
  {
    id: "sga",
    label: "Substantial gainful activity (SGA), disability, non-blind",
    detail: "Earning more than this a month generally means SSA won’t consider you disabled.",
    y2026: usd(ss26.sgaNonBlind, "mo"),
    y2027: usd(ss27.sgaNonBlind, "mo"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaAutoAdj,
  },
  {
    id: "sga-blind",
    label: "Substantial gainful activity, blind",
    y2026: usd(ss26.sgaBlind, "mo"),
    y2027: usd(ss27.sgaBlind, "mo"),
    status: SS_YEAR[2027].status,
    source: SRC.ssaAutoAdj,
  },
  {
    id: "twp",
    label: "Trial work period month (disability)",
    detail: "Any month you earn more than this counts as a trial work month.",
    y2026: usd(ss26.trialWorkMonth, "mo"),
    y2027: usd(ss27.trialWorkMonth, "mo"),
    status: SS_YEAR[2027].status,
    source: SS_YEAR[2027].source,
  },
  {
    id: "ssi-ind",
    label: "SSI federal payment, individual",
    detail: "Supplemental Security Income maximum; many states add a supplement.",
    y2026: usd(ss26.ssiIndividual, "mo"),
    y2027: usd(ss27.ssiIndividual, "mo"),
    status: SS_YEAR[2027].status,
    source: SRC_EXTRA.ssaSsiAmounts,
    href: "/social-security-cola",
  },
  {
    id: "ssi-couple",
    label: "SSI federal payment, couple",
    y2026: usd(ss26.ssiCouple, "mo"),
    y2027: usd(ss27.ssiCouple, "mo"),
    status: SS_YEAR[2027].status,
    source: SRC_EXTRA.ssaSsiAmounts,
  },
  {
    id: "ssi-resources",
    label: "SSI resource limit (individual / couple)",
    detail: "Set by law and never adjusted for inflation.",
    y2026: pair(SSI_RESOURCE_LIMITS.value.individual, SSI_RESOURCE_LIMITS.value.couple),
    y2027: pair(SSI_RESOURCE_LIMITS.value.individual, SSI_RESOURCE_LIMITS.value.couple),
    status: SSI_RESOURCE_LIMITS.status,
    source: SSI_RESOURCE_LIMITS.source,
  },
  {
    id: "bend",
    label: "Benefit formula bend points",
    detail: `Set by the year you turn 62: ${PIA_FACTORS.value[0]}% of average indexed monthly earnings up to the first, ${PIA_FACTORS.value[1]}% up to the second, ${PIA_FACTORS.value[2]}% above.`,
    y2026: pair(ss26.piaBendPoints[0], ss26.piaBendPoints[1]),
    y2027: pair(ss27.piaBendPoints[0], ss27.piaBendPoints[1]),
    status: SS_YEAR[2027].status,
    source: SRC.ssaBendPoints,
  },
  {
    id: "awi",
    label: "National average wage index behind the year’s figures",
    detail: "Wage-indexed amounts use the index from two years earlier.",
    y2026: usd2(AWI[2024]),
    y2027: usd2(AWI[2025]),
    status: "official",
    source: SRC.ssaAwi,
  },
];

const i26 = IRMAA_2026;
const i27 = IRMAA_2027;

const medicareRows: NumberRow[] = [
  {
    id: "partb-premium",
    label: "Part B standard premium",
    detail: "Usually taken straight out of your Social Security check.",
    y2026: usd2(PART_B[2026].value.premium, "mo"),
    y2027: usd2(PART_B[2027].value.premium, "mo"),
    status: PART_B[2027].status,
    source: PART_B[2027].source,
    href: "/medicare-premium-calculator",
  },
  {
    id: "partb-deductible",
    label: "Part B annual deductible",
    y2026: usd(PART_B[2026].value.deductible, "yr"),
    y2027: usd(PART_B[2027].value.deductible, "yr"),
    status: PART_B[2027].status,
    source: PART_B[2027].source,
  },
  {
    id: "irmaa-first",
    label: "IRMAA surcharge starts above (single / joint income)",
    detail: `The income-related monthly adjustment amount uses your ${i26.magiTaxYear} tax return for 2026 and your ${i27.magiTaxYear} return for 2027.`,
    y2026: pair(i26.individualBounds[0], i26.jointBounds[0]),
    y2027: pair(i27.individualBounds[0], i27.jointBounds[0]),
    status: i27.boundsStatus,
    source: i27.source,
    href: "/irmaa-brackets-2027",
  },
  {
    id: "irmaa-top",
    label: "Top IRMAA tier starts at (single / joint)",
    detail: "Fixed by law through 2027; indexing starts in 2028.",
    y2026: pair(i26.topIndividual, i26.topJoint),
    y2027: pair(i27.topIndividual, i27.topJoint),
    status: "official",
    source: SRC_EXTRA.ecfrIrmaaTopTier,
    href: "/irmaa-brackets-2027",
  },
  {
    id: "irmaa-top-premium",
    label: "Part B premium in the top IRMAA tier",
    y2026: usd2(i26.standardPartB + i26.partBAddOn[5], "mo"),
    y2027: usd2(i27.standardPartB + i27.partBAddOn[5], "mo"),
    status: i27.status,
    source: i27.amountsSource ?? i27.source,
    href: "/irmaa-calculator",
  },
  {
    id: "parta-deductible",
    label: "Part A hospital deductible (per benefit period)",
    y2026: usd(PART_A[2026].value.deductible),
    y2027: usd(PART_A[2027].value.deductible),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "parta-61-90",
    label: "Part A hospital coinsurance, days 61–90",
    y2026: usd(PART_A[2026].value.coinsuranceDays61to90, "day"),
    y2027: usd(PART_A[2027].value.coinsuranceDays61to90, "day"),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "parta-lrd",
    label: "Part A coinsurance, lifetime reserve days",
    detail: `Per day, once a hospital stay passes day 90 and you draw on your ${PART_A_LIFETIME_RESERVE_DAYS.value} lifetime reserve days.`,
    y2026: usd(PART_A[2026].value.lifetimeReserveDay, "day"),
    y2027: usd(PART_A[2027].value.lifetimeReserveDay, "day"),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "snf",
    label: "Skilled nursing facility, days 21–100",
    y2026: usd2(PART_A[2026].value.snfDays21to100, "day"),
    y2027: usd2(PART_A[2027].value.snfDays21to100, "day"),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "parta-premium",
    label: "Part A premium if you have under 30 work quarters",
    detail: `Most people pay no Part A premium (${WORK_CREDITS.value.neededForRetirement} or more quarters of work).`,
    y2026: usd(PART_A[2026].value.premiumUnder30Quarters, "mo"),
    y2027: usd(PART_A[2027].value.premiumUnder30Quarters, "mo"),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "parta-premium-reduced",
    label: "Part A premium with 30–39 work quarters",
    y2026: usd(PART_A[2026].value.premium30to39Quarters, "mo"),
    y2027: usd(PART_A[2027].value.premium30to39Quarters, "mo"),
    status: PART_A[2027].status,
    source: PART_A[2027].source,
  },
  {
    id: "partd-base",
    label: "Part D base beneficiary premium",
    detail: "Not your plan’s price — it’s the yardstick for the late-enrollment penalty and Part D IRMAA.",
    y2026: usd2(PART_D[2026].value.baseBeneficiaryPremium, "mo"),
    y2027: usd2(PART_D[2027].value.baseBeneficiaryPremium, "mo"),
    status: PART_D[2027].status,
    source: SRC.cmsPartD2027,
  },
  {
    id: "partd-deductible",
    label: "Part D maximum deductible",
    y2026: usd(PART_D[2026].value.deductible, "yr"),
    y2027: usd(PART_D[2027].value.deductible, "yr"),
    status: PART_D[2027].status,
    source: PART_D[2027].source,
  },
  {
    id: "partd-cap",
    label: "Part D out-of-pocket cap",
    detail: "Once you’ve paid this much for covered drugs, you pay $0 for the rest of the year.",
    y2026: usd(PART_D[2026].value.outOfPocketCap, "yr"),
    y2027: usd(PART_D[2027].value.outOfPocketCap, "yr"),
    status: PART_D[2027].status,
    source: PART_D[2027].source,
  },
];

const firstRmdBirthYear = (year: number) => year - rmdAge73.age;
const qcd26 = QCD[2026].value;

const rmdRows: NumberRow[] = [
  {
    id: "rmd-age-73",
    label: `RMD age — ${rmdAge73.label.toLowerCase()}`,
    detail: "Required minimum distributions from traditional IRAs and 401(k)s.",
    y2026: { t: "num", v: rmdAge73.age },
    y2027: { t: "num", v: rmdAge73.age },
    status: RMD_AGE_RULES.status,
    source: RMD_AGE_RULES.source,
    href: "/rmd-calculator",
  },
  {
    id: "rmd-age-75",
    label: `RMD age — ${rmdAge75.label.toLowerCase()}`,
    y2026: { t: "num", v: rmdAge75.age },
    y2027: { t: "num", v: rmdAge75.age },
    status: RMD_AGE_RULES.status,
    source: RMD_AGE_RULES.source,
    href: "/rmd-calculator",
  },
  {
    id: "rmd-first",
    label: "Who takes a first RMD this year",
    detail: "The first one may wait until April 1 of the next year; every later one is due December 31.",
    y2026: { t: "text", v: `Born in ${firstRmdBirthYear(2026)}` },
    y2027: { t: "text", v: `Born in ${firstRmdBirthYear(2027)}` },
    status: RMD_AGE_RULES.status,
    source: RMD_AGE_RULES.source,
    href: "/rmd-calculator",
    changeNote: "Next birth year",
  },
  {
    id: "rmd-penalty",
    label: "Penalty for a missed RMD",
    detail: `Cut to ${Math.round(RMD_EXCISE.value.correctedRate * 100)}% if you fix it in time.`,
    y2026: pct(Math.round(RMD_EXCISE.value.rate * 100)),
    y2027: pct(Math.round(RMD_EXCISE.value.rate * 100)),
    status: RMD_EXCISE.status,
    source: RMD_EXCISE.source,
  },
  {
    id: "qcd-limit",
    label: "Qualified charitable distribution (QCD) limit",
    detail: `Per IRA owner, from age ${qcd26.minAge === 70.5 ? "70½" : qcd26.minAge}. Counts toward your RMD and stays out of your income.`,
    y2026: usd(qcd26.limit ?? 0, "person"),
    y2027: QCD[2027].value.limit == null ? pending : usd(QCD[2027].value.limit, "person"),
    status: QCD[2027].status,
    source: QCD[2027].source,
    href: "/rmd-calculator",
  },
  {
    id: "qcd-split",
    label: "One-time QCD to a charitable trust or gift annuity",
    y2026: usd(qcd26.splitInterest ?? 0),
    y2027: QCD[2027].value.splitInterest == null ? pending : usd(QCD[2027].value.splitInterest),
    status: QCD[2027].status,
    source: QCD[2027].source,
  },
];

const sd = STANDARD_DEDUCTION_2026.value;
const add = ADDITIONAL_STD_2026.value;
const sen = SENIOR_DEDUCTION.value;
const th = SS_TAX_THRESHOLDS.value;
const seniorCutoff2027 = (sen.birthCutoff as Record<number, string>)[2027];

const taxRows: NumberRow[] = [
  {
    id: "std-single",
    label: "Standard deduction, single",
    y2026: usd(sd.single),
    y2027: pending,
    status: "not_yet_announced",
    source: STANDARD_DEDUCTION_2026.source,
  },
  {
    id: "std-mfj",
    label: "Standard deduction, married filing jointly",
    y2026: usd(sd.mfj),
    y2027: pending,
    status: "not_yet_announced",
    source: STANDARD_DEDUCTION_2026.source,
  },
  {
    id: "std-hoh",
    label: "Standard deduction, head of household",
    y2026: usd(sd.hoh),
    y2027: pending,
    status: "not_yet_announced",
    source: STANDARD_DEDUCTION_2026.source,
  },
  {
    id: "std-65",
    label: "Extra standard deduction at 65+ (single / married, per person)",
    y2026: pair(add.unmarried, add.married),
    y2027: pending,
    status: "not_yet_announced",
    source: ADDITIONAL_STD_2026.source,
  },
  {
    id: "senior-deduction",
    label: `Senior deduction (age 65+, tax years ${sen.years[0]}–${sen.years[sen.years.length - 1]})`,
    detail: `For 2027 you must be born before ${longDate(seniorCutoff2027)}. Shrinks by ${Math.round(sen.phaseoutRate * 100)}¢ per dollar of income above ${money(sen.phaseoutStart.single)} (single) or ${money(sen.phaseoutStart.mfj)} (joint).`,
    y2026: usd(sen.perPerson, "person"),
    y2027: (sen.years as readonly number[]).includes(2027) ? usd(sen.perPerson, "person") : pending,
    status: SENIOR_DEDUCTION.status,
    source: SENIOR_DEDUCTION.source,
    href: "/taxable-social-security-calculator",
  },
  {
    id: "cg-zero",
    label: "0% capital-gains rate up to (single / joint taxable income)",
    y2026: pair(CAP_GAINS_2026.value.single[0], CAP_GAINS_2026.value.mfj[0]),
    y2027: pending,
    status: "not_yet_announced",
    source: CAP_GAINS_2026.source,
  },
  {
    id: "ss-tax-50",
    label: `Up to ${SS_BENEFIT_TAXABLE_SHARE.value.aboveBase}% of Social Security taxable above (single / joint)`,
    detail: "Measured on “provisional income”: other income + tax-free interest + half your benefits. Never indexed for inflation.",
    y2026: pair(th.base.single, th.base.mfj),
    y2027: pair(th.base.single, th.base.mfj),
    status: SS_TAX_THRESHOLDS.status,
    source: SS_TAX_THRESHOLDS.source,
    href: "/taxable-social-security-calculator",
  },
  {
    id: "ss-tax-85",
    label: `Up to ${SS_BENEFIT_TAXABLE_SHARE.value.aboveAdjusted}% of Social Security taxable above (single / joint)`,
    y2026: pair(th.adjusted.single, th.adjusted.mfj),
    y2027: pair(th.adjusted.single, th.adjusted.mfj),
    status: SS_TAX_THRESHOLDS.status,
    source: SS_TAX_THRESHOLDS.source,
    href: "/taxable-social-security-calculator",
  },
  {
    id: "niit",
    label: `Net investment income tax (${(NIIT.value.rate * 100).toFixed(1)}%) applies above (single / joint)`,
    detail: "Not indexed for inflation.",
    y2026: pair(NIIT.value.thresholds.single, NIIT.value.thresholds.mfj),
    y2027: pair(NIIT.value.thresholds.single, NIIT.value.thresholds.mfj),
    status: NIIT.status,
    source: NIIT.source,
  },
];

export const NUMBER_GROUPS: NumberGroup[] = [
  {
    id: "social-security",
    title: "Social Security",
    icon: "clock",
    blurb: "All final. SSA published the 2027 figures with the COLA announcement.",
    rows: ssRows,
  },
  {
    id: "medicare",
    title: "Medicare",
    icon: "medicare",
    blurb: "Part D figures are final. Part A, Part B and IRMAA amounts are projections until CMS publishes them.",
    rows: medicareRows,
  },
  {
    id: "rmds-iras",
    title: "RMDs, IRAs and charitable giving",
    icon: "rmd",
    blurb: "RMD rules don’t change for 2027. The IRS hasn’t announced the 2027 QCD limit yet.",
    rows: rmdRows,
  },
  {
    id: "taxes",
    title: "Federal income tax",
    icon: "tax",
    blurb: "The senior deduction and Social Security tax thresholds are set by law. 2027 brackets and standard deductions are not out yet.",
    rows: taxRows,
  },
];

/* ------------------------------------------------------------------ formatting */

const PER_TEXT: Record<Per, string> = { mo: "a month", yr: "a year", day: "a day", person: "per person" };

/** Display text for one cell: the value and (optionally) a small "per" unit line. */
export function formatCell(c: Cell): { value: string; per?: string } {
  const per = "per" in c && c.per ? PER_TEXT[c.per] : undefined;
  switch (c.t) {
    case "usd":
      return { value: money(c.v), per };
    case "usd2":
      return { value: money2(c.v), per };
    case "pair":
      return { value: `${money(c.v[0])} / ${money(c.v[1])}`, per };
    case "pct":
      return { value: `${c.v}%` };
    case "num":
      return { value: String(c.v) };
    case "text":
      return { value: c.v };
    case "pending":
      return { value: "Not announced yet" };
  }
}

export type Direction = "up" | "down" | "same" | "pending";

function moneyDelta(d: number, cents: boolean) {
  // A pair can change on one side only ("$0 / +$500"): zero gets no sign.
  const sign = d > 0.004 ? "+" : d < -0.004 ? "−" : "";
  const abs = Math.abs(d).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  return `${sign}$${abs}`;
}

/** Change from 2026 to 2027 in words, with a direction for the arrow. */
export function changeOf(a: Cell, b: Cell, note?: string): { text: string; direction: Direction } {
  if (b.t === "pending") return { text: "Not announced yet", direction: "pending" };
  if (a.t === "pending") return { text: "—", direction: "pending" };
  if (a.t === "text" || b.t === "text") {
    const same = a.t === b.t && a.v === b.v;
    return same ? { text: "No change", direction: "same" } : { text: note ?? "Changed", direction: "up" };
  }
  if (a.t === "pair" || b.t === "pair") {
    if (a.t !== "pair" || b.t !== "pair") return { text: note ?? "Changed", direction: "up" };
    const d0 = b.v[0] - a.v[0];
    const d1 = b.v[1] - a.v[1];
    if (Math.abs(d0) < 0.005 && Math.abs(d1) < 0.005) return { text: "No change", direction: "same" };
    return { text: `${moneyDelta(d0, false)} / ${moneyDelta(d1, false)}`, direction: d0 + d1 > 0 ? "up" : "down" };
  }
  const d = b.v - a.v;
  if (Math.abs(d) < 0.005) return { text: "No change", direction: "same" };
  const dir: Direction = d > 0 ? "up" : "down";
  const sign = d > 0 ? "+" : "−";
  if (a.t === "pct") return { text: `${sign}${Math.abs(d).toFixed(1)} points`, direction: dir };
  if (a.t === "num") return { text: `${sign}${Math.abs(d)}`, direction: dir };
  const cents = Math.round(Math.abs(d) * 100) % 100 !== 0 && Math.abs(d) < 1000;
  const rel = a.v !== 0 ? ` (${sign}${Math.abs((d / a.v) * 100).toFixed(1)}%)` : "";
  return { text: `${moneyDelta(d, cents)}${rel}`, direction: dir };
}

/** Every distinct source used on the page (for the Dataset JSON-LD and the source list). */
export function allSources(groups: NumberGroup[] = NUMBER_GROUPS): Source[] {
  const seen = new Map<string, Source>();
  for (const g of groups) for (const r of g.rows) if (!seen.has(r.source.url)) seen.set(r.source.url, r.source);
  return [...seen.values()];
}

/** Count of 2027 rows by status (for the at-a-glance line). */
export function statusCounts(groups: NumberGroup[] = NUMBER_GROUPS): Record<Status, number> {
  const c: Record<Status, number> = { official: 0, projected: 0, not_yet_announced: 0 };
  for (const g of groups) for (const r of g.rows) c[r.status]++;
  return c;
}

/** Rows by id (for quoting a single figure in prose without retyping it). */
export function rowById(id: string): NumberRow {
  for (const g of NUMBER_GROUPS) for (const r of g.rows) if (r.id === id) return r;
  throw new Error(`Unknown number row: ${id}`);
}

/**
 * What the agencies still haven't published: the shared list (src/data/params/index.ts) plus our extra Part A item — but only
 * while Part A is still projected AND the shared list doesn't already name Part A (it does since the shared file was updated;
 * appending blindly listed Part A twice).
 */
export function pendingItems(): { item: string; expected: string }[] {
  const shared = PARAM_STATUS_SUMMARY.pending.map((p) => ({ item: p.item, expected: p.expected }));
  const sharedHasPartA = shared.some((p) => /part a/i.test(p.item));
  const extra = PART_A[2027].status !== "official" && !sharedHasPartA ? PENDING_2027_EXTRA.value.map((p) => ({ item: p.item, expected: p.expected })) : [];
  return [...shared, ...extra];
}
