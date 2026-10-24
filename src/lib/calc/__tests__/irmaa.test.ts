import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeIrmaa,
  irmaaTier,
  tierRows,
  scheduleFor,
  projectionRisk,
  surchargeCurve,
  surchargeSteps,
  magiFromIncome,
  lifeChangingEventEffect,
  partDIrmaaFromBase,
  indexThresholds,
  parseFilingParam,
  rangeLabel,
  roundToDime,
  type IrmaaFiling,
  type TierRow,
} from "../irmaa";
import { IRMAA_2026, IRMAA_2027_ALT_BOUNDS, IRMAA_2027_INDEXING, IRMAA_PCT, PART_D, PENALTIES, type FilingGroup } from "@/data/params/medicare";
import {
  CPI_WINDOW_2027,
  IRMAA_2027_SCENARIO_B,
  IRMAA_IMMUNO_2026,
  IRMAA_THRESHOLD_HISTORY,
} from "@/data/params/irmaa-extra";
import { CMS_2027_EXPECTED, filingAfterEvent, oneDollarOver, rmdCalculatorHref } from "@/components/calculators/irmaa/irmaa-content";
import { LIFE_CHANGING_EVENTS } from "@/data/params/medicare";

const tier = (year: number, filingStatus: IrmaaFiling, magi: number) => computeIrmaa({ year, filingStatus, magi }).tier;

describe("2026 tiers — individual column (CMS fact sheet Nov 14 2025; POMS HI 01101.020)", () => {
  const cases: [number, number][] = [
    [0, 0],
    [-25000, 0],
    [109000, 0],
    [109001, 1],
    [137000, 1],
    [137001, 2],
    [171000, 2],
    [171001, 3],
    [205000, 3],
    [205001, 4],
    [499999, 4],
    [500000, 5],
    [2_000_000, 5],
  ];
  it.each(cases)("MAGI %i → tier %i", (magi, t) => {
    expect(tier(2026, "single", magi)).toBe(t);
  });
  it("MFS who lived apart all year use the individual column", () => {
    expect(tier(2026, "mfsApart", 109001)).toBe(1);
    expect(tier(2026, "mfsApart", 205001)).toBe(4);
  });
  it("reproduces CMS's published Part B totals and Part D add-ons", () => {
    const rows = tierRows(scheduleFor(2026), "individual");
    expect(rows.map((r) => r.partBTotal)).toEqual([202.9, 284.1, 405.8, 527.5, 649.2, 689.9]);
    expect(rows.map((r) => r.partDAddOn)).toEqual([0, 14.5, 37.5, 60.4, 83.3, 91]);
  });
});

describe("2026 tiers — married filing jointly", () => {
  const cases: [number, number][] = [
    [218000, 0],
    [218001, 1],
    [274000, 1],
    [274001, 2],
    [342000, 2],
    [342001, 3],
    [410000, 3],
    [410001, 4],
    [749999, 4],
    [750000, 5],
  ];
  it.each(cases)("MAGI %i → tier %i", (magi, t) => {
    expect(tier(2026, "mfj", magi)).toBe(t);
  });
});

describe("2026 tiers — married filing separately, lived with spouse", () => {
  it("jumps straight from none to the 80% tier, and to 85% at $391,000", () => {
    expect(tier(2026, "mfs", 109000)).toBe(0);
    expect(tier(2026, "mfs", 109001)).toBe(4);
    expect(tier(2026, "mfs", 390999)).toBe(4);
    expect(tier(2026, "mfs", 391000)).toBe(5);
  });
  it("$1 over the threshold costs the 80% tier: ($446.30 + $83.30) × 12", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "mfs", magi: 109000 });
    expect(r.next?.tier).toBe(4);
    expect(r.next?.startsAt).toBe(109001);
    expect(r.next?.extraPerYear).toBe(6355.2);
  });
  it("irmaaTier helper agrees", () => {
    expect(irmaaTier(150000, scheduleFor(2026), "mfsLivedWithSpouse")).toBe(4);
  });
});

