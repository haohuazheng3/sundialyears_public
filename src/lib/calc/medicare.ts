/**
 * Medicare premium engine: Part A (buy-in), Part B (+ late penalty, IRMAA, hold-harmless), Part D / Medicare Advantage
 * plan premium (+ Part D IRMAA and late penalty), for one person or a couple, for 2026 and 2027.
 *
 * Rules:
 * - Part B standard premium & IRMAA: 42 U.S.C. §1395r(a),(i); CMS 2026 fact sheet; FR 2025-20251. 2027 = Trustees projection.
 * - IRMAA tier boundaries (SSA POMS HI 01101.020): tiers 1–4 when MAGI > lower and ≤ upper bound; the 80% tier runs to
 *   < $500,000 ($750,000 joint); 85% at ≥ $500,000 ($750,000). Married filing separately and lived with spouse:
 *   ≤ threshold → none; > threshold and < (500,000 − threshold) → 80% tier; ≥ that → 85% tier.
 *   MAGI is from the tax return two years before the premium year (20 CFR 418.1135).
 * - Part B late-enrollment penalty: 10% of the standard premium for each FULL 12 months you could have had Part B but
 *   didn't (42 U.S.C. §1395r(b); 42 CFR 408.22–408.24). It is computed on the standard premium before IRMAA and before any
 *   hold-harmless reduction, and the premium is rounded to the nearest 10 cents, an odd 5 cents rounding up (42 CFR 408.27).
 *   Medicare.gov's 2026 example: 24 months late → 20% → $202.90 + $40.58 = $243.48 → $243.50.
 * - Part D late-enrollment penalty: 1% × national base beneficiary premium × full uncovered months, rounded to the nearest
 *   $0.10, recalculated every year from that year's base premium (42 CFR 423.286(d)(3); Medicare.gov publication 11222).
 * - Part D IRMAA: added to the plan premium for anyone with Part D coverage (stand-alone or Medicare Advantage drug plan);
 *   collected by SSA/Medicare, not the plan (42 CFR 423.286(d)(4)).
 * - Part A premium: $0 with 40+ quarters of coverage; reduced premium with 30–39; full premium under 30. Late penalty: +10%,
 *   for twice the number of years you could have had Part A but didn't (Medicare.gov, "Avoid late enrollment penalties").
 * - Hold-harmless (SSA Act §1839(f), 42 U.S.C. §1395r(f); FR 2025-20251): if you got Social Security for November and December of the prior
 *   year with Part B taken out of the December and January checks, and you don't pay IRMAA, the new premium is reduced so the
 *   benefit PAYABLE after Part B (rounded down to the dollar, 20 CFR 404.304(f)) does not fall — but never below last December's
 *   premium. "Last December's premium" is your own premium, which is below the standard one if you were held harmless last year,
 *   so 2027 is computed on top of the 2026 result. A payment can't go below $0, so when the benefit doesn't cover the premium
 *   there is nothing to protect. Late penalties are computed on the full standard premium and added on top.
 * - 2026 Part B premium rebate: one-time $90 (October 2026) for Original Medicare Part B enrollees; excludes Medicare
 *   Advantage enrollees, people whose premium Medicaid pays, and IRMAA payers (CMS Medicare Improvement Fund FAQ).
 */
import {
  IRMAA_SCHEDULES,
  IRMAA_2027_ALT_BOUNDS,
  PART_A,
  PART_B,
  PART_D,
  PENALTIES,
  PART_B_REBATE_2026,
  type IrmaaSchedule,
} from "@/data/params/medicare";
import {
  AVG_PLAN_PREMIUM,
  PART_A_PENALTY,
  PART_B_2025,
} from "@/data/params/medicare-extra";
import { COLA } from "@/data/params/social-security";
import {
  roundToDime,
  roundDownToDime,
  roundDownToDollar,
  roundToCents,
} from "./dates";

export type PremiumYear = 2026 | 2027;
export const PREMIUM_YEARS: PremiumYear[] = [2026, 2027];

