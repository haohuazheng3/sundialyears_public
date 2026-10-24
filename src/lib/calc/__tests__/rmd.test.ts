import { describe, expect, it } from "vitest";
import { computeRmd, rmdApplicableAge, firstRmdYear, distributionPeriod, moreThanTenYearsYounger, projectRmds } from "../rmd";

const d = (year: number, month = 6, day = 15) => ({ year, month, day });

describe("applicable age (SECURE 2.0 / Reg. 1.401(a)(9)-2(b)(2))", () => {
  it("by date of birth", () => {
    expect(rmdApplicableAge(d(1949, 6, 30))).toBe(70.5);
    expect(rmdApplicableAge(d(1949, 7, 1))).toBe(72);
    expect(rmdApplicableAge(d(1950, 12, 31))).toBe(72);
    expect(rmdApplicableAge(d(1951, 1, 1))).toBe(73);
    expect(rmdApplicableAge(d(1959, 12, 31))).toBe(73);
    expect(rmdApplicableAge(d(1960, 1, 1))).toBe(75);
  });
  it("first distribution year", () => {
    expect(firstRmdYear(d(1953))).toBe(2026);
    expect(firstRmdYear(d(1960))).toBe(2035);
    expect(firstRmdYear(d(1948, 8, 1))).toBe(2019); // 70½ on Feb 1, 2019
    expect(firstRmdYear(d(1948, 1, 15))).toBe(2018);
  });
});

describe("amounts", () => {
  it("Uniform table: age 73, $500,000 → $18,867.92 (÷26.5)", () => {
    const r = computeRmd({ dob: d(1953), year: 2026, priorYearEndBalance: 500000, accountType: "ira" });
    expect(r.lookup?.period).toBe(26.5);
    expect(r.amount).toBe(18867.92);
    expect(r.status).toBe("first-year");
    expect(r.rbd.year).toBe(2027);
  });
  it("age 80 → ÷20.2; age 90 → ÷12.2; age 100 → ÷6.4", () => {
    expect(computeRmd({ dob: d(1946), year: 2026, priorYearEndBalance: 202000, accountType: "ira" }).amount).toBe(10000);
    expect(distributionPeriod(d(1936), 2026).period).toBe(12.2);
    expect(distributionPeriod(d(1926), 2026).period).toBe(6.4);
  });
  it("Joint table when a sole-beneficiary spouse is more than 10 years younger", () => {
    const r = computeRmd({ dob: d(1951), year: 2026, priorYearEndBalance: 500000, accountType: "ira", spouse: { dob: d(1962), soleBeneficiary: true } });
    expect(r.lookup?.table).toBe("joint");
    expect(r.lookup?.period).toBe(25.3); // JOINT_LIFE[75][64]
    expect(r.amount).toBe(19762.85);
  });
  it("exactly 10 years apart is NOT more than 10 years younger", () => {
    expect(moreThanTenYearsYounger(d(1951, 5, 10), d(1961, 5, 10))).toBe(false);
    expect(moreThanTenYearsYounger(d(1951, 5, 10), d(1961, 5, 11))).toBe(true);
  });
  it("spouse not sole beneficiary → Uniform table", () => {
    const r = computeRmd({ dob: d(1951), year: 2026, priorYearEndBalance: 500000, accountType: "ira", spouse: { dob: d(1970), soleBeneficiary: false } });
    expect(r.lookup?.table).toBe("uniform");
  });
});

describe("statuses", () => {
  it("Roth IRA never; Roth 401(k) not from 2024", () => {
    expect(computeRmd({ dob: d(1945), year: 2026, priorYearEndBalance: 1e5, accountType: "roth-ira" }).status).toBe("not-required-roth");
    expect(computeRmd({ dob: d(1945), year: 2026, priorYearEndBalance: 1e5, accountType: "roth-401k" }).status).toBe("not-required-roth");
  });
  it("too young", () => {
    expect(computeRmd({ dob: d(1960), year: 2027, priorYearEndBalance: 1e5, accountType: "ira" }).status).toBe("not-yet");
  });
  it("still-working exception applies only to employer plans", () => {
    expect(computeRmd({ dob: d(1950), year: 2026, priorYearEndBalance: 1e5, accountType: "employer", stillWorkingException: true }).status).toBe("deferred-still-working");
    expect(computeRmd({ dob: d(1950), year: 2026, priorYearEndBalance: 1e5, accountType: "ira", stillWorkingException: true }).status).toBe("required");
  });
});

describe("projection", () => {
  it("first RMD in the first distribution year; balance never negative", () => {
    const rows = projectRmds({ dob: d(1953), startYear: 2026, balance: 500000, growth: 0.05, throughAge: 120 });
    expect(rows[0].rmd).toBe(18867.92);
    expect(rows.every((r) => r.startBalance >= 0 && r.rmd <= r.startBalance + 0.01)).toBe(true);
  });
});
