/**
 * COLA math for the "Your new check" calculator and the COLA history chart. Pure and deterministic.
 *
 * Rules (with primary sources):
 * - COLA determination — Social Security Act §215(i) (42 U.S.C. 415(i)); SSA OACT latestCOLA.html:
 *   average the CPI-W for July–September (rounded to 0.001), compare with the same average for the last year a COLA took
 *   effect, round the increase to the nearest 0.1%. No increase, or a rounded increase of zero → no COLA.
 * - Applying it — SSA OACT colaapplic.html; Social Security Act §215(a)(1)(A), §215(g): the COLA raises the PIA and the
 *   benefit is recomputed, truncated to the next lower dime. Deductions (such as the Medicare Part B premium) come off next,
 *   and the payment is truncated to the next lower dollar.
 * - Part B hold-harmless — Social Security Act §1839(f) (42 U.S.C. 1395r(f)); Federal Register 2025-20251: if Part B was
 *   deducted from your November and December benefits and you don't pay IRMAA, the new premium is cut so that your net
 *   check never goes down. It never applies to IRMAA payers.
 * - SSI — Social Security Act §1617 (42 U.S.C. 1382f); 20 CFR 416.405; SSA OACT SSI.html: last year's UNROUNDED annual
 *   amount × (1 + COLA), then ÷ 12 rounded down to the dollar.
 */
import { roundDownToDime, roundDownToDollar, roundToCents, roundToDime } from "@/lib/calc/dates";

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Average of three monthly CPI-W values, rounded to 0.001 (SSA convention). */
export function q3Average(months: readonly number[]): number {
  if (months.length !== 3) throw new Error("Need exactly three monthly CPI-W values (July, August, September).");
  return round3((months[0] + months[1] + months[2]) / 3);
}

export interface ColaDetermination {
  avgNew: number;
  avgBase: number;
  /** Percentage increase before rounding (e.g. 3.6187). */
  unrounded: number;
  /** The COLA in percent, rounded to the nearest tenth; 0 when there is no increase. */
  cola: number;
}

/** COLA from the July–September CPI-W of this year vs. the base year (the last year a COLA took effect). */
export function colaFromCpiw(newMonths: readonly number[], baseMonths: readonly number[]): ColaDetermination {
  const avgNew = q3Average(newMonths);
  const avgBase = q3Average(baseMonths);
  const unrounded = ((avgNew - avgBase) / avgBase) * 100;
  // Snap away binary floating-point noise (0.04999999… → 0.05) before rounding to the nearest tenth.
  const rounded = Math.round(Math.round(unrounded * 1e6) / 1e5) / 10;
  return { avgNew, avgBase, unrounded, cola: rounded > 0 ? rounded : 0 };
}

/** Benefit (or PIA) after a COLA, truncated to the next lower dime. */
export function applyCola(monthly: number, colaPct: number): number {
  return roundDownToDime(Math.max(0, monthly) * (1 + colaPct / 100));
}

/** The deposit: benefit minus deductions, truncated to the next lower dollar (never below zero). */
export function netPayment(benefit: number, deductions: number): number {
  return Math.max(0, roundDownToDollar(roundToCents(benefit - deductions)));
}

/** SSI federal benefit rate for next year from this year's unrounded annual amount. */
export function ssiNextYear(unroundedAnnual: number, colaPct: number): { unroundedAnnual: number; monthly: number } {
  const next = roundToCents(unroundedAnnual * (1 + colaPct / 100));
  return { unroundedAnnual: next, monthly: Math.floor(next / 12) };
}

/**
 * Part B premium under the hold-harmless rule: the new standard premium, reduced (if needed) so that the net benefit after
 * the COLA is not less than before. Never more than the new standard premium; never less than this year's premium.
 */
export function holdHarmlessPremium(premiumNow: number, premiumNextStandard: number, benefitNow: number, benefitNext: number): number {
  const allowed = premiumNow + Math.max(0, benefitNext - benefitNow);
  return roundToDime(Math.min(premiumNextStandard, Math.max(premiumNow, allowed)));
}

