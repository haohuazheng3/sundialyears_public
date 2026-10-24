import { describe, expect, it } from "vitest";
import {
  beneficiaryLifeExpectancy,
  buildPlan,
  classifyBeneficiary,
  compareSpouseOptions,
  computeInherited,
  isMinorAtDeath,
  notMoreThanTenYearsYounger,
  ownerRbdStatus,
  ownerRemainingLifeExpectancy,
  projectSchedule,
  requirementFor,
  singleLife,
  spouseLifeExpectancy,
  yearReaching59Half,
  type InheritedInput,
} from "../inherited";
import { SINGLE_LIFE, UNIFORM_LIFETIME } from "@/data/params/rmd";

const d = (year: number, month = 6, day = 15) => ({ year, month, day });

/** Adult child (non-EDB) of an owner born 1940 who died mid-2021 — after the RBD. */
const base: InheritedInput = {
  ownerDob: d(1940, 3, 10),
  ownerDod: d(2021, 6, 1),
  beneDob: d(1967, 2, 1),
  relationship: "other",
  account: "ira",
  year: 2026,
  balance: 100000,
  growth: 0,
};

describe("Single Life Table lookups (Treas. Reg. §1.401(a)(9)-9(b))", () => {
  it("reads the regulation values, clamps at 0 and 120+", () => {
    expect(singleLife(55)).toBe(31.6);
    expect(singleLife(0)).toBe(84.6);
    expect(singleLife(-2)).toBe(84.6);
    expect(singleLife(130)).toBe(SINGLE_LIFE[120]);
  });

  it("Pub. 590-B worked example: father died 2021, beneficiary 55 in 2022 → 2026 divisor 31.6 − 4 = 27.6", () => {
    const le = beneficiaryLifeExpectancy(d(1967), 2021, 2026);
    expect(le.age).toBe(55);
    expect(le.lookupYear).toBe(2022);
    expect(le.initial).toBe(31.6);
    expect(le.value).toBe(27.6);
  });

  it("non-recalculating: the divisor drops by exactly 1.0 every year, never re-looked-up", () => {
    const vals = [2022, 2023, 2024, 2025, 2026, 2027].map((y) => beneficiaryLifeExpectancy(d(1967), 2021, y).value);
    expect(vals).toEqual([31.6, 30.6, 29.6, 28.6, 27.6, 26.6]);
    // A fresh lookup at age 59 (2026) would give a different number — the rule forbids it.
    expect(singleLife(59)).not.toBe(27.6);
  });

  it("owner's remaining life expectancy starts at the age in the year of death, minus 1 per later year", () => {
    const o = ownerRemainingLifeExpectancy(d(1948), 2025, 2026);
    expect(o.age).toBe(77);
    expect(o.initial).toBe(SINGLE_LIFE[77]);
    expect(o.value).toBe(Math.round((SINGLE_LIFE[77] - 1) * 10) / 10);
  });

  it("surviving spouse is recalculated each year at the current age", () => {
    expect(spouseLifeExpectancy(d(1960), 2026).value).toBe(SINGLE_LIFE[66]);
    expect(spouseLifeExpectancy(d(1960), 2027).value).toBe(SINGLE_LIFE[67]);
  });
});

describe("Eligible designated beneficiary tests (Treas. Reg. §1.401(a)(9)-4)", () => {
  it("reg example: owner born Oct 1, 1953 → a beneficiary born on or before Oct 1, 1963 is not more than 10 years younger", () => {
    expect(notMoreThanTenYearsYounger(d(1953, 10, 1), d(1963, 10, 1))).toBe(true);
    expect(notMoreThanTenYearsYounger(d(1953, 10, 1), d(1963, 10, 2))).toBe(false);
    expect(notMoreThanTenYearsYounger(d(1953, 10, 1), d(1940, 1, 1))).toBe(true); // older always qualifies
  });

  it("minor child: majority is reached ON the 21st birthday", () => {
    expect(isMinorAtDeath(d(2005, 3, 1), d(2026, 2, 28))).toBe(true);
    expect(isMinorAtDeath(d(2005, 3, 1), d(2026, 3, 1))).toBe(false);
  });

  it("classifies each relationship, checking the dates", () => {
    const owner = d(1950, 1, 1);
    const dod = d(2025, 7, 1);
    expect(classifyBeneficiary("spouse", owner, d(1975), dod)).toMatchObject({ category: "spouse", edb: true });
    expect(classifyBeneficiary("disabled", owner, d(1990), dod)).toMatchObject({ category: "disabled", edb: true });
    expect(classifyBeneficiary("child", owner, d(2010), dod)).toMatchObject({ category: "minor-child", edb: true });
    expect(classifyBeneficiary("child", owner, d(1980), dod)).toMatchObject({ category: "designated", edb: false, notes: ["child-not-minor"] });
    expect(classifyBeneficiary("close-age", owner, d(1955), dod)).toMatchObject({ category: "close-age", edb: true });
    expect(classifyBeneficiary("close-age", owner, d(1965), dod)).toMatchObject({ category: "designated", edb: false, notes: ["close-age-too-young"] });
    expect(classifyBeneficiary("other", owner, d(1952), dod)).toMatchObject({ category: "close-age", edb: true, notes: ["other-is-close-age"] });
    expect(classifyBeneficiary("other", owner, d(1985), dod)).toMatchObject({ category: "designated", edb: false });
    expect(classifyBeneficiary("estate", owner, d(1985), dod)).toMatchObject({ category: "none", edb: false });
  });
});

