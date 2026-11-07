/**
 * COLA math — reproduces SSA's own published worked examples (docs/research/ssa_annual.json + verify_ssa_annual.json)
 * and the hold-harmless rule as described in Federal Register 2025-20251 (docs/research/medicare.json).
 */
import { describe, expect, it } from "vitest";
import {
  applyCola,
  averageOfLast,
  colaCheck,
  colaFromCpiw,
  colaHistory,
  compoundOfLast,
  holdHarmlessBreakEven,
  holdHarmlessPremium,
  lastLargerThanLatest,
  minColaOnDeductedPremium,
  netPayment,
  PREMIUM_SITUATIONS,
  q3Average,
  ssiNextYear,
  zeroColaYears,
  type MedicareRates,
} from "./cola-math";
import { AVG_BENEFITS, COLA, COLA_2027_CPIW, SS_YEAR } from "@/data/params/social-security";
import { roundDownToDime } from "@/lib/calc/dates";
import { IRMAA_2026, IRMAA_2027, PART_B } from "@/data/params/medicare";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { COLA_1999, CPIW_Q3_MONTHLY, MAX_BENEFIT_2026, SSI_UNROUNDED_ANNUAL, SSI_ESSENTIAL_PERSON_2027 } from "@/data/params/numbers-extra";

const RATES: MedicareRates = {
  partBNow: PART_B[2026].value.premium,
  partBNext: PART_B[2027].value.premium,
  irmaaBNow: IRMAA_2026.partBAddOn,
  irmaaBNext: IRMAA_2027.partBAddOn,
  irmaaDNow: IRMAA_2026.partDAddOn,
  irmaaDNext: IRMAA_2027.partDAddOn,
};

describe("COLA determination (SSA OACT latestCOLA.html)", () => {
  it("reproduces SSA's 2027 worked example: (328.746 − 317.265) / 317.265 × 100 = 3.6%", () => {
    expect(q3Average(CPIW_Q3_MONTHLY.value[2026])).toBe(COLA_2027_CPIW.value.q3_2026);
    expect(q3Average(CPIW_Q3_MONTHLY.value[2025])).toBe(COLA_2027_CPIW.value.q3_2025);
    const d = colaFromCpiw(CPIW_Q3_MONTHLY.value[2026], CPIW_Q3_MONTHLY.value[2025]);
    expect(d.avgNew).toBe(328.746);
    expect(d.avgBase).toBe(317.265);
    expect(d.unrounded).toBeCloseTo(3.6187, 4);
    expect(d.cola).toBe(COLA[2027].value);
  });
  it("rounds the increase to the nearest tenth of a percent", () => {
    expect(colaFromCpiw([100.05, 100.05, 100.05], [100, 100, 100]).cola).toBe(0.1); // 0.05% rounds up
    expect(colaFromCpiw([100.04, 100.04, 100.04], [100, 100, 100]).cola).toBe(0); // rounds to zero → no COLA
  });
  it("gives no COLA when prices fall (as in 2009, 2010 and 2015)", () => {
    expect(colaFromCpiw([99, 99, 99], [100, 100, 100]).cola).toBe(0);
  });
  it("needs exactly three months", () => {
    expect(() => q3Average([1, 2])).toThrow();
  });
});

describe("Applying the COLA (SSA OACT colaapplic.html; 20 CFR 404.304)", () => {
  it("truncates the raised benefit to the next lower dime", () => {
    expect(applyCola(2000, 3.6)).toBe(2072);
    expect(applyCola(1234.5, 3.6)).toBe(1278.9); // 1,278.942 → 1,278.90
    expect(applyCola(SS_YEAR[2027].value.avgRetiredWorkerAfterCola, 0)).toBe(SS_YEAR[2027].value.avgRetiredWorkerAfterCola);
  });
  it("is within a dollar of SSA's max-benefit examples (SSA raises the PIA, then shows whole dollars)", () => {
    const m = MAX_BENEFIT_2026.value;
    for (const k of ["age62", "age65", "age66", "age67", "age70"] as const) {
      expect(Math.abs(applyCola(m[k], COLA[2027].value) - m.in2027AfterCola[k])).toBeLessThanOrEqual(1);
    }
  });
  it("rounds the payment down to the whole dollar after deductions", () => {
    expect(netPayment(2072, 209.5)).toBe(1862);
    expect(netPayment(2000.9, 0)).toBe(2000);
    expect(netPayment(100, 202.9)).toBe(0);
  });
});

