import { cite, type Source } from "./types";
import { SRC } from "./sources";

/**
 * Extra parameters for the Social Security claiming-age / break-even calculator.
 * Every cited value is copied from docs/research/ss_mechanics.json and docs/research/ss_longevity.json
 * (+ the adversarial checks in verify_ss_mechanics.json / verify_ss_longevity.json, 2026-10-23).
 * Shared figures (FRA, reduction/credit rates, bend points, COLAs, AWI, taxable maximum, Trustees assumptions)
 * already live in social-security.ts, ss-core.ts and src/data/generated — they are not repeated here.
 */

/** Primary sources used only by the claiming calculator (kept here so sources.ts stays untouched). */
export const CLAIM_SRC = {
  oactPiaFormula: {
    label: "SSA OACT — Primary insurance amount formula (90/32/15, rounded down to $0.10)",
    url: "https://www.ssa.gov/oact/COLA/piaformula.html",
    publisher: "SSA",
  },
  oactBenefits: {
    label: "SSA OACT — Benefit calculation examples (AIME and the first COLA after eligibility)",
    url: "https://www.ssa.gov/oact/COLA/Benefits.html",
    publisher: "SSA",
  },
  oactQuickCalc: {
    label: "SSA OACT — Quick Calculator (benefit estimate from current earnings)",
    url: "https://www.ssa.gov/oact/quickcalc/",
    publisher: "SSA",
  },
  oactEarlyRetire: {
    label: "SSA OACT — Early or late retirement: benefit at 62 by year of birth",
    url: "https://www.ssa.gov/oact/quickcalc/earlyretire.html",
    publisher: "SSA",
  },
  ecfr404_211: {
    label: "20 CFR 404.211 — Computing your average indexed monthly earnings",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-C/section-404.211",
    publisher: "eCFR",
  },
  ecfr404_212: {
    label: "20 CFR 404.212 — Computing your primary insurance amount from your AIME (COLAs from the year you reach 62)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-C/section-404.212",
    publisher: "eCFR",
  },
  ecfr404_313: {
    label: "20 CFR 404.313 — Delayed retirement credits (January effective date)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-D/section-404.313",
    publisher: "eCFR",
  },
  ecfr404_333: {
    label: "20 CFR 404.333 — Wife's and husband's benefit amounts (one-half of the PIA)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-D/section-404.333",
    publisher: "eCFR",
  },
  ecfr404_338: {
    label: "20 CFR 404.338 — Widow's and widower's benefit amounts (82½% limit)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-D/section-404.338",
    publisher: "eCFR",
  },
  pomsDualEntitlement: {
    label: "SSA POMS RS 00615.020 — Dual entitlement: own retirement benefit plus spouse or survivor benefit",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615020",
    publisher: "SSA",
  },
  pomsSpouseReduction: {
    label: "SSA POMS RS 00615.201 — Reduction of spouse's benefits",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615201",
    publisher: "SSA",
  },
  pomsSurvivorReduction: {
    label: "SSA POMS RS 00615.301 — Widow(er)'s benefit reduction",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615301",
    publisher: "SSA",
  },
  pomsRibLim: {
    label: "SSA POMS RS 00615.320 — Widow(er)'s limit (RIB-LIM)",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615320",
    publisher: "SSA",
  },
  pomsDrc: {
    label: "SSA POMS RS 00615.692 — Computing delayed retirement credits",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615692",
    publisher: "SSA",
  },
  pomsDeemedFiling: {
    label: "SSA POMS GN 00204.035 — Deemed filing for spouse's and retirement benefits",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0200204035",
    publisher: "SSA",
  },
  trHighlights2026: {
    label: "2026 Trustees Report — Highlights (OASI reserve depletion and payable benefits)",
    url: "https://www.ssa.gov/OACT/TR/2026/II_A_highlights.html",
    publisher: "SSA",
    published: "2026-06-09",
  },
  trEcon2026: {
    label: "2026 Trustees Report — Economic assumptions (real interest rate, CPI)",
    url: "https://www.ssa.gov/OACT/TR/2026/V_B_econ.html",
    publisher: "SSA",
    published: "2026-06-09",
  },
  trDemo2026: {
    label: "2026 Trustees Report — Demographic assumptions (cohort life expectancy, Table V.A5)",
    url: "https://www.ssa.gov/OACT/TR/2026/V_A_demo.html",
    publisher: "SSA",
    published: "2026-06-09",
  },
} satisfies Record<string, Source>;

/**
 * PIA formula: 90% of AIME up to the first bend point, 32% up to the second, 15% above; result rounded down to $0.10.
 * ss_mechanics.json "pia_formula_factors" — "(a) 90 percent of the first $1,340 of his/her average indexed monthly earnings, plus (b) 32 percent …"
 */
export const PIA_FORMULA = cite({ first: 0.9, second: 0.32, third: 0.15 }, "official", "all (eligibility 1979+)", CLAIM_SRC.oactPiaFormula);

/**
 * AIME computation years: elapsed years (from the later of 1951 or the year you reach 22, through the year before you
 * reach 62) minus 5 dropout years, never fewer than 2 — normally 35. Earnings are wage-indexed to the year you reach 60
 * (two years before eligibility); later years count at face value. AIME is rounded down to the dollar.
 * ss_mechanics.json "computation_years" + rule "AIME: wage indexing to age 60 and the highest 35 years" (as corrected in
 * verify_ss_mechanics.json: years before 22 may also be used if they rank in the top 35).
 */