describe("Required beginning date status", () => {
  it("traditional IRA: death on/after April 1 of the year after the RMD-age year", () => {
    // Born 1950 → RMD age 72 → first year 2022 → RBD April 1, 2023.
    expect(ownerRbdStatus(d(1950), d(2023, 3, 31), "ira").diedOnOrAfterRbd).toBe(false);
    expect(ownerRbdStatus(d(1950), d(2023, 4, 1), "ira").diedOnOrAfterRbd).toBe(true);
  });
  it("death after reaching RMD age but before the April 1 RBD counts as BEFORE", () => {
    // Born 1953 → 73 in 2026 → RBD April 1, 2027.
    const r = ownerRbdStatus(d(1953), d(2026, 9, 1), "ira");
    expect(r.firstYear).toBe(2026);
    expect(r.diedOnOrAfterRbd).toBe(false);
  });
  it("Roth accounts are always treated as death before the RBD (§1.408-8)", () => {
    const r = ownerRbdStatus(d(1940), d(2024, 5, 1), "roth");
    expect(r.diedOnOrAfterRbd).toBe(false);
    expect(r.treatedAsBefore).toBe("roth");
  });
  it("employer plan, owner still working past RMD age → before the RBD", () => {
    const r = ownerRbdStatus(d(1948), d(2025, 5, 1), "plan", true);
    expect(r.diedOnOrAfterRbd).toBe(false);
    expect(r.treatedAsBefore).toBe("still-working");
    expect(ownerRbdStatus(d(1948), d(2025, 5, 1), "ira", true).diedOnOrAfterRbd).toBe(true);
  });
});

describe("10-year rule (non-eligible designated beneficiary)", () => {
  it("reg example: owner died any day in 2021 → account empty by the end of 2031", () => {
    const p = buildPlan({ ...base, ownerDod: d(2021, 12, 31) });
    expect(p.deadlineYear).toBe(2031);
    expect(buildPlan({ ...base, ownerDod: d(2021, 1, 1) }).deadlineYear).toBe(2031);
  });

  it("owner died after RBD: annual RMDs in years 1–9 using the Pub. 590-B divisor (27.6), plus the deadline", () => {
    const r = computeInherited(base);
    expect(r.plan.method).toBe("ten-year-annual");
    expect(r.thisYear.status).toBe("annual");
    expect(r.thisYear.divisor?.value).toBe(27.6);
    expect(r.thisYear.divisor?.basis).toBe("beneficiary");
    expect(r.thisYear.amount).toBe(3623.19); // 100,000 ÷ 27.6
    expect(r.plan.deadlineYear).toBe(2031);
  });

  it("2021–2024 relief: waived years listed, 2025+ required, deadline NOT extended, divisor NOT restarted", () => {
    // FR preamble: "if an employee died in 2020, then in 2025, there are six years remaining in the 10-year period".
    const p = buildPlan({ ...base, ownerDod: d(2020, 8, 1) });
    expect(p.waivedYears).toEqual([2021, 2022, 2023, 2024]);
    expect(p.deadlineYear).toBe(2030);
    expect(p.deadlineYear! - 2025 + 1).toBe(6);
    const r2024 = requirementFor(p, 2024, 100000);
    expect(r2024.status).toBe("waived");
    expect(r2024.amount).toBe(0);
    expect(r2024.computed).toBeGreaterThan(0);
    const r2025 = requirementFor(p, 2025, 100000);
    expect(r2025.status).toBe("annual");
    // Beneficiary born 1967 is 54 in 2021 (year after death); 2025 is 4 years later.
    expect(r2025.divisor?.value).toBe(Math.round((SINGLE_LIFE[54] - 4) * 10) / 10);
    expect(buildPlan({ ...base, ownerDod: d(2023, 8, 1) }).waivedYears).toEqual([2024]);
    expect(buildPlan({ ...base, ownerDod: d(2024, 8, 1) }).waivedYears).toEqual([]);
  });

  it("owner died before RBD: no yearly RMDs in years 1–9, only the deadline", () => {
    const r = computeInherited({ ...base, ownerDob: d(1962), ownerDod: d(2024, 3, 1), beneDob: d(1990) });
    expect(r.plan.method).toBe("ten-year-lump");
    expect(r.thisYear.status).toBe("no-annual");
    expect(r.thisYear.amount).toBe(0);
    expect(r.plan.deadlineYear).toBe(2034);
    expect(requirementFor(r.plan, 2034, 50000)).toMatchObject({ status: "final-year", amount: 50000 });
    expect(requirementFor(r.plan, 2035, 50000).status).toBe("past-deadline");
  });

  it("inherited Roth (non-EDB): $0 a year even if the owner was 85, empty by year 10", () => {
    const r = computeInherited({ ...base, ownerDob: d(1939), ownerDod: d(2024, 5, 1), account: "roth" });
    expect(r.plan.method).toBe("ten-year-lump");
    expect(r.thisYear.amount).toBe(0);
    expect(r.plan.deadlineYear).toBe(2034);
    expect(r.deathYearRmd).toBeNull();
  });

  it("the final year requires the whole balance; years before it only the annual RMD", () => {
    const p = buildPlan(base);
    expect(requirementFor(p, 2030, 50000).status).toBe("annual");
    expect(requirementFor(p, 2031, 50000)).toMatchObject({ status: "final-year", amount: 50000 });
  });
});