describe("SSI federal payment amounts (SSA OACT SSI.html)", () => {
  it("2026 unrounded annual × 1.036, then ÷ 12 rounded down: $1,029 individual, $1,544 couple", () => {
    const ind = ssiNextYear(SSI_UNROUNDED_ANNUAL.value[2026].individual, COLA[2027].value);
    expect(ind.unroundedAnnual).toBe(SSI_UNROUNDED_ANNUAL.value[2027].individual);
    expect(ind.monthly).toBe(SS_YEAR[2027].value.ssiIndividual);
    const cpl = ssiNextYear(SSI_UNROUNDED_ANNUAL.value[2026].couple, COLA[2027].value);
    expect(cpl.unroundedAnnual).toBe(SSI_UNROUNDED_ANNUAL.value[2027].couple);
    expect(cpl.monthly).toBe(SS_YEAR[2027].value.ssiCouple);
  });
  it("2026 monthly amounts follow from the 2026 unrounded annual amounts", () => {
    expect(Math.floor(SSI_UNROUNDED_ANNUAL.value[2026].individual / 12)).toBe(SS_YEAR[2026].value.ssiIndividual);
    expect(Math.floor(SSI_UNROUNDED_ANNUAL.value[2026].couple / 12)).toBe(SS_YEAR[2026].value.ssiCouple);
    expect(Math.floor(SSI_UNROUNDED_ANNUAL.value[2027].essentialPerson / 12)).toBe(SSI_ESSENTIAL_PERSON_2027.value);
  });
});

describe("Part B hold-harmless (Social Security Act §1839(f); FR 2025-20251)", () => {
  it("caps the new premium at last year's premium + the COLA dollars", () => {
    // $150 benefit: COLA adds $5.40, less than the projected $6.60 premium increase.
    expect(holdHarmlessPremium(202.9, 209.5, 150, applyCola(150, 3.6))).toBe(208.3);
    // Large benefit: full new premium.
    expect(holdHarmlessPremium(202.9, 209.5, 2000, applyCola(2000, 3.6))).toBe(209.5);
    // Never below this year's premium even with no COLA.
    expect(holdHarmlessPremium(202.9, 209.5, 1000, 1000)).toBe(202.9);
  });
  it("break-even benefit ≈ premium increase ÷ COLA (≈ $183 with the projected 2027 premium)", () => {
    const be = holdHarmlessBreakEven(PART_B[2026].value.premium, PART_B[2027].value.premium, COLA[2027].value);
    expect(be).toBeCloseTo((PART_B[2027].value.premium - PART_B[2026].value.premium) / 0.036, 6);
    expect(Math.round(be)).toBe(183);
    expect(holdHarmlessBreakEven(202.9, 209.5, 0)).toBe(Infinity);
  });
});

