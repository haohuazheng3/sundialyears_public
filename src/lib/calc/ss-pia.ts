/**
 * Primary insurance amount (PIA): the monthly benefit at full retirement age.
 *
 * Rules implemented (sources in src/data/params/ss-claiming-extra.ts → CLAIM_SRC):
 * - 20 CFR 404.211 (AIME): each year's earnings are capped at that year's contribution and benefit base, wage-indexed to
 *   the year you reach 60 (AWI(E-2) / AWI(year), rounded to the nearest cent; years at or after 60 count at face value),
 *   the highest N computation years are summed (N = elapsed years − 5, normally 35, minimum 2) and divided by 12·N,
 *   rounded DOWN to the whole dollar. Elapsed years run from the later of 1951 or the year you reach 22 through the year
 *   before you reach 62; earnings before 22 and after 61 may still rank in the top N (computation base years /
 *   automatic recomputation).
 * - ssa.gov/oact/COLA/piaformula.html: PIA = 90% / 32% / 15% of AIME across the bend points of the ELIGIBILITY year
 *   (the year you reach 62), rounded DOWN to $0.10.
 * - 20 CFR 404.212 + Social Security Act §215(i): every COLA effective in December of the eligibility year or later
 *   raises the PIA (rounded down to $0.10 each time), whether or not benefits have been claimed.
 *
 * `estimatePiaFromSalary` is a deliberately simple, Quick-Calculator-style estimate (ssa.gov/oact/quickcalc): it
 * assumes your pay moved in step with the national average wage index every year from age 22 to today, and stays flat
 * (in today's dollars) until you stop working. It is an ESTIMATE — your real earnings record on my Social Security is
 * always better.
 */
import { AWI, AWI_LATEST_YEAR } from "@/data/generated/awi";
import { TAXABLE_MAX } from "@/data/generated/taxable-max";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { BEND_POINTS, TR_ECON } from "@/data/params/social-security";
import { AIME_RULES, ELIGIBILITY_AGE, PIA_FORMULA } from "@/data/params/ss-claiming-extra";
import { attainmentBase, roundDownToDime, type YMD } from "./dates";

const RULES = AIME_RULES.value;
const F = PIA_FORMULA.value;
const TAXABLE_MAX_LATEST_YEAR = Math.max(...Object.keys(TAXABLE_MAX).map(Number));
const BEND_YEARS = Object.keys(BEND_POINTS).map(Number);
/** Earliest / latest eligibility years whose bend points are in src/data/params (2012 … 2027). */
export const FIRST_BEND_YEAR = Math.min(...BEND_YEARS);
export const LATEST_BEND_YEAR = Math.max(...BEND_YEARS);

/** Year you reach 62 (SSA attainment: the day before the birthday), i.e. the year of first eligibility. */
export function eligibilityYear(dob: YMD): number {
  return attainmentBase(dob).year + ELIGIBILITY_AGE.value;
}

/** PIA from AIME with the given bend points, rounded down to the dime. */
export function piaFromAime(aime: number, bend: readonly [number, number]): number {
  const [b1, b2] = bend;
  const a = Math.max(0, Math.floor(aime));
  const raw = F.first * Math.min(a, b1) + F.second * Math.max(0, Math.min(a, b2) - b1) + F.third * Math.max(0, a - b2);
  return roundDownToDime(raw);
}

/** Contribution and benefit base for a year (future years: the latest published base). */
export function taxableMaxFor(year: number): number {
  return TAXABLE_MAX[Math.min(year, TAXABLE_MAX_LATEST_YEAR)] ?? 0;
}

export interface PiaYear {
  year: number;
  earnings: number;
  capped: number;
  /** AWI(indexing year) / AWI(year), or 1 for years at/after the indexing year. */
  indexFactor: number;
  indexed: number;
  used: boolean;
}

export interface PiaFromEarningsResult {
  eligibilityYear: number;
  indexingYear: number;
  bendYear: number;
  bendPoints: [number, number];
  elapsedYears: number;
  computationYears: number;
  aime: number;
  /** PIA at eligibility, before any COLA. */
  pia: number;
  years: PiaYear[];
}

