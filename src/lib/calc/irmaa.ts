/**
 * Medicare IRMAA — the income-related monthly adjustment amounts added to Part B and Part D premiums.
 *
 * Rules implemented (all verified in docs/research/medicare.json + verify_medicare.json):
 * - Tier lookup — 42 U.S.C. §1395r(i)(3) (SSA Act §1839(i)), 20 CFR 418.1115, SSA POMS HI 01101.020:
 *   tiers 1–4 apply when MAGI is MORE THAN the lower bound and AT MOST the upper bound; the 80% tier when
 *   MAGI is more than the 4th bound and LESS THAN $500,000 ($750,000 joint); the 85% tier at $500,000 / $750,000 OR MORE.
 * - Married filing separately and lived with the spouse at any time in the tax year (§1395r(i)(3)(C)(ii)): every bound
 *   is reduced by the threshold, so MAGI ≤ threshold → none; > threshold and < ($500,000 − threshold) → 80% tier;
 *   ≥ ($500,000 − threshold) → 85% tier. MFS who lived apart the whole year use the individual table.
 * - Which year: the tax return two years before the premium year (§1395r(i)(4)(B); 20 CFR 418.1135).
 * - MAGI = adjusted gross income + tax-exempt interest (+ rare §§135/911/931/933 exclusions) (§1395r(i)(4)(A)).
 * - Part D IRMAA = base beneficiary premium × (applicable % − 25.5) / 25.5, nearest $0.10 (42 CFR 423.286(d)(4)(ii)).
 * - Threshold indexing (§1395r(i)(5)): statutory base amounts × CPI-U ratio, nearest $1,000; joint = 2 × individual.
 * - Life-changing events: 20 CFR 418.1205 (qualifying events) and 418.1215 (a "significant" reduction must lower the tier).
 *
 * MAGI is reported in whole dollars on a tax return, so "less than $500,000" means at most $499,999 here.
 * Dollar amounts come from IRMAA_SCHEDULES (CMS-published for 2026; projected for 2027) — never recomputed.
 */
import { IRMAA_SCHEDULES, IRMAA_2027_ALT_BOUNDS, IRMAA_PCT, type FilingGroup, type IrmaaSchedule } from "@/data/params/medicare";
import { IRMAA_FORMULA, IRMAA_INDEXING_RULE } from "@/data/params/irmaa-extra";
import type { Status } from "@/data/params/types";
import { money } from "@/lib/format";
import { roundToDime } from "./dates";

export type IrmaaYear = 2026 | 2027;
/** Premium years we have a schedule for, oldest first. */
export const IRMAA_YEARS = Object.keys(IRMAA_SCHEDULES)
  .map(Number)
  .sort((a, b) => a - b) as IrmaaYear[];

/**
 * Filing status on the tax return IRMAA looks at.
 * "single" also covers head of household and qualifying surviving spouse; "mfs" = married filing separately and lived
 * with the spouse at any time during that tax year; "mfsApart" = married filing separately, lived apart all year.
 */
export type IrmaaFiling = "single" | "mfj" | "mfs" | "mfsApart";
export type Tier = 0 | 1 | 2 | 3 | 4 | 5;
export type Bounds = readonly [number, number, number, number];

const cents = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/**
 * Nearest $0.10 — CMS premium rounding (42 CFR 408.27: "an odd multiple of 5 cents rounds up"). Re-exported from the
 * shared helper in ./dates: dividing by 0.1 in floating point turns $83.35 into 833.4999… and rounds it DOWN.
 */
export { roundToDime };

export function filingGroup(fs: IrmaaFiling): FilingGroup {
  return fs === "mfj" ? "joint" : fs === "mfs" ? "mfsLivedWithSpouse" : "individual";
}

/**
 * Filing status from a link (`?fs=`). Other calculators use the tax-return codes single|mfj|hoh|mfs|mfsApart|qss;
 * head of household and qualifying surviving spouse use the individual column (POMS HI 01101.020), so they map to
 * "single". Anything else is rejected (undefined) so the calculator keeps its default.
 */
export function parseFilingParam(raw: string): IrmaaFiling | undefined {
  if (raw === "single" || raw === "hoh" || raw === "qss") return "single";
  if (raw === "mfj" || raw === "mfs" || raw === "mfsApart") return raw;
  return undefined;
}

export function scheduleFor(year: number): IrmaaSchedule {
  const s = IRMAA_SCHEDULES[year];
  if (!s) throw new RangeError(`No IRMAA schedule for premium year ${year}`);
  return s;
}

