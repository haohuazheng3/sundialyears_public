// Social Security program rules used by the spousal, survivor, divorced, credits, WEP/GPO, SSI and apply-date tools.
import { cite } from "./types";
import { SRC } from "./sources";

/** Earnings needed for one quarter of coverage (one work credit), by year (SSA OACT series). */
export const QC_HISTORY = cite<Record<number, number>>(
  {
    1978: 250, 1979: 260, 1980: 290, 1981: 310, 1982: 340, 1983: 370, 1984: 390, 1985: 410, 1986: 440, 1987: 460,
    1988: 470, 1989: 500, 1990: 520, 1991: 540, 1992: 570, 1993: 590, 1994: 620, 1995: 630, 1996: 640, 1997: 670,
    1998: 700, 1999: 740, 2000: 780, 2001: 830, 2002: 870, 2003: 890, 2004: 900, 2005: 920, 2006: 970, 2007: 1000,
    2008: 1050, 2009: 1090, 2010: 1120, 2011: 1120, 2012: 1130, 2013: 1160, 2014: 1200, 2015: 1220, 2016: 1260, 2017: 1300,
    2018: 1320, 2019: 1360, 2020: 1410, 2021: 1470, 2022: 1510, 2023: 1640, 2024: 1730, 2025: 1810, 2026: 1890, 2027: 1970,
  },
  "official",
  "1978–2027",
  SRC.ssaQc,
);

export const CREDIT_RULES = cite(
  { maxPerYear: 4, retirement: 40, partAFree: 40, partAReduced: 30 },
  "official",
  "all years",
  SRC.ssaCredits,
  "40 credits (quarters) for retirement benefits and premium-free Part A; 30–39 quarters cut the Part A premium.",
);

/** Spousal benefit (SSA "Benefits for spouses"). */
export const SPOUSAL_RULES = cite(
  { maxShare: 0.5, minAge: 62, marriedYears: 1, deemedFilingBornFrom: "1954-01-02" },
  "official",
  "all years",
  SRC.ssaSpouse,
  "Up to 50% of the worker's full-retirement-age benefit; reduced if taken early; no delayed credits on the spousal portion.",
);

/** Divorced-spouse benefit conditions. */
export const DIVORCED_RULES = cite(
  { marriageYears: 10, independentAfterYears: 2, minAge: 62, survivorRemarryAge: 60 },
  "official",
  "all years",
  SRC.ssaSpouse,
);

/** Survivor benefit (SSA "Survivors benefits"); survivors have their own full-retirement-age schedule. */
export const SURVIVOR_RULES = cite(
  {
    minAge: 60,
    minAgeDisabled: 50,
    shareAt60: 0.715,
    ribLimShare: 0.825,
    remarryAge: 60,
    lumpSum: 255,
    /** Survivor full retirement age by birth year, in months past 66 (1956 or earlier: 0; 1962 or later: 12). */
    fraExtraMonths: { 1956: 0, 1957: 2, 1958: 4, 1959: 6, 1960: 8, 1961: 10, 1962: 12 } as Record<number, number>,
  },
  "official",
  "all years",
  SRC.ssaSurvivor,
  "A widow(er) gets 71.5% of the late worker's benefit at 60, rising to 100% at survivor full retirement age; if the worker claimed early, the survivor gets at least 82.5% of the worker's PIA (the widow's limit).",
);

/** WEP first-factor percentage by years of substantial earnings (applied until the Social Security Fairness Act). */
export const WEP_FIRST_FACTOR = cite<Record<number, number>>(
  { 20: 0.4, 21: 0.45, 22: 0.5, 23: 0.55, 24: 0.6, 25: 0.65, 26: 0.7, 27: 0.75, 28: 0.8, 29: 0.85, 30: 0.9 },
  "official",
  "before 2024",
  SRC.ssaPomsWep,
  "20 or fewer years of substantial earnings → 40%; 30 or more → 90% (no reduction). The reduction could never exceed half of the non-covered pension.",
);

export const GPO_RULES = cite({ offsetShare: 2 / 3 }, "official", "before 2024", SRC.ssaPomsGpo, "Two-thirds of a non-covered government pension was subtracted from spouse or widow(er) benefits.");

export const FAIRNESS_ACT_DATES = cite(
  { signed: "2025-01-05", effectiveFrom: "2024-01", firstHigherCheck: "April 2025" },
  "official",
  "2024+",
  SRC.ssaFairness,
);

/** SSI income rules. */
export const SSI_RULES = cite(
  { generalExclusion: 20, earnedExclusion: 65, earnedCountedShare: 0.5, resourceIndividual: 2000, resourceCouple: 3000 },
  "official",
  "all years",
  SRC.ssaSsiExclusions,
  "The first $20 of most income is not counted; Social Security above that reduces SSI dollar for dollar. A couple gets one $20 exclusion.",
);

/** When you can apply and when you are paid. */
export const APPLY_RULES = cite(
  { monthsInAdvance: 4, minFilingAge: "61 years and 9 months" },
  "official",
  "all years",
  SRC.ssaFirstPayment,
  "Benefits are paid the month after the month they are for. You must be 62 for the whole month; people born on the 1st or 2nd count as 62 that month.",
);

/** First PIA bend point by year of eligibility, 1990–2011 (later years are in BEND_POINTS). Used for the WEP-repeal estimate. */
export const FIRST_BEND_1990_2011 = cite<Record<number, number>>(
  {
    1990: 356, 1991: 370, 1992: 387, 1993: 401, 1994: 422, 1995: 426, 1996: 437, 1997: 455, 1998: 477, 1999: 505, 2000: 531,
    2001: 561, 2002: 592, 2003: 606, 2004: 612, 2005: 627, 2006: 656, 2007: 680, 2008: 711, 2009: 744, 2010: 761, 2011: 749,
  },
  "official",
  "1990–2011",
  SRC.ssaBendPoints,
);
