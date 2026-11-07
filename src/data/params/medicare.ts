import { cite, type Status } from "./types";
import { SRC } from "./sources";
import { TR_ECON } from "./social-security";

/**
 * Medicare premiums, deductibles and IRMAA.
 * IRMAA tiers (index 0–5) map to the statutory "applicable percentages": none, 35%, 50%, 65%, 80%, 85%.
 * Boundaries (SSA POMS HI 01101.020): tiers 1–4 apply when MAGI > lower bound and ≤ upper bound;
 * tier 4 (80%) when MAGI > the 4th bound and < $500,000 ($750,000 joint); tier 5 (85%) at ≥ $500,000/$750,000.
 */

export type FilingGroup = "individual" | "joint" | "mfsLivedWithSpouse";

export interface IrmaaSchedule {
  premiumYear: number;
  magiTaxYear: number;
  status: Status; // status of the whole table
  boundsStatus: Status; // thresholds can be official while amounts are projected, etc.
  standardPartB: number;
  partBDeductible: number;
  /** Upper bounds of tiers 0–3 for single/HOH/QSS/MFS-lived-apart filers. */
  individualBounds: [number, number, number, number];
  jointBounds: [number, number, number, number];
  topIndividual: number; // 85% tier starts at ≥ this
  topJoint: number;
  /** MFS who lived with spouse at any time in the year: none ≤ threshold; 80% tier until < mfsTop; 85% at ≥ mfsTop. */
  mfsThreshold: number;
  mfsTop: number;
  /** Monthly IRMAA add-on by tier (0–5). */
  partBAddOn: [number, number, number, number, number, number];
  partDAddOn: [number, number, number, number, number, number];
  source: (typeof SRC)[keyof typeof SRC];
  amountsSource?: (typeof SRC)[keyof typeof SRC];
  note?: string;
}

export const IRMAA_2026: IrmaaSchedule = {
  premiumYear: 2026,
  magiTaxYear: 2024,
  status: "official",
  boundsStatus: "official",
  standardPartB: 202.9,
  partBDeductible: 283,
  individualBounds: [109000, 137000, 171000, 205000],
  jointBounds: [218000, 274000, 342000, 410000],
  topIndividual: 500000,
  topJoint: 750000,
  mfsThreshold: 109000,
  mfsTop: 391000,
  partBAddOn: [0, 81.2, 202.9, 324.6, 446.3, 487.0],
  partDAddOn: [0, 14.5, 37.5, 60.4, 83.3, 91.0],
  source: SRC.cms2026Premiums,
  amountsSource: SRC.fr2026PartB,
};

/**
 * 2027: CMS has NOT published the 2027 Part B premium or IRMAA table yet (normally mid-November).
 * - Thresholds: computed with the statutory CPI-U indexing (42 U.S.C. 1395r(i)(5)) from published BLS data.
 *   October 2025 CPI-U was never published (shutdown); using the 11 published months gives these bounds.
 *   If CMS instead imputes October, tiers 2–4 land $1,000 lower (141k/176k/211k; joint 282k/352k/422k).
 *   The first threshold ($112,000 / $224,000) and the MFS bounds are the same either way.
 * - Part B amounts: 2026 Medicare Trustees Report projection (Tables V.E2–V.E3).
 * - Part D add-ons: computed from the OFFICIAL 2027 base beneficiary premium ($41.33) with 42 CFR 423.286(d)(4).
 */
export const IRMAA_2027: IrmaaSchedule = {
  premiumYear: 2027,
  magiTaxYear: 2025,
  status: "projected",
  boundsStatus: "projected",
  standardPartB: 209.5,
  partBDeductible: 292,
  individualBounds: [112000, 142000, 177000, 212000],
  jointBounds: [224000, 284000, 354000, 424000],
  topIndividual: 500000,
  topJoint: 750000,
  mfsThreshold: 112000,
  mfsTop: 388000,
  partBAddOn: [0, 83.7, 209.4, 335.1, 460.7, 502.6],
  partDAddOn: [0, 15.4, 39.7, 64.0, 88.3, 96.4],
  source: SRC.blsCpiU,
  amountsSource: SRC.medicareTrustees2026,
  note: "Projected until CMS publishes the official 2027 figures (expected mid-November 2026).",
};

export const IRMAA_2027_ALT_BOUNDS = {
  individualBounds: [112000, 141000, 176000, 211000] as const,
  jointBounds: [224000, 282000, 352000, 422000] as const,
  why: "If CMS imputes the missing October 2025 CPI-U instead of averaging the 11 published months.",
};