describe("Your new check", () => {
  it("standard premium: gross +3.6%, Medicare takes the premium increase, payment rounded down", () => {
    const r = colaCheck({ benefit: 2095, colaPct: 3.6, situation: "std", partDIrmaa: false, rates: RATES });
    expect(r.benefitNext).toBe(2170.4); // 2,170.42 → 2,170.40
    expect(r.colaDollars).toBe(75.4);
    expect(r.partBNow).toBe(202.9);
    expect(r.partBNext).toBe(209.5);
    expect(r.netNow).toBe(1892); // 2,095 − 202.90 = 1,892.10 → 1,892
    expect(r.netNext).toBe(1960); // 2,170.40 − 209.50 = 1,960.90 → 1,960
    expect(r.netRaise).toBe(68);
    expect(r.netRaiseYear).toBe(816);
    expect(r.heldHarmless).toBe(false);
  });
  it("with the projected 2027 premium, anyone whose benefit covers the standard premium gets a COLA bigger than the increase", () => {
    const r = colaCheck({ benefit: PART_B[2026].value.premium, colaPct: 3.6, situation: "std", partDIrmaa: false, rates: RATES });
    expect(r.heldHarmless).toBe(false);
    expect(r.netNext).toBeGreaterThanOrEqual(r.netNow);
  });
  it("hold-harmless keeps the check from shrinking when the premium jumps more than the COLA", () => {
    const r = colaCheck({ benefit: 300, colaPct: 3.6, situation: "std", partDIrmaa: false, rates: { ...RATES, partBNext: 230 } });
    expect(r.heldHarmless).toBe(true);
    expect(r.partBNext).toBe(213.7); // 202.90 + 10.80 COLA dollars
    expect(r.netNext).toBe(r.netNow);
  });
  it("benefit smaller than the premium: not protected (premium can't be fully deducted)", () => {
    const r = colaCheck({ benefit: 100, colaPct: 3.6, situation: "std", partDIrmaa: false, rates: RATES });
    expect(r.heldHarmless).toBe(false);
    expect(r.deductionsExceedBenefit).toBe(true);
    expect(r.netNext).toBe(0);
  });
  it("already held harmless: the reduced premium rises only by the COLA dollars", () => {
    const r = colaCheck({ benefit: 160, colaPct: 3.6, situation: "hh", heldHarmlessPremiumNow: 150, partDIrmaa: false, rates: RATES });
    expect(r.partBNow).toBe(150);
    expect(r.benefitNext).toBe(165.7); // 165.76 → 165.70
    expect(r.partBNext).toBe(155.7); // 150 + 5.70 COLA dollars, under the 209.50 standard
    expect(r.heldHarmless).toBe(true);
    expect(r.netNext).toBe(r.netNow);
  });
  it("already held harmless with a bigger benefit: back to the full standard premium", () => {
    const r = colaCheck({ benefit: 500, colaPct: 3.6, situation: "hh", heldHarmlessPremiumNow: 195, partDIrmaa: false, rates: RATES });
    expect(r.partBNext).toBe(PART_B[2027].value.premium); // 195 + 18.00 would exceed the standard premium
    expect(r.heldHarmless).toBe(false);
  });
  it("IRMAA payers are never held harmless and pay the tier add-ons", () => {
    const r = colaCheck({ benefit: 150, colaPct: 3.6, situation: "i2", partDIrmaa: true, rates: RATES });
    expect(r.heldHarmless).toBe(false);
    expect(r.partBNow).toBeCloseTo(IRMAA_2026.standardPartB + IRMAA_2026.partBAddOn[2], 2);
    expect(r.partBNext).toBeCloseTo(IRMAA_2027.standardPartB + IRMAA_2027.partBAddOn[2], 2);
    expect(r.partDNow).toBe(IRMAA_2026.partDAddOn[2]);
    expect(r.partDNext).toBe(IRMAA_2027.partDAddOn[2]);
    expect(r.irmaaTier).toBe(2);
  });
  it("IRMAA top tier with a big benefit", () => {
    const r = colaCheck({ benefit: 4000, colaPct: 3.6, situation: "i5", partDIrmaa: false, rates: RATES });
    expect(r.deductionsNext).toBeCloseTo(IRMAA_2027.standardPartB + IRMAA_2027.partBAddOn[5], 2);
    expect(r.medicareIncrease).toBeCloseTo(r.deductionsNext - r.deductionsNow, 2);
    expect(r.netRaise).toBe(r.netNext - r.netNow);
  });
  it("nothing deducted: the whole raise reaches you", () => {
    const r = colaCheck({ benefit: 1000, colaPct: 3.6, situation: "none", partDIrmaa: false, rates: RATES });
    expect(r.netNow).toBe(1000);
    expect(r.netNext).toBe(1036);
    expect(r.medicareIncrease).toBe(0);
  });
  it("handles zero and negative input", () => {
    const r = colaCheck({ benefit: -5, colaPct: 3.6, situation: "none", partDIrmaa: false, rates: RATES });
    expect(r.benefitNow).toBe(0);
    expect(r.netNext).toBe(0);
  });
});