describe("Owner died on/after the RBD: greater of the two life expectancies (§1.401(a)(9)-5(d)(1))", () => {
  it("younger close-age beneficiary uses their own (longer) life expectancy", () => {
    const r = computeInherited({ ...base, ownerDob: d(1948, 1, 1), ownerDod: d(2025, 4, 1), beneDob: d(1950, 1, 1), relationship: "close-age" });
    expect(r.plan.method).toBe("life-expectancy");
    expect(r.plan.deadlineYear).toBeNull();
    // Beneficiary 76 in 2026 → 14.1; owner 77 in 2025 → 13.3 − 1 = 12.3.
    expect(r.thisYear.divisor?.value).toBe(SINGLE_LIFE[76]);
    expect(r.thisYear.divisor?.basis).toBe("beneficiary");
  });

  it("older beneficiary uses the owner's remaining life expectancy", () => {
    const r = computeInherited({ ...base, ownerDob: d(1950, 1, 1), ownerDod: d(2025, 4, 1), beneDob: d(1940, 1, 1), relationship: "close-age" });
    // Owner 75 in 2025 → 14.8 − 1 = 13.8; beneficiary 86 in 2026 → much shorter.
    expect(r.thisYear.divisor?.basis).toBe("owner");
    expect(r.thisYear.divisor?.value).toBe(Math.round((SINGLE_LIFE[75] - 1) * 10) / 10);
  });
});

describe("Other eligible designated beneficiaries", () => {
  it("disabled / chronically ill: life-expectancy payouts with no 10-year cap", () => {
    const r = computeInherited({ ...base, ownerDob: d(1960), ownerDod: d(2024, 5, 1), beneDob: d(1990), relationship: "disabled" });
    expect(r.plan.method).toBe("life-expectancy");
    expect(r.plan.deadlineYear).toBeNull();
    // Age 35 in 2025 → 50.5, minus 1 for 2026.
    expect(r.thisYear.divisor?.value).toBe(Math.round((SINGLE_LIFE[35] - 1) * 10) / 10);
  });

  it("EDB whose owner died before the RBD may elect the 10-year rule instead", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1960), ownerDod: d(2024, 5, 1), beneDob: d(1990), relationship: "disabled", electTenYear: true };
    const p = buildPlan(i);
    expect(p.canElectTenYear).toBe(true);
    expect(p.method).toBe("ten-year-lump");
    expect(p.deadlineYear).toBe(2034);
  });

  it("no 10-year election when the owner died after the RBD", () => {
    const p = buildPlan({ ...base, ownerDob: d(1945), ownerDod: d(2024, 5, 1), beneDob: d(1990), relationship: "disabled", electTenYear: true });
    expect(p.canElectTenYear).toBe(false);
    expect(p.method).toBe("life-expectancy");
  });

  it("minor child: life expectancy until 21, then must empty by the year of the 31st birthday", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1975), ownerDod: d(2025, 6, 1), beneDob: d(2012, 3, 1), relationship: "child" };
    const r = computeInherited(i);
    expect(r.plan.method).toBe("minor-child");
    expect(r.plan.majorityYear).toBe(2033);
    expect(r.plan.deadlineYear).toBe(2043);
    expect(r.thisYear.divisor?.value).toBe(SINGLE_LIFE[14]); // age 14 in 2026 (year after death)
    // Annual RMDs keep going after 21 (2034–2042), whole balance in 2043.
    expect(requirementFor(r.plan, 2035, 10000).status).toBe("annual");
    expect(requirementFor(r.plan, 2043, 10000).status).toBe("final-year");
  });

  it("a child who was already 21 at the death is an ordinary designated beneficiary (10-year rule)", () => {
    const p = buildPlan({ ...base, ownerDob: d(1975), ownerDod: d(2025, 8, 1), beneDob: d(2004, 5, 1), relationship: "child" });
    expect(p.category).toBe("designated");
    expect(p.method).toBe("ten-year-lump");
  });
});

