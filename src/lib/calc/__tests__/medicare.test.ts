import { describe, expect, it } from "vitest";
import {
  irmaaTier,
  nextIrmaaLine,
  tierUncertain2027,
  partBWithPenalty,
  partDPenalty,
  partDPenaltyRaw,
  partAPremium,
  holdHarmless,
  holdHarmlessFor,
  holdHarmlessBasis,
  holdHarmlessBreakEvenBenefit,
  benefitAfterCola,
  computeMedicare,
  compareYears,
  averagePlanPremium,
  fullYearsLate,
  schedule,
  tierRange,
  type PersonInput,
} from "../medicare";
import { roundDownToDollar } from "../dates";

const person = (o: Partial<PersonInput> = {}): PersonInput => ({
  lateBMonths: 0,
  lateDMonths: 0,
  partAQuarters: "40",
  partALatePenalty: false,
  ssBenefit2026: 0,
  ...o,
});

describe("Part B late-enrollment penalty (42 CFR 408.22–408.27)", () => {
  it("Medicare.gov 2026 example: 24 months late → 20% → $202.90 + $40.58 = $243.48 → $243.50", () => {
    expect(partBWithPenalty(202.9, 24)).toBe(243.5);
  });
  it("only FULL 12-month periods count", () => {
    expect(fullYearsLate(11)).toBe(0);
    expect(fullYearsLate(12)).toBe(1);
    expect(fullYearsLate(23)).toBe(1);
    expect(fullYearsLate(35)).toBe(2);
    expect(partBWithPenalty(202.9, 11)).toBe(202.9);
    expect(partBWithPenalty(202.9, 12)).toBe(223.2); // 223.19 → 223.20
    expect(partBWithPenalty(202.9, 36)).toBe(263.8); // 263.77 → 263.80
  });
  it("2027 projected standard premium: 24 months → $209.50 × 1.2 = $251.40", () => {
    expect(partBWithPenalty(209.5, 24)).toBe(251.4);
  });
  it("penalty sits on the standard premium; IRMAA is added after", () => {
    const r = computeMedicare({
      year: 2026,
      filing: "single",
      magi: 150000,
      coverage: "orig",
      planPremium: null,
      people: [person({ lateBMonths: 24 })],
    });
    expect(r.persons[0].tier).toBe(2);
    expect(r.persons[0].partB.penalty).toBe(40.6);
    expect(r.persons[0].partB.total).toBe(446.4); // 243.50 + 202.90
  });
});

describe("Part D late-enrollment penalty (42 CFR 423.286(d)(3); Medicare.gov 11222)", () => {
  it("17 months in 2026: 1% × $38.99 × 17 = $6.63 → $6.60", () => {
    expect(partDPenalty(2026, 17)).toBe(6.6);
  });
  it("14 months in 2027: 1% × $41.33 × 14 = $5.79 → $5.80 (and $5.50 in 2026)", () => {
    expect(partDPenalty(2027, 14)).toBe(5.8);
    expect(partDPenalty(2026, 14)).toBe(5.5);
  });
  it("raw (unrounded) amount for show-the-math", () => {
    expect(partDPenaltyRaw(2026, 17)).toBeCloseTo(6.6283, 4);
    expect(partDPenaltyRaw(2027, 14)).toBeCloseTo(5.7862, 4);
    expect(partDPenaltyRaw(2027, 14.9)).toBeCloseTo(5.7862, 4); // only full months count
  });
  it("is recalculated each year from that year's base premium", () => {
    expect(partDPenalty(2026, 30)).toBe(11.7); // 0.30 × 38.99 = 11.697
    expect(partDPenalty(2027, 30)).toBe(12.4); // 0.30 × 41.33 = 12.399
  });
  it("no penalty without uncovered months; penalty only applies with Part D coverage", () => {
    expect(partDPenalty(2027, 0)).toBe(0);
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 50000,
      coverage: "orig",
      planPremium: null,
      people: [person({ lateDMonths: 30 })],
    });
    expect(r.persons[0].partD.penalty).toBe(0);
    expect(r.persons[0].partD.has).toBe(false);
  });
});

