import { describe, expect, it } from "vitest";
import {
  ordinaryTax,
  bracketRate,
  standardDeduction,
  seniorDeduction,
  taxWithPreferential,
  computeFedTax,
  marginalRate,
  marginalDetail,
  torpedoCurve,
  torpedoZones,
  w4vRateToCover,
  TORPEDO_MAX_POINTS,
} from "../fed-tax";

/* All expected values are hand-computed from Rev. Proc. 2025-32 (2026 brackets §4.01, capital-gain breakpoints §4.03,
 * standard deduction §4.14), P.L. 119-21 §70103 / Schedule 1-A (senior deduction) and IRC §1411 (NIIT). */

describe("2026 ordinary rate schedules (Rev. Proc. 2025-32 §4.01)", () => {
  it("single", () => {
    expect(ordinaryTax(0, "single")).toBe(0);
    expect(ordinaryTax(12400, "single")).toBe(1240); // 10% × 12,400
    // $50,000: 1,240 + 12% × (50,000 − 12,400) = 1,240 + 4,512 = 5,752
    expect(ordinaryTax(50000, "single")).toBe(5752);
    // $50,400 is the top of the 12% bracket: $5,800 exactly
    expect(ordinaryTax(50400, "single")).toBe(5800);
    // $60,000: 5,800 + 22% × 9,600 = 7,912
    expect(ordinaryTax(60000, "single")).toBe(7912);
    // $700,000: 192,979.25 + 37% × 59,400 = 214,957.25
    expect(ordinaryTax(700000, "single")).toBe(214957.25);
  });
  it("joint, head of household, separate", () => {
    expect(ordinaryTax(100800, "mfj")).toBe(11600);
    expect(ordinaryTax(100800, "qss")).toBe(11600);
    // HOH $70,000: 7,740 + 22% × 2,550 = 8,301
    expect(ordinaryTax(70000, "hoh")).toBe(8301);
    // MFS top bracket starts at 384,350: 400,000 → 103,291.75 + 37% × 15,650 = 109,082.25
    expect(ordinaryTax(400000, "mfs")).toBe(109082.25);
    expect(ordinaryTax(400000, "mfsApart")).toBe(109082.25);
  });
  it("bracket of the next dollar", () => {
    expect(bracketRate(12399, "single")).toBe(0.1);
    expect(bracketRate(50400, "single")).toBe(0.22);
    expect(bracketRate(150000, "mfj")).toBe(0.22);
  });
});

describe("standard deduction 2026 incl. additional 65+/blind amounts", () => {
  it("single 65+: 16,100 + 2,050 = 18,150", () => expect(standardDeduction("single", 1, 0).total).toBe(18150));
  it("joint, both 65+: 32,200 + 2 × 1,650 = 35,500; plus one blind = 37,150", () => {
    expect(standardDeduction("mfj", 2, 0).total).toBe(35500);
    expect(standardDeduction("mfj", 2, 1).total).toBe(37150);
  });
  it("HOH uses the unmarried amount; QSS and MFS use the married amount", () => {
    expect(standardDeduction("hoh", 1, 0).total).toBe(24150 + 2050);
    expect(standardDeduction("qss", 1, 0).total).toBe(32200 + 1650);
    expect(standardDeduction("mfs", 1, 0).total).toBe(16100 + 1650);
    expect(standardDeduction("mfsApart", 1, 1).total).toBe(16100 + 3300);
  });
  it("a single return can't claim two people's 65+ boxes", () => expect(standardDeduction("single", 2, 0).boxes).toBe(1));
});