describe("Surviving spouse", () => {
  it("owner died before RBD: may wait until the year the owner would have reached RMD age; recalculated divisor", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1960), ownerDod: d(2025, 2, 1), beneDob: d(1958), relationship: "spouse", spouseChoice: "bene" };
    const p = buildPlan(i);
    expect(p.method).toBe("spouse-beneficiary");
    expect(p.firstYear).toBe(2035); // owner born 1960 → RMD age 75
    expect(p.delayedStart).toBe(true);
    expect(requirementFor(p, 2026, 100000).status).toBe("not-started");
    expect(requirementFor(p, 2035, 100000).divisor?.value).toBe(SINGLE_LIFE[77]);
  });

  it("owner died after RBD: RMDs start the year after death, greater of spouse (recalculated) or owner remaining LE", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1945), ownerDod: d(2024, 6, 1), beneDob: d(1965), relationship: "spouse", spouseChoice: "bene" };
    const r = computeInherited(i);
    expect(r.plan.firstYear).toBe(2025);
    expect(r.thisYear.divisor?.value).toBe(SINGLE_LIFE[61]);
    expect(r.thisYear.divisor?.basis).toBe("spouse");
  });

  it("treat as own: own RMD age and the Uniform Lifetime Table", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1945), ownerDod: d(2024, 6, 1), beneDob: d(1950), relationship: "spouse", spouseChoice: "own" };
    const r = computeInherited(i);
    expect(r.plan.method).toBe("spouse-own");
    expect(r.thisYear.divisor?.value).toBe(UNIFORM_LIFETIME[76]);
    expect(r.thisYear.divisor?.basis).toBe("uniform");
  });

  it("treat as own (Roth): never any RMD", () => {
    const r = computeInherited({ ...base, account: "roth", relationship: "spouse", spouseChoice: "own", beneDob: d(1942) });
    expect(r.plan.firstYear).toBeNull();
    expect(r.thisYear.amount).toBe(0);
  });

  it("younger spouse → treating it as own starts later", () => {
    const c = compareSpouseOptions({ ...base, ownerDob: d(1945), ownerDod: d(2024, 6, 1), beneDob: d(1965, 1, 1), relationship: "spouse" });
    expect(c.under59HalfAllYear).toBe(false);
    expect(c.own.plan.firstYear).toBe(2040);
    expect(c.bene.thisYear.amount).toBeGreaterThan(0);
    expect(c.own.thisYear.amount).toBe(0);
    expect(c.suggestion).toBe("own-starts-later");
  });

  it("spouse under 59½ → keep it as an inherited IRA (no 10% early-withdrawal tax)", () => {
    const c = compareSpouseOptions({ ...base, ownerDob: d(1970), ownerDod: d(2025, 6, 1), beneDob: d(1975), relationship: "spouse" });
    expect(c.under59HalfAllYear).toBe(true);
    expect(c.suggestion).toBe("stay-under-59");
  });

  it("older spouse of a younger owner who died before RBD → staying a beneficiary starts later", () => {
    const c = compareSpouseOptions({ ...base, ownerDob: d(1960), ownerDod: d(2025, 2, 1), beneDob: d(1955), relationship: "spouse" });
    expect(c.bene.plan.firstYear).toBe(2035); // owner born 1960 would have reached 75 in 2035
    expect(c.own.plan.firstYear).toBe(2028); // spouse born 1955 reaches 73 in 2028
    expect(c.suggestion).toBe("bene-starts-later");
  });

  it("59½ is reached six calendar months after the 59th birthday", () => {
    expect(yearReaching59Half(d(1970, 6, 30))).toBe(2029);
    expect(yearReaching59Half(d(1970, 7, 1))).toBe(2030);
  });
});