describe("2027 projected tiers (CPI-U indexing, Scenario A; $500k/$750k fixed until 2028)", () => {
  it("individual", () => {
    expect(tier(2027, "single", 112000)).toBe(0);
    expect(tier(2027, "single", 112001)).toBe(1);
    expect(tier(2027, "single", 142000)).toBe(1);
    expect(tier(2027, "single", 142001)).toBe(2);
    expect(tier(2027, "single", 177000)).toBe(2);
    expect(tier(2027, "single", 177001)).toBe(3);
    expect(tier(2027, "single", 212000)).toBe(3);
    expect(tier(2027, "single", 212001)).toBe(4);
    expect(tier(2027, "single", 499999)).toBe(4);
    expect(tier(2027, "single", 500000)).toBe(5);
  });
  it("joint and MFS", () => {
    expect(tier(2027, "mfj", 224000)).toBe(0);
    expect(tier(2027, "mfj", 224001)).toBe(1);
    expect(tier(2027, "mfj", 424000)).toBe(3);
    expect(tier(2027, "mfj", 424001)).toBe(4);
    expect(tier(2027, "mfj", 750000)).toBe(5);
    expect(tier(2027, "mfs", 112000)).toBe(0);
    expect(tier(2027, "mfs", 112001)).toBe(4);
    expect(tier(2027, "mfs", 387999)).toBe(4);
    expect(tier(2027, "mfs", 388000)).toBe(5);
  });
  it("projected amounts: Trustees Part B totals with $209.50 standard; Part D from the official $41.33 base", () => {
    const r = computeIrmaa({ year: 2027, filingStatus: "single", magi: 300000 });
    expect(r.status).toBe("projected");
    expect(r.magiTaxYear).toBe(2025);
    expect(r.rows.map((x) => x.partBTotal)).toEqual([209.5, 293.2, 418.9, 544.6, 670.2, 712.1]);
    expect(r.rows.map((x) => x.partDAddOn)).toEqual([0, 15.4, 39.7, 64, 88.3, 96.4]);
  });
});

describe("annual cost math", () => {
  it("2026 single, tier 1: ($81.20 + $14.50) × 12 = $1,148.40", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 120000 });
    expect(r.monthly).toEqual({ partB: 81.2, partD: 14.5, surcharge: 95.7, partBTotal: 284.1 });
    expect(r.annual.surcharge).toBe(1148.4);
    expect(r.annual.partBTotal).toBe(3409.2);
    expect(r.annual.standardPartB).toBe(2434.8);
    expect(r.magiTaxYear).toBe(2024);
  });
  it("joint filers: both spouses on Medicare each pay", () => {
    const one = computeIrmaa({ year: 2026, filingStatus: "mfj", magi: 230000, people: 1 });
    const two = computeIrmaa({ year: 2026, filingStatus: "mfj", magi: 230000, people: 2 });
    expect(one.annual.surcharge).toBe(1148.4);
    expect(two.annual.surcharge).toBe(2296.8);
    expect(two.annual.perPersonSurcharge).toBe(1148.4);
  });
  it("people is ignored for single filers (only you are on your return)", () => {
    expect(computeIrmaa({ year: 2026, filingStatus: "single", magi: 120000, people: 2 }).people).toBe(1);
  });
  it("no Part D coverage → no Part D add-on", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 120000, partD: false });
    expect(r.monthly.partD).toBe(0);
    expect(r.annual.surcharge).toBe(974.4);
  });
  it("top tier 2026: Part B $689.90 total; ($487 + $91) × 12 = $6,936 a year", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 600000 });
    expect(r.monthly.partBTotal).toBe(689.9);
    expect(r.annual.surcharge).toBe(6936);
    expect(r.next).toBeNull();
  });
});