describe("OBBBA senior deduction (IRC §151(d)(5)(C)) — phase-out endpoints", () => {
  it("single: full at 75,000; 4,500 at 100,000; 1,500 at 150,000; 0 at 175,000", () => {
    expect(seniorDeduction("single", 1, 75000).total).toBe(6000);
    expect(seniorDeduction("single", 1, 100000).total).toBe(4500);
    expect(seniorDeduction("single", 1, 150000).total).toBe(1500);
    expect(seniorDeduction("single", 1, 175000).total).toBe(0);
    expect(seniorDeduction("single", 1, 200000).total).toBe(0);
    expect(seniorDeduction("single", 1, 80000).zeroAt).toBe(175000);
  });
  it("joint: 12,000 for two at 150,000; 9,000 at 175,000; 6,000 at 200,000; 0 at 250,000", () => {
    expect(seniorDeduction("mfj", 2, 150000).total).toBe(12000);
    expect(seniorDeduction("mfj", 2, 175000).total).toBe(9000);
    expect(seniorDeduction("mfj", 2, 200000).total).toBe(6000);
    expect(seniorDeduction("mfj", 1, 200000).total).toBe(3000);
    expect(seniorDeduction("mfj", 2, 250000).total).toBe(0);
  });
  it("married filing separately gets none; HOH/QSS use the $75,000 threshold", () => {
    expect(seniorDeduction("mfs", 1, 30000).total).toBe(0);
    expect(seniorDeduction("mfsApart", 1, 30000).total).toBe(0);
    expect(seniorDeduction("hoh", 1, 100000).total).toBe(4500);
    expect(seniorDeduction("qss", 1, 100000).total).toBe(4500);
  });
  it("nobody 65+ → 0; only tax years 2025–2028", () => {
    expect(seniorDeduction("single", 0, 30000).total).toBe(0);
    expect(seniorDeduction("single", 1, 30000, 2029).total).toBe(0);
  });
});

describe("qualified dividends / long-term gains stacked on ordinary income (Rev. Proc. 2025-32 §4.03)", () => {
  it("single, taxable income 60,000 incl. 20,000 qualified dividends → 6,134.50", () => {
    // Ordinary 40,000 → 1,240 + 12% × 27,600 = 4,552. 0% band to 49,450 → 9,450 at 0%; 10,550 at 15% = 1,582.50.
    const r = taxWithPreferential(60000, 20000, "single");
    expect(r.ordinary).toBe(4552);
    expect(r.pref.at0).toBe(9450);
    expect(r.pref.at15).toBe(10550);
    expect(r.total).toBe(6134.5);
  });
  it("20% rate above 545,500 (single, all gains, taxable income 600,000) → 85,307.50", () => {
    // 49,450 at 0%; 496,050 at 15% = 74,407.50; 54,500 at 20% = 10,900.
    const r = taxWithPreferential(600000, 600000, "single");
    expect(r.pref.at20).toBe(54500);
    expect(r.total).toBe(85307.5);
  });
  it("joint couple fully inside the 0% band pays nothing on gains", () => {
    // Ordinary 40,000 (12% bracket) + 50,000 gains = 90,000 ≤ 98,900 → all gains at 0%.
    const r = taxWithPreferential(90000, 50000, "mfj");
    expect(r.pref.at0).toBe(50000);
    expect(r.total).toBe(ordinaryTax(40000, "mfj"));
  });
});