/** Tax filing status on the return IRMAA looks at. "single" also covers head of household, qualifying surviving spouse,
 *  and married filing separately when you lived apart from your spouse all year. "mfs" = married filing separately and
 *  lived with your spouse at any time that year. */
export type TaxFiling = "single" | "mfj" | "mfs";
export type Coverage = "orig_d" | "orig" | "ma";
/** Quarters of Medicare-covered work (yours or your spouse's): "40" = 40 or more (premium-free Part A); "30" = 30–39; "0" = under 30. */
export type PartAQuarters = "40" | "30" | "0";
export type IrmaaTier = 0 | 1 | 2 | 3 | 4 | 5;

const sum = (xs: number[]) => roundToCents(xs.reduce((a, b) => a + b, 0));
/** Inputs come from forms and URLs: anything that isn't a finite number counts as 0 (never NaN, never the top IRMAA tier). */
const finite = (x: number | null | undefined) =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;
/** Same, but ±Infinity is kept (a huge MAGI is a real, if silly, input) and only NaN/undefined becomes 0. */
const numOr0 = (x: number | null | undefined) =>
  typeof x === "number" && !Number.isNaN(x) ? x : 0;

export function schedule(year: PremiumYear): IrmaaSchedule {
  return IRMAA_SCHEDULES[year];
}

/** IRMAA tier (0 = no IRMAA … 5 = top tier) for a MAGI under a given premium year's table. */
export function irmaaTier(
  sched: Pick<
    IrmaaSchedule,
    | "individualBounds"
    | "jointBounds"
    | "topIndividual"
    | "topJoint"
    | "mfsThreshold"
    | "mfsTop"
  >,
  filing: TaxFiling,
  magi: number,
): IrmaaTier {
  const m = Math.max(0, numOr0(magi));
  if (filing === "mfs") {
    if (m <= sched.mfsThreshold) return 0;
    return m < sched.mfsTop ? 4 : 5;
  }
  const bounds = filing === "mfj" ? sched.jointBounds : sched.individualBounds;
  const top = filing === "mfj" ? sched.topJoint : sched.topIndividual;
  for (let i = 0; i < 4; i++) if (m <= bounds[i]) return i as IrmaaTier;
  return m < top ? 4 : 5;
}

/** The MAGI range (in words-ready numbers) that defines a tier, for "show the math". */
export function tierRange(
  sched: IrmaaSchedule,
  filing: TaxFiling,
  tier: IrmaaTier,
): { over?: number; atMost?: number; under?: number; atLeast?: number } {
  if (filing === "mfs") {
    if (tier === 0) return { atMost: sched.mfsThreshold };
    if (tier === 5) return { atLeast: sched.mfsTop };
    return { over: sched.mfsThreshold, under: sched.mfsTop };
  }
  const b = filing === "mfj" ? sched.jointBounds : sched.individualBounds;
  const top = filing === "mfj" ? sched.topJoint : sched.topIndividual;
  if (tier === 0) return { atMost: b[0] };
  if (tier === 1 || tier === 2 || tier === 3)
    return { over: b[tier - 1], atMost: b[tier] };
  if (tier === 4) return { over: b[3], under: top };
  return { atLeast: top };
}

/**
 * The next IRMAA line above this MAGI: how much more income fits before the next tier, and what crossing it costs per
 * person per month. null when already in the top tier.
 */
export function nextIrmaaLine(
  sched: IrmaaSchedule,
  filing: TaxFiling,
  rawMagi: number,
) {
  // Same clamping as irmaaTier, so a negative or blank MAGI can't inflate the headroom.
  const magi = Math.max(0, numOr0(rawMagi));
  const tier = irmaaTier(sched, filing, magi);
  if (tier === 5) return null;
  let next: IrmaaTier;
  let headroom: number;
  if (filing === "mfs") {
    if (tier === 0) {
      next = 4;
      headroom = sched.mfsThreshold - magi;
    } else {
      next = 5;
      headroom = sched.mfsTop - 1 - magi;
    }
  } else {
    const b = filing === "mfj" ? sched.jointBounds : sched.individualBounds;
    const top = filing === "mfj" ? sched.topJoint : sched.topIndividual;
    next = (tier + 1) as IrmaaTier;
    headroom = tier === 4 ? top - 1 - magi : b[tier] - magi;
  }
  return {
    tier,
    next,
    headroom: Math.max(0, headroom),
    extraPartB: roundToCents(sched.partBAddOn[next] - sched.partBAddOn[tier]),
    extraPartD: roundToCents(sched.partDAddOn[next] - sched.partDAddOn[tier]),
  };
}