describe("IRMAA tier lookup (POMS HI 01101.020 boundaries)", () => {
  const s26 = schedule(2026);
  it("individual: ≤ bound stays in the lower tier; 80% tier is < $500,000; 85% at ≥ $500,000", () => {
    expect(irmaaTier(s26, "single", 109000)).toBe(0);
    expect(irmaaTier(s26, "single", 109001)).toBe(1);
    expect(irmaaTier(s26, "single", 137000)).toBe(1);
    expect(irmaaTier(s26, "single", 137001)).toBe(2);
    expect(irmaaTier(s26, "single", 171000)).toBe(2);
    expect(irmaaTier(s26, "single", 205000)).toBe(3);
    expect(irmaaTier(s26, "single", 205001)).toBe(4);
    expect(irmaaTier(s26, "single", 499999)).toBe(4);
    expect(irmaaTier(s26, "single", 500000)).toBe(5);
  });
  it("joint", () => {
    expect(irmaaTier(s26, "mfj", 218000)).toBe(0);
    expect(irmaaTier(s26, "mfj", 218001)).toBe(1);
    expect(irmaaTier(s26, "mfj", 410000)).toBe(3);
    expect(irmaaTier(s26, "mfj", 749999)).toBe(4);
    expect(irmaaTier(s26, "mfj", 750000)).toBe(5);
  });
  it("married filing separately, lived with spouse: none → 80% → 85% at $391,000", () => {
    expect(irmaaTier(s26, "mfs", 109000)).toBe(0);
    expect(irmaaTier(s26, "mfs", 109001)).toBe(4);
    expect(irmaaTier(s26, "mfs", 390999)).toBe(4);
    expect(irmaaTier(s26, "mfs", 391000)).toBe(5);
  });
  it("2026 amounts by tier match the CMS table (Part B total and Part D add-on)", () => {
    const totals = [202.9, 284.1, 405.8, 527.5, 649.2, 689.9];
    const magis = [100000, 120000, 150000, 190000, 300000, 600000];
    magis.forEach((m, i) => {
      const r = computeMedicare({
        year: 2026,
        filing: "single",
        magi: m,
        coverage: "orig_d",
        planPremium: 0,
        people: [person()],
      });
      expect(r.persons[0].partB.total).toBe(totals[i]);
      expect(r.persons[0].partD.irmaa).toBe([0, 14.5, 37.5, 60.4, 83.3, 91][i]);
    });
  });
  it("2027 projected table: first line $112,000 / $224,000; Trustees amounts", () => {
    const s27 = schedule(2027);
    expect(irmaaTier(s27, "single", 112000)).toBe(0);
    expect(irmaaTier(s27, "single", 112001)).toBe(1);
    expect(irmaaTier(s27, "mfj", 224001)).toBe(1);
    expect(irmaaTier(s27, "mfs", 388000)).toBe(5);
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 600000,
      coverage: "orig_d",
      planPremium: 0,
      people: [person()],
    });
    expect(r.persons[0].partB.total).toBe(712.1);
    expect(r.persons[0].partD.irmaa).toBe(96.4);
  });
  it("2027 tiers 2–4 are uncertain within $1,000 (missing October 2025 CPI-U)", () => {
    expect(tierUncertain2027("single", 141500)).toBe(true); // tier 1 with 142k bound, tier 2 with 141k
    expect(tierUncertain2027("single", 140000)).toBe(false);
    expect(tierUncertain2027("single", 112500)).toBe(false); // first line is the same in both scenarios
    expect(tierUncertain2027("mfj", 283000)).toBe(true);
    expect(tierUncertain2027("mfs", 200000)).toBe(false);
  });
  it("next IRMAA line: headroom and the cost of crossing it", () => {
    const n = nextIrmaaLine(schedule(2026), "single", 105000)!;
    expect(n.next).toBe(1);
    expect(n.headroom).toBe(4000);
    expect(n.extraPartB).toBe(81.2);
    expect(n.extraPartD).toBe(14.5);
    const top = nextIrmaaLine(schedule(2026), "mfj", 700000)!;
    expect(top.next).toBe(5);
    expect(top.headroom).toBe(49999);
    expect(nextIrmaaLine(schedule(2026), "single", 800000)).toBeNull();
    const mfs = nextIrmaaLine(schedule(2026), "mfs", 100000)!;
    expect(mfs.next).toBe(4);
    expect(mfs.extraPartB).toBe(446.3);
  });
});

