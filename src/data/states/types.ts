/**
 * State taxes on retirement income — data model.
 *
 * Every fact comes from docs/research/states_{a,b,c,d}.json and was checked against
 * docs/research/verify_states_{a,b,c,d}.json (where the verifier marked an item "wrong" or "stale" we use its
 * corrected value; "unverifiable" items are omitted or worded cautiously and listed in `notes`).
 * Text fields are plain English, written for readers 55–80. Numbers live here, never in components.
 */

export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export type StateCode = (typeof STATE_CODES)[number];

/** How a kind of income is treated: not taxed, partly taxed (exclusion, cap, age or income test), or taxed. */
export type Taxed = "no" | "partially" | "yes";

export type VerdictLabel = "Tax-free retirement income" | "Very friendly" | "Friendly" | "Mixed" | "Less friendly";

/** Best to worst. */
export const VERDICT_ORDER: VerdictLabel[] = ["Tax-free retirement income", "Very friendly", "Friendly", "Mixed", "Less friendly"];
/** Least to most taxed. */
export const TAXED_ORDER: Taxed[] = ["no", "partially", "yes"];

/**
 * How much pension + IRA/401(k) income a retiree at the usual retirement age can shield from state income tax.
 * Definitions (applied by hand to each state; see VERDICT_RULES in ./index.ts for how they feed the verdict):
 * - all:      every common kind of retirement income (pensions, IRA and 401(k) withdrawals) is exempt.
 * - large:    at least $20,000 per person of pension AND IRA/401(k) income can be excluded, or all employer
 *             pensions (public and private) are fully exempt (e.g. all defined-benefit or employer-funded plans).
 * - moderate: $10,000–$19,999 per person covering pensions and IRAs, or a big break limited to some kinds of
 *             retirement income (e.g. only government pensions, or pensions but not IRAs).
 * - small:    under $10,000 per person, available to most retirees.
 * - narrow:   only specific pension types (e.g. pre-1989 government service), token credits, or very low incomes.
 * - none:     no retirement-income exclusion (military pay aside).
 */
export type ReliefLevel = "all" | "large" | "moderate" | "small" | "narrow" | "none";

export type Confidence = "high" | "medium";

export interface StateSource {
  label: string;
  url: string;
}

/** One income tax bracket. `over` = taxable income above which `rate` applies; `rate` is a percent (5.75 = 5.75%). */
export interface Bracket {
  /** Single filers. `null` when the bracket does not exist for single filers (New Jersey's 2.45% band). */
  over: number | null;
  /** Married filing jointly. Equal to `over` when the state uses one table for everyone. */
  overJoint: number;
  rate: number;
}

export interface StateFaq {
  q: string;
  a: string;
}

export interface StateTaxInput {
  code: StateCode;
  name: string;
  /** Name as used mid-sentence ("DC" for the District of Columbia). */
  short?: string;
  slug: string;
  taxYear: 2026;
  /** Plain-English note on which year's rules and forms the facts come from. */
  taxYearNote: string;
  hasBroadIncomeTax: boolean;
  socialSecurity: {
    taxed: Taxed;
    /** Taxing states only: true when every retiree 65 or older owes no state tax on benefits (CO, MO). */
    exemptAt65?: boolean;
    /** Taxing states only: who actually pays, for the "which states tax Social Security" list. */
    whoPays?: string;
    /** One plain-English sentence. */
    summary: string;
    /** Exact rules: thresholds, ages, phase-outs. */
    detail: string;
  };
  pensions: { taxed: Taxed; summary: string; detail: string; publicVsPrivate?: string };
  iraAnd401k: { taxed: Taxed; summary: string; detail: string };
  military: { taxed: Taxed; summary: string };
  /** Size of the retirement-income break (drives the verdict and the "big exclusions" filter). */
  relief: {
    level: ReliefLevel;
    /** True when the big break disappears entirely at $150,000 of income (joint) or less. */
    incomeLimited?: boolean;
    /** One sentence describing the break. */
    headline: string;
  };
  rates: {
    type: "none" | "flat" | "graduated";
    /** Top marginal state rate in percent (0 when there is no income tax). */
    topRate: number;
    flatRate?: number;
    /** Only when verified for 2026. */
    brackets?: Bracket[];
    bracketsNote?: string;
    summary: string;
  };
  deductions: string;
  seniorBreaks: string;
  /** Enacted or scheduled 2025–2028 changes. */
  changes: string;
  /** 3–5 concrete bullets a retiree cares about. */
  highlights: string[];
  /** States with no broad income tax: one line for the hub's no-income-tax list. */
  noTaxNote?: string;
  /** 140–160 characters. */
  metaDescription: string;
  /** Extra state-specific FAQs (the page adds generated ones). */
  faqExtra?: StateFaq[];
  sources: StateSource[];
  confidence: Confidence;
  lastVerified: "2026-10-23";
  /** Items we could not verify and therefore omitted or softened. */
  notes?: string[];
}

export interface Verdict {
  label: VerdictLabel;
  /** Which rule produced the label, in plain English. */
  reason: string;
}

export interface StateTax extends StateTaxInput {
  verdict: Verdict;
}