export const AIME_RULES = cite(
  { typicalComputationYears: 35, dropoutYears: 5, minimumComputationYears: 2, elapsedFromAge: 22, firstElapsedYear: 1951, indexToYearsBeforeEligibility: 2 },
  "official",
  "all",
  CLAIM_SRC.ecfr404_211,
);

/** Age you must reach in a year for it to be your eligibility year (first year of possible retirement benefits). */
export const ELIGIBILITY_AGE = cite(62, "official", "all", CLAIM_SRC.ecfr404_212, "COLAs apply to the PIA from the December of the year you reach 62, whether or not you have claimed.");

/** Spouse's full (unreduced) benefit = one-half of the worker's PIA (never the worker's delayed-credit amount). */
export const SPOUSAL = cite({ basePctOfPia: 0.5 }, "official", "all", CLAIM_SRC.ecfr404_333);

/**
 * Widow(er) benefits: 100% of the deceased's benefit base at survivor FRA (including any delayed credits), as early as
 * age 60 at a 28.5% reduction (71.5%), and — if the deceased took a reduced retirement benefit — capped at the larger of
 * what the deceased was receiving or 82.5% of the deceased's PIA (RIB-LIM).
 * ss_mechanics.json "survivor_base_pct_of_pia", "survivor_max_reduction", "rib_lim_floor_pct", "widow_min_age".
 */
export const SURVIVOR = cite({ basePctOfPia: 1, minAge: 60, maxReduction: 0.285, ribLimFloorPctOfPia: 0.825 }, "official", "all", CLAIM_SRC.ecfr404_338);

/**
 * Bipartisan Budget Act of 2015 deemed filing: anyone born on or after this date who files for either their own or a
 * spouse's benefit is deemed to file for both. ss_mechanics.json "bba2015_deemed_filing_dob_cutoff".
 */
export const DEEMED_FILING_DOB = cite("1954-01-02", "official", "all", CLAIM_SRC.pomsDeemedFiling, "Deemed filing does not apply to survivor benefits.");

/**
 * Sundial Years modeling assumption — NOT an SSA figure. SSA's cohort life tables describe the average person of each
 * sex and birth year; to let readers reflect their own health we scale every yearly death probability q(x) by a constant
 * factor (capped at 1). For a man born in 1964, a factor of 1.5 shortens life expectancy by about 3½ years and 2/3
 * lengthens it by about the same (83.7 → 80.2 / 87.4). The page states this assumption in plain words next to the result.
 */
export const HEALTH_OUTLOOK = {
  shorter: { qxMultiplier: 1.5, label: "Shorter than average", hint: "Serious health problems, or most relatives died young" },
  average: { qxMultiplier: 1, label: "About average", hint: "SSA's projected death rates for your sex and birth year" },
  longer: { qxMultiplier: 2 / 3, label: "Longer than average", hint: "Excellent health and long-lived parents" },
} as const;
export type HealthOutlook = keyof typeof HEALTH_OUTLOOK;

/**
 * Back pay: an application can reach back at most 6 months, and never to a month before full retirement age if that
 * would cause an age reduction. ss_mechanics.json "retroactivity_months" — "we cannot pay retroactive benefits for any
 * month before you reached full retirement age or more than six months in the past."
 */
export const RETROACTIVE_MONTHS = cite(6, "official", "all", SRC.ssaDelayedCredits);

/**
 * Early-claiming reduction tiers: the first-tier monthly rate (5/9 of 1% for retirement, 25/36 of 1% for spouses) applies
 * to at most this many months before full retirement age; every further month uses 5/12 of 1%.
 * ss_mechanics.json "rib_reduction_rate_first_36" — "The percentage reduction is 5/9 of 1% per month for the first 36
 * months and 5/12 of 1% for each additional month." (rates themselves: CLAIMING_RULES in social-security.ts)
 */
export const REDUCTION_TIER_MONTHS = cite(36, "official", "all", SRC.ssaAgeReduction);

/**
 * Earnings test withholding ratios: $1 withheld for every $2 above the lower limit (years before the year you reach full
 * retirement age) and $1 for every $3 above the higher limit (that year, pay before the FRA month only).
 * ss_mechanics.json "ret_withholding_ratio_under_fra" / "ret_withholding_ratio_fra_year" — "We withhold $1 in benefits for
 * every $2 of earnings in excess of the lower exempt amount." / "… $1 in benefits for every $3 …"
 */
export const RET_WITHHOLDING = cite({ beforeFraYear: 2, fraYear: 3 }, "official", "all", SRC.ssaRet);

/**
 * Most of your benefits that can ever count as federal taxable income (IRC §86). federal_tax.json
 * "ss_taxation_inclusion_rates" — "Generally, up to 50% of your benefits will be taxable. However, up to 85% of your
 * benefits can be taxable".
 */
export const BENEFIT_TAX_MAX_SHARE = cite(0.85, "official", "all", SRC.irsPub915);

/** Range of birth years and ages in public/data/cohort-qx-tr2026.json (SSA cohort tables, 2026 TR, intermediate). */
export const COHORT_TABLE_RANGE = { firstBirthYear: 1935, lastBirthYear: 1980, firstAge: 50, lastAge: 119, url: "/data/cohort-qx-tr2026.json" } as const;
