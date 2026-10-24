/**
 * State taxes on retirement income, 2026 — all 50 states + DC.
 *
 * Facts: docs/research/states_{a,b,c,d}.json + adversarial verification docs/research/verify_states_{a,b,c,d}.json.
 * The verdict for each state is DERIVED here from the structured facts by the documented rule below — it is never
 * typed by hand, so changing a fact can change the label and a test guards the rule.
 */
import { STATES_A } from "./data-a";
import { STATES_B } from "./data-b";
import { STATES_C } from "./data-c";
import { STATES_D } from "./data-d";
import { NEIGHBORS } from "./neighbors";
import { VERDICT_ORDER, type ReliefLevel, type StateCode, type StateTax, type StateTaxInput, type Verdict, type VerdictLabel } from "./types";

export * from "./types";
export { NEIGHBORS, TILE_GRID, TILE_ROWS, TILE_COLS } from "./neighbors";

/** Top marginal rate (percent) under which a state counts as "low-rate" in the verdict rule. */
export const LOW_RATE = 5;
/** Top marginal rate (percent) at or above which a state counts as "high-rate" in the verdict rule. */
export const HIGH_RATE = 9;
/** Per-person exclusion (pension + IRA) that counts as a "large" retirement-income break (see ReliefLevel). */
export const LARGE_RELIEF_MIN = 20_000;
/** A large break that vanishes entirely at or below this income (joint) counts as only "moderate" for the verdict. */
export const INCOME_CLIFF_MAX = 150_000;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Plain-English names for the three groups of relief levels the verdict rule uses. */
export const RELIEF_TERMS: { term: string; meaning: string }[] = [
  {
    term: "Large break",
    meaning: `All pension and IRA income is exempt, or at least ${usd(LARGE_RELIEF_MIN)} per person of it, or most employer pensions in full — and the break doesn’t vanish at ${usd(INCOME_CLIFF_MAX)} of income or less.`,
  },
  {
    term: "Partial break",
    meaning: `A smaller per-person exclusion, one that covers only some kinds of retirement income (such as government pensions), or a large one with an income cliff.`,
  },
  { term: "Little or no break", meaning: "Only narrow carve-outs (specific pension plans, token credits, very low incomes) or nothing at all." },
];

/**
 * The verdict rule, in plain English (rendered in the hub's methodology section — mirrors deriveVerdict exactly).
 * "Social Security untaxed" includes states that exempt it for everyone 65 or older.
 */
export const VERDICT_RULES: { label: VerdictLabel; rule: string }[] = [
  { label: "Tax-free retirement income", rule: "No broad income tax, so Social Security, pensions and IRA withdrawals are not taxed." },
  { label: "Very friendly", rule: "Social Security is untaxed and there is a large break for pension and IRA income." },
  {
    label: "Friendly",
    rule: `Social Security is untaxed with a partial break, or with little or no break but a top rate under ${LOW_RATE}%; or Social Security is taxed only above income or age limits but there is a large break.`,
  },
  {
    label: "Mixed",
    rule: `Social Security is untaxed but there is little or no break and the top rate is ${LOW_RATE}% to under ${HIGH_RATE}%; or Social Security is taxed above limits with a partial break, or with little or no break and a top rate under ${LOW_RATE}%; or Social Security is taxed in full but there is a large break.`,
  },
  {
    label: "Less friendly",
    rule: `Little or no break and a top rate of ${HIGH_RATE}% or more; or Social Security taxed above limits with little or no break and a top rate of ${LOW_RATE}% or more; or Social Security taxed in full without a large break.`,
  },
];

/** A large exclusion that disappears at a modest income counts as "moderate" for the verdict. */
export function effectiveRelief(s: Pick<StateTaxInput, "relief">): ReliefLevel {
  const { level, incomeLimited } = s.relief;
  if (incomeLimited && (level === "all" || level === "large")) return "moderate";
  return level;
}

const RELIEF_PHRASE: Record<ReliefLevel, string> = {
  all: "all pension and IRA income is exempt",
  large: "a large retirement-income break applies",
  moderate: "a partial retirement-income break applies",
  small: "only a small retirement-income break applies",
  narrow: "retirement income gets only narrow breaks",
  none: "there is no general retirement-income break",
};