/** Alternative 2027 bounds if CMS imputes the missing October 2025 CPI-U (tiers 2–4 land $1,000 lower). */
const ALT_BOUNDS: Record<number, { individual: Bounds; joint: Bounds } | undefined> = {
  2027: { individual: IRMAA_2027_ALT_BOUNDS.individualBounds, joint: IRMAA_2027_ALT_BOUNDS.jointBounds },
};
export const altBoundsFor = (year: number) => ALT_BOUNDS[year] ?? null;

export interface TierRow {
  tier: Tier;
  /** Applicable percentage of program cost (35–85), or null for the standard premium. */
  pct: number | null;
  /** Lower edge: MAGI must be MORE THAN `from` (or at least `from` when `fromInclusive`). null = no floor. */
  from: number | null;
  fromInclusive: boolean;
  /** Upper edge: MAGI must be AT MOST `to` (when `toInclusive`) or LESS THAN `to`. null = no ceiling. */
  to: number | null;
  toInclusive: boolean;
  /** Monthly add-ons per person and the resulting Part B premium. */
  partBAddOn: number;
  partDAddOn: number;
  partBTotal: number;
}

/** The sliding-scale table for one filing group, with exact boundary inclusivity (POMS HI 01101.020). */
export function tierRows(schedule: IrmaaSchedule, group: FilingGroup, override?: { individual: Bounds; joint: Bounds } | null): TierRow[] {
  const row = (tier: Tier, from: number | null, fromInclusive: boolean, to: number | null, toInclusive: boolean): TierRow => ({
    tier,
    pct: IRMAA_PCT[tier],
    from,
    fromInclusive,
    to,
    toInclusive,
    partBAddOn: schedule.partBAddOn[tier],
    partDAddOn: schedule.partDAddOn[tier],
    partBTotal: cents(schedule.standardPartB + schedule.partBAddOn[tier]),
  });
  if (group === "mfsLivedWithSpouse") {
    return [
      row(0, null, false, schedule.mfsThreshold, true),
      row(4, schedule.mfsThreshold, false, schedule.mfsTop, false),
      row(5, schedule.mfsTop, true, null, false),
    ];
  }
  const joint = group === "joint";
  const b: Bounds = joint ? (override?.joint ?? schedule.jointBounds) : (override?.individual ?? schedule.individualBounds);
  const top = joint ? schedule.topJoint : schedule.topIndividual;
  return [
    row(0, null, false, b[0], true),
    row(1, b[0], false, b[1], true),
    row(2, b[1], false, b[2], true),
    row(3, b[2], false, b[3], true),
    row(4, b[3], false, top, false),
    row(5, top, true, null, false),
  ];
}

export function inRow(magi: number, r: TierRow) {
  const aboveFloor = r.from == null || (r.fromInclusive ? magi >= r.from : magi > r.from);
  const belowCeiling = r.to == null || (r.toInclusive ? magi <= r.to : magi < r.to);
  return aboveFloor && belowCeiling;
}

const rowIndex = (rows: TierRow[], magi: number) => {
  const i = rows.findIndex((r) => inRow(magi, r));
  return i < 0 ? 0 : i;
};

/** IRMAA tier (0 = standard premium) for a MAGI. */
export function irmaaTier(magi: number, schedule: IrmaaSchedule, group: FilingGroup): Tier {
  const rows = tierRows(schedule, group);
  return rows[rowIndex(rows, safe(magi))].tier;
}

/** Plain-English MAGI range for a table row, e.g. "More than $109,000 up to $137,000". */
export function rangeLabel(r: TierRow) {
  if (r.from == null && r.to != null) return `${money(r.to)} or less`;
  if (r.to == null && r.from != null) return `${money(r.from)} or more`;
  if (r.from != null && r.to != null)
    return r.toInclusive ? `More than ${money(r.from)} up to ${money(r.to)}` : `More than ${money(r.from)} but less than ${money(r.to)}`;
  return "Any income";
}

export const tierName = (tier: Tier) => (tier === 0 ? "No IRMAA" : `Tier ${tier}`);

export interface IrmaaInput {
  /** Premium year (2026 or 2027). */
  year: number;
  filingStatus: IrmaaFiling;
  /** MAGI from the tax return two years before the premium year. */
  magi: number;
  /** Married filing jointly only: how many spouses are on Medicare (each pays IRMAA). Others: always 1. */
  people?: 1 | 2;
  /** Enrolled in Part D (stand-alone plan or a Medicare Advantage plan with drug coverage). Default true. */
  partD?: boolean;
}