describe("No designated beneficiary (estate, charity)", () => {
  it("owner died before RBD → 5-year rule; 2020 is disregarded for pre-2020 deaths", () => {
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2024, 1, 1), relationship: "estate" })).toMatchObject({ method: "five-year", deadlineYear: 2029 });
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2017, 1, 1), relationship: "estate" }).deadlineYear).toBe(2023);
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2014, 1, 1), relationship: "estate" }).deadlineYear).toBe(2019);
  });
  it("owner died after RBD → owner's remaining life expectancy, no fixed deadline", () => {
    const r = computeInherited({ ...base, relationship: "estate" });
    expect(r.plan.method).toBe("owner-life");
    // Owner 81 in 2021 → minus 5 for 2026.
    expect(r.thisYear.divisor?.value).toBe(Math.round((SINGLE_LIFE[81] - 5) * 10) / 10);
  });
});

describe("Owners who died before 2020 (pre-SECURE Act stretch)", () => {
  it("an adult child keeps stretching over life expectancy, no 10-year deadline", () => {
    const r = computeInherited({ ...base, ownerDob: d(1935), ownerDod: d(2015, 3, 1), beneDob: d(1965) });
    expect(r.plan.grandfathered).toBe(true);
    expect(r.plan.method).toBe("life-expectancy");
    expect(r.plan.deadlineYear).toBeNull();
    // Age 51 in 2016, minus 10 for 2026 (pre-2022 life expectancy reset to the 2022 table at the original age).
    expect(r.thisYear.divisor?.value).toBe(Math.round((SINGLE_LIFE[51] - 10) * 10) / 10);
  });
});

describe("Year-of-death RMD (§1.401(a)(9)-5(c)(1))", () => {
  const i: InheritedInput = { ...base, ownerDob: d(1950, 2, 1), ownerDod: d(2026, 5, 1), beneDob: d(1980), year: 2026, balance: 300000 };
  it("owner died after RBD and hadn't taken it: the beneficiary owes the owner's Uniform-table RMD this year", () => {
    const r = computeInherited(i);
    expect(r.deathYearRmd?.ownerAge).toBe(76);
    expect(r.deathYearRmd?.period).toBe(UNIFORM_LIFETIME[76]);
    expect(r.deathYearRmd?.amount).toBe(12658.23); // 300,000 ÷ 23.7
    expect(r.thisYear.amount).toBe(0);
    expect(r.totalDue).toBe(12658.23);
    expect(r.deathYearRmd?.waiverYear).toBe(2027);
    expect(r.minimum.rows[0].withdrawal).toBe(12658.23);
  });
  it("already taken by the owner → nothing more this year", () => {
    expect(computeInherited({ ...i, ownerTookDeathYearRmd: true }).totalDue).toBe(0);
  });
  it("spouse more than 10 years younger and sole beneficiary → Joint table for the death-year RMD", () => {
    const r = computeInherited({ ...i, relationship: "spouse", beneDob: d(1965), spouseChoice: "bene" });
    expect(r.deathYearRmd?.table).toBe("joint");
  });
  it("owner died before RBD → no death-year RMD at all", () => {
    expect(computeInherited({ ...i, ownerDob: d(1960) }).deathYearRmd).toBeNull();
  });
});

describe("Edge cases", () => {
  it("divisor at 1.0 or less → the whole balance is due; RMD never exceeds the balance", () => {
    const p = buildPlan({ ...base, ownerDob: d(1910), ownerDod: d(2018, 1, 1), beneDob: d(1912), relationship: "close-age" });
    const r = requirementFor(p, 2026, 1000);
    expect(r.status).toBe("all-due");
    expect(r.amount).toBe(1000);
  });
  it("zero or negative balance → $0", () => {
    expect(computeInherited({ ...base, balance: 0 }).thisYear.amount).toBe(0);
    expect(computeInherited({ ...base, balance: -5 }).thisYear.amount).toBe(0);
  });
  it("flags impossible inputs", () => {
    expect(computeInherited({ ...base, ownerDod: d(1939) }).problem).toBe("death-before-birth");
    expect(computeInherited({ ...base, ownerDod: d(2026, 12, 1), year: 2025 }).problem).toBe("year-before-death");
    expect(computeInherited({ ...base, beneDob: d(2022) }).problem).toBe("beneficiary-after-death");
    // A child born within the year after the death (posthumous child) is fine.
    expect(computeInherited({ ...base, relationship: "child", ownerDob: d(1980), ownerDod: d(2025, 11, 1), beneDob: d(2026, 3, 1) }).problem).toBeNull();
    expect(computeInherited({ ...base, relationship: "child", beneDob: d(2027, 1, 1) }).problem).toBe("beneficiary-after-death");
  });
  it("projection: balances never negative, ends by the deadline, even strategy flattens the peak", () => {
    const i: InheritedInput = { ...base, ownerDob: d(1962), ownerDod: d(2024, 3, 1), beneDob: d(1990), balance: 500000, growth: 0.06 };
    const p = buildPlan(i);
    const min = projectSchedule(p, i, "minimum");
    const even = projectSchedule(p, i, "even");
    expect(min.rows[min.rows.length - 1].year).toBe(2034);
    expect(min.rows.every((r) => r.startBalance >= 0 && r.withdrawal <= r.startBalance + 0.01)).toBe(true);
    expect(even.largest).toBeLessThan(min.largest);
    expect(even.total).toBeLessThan(min.total); // money comes out earlier, so less growth is withdrawn
    expect(even.rows[0].withdrawal).toBeCloseTo(500000 / 9, 2);
  });
});