/**
 * Smallest benefit whose COLA dollars cover the whole premium increase (below it, hold-harmless would bite).
 * Careful: protection also requires the premium to be DEDUCTED from the check (§1839(f)), so for someone paying the full
 * standard premium this break-even only matters if it is above that premium. Use `minColaOnDeductedPremium` to check.
 */
export function holdHarmlessBreakEven(premiumNow: number, premiumNext: number, colaPct: number): number {
  if (colaPct <= 0) return Infinity;
  return Math.max(0, premiumNext - premiumNow) / (colaPct / 100);
}

/**
 * The smallest COLA, in dollars, that anyone paying `premiumNow` out of their check can get: their benefit is at least the
 * premium (or it couldn't be deducted), so the raise is at least the COLA on a benefit equal to the premium.
 * If this exceeds the premium increase, nobody paying `premiumNow` is held harmless (Social Security Act §1839(f)).
 */
export function minColaOnDeductedPremium(premiumNow: number, colaPct: number): number {
  const smallest = roundToDime(Math.max(0, premiumNow)); // benefits are whole dimes; premiums too
  return roundToCents(applyCola(smallest, colaPct) - smallest);
}

/** What comes out of the check for Medicare in the current year. */
export type PremiumSituation = "none" | "std" | "hh" | "i1" | "i2" | "i3" | "i4" | "i5";
export const PREMIUM_SITUATIONS: readonly PremiumSituation[] = ["none", "std", "hh", "i1", "i2", "i3", "i4", "i5"];

export const irmaaTierOf = (s: PremiumSituation): number => (s.startsWith("i") ? Number(s.slice(1)) : 0);

export interface MedicareRates {
  partBNow: number;
  partBNext: number;
  /** Part B IRMAA add-on by tier (index 0–5). */
  irmaaBNow: readonly number[];
  irmaaBNext: readonly number[];
  /** Part D IRMAA add-on by tier (index 0–5). */
  irmaaDNow: readonly number[];
  irmaaDNext: readonly number[];
}

export interface ColaCheckInput {
  /** Current monthly benefit BEFORE anything is deducted (the "benefit" line on the COLA notice). */
  benefit: number;
  colaPct: number;
  situation: PremiumSituation;
  /** Only for situation "hh": the reduced Part B premium you pay now. */
  heldHarmlessPremiumNow?: number;
  /** IRMAA payers: Part D IRMAA is also withheld from the check. */
  partDIrmaa: boolean;
  rates: MedicareRates;
}

export interface ColaCheckResult {
  benefitNow: number;
  benefitNext: number;
  colaDollars: number;
  partBNow: number;
  partBNext: number;
  partDNow: number;
  partDNext: number;
  deductionsNow: number;
  deductionsNext: number;
  /** How much more Medicare takes next year. */
  medicareIncrease: number;
  netNow: number;
  netNext: number;
  netRaise: number;
  netRaiseYear: number;
  /** True when the hold-harmless rule capped next year's Part B premium below the standard amount. */
  heldHarmless: boolean;
  /** True when the Medicare deductions are larger than the benefit (they can't all come out of the check). */
  deductionsExceedBenefit: boolean;
  irmaaTier: number;
}