/**
 * 2027 only: the thresholds for tiers 2–4 are projected and could land $1,000 lower (October 2025 CPI-U was never
 * published). True when the alternative bounds would put this MAGI in a different tier.
 */
export function tierUncertain2027(filing: TaxFiling, magi: number): boolean {
  if (filing === "mfs") return false; // MFS bounds are the same under both scenarios
  const s = schedule(2027);
  const alt = {
    ...s,
    individualBounds: [...IRMAA_2027_ALT_BOUNDS.individualBounds] as [
      number,
      number,
      number,
      number,
    ],
    jointBounds: [...IRMAA_2027_ALT_BOUNDS.jointBounds] as [
      number,
      number,
      number,
      number,
    ],
  };
  return irmaaTier(s, filing, magi) !== irmaaTier(alt, filing, magi);
}

/** Number of full 12-month periods in a count of months without coverage. */
export const fullYearsLate = (months: number) =>
  Math.floor(Math.max(0, finite(months)) / 12);

/**
 * Part B premium before IRMAA, including the late-enrollment penalty: standard × (1 + 10% × full 12-month periods),
 * rounded to the nearest $0.10 (42 CFR 408.27).
 */
export function partBWithPenalty(standard: number, monthsLate: number): number {
  const periods = fullYearsLate(monthsLate);
  return roundToDime(
    standard * (1 + PENALTIES.value.partBPerFull12Months * periods),
  );
}

/** Part D late-enrollment penalty before rounding (for "show the math"): 1% × base beneficiary premium × full uncovered months. */
export function partDPenaltyRaw(
  year: PremiumYear,
  monthsUncovered: number,
): number {
  const months = Math.max(0, Math.floor(finite(monthsUncovered)));
  return (
    PENALTIES.value.partDPerMonth *
    PART_D[year].value.baseBeneficiaryPremium *
    months
  );
}

/** Part D late-enrollment penalty for a year: 1% × that year's national base beneficiary premium × uncovered months, nearest $0.10. */
export function partDPenalty(
  year: PremiumYear,
  monthsUncovered: number,
): number {
  const raw = partDPenaltyRaw(year, monthsUncovered);
  return raw > 0 ? roundToDime(raw) : 0;
}

/** Monthly Part A premium (0 for most people) with the optional 10% late-enrollment increase. */
export function partAPremium(
  year: PremiumYear,
  quarters: PartAQuarters,
  latePenalty: boolean,
): { premium: number; penalty: number; total: number } {
  const a = PART_A[year].value;
  const premium =
    quarters === "40"
      ? 0
      : quarters === "30"
        ? a.premium30to39Quarters
        : a.premiumUnder30Quarters;
  // A single 10% increase (not per year), paid for twice the number of years you delayed.
  const penalty =
    premium > 0 && latePenalty
      ? roundToCents(premium * PART_A_PENALTY.value.rate)
      : 0;
  return { premium, penalty, total: roundToCents(premium + penalty) };
}

/** National-average plan premium used when the reader leaves their plan premium blank. */
export function averagePlanPremium(
  year: PremiumYear,
  coverage: Coverage,
): number {
  if (coverage === "orig") return 0;
  const avg = AVG_PLAN_PREMIUM[year].value;
  return coverage === "ma" ? avg.ma : avg.pdp;
}

export interface HoldHarmlessInput {
  /** November benefit (paid in December), before Medicare deductions. */
  priorBenefit: number;
  /** December benefit after the COLA (paid in January), before Medicare deductions. */
  newBenefit: number;
  /**
   * The Part B premium (standard part) taken from the December payment: the standard premium, or less if the person was
   * already held harmless that year.
   */
  priorPremium: number;
  /** New year's standard Part B premium. */
  newStandard: number;
  /** IRMAA payers are never held harmless. */
  paysIrmaa: boolean;
  /** Part B was deducted from the December payment (false for new enrollees and people billed directly). */
  eligible?: boolean;
}