describe("Reviewer additions — official examples and boundaries", () => {
  it("Single Life Table spot values from the regulation: 119 → 1.1, 120+ → 1.0", () => {
    expect(singleLife(119)).toBe(1.1);
    expect(singleLife(120)).toBe(1.0);
    expect(singleLife(125)).toBe(1.0);
  });

  it("§1.401(a)(9)-2(a)(3)(ii): death after reaching RMD age but before the April 1 RBD → no year-of-death RMD, no yearly RMDs for a non-EDB", () => {
    // Born 1953 → 73 in 2026 → RBD April 1, 2027; died September 2026.
    const r = computeInherited({ ...base, ownerDob: d(1953, 2, 1), ownerDod: d(2026, 9, 1), beneDob: d(1980), year: 2026 });
    expect(r.deathYearRmd).toBeNull();
    expect(r.plan.method).toBe("ten-year-lump");
    expect(r.totalDue).toBe(0);
    expect(r.plan.deadlineYear).toBe(2036);
  });

  it("70½ vs 72 boundary: born June 30, 1949 → RBD April 1, 2020; born July 1, 1949 → RBD April 1, 2022", () => {
    expect(ownerRbdStatus(d(1949, 6, 30), d(2021, 1, 1), "ira")).toMatchObject({ applicableAge: 70.5, firstYear: 2019, diedOnOrAfterRbd: true });
    expect(ownerRbdStatus(d(1949, 7, 1), d(2021, 1, 1), "ira")).toMatchObject({ applicableAge: 72, firstYear: 2021, diedOnOrAfterRbd: false });
  });

  it("Notice 2024-35 relief: a 2023 death waives only 2024; a 2020 death before the RBD has nothing to waive", () => {
    expect(buildPlan({ ...base, ownerDod: d(2023, 5, 1) }).waivedYears).toEqual([2024]);
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2020, 5, 1) }).waivedYears).toEqual([]);
  });

  it("surviving spouse of a Roth owner keeping it inherited: RMDs may wait until the owner's RMD-age year (§1.408-8)", () => {
    const p = buildPlan({ ...base, account: "roth", ownerDob: d(1962), ownerDod: d(2025, 3, 1), beneDob: d(1963), relationship: "spouse", spouseChoice: "bene" });
    expect(p.method).toBe("spouse-beneficiary");
    expect(p.firstYear).toBe(2037); // owner born 1962 → RMD age 75 → 2037
    expect(p.delayedStart).toBe(true);
  });

  it("minor child who turns 21 in the year of death: 10-year clock runs from that year", () => {
    const p = buildPlan({ ...base, ownerDob: d(1975), ownerDod: d(2025, 1, 10), beneDob: d(2004, 11, 1), relationship: "child" });
    expect(p.method).toBe("minor-child");
    expect(p.majorityYear).toBe(2025);
    expect(p.deadlineYear).toBe(2035);
  });

  it("child born after the owner died is a minor child; first divisor is the age-0 factor", () => {
    const r = computeInherited({ ...base, ownerDob: d(1985), ownerDod: d(2025, 11, 1), beneDob: d(2026, 3, 1), relationship: "child" });
    expect(r.problem).toBeNull();
    expect(r.plan.category).toBe("minor-child");
    expect(r.thisYear.divisor?.value).toBe(SINGLE_LIFE[0]);
  });

  it("a minor child may elect the 10-year rule when the owner died before the RBD", () => {
    const p = buildPlan({ ...base, ownerDob: d(1975), ownerDod: d(2025, 6, 1), beneDob: d(2012, 3, 1), relationship: "child", electTenYear: true });
    expect(p.method).toBe("ten-year-lump");
    expect(p.deadlineYear).toBe(2035);
  });

  it("disabled child (reg §1.401(a)(9)-4(e)(9) Ex. 1): choosing “disabled” keeps life-expectancy payouts with no deadline", () => {
    const p = buildPlan({ ...base, ownerDob: d(1975), ownerDod: d(2025, 6, 1), beneDob: d(2012, 3, 1), relationship: "disabled" });
    expect(p.method).toBe("life-expectancy");
    expect(p.deadlineYear).toBeNull();
  });
});