describe("COLA history (SSA OACT colaseries.html)", () => {
  const rows = colaHistory(COLA_BY_EFFECTIVE_YEAR, { 1999: COLA_1999.value });

  it("covers every year 1975–2026 once 1999 is patched in", () => {
    expect(rows[0].effectiveYear).toBe(1975);
    expect(rows[rows.length - 1].effectiveYear).toBe(2026);
    expect(rows.length).toBe(2026 - 1975 + 1);
    expect(rows.find((r) => r.effectiveYear === 1999)?.pct).toBe(2.5);
  });
  it("keys COLAs by the December they take effect: the '2027 COLA' is SSA's 2026 row", () => {
    const latest = rows[rows.length - 1];
    expect(latest.pct).toBe(COLA[2027].value);
    expect(latest).toMatchObject({ effectiveYear: 2026, effectiveMonth: "December", paidYear: 2027, paidMonth: "January" });
    expect(rows.find((r) => r.paidYear === 2026)?.pct).toBe(COLA[2026].value);
  });
  it("1975–1982 COLAs took effect in June and were paid in July of the same year", () => {
    expect(rows.find((r) => r.effectiveYear === 1982)).toMatchObject({ effectiveMonth: "June", paidYear: 1982, paidMonth: "July" });
    expect(rows.find((r) => r.effectiveYear === 1983)).toMatchObject({ effectiveMonth: "December", paidYear: 1984 });
    // Paid years never collide (1983 had no COLA paid — it was delayed to January 1984).
    expect(new Set(rows.map((r) => r.paidYear)).size).toBe(rows.length);
  });
  it("10-year average and compound growth", () => {
    const last10 = [2.0, 2.8, 1.6, 1.3, 5.9, 8.7, 3.2, 2.5, 2.8, 3.6];
    expect(rows.slice(-10).map((r) => r.pct)).toEqual(last10);
    expect(averageOfLast(rows, 10)).toBeCloseTo(3.44, 6);
    expect(compoundOfLast(rows, 10)).toBeCloseTo(last10.reduce((f, p) => f * (1 + p / 100), 1) - 1, 10);
    expect(averageOfLast([], 10)).toBe(0);
  });
  it("finds the zero-COLA years and the last bigger COLA", () => {
    expect(zeroColaYears(rows).map((r) => r.paidYear)).toEqual([2010, 2011, 2016]);
    expect(lastLargerThanLatest(rows)).toMatchObject({ effectiveYear: 2022, pct: 8.7 });
    expect(lastLargerThanLatest([])).toBeUndefined();
  });
});

describe("Who the 2027 hold-harmless rule can reach (review fixes)", () => {
  const P26 = PART_B[2026].value.premium;
  const P27 = PART_B[2027].value.premium;
  const C = COLA[2027].value;

  it("anyone paying the full standard premium out of the check gets a COLA of at least $7.30 — more than the projected increase", () => {
    // The smallest check that can have $202.90 deducted is $202.90; 202.90 × 1.036 = 210.2044 → 210.20 → +$7.30.
    expect(minColaOnDeductedPremium(P26, C)).toBe(7.3);
    expect(minColaOnDeductedPremium(P26, C)).toBeGreaterThan(P27 - P26);
    expect(minColaOnDeductedPremium(0, C)).toBe(0);
  });
  it("so the arithmetic break-even (~$183) is below the premium itself and protects no standard-premium payer", () => {
    expect(holdHarmlessBreakEven(P26, P27, C)).toBeLessThan(P26);
    for (let dimes = 0; dimes <= 60000; dimes++) {
      const r = colaCheck({ benefit: dimes / 10, colaPct: C, situation: "std", partDIrmaa: false, rates: RATES });
      expect(r.heldHarmless).toBe(false);
    }
  });
  it("people already on a reduced premium can be protected well above $183 (statutory 'greater of' rule, §1839(f))", () => {
    // Example derived with the rule: $200.00 in Dec 2025 → 2026 premium 185.00 + 5.60 = 190.60, 2026 benefit 205.60.
    const r = colaCheck({ benefit: 205.6, colaPct: C, situation: "hh", heldHarmlessPremiumNow: 190.6, partDIrmaa: false, rates: RATES });
    expect(r.benefitNext).toBe(213); // 205.60 × 1.036 = 213.0016 → 213.00
    expect(r.partBNext).toBe(198); // 190.60 + 7.40 COLA dollars, under the 209.50 standard
    expect(r.heldHarmless).toBe(true);
    expect(r.netNext).toBe(r.netNow);
    // A $380 check on a $196.20 reduced premium: 380 × 1.036 = 393.68 → 393.60, so +$13.60 > 209.50 − 196.20 = $13.30 → full premium.
    const big = colaCheck({ benefit: 380, colaPct: C, situation: "hh", heldHarmlessPremiumNow: 196.2, partDIrmaa: false, rates: RATES });
    expect(big.partBNext).toBe(P27);
    expect(big.heldHarmless).toBe(false);
  });
  it("an empty reduced-premium field falls back to the standard premium (never a $0 premium)", () => {
    const r = colaCheck({ benefit: 1000, colaPct: C, situation: "hh", heldHarmlessPremiumNow: undefined, partDIrmaa: false, rates: RATES });
    expect(r.partBNow).toBe(P26);
    expect(r.partBNext).toBe(P27);
  });
  it("benefit just under today's premium but over next year's: flagged, with each year's comparison available to the UI", () => {
    const r = colaCheck({ benefit: 202.5, colaPct: C, situation: "std", partDIrmaa: false, rates: RATES });
    expect(r.benefitNext).toBe(209.7);
    expect(r.deductionsExceedBenefit).toBe(true);
    expect(r.deductionsNow > r.benefitNow).toBe(true);
    expect(r.deductionsNext > r.benefitNext).toBe(false);
  });
});

