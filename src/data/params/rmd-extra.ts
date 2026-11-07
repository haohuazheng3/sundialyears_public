import { cite } from "./types";
import type { Source } from "./types";
import { SRC } from "./sources";

/**
 * Extra RMD facts used by /rmd-table and /rmd/age-N. Every value is copied from docs/research/rmd.json and
 * docs/research/verify_rmd.json (research + adversarial verification, 2026-10-23).
 */

/** Primary sources used only by the RMD reference pages (kept here so sources.ts stays untouched). */
export const RMD_SRC = {
  irsPub590bPdf: {
    label: "IRS Publication 590-B (2025), PDF — Appendix B life expectancy tables and worked examples",
    url: "https://www.irs.gov/pub/irs-pdf/p590b.pdf",
    publisher: "IRS",
    published: "2026-01-21",
  },
  irsRmdTopics: {
    label: "IRS — Retirement topics: Required minimum distributions (RMDs)",
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-required-minimum-distributions-rmds",
    publisher: "IRS",
  },
  irsRmdWorksheets: {
    label: "IRS — Required minimum distribution worksheets",
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/required-minimum-distribution-worksheets",
    publisher: "IRS",
  },
  ecfrIra408_8: {
    label: "Treas. Reg. §1.408-8 — Distribution requirements for individual retirement plans",
    url: "https://www.ecfr.gov/current/title-26/section-1.408-8",
    publisher: "eCFR",
  },
  irsNotice2567: {
    label: "IRS Notice 2025-67 — 2026 retirement plan limits, including the QCD limit",
    url: "https://www.irs.gov/pub/irs-drop/n-25-67.pdf",
    publisher: "IRS",
    published: "2025-11-13",
  },
  ecfrExcise54_4974: {
    label: "Treas. Reg. §54.4974-1 — Excise tax on missed RMDs: correction window and automatic waivers",
    url: "https://www.ecfr.gov/current/title-26/section-54.4974-1",
    publisher: "eCFR",
  },
  irc6654: {
    label: "26 U.S.C. §6654(g) — Withholding treated as estimated tax paid in equal parts on each due date",
    url: "https://www.law.cornell.edu/uscode/text/26/6654",
    publisher: "Congress",
  },
} satisfies Record<string, Source>;

/**
 * Joint and Last Survivor Table eligibility during the owner's life (Treas. Reg. §1.401(a)(9)-5(c)(2); IRS RMD FAQs):
 * the spouse must be the SOLE beneficiary of the entire account all year and MORE than 10 years younger.
 * Marital status is fixed as of January 1. Verified: Uniform(x) equals Joint(x, x − 10) for every age 72–120+.
 */
export const JOINT_TABLE_RULE = cite(
  { spouseYoungerByMoreThan: 10, soleBeneficiaryAllYear: true, maritalStatusDate: "January 1" },
  "official",
  "2022+",
  SRC.irsRmdFaq,
  "“use this table if the sole beneficiary of the account is your spouse and your spouse is more than 10 years younger than you.”",
);

/**
 * Cells where IRS Pub. 590-B (2025) Table II differs from the regulation's Joint and Last Survivor Table
 * (Treas. Reg. §1.401(a)(9)-9(d)). The regulation governs; the site uses the regulation values.
 */
export const PUB590B_TABLE_II_DIFFS = cite(
  [
    { ownerAge: 90, spouseAge: 76, pub590b: 14.8 },
    { ownerAge: 112, spouseAge: 102, pub590b: 3.2 },
    { ownerAge: 112, spouseAge: 103, pub590b: 3.1 },
    { ownerAge: 112, spouseAge: 107, pub590b: 2.9 },
  ],
  "official",
  "2025",
  RMD_SRC.irsPub590bPdf,
  "Cell-by-cell comparison of 5,611 Pub. 590-B cells against the eCFR table (docs/research/verify_rmd.json).",
);

/**
 * IRS Pub. 590-B (2025) “Justin” example: he turned 73 on Dec 15, 2025, yet his 2026 RMD is divided by the age-73
 * factor (26.5). In 2026 he reaches 74, so the correct factor is the age-74 one. A publication error — don't copy it.
 */