describe("whole-return scenarios (2026)", () => {
  it("single, 65+, $24,000 Social Security + $25,000 IRA → taxable SS 7,050, tax 790", () => {
    // AGI = 25,000 + 7,050 = 32,050; std 18,150; senior 6,000 (MAGI < 75,000) → TI 7,900 → 10% = 790.
    const r = computeFedTax({ filingStatus: "single", ssBenefits: 24000, iraDistributions: 25000, people65: 1 });
    expect(r.ss.taxable).toBeCloseTo(7050, 6);
    expect(r.agi).toBeCloseTo(32050, 6);
    expect(r.deduction).toBe(18150);
    expect(r.senior.total).toBe(6000);
    expect(r.taxableIncome).toBe(7900);
    expect(r.totalTax).toBe(790);
    expect(r.effectiveRate).toBeCloseTo(790 / 49000, 9);
  });

  it("joint, both 65+, $40,000 Social Security + $30,000 IRA → $11,100 of benefits taxable but $0 tax", () => {
    // AGI 41,100; std 35,500; senior 12,000 → taxable income 0.
    const r = computeFedTax({ filingStatus: "mfj", ssBenefits: 40000, iraDistributions: 30000, people65: 2 });
    expect(r.ss.taxable).toBeCloseTo(11100, 6);
    expect(r.taxableIncome).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.bracket).toBe(0);
  });

  it("the senior deduction lowers tax but not taxable Social Security or AGI", () => {
    const base = { filingStatus: "single" as const, ssBenefits: 30000, iraDistributions: 40000, people65: 1 };
    const withIt = computeFedTax(base);
    const without = computeFedTax({ ...base, applySeniorDeduction: false });
    expect(withIt.ss.taxable).toBe(without.ss.taxable);
    expect(withIt.agi).toBe(without.agi);
    expect(without.taxableIncome - withIt.taxableIncome).toBe(6000);
    expect(without.totalTax).toBeGreaterThan(withIt.totalTax);
  });

  it("itemized deductions replace the standard deduction only when larger; senior deduction still applies", () => {
    // SS 20,000, IRA 40,000 → taxable SS 17,000 (85% cap); AGI 57,000 (< 75,000, full senior deduction).
    const r = computeFedTax({ filingStatus: "single", ssBenefits: 20000, iraDistributions: 40000, people65: 1, itemizedDeductions: 25000 });
    expect(r.deductionType).toBe("itemized");
    expect(r.deduction).toBe(25000);
    expect(r.senior.total).toBe(6000);
  });

  it("NIIT: 3.8% × lesser of investment income and MAGI over the threshold", () => {
    // Single, no SS, IRA 200,000 + qualified dividends 100,000 → AGI 300,000; MAGI − 200,000 = 100,000; NII 100,000 → 3,800.
    const r = computeFedTax({ filingStatus: "single", ssBenefits: 0, iraDistributions: 200000, qualifiedDividendsLtcg: 100000 });
    expect(r.niit).toBe(3800);
    expect(computeFedTax({ filingStatus: "single", ssBenefits: 0, iraDistributions: 200000, qualifiedDividendsLtcg: 100000, includeNiit: false }).niit).toBe(0);
  });

  it("married filing separately (lived together): 85% of benefits taxable early and no senior deduction", () => {
    const r = computeFedTax({ filingStatus: "mfs", ssBenefits: 20000, iraDistributions: 10000, people65: 1 });
    expect(r.ss.taxable).toBeCloseTo(17000, 6);
    expect(r.senior.total).toBe(0);
    // AGI 27,000 − std 17,750 = 9,250 → 925
    expect(r.totalTax).toBe(925);
  });
});

describe("marginal rate by +$1,000 finite difference (the tax torpedo)", () => {
  it("12% bracket inside the 85% zone → 12% × 1.85 = 22.2%", () => {
    // Single 65+, SS 24,000, IRA 35,000: taxable SS 15,550 (< 20,400 cap); AGI 50,550; TI 26,400 (12% bracket).
    const m = marginalRate({ filingStatus: "single", ssBenefits: 24000, iraDistributions: 35000, people65: 1 });
    expect(m).toBeCloseTo(0.222, 9);
  });
  it("22% bracket inside the 85% zone, no senior deduction → 22% × 1.85 = 40.7%", () => {
    // Single under 65, SS 48,000, IRA 50,000: taxable SS 38,500 (< 40,800 cap); AGI 88,500; TI 72,400 (22%).
    const m = marginalRate({ filingStatus: "single", ssBenefits: 48000, iraDistributions: 50000, people65: 0 });
    expect(m).toBeCloseTo(0.407, 9);
  });
  it("…and with the senior deduction phasing out: 22% × 1.85 × 1.06 = 43.142%", () => {
    // Same, but 65+: MAGI 88,500 > 75,000 → each $1.85 of AGI also removes $0.111 of senior deduction.
    const m = marginalRate({ filingStatus: "single", ssBenefits: 48000, iraDistributions: 50000, people65: 1 });
    expect(m).toBeCloseTo(0.22 * 1.85 * 1.06, 9);
  });
  it("50% zone: 10% bracket → 15%; 12% bracket → 12% × 1.5 = 18%", () => {
    // Single 65+, SS 12,000 (L2 6,000), IRA 26,000 → PI 32,000 (between 25,000 and 34,000); taxable SS 3,500;
    // AGI 29,500; TI 29,500 − 18,150 − 6,000 = 5,350 (10% bracket). +1,000 IRA → +500 taxable SS → TI +1,500 → +150.
    expect(marginalRate({ filingStatus: "single", ssBenefits: 12000, iraDistributions: 26000, people65: 1 })).toBeCloseTo(0.15, 9);
    // Same person under 65 (std 16,100, no senior deduction): TI 13,400 (12% bracket) → +1,500 × 12% = 180.
    expect(marginalRate({ filingStatus: "single", ssBenefits: 12000, iraDistributions: 26000, people65: 0 })).toBeCloseTo(0.18, 9);
  });
  it("past the 85% cap the rate falls back to the bracket", () => {
    // Single 65+, SS 24,000, IRA 80,000: taxable SS capped at 20,400; AGI 100,400; senior phasing out (MAGI > 75,000):
    // 22% × 1.06 = 23.32%.
    const m = marginalRate({ filingStatus: "single", ssBenefits: 24000, iraDistributions: 80000, people65: 1 });
    expect(m).toBeCloseTo(0.22 * 1.06, 9);
  });
  it("curve + zones: the phase-in zone is where the marginal rate exceeds the bracket", () => {
    const pts = torpedoCurve({ filingStatus: "single", ssBenefits: 24000, people65: 1 }, { to: 100000, step: 1000 });
    expect(pts[0].ira).toBe(0);
    expect(pts.at(-1)!.ira).toBe(100000);
    const zones = torpedoZones(pts);
    expect(zones.length).toBe(1);
    // Phase-in starts once PI = 12,000 + IRA > 25,000 → IRA > 13,000 (point at 12,000 straddles: 12,000 + 1,000 → PI 25,000, still 0).
    expect(zones[0].from).toBe(13000);
    // Cap reached when taxable SS hits 20,400: 4,500 + 0.85 × (IRA + 12,000 − 34,000) = 20,400 → IRA ≈ 40,706.
    expect(zones[0].to).toBe(40000);
    expect(zones[0].peak).toBeCloseTo(0.222, 3);
  });
});