describe("Reviewer additions — spouse treating the account as their own", () => {
  it("own-RMD-age year after the death: that first RMD may wait until April 1 of the next year", () => {
    // Spouse born 1953 reaches 73 in 2026; owner died 2025.
    const p = buildPlan({ ...base, ownerDob: d(1950), ownerDod: d(2025, 6, 1), beneDob: d(1953, 5, 1), relationship: "spouse", spouseChoice: "own" });
    expect(p.firstYear).toBe(2026);
    expect(p.ownFirstYearRbd).toBe(2026);
  });

  it("spouse already past RMD age: the first RMD as owner is the year after death, due December 31 (no April 1 grace)", () => {
    const p = buildPlan({ ...base, ownerDob: d(1945), ownerDod: d(2025, 6, 1), beneDob: d(1948, 5, 1), relationship: "spouse", spouseChoice: "own" });
    expect(p.firstYear).toBe(2026);
    expect(p.ownFirstYearRbd).toBeNull();
    expect(buildPlan({ ...base, relationship: "spouse", spouseChoice: "bene" }).ownFirstYearRbd).toBeNull();
  });

  it("Roth made your own: no RMD and no deadline at all", () => {
    const r = computeInherited({ ...base, account: "roth", relationship: "spouse", spouseChoice: "own", beneDob: d(1975) });
    expect(r.plan.method).toBe("spouse-own");
    expect(r.plan.firstYear).toBeNull();
    expect(r.plan.deadlineYear).toBeNull();
    expect(r.totalDue).toBe(0);
    expect(r.minimum.rows.every((x) => x.withdrawal === 0)).toBe(true);
  });

  it("Roth: suggest making it your own even under 59½ (own Roth has no RMDs; §72(t) only reaches the taxable part)", () => {
    const c = compareSpouseOptions({ ...base, account: "roth", ownerDob: d(1944), ownerDod: d(2024, 8, 20), beneDob: d(1970, 9, 3), relationship: "spouse" });
    expect(c.under59HalfAllYear).toBe(true);
    expect(c.bene.thisYear.amount).toBeGreaterThan(0); // inherited Roth: life-expectancy RMDs
    expect(c.own.plan.firstYear).toBeNull();
    expect(c.suggestion).toBe("own-roth");
  });

  it("traditional IRA under 59½ still suggests keeping it inherited", () => {
    const c = compareSpouseOptions({ ...base, ownerDob: d(1944), ownerDod: d(2024, 8, 20), beneDob: d(1970, 9, 3), relationship: "spouse" });
    expect(c.suggestion).toBe("stay-under-59");
  });
});

describe("Reviewer additions — bad inputs never produce negative, NaN or infinite amounts", () => {
  it("negative balance in the year of death: owed death-year RMD and total stay at $0", () => {
    const r = computeInherited({ ...base, ownerDob: d(1950, 2, 1), ownerDod: d(2026, 5, 1), year: 2026, balance: -5 });
    expect(r.deathYearRmd?.amount).toBe(0);
    expect(r.totalDue).toBe(0);
    expect(r.minimum.rows.every((x) => x.withdrawal === 0 && x.startBalance === 0)).toBe(true);
  });

  it("NaN / Infinity balance → $0", () => {
    for (const balance of [NaN, Infinity, -Infinity]) {
      const r = computeInherited({ ...base, balance });
      expect(r.totalDue).toBe(0);
      expect(r.thisYear.amount).toBe(0);
      expect(Number.isFinite(r.minimum.total)).toBe(true);
    }
  });

  it("absurd growth rates keep the projection finite", () => {
    for (const growth of [1e300, -50, NaN, Infinity]) {
      const r = computeInherited({ ...base, relationship: "disabled", growth });
      expect(r.minimum.rows.every((x) => Number.isFinite(x.withdrawal) && Number.isFinite(x.startBalance) && x.withdrawal >= 0)).toBe(true);
      expect(Number.isFinite(r.minimum.total)).toBe(true);
    }
  });

  it("grid sweep: every relationship × account × death date × year gives finite, non-negative results that never exceed the balance", () => {
    const rels = ["spouse", "child", "disabled", "close-age", "other", "estate"] as const;
    const accts = ["ira", "plan", "roth"] as const;
    const owners = [d(1930, 1, 1), d(1949, 6, 30), d(1949, 7, 1), d(1953, 12, 31), d(1960, 2, 29), d(1975, 3, 1)];
    const deaths = [d(1995, 6, 1), d(2016, 3, 1), d(2020, 1, 1), d(2021, 12, 31), d(2024, 4, 1), d(2026, 1, 1), d(2026, 10, 23)];
    const benes = [d(1925, 1, 1), d(1952, 2, 29), d(1970, 9, 3), d(2008, 12, 31)];
    let n = 0;
    for (const relationship of rels)
      for (const account of accts)
        for (const ownerDob of owners)
          for (const ownerDod of deaths)
            for (const beneDob of benes)
              for (const year of [2026, 2027])
                for (const spouseChoice of ["bene", "own"] as const) {
                  const i: InheritedInput = { ownerDob, ownerDod, beneDob, relationship, account, year, balance: 250000, growth: 0.05, spouseChoice, ownerStillWorking: account === "plan" };
                  const r = computeInherited(i);
                  n++;
                  if (r.problem) continue;
                  expect(Number.isFinite(r.totalDue) && r.totalDue >= 0 && r.totalDue <= 250000).toBe(true);
                  expect(r.minimum.rows.length).toBeGreaterThan(0);
                  for (const row of r.minimum.rows) {
                    expect(Number.isFinite(row.withdrawal) && row.withdrawal >= 0 && row.withdrawal <= row.startBalance + 0.01).toBe(true);
                  }
                  if (r.plan.deadlineYear != null && r.minimum.rows.length) expect(r.minimum.rows[r.minimum.rows.length - 1].year).toBeLessThanOrEqual(Math.max(year, r.plan.deadlineYear));
                }
    expect(n).toBeGreaterThan(5000);
  });
});