describe("cliffs: distance to the next tier and the cut to drop one", () => {
  it("$9,000 of room below the 2026 single threshold; crossing costs $1,148.40/yr", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 100000 });
    expect(r.next).toMatchObject({ tier: 1, startsAt: 109001, headroom: 9000, extraPerYear: 1148.4 });
    expect(r.lower).toBeNull();
    expect(r.noIrmaa).toBeNull();
  });
  it("$1 over: cut $1 to save the whole tier", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 109001 });
    expect(r.lower).toMatchObject({ tier: 0, maxMagi: 109000, cut: 1, savingsPerYear: 1148.4 });
  });
  it("85% tier starts AT $500,000 — $499,999 is the last dollar of the 80% tier", () => {
    const at = computeIrmaa({ year: 2026, filingStatus: "single", magi: 500000 });
    expect(at.lower).toMatchObject({ tier: 4, maxMagi: 499999, cut: 1 });
    expect(at.lower?.savingsPerYear).toBe(580.8); // (578.00 − 529.60) × 12
    const below = computeIrmaa({ year: 2026, filingStatus: "single", magi: 499999 });
    expect(below.next).toMatchObject({ tier: 5, startsAt: 500000, headroom: 0 });
  });
  it("cut to zero IRMAA from tier 3", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "mfj", magi: 350000, people: 2 });
    expect(r.tier).toBe(3);
    expect(r.noIrmaa).toMatchObject({ maxMagi: 218000, cut: 132000 });
    expect(r.noIrmaa?.savingsPerYear).toBe(r.annual.surcharge);
  });
});

describe("2027 projection risk (missing October 2025 CPI-U)", () => {
  it("$141,500 single: tier 1 under our projection, tier 2 if CMS imputes October", () => {
    const risk = projectionRisk({ year: 2027, filingStatus: "single", magi: 141500 });
    expect(risk).toMatchObject({ line: 142000, altLine: 141000, distance: 0, window: 1000, tier: 1, tierIfAlt: 2 });
    expect(risk?.extraPerYearIfAlt).toBe(1800); // ((209.40 + 39.70) − (83.70 + 15.40)) × 12
  });
  it("joint, both on Medicare: doubles the stake", () => {
    const risk = projectionRisk({ year: 2027, filingStatus: "mfj", magi: 283000, people: 2 });
    expect(risk).toMatchObject({ line: 284000, altLine: 282000, tierIfAlt: 2 });
    expect(risk?.extraPerYearIfAlt).toBe(3600);
  });
  it("within $1,000 of the first threshold: both methods agree, still flagged as projected", () => {
    const risk = projectionRisk({ year: 2027, filingStatus: "single", magi: 111500 });
    expect(risk).toMatchObject({ line: 112000, altLine: null, distance: 500, tierIfAlt: 0 });
  });
  it("just outside the window → no warning; 2026 (official) → never", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 160000 })).toBeNull();
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 143001 })).toBeNull();
    expect(projectionRisk({ year: 2026, filingStatus: "single", magi: 137000 })).toBeNull();
  });
  it("the statutory $500,000 line is not a projection", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 499500 })).toBeNull();
  });
  it("MFS lines ($112,000 and $388,000) are the same under both methods", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "mfs", magi: 387500 })).toMatchObject({ line: 388000, altLine: null, tierIfAlt: 4 });
  });
});

describe("threshold indexing reproduces the published tables (42 U.S.C. 1395r(i)(5))", () => {
  const { baseAmounts, baseAvgSep2017Aug2018, avgSep2025Aug2026_11mo } = IRMAA_2027_INDEXING.value;
  it.each(IRMAA_THRESHOLD_HISTORY.value.map((h) => [h.year, h] as const))("%i", (_y, h) => {
    expect(indexThresholds(baseAmounts, h.cpiAvg, baseAvgSep2017Aug2018, 500000).individual).toEqual(h.bounds);
  });
  it("2026 joint = 2 × individual; MFS 85% line = $500,000 − $109,000", () => {
    const t = indexThresholds(baseAmounts, 319.205, baseAvgSep2017Aug2018, 500000);
    expect(t.joint).toEqual(scheduleFor(2026).jointBounds);
    expect(t.mfsTop).toBe(scheduleFor(2026).mfsTop);
  });
  it("2027 Scenario A (11-month average) gives the projected schedule", () => {
    const t = indexThresholds(baseAmounts, avgSep2025Aug2026_11mo, baseAvgSep2017Aug2018, 500000);
    expect(t.factor).toBeCloseTo(IRMAA_2027_INDEXING.value.factor, 6);
    t.unrounded.forEach((u, k) => expect(u).toBeCloseTo(IRMAA_2027_INDEXING.value.unrounded[k], 1));
    expect(t.individual).toEqual(scheduleFor(2027).individualBounds);
    expect(t.joint).toEqual(scheduleFor(2027).jointBounds);
    expect(t.mfsTop).toBe(scheduleFor(2027).mfsTop);
  });
  it("2027 Scenario B (October imputed) gives the alternative bounds", () => {
    const t = indexThresholds(baseAmounts, IRMAA_2027_SCENARIO_B.value.avg12mo, baseAvgSep2017Aug2018, 500000);
    expect(t.individual).toEqual([112000, 141000, 176000, 211000]);
    expect(t.joint).toEqual([224000, 282000, 352000, 422000]);
  });
});