describe("marginal detail: what the next $1,000 of IRA withdrawals does", () => {
  it("default page example: joint, both 65+, $48,000 SS + $40,000 IRA → 10% bracket × 1.85 = 18.5%", () => {
    // PI 24,000 + 40,000 = 64,000; taxable SS 6,000 + 0.85 × 20,000 = 23,000; AGI 63,000; TI 63,000 − 35,500 − 12,000 = 15,500.
    // +1,000 IRA → +850 taxable SS → TI +1,850 at 10% = +185.
    const inp = { filingStatus: "mfj" as const, ssBenefits: 48000, iraDistributions: 40000, people65: 2 };
    expect(computeFedTax(inp).totalTax).toBe(1550);
    const d = marginalDetail(inp);
    expect(d.rate).toBeCloseTo(0.185, 9);
    expect(d.ssPhaseIn).toBeCloseTo(0.85, 9);
    expect(d.seniorLoss).toBe(0);
    expect(d.extraTax).toBe(185);
  });
  it("capital-gain bump: extra IRA dollars push qualified dividends from 0% to 15% → (12% + 15%) × 1.06 = 28.62%", () => {
    // Single 65+, SS 30,000 (taxable capped at 25,500), IRA 30,000, qualified dividends 20,000:
    // AGI 75,500 → senior deduction 6,000 − 6% × 500 = 5,970; TI 75,500 − 18,150 − 5,970 = 51,380; ordinary 31,380 (12%).
    // +1,000 IRA → TI +1,060 (60 of senior deduction lost) → 1,060 × 12% ordinary + 1,060 of dividends now above 49,450 at 15%.
    const inp = { filingStatus: "single" as const, ssBenefits: 30000, iraDistributions: 30000, qualifiedDividendsLtcg: 20000, people65: 1 };
    const r = computeFedTax(inp);
    expect(r.taxableIncome).toBe(51380);
    expect(r.pref.at15).toBe(1930);
    const d = marginalDetail(inp);
    expect(d.ssPhaseIn).toBe(0);
    expect(d.seniorLoss).toBeCloseTo(0.06, 9);
    expect(d.rate).toBeCloseTo((0.12 + 0.15) * 1.06, 9);
  });
});

describe("Form W-4V withholding helper", () => {
  const rates = [0.07, 0.1, 0.12, 0.22];
  it("smallest allowed rate that covers the tax", () => {
    expect(w4vRateToCover(0, 30000, rates)).toBe(0);
    expect(w4vRateToCover(2000, 30000, rates)).toBe(0.07); // need 6.7%
    expect(w4vRateToCover(3300, 30000, rates)).toBe(0.12); // need 11%
    expect(w4vRateToCover(9000, 30000, rates)).toBeNull(); // need 30%
  });
});

