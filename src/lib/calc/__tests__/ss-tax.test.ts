import { describe, expect, it } from "vitest";
import { taxableSocialSecurity, ssThresholds, worksheet1Labels, incomeRoom } from "../ss-tax";

/*
 * IRS Publication 915, Worksheet 1 ("Figuring Your Taxable Benefits"). The research files (docs/research/federal_tax.json,
 * verify_federal_tax.json) confirm the thresholds, rates and line structure but do not reproduce Pub 915's filled-in
 * examples. The three "Pub 915 example" cases below use the facts of the publication's long-running worked examples
 * (single filer "George White"; joint filers "Ray and Alice Hopkins"; joint filers "Joe and Betty Johnson"); every
 * line is re-derived by hand in the comments so each test stands on the statute (IRC §86) even if a figure differs
 * from a particular year's edition.
 */

describe("Pub 915 worked examples (Worksheet 1)", () => {
  it("single: pension 18,600 + wages 9,400 + interest 990; benefits 5,980 → 2,990 taxable", () => {
    // L1 5,980; L2 2,990; L3 28,990; L6 = 31,980; L8 = 31,980; L9 25,000; L10 6,980; L11 9,000; L12 0;
    // L13 6,980; L14 3,490; L15 min(2,990, 3,490) = 2,990; L16 0; L17 2,990; L18 5,083; L19 2,990.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 5980, otherIncome: 18600 + 9400 + 990 });
    expect(r.lines[8]).toBe(31980);
    expect(r.lines[10]).toBe(6980);
    expect(r.lines[14]).toBe(3490);
    expect(r.lines[18]).toBeCloseTo(5083, 6);
    expect(r.taxable).toBe(2990);
    expect(r.zone).toBe("fifty");
    expect(r.capHit).toBe("half"); // limited to one-half of benefits (line 15 = line 2)
  });

  it("joint: pension 15,500 + wages 14,000 + interest 250, IRA deduction 1,000; benefits 5,600 → none taxable", () => {
    // L2 2,800; L3 29,750; L6 32,550; L7 1,000; L8 31,550; L9 32,000 → line 9 is not less than line 8 → STOP.
    const r = taxableSocialSecurity({ filingStatus: "mfj", benefits: 5600, otherIncome: 15500 + 14000 + 250, adjustments: 1000 });
    expect(r.provisionalIncome).toBe(31550);
    expect(r.stoppedAt).toBe(10);
    expect(r.taxable).toBe(0);
    expect(r.zone).toBe("none");
  });

  it("joint (railroad SSEB): pension 38,000 + interest 2,500; benefits 10,000 → 6,275 taxable", () => {
    // L2 5,000; L3 40,500; L6 45,500; L8 45,500; L9 32,000; L10 13,500; L11 12,000; L12 1,500; L13 12,000;
    // L14 6,000; L15 min(5,000, 6,000) = 5,000; L16 0.85 × 1,500 = 1,275; L17 6,275; L18 8,500; L19 6,275.
    const r = taxableSocialSecurity({ filingStatus: "mfj", benefits: 10000, otherIncome: 38000 + 2500 });
    expect(r.lines[12]).toBe(1500);
    expect(r.lines[16]).toBeCloseTo(1275, 6);
    expect(r.taxable).toBeCloseTo(6275, 6);
    expect(r.zone).toBe("eightyFive");
  });
});