export interface IrmaaResult {
  year: number;
  magiTaxYear: number;
  status: Status;
  boundsStatus: Status;
  group: FilingGroup;
  people: 1 | 2;
  partD: boolean;
  magi: number;
  tier: Tier;
  pct: number | null;
  row: TierRow;
  rows: TierRow[];
  standardPartB: number;
  /** Per person, per month. */
  monthly: { partB: number; partD: number; surcharge: number; partBTotal: number };
  /** Per year for everyone counted in `people`. */
  annual: { surcharge: number; perPersonSurcharge: number; partBTotal: number; standardPartB: number };
  /** The next tier up (null at the top). `headroom` = extra MAGI you can add and stay in this tier. */
  next: null | { tier: Tier; startsAt: number; headroom: number; annualSurcharge: number; extraPerYear: number };
  /** The tier below (null when already paying no IRMAA). `cut` = MAGI reduction needed to land in it. */
  lower: null | { tier: Tier; maxMagi: number; cut: number; annualSurcharge: number; savingsPerYear: number };
  /** Cut needed to pay no IRMAA at all (null when already none). */
  noIrmaa: null | { maxMagi: number; cut: number; savingsPerYear: number };
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

const annualFor = (r: TierRow, people: number, partD: boolean) => cents((r.partBAddOn + (partD ? r.partDAddOn : 0)) * 12 * people);

/** Highest whole-dollar MAGI that still falls in a row (rows with an open ceiling have none). */
const maxIn = (r: TierRow) => (r.to == null ? Infinity : r.toInclusive ? r.to : r.to - 1);

export function computeIrmaa(input: IrmaaInput): IrmaaResult {
  const schedule = scheduleFor(input.year);
  const group = filingGroup(input.filingStatus);
  const people: 1 | 2 = group === "joint" && input.people === 2 ? 2 : 1;
  const partD = input.partD !== false;
  const magi = safe(input.magi);
  const rows = tierRows(schedule, group);
  const i = rowIndex(rows, magi);
  const row = rows[i];
  const annual = annualFor(row, people, partD);

  let next: IrmaaResult["next"] = null;
  if (i < rows.length - 1) {
    const n = rows[i + 1];
    const startsAt = maxIn(row) + 1;
    const nAnnual = annualFor(n, people, partD);
    next = { tier: n.tier, startsAt, headroom: Math.max(0, maxIn(row) - magi), annualSurcharge: nAnnual, extraPerYear: cents(nAnnual - annual) };
  }
  let lower: IrmaaResult["lower"] = null;
  let noIrmaa: IrmaaResult["noIrmaa"] = null;
  if (i > 0) {
    const p = rows[i - 1];
    const pAnnual = annualFor(p, people, partD);
    lower = { tier: p.tier, maxMagi: maxIn(p), cut: magi - maxIn(p), annualSurcharge: pAnnual, savingsPerYear: cents(annual - pAnnual) };
    noIrmaa = { maxMagi: maxIn(rows[0]), cut: magi - maxIn(rows[0]), savingsPerYear: annual };
  }

  const partDMonthly = partD ? row.partDAddOn : 0;
  return {
    year: input.year,
    magiTaxYear: schedule.magiTaxYear,
    status: schedule.status,
    boundsStatus: schedule.boundsStatus,
    group,
    people,
    partD,
    magi,
    tier: row.tier,
    pct: row.pct,
    row,
    rows,
    standardPartB: schedule.standardPartB,
    monthly: { partB: row.partBAddOn, partD: partDMonthly, surcharge: cents(row.partBAddOn + partDMonthly), partBTotal: row.partBTotal },
    annual: {
      surcharge: annual,
      perPersonSurcharge: cents(annual / people),
      partBTotal: cents(row.partBTotal * 12 * people),
      standardPartB: cents(schedule.standardPartB * 12 * people),
    },
    next,
    lower,
    noIrmaa,
  };
}

export interface ProjectionRisk {
  /** The projected bracket line closest to the MAGI. */
  line: number;
  /** Where that line lands under the alternative CPI method, or null when both methods agree on it. */
  altLine: number | null;
  /** Dollars between the MAGI and the nearer of the two lines (0 when the MAGI sits between them). */
  distance: number;
  /** How close counts as "near": the largest gap between the two methods' lines ($1,000 for 2027). */
  window: number;
  tier: Tier;
  tierIfAlt: Tier;
  /** Extra yearly IRMAA if the alternative bounds turn out to be the official ones (≥ 0). */
  extraPerYearIfAlt: number;
}

/**
 * For a premium year whose thresholds are still projected (2027): is this MAGI within reach of a projected bracket line?
 * Only lines CMS has not yet fixed count — the $500,000/$750,000 top line is set by statute until 2028.
 * Where the two methods disagree, the alternative line is the LOWER one, so a MAGI already above both candidate lines
 * is in the higher tier whichever way CMS goes: that line is not a risk for it and is skipped (it used to be flagged
 * with "little room" although the reader was already over it).
 */
export function projectionRisk(input: IrmaaInput): ProjectionRisk | null {
  const schedule = scheduleFor(input.year);
  if (schedule.boundsStatus !== "projected") return null;
  const group = filingGroup(input.filingStatus);
  const alt = altBoundsFor(input.year);
  const base = computeIrmaa(input);
  const rows = base.rows;
  const altRows = tierRows(schedule, group, alt);
  // The individual lines can move $1,000 and the joint lines $2,000; MFS lines don't move but are still projected.
  const window = alt
    ? group === "joint"
      ? Math.max(...schedule.jointBounds.map((b, k) => Math.abs(b - alt.joint[k])))
      : Math.max(...schedule.individualBounds.map((b, k) => Math.abs(b - alt.individual[k])))
    : 0;

  const magi = base.magi;
  let best: { line: number; altLine: number; distance: number } | null = null;
  for (let k = 0; k < rows.length - 1; k++) {
    const line = rows[k].to;
    const altLine = altRows[k].to;
    if (line == null || altLine == null) continue;
    const statutoryTop = group !== "mfsLivedWithSpouse" && rows[k + 1].tier === 5;
    if (statutoryTop) continue;
    const lo = Math.min(line, altLine);
    const hi = Math.max(line, altLine);
    if (altLine !== line && magi > hi) continue;
    const distance = magi >= lo && magi <= hi ? 0 : Math.min(Math.abs(magi - lo), Math.abs(magi - hi));
    if (!best || distance < best.distance) best = { line, altLine, distance };
  }
  const altRow = altRows[rowIndex(altRows, magi)];
  const tierIfAlt = altRow.tier;
  if (!best || (best.distance > window && tierIfAlt === base.tier)) return null;
  return {
    line: best.line,
    altLine: best.altLine === best.line ? null : best.altLine,
    distance: best.distance,
    window,
    tier: base.tier,
    tierIfAlt,
    extraPerYearIfAlt: cents(annualFor(altRow, base.people, base.partD) - base.annual.surcharge),
  };
}

/** Yearly surcharge at evenly spaced MAGI points (for the cliff chart). */
export function surchargeCurve(input: Omit<IrmaaInput, "magi">, from: number, step: number, count: number) {
  const schedule = scheduleFor(input.year);
  const group = filingGroup(input.filingStatus);
  const people = group === "joint" && input.people === 2 ? 2 : 1;
  const partD = input.partD !== false;
  const rows = tierRows(schedule, group);
  return Array.from({ length: count }, (_, k) => {
    const x = from + k * step;
    return { x, y: annualFor(rows[rowIndex(rows, x)], people, partD) };
  });
}

/**
 * The yearly surcharge as an exact step function between `from` and `to`: two points per tier (its first and last
 * whole-dollar MAGI), so a line chart draws each cliff as a $1-wide vertical jump at the real bracket edge.
 */
export function surchargeSteps(input: Omit<IrmaaInput, "magi">, from: number, to: number) {
  const schedule = scheduleFor(input.year);
  const group = filingGroup(input.filingStatus);
  const people = group === "joint" && input.people === 2 ? 2 : 1;
  const partD = input.partD !== false;
  const pts: { x: number; y: number; tier: Tier }[] = [];
  for (const r of tierRows(schedule, group)) {
    const first = r.from == null ? -Infinity : r.fromInclusive ? r.from : r.from + 1;
    const lo = Math.max(from, first);
    const hi = Math.min(to, maxIn(r));
    if (lo > hi) continue;
    const y = annualFor(r, people, partD);
    pts.push({ x: lo, y, tier: r.tier });
    if (hi > lo) pts.push({ x: hi, y, tier: r.tier });
  }
  return pts;
}

export interface IncomeParts {
  wages?: number;
  pensions?: number;
  /** Taxable IRA / 401(k) withdrawals including RMDs (not QCDs, which are excluded from income). */
  iraWithdrawals?: number;
  rothConversions?: number;
  taxableSocialSecurity?: number;
  taxableInterest?: number;
  taxExemptInterest?: number;
  dividends?: number;
  /** Net capital gain, or the (already limited) net loss shown on the return as a negative number. */
  capitalGains?: number;
  otherIncome?: number;
  /** Adjustments to income (Schedule 1), which lower AGI. */
  adjustments?: number;
}

/**
 * MAGI for IRMAA (42 U.S.C. §1395r(i)(4)(A)): AGI plus tax-exempt interest. The rarely used add-backs for
 * §135 savings-bond interest, §911 foreign earned income and §931/§933 territory income are not modelled.
 */
export function magiFromIncome(p: IncomeParts) {
  const v = (n?: number) => safe(n ?? 0);
  const agi =
    v(p.wages) +
    v(p.pensions) +
    v(p.iraWithdrawals) +
    v(p.rothConversions) +
    v(p.taxableSocialSecurity) +
    v(p.taxableInterest) +
    v(p.dividends) +
    v(p.capitalGains) +
    v(p.otherIncome) -
    v(p.adjustments);
  return { agi: cents(agi), taxExemptInterest: cents(v(p.taxExemptInterest)), magi: cents(agi + v(p.taxExemptInterest)) };
}

/**
 * Life-changing event check (Form SSA-44). The drop counts as "significant" only if the newer year's MAGI puts you in a
 * lower tier or below the threshold (20 CFR 418.1215). Whether the event itself qualifies is listed in 20 CFR 418.1205.
 * `isDrop` is false when the newer MAGI is not below the one Medicare used: there is nothing to ask for, and the
 * newer year can even put you in a HIGHER tier.
 *
 * Marriage, divorce and a spouse's death change the filing status, and SSA then applies the table for the NEWER
 * year's status (Form SSA-44 Step 3 asks for that year's filing status; 20 CFR 418.1115 sets the table by filing
 * status, and below the top tier the single lines are half the joint ones). Pass `newerFiling` for those: the
 * comparison is then per person (the household changed), and a widow whose joint income was in tier 1 can land in a
 * higher tier on a single return even though her MAGI fell.
 * `targetMagi` = the most the newer MAGI can be (under the newer status) and still lower the tier; null if no tier is lower.
 */
export function lifeChangingEventEffect(input: IrmaaInput, newerMagi: number, newerFiling: IrmaaFiling = input.filingStatus) {
  const now = computeIrmaa(input);
  const statusChanged = newerFiling !== input.filingStatus;
  const after = computeIrmaa({ ...input, filingStatus: newerFiling, magi: newerMagi, people: statusChanged ? 1 : input.people });
  const before = statusChanged ? now.annual.perPersonSurcharge : now.annual.surcharge;
  const target = [...after.rows].reverse().find((r) => r.tier < now.tier);
  return {
    currentTier: now.tier,
    newTier: after.tier,
    statusChanged,
    /** True when the comparison is for one person (the filing status changed). */
    perPerson: statusChanged,
    isDrop: after.magi < now.magi,
    significant: after.tier < now.tier,
    newAnnualSurcharge: after.annual.surcharge,
    savingsPerYear: cents(Math.max(0, before - after.annual.surcharge)),
    targetMagi: target ? maxIn(target) : null,
  };
}

/**
 * 42 CFR 423.286(d)(4)(ii): Part D IRMAA = base beneficiary premium × (applicable % − 25.5) / 25.5, nearest $0.10.
 * Used to check the published tables; the calculator itself uses the CMS amounts in IRMAA_SCHEDULES.
 */
export function partDIrmaaFromBase(baseBeneficiaryPremium: number, applicablePct: number) {
  const base = IRMAA_FORMULA.partDBasePct.value;
  return roundToDime((baseBeneficiaryPremium * (applicablePct - base)) / base);
}

/**
 * Threshold indexing (42 U.S.C. §1395r(i)(5)): statutory base amounts × (average CPI-U for the 12 months ending August
 * of the prior year ÷ average for Sep 2017–Aug 2018), rounded to the nearest $1,000. Joint = 2 × the rounded individual
 * amounts; the MFS 85% line = $500,000 − the first threshold.
 */
export function indexThresholds(baseAmounts: readonly number[], windowAvgCpi: number, baseAvgCpi: number, topIndividual: number) {
  const { roundTo, jointMultiple } = IRMAA_INDEXING_RULE.value;
  const factor = windowAvgCpi / baseAvgCpi;
  const unrounded = baseAmounts.map((b) => b * factor);
  const individual = unrounded.map((u) => Math.floor(u / roundTo + 0.5) * roundTo);
  return { factor, unrounded, individual, joint: individual.map((x) => x * jointMultiple), mfsTop: topIndividual - individual[0] };
}