/* ---------------- adversarial review additions ---------------- */

describe("research tables reproduced exactly (docs/research/federal_tax.json)", () => {
  it("senior deduction phase-out illustration — all ten rows", () => {
    // [status, MAGI, per person, total for two]
    const rows: [string, number, number, number | null][] = [
      ["single", 75000, 6000, null],
      ["single", 100000, 4500, null],
      ["single", 125000, 3000, null],
      ["single", 150000, 1500, null],
      ["single", 175000, 0, null],
      ["mfj", 150000, 6000, 12000],
      ["mfj", 175000, 4500, 9000],
      ["mfj", 200000, 3000, 6000],
      ["mfj", 225000, 1500, 3000],
      ["mfj", 250000, 0, 0],
    ];
    for (const [fs, magi, per, two] of rows) {
      const one = seniorDeduction(fs as "single" | "mfj", 1, magi);
      expect(one.perPerson).toBeCloseTo(per, 6);
      if (two != null) expect(seniorDeduction("mfj", 2, magi).total).toBeCloseTo(two, 6);
    }
    expect(seniorDeduction("mfj", 2, 160000).zeroAt).toBe(250000);
  });
  it("2026 standard deduction table incl. the per-condition additional amount, every status", () => {
    // basic 16,100 / 24,150 / 32,200 / 32,200 / 16,100; additional 2,050 unmarried, 1,650 married or surviving spouse.
    const cases: [Parameters<typeof standardDeduction>[0], number, number][] = [
      ["single", 16100, 2050],
      ["hoh", 24150, 2050],
      ["mfj", 32200, 1650],
      ["qss", 32200, 1650],
      ["mfs", 16100, 1650],
      ["mfsApart", 16100, 1650],
    ];
    for (const [fs, basic, each] of cases) {
      const d = standardDeduction(fs, 0, 0);
      expect(d.basic).toBe(basic);
      expect(standardDeduction(fs, 1, 0).each).toBe(each);
      expect(standardDeduction(fs, 1, 1).total).toBe(basic + 2 * each); // 65+ and blind = two boxes
    }
  });
  it("NIIT thresholds by status: 250,000 joint/QSS, 200,000 single/HOH, 125,000 separate (lived apart too)", () => {
    const nii = { iraDistributions: 400000, taxableInterest: 100000 };
    // NIIT = 3.8% × min(100,000, AGI 500,000 − threshold) = 3,800 everywhere here; use AGI just over each threshold instead.
    const at = (fs: Parameters<typeof computeFedTax>[0]["filingStatus"], threshold: number) =>
      computeFedTax({ filingStatus: fs, ssBenefits: 0, iraDistributions: threshold - 100000 + 10000, taxableInterest: 100000 }).niit;
    expect(at("mfj", 250000)).toBeCloseTo(380, 6);
    expect(at("qss", 250000)).toBeCloseTo(380, 6);
    expect(at("single", 200000)).toBeCloseTo(380, 6);
    expect(at("hoh", 200000)).toBeCloseTo(380, 6);
    expect(at("mfs", 125000)).toBeCloseTo(380, 6);
    expect(at("mfsApart", 125000)).toBeCloseTo(380, 6);
    expect(computeFedTax({ filingStatus: "single", ssBenefits: 0, ...nii }).niit).toBe(3800);
  });
  it("capital-gain 0% band ends at 66,200 (HOH), 98,900 (joint and surviving spouse), 49,450 (separate)", () => {
    expect(taxWithPreferential(66200, 66200, "hoh").pref.at0).toBe(66200);
    expect(taxWithPreferential(70000, 70000, "hoh").pref.at15).toBe(3800);
    expect(taxWithPreferential(98900, 98900, "qss").pref.at0).toBe(98900);
    expect(taxWithPreferential(60000, 60000, "mfsApart").pref.at15).toBe(10550);
  });
});