describe("thresholds (IRC §86(c)) by filing status", () => {
  it("base / adjusted base", () => {
    expect(ssThresholds("single")).toEqual({ base: 25000, adjustedBase: 34000, band: 9000 });
    expect(ssThresholds("hoh")).toEqual({ base: 25000, adjustedBase: 34000, band: 9000 });
    expect(ssThresholds("qss")).toEqual({ base: 25000, adjustedBase: 34000, band: 9000 });
    expect(ssThresholds("mfsApart")).toEqual({ base: 25000, adjustedBase: 34000, band: 9000 });
    expect(ssThresholds("mfj")).toEqual({ base: 32000, adjustedBase: 44000, band: 12000 });
    expect(ssThresholds("mfs")).toEqual({ base: 0, adjustedBase: 0, band: 0 });
  });

  it("provisional income exactly at the base amount → nothing taxable; $2 over → $1 taxable", () => {
    // Single, benefits 20,000 → L2 10,000; other 15,000 → L8 25,000 = base → STOP at line 10.
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: 20000, otherIncome: 15000 }).taxable).toBe(0);
    // other 15,002 → L8 25,002; L10 2; L13 2; L14 1; L15 1.
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: 20000, otherIncome: 15002 }).taxable).toBe(1);
  });

  it("exactly at the adjusted base: tier 1 maxes at half the band (single 4,500; joint 6,000)", () => {
    // Single: benefits 30,000 → L2 15,000; other 19,000 → L8 34,000; L10 9,000; L12 0; L14 4,500; L15 4,500.
    const s = taxableSocialSecurity({ filingStatus: "single", benefits: 30000, otherIncome: 19000 });
    expect(s.taxable).toBe(4500);
    expect(s.zone).toBe("fifty");
    // Joint: benefits 40,000 → L2 20,000; other 24,000 → L8 44,000; L10 12,000; L14 6,000.
    expect(taxableSocialSecurity({ filingStatus: "mfj", benefits: 40000, otherIncome: 24000 }).taxable).toBe(6000);
  });

  it("joint at 32,000 provisional income → nothing taxable", () => {
    // benefits 24,000 → L2 12,000; other 20,000 → L8 32,000 = base.
    expect(taxableSocialSecurity({ filingStatus: "mfj", benefits: 24000, otherIncome: 20000 }).taxable).toBe(0);
  });

  it("tax-exempt interest counts in provisional income", () => {
    // Single, benefits 24,000 (L2 12,000), IRA 10,000, muni interest 8,000 → L8 30,000; L10 5,000; L14 2,500.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 24000, otherIncome: 10000, taxExemptInterest: 8000 });
    expect(r.lines[4]).toBe(8000);
    expect(r.provisionalIncome).toBe(30000);
    expect(r.taxable).toBe(2500);
  });
});

describe("85% tier and the 85% cap", () => {
  it("single, benefits 24,000, other 25,000 → 7,050", () => {
    // L2 12,000; L8 37,000; L10 12,000; L12 3,000; L13 9,000; L14 4,500; L15 4,500; L16 2,550; L17 7,050; L18 20,400.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 24000, otherIncome: 25000 });
    expect(r.taxable).toBeCloseTo(7050, 6);
    expect(r.taxablePct).toBeCloseTo(7050 / 24000, 9);
    expect(r.capHit).toBeNull();
  });

  it("high income: never more than 85% of benefits", () => {
    // Single, benefits 30,000, other 100,000 → L8 115,000; L12 81,000; L16 68,850; L17 73,350; L18 25,500 → 25,500.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 30000, otherIncome: 100000 });
    expect(r.lines[17]).toBeCloseTo(73350, 6);
    expect(r.taxable).toBeCloseTo(25500, 6);
    expect(r.taxablePct).toBeCloseTo(0.85, 9);
    expect(r.capHit).toBe("max85");
  });

  it("joint couple with 40,000 benefits and 30,000 IRA → 11,100", () => {
    // L2 20,000; L8 50,000; L10 18,000; L12 6,000; L13 12,000; L14 6,000; L15 6,000; L16 5,100; L17 11,100; L18 34,000.
    expect(taxableSocialSecurity({ filingStatus: "mfj", benefits: 40000, otherIncome: 30000 }).taxable).toBeCloseTo(11100, 6);
  });
});

describe("married filing separately", () => {
  it("lived with spouse at any time: base $0 → 85% of provisional income, capped at 85% of benefits", () => {
    // Benefits 20,000 (L2 10,000), other 10,000 → L8 20,000; L17 = 0.85 × 20,000 = 17,000; L18 17,000 → 17,000.
    const a = taxableSocialSecurity({ filingStatus: "mfs", benefits: 20000, otherIncome: 10000 });
    expect(a.lines[9]).toBeNull();
    expect(a.lines[17]).toBeCloseTo(17000, 6);
    expect(a.taxable).toBeCloseTo(17000, 6);
    expect(a.mfsLivedWithSpouse).toBe(true);
    // Benefits 30,000 (L2 15,000), other 5,000 → L8 20,000; L17 17,000; L18 25,500 → 17,000.
    expect(taxableSocialSecurity({ filingStatus: "mfs", benefits: 30000, otherIncome: 5000 }).taxable).toBeCloseTo(17000, 6);
    // No other income at all: L8 = ½ of benefits 6,000 → 85% × 6,000 = 5,100 is taxable.
    expect(taxableSocialSecurity({ filingStatus: "mfs", benefits: 12000, otherIncome: 0 }).taxable).toBeCloseTo(5100, 6);
  });

  it("lived apart all year: same thresholds as single", () => {
    const apart = taxableSocialSecurity({ filingStatus: "mfsApart", benefits: 24000, otherIncome: 25000 });
    const single = taxableSocialSecurity({ filingStatus: "single", benefits: 24000, otherIncome: 25000 });
    expect(apart.taxable).toBe(single.taxable);
  });
});