describe("No NaN / negative / Infinity for any benefit in any situation", () => {
  it("sweeps $0–$10,000 in every Medicare situation, with and without Part D IRMAA", () => {
    for (const situation of PREMIUM_SITUATIONS)
      for (const partDIrmaa of [false, true])
        for (let b = -50; b <= 10000; b += 7.37) {
          const r = colaCheck({ benefit: b, colaPct: COLA[2027].value, situation, heldHarmlessPremiumNow: 150, partDIrmaa, rates: RATES });
          for (const v of [r.benefitNow, r.benefitNext, r.netNow, r.netNext, r.deductionsNow, r.deductionsNext, r.colaDollars]) {
            expect(Number.isFinite(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(0);
          }
          // Hold-harmless guarantee: whenever the premium is deducted and no IRMAA is paid, the deposit never shrinks.
          if ((situation === "std" || situation === "hh") && !r.deductionsExceedBenefit) expect(r.netNext).toBeGreaterThanOrEqual(r.netNow);
        }
  });
  it("zero, negative and empty-ish benefits give an all-zero result (the UI shows a prompt instead)", () => {
    for (const b of [0, -1, -0.01, 0.04]) {
      const r = colaCheck({ benefit: b, colaPct: COLA[2027].value, situation: "std", partDIrmaa: false, rates: RATES });
      expect(r.benefitNow).toBe(0);
      expect(r.benefitNext).toBe(0);
      expect(r.netNext).toBe(0);
    }
  });
});

describe("Second review: SSA's published examples and the statutory 'greater of' rule", () => {
  const C = COLA[2027].value;
  it("reproduces all six SSA fact-sheet averages (before → after the COLA) within $1", () => {
    for (const r of AVG_BENEFITS.value) {
      const after = applyCola(r.jan2027Before, C);
      expect(Math.abs(after - r.jan2027After)).toBeLessThan(1);
    }
  });
  it("the calculator's default (SSA's average retiree, standard premium) gives the figures quoted on the page", () => {
    const avg = AVG_BENEFITS.value[0];
    const r = colaCheck({ benefit: avg.jan2027Before, colaPct: C, situation: "std", partDIrmaa: false, rates: RATES });
    expect(r.benefitNext).toBe(roundDownToDime(avg.jan2027Before * (1 + C / 100)));
    expect(r.netNext).toBe(Math.floor(r.benefitNext - RATES.partBNext));
    expect(r.netNow).toBe(Math.floor(avg.jan2027Before - RATES.partBNow));
    expect(r.heldHarmless).toBe(false);
  });
  it("hold-harmless premium is the GREATER of last December's premium or the reduced new premium (FR 2025-20251)", () => {
    // A COLA that rounds to $0.00 on a tiny benefit: the premium stays at December's amount, never below it.
    const tiny = colaCheck({ benefit: 2.7, colaPct: C, situation: "hh", heldHarmlessPremiumNow: 2.5, partDIrmaa: false, rates: RATES });
    expect(tiny.colaDollars).toBe(0);
    expect(tiny.partBNext).toBe(2.5);
    expect(tiny.netNext).toBe(tiny.netNow);
    // The reduced premium never exceeds the new standard premium either.
    expect(holdHarmlessPremium(200, RATES.partBNext, 1000, 1036)).toBe(RATES.partBNext);
  });
  it("IRMAA tiers 1–5: next year's deduction = standard + tier add-on (+ Part D add-on), never held harmless", () => {
    for (const t of [1, 2, 3, 4, 5] as const) {
      const r = colaCheck({ benefit: 3000, colaPct: C, situation: `i${t}`, partDIrmaa: true, rates: RATES });
      expect(r.deductionsNext).toBeCloseTo(RATES.partBNext + RATES.irmaaBNext[t] + RATES.irmaaDNext[t], 6);
      expect(r.heldHarmless).toBe(false);
      expect(r.irmaaTier).toBe(t);
    }
  });
});

