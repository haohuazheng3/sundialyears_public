import { cite, type Source } from "./types";
import { SRC } from "./sources";

/**
 * Extra parameters and sources for the retirement earnings test (RET) calculator.
 * The annual/monthly exempt amounts themselves live in SS_YEAR (social-security.ts) and are not repeated here.
 * Evidence: docs/research/ss_mechanics.json (rules "Retirement earnings test (RET): who and when", "RET excess earnings
 * computation", "RET: how SSA withholds", "RET: grace year / monthly earnings test", "Adjustment of the reduction factor"),
 * docs/research/verify_ssa_annual.json, and the POMS / eCFR / ssa.gov pages below (re-read 2026-10-23).
 */

export const RET_SRC = {
  pomsEt: {
    label: "SSA POMS RS 02501.021 — The Earnings Test (ET)",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302501021",
    publisher: "SSA",
  },
  pomsExcess: {
    label: "SSA POMS RS 02501.080 — Calculating Excess Earnings",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302501080",
    publisher: "SSA",
  },
  pomsCharging: {
    label: "SSA POMS RS 02501.095 — Charging Excess Earnings",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302501095",
    publisher: "SSA",
  },
  pomsSuspensions: {
    label: "SSA POMS RS 02501.100 — Imposing Work Suspensions (full-month withholding rule)",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302501100",
    publisher: "SSA",
  },
  pomsMet: {
    label: "SSA POMS RS 02501.030 — Applying the Monthly Earnings Test (MET)",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302501030",
    publisher: "SSA",
  },
  pomsSubstantial: {
    label: "SSA POMS RS 02505.065 — Meaning of Substantial Services in Self-Employment",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0302505065",
    publisher: "SSA",
  },
  pomsCrediting: {
    label: "SSA POMS RS 00615.482 — Adjustment of Reduction Factor (ARF): crediting months",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300615482",
    publisher: "SSA",
  },
  ecfrArf: {
    label: "20 CFR 404.412 — After my benefits are reduced for age, when and how will adjustments to that reduction be made?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-E/section-404.412",
    publisher: "eCFR",
  },
  ecfrWithdrawal: {
    label: "20 CFR 404.640 — Withdrawal of an application",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-404/subpart-G/section-404.640",
    publisher: "eCFR",
  },
  pomsDivorced: {
    label: "SSA POMS RS 00202.005 — Divorced spouse's benefits",
    url: "https://secure.ssa.gov/poms.nsf/lnx/0300202005",
    publisher: "SSA",
  },
} satisfies Record<string, Source>;

/**
 * Dollars of earnings above the exempt amount per $1 of benefits withheld.
 * ssa.gov/oact/cola/rtea.html: "We withhold $1 in benefits for every $2 of earnings in excess of the lower exempt amount.
 * We withhold $1 in benefits for every $3 of earnings in excess of the higher exempt amount."
 */
export const RET_RATIO = {
  /** Years before the calendar year you reach full retirement age. */
  underFra: cite(2, "official", "all", SRC.ssaRet, "$1 withheld for every $2 above the lower exempt amount."),
  /** The calendar year you reach full retirement age (earnings in months before the FRA month only). */
  fraYear: cite(3, "official", "all", SRC.ssaRet, "$1 withheld for every $3 above the higher exempt amount."),
} as const;

/**
 * Grace-year "substantial services" test for self-employment (POMS RS 02505.065 B.1):
 * more than 45 hours a month is substantial; 15–45 hours is substantial in a highly skilled occupation;
 * under 15 hours is never substantial.
 */
export const SUBSTANTIAL_SERVICES = cite(
  { generallyAboveHours: 45, neverBelowHours: 15 },
  "official",
  "all",
  RET_SRC.pomsSubstantial,
  "Where the time devoted to the business is less than 15 hours a month, the services are not substantial.",
);

/**
 * Withdrawing a retirement application (a one-time "do-over"): the request must be filed within 12 months of the first
 * month of entitlement, everything received must be repaid, and it can be done only once.
 * Evidence: docs/research/verify_ss_mechanics.json (missing_items) — 20 CFR 404.640(b)(4).
 */
export const WITHDRAWAL = cite(
  { windowMonths: 12 },
  "official",
  "all",
  RET_SRC.ecfrWithdrawal,
  "The request for withdrawal is filed within 12 months of the first month of entitlement",
);

/**
 * A divorced spouse is not withheld because of the ex-worker's earnings when the ex was entitled before the divorce or the
 * divorce has lasted at least 2 continuous years. Evidence: docs/research/ss_mechanics.json rule "Divorced spouse and
 * surviving divorced spouse rules" (POMS RS 00202.005) and RS 02501.095 B.1 ("except a qualifying divorced spouse").
 */
export const DIVORCED_SPOUSE_RET = cite({ divorceYears: 2 }, "official", "all", RET_SRC.pomsDivorced);

/** Agencies' own worked examples, reproduced by the engine tests and quoted on the page. */
export const RET_EXAMPLES = {
  /** ssa.gov "Receiving Benefits While Working" (2026): under FRA all year. */
  ssa2026UnderFra: cite(
    { year: 2026, monthlyBenefit: 800, earnings: 33400, overLimit: 8920, withheld: 4460, received: 5140 },
    "official",
    2026,
    SRC.ssaWhileWorking,
    "Your Social Security benefits would be reduced by $4,460 ($1 for every $2 you earned more than the limit).",
  ),
  /** ssa.gov "Receiving Benefits While Working" (2026): FRA reached in August 2026, $66,000 earned January–July. */
  ssa2026FraYear: cite(
    { year: 2026, fraMonth: 8, monthlyBenefit: 800, earningsBeforeFra: 66000, overLimit: 840, withheld: 280, receivedBeforeFra: 5320 },
    "official",
    2026,
    SRC.ssaWhileWorking,
    "Your Social Security benefits would be reduced through July by $280 ($1 for every $3 you earned more than the limit).",
  ),
  /**
   * POMS RS 02501.100 B.2: $562 benefit from January, excess earnings $2,880 → work suspensions January–May and a
   * partial benefit for June, but full-month suspension is applied through June (the partial amount is paid later).
   * (docs/research/ss_mechanics.json quotes this as $2,881 / June $491; POMS itself prints $2,880.)
   */
  pomsWholeMonth: cite({ monthlyBenefit: 562, excess: 2880, fullMonthsWithheld: 5 }, "official", "all", RET_SRC.pomsSuspensions),
  /** POMS RS 02501.095 B.2: worker $378 + spouse $160 + child $160 = $698 family benefit; excess $2,094 → January–March. */
  pomsFamily: cite({ worker: 378, auxiliaries: [160, 160], excess: 2094, monthsWithheld: 3 }, "official", "all", RET_SRC.pomsCharging),
  /** ARF illustration (docs/research/ss_mechanics.json): FRA 67, claimed at 62 (60 reduction months), 25 crediting months → 35 months. */
  arf: cite({ fraYears: 67, reductionMonthsAtClaim: 60, creditingMonths: 25, reductionMonthsAfter: 35 }, "official", "all", RET_SRC.ecfrArf),
} as const;
