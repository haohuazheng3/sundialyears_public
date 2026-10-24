/**
 * How much of a person's Social Security is taxable — IRS Publication 915, Worksheet 1, line by line.
 *
 * Rule: IRC §86 (unchanged by P.L. 119-21 — CRS R48613). Thresholds §86(c) are fixed dollars, never indexed:
 * base amount $25,000 / $32,000 MFJ / $0 MFS-lived-with-spouse; adjusted base $34,000 / $44,000 / $0.
 * Provisional ("combined") income = ½ of net benefits + all other income (§86 modified AGI) + tax-exempt interest.
 *   Tier 1 (§86(a)(1)): 50% of the excess over the base amount, capped at ½ of benefits and ½ of (adjusted − base).
 *   Tier 2 (§86(a)(2)): + 85% of the excess over the adjusted base amount.
 *   Cap: never more than 85% of benefits.
 * MFS who lived with their spouse at any time in the year: skip lines 9–16, taxable = min(85% × line 8, 85% × benefits).
 * The worksheet has no rounding steps.
 *
 * Not modelled (the IRS sends you to other worksheets): lump-sum retroactive benefit election (Pub 915 Worksheets 2–4,
 * IRC §86(e)), traditional-IRA contributions when covered by a workplace plan (Pub 590-A Appendix B), repayments larger
 * than benefits, and nonresident aliens (flat 30% on 85% of benefits).
 */
import { SS_TAX_THRESHOLDS, type FilingStatus } from "@/data/params/tax";
import { SS_INCLUSION } from "@/data/params/ss-tax-extra";

export type { FilingStatus };

export interface Worksheet1Input {
  filingStatus: FilingStatus;
  /** Line 1 — net benefits: box 5 of every SSA-1099 / RRB-1099 (both spouses on a joint return), before Medicare premiums are taken out. */
  benefits: number;
  /** Line 3 — taxable income other than Social Security: Form 1040 lines 1z, 2b, 3b, 4b, 5b, 7a and 8 (wages, interest, dividends, IRA, pensions, capital gains, other). */
  otherIncome: number;
  /** Line 4 — tax-exempt interest (Form 1040 line 2a). */
  taxExemptInterest?: number;
  /** Line 5 — excluded adoption benefits, foreign earned income/housing, American Samoa / Puerto Rico income. */
  exclusions?: number;
  /** Line 7 — Schedule 1 lines 11–20, 23 and 25 (every adjustment except student-loan interest). */
  adjustments?: number;
}

/** Worksheet line values; `null` means the worksheet skipped or stopped before that line. */
export type Worksheet1Lines = Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19, number | null>;

export type SsTaxZone = "none" | "fifty" | "eightyFive";

export interface TaxableSsResult {
  lines: Worksheet1Lines;
  /** Line 8: provisional (combined) income after adjustments. 0 when line 7 ≥ line 6. */
  provisionalIncome: number;
  /** Base / adjusted base amounts used (line 9 and line 9 + line 11). */
  base: number;
  adjustedBase: number;
  /** Line 19 — taxable benefits (goes on Form 1040 line 6b). */
  taxable: number;
  /** taxable ÷ benefits (0 when benefits ≤ 0). */
  taxablePct: number;
  /** Which part of the formula the provisional income falls in. */
  zone: SsTaxZone;
  /** "half": tier-1 limited to ½ of benefits (line 15 = line 2); "max85": the 85%-of-benefits cap bound (line 18 < line 17). */
  capHit: "half" | "max85" | null;
  /** Worksheet line at which the IRS says "STOP — none of your benefits are taxable", if any. */
  stoppedAt: 8 | 10 | null;
  /** MFS and lived with the spouse at some point in the year: base amounts are $0. */
  mfsLivedWithSpouse: boolean;
}

const nn = (x: number | undefined | null) => (x != null && Number.isFinite(x) ? x : 0);

/** Base amount (Worksheet 1 line 9) and adjusted base amount for a filing status — IRC §86(c). */
export function ssThresholds(fs: FilingStatus): { base: number; adjustedBase: number; band: number } {
  const t = SS_TAX_THRESHOLDS.value;
  const base = t.base[fs];
  const adjustedBase = t.adjusted[fs];
  return { base, adjustedBase, band: adjustedBase - base };
}

