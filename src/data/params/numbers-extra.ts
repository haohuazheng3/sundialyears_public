// Extra parameters for the key-numbers pages (/social-security-cola, /retirement-numbers-2027).
// Every value is copied from the verified research files (docs/research/ssa_annual.json, verify_ssa_annual.json,
// medicare.json) and guarded by src/components/reference/numbers/numbers-extra.test.ts.
import { cite, type Source } from "./types";
import { SRC } from "./sources";

/** Sources not (yet) in the shared SRC registry. */
export const SRC_EXTRA = {
  ssaSsiAmounts: { label: "SSA OACT — SSI federal payment amounts", url: "https://www.ssa.gov/oact/cola/SSI.html", publisher: "SSA", published: "2026-10-14" },
  ssaColaSummary: { label: "SSA OACT — Cost-of-living adjustment summary", url: "https://www.ssa.gov/oact/cola/colasummary.html", publisher: "SSA", published: "2026-10-14" },
  ssaColaInfo: { label: "SSA — Cost-of-living adjustment (COLA) information for 2027", url: "https://www.ssa.gov/cola/", publisher: "SSA" },
  ssaColaApplication: { label: "SSA OACT — How the COLA is applied to benefits", url: "https://www.ssa.gov/oact/cola/colaapplic.html", publisher: "SSA" },
  ssaRetDet: { label: "SSA OACT — Determination of the 2027 earnings-test exempt amounts", url: "https://www.ssa.gov/oact/cola/rtdet.html", publisher: "SSA" },
  ssaCbbDet: { label: "SSA OACT — Determination of the 2027 contribution and benefit base", url: "https://www.ssa.gov/oact/cola/cbbdet.html", publisher: "SSA" },
  ecfrIrmaaTopTier: { label: "20 CFR 418.1115 — IRMAA income thresholds (top tier not indexed until 2028)", url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1115", publisher: "eCFR" },
  ssaQc: { label: "SSA OACT — Quarter of coverage", url: "https://www.ssa.gov/oact/cola/QC.html", publisher: "SSA" },
  ssaPiaFormula: { label: "SSA OACT — Primary insurance amount formula", url: "https://www.ssa.gov/oact/cola/piaformula.html", publisher: "SSA" },
} satisfies Record<string, Source>;

/** Work credits: at most this many quarters of coverage per year; this many for retirement benefits (and premium-free Part A). */
export const WORK_CREDITS = cite({ maxPerYear: 4, neededForRetirement: 40 }, "official", "all years", SRC_EXTRA.ssaQc);

/** PIA formula factors (percent of average indexed monthly earnings in each band). */
export const PIA_FACTORS = cite([90, 32, 15] as const, "official", "all years", SRC_EXTRA.ssaPiaFormula);

/** Earnings test withholding: $1 for every $N over the limit. */
export const RET_WITHHOLDING = cite({ beforeFraYear: 2, inFraYear: 3 }, "official", "all years", SRC.ssaRet);

/** Key dates of the 2027 COLA (SSA press release Oct 14, 2026; OACT latestCOLA). */
export const COLA_2027_DATES = cite(
  {
    announced: "2026-10-14",
    effectiveMonth: "December 2026",
    firstPaidMonth: "January 2027",
    ssiFirstPaid: "2026-12-31",
  },
  "official",
  2027,
  SRC.ssaPress20261014,
  "The COLA applies to benefits for December 2026, which are paid in January 2027. SSI's January 2027 payment is made on December 31, 2026.",
);

/** Monthly CPI-W (BLS series CWUR0000SA0) for July, August, September — the inputs to the 2027 COLA. */
export const CPIW_Q3_MONTHLY = cite(
  {
    2026: [327.104, 328.481, 330.654] as const,
    2025: [316.349, 317.306, 318.139] as const,
  },
  "official",
  2027,
  SRC.ssaLatestCola,
  "SSA: (328.746 − 317.265) / 317.265 × 100 = 3.6 percent. Cross-checked against the BLS public API.",
);

/** When individual COLA notices arrive (SSA). */
export const COLA_NOTICES_2027 = cite(
  { online: "late November 2026", onlineEnrollBy: "2026-11-18", mail: "December 2026" },
  "official",
  2027,
  SRC_EXTRA.ssaColaInfo,
  "Online in the my Social Security Message Center for people with an account by November 18, 2026; paper notices by mail in December.",
);

/** The next COLA (for 2028). */
export const NEXT_COLA = cite(
  {
    forYear: 2028,
    announceMonth: "October 2027",
    cpiwMonths: "July, August and September 2027",
    alsoAnnounced: "the 2028 taxable maximum, earnings-test limits, SSI amounts and bend points",
  },
  "not_yet_announced",
  2028,
  SRC_EXTRA.ssaColaSummary,
  "SSA: “We will announce the next COLA in October 2027.”",
);

/** 2026 Trustees Report intermediate assumption for the December 2026 COLA (made before the actual figure was known). */
export const TRUSTEES_COLA_ASSUMPTION = cite(
  { dec2026Assumed: 2.7 },
  "official",
  2026,
  SRC.ssaTrustees2026,
  "Table V.C1 intermediate assumption; the actual COLA for December 2026 turned out to be 3.6%.",
);

/**
 * December 1999 COLA — a fallback patch: older builds of src/data/generated/cola-history.ts missed 1999 because SSA's table
 * cell carries a footnote marker ("1999&nbsp;a"). The current generated table has it; the test keeps the two in agreement.
 * Value per SSA OACT colaseries.html footnote a.
 */
export const COLA_1999 = cite(2.5, "official", 1999, SRC.ssaColaSeries, "Originally determined as 2.4%; effectively 2.5% under Public Law 106-554.");

/** SSI unrounded annual federal benefit rates. Monthly = unrounded annual ÷ 12, rounded down to the dollar (SSA OACT). */
export const SSI_UNROUNDED_ANNUAL = cite(
  {
    2026: { individual: 11929.46, couple: 17892.21 },
    2027: { individual: 12358.92, couple: 18536.33, essentialPerson: 6193.63 },
  },
  "official",
  2027,
  SRC_EXTRA.ssaSsiAmounts,
);

export const SSI_ESSENTIAL_PERSON_2027 = cite(516, "official", 2027, SRC_EXTRA.ssaSsiAmounts);

/** SSI resource (asset) limits — set by law, not indexed. */
export const SSI_RESOURCE_LIMITS = cite({ individual: 2000, couple: 3000 }, "official", "2026–2027", SRC.ssaCola2027, "Statutory; not adjusted for inflation.");

/** Payroll tax rates (unchanged for 2026 and 2027), percent. */
export const PAYROLL_TAX = cite(
  { oasdiEmployee: 6.2, hiEmployee: 1.45, combinedEmployee: 7.65, combinedSelfEmployed: 15.3 },
  "official",
  "2026–2027",
  SRC.ssaCola2027,
  "Medicare (HI) tax has no earnings cap.",
);

/** Maximum benefit for a steady maximum-taxable earner retiring in January 2026, and the same benefits after the 3.6% COLA. */
export const MAX_BENEFIT_2026 = cite(
  {
    age62: 2969,
    age65: 3467,
    age66: 3752,
    age67: 4207,
    age70: 5181,
    in2027AfterCola: { age62: 3076, age65: 3592, age66: 3887, age67: 4359, age70: 5368 },
  },
  "official",
  2026,
  SRC.ssaMaxBenefit,
);

/** SSI student earned income exclusion (monthly / annual cap). */
export const SSI_STUDENT_EXCLUSION = cite(
  { 2026: { monthly: 2410, annual: 9730 }, 2027: { monthly: 2500, annual: 10080 } },
  "official",
  2027,
  SRC.ssaCola2027,
);

/** Largest share of Social Security benefits that can be taxable above each provisional-income threshold (IRC §86). Percent. */
export const SS_BENEFIT_TAXABLE_SHARE = cite({ aboveBase: 50, aboveAdjusted: 85 }, "official", "all years", SRC.irsPub915, "Statutory; not indexed.");

/** Part A lifetime reserve days: a once-in-a-lifetime bank of extra hospital days after day 90 of a stay (statutory). */
export const PART_A_LIFETIME_RESERVE_DAYS = cite(60, "official", "all years", SRC.cms2026Premiums, "docs/research/medicare.json: “Statutory: 1/2 of inpatient deductible; 60 lifetime reserve days.”");

/**
 * 2027 figures still pending that the shared PARAM_STATUS_SUMMARY list doesn't name. CMS publishes the 2027 Part A amounts
 * together with the Part B premium (docs/research/medicare.json upcoming_updates: “Early-to-mid November 2026”).
 */
export const PENDING_2027_EXTRA = cite(
  [{ item: "2027 Medicare Part A deductible, coinsurance and premiums", expected: "Early to mid-November 2026 (CMS)" }] as const,
  "not_yet_announced",
  2027,
  SRC.cms2026Premiums,
);

/** SSA's maximum-benefit examples: “age 62” means exact age 62 and 1 month (OACT examplemax.html, footnote a). */
export const MAX_EXAMPLE_AGE62 = cite(
  { years: 62, months: 1, label: "62 and 1 month" },
  "official",
  "all years",
  SRC.ssaMaxBenefit,
  "docs/research/ssa_annual.json ss_max_benefit_age62_and_70_2027: “Age 62 means exact age 62 and 1 month.”",
);