/** "Your new check": next year's gross benefit, Medicare deductions and the deposit, SSA rounding throughout. */
export function colaCheck(input: ColaCheckInput): ColaCheckResult {
  const { rates } = input;
  const benefitNow = roundDownToDime(Math.max(0, input.benefit));
  const benefitNext = applyCola(benefitNow, input.colaPct);
  const colaDollars = roundToCents(benefitNext - benefitNow);
  const tier = irmaaTierOf(input.situation);

  let partBNow = 0;
  let partBNext = 0;
  let partDNow = 0;
  let partDNext = 0;
  let heldHarmless = false;

  if (input.situation === "std" || input.situation === "hh") {
    partBNow = input.situation === "hh" ? roundToDime(Math.min(Math.max(0, input.heldHarmlessPremiumNow ?? rates.partBNow), rates.partBNow)) : rates.partBNow;
    // Protection requires the premium to actually be deducted from the check, so the benefit must cover it.
    const protectedNow = partBNow <= benefitNow;
    partBNext = protectedNow ? holdHarmlessPremium(partBNow, rates.partBNext, benefitNow, benefitNext) : rates.partBNext;
    heldHarmless = partBNext < rates.partBNext;
  } else if (tier > 0) {
    partBNow = roundToCents(rates.partBNow + rates.irmaaBNow[tier]);
    partBNext = roundToCents(rates.partBNext + rates.irmaaBNext[tier]);
    if (input.partDIrmaa) {
      partDNow = rates.irmaaDNow[tier];
      partDNext = rates.irmaaDNext[tier];
    }
  }

  const deductionsNow = roundToCents(partBNow + partDNow);
  const deductionsNext = roundToCents(partBNext + partDNext);
  const netNow = netPayment(benefitNow, deductionsNow);
  const netNext = netPayment(benefitNext, deductionsNext);
  return {
    benefitNow,
    benefitNext,
    colaDollars,
    partBNow,
    partBNext,
    partDNow,
    partDNext,
    deductionsNow,
    deductionsNext,
    medicareIncrease: roundToCents(deductionsNext - deductionsNow),
    netNow,
    netNext,
    netRaise: netNext - netNow,
    netRaiseYear: (netNext - netNow) * 12,
    heldHarmless,
    deductionsExceedBenefit: deductionsNow > benefitNow || deductionsNext > benefitNext,
    irmaaTier: tier,
  };
}

/* ------------------------------------------------------------------ history */

export interface ColaRow {
  /** SSA's key: the year the COLA took effect (December from 1983 on; June 1975–1982). */
  effectiveYear: number;
  effectiveMonth: "June" | "December";
  /** Year the raise first showed up in checks (July of the same year for June COLAs, January of the next year otherwise). */
  paidYear: number;
  paidMonth: "July" | "January";
  pct: number;
}

/** Last year SSA's COLAs took effect in June (the 1983 Amendments moved them to December from 1983). */
const LAST_JUNE_COLA = 1982;

/** Turns SSA's COLA table (keyed by effective year) into rows with both conventions. `fixes` patch missing years. */
export function colaHistory(byEffectiveYear: Record<number, number>, fixes: Record<number, number> = {}): ColaRow[] {
  const merged: Record<number, number> = { ...byEffectiveYear, ...fixes };
  return Object.keys(merged)
    .map(Number)
    .sort((a, b) => a - b)
    .map((y) => {
      const june = y <= LAST_JUNE_COLA;
      return {
        effectiveYear: y,
        effectiveMonth: june ? "June" : "December",
        paidYear: june ? y : y + 1,
        paidMonth: june ? "July" : "January",
        pct: merged[y],
      } satisfies ColaRow;
    });
}

/** Simple average of the last `n` COLAs (zero years included), in percent. */
export function averageOfLast(rows: ColaRow[], n: number): number {
  const last = rows.slice(-n);
  if (!last.length) return 0;
  return last.reduce((s, r) => s + r.pct, 0) / last.length;
}

/** Compound growth of a benefit over the last `n` COLAs (e.g. 0.40 = +40%). */
export function compoundOfLast(rows: ColaRow[], n: number): number {
  return rows.slice(-n).reduce((f, r) => f * (1 + r.pct / 100), 1) - 1;
}

/** The most recent earlier COLA that was larger than the latest one (or undefined). */
export function lastLargerThanLatest(rows: ColaRow[]): ColaRow | undefined {
  const latest = rows[rows.length - 1];
  if (!latest) return undefined;
  for (let i = rows.length - 2; i >= 0; i--) if (rows[i].pct > latest.pct) return rows[i];
  return undefined;
}

/** Number of years with no COLA at all. */
export function zeroColaYears(rows: ColaRow[]): ColaRow[] {
  return rows.filter((r) => r.pct === 0);
}