describe("Part D IRMAA formula (42 CFR 423.286(d)(4)(ii))", () => {
  const pcts = IRMAA_PCT.slice(1) as number[];
  it("2026: $38.99 base → $14.50 / $37.50 / $60.40 / $83.30 / $91.00", () => {
    expect(pcts.map((p) => partDIrmaaFromBase(PART_D[2026].value.baseBeneficiaryPremium, p))).toEqual(scheduleFor(2026).partDAddOn.slice(1));
  });
  it("2027: official $41.33 base → $15.40 / $39.70 / $64.00 / $88.30 / $96.40", () => {
    expect(pcts.map((p) => partDIrmaaFromBase(PART_D[2027].value.baseBeneficiaryPremium, p))).toEqual(scheduleFor(2027).partDAddOn.slice(1));
  });
  it("rounds to the nearest dime", () => {
    expect(roundToDime(14.5258)).toBe(14.5);
    expect(roundToDime(90.98)).toBe(91);
    expect(roundToDime(243.48)).toBe(243.5);
  });
});

describe("MAGI from income", () => {
  it("tax-exempt interest counts; adjustments reduce AGI", () => {
    const r = magiFromIncome({
      pensions: 40000,
      iraWithdrawals: 30000,
      taxableSocialSecurity: 34000,
      taxableInterest: 2000,
      taxExemptInterest: 8000,
      dividends: 5000,
      capitalGains: -3000,
      adjustments: 1000,
    });
    expect(r.agi).toBe(107000);
    expect(r.magi).toBe(115000);
  });
  it("empty → 0", () => {
    expect(magiFromIncome({}).magi).toBe(0);
  });
  it("muni interest alone can push someone over the 2026 threshold", () => {
    const { magi } = magiFromIncome({ iraWithdrawals: 100000, taxExemptInterest: 9001 });
    expect(tier(2026, "single", magi)).toBe(1);
  });
});

describe("life-changing event (Form SSA-44)", () => {
  const input = { year: 2027, filingStatus: "single" as const, magi: 180000 };
  it("retiring drops income below the threshold → significant, saves the whole surcharge", () => {
    const e = lifeChangingEventEffect(input, 90000);
    expect(e.currentTier).toBe(3);
    expect(e.newTier).toBe(0);
    expect(e.significant).toBe(true);
    expect(e.savingsPerYear).toBe(computeIrmaa(input).annual.surcharge);
  });
  it("a drop that stays in the same tier is not 'significant' (20 CFR 418.1215)", () => {
    const e = lifeChangingEventEffect(input, 178000);
    expect(e.significant).toBe(false);
    expect(e.savingsPerYear).toBe(0);
  });
});