describe("Part A premium (fewer than 40 quarters)", () => {
  it("2026: $565 under 30 quarters, $311 with 30–39, $0 with 40+", () => {
    expect(partAPremium(2026, "0", false).total).toBe(565);
    expect(partAPremium(2026, "30", false).total).toBe(311);
    expect(partAPremium(2026, "40", true).total).toBe(0);
  });
  it("10% late penalty", () => {
    expect(partAPremium(2026, "0", true)).toEqual({
      premium: 565,
      penalty: 56.5,
      total: 621.5,
    });
    expect(partAPremium(2026, "30", true).total).toBe(342.1);
    expect(partAPremium(2027, "0", false).total).toBe(600); // projected
  });
});

describe("hold-harmless (SSA Act §1839(f), 42 U.S.C. §1395r(f); payable amounts rounded down to $1, 20 CFR 404.304(f))", () => {
  it("protected: Part B rises only enough to keep the payment from shrinking (prior premium already held harmless)", () => {
    // Paid $194.00 in 2026 on a $300.00 benefit → December payment $106. January benefit $310.80 (3.6% COLA, down to the dime).
    const h = holdHarmless({
      priorBenefit: 300,
      newBenefit: benefitAfterCola(300, 3.6),
      priorPremium: 194,
      newStandard: 209.5,
      paysIrmaa: false,
    });
    expect(h.newBenefit).toBe(310.8);
    expect(h.decPayment).toBe(106);
    expect(h.cap).toBe(204.8);
    expect(h.protected).toBe(true);
    expect(h.standardPaid).toBe(204.8);
    expect(roundDownToDollar(h.newBenefit - h.standardPaid)).toBe(h.decPayment); // payment unchanged
  });
  it("typical benefit: the COLA covers the increase, full premium", () => {
    const h = holdHarmless({
      priorBenefit: 2000,
      newBenefit: benefitAfterCola(2000, 3.6),
      priorPremium: 202.9,
      newStandard: 209.5,
      paysIrmaa: false,
    });
    expect(h.protected).toBe(false);
    expect(h.reason).toBe("cola-covers");
    expect(h.standardPaid).toBe(209.5);
  });
  it("a benefit that doesn't cover last December's premium leaves a $0 payment — nothing to protect", () => {
    const h = holdHarmless({
      priorBenefit: 150,
      newBenefit: 155.4,
      priorPremium: 202.9,
      newStandard: 209.5,
      paysIrmaa: false,
    });
    expect(h.decPayment).toBe(0);
    expect(h.protected).toBe(false);
    expect(h.reason).toBe("too-small");
    expect(h.standardPaid).toBe(209.5);
  });
  it("IRMAA payers are never protected", () => {
    const h = holdHarmless({
      priorBenefit: 300,
      newBenefit: 310.8,
      priorPremium: 194,
      newStandard: 209.5,
      paysIrmaa: true,
    });
    expect(h.protected).toBe(false);
    expect(h.reason).toBe("irmaa");
  });
  it("2027: nobody who paid the full $202.90 in 2026 can be protected (3.6% of $202.90 = $7.30 > the projected $6.60 rise)", () => {
    for (let b = 1; b <= 3000; b += 0.7) {
      const h = holdHarmless({
        priorBenefit: b,
        newBenefit: benefitAfterCola(b, 3.6),
        priorPremium: 202.9,
        newStandard: 209.5,
        paysIrmaa: false,
      });
      expect(h.protected, `benefit ${b}`).toBe(false);
    }
  });
  it("2027 basis: $202.90 → projected $209.50 with the official 3.6% COLA", () => {
    const b = holdHarmlessBasis(2027);
    expect(b).toMatchObject({
      priorStandard: 202.9,
      newStandard: 209.5,
      colaPct: 3.6,
    });
    expect(
      Math.round(
        holdHarmlessBreakEvenBenefit(
          b.newStandard - b.priorStandard,
          b.colaPct,
        ),
      ),
    ).toBe(183);
  });
  it("2026: $185.00 → $202.90 with the 2.8% COLA; a $500 benefit (≈ $486.38 in 2025) pays $199.00", () => {
    const b = holdHarmlessBasis(2026);
    expect(b).toMatchObject({
      priorStandard: 185,
      newStandard: 202.9,
      colaPct: 2.8,
    });
    const h = holdHarmlessFor(2026, 500, false);
    expect(h.priorBenefit).toBe(486.38);
    expect(h.colaRaise).toBe(13.62);
    expect(h.decPayment).toBe(301); // $486.38 − $185.00 = $301.38 → $301
    expect(h.protected).toBe(true);
    expect(h.standardPaid).toBe(199); // $500.00 − $301 keeps the payment at $301
    expect(Math.round(holdHarmlessBreakEvenBenefit(17.9, 2.8))).toBe(639);
    expect(holdHarmlessFor(2026, 1500, false).protected).toBe(false);
    expect(holdHarmlessFor(2026, 150, false).reason).toBe("too-small"); // ≈ $145.91 in 2025 didn't cover $185.00
  });
  it("2027 builds on the 2026 result: $300 in 2026 → $194.00 in 2026 → $204.80 in 2027", () => {
    const h = holdHarmlessFor(2027, 300, false);
    expect(h.previous?.protected).toBe(true);
    expect(h.previous?.standardPaid).toBe(194); // 300/1.028 = 291.83; 291.83 − 185 → $106; 300 − 106
    expect(h.priorPremium).toBe(194);
    expect(h.premiumIncrease).toBe(15.5);
    expect(h.protected).toBe(true);
    expect(h.standardPaid).toBe(204.8);
    // A $1,000 benefit wasn't protected in 2026 and isn't in 2027.
    const big = holdHarmlessFor(2027, 1000, false);
    expect(big.previous?.protected).toBe(false);
    expect(big.protected).toBe(false);
    expect(big.standardPaid).toBe(209.5);
  });
  it("not protected when Part B wasn't already coming out of the December 2025 check (new enrollees)", () => {
    const h = holdHarmlessFor(2027, 300, false, false);
    expect(h.protected).toBe(false);
    expect(h.reason).toBe("not-eligible");
    expect(h.standardPaid).toBe(209.5);
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 20000,
      coverage: "orig",
      planPremium: null,
      people: [person({ ssBenefit2026: 300, hhEligible: false })],
    });
    expect(r.persons[0].partB.total).toBe(209.5);
  });
  it("applied in the 2027 calculation; late penalty still on the full standard premium", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 20000,
      coverage: "orig",
      planPremium: null,
      people: [person({ ssBenefit2026: 300, lateBMonths: 12 })],
    });
    const p = r.persons[0];
    expect(p.partB.standardCharged).toBe(204.8);
    // Penalty on the full standard premium: $209.50 × 1.1 = $230.45 → $230.50 (odd 5 cents round up) → +$21.00.
    expect(p.partB.penalty).toBe(21);
    expect(p.partB.total).toBe(225.8);
    expect(p.ss?.holdHarmless?.protected).toBe(true);
    expect(p.ss?.covers).toBe(true);
    expect(p.ss?.netCheck).toBe(85); // $310.80 − $225.80
  });
  it("IRMAA in the premium year switches protection off in both steps", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 150000,
      coverage: "orig",
      planPremium: null,
      people: [person({ ssBenefit2026: 300 })],
    });
    expect(r.persons[0].ss?.holdHarmless?.reason).toBe("irmaa");
    expect(r.persons[0].partB.total).toBe(418.9);
  });
});

