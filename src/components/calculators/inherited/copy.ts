/**
 * Plain-English labels and rule constants for the inherited-IRA calculator and its page. Every number is read from the
 * cited params (src/data/params/rmd, inherited-extra) — nothing is typed in. Pure and deterministic (safe on the server).
 */
import { INHERITED_RULES, RMD_EXCISE } from "@/data/params/rmd";
import { EDB_TESTS, EARLY_DISTRIBUTION, INHERITED_TIMING, STILL_WORKING_EXCEPTION, YEAR_OF_DEATH_RMD } from "@/data/params/inherited-extra";
import type { Category, Method, Relationship, InheritedAccount } from "@/lib/calc/inherited";
import { MONTHS } from "@/lib/format";
import type { YMD } from "@/lib/calc/dates";

/** 10 — years in the 10-year rule. */
export const TEN = INHERITED_TIMING.value.tenYearRuleYears;
/** 5 — years in the 5-year rule. */
export const FIVE = INHERITED_TIMING.value.fiveYearRuleYears;
/** 2020 — skipped when counting the 5-year rule for deaths before 2020. */
export const FIVE_SKIP_YEAR = INHERITED_TIMING.value.fiveYearDisregardedYear;
/** 0.05 — the still-working exception is lost by owners of more than this share of the employer. */
export const OWNER_SHARE_LIMIT = STILL_WORKING_EXCEPTION.value.maxOwnershipShare;
/** 2020 — first year of death covered by the SECURE Act rules. */
export const SECURE_FIRST_DEATH_YEAR = INHERITED_TIMING.value.secureActFirstDeathYear;
/** 21 — the minor-child age of majority. */
export const MAJORITY_AGE = EDB_TESTS.value.minorChildMajorityAge;
/** 10 — "not more than N years younger". */
export const CLOSE_GAP = EDB_TESTS.value.closeAgeMaxYearsYounger;
/** 2021–2024 — years whose missed 10-year-rule RMDs were waived. */
export const RELIEF_YEARS = INHERITED_RULES.value.reliefYears;
export const RELIEF_FIRST = RELIEF_YEARS[0];
export const RELIEF_LAST = RELIEF_YEARS[RELIEF_YEARS.length - 1];
/** 2025 — annual RMDs under the 10-year rule are enforced from this year. */
export const ANNUAL_FROM = INHERITED_RULES.value.annualRmdsRequiredFrom;
export const PENALTY_FREE_AGE = EARLY_DISTRIBUTION.value.penaltyFreeAge;
export const EARLY_RATE = EARLY_DISTRIBUTION.value.additionalTaxRate;
export const EXCISE_RATE = RMD_EXCISE.value.rate;
export const EXCISE_RATE_CORRECTED = RMD_EXCISE.value.correctedRate;
export const DETERMINATION_DATE = INHERITED_RULES.value.beneficiaryDeterminationDate;
export const DEATH_YEAR_WAIVER = YEAR_OF_DEATH_RMD.value.automaticWaiver;

/** 59.5 → "59½" */
export const ageLabel = (age: number) => (Number.isInteger(age) ? String(age) : `${Math.floor(age)}½`);
/** { 2024, 8, 20 } → "August 20, 2024" */
export const ymdLong = (d: YMD) => `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;
/** "2021–2024" */
export const reliefRange = `${RELIEF_FIRST}–${RELIEF_LAST}`;

export const REL_OPTIONS: { value: Relationship; label: string }[] = [
  { value: "spouse", label: "Their husband or wife" },
  { value: "child", label: "Their son or daughter" },
  { value: "disabled", label: "Disabled or chronically ill heir" },
  { value: "close-age", label: `Close in age (not more than ${CLOSE_GAP} years younger)` },
  { value: "other", label: "Someone else: grandchild, niece, partner, friend" },
  { value: "estate", label: "Estate, charity or trust (not a person)" },
];

export const ACCOUNT_OPTIONS: { value: InheritedAccount; label: string }[] = [
  { value: "ira", label: "Traditional IRA (also SEP, SIMPLE or rollover IRA)" },
  { value: "plan", label: "401(k), 403(b), 457(b) or other workplace plan" },
  { value: "roth", label: "Roth IRA, Roth 401(k) or Roth 403(b)" },
];

/** Short name of the category (fits a Stat tile). */
export function categoryShort(c: Category): string {
  switch (c) {
    case "spouse":
      return "Spouse";
    case "minor-child":
      return "Minor child";
    case "disabled":
      return "Disabled / ill";
    case "close-age":
      return "Close in age";
    case "designated":
      return "Designated";
    default:
      return "None";
  }
}

/** Full category name as the IRS uses it. */
export function categoryLong(c: Category): string {
  switch (c) {
    case "spouse":
      return "Eligible designated beneficiary — surviving spouse";
    case "minor-child":
      return "Eligible designated beneficiary — the owner’s minor child";
    case "disabled":
      return "Eligible designated beneficiary — disabled or chronically ill";
    case "close-age":
      return `Eligible designated beneficiary — not more than ${CLOSE_GAP} years younger than the owner`;
    case "designated":
      return "Designated beneficiary (not an “eligible” one)";
    default:
      return "No designated beneficiary (estate, charity or non-qualifying trust)";
  }
}

/** One-line name of the payout rule. */
export function methodName(m: Method): string {
  switch (m) {
    case "ten-year-annual":
      return `${TEN}-year rule with yearly RMDs`;
    case "ten-year-lump":
      return `${TEN}-year rule (no yearly minimum)`;
    case "life-expectancy":
      return "Life-expectancy payouts (the “stretch”)";
    case "minor-child":
      return `Life expectancy until ${MAJORITY_AGE}, then ${TEN} years`;
    case "spouse-beneficiary":
      return "Spouse beneficiary — recalculated life expectancy";
    case "spouse-own":
      return "Treated as your own IRA";
    case "five-year":
      return `${FIVE}-year rule`;
    default:
      return "Owner’s remaining life expectancy";
  }
}