describe("chart curve and labels", () => {
  it("is a non-decreasing step function", () => {
    const pts = surchargeCurve({ year: 2026, filingStatus: "single" }, 50000, 1000, 400);
    for (let k = 1; k < pts.length; k++) expect(pts[k].y).toBeGreaterThanOrEqual(pts[k - 1].y);
    expect(pts.find((p) => p.x === 109000)?.y).toBe(0);
    expect(pts.find((p) => p.x === 110000)?.y).toBe(1148.4);
  });
  it("step points sit exactly on the bracket edges", () => {
    const pts = surchargeSteps({ year: 2026, filingStatus: "single" }, 60000, 600000);
    expect(pts.slice(0, 4)).toEqual([
      { x: 60000, y: 0, tier: 0 },
      { x: 109000, y: 0, tier: 0 },
      { x: 109001, y: 1148.4, tier: 1 },
      { x: 137000, y: 1148.4, tier: 1 },
    ]);
    expect(pts.find((p) => p.x === 499999)?.tier).toBe(4);
    expect(pts.find((p) => p.x === 500000)).toEqual({ x: 500000, y: 6936, tier: 5 });
    expect(pts[pts.length - 1].x).toBe(600000);
    for (let k = 1; k < pts.length; k++) expect(pts[k].x).toBeGreaterThan(pts[k - 1].x);
  });
  it("MFS (lived with spouse) has only three steps; two joint spouses double every step", () => {
    expect(surchargeSteps({ year: 2026, filingStatus: "mfs" }, 0, 600000).map((p) => p.tier)).toEqual([0, 0, 4, 4, 5, 5]);
    const two = surchargeSteps({ year: 2027, filingStatus: "mfj", people: 2 }, 200000, 800000);
    const one = surchargeSteps({ year: 2027, filingStatus: "mfj", people: 1 }, 200000, 800000);
    two.forEach((p, k) => expect(p.y).toBeCloseTo(one[k].y * 2, 6));
  });
  it("labels match the CMS wording", () => {
    const rows = tierRows(scheduleFor(2026), "individual");
    expect(rangeLabel(rows[0])).toBe("$109,000 or less");
    expect(rangeLabel(rows[1])).toBe("More than $109,000 up to $137,000");
    expect(rangeLabel(rows[4])).toBe("More than $205,000 but less than $500,000");
    expect(rangeLabel(rows[5])).toBe("$500,000 or more");
  });
  it("unknown year throws", () => {
    expect(() => computeIrmaa({ year: 2025, filingStatus: "single", magi: 1 })).toThrow(RangeError);
  });
});

// ───────────────────────── Adversarial review additions ─────────────────────────

type ResearchRow = { magi_gt?: number | null; magi_ge?: number; magi_le?: number; magi_lt?: number; irmaa: number; total_premium?: number };
const research = JSON.parse(readFileSync(resolve(__dirname, "../../../../docs/research/medicare.json"), "utf8")) as {
  params: { key: string; value: unknown }[];
};
const researchParam = <T,>(key: string) => research.params.find((p) => p.key === key)!.value as T;

describe("2026 table, row by row, against the CMS fact sheet transcribed in docs/research/medicare.json", () => {
  const partB = researchParam<Record<string, ResearchRow[]>>("irmaa_part_b_table_2026");
  const partD = researchParam<Record<string, ResearchRow[]>>("irmaa_part_d_table_2026");
  const groups: [string, FilingGroup][] = [
    ["individual", "individual"],
    ["joint", "joint"],
    ["married_filing_separately_lived_with_spouse", "mfsLivedWithSpouse"],
  ];
  it.each(groups)("%s: bounds, ≤/</≥ inclusivity, Part B totals and Part D add-ons", (key, group) => {
    const rows = tierRows(scheduleFor(2026), group);
    const toRow = (b: ResearchRow, d: ResearchRow): Partial<TierRow> => ({
      from: b.magi_gt ?? b.magi_ge ?? null,
      fromInclusive: b.magi_ge != null,
      to: b.magi_le ?? b.magi_lt ?? null,
      toInclusive: b.magi_le != null,
      partBAddOn: b.irmaa,
      partBTotal: b.total_premium,
      partDAddOn: d.irmaa,
    });
    expect(rows.length).toBe(partB[key].length);
    rows.forEach((r, k) => expect(r).toMatchObject(toRow(partB[key][k], partD[key][k])));
  });
});