/** Derives the verdict from the facts. See VERDICT_RULES. */
export function deriveVerdict(s: StateTaxInput): Verdict {
  if (!s.hasBroadIncomeTax) {
    return { label: "Tax-free retirement income", reason: "There is no broad income tax, so retirement income isn’t taxed by the state." };
  }
  const ss = s.socialSecurity;
  const ssFree = ss.taxed === "no" || ss.exemptAt65 === true;
  const relief = effectiveRelief(s);
  const strong = relief === "all" || relief === "large";
  const some = relief === "moderate" || relief === "small";
  const top = s.rates.topRate;
  const capped = s.relief.incomeLimited && (s.relief.level === "all" || s.relief.level === "large") ? " (but it ends at higher incomes)" : "";
  const ssPhrase =
    ss.taxed === "no"
      ? "Social Security isn’t taxed"
      : ss.exemptAt65
        ? "Social Security isn’t taxed at 65 or older"
        : ss.taxed === "partially"
          ? "Social Security is taxed above income or age limits"
          : "Social Security is taxed as on the federal return";
  const reason = (label: VerdictLabel, withRate = false): Verdict => ({
    label,
    reason: withRate
      ? `${ssPhrase}, ${RELIEF_PHRASE[relief]}${capped}, and the top rate is ${top}%.`
      : `${ssPhrase} and ${RELIEF_PHRASE[relief]}${capped}.`,
  });

  if (ssFree) {
    if (strong) return reason("Very friendly");
    if (some) return reason("Friendly");
    if (top < LOW_RATE) return reason("Friendly", true);
    if (top < HIGH_RATE) return reason("Mixed", true);
    return reason("Less friendly", true);
  }
  if (ss.taxed === "partially") {
    if (strong) return reason("Friendly");
    if (some) return reason("Mixed");
    return top < LOW_RATE ? reason("Mixed", true) : reason("Less friendly", true);
  }
  return strong ? reason("Mixed") : reason("Less friendly");
}

const INPUT: StateTaxInput[] = [...STATES_A, ...STATES_B, ...STATES_C, ...STATES_D];

/** All 50 states + DC, alphabetical by name, each with its derived verdict. */
export const STATES: StateTax[] = INPUT.map((s) => ({ ...s, verdict: deriveVerdict(s) })).sort((a, b) => a.name.localeCompare(b.name));

const BY_SLUG = new Map(STATES.map((s) => [s.slug, s]));
const BY_CODE = new Map(STATES.map((s) => [s.code, s]));

export const stateBySlug = (slug: string): StateTax | undefined => BY_SLUG.get(slug);
export const stateByCode = (code: StateCode): StateTax => BY_CODE.get(code)!;

/** Name as used mid-sentence ("DC" for the District of Columbia). */
export const nameOf = (s: Pick<StateTaxInput, "name" | "short">) => s.short ?? s.name;

/** Bordering states (geography only), alphabetical. */
export function neighbors(code: StateCode): StateTax[] {
  return NEIGHBORS[code].map(stateByCode).sort((a, b) => a.name.localeCompare(b.name));
}

/** States with a big retirement-income break (all or ≥$20,000 per person), income-tax states only. */
export const hasBigExclusion = (s: StateTaxInput) => s.hasBroadIncomeTax && (s.relief.level === "all" || s.relief.level === "large");

/** Headline counts for the hub. Computed — never typed. */
export const SUMMARY = (() => {
  const taxSocialSecurity = STATES.filter((s) => s.socialSecurity.taxed !== "no");
  const noBroadIncomeTax = STATES.filter((s) => !s.hasBroadIncomeTax);
  const exemptAllRetirement = STATES.filter((s) => s.hasBroadIncomeTax && s.relief.level === "all");
  const bigExclusion = STATES.filter(hasBigExclusion);
  const byVerdict = Object.fromEntries(VERDICT_ORDER.map((v) => [v, STATES.filter((s) => s.verdict.label === v)])) as Record<VerdictLabel, StateTax[]>;
  return {
    total: STATES.length,
    taxSocialSecurity,
    /** Taxed only above age/income limits. */
    taxSocialSecurityPartly: taxSocialSecurity.filter((s) => s.socialSecurity.taxed === "partially"),
    /** Taxed the same way as the federal return. */
    taxSocialSecurityFully: taxSocialSecurity.filter((s) => s.socialSecurity.taxed === "yes"),
    dontTaxSocialSecurity: STATES.filter((s) => s.socialSecurity.taxed === "no"),
    noBroadIncomeTax,
    exemptAllRetirement,
    bigExclusion,
    byVerdict,
    highConfidence: STATES.filter((s) => s.confidence === "high").length,
    lastVerified: STATES[0].lastVerified,
  };
})();
