import { cite } from "./types";
import { SRC } from "./sources";
export { UNIFORM_LIFETIME, SINGLE_LIFE, JOINT_LIFE } from "../generated/rmd-tables";

/**
 * RMD rules (SECURE Act 2019, SECURE 2.0 Act 2022, final regulations T.D. 10001 published July 19, 2024,
 * applicable to distribution calendar years beginning 2025). Life-expectancy tables apply from 2022.
 */

/** Applicable age by date of birth (Treas. Reg. 1.401(a)(9)-2(b)(2); SECURE 2.0 §107). */
export const RMD_AGE_RULES = cite(
  [
    { bornBefore: "1949-07-01", age: 70.5, label: "Born before July 1, 1949" },
    { bornBefore: "1951-01-01", age: 72, label: "Born July 1, 1949 – December 31, 1950" },
    { bornBefore: "1960-01-01", age: 73, label: "Born 1951 – 1959" },
    { bornBefore: null, age: 75, label: "Born 1960 or later" },
  ],
  "official",
  "2023+",
  SRC.ecfrRmdAge,
  "People born in 1959 are assigned age 73 by the proposed regulations; the statute's wording is ambiguous for that year and the final rule is still reserved. Their first RMD year would be 2032.",
);

export const RMD_DEADLINES = cite(
  {
    firstYear: "April 1 of the year after the year you reach your RMD age (your 'required beginning date')",
    laterYears: "December 31 of each year",
    doubleUp: "If you delay your first RMD to April 1, you must also take the second year's RMD by December 31 of that same year.",
    balanceDate: "Prior year's December 31 account balance",
  },
  "official",
  "all",
  SRC.irsRmdFaq,
);

export const RMD_EXCISE = cite(
  { rate: 0.25, correctedRate: 0.1, form: "Form 5329", waiver: "Reasonable-cause waiver available by attaching an explanation to Form 5329." },
  "official",
  "2023+",
  SRC.irsExcise4974,
);

export const INHERITED_RULES = cite(
  {
    tenYearDeadline: "December 31 of the year containing the 10th anniversary of the owner's death",
    annualRmdIfOwnerStarted: "If the owner died on or after their required beginning date, a non-eligible designated beneficiary must ALSO take annual RMDs in years 1–9 (final regulations).",
    reliefYears: [2021, 2022, 2023, 2024],
    annualRmdsRequiredFrom: 2025,
    eligibleDesignatedBeneficiaries: [
      "Surviving spouse",
      "Minor child of the owner (until age 21, then 10 years)",
      "Disabled individual",
      "Chronically ill individual",
      "Anyone not more than 10 years younger than the owner",
    ],
    beneficiaryDeterminationDate: "September 30 of the year after the year of death",
    nonRecalculating: "Non-spouse beneficiaries look up the Single Life Table once (age in the year after death) and subtract 1 each later year.",
  },
  "official",
  "2025+",
  SRC.fr2024RmdFinal,
);

export const ROTH_RULES = cite(
  { rothIraLifetime: false, roth401kLifetimeFrom2024: false },
  "official",
  "2024+",
  SRC.irsRmdFaq,
  "Roth IRAs never require lifetime RMDs; Roth 401(k)/403(b) accounts stopped requiring them in 2024.",
);
export * from "./rmd-programs";
