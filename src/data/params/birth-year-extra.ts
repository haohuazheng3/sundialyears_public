// Extra parameters used by the birth-year reference pages (/full-retirement-age, /social-security-by-birth-year/*).
// Values copied from the verified research files (docs/research/ss_mechanics.json, ssa_annual.json, federal_tax.json)
// or, where the research files have no entry (Medicare enrollment window), from the primary source quoted in the note.
import { cite, type Source } from "./types";
import { SRC } from "./sources";

/** Sources the birth-year pages cite that are not in the shared SRC registry. */
export const BY_SRC = {
  ssaNra: { label: "SSA OACT — Normal retirement age by year of birth", url: "https://www.ssa.gov/oact/ProgData/nra.html", publisher: "SSA" },
  ecfrFra: {
    label: "20 CFR 404.409 — Full retirement age (retirement, spouse and survivor tables)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-E/section-404.409",
    publisher: "eCFR",
  },
  pomsAgeAttainment: { label: "SSA POMS GN 00302.400 — Attainment of age (day before the birthday)", url: "https://secure.ssa.gov/poms.nsf/lnx/0200302400", publisher: "SSA" },
  pomsFirstMonth: { label: "SSA POMS RS 00202.010 — First month of entitlement: the “62 throughout the month” rule", url: "https://secure.ssa.gov/poms.nsf/lnx/0300202010", publisher: "SSA" },
  pomsSurvivorReduction: { label: "SSA POMS RS 00615.301 — Widow(er)’s benefit reduction by date of birth", url: "https://secure.ssa.gov/poms.nsf/lnx/0300615301", publisher: "SSA" },
  ecfrColaFrom62: {
    label: "20 CFR 404.212 — Computing the PIA (COLAs apply from the year you reach 62)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-C/section-404.212",
    publisher: "eCFR",
  },
  ssaColaBenefits: { label: "SSA OACT — Benefit formula, COLAs and the first COLA after eligibility", url: "https://www.ssa.gov/oact/COLA/Benefits.html", publisher: "SSA" },
  ecfrMedicareIep: { label: "42 CFR 407.14 — Medicare initial enrollment period", url: "https://www.ecfr.gov/current/title-42/section-407.14", publisher: "eCFR" },
  medicareGovCoverageStart: {
    label: "Medicare.gov — When does Medicare coverage start?",
    url: "https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start",
    publisher: "CMS",
  },
  irsSchedule1A: { label: "IRS Schedule 1-A (Form 1040) — Enhanced deduction for seniors", url: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf", publisher: "IRS" },
} satisfies Record<string, Source>;

/**
 * Medicare eligibility and the Initial Enrollment Period (IEP).
 * 42 CFR 407.14(a)(1): "the 7-month period that begins 3 months before the month an individual first meets the
 * eligibility requirements … and ends 3 months after that first month of eligibility." Eligibility on the basis of age
 * begins at 65. Medicare.gov: "If your birthday is on the first of the month, coverage starts the month before you turn 65."
 */
export const MEDICARE_ENROLLMENT = cite(
  { eligibilityAge: 65, iepMonths: 7, monthsBefore: 3, monthsAfter: 3 },
  "official",
  "all years",
  BY_SRC.ecfrMedicareIep,
  "Coverage always starts on the first of a month. Signing up in the 3 months before your 65th-birthday month starts coverage that month; signing up in the birthday month or later starts it the next month (Medicare.gov).",
);

/**
 * Early-retirement reduction tiers (20 CFR 404.410): the first tier's monthly rate applies to at most 36 months before full
 * retirement age; every further month uses the second rate. The monthly rates themselves are CLAIMING_RULES in
 * params/social-security.ts (5/9 and 5/12 of 1%).
 */
export const EARLY_REDUCTION = cite(
  { firstTierMonths: 36 },
  "official",
  "all years",
  SRC.ssaAgeReduction,
  "docs/research/ss_mechanics.json — rib_reduction_rate_first_36: “The percentage reduction is 5/9 of 1% per month for the first 36 months and 5/12 of 1% for each additional month.”",
);

/** Earnings test withholding: $1 for every $2 over the lower limit; $1 for every $3 over the higher limit in the FRA year. */
export const EARNINGS_TEST_RATIO = cite({ beforeFraYear: 2, fraYear: 3 }, "official", "all years", SRC.ssaRet, "docs/research/ssa_annual.json — Retirement earnings test rule.");

/** PIA formula percentages applied to AIME at the bend points (90/32/15). Fixed by law. */
export const PIA_FORMULA_PCTS = cite([90, 32, 15] as const, "official", "all years", SRC.ssaBendPoints, "docs/research/ss_mechanics.json — PIA formula (90/32/15) and rounding.");

/** Key Social Security ages: earliest retirement claim, the age delayed credits stop, earliest (non-disabled) survivor claim. */
export const SS_AGES = cite(
  { earliestRetirement: 62, drcStops: 70, earliestSurvivor: 60 },
  "official",
  "all years",
  BY_SRC.ecfrFra,
  "docs/research/ss_mechanics.json — first month of entitlement, DRC cap at 70, survivor reduction to 71.5% at 60.",
);

/**
 * Retroactive benefits on a retirement application: at most 6 months before the month you apply, and never for a month
 * before full retirement age if that would cause an age reduction (20 CFR 404.621(a)).
 */
export const RETROACTIVITY = cite(
  { months: 6 },
  "official",
  "all years",
  SRC.ssaDelayedCredits,
  "docs/research/ss_mechanics.json — retroactivity_months (verified against 20 CFR 404.621): “we cannot pay retroactive benefits for any month before you reached full retirement age or more than six months in the past.”",
);

/** POMS GN 00204.035 — expanded deemed filing (Bipartisan Budget Act of 2015 §831). */
export const POMS_DEEMED_FILING: Source = {
  label: "SSA POMS GN 00204.035 — Deemed filing for people born January 2, 1954 or later",
  url: "https://secure.ssa.gov/poms.nsf/lnx/0200204035",
  publisher: "SSA",
};

/**
 * Expanded deemed filing applies to claimants born on or after January 2, 1954: filing for your own retirement benefit or a
 * spouse's benefit is a filing for both, at any age, so a "restricted application" for spousal benefits only is impossible.
 */
export const DEEMED_FILING = cite(
  { dobCutoff: "1954-01-02" },
  "official",
  "all years",
  POMS_DEEMED_FILING,
  "docs/research/ss_mechanics.json — bba2015_deemed_filing_dob_cutoff: “changed the policy for deemed filing for claimants who have a date of birth (DOB) of January 2, 1954 or later.”",
);