describe("Adversarial review — boundaries behind the page text", () => {
  it("5-year rule: a 2015 death is the first whose window contains 2020 → 2021; 2014 → 2019 (§1.401(a)(9)-3(c)(2))", () => {
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2015, 12, 31), relationship: "estate" }).deadlineYear).toBe(2021);
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2014, 12, 31), relationship: "estate" }).deadlineYear).toBe(2019);
    expect(buildPlan({ ...base, ownerDob: d(1962), ownerDod: d(2020, 1, 1), relationship: "estate" }).deadlineYear).toBe(2025);
  });

  it("page claim: a beneficiary born the same year as the owner (or later) never needs the owner's remaining life expectancy", () => {
    // Bene LE = SL(a+1) − (y−D−1); owner LE = SL(a) − (y−D). The Single Life Table never drops by more than 1.0 a year.
    for (let a = 0; a < 120; a++) expect(SINGLE_LIFE[a] - SINGLE_LIFE[a + 1]).toBeLessThanOrEqual(1 + 1e-9);
    for (const ownerYear of [1925, 1935, 1945]) {
      const p = buildPlan({ ...base, ownerDob: d(ownerYear, 1, 1), ownerDod: d(2021, 6, 1), beneDob: d(ownerYear, 12, 31), relationship: "other" });
      expect(p.rbd.diedOnOrAfterRbd).toBe(true);
      expect(p.divisor(2026)?.basis).toBe("beneficiary");
    }
    // One birth year older → the owner's factor wins.
    const older = buildPlan({ ...base, ownerDob: d(1940, 1, 1), ownerDod: d(2021, 6, 1), beneDob: d(1939, 1, 1), relationship: "other" });
    expect(older.divisor(2026)?.basis).toBe("owner");
  });

  it("pre-2020 death whose divisor ran out years ago: whole balance due, never a negative amount", () => {
    // Owner born 1920 died 2000 (after RBD); beneficiary 89 in 2001 → SL(89) 6.1 vs owner 80 in 2000 → SL(80) 11.2.
    const i: InheritedInput = { ...base, ownerDob: d(1920, 1, 1), ownerDod: d(2000, 6, 1), beneDob: d(1912, 1, 1), relationship: "other" };
    const r = computeInherited(i);
    expect(r.plan.method).toBe("life-expectancy");
    expect(r.thisYear.divisor?.value).toBeCloseTo(11.2 - 26, 5);
    expect(r.thisYear.status).toBe("all-due");
    expect(r.totalDue).toBe(100000);
    expect(r.minimum.rows).toHaveLength(1);
  });

  it("minor-child test uses the exact age on the date of death, not the birth-year difference", () => {
    // Born Dec 31, 2004; owner died Jan 2, 2026 → 21 (not 22) and no longer a minor; Dec 30, 2025 → still 20.
    expect(isMinorAtDeath(d(2004, 12, 31), d(2026, 1, 2))).toBe(false);
    expect(isMinorAtDeath(d(2004, 12, 31), d(2025, 12, 30))).toBe(true);
    expect(buildPlan({ ...base, ownerDob: d(1975), ownerDod: d(2025, 12, 30), beneDob: d(2004, 12, 31), relationship: "child" })).toMatchObject({
      method: "minor-child",
      majorityYear: 2025,
      deadlineYear: 2035,
    });
  });
});