export interface HoldHarmlessResult {
  protected: boolean;
  /** Standard-premium part the person pays in the new year (before any late penalty). */
  standardPaid: number;
  /** COLA raise in the benefit (January − December, before deductions). */
  colaRaise: number;
  /** New standard premium − the premium taken last December. */
  premiumIncrease: number;
  priorBenefit: number;
  newBenefit: number;
  priorPremium: number;
  newStandard: number;
  /** December payment after Part B, rounded down to the dollar (0 if the benefit didn't cover the premium). */
  decPayment: number;
  /** The highest January premium that still leaves a payment of `decPayment`. */
  cap: number;
  reason:
    | "irmaa"
    | "no-benefit"
    | "not-eligible"
    | "too-small"
    | "cola-covers"
    | "protected";
  /** 2027 only: the 2026 step, which sets the premium taken from the December 2026 payment. */
  previous?: HoldHarmlessResult;
}

/**
 * Hold-harmless (42 U.S.C. §1395r(f)): the new premium is reduced, to the extent necessary, so the benefit payable for
 * December (paid in January) after Part B is not less than the benefit payable for November (paid in December) after
 * Part B — and it is never below last December's premium. "Payable" = after deductions, rounded down to the whole dollar
 * (20 CFR 404.304(f)), and it can't be negative: if the benefit didn't cover last December's premium, both payments are $0
 * and no reduction is necessary ("too-small").
 */
export function holdHarmless(h: HoldHarmlessInput): HoldHarmlessResult {
  const priorBenefit = Math.max(0, finite(h.priorBenefit));
  const newBenefit = Math.max(0, finite(h.newBenefit));
  const colaRaise = roundToCents(newBenefit - priorBenefit);
  const premiumIncrease = roundToCents(h.newStandard - h.priorPremium);
  const decPayment = Math.max(
    0,
    roundDownToDollar(priorBenefit - h.priorPremium),
  );
  const cap = roundToCents(newBenefit - decPayment);
  const base = {
    colaRaise,
    premiumIncrease,
    priorBenefit,
    newBenefit,
    priorPremium: h.priorPremium,
    newStandard: h.newStandard,
    decPayment,
    cap,
  };
  const full = { ...base, protected: false, standardPaid: h.newStandard };
  if (h.paysIrmaa) return { ...full, reason: "irmaa" };
  if (!(priorBenefit > 0)) return { ...full, reason: "no-benefit" };
  if (h.eligible === false) return { ...full, reason: "not-eligible" };
  if (premiumIncrease <= 0 || cap >= h.newStandard)
    return { ...full, reason: "cola-covers" };
  if (decPayment <= 0) return { ...full, reason: "too-small" };
  return {
    ...base,
    protected: true,
    standardPaid: roundToCents(Math.max(h.priorPremium, cap)),
    reason: "protected",
  };
}

/** Benefit after the COLA: SSA rounds monthly benefit amounts down to the dime (simplified: COLA applied to the benefit). */
export function benefitAfterCola(benefit: number, colaPct: number): number {
  return roundDownToDime(benefit * (1 + colaPct / 100));
}

/** Approximate benefit before a COLA (used to estimate the 2025 → 2026 raise from a 2026 benefit). */
export function benefitBeforeCola(benefit: number, colaPct: number): number {
  return roundToCents(benefit / (1 + colaPct / 100));
}

/**
 * What the hold-harmless test compares in each premium year: last year's standard premium, this year's standard premium
 * and the COLA paid in this year's January check. 2026: $185.00 → $202.90 with the 2.8% COLA; 2027: $202.90 → the
 * projected 2027 premium with the official 3.6% COLA.
 */