describe("household totals", () => {
  it("couple filing jointly, 2026, $300,000 MAGI: both in tier 2", () => {
    const r = computeMedicare({
      year: 2026,
      filing: "mfj",
      magi: 300000,
      coverage: "orig_d",
      planPremium: 40,
      people: [person(), person()],
    });
    expect(r.persons.map((p) => p.tier)).toEqual([2, 2]);
    expect(r.persons[0].partB.total).toBe(405.8);
    expect(r.persons[0].partD.total).toBe(77.5); // 40 + 37.50
    expect(r.persons[0].totalMonthly).toBe(483.3);
    expect(r.totalMonthly).toBe(966.6);
    expect(r.annual).toBe(11599.2);
    expect(r.fromSsCheck).toBe(886.6); // 2 × (405.80 + 37.50)
    expect(r.rebate).toBe(0); // IRMAA payers don't get the $90 rebate
  });
  it("couple filing separately keeps each person's own MAGI and penalties", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 90000,
      coverage: "orig_d",
      planPremium: null,
      people: [
        person({ lateDMonths: 14 }),
        person({ magi: 130000, lateBMonths: 24 }),
      ],
    });
    expect(r.planPremiumUsed).toBe(averagePlanPremium(2027, "orig_d"));
    expect(r.persons[0].tier).toBe(0);
    expect(r.persons[0].partD.penalty).toBe(5.8);
    expect(r.persons[1].tier).toBe(1);
    expect(r.persons[1].partB.total).toBe(335.1); // 251.40 + 83.70
  });
  it("2026: one-time $90 rebate for Original Medicare without IRMAA; none for Medicare Advantage", () => {
    const orig = computeMedicare({
      year: 2026,
      filing: "mfj",
      magi: 100000,
      coverage: "orig_d",
      planPremium: 30,
      people: [person(), person()],
    });
    expect(orig.rebate).toBe(180);
    expect(orig.netAnnualAfterRebate).toBe(roundTo2(orig.annual - 180));
    const ma = computeMedicare({
      year: 2026,
      filing: "mfj",
      magi: 100000,
      coverage: "ma",
      planPremium: 0,
      people: [person(), person()],
    });
    expect(ma.rebate).toBe(0);
    expect(ma.persons[0].totalMonthly).toBe(202.9); // $0 plan: Part B is still paid
  });
  it("Social Security check after deductions (2027 benefit gets the 3.6% COLA, payment rounded down to $1)", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 50000,
      coverage: "orig_d",
      planPremium: 36,
      people: [person({ ssBenefit2026: 2000 })],
    });
    expect(r.persons[0].ss?.benefit).toBe(2072);
    expect(r.persons[0].ss?.netCheck).toBe(1862); // 2072 − 209.50
  });
  it("2026 vs 2027 comparison", () => {
    const c = compareYears({
      filing: "single",
      magi: 50000,
      coverage: "orig",
      planPremium: null,
      people: [person()],
    });
    expect(c.y2026.totalMonthly).toBe(202.9);
    expect(c.y2027.totalMonthly).toBe(209.5);
    expect(c.monthlyChange).toBe(6.6);
    expect(c.annualChange).toBe(79.2);
  });
});