describe("edge cases", () => {
  it("no benefits (or repayments ≥ benefits) → 0", () => {
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: 0, otherIncome: 90000 }).taxable).toBe(0);
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: -500, otherIncome: 90000 }).taxable).toBe(0);
  });
  it("adjustments ≥ line 6 → STOP at line 8", () => {
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 10000, otherIncome: 1000, adjustments: 6000 });
    expect(r.stoppedAt).toBe(8);
    expect(r.taxable).toBe(0);
  });
  it("benefits only, no other income → nothing taxable for a single filer", () => {
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: 48000, otherIncome: 0 }).taxable).toBe(0);
  });
  it("taxable never decreases as other income rises (monotone)", () => {
    let prev = -1;
    for (let other = 0; other <= 120000; other += 500) {
      const t = taxableSocialSecurity({ filingStatus: "mfj", benefits: 36000, otherIncome: other }).taxable;
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
  it("labels come from the inclusion-rate parameters", () => {
    const l = worksheet1Labels();
    expect(l[2]).toBe("50% of line 1");
    expect(l[16]).toBe("85% of line 12");
  });
});

describe("income head-room before each threshold", () => {
  it("single below the base: room to $25,000 and to $34,000", () => {
    // Benefits 20,000 → L2 10,000; other 10,000 → PI 20,000 → 5,000 to the base, 14,000 to the adjusted base.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 20000, otherIncome: 10000 });
    expect(incomeRoom(r)).toEqual({ toBase: 5000, toAdjusted: 14000 });
    // Adding exactly that room keeps benefits untaxed; $1 more starts the 50% tier.
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: 20000, otherIncome: 15000 }).taxable).toBe(0);
  });
  it("joint in the 50% tier: no room to the base, some to $44,000", () => {
    // Benefits 40,000 → L2 20,000; other 20,000 → PI 40,000.
    const r = taxableSocialSecurity({ filingStatus: "mfj", benefits: 40000, otherIncome: 20000 });
    expect(incomeRoom(r)).toEqual({ toBase: null, toAdjusted: 4000 });
  });
  it("past both thresholds, or no benefits → null", () => {
    expect(incomeRoom(taxableSocialSecurity({ filingStatus: "mfj", benefits: 48000, otherIncome: 40000 }))).toEqual({ toBase: null, toAdjusted: null });
    expect(incomeRoom(taxableSocialSecurity({ filingStatus: "single", benefits: 0, otherIncome: 1000 }))).toEqual({ toBase: null, toAdjusted: null });
  });
  it("adjustments larger than line 6 leave extra room (worksheet stops at line 8)", () => {
    // L6 = 5,000 + 1,000 = 6,000; L7 = 8,000 → effective PI −2,000 → 27,000 to the base.
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 10000, otherIncome: 1000, adjustments: 8000 });
    expect(r.stoppedAt).toBe(8);
    expect(incomeRoom(r).toBase).toBe(27000);
  });
});

/*
 * Adversarial review additions. The closed form below is the one written down in docs/research/federal_tax.json
 * (rule "Taxable Social Security benefits formula (IRC §86 / Pub 915 Worksheet 1)", confirmed line by line in
 * verify_federal_tax.json): T1 = min(0.5B, 0.5·min(PI − A1, D)); T2 = 0.85·max(0, PI − A2); taxable = min(T1 + T2, 0.85B);
 * MFS who lived with the spouse: min(0.85·PI, 0.85·B). It is typed out independently of the engine on purpose.
 */
