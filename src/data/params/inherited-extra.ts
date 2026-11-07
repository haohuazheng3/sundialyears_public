import { cite, type Source } from "./types";
import { SRC } from "./sources";

/**
 * Extra parameters for the inherited-IRA RMD calculator (owned by that calculator; shared rules stay in ./rmd.ts).
 * Values copied from docs/research/rmd.json + verify_rmd.json (research date 2026-10-23), except EARLY_DISTRIBUTION,
 * which was checked against the statute text on law.cornell.edu on 2026-10-23 (not covered by the research files).
 */

export const SRC_INHERITED = {
  ecfrDeathBeforeRbd: {
    label: "Treas. Reg. §1.401(a)(9)-3 — Death before the required beginning date (10-year, 5-year and life-expectancy rules)",
    url: "https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-3",
    publisher: "eCFR",
  },
  ecfrBeneficiary: {
    label: "Treas. Reg. §1.401(a)(9)-4 — Determination of the designated beneficiary (eligible designated beneficiaries)",
    url: "https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-4",
    publisher: "eCFR",
  },
  ecfrIra: {
    label: "Treas. Reg. §1.408-8 — Distribution requirements for IRAs (spouse treating the IRA as their own, Roth IRAs)",
    url: "https://www.ecfr.gov/current/title-26/section-1.408-8",
    publisher: "eCFR",
  },
  ecfrExcise: {
    label: "Treas. Reg. §54.4974-1 — Excise tax on missed RMDs, correction window and automatic waivers",
    url: "https://www.ecfr.gov/current/title-26/section-54.4974-1",
    publisher: "eCFR",
  },
  irsNotice202435: {
    label: "IRS Notice 2024-35 — Relief for missed 10-year-rule annual RMDs (2021–2024)",
    url: "https://www.irs.gov/pub/irs-drop/n-24-35.pdf",
    publisher: "IRS",
    published: "2024-04-16",
  },
  irc72t: {
    label: "26 U.S.C. §72(t) — 10% additional tax on early distributions (death exception)",
    url: "https://www.law.cornell.edu/uscode/text/26/72",
    publisher: "Congress",
  },
  ecfrGeneral: {
    label: "Treas. Reg. §1.401(a)(9)-1 — Minimum distribution requirement in general (governmental-plan effective date)",
    url: "https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-1",
    publisher: "eCFR",
  },
} satisfies Record<string, Source>;

/**
 * Payout windows. research rmd.json: inherited_10_year_rule_period ("by the end of the calendar year that includes the tenth
 * anniversary of the date of the employee's death"), inherited_5_year_rule_period ("2020 disregarded for pre-2020 deaths"),
 * applies_to_year "deaths after Dec 31, 2019".
 */
export const INHERITED_TIMING = cite(
  {
    tenYearRuleYears: 10,
    fiveYearRuleYears: 5,
    /** The SECURE Act 10-year rule and eligible-designated-beneficiary categories apply to deaths in this year or later. */
    secureActFirstDeathYear: 2020,
    /** For deaths before 2020, the 2020 calendar year is disregarded when counting the 5-year rule. */
    fiveYearDisregardedYear: 2020,
  },
  "official",
  "deaths after 2019",
  SRC_INHERITED.ecfrDeathBeforeRbd,
  "Governmental plans (and some pre-2020 collectively bargained plans) apply the 10-year rule only to deaths on or after January 1, 2022 (Treas. Reg. 1.401(a)(9)-1(b)(2)).",
);

/** research rmd.json: edb_minor_child_age_of_majority (21), edb_not_more_than_years_younger (10, by dates of birth), rule edb_categories. */
export const EDB_TESTS = cite(
  {
    minorChildMajorityAge: 21,
    closeAgeMaxYearsYounger: 10,
    documentationDeadline: "October 31 of the year after the year of death (employer plans only — IRA custodians don't need it)",
  },
  "official",
  "2025+",
  SRC_INHERITED.ecfrBeneficiary,
  "Reg. example: an owner born October 1, 1953 → a beneficiary born on or before October 1, 1963 is not more than 10 years younger.",
);

/**
 * research rmd.json param ten_year_rule_annual_rmd_relief_years (notes) + rule ten_year_rule_relief_2021_2024_and_2025_start:
 * relief covers beneficiaries of owners who died 2020–2023 on/after their required beginning date; the 10-year end date is
 * not extended. The waived years themselves (2021–2024) and the 2025 restart live in INHERITED_RULES (./rmd.ts).
 */
export const TEN_YEAR_RELIEF = cite(
  {
    coveredDeathYears: [2020, 2021, 2022, 2023],
  },
  "official",
  "2021-2024",
  SRC_INHERITED.irsNotice202435,
  "Notice 2022-53 (2021, 2022), Notice 2023-54 (2023), Notice 2024-35 (2024). Missed waived RMDs need not be made up.",
);

/**
 * research rmd.json rule excise_tax_computation: automatic waiver for a decedent's year-of-death RMD taken by the beneficiary
 * by the beneficiary's tax-filing deadline (with extensions) or, if later, the end of the following year.
 */
export const YEAR_OF_DEATH_RMD = cite(
  {
    due: "December 31 of the year of death",
    automaticWaiver: "Taken by the beneficiary by their tax-filing deadline (including extensions) for that year, or by the end of the following year if later",
    graceYearsAfterDeath: 1,
  },
  "official",
  "2025+",
  SRC_INHERITED.ecfrExcise,
);

/**
 * IRC §72(t)(1): "an amount equal to 10 percent of the portion of such amount which is includible in gross income";
 * (t)(2)(A)(i) "made on or after the date on which the employee attains age 59½"; (t)(2)(A)(ii) "made to a beneficiary
 * (or to the estate of the employee) on or after the death of the employee". Verified on law.cornell.edu 2026-10-23.
 */
export const EARLY_DISTRIBUTION = cite(
  { additionalTaxRate: 0.1, penaltyFreeAge: 59.5, beneficiaryExempt: true },
  "official",
  "all",
  SRC_INHERITED.irc72t,
  "Not in docs/research; checked against the statute. A spouse who treats an inherited IRA as their own loses the death exception.",
);

/**
 * verify_rmd.json missing_items[0]: 26 CFR 1.401(a)(9)-1(b)(2)(i) "in the case of a governmental plan (as defined in section
 * 414(d)), section 401(a)(9)(H) applies with respect to employees who die on or after January 1, 2022." The same delay applies
 * to collectively bargained plans ratified before December 20, 2019 ((b)(2)(ii)).
 */
export const GOVERNMENTAL_PLAN_TEN_YEAR = cite(
  { firstDeathYear: 2022 },
  "official",
  "deaths 2020-2021",
  SRC_INHERITED.ecfrGeneral,
  "Governmental 457(b)/401(a) plans and some collectively bargained plans: pre-SECURE rules still apply to deaths in 2020 and 2021.",
);

/**
 * research rmd.json rules required_beginning_date_by_account_type + five_percent_owner_rbd: an employer-plan participant who is
 * still employed may delay the RBD to April 1 after retiring, unless they are a 5-percent owner (IRC §416(i): owns MORE than 5%).
 * Never available for IRAs (§1.408-8: IRA owners use the 5-percent-owner rule).
 */
export const STILL_WORKING_EXCEPTION = cite(
  { maxOwnershipShare: 0.05, appliesToIras: false },
  "official",
  "all",
  SRC.ecfrRmdAge,
  "“the calendar year in which the employee retires” — Treas. Reg. §1.401(a)(9)-2(b)(1); not available to 5-percent owners.",
);