/** Pub 915 Worksheet 1 ("Figuring Your Taxable Benefits"), exactly as printed. */
export function taxableSocialSecurity(input: Worksheet1Input): TaxableSsResult {
  const { tier1, tier2, maxFraction } = SS_INCLUSION.value;
  const fs = input.filingStatus;
  const mfsLivedWithSpouse = fs === "mfs";
  const { base, adjustedBase, band } = ssThresholds(fs);
  const lines: Worksheet1Lines = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null, 13: null, 14: null, 15: null, 16: null, 17: null, 18: null, 19: null };

  const l1 = nn(input.benefits);
  lines[1] = l1;
  const empty = { base, adjustedBase, mfsLivedWithSpouse, taxablePct: 0, zone: "none" as const, capHit: null };
  if (l1 <= 0) {
    // Repayments ≥ gross benefits: none taxable (Pub 915 "Repayments More Than Gross Benefits"); worksheet not used.
    lines[19] = 0;
    return { ...empty, lines, provisionalIncome: 0, taxable: 0, stoppedAt: null };
  }
  const l2 = l1 * tier1;
  const l3 = nn(input.otherIncome);
  const l4 = nn(input.taxExemptInterest);
  const l5 = nn(input.exclusions);
  const l6 = l2 + l3 + l4 + l5;
  const l7 = nn(input.adjustments);
  Object.assign(lines, { 2: l2, 3: l3, 4: l4, 5: l5, 6: l6, 7: l7 });

  // Line 8: "Is the amount on line 7 less than the amount on line 6? No → STOP. None of your benefits are taxable."
  if (!(l7 < l6)) {
    lines[19] = 0;
    return { ...empty, lines, provisionalIncome: 0, taxable: 0, stoppedAt: 8 };
  }
  const l8 = l6 - l7;
  lines[8] = l8;
  const l18 = l1 * maxFraction;

  if (mfsLivedWithSpouse) {
    // "skip lines 9 through 16; multiply line 8 by 85% (0.85) and enter the result on line 17."
    const l17 = l8 * tier2;
    const l19 = Math.min(l17, l18);
    Object.assign(lines, { 17: l17, 18: l18, 19: l19 });
    return {
      lines,
      provisionalIncome: l8,
      base,
      adjustedBase,
      taxable: l19,
      taxablePct: l19 / l1,
      zone: "eightyFive",
      capHit: l18 < l17 ? "max85" : null,
      stoppedAt: null,
      mfsLivedWithSpouse,
    };
  }

  const l9 = base;
  lines[9] = l9;
  // Line 10: "Is the amount on line 9 less than the amount on line 8? No → STOP. None of your benefits are taxable."
  if (!(l9 < l8)) {
    lines[19] = 0;
    return { ...empty, lines, provisionalIncome: l8, taxable: 0, stoppedAt: 10 };
  }
  const l10 = l8 - l9;
  const l11 = band;
  const l12 = Math.max(0, l10 - l11);
  const l13 = Math.min(l10, l11);
  const l14 = l13 * tier1;
  const l15 = Math.min(l2, l14);
  const l16 = l12 > 0 ? l12 * tier2 : 0;
  const l17 = l15 + l16;
  const l19 = Math.min(l17, l18);
  Object.assign(lines, { 10: l10, 11: l11, 12: l12, 13: l13, 14: l14, 15: l15, 16: l16, 17: l17, 18: l18, 19: l19 });

  return {
    lines,
    provisionalIncome: l8,
    base,
    adjustedBase,
    taxable: l19,
    taxablePct: l19 / l1,
    zone: l12 > 0 ? "eightyFive" : "fifty",
    capHit: l18 < l17 ? "max85" : l15 === l2 && l2 < l14 ? "half" : null,
    stoppedAt: null,
    mfsLivedWithSpouse,
  };
}

/**
 * Head-room: how many more dollars of other income (worksheet line 3 — e.g. IRA withdrawals) fit before provisional
 * income reaches the base amount (benefits start to be taxed) and the adjusted base amount (the 85% tier starts).
 * Each extra $1 on line 3 adds exactly $1 to line 8. `null` = already past that threshold (or no benefits).
 */
export function incomeRoom(r: TaxableSsResult): { toBase: number | null; toAdjusted: number | null } {
  const l6 = r.lines[6];
  const l7 = r.lines[7];
  if (l6 == null || l7 == null) return { toBase: null, toAdjusted: null };
  const pi = l6 - l7;
  return {
    toBase: pi <= r.base ? r.base - pi : null,
    toAdjusted: pi <= r.adjustedBase ? r.adjustedBase - pi : null,
  };
}

/** Short human descriptions of each Worksheet 1 line (for "show the math"); rates come from SS_INCLUSION. */
export function worksheet1Labels(): Record<keyof Worksheet1Lines, string> {
  const { tier1, tier2, maxFraction } = SS_INCLUSION.value;
  const p = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return {
    1: "Social Security benefits (box 5 of your SSA-1099s)",
    2: `${p(tier1)} of line 1`,
    3: "All other taxable income (wages, IRA, pensions, interest, dividends, gains)",
    4: "Tax-exempt interest",
    5: "Excluded foreign / adoption / territory income",
    6: "Add lines 2, 3, 4 and 5",
    7: "Adjustments to income (Schedule 1)",
    8: "Provisional income (line 6 − line 7)",
    9: "Base amount for your filing status",
    10: "Line 8 − line 9",
    11: "Adjusted base amount − base amount",
    12: "Line 10 − line 11 (not below zero)",
    13: "Smaller of line 10 or line 11",
    14: `${p(tier1)} of line 13`,
    15: "Smaller of line 2 or line 14",
    16: `${p(tier2)} of line 12`,
    17: "Line 15 + line 16",
    18: `${p(maxFraction)} of line 1 (the most that can ever be taxable)`,
    19: "Taxable benefits — smaller of line 17 or line 18",
  };
}
