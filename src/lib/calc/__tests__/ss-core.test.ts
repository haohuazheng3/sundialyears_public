import { describe, expect, it } from "vitest";
import { fra, fraMonth, earliestRetirementMonth, claimFactor, monthAtAge, earlyRetirementFactor, spousalFactor, survivorFactor, survivorFraForCohort, fraForCohort, describeMonth } from "../ss-core";
import { monthIndex } from "../dates";

const pct = (x: number) => Math.round(x * 100000) / 1000; // 3-decimal percent

describe("full retirement age (20 CFR 404.409)", () => {
  it("cohort table", () => {
    expect(fraForCohort(1954).label).toBe("66");
    expect(fraForCohort(1955).label).toBe("66 and 2 months");
    expect(fraForCohort(1959).label).toBe("66 and 10 months");
    expect(fraForCohort(1960).label).toBe("67");
    expect(fraForCohort(1942).label).toBe("65 and 10 months");
  });
  it("Jan 1 birthdays use the prior year's FRA (POMS GN 00302.400)", () => {
    expect(fra({ year: 1960, month: 1, day: 1 }).label).toBe("66 and 10 months");
    expect(describeMonth(fraMonth({ year: 1960, month: 1, day: 1 })).label).toBe("October 2026");
    expect(describeMonth(fraMonth({ year: 1960, month: 3, day: 1 })).label).toBe("February 2027");
  });
  it("survivor FRA differs (404.409 survivor table)", () => {
    expect(survivorFraForCohort(1960).label).toBe("66 and 8 months");
    expect(survivorFraForCohort(1962).label).toBe("67");
  });
});

describe("benefit as % of PIA by claiming age — matches SSA OACT ar_drc table", () => {
  const dob1960 = { year: 1960, month: 6, day: 15 };
  const at = (y: number, m = 0) => pct(claimFactor(dob1960, monthAtAge(dob1960, y, m)).factor);
  it("born 1960+: 62→70, 63→75, 64→80, 65→86.667, 66→93.333, 67→100, 70→124", () => {
    // claimFactor at exactly age 62 moves to the earliest eligible month; compare via factors on RF counts instead.
    expect(pct(earlyRetirementFactor(60))).toBe(70);
    expect(at(63)).toBe(75);
    expect(at(64)).toBe(80);
    expect(at(65)).toBe(86.667);
    expect(at(66)).toBe(93.333);
    expect(at(67)).toBe(100);
    expect(at(70)).toBe(124);
    expect(at(72)).toBe(124); // no credits after 70
  });
  it("born 1959: 62→70.833, 70→125.333", () => {
    const d = { year: 1959, month: 8, day: 20 };
    expect(pct(earlyRetirementFactor(fra(d).total - 62 * 12))).toBe(70.833);
    expect(pct(claimFactor(d, monthAtAge(d, 70)).factor)).toBe(125.333);
  });
  it("born 1943–1954: 62→75, 70→132", () => {
    const d = { year: 1950, month: 8, day: 20 };
    expect(pct(earlyRetirementFactor(48))).toBe(75);
    expect(pct(claimFactor(d, monthAtAge(d, 70)).factor)).toBe(132);
  });
});

describe("earliest month (throughout-the-month rule, POMS RS 00202.010)", () => {
  it("born on the 2nd → month of 62nd birthday, 60 reduction months", () => {
    const d = { year: 1962, month: 6, day: 2 };
    expect(describeMonth(earliestRetirementMonth(d)).label).toBe("June 2024");
    expect(claimFactor(d, 0).monthsEarly).toBe(60);
  });
  it("born on the 15th → following month, 59 reduction months", () => {
    const d = { year: 1962, month: 6, day: 15 };
    expect(describeMonth(earliestRetirementMonth(d)).label).toBe("July 2024");
    const r = claimFactor(d, 0);
    expect(r.monthsEarly).toBe(59);
    expect(pct(r.factor)).toBe(70.417);
  });
  it("born on the 1st → birth month (treated as born the month before), 59 months", () => {
    const d = { year: 1962, month: 6, day: 1 };
    expect(describeMonth(earliestRetirementMonth(d)).label).toBe("June 2024");
    expect(claimFactor(d, 0).monthsEarly).toBe(59);
  });
});

describe("spousal and survivor factors", () => {
  it("spousal at 62 with FRA 67 = 65% of the full spousal benefit (32.5% of PIA)", () => {
    expect(pct(spousalFactor(60))).toBe(65);
    expect(pct(spousalFactor(48))).toBe(70);
  });
  it("survivor at 60 = 71.5% regardless of survivor FRA", () => {
    for (const c of [1950, 1958, 1962]) {
      const f = survivorFraForCohort(c);
      expect(pct(survivorFactor(f.total - 60 * 12, f))).toBe(71.5);
    }
  });
  it("month index helper sanity", () => {
    expect(monthIndex(2027, 1) - monthIndex(2026, 12)).toBe(1);
  });
});