/** CPI-U inputs used to project the 2027 thresholds (BLS CUUR0000SA0, not seasonally adjusted). */
export const IRMAA_2027_INDEXING = cite(
  {
    baseAvgSep2017Aug2018: 249.280167,
    avgSep2025Aug2026_11mo: 329.656273,
    factor: 1.322433,
    baseAmounts: [85000, 107000, 133500, 160000],
    unrounded: [112406.79, 141500.31, 176544.78, 211589.25],
    missingMonth: "October 2025 (not published by BLS because of the 2025 lapse in appropriations)",
  },
  "projected",
  2027,
  SRC.blsCpiU,
);

export const IRMAA_SCHEDULES: Record<number, IrmaaSchedule> = { 2026: IRMAA_2026, 2027: IRMAA_2027 };

export const IRMAA_PCT = [null, 35, 50, 65, 80, 85] as const;

export const PART_B = {
  2026: cite({ premium: 202.9, deductible: 283, immunosuppressivePremium: 121.6 }, "official", 2026, SRC.cms2026Premiums),
  2027: cite({ premium: 209.5, deductible: 292 }, "projected", 2027, SRC.medicareTrustees2026, "2026 Medicare Trustees Report projection; CMS announces the official amount in November."),
} as const;

export const PART_A = {
  2026: cite(
    { deductible: 1736, coinsuranceDays61to90: 434, lifetimeReserveDay: 868, snfDays21to100: 217, premiumUnder30Quarters: 565, premium30to39Quarters: 311 },
    "official",
    2026,
    SRC.cms2026Premiums,
  ),
  2027: cite(
    { deductible: 1788, coinsuranceDays61to90: 447, lifetimeReserveDay: 894, snfDays21to100: 223.5, premiumUnder30Quarters: 600, premium30to39Quarters: 330 },
    "projected",
    2027,
    SRC.medicareTrustees2026,
  ),
} as const;

export const PART_D = {
  2026: cite({ baseBeneficiaryPremium: 38.99, deductible: 615, outOfPocketCap: 2100 }, "official", 2026, SRC.medicareGovPartB),
  2027: cite({ baseBeneficiaryPremium: 41.33, deductible: 700, outOfPocketCap: 2400 }, "official", 2027, SRC.cmsRate2027, "Base premium from CMS (July 28, 2026); deductible and out-of-pocket cap from the CY 2027 Rate Announcement."),
} as const;

export const PENALTIES = cite(
  {
    partBPerFull12Months: 0.1, // of the standard premium, for life
    partDPerMonth: 0.01, // of the national base beneficiary premium, rounded to nearest $0.10
    partDGapDays: 63,
  },
  "official",
  "all",
  SRC.medicareGovPenalty,
);

export const PART_B_REBATE_2026 = cite(
  { amount: 90, month: "October 2026" },
  "official",
  2026,
  SRC.cmsRebate2026,
  "One-time Medicare Improvement Fund premium rebate for about 20.8 million Original Medicare Part B enrollees; excludes Medicare Advantage enrollees, people whose premium Medicaid pays, and people who pay IRMAA.",
);

/** Form SSA-44 qualifying life-changing events (20 CFR 418.1205). */
export const LIFE_CHANGING_EVENTS = [
  "Marriage",
  "Divorce or annulment",
  "Death of your spouse",
  "Work stoppage (you or your spouse stopped working)",
  "Work reduction (you or your spouse cut back hours)",
  "Loss of income-producing property you didn't cause (disaster, theft, fraud)",
  "Loss or reduction of an employer pension (plan termination or reorganization)",
  "Employer settlement payment because of an employer's closure, bankruptcy or reorganization",
];
/**
 * Projected 2028 IRMAA thresholds (Sundial Years projection, not CMS): the 2027 CPI-U window average grown by the
 * Trustees' long-run CPI assumption, then the statutory formula (base × CPI ratio, nearest $1,000). The top threshold
 * starts indexing for 2029.
 */
const window2028 = IRMAA_2027_INDEXING.value.avgSep2025Aug2026_11mo * (1 + TR_ECON.value.cpiUltimate / 100);
const single2028 = IRMAA_2027_INDEXING.value.baseAmounts.map((b) => Math.floor((b * window2028) / IRMAA_2027_INDEXING.value.baseAvgSep2017Aug2018 / 1000 + 0.5) * 1000);
export const IRMAA_2028_PROJECTION = cite(
  { inflationPct: TR_ECON.value.cpiUltimate, single: [...single2028, IRMAA_2027.topIndividual], joint: [...single2028.map((x) => x * 2), IRMAA_2027.topJoint] },
  "projected",
  2028,
  SRC.statuteIrmaa,
  "Projection using the Trustees' long-run CPI-U assumption; CMS sets the official thresholds in the fall of 2027.",
);

export * from "./medicare-programs";