export function holdHarmlessBasis(year: PremiumYear) {
  return year === 2027
    ? {
        priorYear: 2026,
        priorStandard: PART_B[2026].value.premium,
        newStandard: PART_B[2027].value.premium,
        colaPct: COLA[2027].value,
      }
    : {
        priorYear: 2025,
        priorStandard: PART_B_2025.value.premium,
        newStandard: PART_B[2026].value.premium,
        colaPct: COLA[2026].value,
      };
}

export interface HoldHarmlessYearOptions {
  /** Part B was deducted from the December 2026 payment (2027 protection). Defaults to `eligible`. */
  eligible2027?: boolean;
  /** Paid IRMAA in 2026 (decides the 2026 step inside a 2027 calculation). Defaults to `paysIrmaa`. */
  paysIrmaa2026?: boolean;
  /** 2026 Part B IRMAA add-on, part of the premium taken from the December 2026 payment. */
  partBIrmaa2026?: number;
}

/**
 * Hold-harmless test for a person whose 2026 monthly benefit (before Medicare deductions) is `benefit2026` and whose Part B
 * was already deducted from their December 2025 payment (`eligible`).
 * - 2026: the December 2025 benefit is estimated by taking the 2.8% COLA back out; last December's premium = $185.00.
 * - 2027: last December's premium is the person's own 2026 premium (the 2026 result, which is below $202.90 if they were
 *   held harmless in 2026); the raise is the 3.6% COLA on the 2026 benefit, rounded down to the dime.
 * Eligibility is checked per year: `eligible` = Part B came out of the December 2025 payment (2026 step); `opts.eligible2027`
 * = it came out of the December 2026 payment (2027 step; defaults to `eligible`). Someone whose Part B deductions began
 * during 2026 is not protected in 2026 but can be in 2027. The 2026 step uses the person's 2026 IRMAA status
 * (`opts.paysIrmaa2026`, defaults to `paysIrmaa`), not the 2027 one.
 * Assumes the person was not already held harmless in 2025 (if they were, their real premium is a little lower).
 */
export function holdHarmlessFor(
  year: PremiumYear,
  benefit2026: number,
  paysIrmaa: boolean,
  eligible = true,
  opts: HoldHarmlessYearOptions = {},
): HoldHarmlessResult {
  const b26 = Math.max(0, finite(benefit2026));
  const paysIrmaa2026 =
    year === 2026 ? paysIrmaa : (opts.paysIrmaa2026 ?? paysIrmaa);
  const basis26 = holdHarmlessBasis(2026);
  const y2026 = holdHarmless({
    priorBenefit: benefitBeforeCola(b26, basis26.colaPct),
    newBenefit: b26,
    priorPremium: basis26.priorStandard,
    newStandard: basis26.newStandard,
    paysIrmaa: paysIrmaa2026,
    eligible,
  });
  if (year === 2026) return y2026;
  const basis27 = holdHarmlessBasis(2027);
  // The December 2026 deduction is the whole 2026 Part B premium (§1839(f) compares "the premium under this section",
  // which includes IRMAA): an IRMAA payer in 2026 who drops out of IRMAA in 2027 sees Part B fall, so needs no protection.
  const irmaa2026 = paysIrmaa2026
    ? Math.max(0, finite(opts.partBIrmaa2026))
    : 0;
  const y2027 = holdHarmless({
    priorBenefit: b26,
    newBenefit: benefitAfterCola(b26, basis27.colaPct),
    priorPremium: roundToCents(y2026.standardPaid + irmaa2026),
    newStandard: basis27.newStandard,
    paysIrmaa,
    eligible: opts.eligible2027 ?? eligible,
  });
  return { ...y2027, previous: y2026 };
}

export interface PersonInput {
  /** MAGI for this person's own return (ignored when filing jointly — the household MAGI is used). */
  magi?: number;
  lateBMonths: number;
  lateDMonths: number;
  partAQuarters: PartAQuarters;
  partALatePenalty: boolean;
  /** Monthly Social Security benefit in 2026, before Medicare is deducted. 0/null = not collecting. */
  ssBenefit2026?: number | null;
  /**
   * Hold-harmless eligibility for 2026: Part B was already deducted from the person's Social Security payment in December
   * 2025 (they got benefits for November and December 2025). The 2027 calculation also needs it, because 2027 protection
   * builds on the 2026 result. Defaults to true when a benefit is entered.
   */
  hhEligible?: boolean;
  /** Part B is deducted from the December 2026 payment (decides 2027 protection). Defaults to `hhEligible`. */
  hhEligible2027?: boolean;
}

