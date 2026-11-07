import { describe, expect, it } from "vitest";
import { applyColas, eligibilityYear, estimatePiaFromSalary, piaFromAime, piaFromEarnings } from "../ss-pia";
import { claimFactor, monthAtAge } from "../ss-core";
import { payment } from "../ss-claiming";
import { BEND_POINTS } from "@/data/params/social-security";
import { TAXABLE_MAX } from "@/data/generated/taxable-max";
import { AWI } from "@/data/generated/awi";

const BP2027 = BEND_POINTS[2027].pia;
const asOf = { year: 2026, month: 10, day: 23 };
/** Maximum-taxable earnings every year from `from` through `to` (the OACT "examplemax" worker). */
const maxEarner = (from: number, to: number) => {
  const e: Record<number, number> = {};
  for (let y = from; y <= to; y++) e[y] = TAXABLE_MAX[y];
  return e;
};

describe("PIA formula with the 2027 bend points (ssa.gov/oact/COLA/piaformula.html)", () => {
  it("bend points are $1,340 and $8,077", () => {
    expect(BP2027).toEqual([1340, 8077]);
  });
  it("90% / 32% / 15% bands, rounded down to the dime", () => {
    expect(piaFromAime(1000, BP2027)).toBe(900);
    expect(piaFromAime(1340, BP2027)).toBe(1206);
    expect(piaFromAime(1341, BP2027)).toBe(1206.3); // 1206.32 → 1206.30
    expect(piaFromAime(5000, BP2027)).toBe(2377.2); // 1206 + 0.32 × 3,660
    expect(piaFromAime(10000, BP2027)).toBe(3650.2); // 1206 + 2155.84 + 288.45 = 3650.29 → 3650.20
    expect(piaFromAime(0, BP2027)).toBe(0);
  });
});

describe("OACT maximum-earner examples for January 2027 (ssa.gov/oact/COLA/examplemax.html)", () => {
  it("retiring at full retirement age 67: AIME $11,848 → $4,188", () => {
    const dob = { year: 1960, month: 1, day: 2 }; // reaches 67 on January 1, 2027
    expect(eligibilityYear(dob)).toBe(2022);
    const r = piaFromEarnings({ dob, earnings: maxEarner(1982, 2026) });
    expect(r.computationYears).toBe(35);
    expect(r.aime).toBe(11848);
    expect(r.pia).toBe(3420.3); // 2022 bend points
    const withColas = applyColas(r.pia, 2022, 2026); // COLAs for Dec 2022 … Dec 2026 (8.7, 3.2, 2.5, 2.8, 3.6)
    expect(withColas.applied.map((c) => c.pct)).toEqual([8.7, 3.2, 2.5, 2.8, 3.6]);
    expect(withColas.pia).toBe(4188.2);
    expect(payment(withColas.pia, 1)).toBe(4188);
  });
  it("retiring at 70: AIME $11,004 → $5,358 (28% delayed credits for FRA 66 and 6 months)", () => {
    const dob = { year: 1957, month: 1, day: 2 };
    const r = piaFromEarnings({ dob, earnings: maxEarner(1979, 2026) });
    expect(r.aime).toBe(11004);
    const pia = applyColas(r.pia, 2019, 2026).pia;
    expect(pia).toBe(4186.1);
    const cf = claimFactor(dob, monthAtAge(dob, 70));
    expect(cf.monthsDelayed).toBe(42);
    expect(payment(pia, cf.factor)).toBe(5358);
  });
  it("retiring at 62 (eligible 2027, 59 reduction months): AIME $14,966 → $3,094", () => {
    const dob = { year: 1965, month: 1, day: 15 };
    expect(eligibilityYear(dob)).toBe(2027);
    const r = piaFromEarnings({ dob, earnings: maxEarner(1987, 2026) });
    expect(r.aime).toBe(14966);
    expect(r.pia).toBe(4395.1);
    const cf = claimFactor(dob, 0); // earliest possible month
    expect(cf.monthsEarly).toBe(59);
    expect(payment(r.pia, cf.factor)).toBe(3094); // no COLA yet: the first one for 2027 eligibility is December 2027
  });
});

describe("AIME details (20 CFR 404.211)", () => {
  it("earnings are capped at each year's taxable maximum", () => {
    const dob = { year: 1960, month: 1, day: 2 };
    const e: Record<number, number> = {};
    for (let y = 1982; y <= 2026; y++) e[y] = 10_000_000;
    expect(piaFromEarnings({ dob, earnings: e }).aime).toBe(11848);
  });
  it("fewer than 35 years: zeros fill the rest (divide by 420 months)", () => {
    const dob = { year: 1960, month: 6, day: 15 };
    const e: Record<number, number> = {};
    for (let y = 2000; y <= 2009; y++) e[y] = 50000; // 10 years
    const r = piaFromEarnings({ dob, earnings: e });
    let sum = 0;
    for (let y = 2000; y <= 2009; y++) sum += Math.round(50000 * (AWI[2020] / AWI[y]) * 100) / 100; // indexed to age 60 (2020)
    expect(r.computationYears).toBe(35);
    expect(r.aime).toBe(Math.floor(sum / 420));
    expect(r.years.filter((y) => y.used)).toHaveLength(10);
  });
  it("a high-earning year before 22 can still rank in the top 35 (computation base years start after 1950)", () => {
    const dob = { year: 1960, month: 6, day: 15 };
    const e: Record<number, number> = { 1979: TAXABLE_MAX[1979] };
    for (let y = 1982; y <= 2016; y++) e[y] = 1000; // 35 low years
    const r = piaFromEarnings({ dob, earnings: e });
    expect(r.years.find((y) => y.year === 1979)?.used).toBe(true);
  });
  it("years at or after the indexing year (age 60) count at face value", () => {
    const dob = { year: 1960, month: 6, day: 15 };
    const r = piaFromEarnings({ dob, earnings: { 2019: 50000, 2020: 50000, 2023: 50000 } });
    expect(r.years.find((y) => y.year === 2019)!.indexFactor).toBeCloseTo(AWI[2020] / AWI[2019], 10);
    expect(r.years.find((y) => y.year === 2020)!.indexFactor).toBe(1);
    expect(r.years.find((y) => y.year === 2023)!.indexed).toBe(50000);
  });
});