export const PUB590B_JUSTIN_EXAMPLE = cite(
  { distributionYear: 2026, ageReached: 74, ageUsedInExample: 73, balance: 34800, rmdShown: 1313 },
  "official",
  2026,
  RMD_SRC.irsPub590bPdf,
  "“Justin figured his required minimum distribution of $1,313 for 2026 ($34,800 ÷ 26.5 …)”",
);

/**
 * IRS Pub. 590-B worked example for a non-spouse beneficiary (non-recalculating method, Treas. Reg. §1.401(a)(9)-5(d)):
 * owner died in 2021; beneficiary was 55 in 2022 (first distribution year); the 2026 divisor is the age-55 Single Life
 * factor minus 1 for each year since 2022.
 */
export const PUB590B_BENEFICIARY_EXAMPLE = cite(
  { ownerDeathYear: 2021, firstYear: 2022, beneficiaryAgeInFirstYear: 55, distributionYear: 2026 },
  "official",
  2026,
  RMD_SRC.irsPub590bPdf,
);

/** The IRS's online RMD worksheets are stale: still “for 2022” and keyed to “the year you turn age 72”. */
export const IRS_WORKSHEETS_STALE = cite(
  { saysUseFor: 2022, saysAge: 72, lastReviewed: "2026-06-27" },
  "official",
  2026,
  RMD_SRC.irsRmdWorksheets,
  "The table values are current; only the age wording is out of date (SECURE 2.0 moved the RMD age to 73).",
);

/**
 * Still-working exception (Treas. Reg. §1.401(a)(9)-2(b)(1)–(3); §1.408-8(b)(1)): an employer plan may let a participant who
 * still works for the plan sponsor delay RMDs until April 1 after the year they retire — but not a 5-percent owner (IRC §416),
 * and never for IRAs, including SEP and SIMPLE IRAs (docs/research/rmd.json rules required_beginning_date_by_account_type,
 * ira_no_still_working_exception).
 */
export const STILL_WORKING_RULE = cite(
  { ownerShareLimit: 0.05, appliesToIras: false, currentEmployerPlanOnly: true },
  "official",
  "all",
  SRC.ecfrRmdAge,
  "“An IRA owner's required beginning date is determined using the rules for employees who are 5-percent owners” (§1.408-8).",
);

/**
 * When the current life-expectancy tables took effect (T.D. 9930, 85 FR 72472) and when the final SECURE Act RMD regulations
 * (T.D. 10001) were published and apply. docs/research/rmd.json params rmd_life_expectancy_tables_effective and
 * rmd_final_regs_applicability.
 */
export const RMD_TABLES_TIMELINE = cite(
  { tablesFirstDistributionYear: 2022, finalRegsPublished: "2024-07-19", finalRegsFirstYear: 2025 },
  "official",
  "2022+",
  SRC.ecfrRmdTables,
  "“The life expectancy tables and Uniform Lifetime Table set forth in this section apply for distribution calendar years beginning on or after January 1, 2022.”",
);

/**
 * Missed-RMD excise tax timing (Treas. Reg. §54.4974-1; IRC §4974(e)). The 10% rate applies if the shortfall is distributed and
 * reported by the end of the correction window: the earliest of the notice of deficiency, the assessment, or "the last day of the
 * second taxable year that begins after the end of the taxable year in which the tax … is imposed" (verify_rmd.json
 * rmd_excise_correction_window_end). A missed first-year RMD is taxed in the year containing the April 1 deadline (§54.4974-1(f)).
 * The tax is waived automatically for a year-of-death RMD the beneficiary takes by their tax-filing deadline (with extensions) or,
 * if later, the end of the year after the death (§54.4974-1(g)(3), verify_rmd.json rule:excise_tax_computation).
 */
export const EXCISE_TIMING = cite(
  { correctionWindowYearsAfter: 2, yearOfDeathAutoWaiver: true },
  "official",
  "2025+",
  RMD_SRC.ecfrExcise54_4974,
  "“(C) The last day of the second taxable year that begins after the end of the taxable year in which the tax under section 4974(a) is imposed.”",
);