describe("2027 projected IRMAA boundaries (Scenario A thresholds, CPI-U indexing)", () => {
  const s27 = schedule(2027);
  it("individual and joint lines are ≤ inclusive; 80% tier < $500,000 / $750,000", () => {
    const ind: [number, number][] = [
      [142000, 1],
      [142001, 2],
      [177000, 2],
      [177001, 3],
      [212000, 3],
      [212001, 4],
      [499999.99, 4],
      [500000, 5],
    ];
    ind.forEach(([m, t]) =>
      expect(irmaaTier(s27, "single", m), String(m)).toBe(t),
    );
    const joint: [number, number][] = [
      [224000, 0],
      [284000, 1],
      [284001, 2],
      [354001, 3],
      [424001, 4],
      [750000, 5],
    ];
    joint.forEach(([m, t]) =>
      expect(irmaaTier(s27, "mfj", m), String(m)).toBe(t),
    );
  });
  it("married filing separately: ≤ $112,000 none; 80% tier to < $388,000; 85% at ≥ $388,000", () => {
    expect(irmaaTier(s27, "mfs", 112000)).toBe(0);
    expect(irmaaTier(s27, "mfs", 112000.01)).toBe(4);
    expect(irmaaTier(s27, "mfs", 387999)).toBe(4);
  });
  it("tier ranges for show-the-math", () => {
    expect(tierRange(s27, "single", 0)).toEqual({ atMost: 112000 });
    expect(tierRange(s27, "single", 2)).toEqual({
      over: 142000,
      atMost: 177000,
    });
    expect(tierRange(s27, "single", 4)).toEqual({
      over: 212000,
      under: 500000,
    });
    expect(tierRange(s27, "mfs", 4)).toEqual({ over: 112000, under: 388000 });
    expect(tierRange(s27, "mfj", 5)).toEqual({ atLeast: 750000 });
  });
});