export interface HouseholdInput {
  year: PremiumYear;
  filing: TaxFiling;
  /** Joint MAGI when filing === "mfj"; otherwise person 1's MAGI (person 2 uses people[1].magi). */
  magi: number;
  coverage: Coverage;
  /** Monthly plan premium per person (stand-alone Part D or Medicare Advantage). null → national average. */
  planPremium: number | null;
  people: PersonInput[];
}

export interface PersonResult {
  magi: number;
  /** Full 12-month periods without Part B that count toward the penalty. */
  lateBPeriods: number;
  tier: IrmaaTier;
  partB: {
    standard: number;
    /** Standard part actually charged after hold-harmless (equals `standard` unless protected). */
    standardCharged: number;
    penaltyPct: number; // 0, 0.1, 0.2 …
    penalty: number; // dollars added by the late penalty (after rounding)
    irmaa: number;
    total: number;
  };
  partA: { premium: number; penalty: number; total: number };
  partD: {
    has: boolean;
    plan: number;
    irmaa: number;
    penalty: number;
    total: number;
  };
  totalMonthly: number;
  /** Part B (all of it) + Part D IRMAA: what SSA deducts from a Social Security check. */
  fromSsCheck: number;
  /** Plan premium + Part D late penalty: paid to the plan (or deducted if you ask). */
  toPlan: number;
  /** Part A premium: billed by Medicare. */
  billed: number;
  annual: number;
  /** 2026 only: one-time $90 Part B rebate (October 2026) if in Original Medicare and not paying IRMAA. */
  rebate: number;
  ss: null | {
    benefit: number; // gross monthly benefit for the premium year
    netCheck: number; // after Medicare deductions, rounded down to the dollar
    /** False when the benefit is smaller than the Medicare amounts Social Security deducts (the rest is billed). */
    covers: boolean;
    holdHarmless: HoldHarmlessResult | null;
  };
}

export interface HouseholdResult {
  year: PremiumYear;
  magiTaxYear: number;
  status: IrmaaSchedule["status"];
  persons: PersonResult[];
  totalMonthly: number;
  annual: number;
  fromSsCheck: number;
  toPlan: number;
  billed: number;
  rebate: number;
  netAnnualAfterRebate: number;
  planPremiumUsed: number;
  planPremiumIsAverage: boolean;
}