describe("Qualified Dividends and Capital Gain Tax Worksheet, line 25 (smaller of stacked vs. regular)", () => {
  it("gains wedged between the 0% band (49,450) and the top of the 12% bracket (50,400): regular rates are lower", () => {
    // TI 50,400 of which 900 qualified dividends. Stacked: 5,692 on 49,500 ordinary + 900 × 15% = 5,827.
    // Regular: 5,800. Line 25 takes 5,800 — and the result must say so, or "show the math" doesn't add up.
    const r = taxWithPreferential(50400, 900, "single");
    expect(r.ordinary).toBe(5692);
    expect(r.total).toBe(5800);
    expect(r.pref.usedRegularRates).toBe(true);
    expect(r.pref.tax).toBe(108);
  });
  it("normal case: stacked is lower and the flag is off", () => {
    expect(taxWithPreferential(60000, 20000, "single").pref.usedRegularRates).toBe(false);
  });
});

describe("surviving spouse (QSS): joint brackets, single thresholds", () => {
  it("SS base 25,000, senior threshold 75,000, joint rate schedule and joint standard deduction", () => {
    // SS 30,000 (L2 15,000) + IRA 40,000 → PI 55,000; taxable = min(25,500, 4,500 + 0.85 × 21,000 = 22,350) = 22,350.
    // AGI 62,350 (< 75,000 → full 6,000); deduction 32,200 + 1,650 = 33,850; TI 22,500 → 10% × 22,500 = 2,250 (joint 10% band to 24,800).
    const r = computeFedTax({ filingStatus: "qss", ssBenefits: 30000, iraDistributions: 40000, people65: 1 });
    expect(r.ss.taxable).toBeCloseTo(22350, 6);
    expect(r.deduction).toBe(33850);
    expect(r.senior.total).toBe(6000);
    expect(r.taxableIncome).toBe(22500);
    expect(r.totalTax).toBe(2250);
  });
});

describe("couple, both 65+, senior deduction phasing out inside the 85% zone", () => {
  it("22% × 1.85 × (1 + 2 × 6%) = 45.584% — the page's 'two people' column", () => {
    // SS 100,000 (L2 50,000) + IRA 80,000 → PI 130,000; taxable 6,000 + 0.85 × 86,000 = 79,100 (< 85,000 cap).
    // AGI 159,100 > 150,000 → each spouse's 6,000 − 6% × 9,100 = 5,454; TI 159,100 − 35,500 − 10,908 = 112,692 (22%).
    const inp = { filingStatus: "mfj" as const, ssBenefits: 100000, iraDistributions: 80000, people65: 2 };
    const r = computeFedTax(inp);
    expect(r.taxableIncome).toBeCloseTo(112692, 6);
    expect(r.bracket).toBe(0.22);
    const d = marginalDetail(inp);
    expect(d.ssPhaseIn).toBeCloseTo(0.85, 9);
    expect(d.seniorLoss).toBeCloseTo(0.111 * 2, 9);
    expect(d.rate).toBeCloseTo(0.22 * 1.85 * 1.12, 9);
  });
});

describe("robustness: inputs a browser can produce", () => {
  it("absurdly large but finite inputs never produce NaN or Infinity", () => {
    const r = computeFedTax({
      filingStatus: "mfj",
      ssBenefits: Number.MAX_VALUE,
      wages: Number.MAX_VALUE,
      pension: Number.MAX_VALUE,
      iraDistributions: Number.MAX_VALUE,
      taxableInterest: Number.MAX_VALUE,
      qualifiedDividendsLtcg: Number.MAX_VALUE,
      otherOrdinary: Number.MAX_VALUE,
      taxExemptInterest: Number.MAX_VALUE,
      people65: 2,
    });
    for (const v of [r.totalTax, r.agi, r.taxableIncome, r.effectiveRate, r.ss.taxable, r.niit]) expect(Number.isFinite(v)).toBe(true);
    expect(Number.isFinite(marginalDetail({ filingStatus: "single", ssBenefits: 30000, iraDistributions: Number.MAX_VALUE }).rate)).toBe(true);
  });
  it("empty / negative / NaN fields count as $0", () => {
    const r = computeFedTax({ filingStatus: "single", ssBenefits: -100, iraDistributions: Number.NaN, wages: -5, people65: Number.NaN });
    expect(r.totalTax).toBe(0);
    expect(r.standard.total).toBe(16100);
  });
  it("torpedoCurve always terminates: zero, negative, NaN steps and an infinite range", () => {
    const inp = { filingStatus: "single" as const, ssBenefits: 24000, people65: 1 };
    for (const opts of [{ step: 0 }, { step: -500 }, { step: Number.NaN }, { to: Infinity, step: Infinity }, { to: Number.MAX_VALUE }, { to: 1e9, step: 1 }]) {
      const pts = torpedoCurve(inp, opts);
      expect(pts.length).toBeGreaterThan(0);
      expect(pts.length).toBeLessThanOrEqual(TORPEDO_MAX_POINTS);
      for (const p of pts) expect(Number.isFinite(p.marginal)).toBe(true);
    }
    expect(torpedoCurve(inp, { from: 50000, to: 10000 })).toEqual([]);
  });
});