describe("inputs from forms and shared links never produce NaN", () => {
  it("blank / NaN MAGI is treated as $0, not the top IRMAA tier", () => {
    expect(irmaaTier(schedule(2026), "single", Number.NaN)).toBe(0);
    const r = computeMedicare({
      year: 2026,
      filing: "single",
      magi: Number.NaN,
      coverage: "orig_d",
      planPremium: Number.NaN,
      people: [
        person({
          lateBMonths: Number.NaN,
          lateDMonths: Number.NaN,
          ssBenefit2026: Number.NaN,
        }),
      ],
    });
    const p = r.persons[0];
    expect(p.tier).toBe(0);
    expect(r.planPremiumIsAverage).toBe(true);
    expect(Number.isFinite(r.totalMonthly)).toBe(true);
    expect(r.totalMonthly).toBe(
      roundTo2(202.9 + averagePlanPremium(2026, "orig_d")),
    );
    expect(p.ss).toBeNull();
  });
  it("negative inputs are clamped", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "mfj",
      magi: -50000,
      coverage: "orig_d",
      planPremium: -20,
      people: [
        person({ lateBMonths: -30, lateDMonths: -5, ssBenefit2026: -100 }),
      ],
    });
    const p = r.persons[0];
    expect(p.magi).toBe(0);
    expect(p.partB.total).toBe(209.5);
    expect(p.partD.total).toBe(0);
    expect(p.ss).toBeNull();
    expect(nextIrmaaLine(schedule(2026), "single", -50000)?.headroom).toBe(
      109000,
    );
    expect(partDPenaltyRaw(2026, Number.NaN)).toBe(0);
    expect(fullYearsLate(Number.NaN)).toBe(0);
  });
  it("huge numbers stay finite and land in the top tier", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 1e12,
      coverage: "ma",
      planPremium: 0,
      people: [person({ lateBMonths: 600 })],
    });
    expect(r.persons[0].tier).toBe(5);
    expect(r.persons[0].partB.penaltyPct).toBe(5); // 50 full years × 10%
    expect(Number.isFinite(r.annual)).toBe(true);
  });
  it("a benefit smaller than the deductions is flagged (the rest is billed); the payment never goes negative", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 20000,
      coverage: "orig",
      planPremium: null,
      people: [person({ ssBenefit2026: 150 })],
    });
    const ss = r.persons[0].ss!;
    expect(ss.benefit).toBe(155.4);
    expect(ss.covers).toBe(false);
    expect(ss.netCheck).toBe(0);
  });
});

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

describe("reviewer fixes: hold-harmless eligibility and IRMAA status are checked per year", () => {
  it("Part B deductions that began during 2026: not protected in 2026, but judged on the December 2026 check for 2027", () => {
    // Not eligible in 2026 → paid the full $202.90 in December 2026. The 2027 step is a real test, not "not-eligible".
    const h = holdHarmlessFor(2027, 300, false, false, { eligible2027: true });
    expect(h.previous?.reason).toBe("not-eligible");
    expect(h.previous?.standardPaid).toBe(202.9);
    expect(h.priorPremium).toBe(202.9);
    // $310.80 − $97 (= ⌊$300 − $202.90⌋) = $213.80 ≥ $209.50 → the 3.6% raise covers the increase.
    expect(h.cap).toBe(213.8);
    expect(h.reason).toBe("cola-covers");
    // A check smaller than the premium has nothing to protect.
    expect(
      holdHarmlessFor(2027, 190, false, false, { eligible2027: true }).reason,
    ).toBe("too-small");
    // Both flags off → not eligible in either year.
    expect(
      holdHarmlessFor(2027, 300, false, false, { eligible2027: false }).reason,
    ).toBe("not-eligible");
  });
  it("computeMedicare passes hhEligible2027 through (defaults to hhEligible)", () => {
    const base = {
      year: 2027 as const,
      filing: "single" as const,
      magi: 20000,
      coverage: "orig" as const,
      planPremium: null,
    };
    const a = computeMedicare({
      ...base,
      people: [
        person({ ssBenefit2026: 300, hhEligible: false, hhEligible2027: true }),
      ],
    });
    expect(a.persons[0].ss?.holdHarmless?.reason).toBe("cola-covers");
    const b = computeMedicare({
      ...base,
      people: [person({ ssBenefit2026: 300, hhEligible: false })],
    });
    expect(b.persons[0].ss?.holdHarmless?.reason).toBe("not-eligible");
  });
  it("the 2026 step uses the 2026 IRMAA table: $110,000 single is IRMAA in 2026 (> $109,000) but not in 2027 (≤ $112,000)", () => {
    const base = {
      filing: "single" as const,
      magi: 110000,
      coverage: "orig" as const,
      planPremium: null,
      people: [person({ ssBenefit2026: 300 })],
    };
    const y26 = computeMedicare({ ...base, year: 2026 });
    expect(y26.persons[0].tier).toBe(1);
    expect(y26.persons[0].ss?.holdHarmless?.reason).toBe("irmaa");
    expect(y26.persons[0].partB.total).toBe(284.1);
    const y27 = computeMedicare({ ...base, year: 2027 });
    expect(y27.persons[0].tier).toBe(0);
    const hh = y27.persons[0].ss?.holdHarmless;
    expect(hh?.previous?.reason).toBe("irmaa"); // before the fix this step was "protected" at $194.00
    // December 2026 took $202.90 + $81.20 IRMAA = $284.10; 2027 Part B falls to $209.50, so nothing to protect.
    expect(hh?.priorPremium).toBe(284.1);
    expect(hh?.protected).toBe(false);
    expect(y27.persons[0].partB.total).toBe(209.5);
  });
  it("joint filers: $220,000 is tier 1 in 2026 (> $218,000) and none in 2027 (≤ $224,000)", () => {
    const r = computeMedicare({
      year: 2027,
      filing: "mfj",
      magi: 220000,
      coverage: "orig",
      planPremium: null,
      people: [person({ ssBenefit2026: 300 }), person({ ssBenefit2026: 300 })],
    });
    for (const p of r.persons) {
      expect(p.ss?.holdHarmless?.previous?.reason).toBe("irmaa");
      expect(p.partB.standardCharged).toBe(209.5);
    }
  });
});