/**
 * AIME and PIA from an earnings record (20 CFR 404.211–404.212).
 * `indexingYear` / `bendYear` may be overridden (the salary estimator uses the latest published AWI and bend points
 * for people who are not yet 60 — i.e. a PIA in today's wage level, like the SSA Statement does).
 */
export function piaFromEarnings(opts: { dob: YMD; earnings: Record<number, number>; indexingYear?: number; bendYear?: number }): PiaFromEarningsResult {
  const E = eligibilityYear(opts.dob);
  const indexingYear = opts.indexingYear ?? E - RULES.indexToYearsBeforeEligibility;
  const bendYear = opts.bendYear ?? E;
  const bp = BEND_POINTS[bendYear];
  if (!bp) throw new Error(`No PIA bend points for eligibility year ${bendYear}`);
  const awiI = AWI[indexingYear];
  if (!awiI) throw new Error(`No average wage index for ${indexingYear}`);

  const age22Year = attainmentBase(opts.dob).year + RULES.elapsedFromAge;
  const elapsedYears = Math.max(0, E - Math.max(RULES.firstElapsedYear, age22Year));
  const computationYears = Math.max(RULES.minimumComputationYears, elapsedYears - RULES.dropoutYears);

  const years: PiaYear[] = Object.keys(opts.earnings)
    .map(Number)
    .filter((y) => y >= RULES.firstElapsedYear)
    .sort((a, b) => a - b)
    .map((year) => {
      const earnings = Math.max(0, opts.earnings[year] || 0);
      const capped = Math.min(earnings, taxableMaxFor(year));
      const indexFactor = year < indexingYear && AWI[year] ? awiI / AWI[year] : 1;
      // 404.211(d)(3): "We round the results to the nearer penny."
      const indexed = Math.round(capped * indexFactor * 100) / 100;
      return { year, earnings, capped, indexFactor, indexed, used: false };
    });

  const ranked = [...years].sort((a, b) => b.indexed - a.indexed || a.year - b.year).slice(0, computationYears);
  for (const r of ranked) r.used = true;
  // Indexed earnings are whole cents: add them up in integer cents and divide exactly, so the AIME is truly rounded DOWN
  // (rounding the quotient to cents first would turn e.g. $1,234.996 into $1,235).
  const totalCents = ranked.reduce((s, r) => s + Math.round(r.indexed * 100), 0);
  const aime = Math.floor(totalCents / (1200 * computationYears));
  return { eligibilityYear: E, indexingYear, bendYear, bendPoints: [bp.pia[0], bp.pia[1]], elapsedYears, computationYears, aime, pia: piaFromAime(aime, bp.pia), years };
}

/**
 * Apply the COLAs effective in December of `fromYear` … `throughYear` (inclusive), each rounded down to $0.10.
 * Uses the official COLA series (keyed by the December the COLA took effect).
 */
export function applyColas(pia: number, fromYear: number, throughYear: number): { pia: number; applied: { year: number; pct: number }[] } {
  let p = pia;
  const applied: { year: number; pct: number }[] = [];
  for (let y = fromYear; y <= throughYear; y++) {
    const pct = COLA_BY_EFFECTIVE_YEAR[y];
    if (pct == null) throw new Error(`No official COLA for December ${y}`);
    p = roundDownToDime(p * (1 + pct / 100));
    applied.push({ year: y, pct });
  }
  return { pia: p, applied };
}

/**
 * Last December whose COLA is already reflected in a benefit statement read during `asOf`'s year: the COLA effective for
 * December of year Y is first paid in January of Y+1, so a statement read in year X shows COLAs through December X−1.
 * (The claiming engine applies the COLAs for December X onward — see ss-claiming.ts `piaGrowthRate`.)
 */
export function lastColaYearInEffect(asOf: YMD): number {
  return asOf.year - 1;
}

/** Latest December with a published COLA in src/data/generated/cola-history.ts. */
export const LATEST_OFFICIAL_COLA_YEAR = Math.max(...Object.keys(COLA_BY_EFFECTIVE_YEAR).map(Number));

