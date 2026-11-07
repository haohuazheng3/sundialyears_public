import { cite } from "./types";
import { SRC } from "./sources";
import { COLA_BY_EFFECTIVE_YEAR } from "../generated/cola-history";

/**
 * Social Security program parameters. "Year" = the calendar year the amount applies to.
 * COLA naming: SSA calls the increase effective December 2026 (first paid January 2027) the "2027 COLA".
 */

export const COLA = {
  2027: cite(3.6, "official", 2027, SRC.ssaCola2027, "Effective December 2026; first paid in January 2027. SSI rises Dec 31, 2026."),
  2026: cite(2.8, "official", 2026, SRC.ssaCola2026, "Effective December 2025; first paid in January 2026."),
} as const;

/** Look up the COLA (in %) by the January it was first paid. 2027 → 3.6. */
export function colaPaidIn(year: number): number | undefined {
  return COLA_BY_EFFECTIVE_YEAR[year - 1];
}

/** CPI-W third-quarter averages behind the 2027 COLA (SSA OACT). */
export const COLA_2027_CPIW = cite({ q3_2026: 328.746, q3_2025: 317.265 }, "official", 2027, SRC.ssaLatestCola);

export interface YearFigures {
  taxableMax: number;
  quarterOfCoverage: number;
  /** Earnings test — years before the year you reach full retirement age ($1 withheld per $2 over). */
  retUnderFraAnnual: number;
  retUnderFraMonthly: number;
  /** Earnings test — the calendar year you reach full retirement age, months before FRA ($1 per $3 over). */
  retFraYearAnnual: number;
  retFraYearMonthly: number;
  sgaNonBlind: number;
  sgaBlind: number;
  trialWorkMonth: number;
  maxBenefitAtFra: number;
  avgRetiredWorkerAfterCola: number;
  avgCoupleAfterCola: number;
  ssiIndividual: number;
  ssiCouple: number;
  piaBendPoints: [number, number];
  familyMaxBendPoints: [number, number, number];
}

export const SS_YEAR = {
  2027: cite<YearFigures>(
    {
      taxableMax: 192300,
      quarterOfCoverage: 1970,
      retUnderFraAnnual: 25560,
      retUnderFraMonthly: 2130,
      retFraYearAnnual: 67920,
      retFraYearMonthly: 5660,
      sgaNonBlind: 1770,
      sgaBlind: 2950,
      trialWorkMonth: 1270,
      maxBenefitAtFra: 4188,
      avgRetiredWorkerAfterCola: 2170,
      avgCoupleAfterCola: 3355,
      ssiIndividual: 1029,
      ssiCouple: 1544,
      piaBendPoints: [1340, 8077],
      familyMaxBendPoints: [1712, 2471, 3223],
    },
    "official",
    2027,
    SRC.ssaCola2027,
  ),
  2026: cite<YearFigures>(
    {
      taxableMax: 184500,
      quarterOfCoverage: 1890,
      retUnderFraAnnual: 24480,
      retUnderFraMonthly: 2040,
      retFraYearAnnual: 65160,
      retFraYearMonthly: 5430,
      sgaNonBlind: 1690,
      sgaBlind: 2830,
      trialWorkMonth: 1210,
      maxBenefitAtFra: 4152,
      avgRetiredWorkerAfterCola: 2071,
      avgCoupleAfterCola: 3208,
      ssiIndividual: 994,
      ssiCouple: 1491,
      piaBendPoints: [1286, 7749],
      familyMaxBendPoints: [1643, 2371, 3093],
    },
    "official",
    2026,
    SRC.ssaCola2026,
  ),
} as const;

/** Average benefits in January before/after the COLA (SSA fact sheets). */
export const AVG_BENEFITS = cite(
  [
    { type: "All retired workers", jan2026: 2071, jan2027Before: 2095, jan2027After: 2170 },
    { type: "Aged couple, both receiving benefits", jan2026: 3208, jan2027Before: 3238, jan2027After: 3355 },
    { type: "Widowed mother with two children", jan2026: 3898, jan2027Before: 3932, jan2027After: 4074 },
    { type: "Aged widow(er) alone", jan2026: 1919, jan2027Before: 1936, jan2027After: 2005 },
    { type: "Disabled worker, spouse and children", jan2026: 2937, jan2027Before: 2970, jan2027After: 3077 },
    { type: "All disabled workers", jan2026: 1630, jan2027Before: 1642, jan2027After: 1701 },
  ],
  "official",
  2027,
  SRC.ssaCola2027,
);

