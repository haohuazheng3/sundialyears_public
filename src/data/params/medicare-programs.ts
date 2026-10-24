// Medicare program rules and 2026 income limits used by the enrollment, Medigap, Extra Help, MSP, M3P and HSA tools.
import { cite } from "./types";
import { SRC } from "./sources";

/** 2026 HHS poverty guidelines (annual). */
export const FPL_2026 = cite(
  { contiguous: { one: 15960, two: 21640, additional: 5680 }, alaska: { one: 19950, two: 27050 }, hawaii: { one: 18360, two: 24890 } },
  "official",
  2026,
  SRC.hhsFpl2026,
);

/** Extra Help (Part D Low-Income Subsidy), 2026 limits as published by Medicare.gov. Income is annual. */
export const EXTRA_HELP_2026 = cite(
  { incomeSingle: 23940, incomeCouple: 32460, resourcesSingle: 18090, resourcesCouple: 36100, fplShare: 1.5 },
  "official",
  2026,
  SRC.medicareGovExtraHelp,
  "Your home and one car don't count as resources.",
);

/** Medicare Savings Programs, 2026 federal limits (monthly income; resources). States may set higher limits. */
export const MSP_2026 = cite(
  {
    qmb: { single: 1350, couple: 1824 },
    slmb: { single: 1616, couple: 2184 },
    qi: { single: 1816, couple: 2455 },
    resources: { single: 9950, couple: 14910 },
  },
  "official",
  2026,
  SRC.medicareGovMsp,
  "Income limits are slightly higher in Alaska and Hawaii, and many states use higher limits or no asset test.",
);

/** Enrollment windows (Medicare.gov / SSA). */
export const ENROLLMENT_RULES = cite(
  {
    eligibilityAge: 65,
    iepMonths: 7,
    iepMonthsBefore: 3,
    iepMonthsAfter: 3,
    gepWindow: "January 1 – March 31",
    sepMonthsAfterWork: 8,
    disabilityMonths: 24,
    medigapOepMonths: 6,
    partARetroMonths: 6,
    largeEmployerSize: 20,
  },
  "official",
  "2023+",
  SRC.medicareGovStart,
  "Sign up in the 3 months before your birthday month and coverage starts the first of your birthday month; sign up later in the window and it starts the first of the month after you sign up. Born on the 1st: everything moves one month earlier.",
);

/** Medicare Prescription Payment Plan monthly cap (42 CFR 423.137). The annual cap is PART_D[year].outOfPocketCap. */
export const M3P_RULES = cite(
  { monthsCountCurrent: true },
  "official",
  "2025+",
  SRC.ecfrM3p,
  "First month: (out-of-pocket cap − costs already incurred) ÷ months left in the year, counting the current month. Later months: (unbilled balance + new costs) ÷ months left.",
);