describe("CMS rounding to the nearest dime (42 CFR 408.27)", () => {
  it("an odd multiple of 5 cents rounds UP (the old local helper turned $83.35 into $83.30)", () => {
    expect(roundToDime(83.35)).toBe(83.4);
    expect(roundToDime(202.95)).toBe(203);
    expect(roundToDime(4.35)).toBe(4.4);
    expect(roundToDime(0.05)).toBe(0.1);
  });
  it("every half-dime from $0.05 to $1,999.95 rounds up; anything below the half rounds down", () => {
    const wrong: number[] = [];
    for (let c = 5; c < 200000; c += 10) {
      if (roundToDime(c / 100) !== (c + 5) / 100) wrong.push(c / 100);
      if (roundToDime((c - 1) / 100) !== (c - 5) / 100) wrong.push((c - 1) / 100);
    }
    expect(wrong).toEqual([]);
  });
  it("Medicare.gov Part D penalty examples: 17 months × 1% × $38.99 = $6.63 → $6.60; 14 months × 1% × $41.33 = $5.79 → $5.80", () => {
    const rate = PENALTIES.value.partDPerMonth;
    expect(roundToDime(17 * rate * PART_D[2026].value.baseBeneficiaryPremium)).toBe(6.6);
    expect(roundToDime(14 * rate * PART_D[2027].value.baseBeneficiaryPremium)).toBe(5.8);
  });
});

describe("2026 immunosuppressive-drug-only Part B (CMS fact sheet)", () => {
  it("totals $121.60 / $202.70 / $324.30 / $445.90 / $567.50 / $608.10 on the same MAGI tiers", () => {
    const { standard, addOn } = IRMAA_IMMUNO_2026.value;
    expect(addOn.map((a) => Math.round((standard + a) * 100) / 100)).toEqual([121.6, 202.7, 324.3, 445.9, 567.5, 608.1]);
  });
});

describe("indexing: joint and married-filing-separately lines (FR 2020-25029, POMS HI 01101.020)", () => {
  const { baseAmounts, baseAvgSep2017Aug2018 } = IRMAA_2027_INDEXING.value;
  const run = (year: number) => {
    const h = IRMAA_THRESHOLD_HISTORY.value.find((x) => x.year === year)!;
    return indexThresholds(baseAmounts, h.cpiAvg, baseAvgSep2017Aug2018, IRMAA_2026.topIndividual);
  };
  it("2021: joint lines are 2 × the ROUNDED single lines (176k/222k/276k/330k), MFS top $412,000", () => {
    expect(run(2021).joint).toEqual([176000, 222000, 276000, 330000]);
    expect(run(2021).mfsTop).toBe(412000);
  });
  it("the MFS 85% line is $500,000 minus that year's first line, not the regulation's fixed $415,000", () => {
    expect([2023, 2024, 2025, 2026].map((y) => run(y).mfsTop)).toEqual([403000, 397000, 394000, 391000]);
  });
});

describe("2027 CPI-U window with the missing October 2025 (BLS CUUR0000SA0)", () => {
  const months = CPI_WINDOW_2027.value;
  const published = months.filter((m) => m.value != null).map((m) => m.value!);
  const { baseAmounts, baseAvgSep2017Aug2018, avgSep2025Aug2026_11mo } = IRMAA_2027_INDEXING.value;
  const sep = months.find((m) => m.month === "2025-09")!.value!;
  const nov = months.find((m) => m.month === "2025-11")!.value!;
  const lines = (oct: number) =>
    indexThresholds(baseAmounts, (published.reduce((a, b) => a + b, 0) + oct) / 12, baseAvgSep2017Aug2018, IRMAA_2026.topIndividual).individual;

  it("Scenario A: the 11 published months sum to 3,626.219 and average 329.656273", () => {
    expect(published.length).toBe(11);
    expect(published.reduce((a, b) => a + b, 0)).toBeCloseTo(3626.219, 3);
    expect(published.reduce((a, b) => a + b, 0) / 11).toBeCloseTo(avgSep2025Aug2026_11mo, 6);
  });
  it("Scenario B: October = geometric mean of September and November = 324.4608; 12-month average 329.223319", () => {
    const oct = Math.sqrt(sep * nov);
    expect(oct).toBeCloseTo(IRMAA_2027_SCENARIO_B.value.imputedOct2025, 4);
    expect((published.reduce((a, b) => a + b, 0) + oct) / 12).toBeCloseTo(IRMAA_2027_SCENARIO_B.value.avg12mo, 6);
    expect(lines(oct)).toEqual([...IRMAA_2027_ALT_BOUNDS.individualBounds]);
  });
  it("October = September or October = November gives the same rounded lines as Scenario B", () => {
    expect(lines(sep)).toEqual([...IRMAA_2027_ALT_BOUNDS.individualBounds]);
    expect(lines(nov)).toEqual([...IRMAA_2027_ALT_BOUNDS.individualBounds]);
  });
});