/** Maximum benefit for a worker retiring in January 2027 at selected ages (SSA OACT examplemax). */
export const MAX_BENEFIT_2027 = cite({ age62: 3094, age65: 3666, age66: 3883, age67: 4188, age70: 5358 }, "official", 2027, SRC.ssaMaxBenefit);

/** PIA and family-maximum bend points by year of first eligibility (age 62). */
export const BEND_POINTS: Record<number, { pia: [number, number]; fm: [number, number, number] }> = {
  2012: { pia: [767, 4624], fm: [980, 1415, 1845] },
  2013: { pia: [791, 4768], fm: [1011, 1459, 1903] },
  2014: { pia: [816, 4917], fm: [1042, 1505, 1962] },
  2015: { pia: [826, 4980], fm: [1056, 1524, 1987] },
  2016: { pia: [856, 5157], fm: [1093, 1578, 2058] },
  2017: { pia: [885, 5336], fm: [1131, 1633, 2130] },
  2018: { pia: [895, 5397], fm: [1144, 1651, 2154] },
  2019: { pia: [926, 5583], fm: [1184, 1708, 2228] },
  2020: { pia: [960, 5785], fm: [1226, 1770, 2309] },
  2021: { pia: [996, 6002], fm: [1272, 1837, 2395] },
  2022: { pia: [1024, 6172], fm: [1308, 1889, 2463] },
  2023: { pia: [1115, 6721], fm: [1425, 2056, 2682] },
  2024: { pia: [1174, 7078], fm: [1500, 2166, 2825] },
  2025: { pia: [1226, 7391], fm: [1567, 2262, 2950] },
  2026: { pia: [1286, 7749], fm: [1643, 2371, 3093] },
  2027: { pia: [1340, 8077], fm: [1712, 2471, 3223] },
};
export const BEND_POINTS_SOURCE = SRC.ssaBendPoints;

/** Earnings test history (annual exempt amounts), for "earnings limit by year" content. */
export const RET_HISTORY: Record<number, { under: number; fraYear: number }> = {
  2017: { under: 16920, fraYear: 44880 },
  2018: { under: 17040, fraYear: 45360 },
  2019: { under: 17640, fraYear: 46920 },
  2020: { under: 18240, fraYear: 48600 },
  2021: { under: 18960, fraYear: 50520 },
  2022: { under: 19560, fraYear: 51960 },
  2023: { under: 21240, fraYear: 56520 },
  2024: { under: 22320, fraYear: 59520 },
  2025: { under: 23400, fraYear: 62160 },
  2026: { under: 24480, fraYear: 65160 },
  2027: { under: 25560, fraYear: 67920 },
};

export const FAIRNESS_ACT = cite(
  "The Social Security Fairness Act (signed January 5, 2025) repealed the Windfall Elimination Provision (WEP) and Government Pension Offset (GPO) for benefits payable for January 2024 and later.",
  "official",
  "2024+",
  SRC.ssaFairness,
);

/** 2026 Trustees Report (intermediate assumptions). */
export const TRUST_FUNDS = cite(
  {
    reportDate: "2026-06-09",
    oasiDepletion: { year: 2032, quarter: 4, payablePct: 78 },
    oasdiDepletion: { year: 2034, quarter: 3, payablePct: 83 },
    oasiPayable2100: 62,
    oasdiPayable2100: 65,
    hiDepletion: { year: 2033, quarter: 2, payablePct: 89 },
    prior: { reportDate: "2025-06-18", oasiDepletion: { year: 2033, quarter: 1, payablePct: 77 }, oasdiDepletion: { year: 2034, quarter: 3, payablePct: 81 } },
  },
  "official",
  2026,
  SRC.ssaTrustees2026,
  "Projections, not law: Congress has always acted before a depletion date in the past, but nothing guarantees it.",
);

/** Real/nominal discount assumptions from the 2026 Trustees Report (for optional present-value math). */
export const TR_ECON = cite(
  { realRateNearTerm: 1.7, realRateUltimate: 2.3, cpiUltimate: 2.4, colaAssumptionAfter2027: 2.4 },
  "official",
  2026,
  SRC.ssaTrustees2026,
);

/** Early-claiming reduction and delayed credits (retirement benefit). */
export const CLAIMING_RULES = {
  earlyFirst36PerMonth: 5 / 9 / 100,
  earlyBeyond36PerMonth: 5 / 12 / 100,
  spousalFirst36PerMonth: 25 / 36 / 100,
  spousalBeyond36PerMonth: 5 / 12 / 100,
  drcPerMonth1943Plus: 2 / 3 / 100,
  source: SRC.ssaAgeReduction,
  drcSource: SRC.ssaDelayedCredits,
};
export * from "./ss-programs";