/**
 * Like `applyColas`, but never fails on a December whose COLA is not in the data yet: the official figure is used where
 * published and `assumedPct` (e.g. the Trustees' intermediate assumption) after that, flagged `assumed: true`.
 */
export function applyColasOrAssume(pia: number, fromYear: number, throughYear: number, assumedPct: number): { pia: number; applied: { year: number; pct: number; assumed: boolean }[] } {
  let p = pia;
  const applied: { year: number; pct: number; assumed: boolean }[] = [];
  for (let y = fromYear; y <= throughYear; y++) {
    const official = COLA_BY_EFFECTIVE_YEAR[y];
    const pct = official ?? assumedPct;
    p = roundDownToDime(p * (1 + pct / 100));
    applied.push({ year: y, pct, assumed: official == null });
  }
  return { pia: p, applied };
}

export interface SalaryEstimateInput {
  dob: YMD;
  /** Annual pay: today's pay if still working, otherwise the pay in your last full year of work. */
  salary: number;
  /** Age at which you stopped (or will stop) working. Work years run from 22 through the year before this age. */
  stopAge: number;
  /** "Today" — the month the estimate is made. */
  asOf: YMD;
  /** COLA (%) assumed for any December before today whose official COLA is not in the data yet (default: Trustees' 2.4%). */
  assumedColaPct?: number;
}

export interface SalaryEstimate extends PiaFromEarningsResult {
  /** PIA in the same terms as a my Social Security statement read today (COLAs through last December applied). */
  piaToday: number;
  colasApplied: { year: number; pct: number; assumed: boolean }[];
  /** True when the person is under 60, so the latest wage index and bend points stand in for future ones. */
  todaysWageLevel: boolean;
  firstWorkYear: number;
  lastWorkYear: number;
}

/**
 * Quick-Calculator-style PIA estimate from one salary figure.
 * Past earnings: salary × AWI(year) / AWI(anchor year) — i.e. pay that kept pace with the national average wage.
 * Future earnings (still working): the same salary every year (today's dollars), like the SSA Statement assumes.
 * Returns null when the eligibility year is outside the bend-point table (born before 1950).
 */
export function estimatePiaFromSalary(input: SalaryEstimateInput): SalaryEstimate | null {
  const { dob, asOf } = input;
  const salary = Math.max(0, input.salary || 0);
  const E = eligibilityYear(dob);
  if (E < FIRST_BEND_YEAR) return null;
  const base = attainmentBase(dob).year;
  const firstWorkYear = base + RULES.elapsedFromAge;
  const lastWorkYear = base + Math.round(input.stopAge) - 1;
  const anchorYear = Math.min(asOf.year, lastWorkYear);
  const awiAnchorYear = Math.min(anchorYear, AWI_LATEST_YEAR);
  const earnings: Record<number, number> = {};
  for (let y = firstWorkYear; y <= lastWorkYear; y++) {
    if (y <= anchorYear && y <= AWI_LATEST_YEAR && AWI[y]) earnings[y] = (salary * AWI[y]) / AWI[awiAnchorYear];
    else earnings[y] = salary; // the anchor year itself (when AWI isn't published yet) and every future year
  }
  const todaysWageLevel = E - RULES.indexToYearsBeforeEligibility > AWI_LATEST_YEAR;
  const indexingYear = Math.min(E - RULES.indexToYearsBeforeEligibility, AWI_LATEST_YEAR);
  const bendYear = Math.min(E, LATEST_BEND_YEAR, AWI_LATEST_YEAR + RULES.indexToYearsBeforeEligibility);
  const r = piaFromEarnings({ dob, earnings, indexingYear, bendYear });
  const through = lastColaYearInEffect(asOf);
  const assumed = input.assumedColaPct ?? TR_ECON.value.colaAssumptionAfter2027;
  const { pia: piaToday, applied } = E <= through ? applyColasOrAssume(r.pia, E, through, assumed) : { pia: r.pia, applied: [] };
  return { ...r, piaToday, colasApplied: applied, todaysWageLevel, firstWorkYear, lastWorkYear };
}