describe("inbound ?fs= from other calculators", () => {
  it("head of household and qualifying surviving spouse use the individual column", () => {
    expect(parseFilingParam("hoh")).toBe("single");
    expect(parseFilingParam("qss")).toBe("single");
    expect(parseFilingParam("single")).toBe("single");
  });
  it("keeps the IRMAA codes and rejects anything else (so the default stays)", () => {
    expect(["mfj", "mfs", "mfsApart"].map(parseFilingParam)).toEqual(["mfj", "mfs", "mfsApart"]);
    expect(parseFilingParam("MFJ")).toBeUndefined();
    expect(parseFilingParam("")).toBeUndefined();
  });
});

describe("life-changing event: newer income that is not lower", () => {
  const input = { year: 2027, filingStatus: "single" as const, magi: 180000 };
  it("a HIGHER newer MAGI is not a drop and would raise the tier — never 'still in the same tier'", () => {
    const e = lifeChangingEventEffect(input, 300000);
    expect(e).toMatchObject({ isDrop: false, significant: false, currentTier: 3, newTier: 4, savingsPerYear: 0 });
  });
  it("the same MAGI is not a drop either", () => {
    expect(lifeChangingEventEffect(input, 180000)).toMatchObject({ isDrop: false, significant: false });
  });
  it("married filing separately (lived together): falling to the threshold removes the 80% tier", () => {
    const e = lifeChangingEventEffect({ year: 2026, filingStatus: "mfs", magi: 150000 }, 109000);
    expect(e).toMatchObject({ isDrop: true, significant: true, currentTier: 4, newTier: 0 });
    expect(e.savingsPerYear).toBe(6355.2);
  });
});

describe("2027 projection risk — edges", () => {
  it("exactly on the alternative line ($141,000): tier 1 either way, still flagged as close", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 141000 })).toMatchObject({ tier: 1, tierIfAlt: 1, distance: 0, extraPerYearIfAlt: 0 });
  });
  it("exactly on our line ($142,000): tier 1 under our projection, tier 2 if October is imputed", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 142000 })).toMatchObject({ tier: 1, tierIfAlt: 2 });
  });
  it("joint first line: the window is $2,000 (joint lines are 2 × single)", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "mfj", magi: 222000 })).toMatchObject({ line: 224000, altLine: null, distance: 2000, window: 2000 });
    expect(projectionRisk({ year: 2027, filingStatus: "mfj", magi: 221999 })).toBeNull();
  });
});

describe("empty and extreme inputs never produce NaN", () => {
  it("NaN MAGI is treated as $0", () => {
    const r = computeIrmaa({ year: 2027, filingStatus: "mfj", magi: Number.NaN, people: 2 });
    expect(r.tier).toBe(0);
    expect(Number.isFinite(r.annual.surcharge) && Number.isFinite(r.next!.headroom)).toBe(true);
  });
  it("$1 trillion lands in the top tier with finite numbers", () => {
    const r = computeIrmaa({ year: 2026, filingStatus: "single", magi: 1e12 });
    expect(r.tier).toBe(5);
    expect(r.annual.surcharge).toBe(6936);
    expect(r.lower?.cut).toBe(1e12 - 499999);
  });
  it("a deductible capital loss can make the income builder's MAGI negative, which pays no IRMAA", () => {
    const { magi } = magiFromIncome({ capitalGains: -3000 });
    expect(magi).toBe(-3000);
    expect(tier(2026, "single", magi)).toBe(0);
  });
});