describe("worksheet = the research file's closed-form §86 formula (grid check)", () => {
  const A: Record<string, [number, number]> = {
    single: [25000, 34000],
    hoh: [25000, 34000],
    qss: [25000, 34000],
    mfsApart: [25000, 34000],
    mfj: [32000, 44000],
    mfs: [0, 0],
  };
  const closedForm = (fs: string, B: number, other: number, tei: number, adj: number) => {
    if (B <= 0) return 0;
    const pi = 0.5 * B + other + tei - adj;
    if (pi <= 0) return 0;
    if (fs === "mfs") return Math.min(0.85 * pi, 0.85 * B);
    const [a1, a2] = A[fs];
    if (pi <= a1) return 0;
    const t1 = Math.min(0.5 * B, 0.5 * Math.min(pi - a1, a2 - a1));
    const t2 = 0.85 * Math.max(0, pi - a2);
    return Math.min(t1 + t2, 0.85 * B);
  };
  it("matches for every filing status across benefits, other income, tax-exempt interest and adjustments", () => {
    let checked = 0;
    for (const fs of Object.keys(A) as (keyof typeof A)[]) {
      for (const B of [0, 4000, 12000, 18000, 26000, 40000, 62000, 110000]) {
        for (const other of [0, 3000, 9000, 15000, 21000, 26500, 33000, 47000, 80000, 250000]) {
          for (const [tei, adj] of [
            [0, 0],
            [6000, 0],
            [0, 4000],
            [2500, 7000],
          ]) {
            const r = taxableSocialSecurity({ filingStatus: fs as never, benefits: B, otherIncome: other, taxExemptInterest: tei, adjustments: adj });
            expect(r.taxable).toBeCloseTo(closedForm(fs, B, other, tei, adj), 6);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(6 * 8 * 10 * 4);
  });
});

describe("married filing separately (lived together) edge cases", () => {
  it("lines 9–16 are skipped (null) and the worksheet can still stop at line 8", () => {
    const a = taxableSocialSecurity({ filingStatus: "mfs", benefits: 20000, otherIncome: 3000 });
    for (const n of [9, 10, 11, 12, 13, 14, 15, 16] as const) expect(a.lines[n]).toBeNull();
    // L6 = 10,000 + 1,000 = 11,000; adjustments 11,000 → line 7 is not less than line 6 → STOP.
    const b = taxableSocialSecurity({ filingStatus: "mfs", benefits: 20000, otherIncome: 1000, adjustments: 11000 });
    expect(b.stoppedAt).toBe(8);
    expect(b.taxable).toBe(0);
  });
  it("head-room is null once any provisional income exists (base amount $0); positive only while adjustments swallow line 6", () => {
    expect(incomeRoom(taxableSocialSecurity({ filingStatus: "mfs", benefits: 20000, otherIncome: 0 }))).toEqual({ toBase: null, toAdjusted: null });
    // L6 6,000; L7 8,000 → effective −2,000 → 2,000 of extra income before anything becomes taxable.
    expect(incomeRoom(taxableSocialSecurity({ filingStatus: "mfs", benefits: 10000, otherIncome: 1000, adjustments: 8000 }))).toEqual({
      toBase: 2000,
      toAdjusted: 2000,
    });
  });
});

describe("robustness: inputs a browser can produce", () => {
  it("NaN / Infinity / undefined optional lines are treated as 0, never NaN out", () => {
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 30000, otherIncome: Number.NaN, taxExemptInterest: Infinity, adjustments: undefined });
    expect(r.taxable).toBe(0);
    expect(Number.isFinite(r.provisionalIncome)).toBe(true);
    expect(taxableSocialSecurity({ filingStatus: "single", benefits: Number.NaN, otherIncome: 50000 }).taxable).toBe(0);
  });
  it("very large incomes: still exactly 85% of benefits", () => {
    const r = taxableSocialSecurity({ filingStatus: "mfj", benefits: 60000, otherIncome: 1e12 });
    expect(r.taxable).toBeCloseTo(51000, 6);
    expect(r.capHit).toBe("max85");
  });
});

describe("review additions: exactly at the base amount", () => {
  it("provisional income exactly $25,000: worksheet stops at line 10, room to base is $0 and to the adjusted base $9,000", () => {
    const r = taxableSocialSecurity({ filingStatus: "single", benefits: 20000, otherIncome: 15000 });
    expect(r.provisionalIncome).toBe(25000);
    expect(r.taxable).toBe(0);
    expect(r.stoppedAt).toBe(10);
    expect(incomeRoom(r)).toEqual({ toBase: 0, toAdjusted: 9000 });
  });
  it("joint exactly $44,000 with small benefits: tier 1 limited to half of benefits (line 15 = line 2)", () => {
    // benefits 8,000 → line 2 = 4,000; other 40,000 → PI 44,000; line 13 = 12,000 → line 14 = 6,000 → line 15 = 4,000.
    const r = taxableSocialSecurity({ filingStatus: "mfj", benefits: 8000, otherIncome: 40000 });
    expect(r.lines[15]).toBe(4000);
    expect(r.lines[16]).toBe(0);
    expect(r.taxable).toBe(4000);
    expect(r.capHit).toBe("half");
    expect(r.zone).toBe("fifty");
  });
});