describe("salary estimate (Quick-Calculator style)", () => {
  it("a lifelong average-wage earner eligible in 2027 → AIME = AWI(2025)/12 → PIA $2,718.30", () => {
    const est = estimatePiaFromSalary({ dob: { year: 1965, month: 6, day: 15 }, salary: AWI[2025], stopAge: 67, asOf })!;
    expect(est.indexingYear).toBe(2025);
    expect(est.bendYear).toBe(2027);
    expect(est.aime).toBe(Math.floor((AWI[2025] * 35) / 420));
    expect(est.aime).toBe(6066);
    expect(est.pia).toBe(2718.3);
    expect(est.piaToday).toBe(2718.3); // first COLA for 2027 eligibility is December 2027
    expect(est.todaysWageLevel).toBe(false);
  });
  it("people already past 62 get the COLAs through last December, so the figure matches today's statement", () => {
    const est = estimatePiaFromSalary({ dob: { year: 1960, month: 1, day: 2 }, salary: 1_000_000, stopAge: 67, asOf })!;
    expect(est.aime).toBe(11848);
    expect(est.colasApplied.map((c) => c.year)).toEqual([2022, 2023, 2024, 2025]);
    expect(est.piaToday).toBe(4042.7); // + the 3.6% December 2026 COLA (applied by the claiming engine) = $4,188.20
  });
  it("under 60: uses the latest wage index and bend points (today's wage level)", () => {
    const est = estimatePiaFromSalary({ dob: { year: 1972, month: 3, day: 9 }, salary: 60000, stopAge: 65, asOf })!;
    expect(est.todaysWageLevel).toBe(true);
    expect(est.bendYear).toBe(2027);
    expect(est.pia).toBeGreaterThan(1500);
    expect(est.pia).toBeLessThan(2600);
  });
  it("pay is capped at the taxable maximum; more pay never lowers the estimate", () => {
    const dob = { year: 1963, month: 8, day: 20 };
    const a = estimatePiaFromSalary({ dob, salary: 40000, stopAge: 66, asOf })!;
    const b = estimatePiaFromSalary({ dob, salary: 90000, stopAge: 66, asOf })!;
    const c = estimatePiaFromSalary({ dob, salary: 900000, stopAge: 66, asOf })!;
    const d = estimatePiaFromSalary({ dob, salary: 9000000, stopAge: 66, asOf })!;
    expect(a.pia).toBeLessThan(b.pia);
    expect(b.pia).toBeLessThan(c.pia);
    expect(c.pia).toBe(d.pia);
  });
  it("still working: stopping sooner never raises the estimate; zero pay → $0", () => {
    const dob = { year: 1966, month: 5, day: 5 }; // 60 today
    const soon = estimatePiaFromSalary({ dob, salary: 70000, stopAge: 61, asOf })!;
    const late = estimatePiaFromSalary({ dob, salary: 70000, stopAge: 67, asOf })!;
    expect(soon.lastWorkYear).toBe(2026);
    expect(soon.pia).toBeLessThanOrEqual(late.pia);
    expect(estimatePiaFromSalary({ dob, salary: 0, stopAge: 67, asOf })!.pia).toBe(0);
  });
  it("already stopped: the salary is read as pay in the last year worked (that year's wage level)", () => {
    const dob = { year: 1966, month: 5, day: 5 };
    const est = estimatePiaFromSalary({ dob, salary: 70000, stopAge: 50, asOf })!;
    expect(est.lastWorkYear).toBe(2015);
    const y2015 = est.years.find((y) => y.year === 2015)!;
    expect(y2015.earnings).toBeCloseTo(70000, 6);
    const y2005 = est.years.find((y) => y.year === 2005)!;
    expect(y2005.earnings).toBeCloseTo((70000 * AWI[2005]) / AWI[2015], 6);
    expect(est.years.some((y) => y.year > 2015)).toBe(false);
  });
  it("born before 1950 (no bend points in params) → null", () => {
    expect(estimatePiaFromSalary({ dob: { year: 1948, month: 5, day: 5 }, salary: 50000, stopAge: 65, asOf })).toBeNull();
  });
});

describe("reviewer additions", () => {
  it("AIME is rounded DOWN even when the quotient is within half a cent of the next dollar ($518,698.32 / 420 = $1,234.996 → $1,234)", () => {
    // Born 1964 → eligible 2026, indexing year 2024: 2024–2026 count at face value.
    const r = piaFromEarnings({ dob: { year: 1964, month: 6, day: 15 }, earnings: { 2024: 168600, 2025: 176100, 2026: 173998.32 } });
    expect(r.computationYears).toBe(35);
    expect(r.aime).toBe(1234);
  });
});