describe("page/calculator helpers (irmaa-content)", () => {
  it("$1 over the first 2027 line: single $1,189.20 a year; a couple both on Medicare $2,378.40", () => {
    expect(oneDollarOver(2027, "single")).toMatchObject({ line: 112000, over: 112001, yearly: 1189.2 });
    expect(oneDollarOver(2027, "mfj", 2)).toMatchObject({ line: 224000, over: 224001, yearly: 2378.4 });
  });
  it("$1 over while filing separately (2026): straight to the 80% tier, $6,355.20 a year", () => {
    expect(oneDollarOver(2026, "mfs")).toMatchObject({ line: 109000, over: 109001, yearly: 6355.2 });
  });
  it("links to the RMD calculator only with a year it accepts (2026 | 2027), never the past MAGI year", () => {
    expect(rmdCalculatorHref(2025)).toBe("/rmd-calculator");
    expect(rmdCalculatorHref(2024)).toBe("/rmd-calculator");
    expect(rmdCalculatorHref(2027)).toBe("/rmd-calculator?year=2027");
    expect(rmdCalculatorHref()).toBe("/rmd-calculator");
  });
  it("expected CMS release wording comes from the research ('early-to-mid November 2026')", () => {
    expect(CMS_2027_EXPECTED).toBe("early-to-mid November 2026");
  });
});

describe("life-changing events that change the filing status (marriage, divorce, a spouse's death)", () => {
  it("a widow whose joint MAGI was in tier 1 lands in tier 2 on a single return: don't file", () => {
    const joint = { year: 2027, filingStatus: "mfj" as const, magi: 250000, people: 2 as const };
    // Same-status check (the old behaviour) would wrongly promise $2,378.40 a year of savings.
    expect(lifeChangingEventEffect(joint, 150000).significant).toBe(true);
    const e = lifeChangingEventEffect(joint, 150000, "single");
    expect(e).toMatchObject({ statusChanged: true, perPerson: true, currentTier: 1, newTier: 2, significant: false, savingsPerYear: 0 });
    expect(e.targetMagi).toBe(112000); // single return: $112,000 or less removes IRMAA
  });
  it("divorce to a single return below the single line: significant, savings counted for one person", () => {
    const e = lifeChangingEventEffect({ year: 2026, filingStatus: "mfj", magi: 300000, people: 2 }, 100000, "single");
    expect(e).toMatchObject({ currentTier: 2, newTier: 0, significant: true });
    expect(e.savingsPerYear).toBe(2884.8); // ($202.90 + $37.50) × 12 for one person, not both
  });
  it("marriage: a single filer in tier 2 whose joint MAGI is under the joint line drops to no IRMAA", () => {
    const e = lifeChangingEventEffect({ year: 2027, filingStatus: "single", magi: 150000 }, 200000, "mfj");
    expect(e).toMatchObject({ isDrop: false, significant: true, currentTier: 2, newTier: 0 });
  });
  it("the status-changing events are recognised from the official event list", () => {
    expect(LIFE_CHANGING_EVENTS.map(filingAfterEvent)).toEqual(["mfj", "single", "single", null, null, null, null, null]);
    expect(filingAfterEvent(undefined)).toBeNull();
  });
});

describe("2027 projection risk — a MAGI already above both candidate lines is not at risk", () => {
  // The alternative (October-imputed) lines are $1,000 / $2,000 LOWER, so anyone over our line is over both.
  it("single $142,500: tier 2 under both methods, no warning (was flagged 'little room')", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 142500 })).toBeNull();
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 142001 })).toBeNull();
    expect(computeIrmaa({ year: 2027, filingStatus: "single", magi: 142001 }).tier).toBe(2);
  });
  it("single $213,000 (over $212,000 and $211,000): tier 4 either way, no warning", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 213000 })).toBeNull();
  });
  it("joint $285,000 (over $284,000 and $282,000): no warning", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "mfj", magi: 285000, people: 2 })).toBeNull();
  });
  it("just BELOW the alternative line still warns: room shrinks from $1,500 to $500", () => {
    const risk = projectionRisk({ year: 2027, filingStatus: "single", magi: 140500 });
    expect(risk).toMatchObject({ line: 142000, altLine: 141000, distance: 500, tier: 1, tierIfAlt: 1, extraPerYearIfAlt: 0 });
    expect(computeIrmaa({ year: 2027, filingStatus: "single", magi: 140500 }).next?.headroom).toBe(1500);
  });
  it("lines both methods agree on are still flagged on either side (they remain projections)", () => {
    expect(projectionRisk({ year: 2027, filingStatus: "single", magi: 112500 })).toMatchObject({ line: 112000, altLine: null, distance: 500 });
  });
});
