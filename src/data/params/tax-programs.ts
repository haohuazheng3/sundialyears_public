// Contribution limits, HSA limits, early-distribution and withholding rules used by the planning and tax tools.
import { cite } from "./types";
import { SRC } from "./sources";

/** 2026 retirement plan limits (IRS Notice 2025-67). */
export const CONTRIB_2026 = cite(
  {
    deferral: 24500,
    catchUp50: 8000,
    catchUp60to63: 11250,
    ira: 7500,
    iraCatchUp: 1100,
    simple: 17000,
    annualAdditions: 72000,
    rothCatchUpWageThreshold: 150000,
  },
  "official",
  2026,
  SRC.irsNotice202567,
  "Catch-ups for anyone whose 2025 FICA wages from that employer exceeded $150,000 must go in as Roth starting in 2026.",
);

/** HSA contribution limits. */
export const HSA_LIMITS = {
  2026: cite({ self: 4400, family: 8750, catchUp55: 1000 }, "official", 2026, SRC.irsRevProc202519),
  2027: cite({ self: 4500, family: 9000, catchUp55: 1000 }, "official", 2027, SRC.irsRevProc202624),
} as const;

export const HSA_MEDICARE_RULES = cite(
  { partARetroMonths: 6 },
  "official",
  "all years",
  SRC.irsPub969,
  "Enrolling in any part of Medicare ends HSA eligibility from the first month of coverage; Part A taken after 65 is backdated up to 6 months (not before the month you turned 65).",
);

/** Additional 10% tax on early distributions (IRC §72(t)). */
export const EARLY_DIST = cite(
  { age: 59.5, rate: 0.1, simpleFirst2Years: 0.25, rule55Age: 55, publicSafetyAge: 50, emergencyMax: 1000 },
  "official",
  "2024+",
  SRC.irsEarlyDist,
);

/** Federal income tax withholding on retirement distributions. */
export const DIST_WITHHOLDING = cite(
  { eligibleRolloverMandatory: 0.2, iraDefault: 0.1 },
  "official",
  "all years",
  SRC.irsTopic413,
  "Employer-plan payouts you could roll over have 20% withheld; IRA withdrawals default to 10% unless you choose otherwise on Form W-4R.",
);

/** Qualifying surviving spouse (IRS Pub. 501). */
export const QSS_RULES = cite({ yearsAfterDeath: 2 }, "official", "all years", SRC.irsPub501, "For the 2 tax years after the year of death, if you have a dependent child and paid over half the cost of keeping up the home.");

/** Estimated-tax safe harbors (IRS Pub. 505). */
export const SAFE_HARBOR = cite({ currentYearShare: 0.9, priorYearShare: 1, priorYearShareHighAgi: 1.1, highAgi: 150000, owedUnder: 1000 }, "official", "all years", SRC.irsPub505);

/** Exceptions to the 10% additional tax (IRS "Exceptions to tax on early distributions"). plan = 401(k)-type plans, ira = IRAs. */
export const EARLY_EXCEPTIONS = cite(
  [
    { id: "sep55", label: "Left the employer in or after the year you turned 55 (Rule of 55)", plan: true, ira: false, limit: null as number | null },
    { id: "sep50", label: "Public safety employee who left in or after the year you turned 50", plan: true, ira: false, limit: null as number | null },
    { id: "disability", label: "Total and permanent disability", plan: true, ira: true, limit: null as number | null },
    { id: "terminal", label: "Terminal illness certified by a physician", plan: true, ira: true, limit: null as number | null },
    { id: "sepp", label: "Substantially equal periodic payments (72(t) / SEPP)", plan: true, ira: true, limit: null as number | null },
    { id: "medical", label: "Unreimbursed medical bills above 7.5% of AGI", plan: true, ira: true, limit: null as number | null },
    { id: "emergency", label: "Emergency personal expense (one per year)", plan: true, ira: true, limit: 1000 as number | null },
    { id: "birth", label: "Birth or adoption (per child)", plan: true, ira: true, limit: 5000 as number | null },
    { id: "abuse", label: "Domestic abuse victim (lesser of the limit or 50% of the account)", plan: true, ira: true, limit: 10000 as number | null },
    { id: "disaster", label: "Federally declared disaster loss", plan: true, ira: true, limit: 22000 as number | null },
    { id: "home", label: "First-time home purchase (lifetime)", plan: false, ira: true, limit: 10000 as number | null },
    { id: "education", label: "Qualified higher-education expenses", plan: false, ira: true, limit: null as number | null },
    { id: "insurance", label: "Health insurance premiums while unemployed", plan: false, ira: true, limit: null as number | null },
  ],
  "official",
  "2024+",
  SRC.irsEarlyDist,
);