describe("reviewer edge cases", () => {
  it("2027 Part A (projected): $330 with 30–39 quarters, $600 under 30; 10% late penalty", () => {
    expect(partAPremium(2027, "30", false)).toEqual({
      premium: 330,
      penalty: 0,
      total: 330,
    });
    expect(partAPremium(2027, "0", true)).toEqual({
      premium: 600,
      penalty: 60,
      total: 660,
    });
    expect(partAPremium(2026, "40", true).total).toBe(0); // no premium → no penalty
  });
  it("exactly on an IRMAA line: headroom $0, one more dollar crosses", () => {
    const line = nextIrmaaLine(schedule(2026), "single", 109000);
    expect(line?.tier).toBe(0);
    expect(line?.headroom).toBe(0);
    expect(irmaaTier(schedule(2026), "single", 109001)).toBe(1);
    expect(nextIrmaaLine(schedule(2026), "mfs", 391000)).toBeNull();
  });
  it("Part B penalty on top of an IRMAA tier in 2027: 36 months → 30% of $209.50 = $62.85 → $272.40 (nearest dime) + tier-2 IRMAA", () => {
    expect(partBWithPenalty(209.5, 36)).toBe(272.4); // $272.35 is an odd 5 cents → rounds up
    const r = computeMedicare({
      year: 2027,
      filing: "single",
      magi: 150000,
      coverage: "orig",
      planPremium: null,
      people: [person({ lateBMonths: 36 })],
    });
    expect(r.persons[0].tier).toBe(2);
    expect(r.persons[0].partB.penalty).toBe(62.9);
    expect(r.persons[0].partB.total).toBe(481.8); // 272.40 + 209.40
  });
  it("every total stays finite for blank, zero, negative and huge inputs", () => {
    const weird = [NaN, 0, -5, 1e12, Infinity];
    for (const x of weird) {
      for (const year of [2026, 2027] as const) {
        const r = computeMedicare({
          year,
          filing: "mfs",
          magi: x,
          coverage: "ma",
          planPremium: x,
          people: [
            person({
              ssBenefit2026: x,
              lateBMonths: Number.isFinite(x) ? x : 0,
              lateDMonths: x,
              magi: x,
            }),
            person({ magi: x }),
          ],
        });
        for (const v of [
          r.totalMonthly,
          r.annual,
          r.fromSsCheck,
          r.toPlan,
          r.billed,
          r.netAnnualAfterRebate,
        ]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