/** Monthly and annual Medicare premiums for one or two people in a given premium year. */
export function computeMedicare(input: HouseholdInput): HouseholdResult {
  const { year, filing, coverage } = input;
  const sched = schedule(year);
  const standard = PART_B[year].value.premium;
  const hasD = coverage !== "orig";
  const planPremiumIsAverage =
    input.planPremium == null || Number.isNaN(input.planPremium);
  const plan =
    coverage === "orig"
      ? 0
      : roundToCents(
          Math.max(
            0,
            finite(
              planPremiumIsAverage
                ? averagePlanPremium(year, coverage)
                : input.planPremium,
            ),
          ),
        );
  const people = input.people.slice(0, 2);

  const persons: PersonResult[] = people.map((p, i) => {
    const magi = Math.max(
      0,
      numOr0(filing === "mfj" || i === 0 ? input.magi : p.magi),
    );
    const tier = irmaaTier(sched, filing, magi);
    const irmaaB = sched.partBAddOn[tier];
    const periods = fullYearsLate(p.lateBMonths);
    const penaltyPct = roundToCents(
      PENALTIES.value.partBPerFull12Months * periods,
    );
    const penaltyDollars = roundToCents(
      partBWithPenalty(standard, p.lateBMonths) - standard,
    );

    // Social Security check & hold-harmless (2026: 2.8% COLA vs the 2025→2026 increase; 2027: 3.6% COLA vs the person's own 2026 premium).
    let ss: PersonResult["ss"] = null;
    let standardCharged = standard;
    const b26 = Math.max(0, finite(p.ssBenefit2026));
    let hh: HoldHarmlessResult | null = null;
    if (b26 > 0) {
      const tier2026 =
        year === 2026 ? tier : irmaaTier(schedule(2026), filing, magi);
      hh = holdHarmlessFor(year, b26, tier > 0, p.hhEligible !== false, {
        eligible2027: p.hhEligible2027 ?? p.hhEligible !== false,
        paysIrmaa2026: tier2026 > 0,
        partBIrmaa2026: schedule(2026).partBAddOn[tier2026],
      });
      standardCharged = hh.standardPaid;
    }
    // Each piece is already a CMS-rounded amount (the standard premium + penalty is rounded to the dime, IRMAA is published to the
    // dime); a hold-harmless amount is kept exact so the "payment never shrinks" guarantee isn't broken by rounding up.
    const partBTotal = roundToCents(standardCharged + penaltyDollars + irmaaB);
    const partA = partAPremium(year, p.partAQuarters, p.partALatePenalty);
    const dIrmaa = hasD ? sched.partDAddOn[tier] : 0;
    const dPenalty = hasD ? partDPenalty(year, p.lateDMonths) : 0;
    const dTotal = roundToCents(plan + dIrmaa + dPenalty);
    const totalMonthly = sum([partBTotal, partA.total, dTotal]);
    const fromSsCheck = sum([partBTotal, dIrmaa]);
    const toPlan = sum([plan, dPenalty]);
    const rebate =
      year === 2026 && coverage !== "ma" && tier === 0
        ? PART_B_REBATE_2026.value.amount
        : 0;

    if (b26 > 0) {
      const benefit =
        year === 2027 ? benefitAfterCola(b26, COLA[2027].value) : b26;
      ss = {
        benefit,
        netCheck: Math.max(0, roundDownToDollar(benefit - fromSsCheck)),
        covers: benefit >= fromSsCheck,
        holdHarmless: hh,
      };
    }

    return {
      magi,
      lateBPeriods: periods,
      tier,
      partB: {
        standard,
        standardCharged,
        penaltyPct,
        penalty: penaltyDollars,
        irmaa: irmaaB,
        total: partBTotal,
      },
      partA,
      partD: {
        has: hasD,
        plan,
        irmaa: dIrmaa,
        penalty: dPenalty,
        total: dTotal,
      },
      totalMonthly,
      fromSsCheck,
      toPlan,
      billed: partA.total,
      annual: roundToCents(totalMonthly * 12),
      rebate,
      ss,
    };
  });

  const totalMonthly = sum(persons.map((x) => x.totalMonthly));
  const annual = roundToCents(totalMonthly * 12);
  const rebate = sum(persons.map((x) => x.rebate));
  return {
    year,
    magiTaxYear: sched.magiTaxYear,
    status: sched.status,
    persons,
    totalMonthly,
    annual,
    fromSsCheck: sum(persons.map((x) => x.fromSsCheck)),
    toPlan: sum(persons.map((x) => x.toPlan)),
    billed: sum(persons.map((x) => x.billed)),
    rebate,
    netAnnualAfterRebate: roundToCents(annual - rebate),
    planPremiumUsed: plan,
    planPremiumIsAverage,
  };
}

/** Same household in both years, for the "what changes in 2027" comparison. Uses the same MAGI for both years. */
export function compareYears(input: Omit<HouseholdInput, "year">) {
  const y2026 = computeMedicare({ ...input, year: 2026 });
  const y2027 = computeMedicare({ ...input, year: 2027 });
  return {
    y2026,
    y2027,
    monthlyChange: roundToCents(y2027.totalMonthly - y2026.totalMonthly),
    annualChange: roundToCents(y2027.annual - y2026.annual),
  };
}

/** Rough COLA raise that exactly covers a Part B increase: benefits below this were held harmless. */
export function holdHarmlessBreakEvenBenefit(
  premiumIncrease: number,
  colaPct: number,
): number {
  return colaPct > 0 ? premiumIncrease / (colaPct / 100) : Infinity;
}