describe("W-4V helper boundaries", () => {
  it("an exact match picks that rate; no benefits → null", () => {
    expect(w4vRateToCover(3000, 30000, [0.07, 0.1, 0.12, 0.22])).toBe(0.1);
    expect(w4vRateToCover(500, 0, [0.07, 0.1, 0.12, 0.22])).toBeNull();
  });
});

describe("review additions: other filing statuses, phase-out endpoints, what lowers provisional income", () => {
  it("married filing separately, lived apart all year: single thresholds, $1,650 married add-on, no senior deduction", () => {
    // PI 12,000 + 25,000 = 37,000 → 85% × 3,000 + min(12,000, 4,500) = 7,050. AGI 32,050 − (16,100 + 1,650) = 14,300.
    const r = computeFedTax({ filingStatus: "mfsApart", ssBenefits: 24000, iraDistributions: 25000, people65: 1 });
    expect(r.ss.taxable).toBe(7050);
    expect(r.standard.total).toBe(17750);
    expect(r.senior.total).toBe(0);
    expect(r.taxableIncome).toBe(14300);
    expect(r.totalTax).toBe(1468); // 1,240 + 12% × 1,900
    expect(r.niitBase.threshold).toBe(125000);
  });

  it("head of household, 65+: $25,000 base, $2,050 add-on, $75,000 senior threshold", () => {
    // PI 15,000 + 30,000 = 45,000 → 9,350 + 4,500 = 13,850. AGI 43,850 − 26,200 − 6,000 = 11,650 → 10%.
    const r = computeFedTax({ filingStatus: "hoh", ssBenefits: 30000, pension: 30000, people65: 1 });
    expect(r.ss.taxable).toBe(13850);
    expect(r.standard.total).toBe(26200);
    expect(r.senior.total).toBe(6000);
    expect(r.totalTax).toBe(1165);
  });

  it("senior deduction is exactly $0 at $175,000 / $250,000 and $60 per person $1,000 below", () => {
    expect(seniorDeduction("single", 1, 175000).total).toBe(0);
    expect(seniorDeduction("single", 1, 174000).total).toBe(60);
    expect(seniorDeduction("mfj", 2, 250000).total).toBe(0);
    expect(seniorDeduction("mfj", 2, 249000).total).toBe(120);
    expect(seniorDeduction("single", 1, 1e12).total).toBe(0);
  });

  it("a QCD (IRA money that never enters income) lowers taxable Social Security; $10,000 inside the 85% zone saves 22.2%", () => {
    const base = { filingStatus: "single" as const, ssBenefits: 30000, people65: 1 };
    const before = computeFedTax({ ...base, iraDistributions: 40000 });
    const after = computeFedTax({ ...base, iraDistributions: 30000 });
    expect(before.ss.taxable).toBe(22350);
    expect(after.ss.taxable).toBe(13850);
    expect(before.totalTax).toBe(4336);
    expect(after.totalTax).toBe(2116);
    expect(before.totalTax - after.totalTax).toBeCloseTo(10000 * 0.12 * 1.85, 6);
  });

  it("itemized deductions never lower taxable benefits; Schedule 1 adjustments do", () => {
    const base = { filingStatus: "single" as const, ssBenefits: 24000, iraDistributions: 25000, people65: 1 };
    expect(computeFedTax({ ...base, itemizedDeductions: 30000 }).ss.taxable).toBe(7050);
    const adj = computeFedTax({ ...base, adjustments: 3000 });
    expect(adj.ss.provisionalIncome).toBe(34000);
    expect(adj.ss.taxable).toBe(4500);
    expect(adj.agi).toBe(26500);
  });
});
