import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BIRTH_YEARS,
  birthMonthRows,
  birthYearMeta,
  birthYearProfile,
  claimingRows,
  cohortTags,
  colasSince62,
  fraChartRows,
  lifeExpectancyFromQ,
  medicareMonth,
  monthLabel,
  pct3,
  pctAtFirstPossibleMonth,
  periodLifeExpectancy,
  phaseOf,
  rmdGroups,
  seniorDeductionYears,
  survivalFromQ,
  survivorRows,
} from "./timeline";
import { cohortYear, drcPerMonth, earlyRetirementFactor, fraMonth } from "@/lib/calc/ss-core";
import { CLAIMING_RULES, SS_YEAR } from "@/data/params/social-security";
import { EARLY_REDUCTION } from "@/data/params/birth-year-extra";
import { birthYearFaq, fraFaq, hubFaq, rmdAnswer } from "./content";
import { earningsTestRows, pctIfClaimingIn } from "./timeline";
import { FINDER_DEFAULT_DOB, FINDER_FIRST_YEAR, finderDob, fraFinder, fractionOfOnePct } from "./basics";

const root = path.resolve(__dirname, "../../../..");
const research = (name: string) => JSON.parse(readFileSync(path.join(root, "docs/research", `${name}.json`), "utf8"));
const table = (file: string, startsWith: string) => {
  const t = research(file).tables.find((x: { name: string }) => x.name.startsWith(startsWith));
  if (!t) throw new Error(`research table not found: ${startsWith}`);
  return t as { columns: string[]; rows: (string | number)[][] };
};
const cohortQx = JSON.parse(readFileSync(path.join(root, "public/data/cohort-qx-tr2026.json"), "utf8")) as {
  ages: number[];
  male: Record<string, number[]>;
  female: Record<string, number[]>;
};
const num3 = (x: number) => Math.round(x * 100000) / 1000;

describe("claiming percentages reproduce SSA OACT ar_drc.html (docs/research/ssa_annual.json)", () => {
  const t = table("ssa_annual", "Benefit as percent of PIA by claiming age");
  const rows = claimingRows();
  it("same birth-year groups, FRA and percentages at 62–67 and 70", () => {
    expect(rows.map((r) => r.label)).toEqual(["1943–1954", "1955", "1956", "1957", "1958", "1959", "1960 or later"]);
    t.rows.forEach((src, i) => {
      const r = rows[i];
      expect(r.fra.label).toBe(src[1]);
      const at = (age: number) => num3(r.pcts[age - 62]);
      expect([at(62), at(63), at(64), at(65), at(66), at(67), at(70)]).toEqual(src.slice(3));
    });
  });
  it("ages 68 and 69 sit 8 points apart on the delayed-credit line", () => {
    const r1960 = rows[rows.length - 1];
    expect(num3(r1960.pcts[6])).toBe(108);
    expect(num3(r1960.pcts[7])).toBe(116);
    expect(pct3(r1960.pcts[8])).toBe("124%");
  });
});

describe("FRA chart (20 CFR 404.409(a); SSA quickcalc earlyretire table in ss_mechanics.json)", () => {
  const src = table("ss_mechanics", "Full retirement age and age-62 percentages");
  const rows = fraChartRows();
  it("one row per FRA step, 1937 or earlier → 1960 or later", () => {
    expect(rows[0].label).toBe("1937 or earlier");
    expect(rows[rows.length - 1].label).toBe("1960 or later");
    expect(rows).toHaveLength(src.rows.length);
  });
  it("FRA, reduction months at 62 (born on the 2nd) and % of PIA at 62 match SSA", () => {
    src.rows.forEach((s, i) => {
      const r = rows[i];
      expect(r.fra.years).toBe(s[2]);
      expect(r.fra.months).toBe(s[3]);
      expect(r.monthsEarlyAt62).toBe(s[4]);
      expect(Math.round(r.pctAt62 * 1e6) / 1e4).toBe(s[5]);
    });
  });
  it("delayed credits and the age-70 percentage match POMS RS 00615.692", () => {
    const drc = table("ss_mechanics", "Delayed retirement credits by date of birth");
    for (const r of rows) {
      // POMS rows run from January 2 of year Y to January 1 of a later year → SSA cohorts Y … (end year − 1).
      const row = drc.rows.find((x) =>
        x[1] === "(later)" ? r.cohort >= 1960 : Number(String(x[0]).slice(0, 4)) <= r.cohort && r.cohort < Number(String(x[1]).slice(0, 4)),
      );
      expect(row, `POMS row for ${r.label}`).toBeTruthy();
      expect(Math.round(r.drcPerYear * 1000) / 10).toBe(row![4]);
      expect(Math.round((r.pctAt70 - 1) * 10000) / 100).toBe(row![6]);
    }
  });
  it("born 1960 or later: first possible month (62 and 1 month) pays 70.417%", () => {
    expect(num3(pctAtFirstPossibleMonth(1960))).toBe(70.417);
  });
});

describe("survivor FRA (POMS RS 00615.301 table in ss_mechanics.json)", () => {
  const src = table("ss_mechanics", "Survivor (widow(er)) FRA");
  const rows = survivorRows();
  it("same steps, months from 60 and 71.5% at 60", () => {
    expect(rows).toHaveLength(src.rows.length);
    src.rows.forEach((s, i) => {
      const r = rows[i];
      expect(`${r.fra.years}y${r.fra.months}m`).toBe(s[2]);
      expect(r.monthsFrom60).toBe(s[4]);
      expect(num3(r.pctAt60)).toBe(s[5]);
    });
    expect(rows[0].label).toBe("1939 or earlier");
    expect(rows[rows.length - 1].label).toBe("1962 or later");
  });
});

describe("Jan 1 and 1st-of-month birthdays (POMS GN 00302.400 worked examples)", () => {
  it("born Jan 1, 1960 → FRA 66 and 10 months, reached October 2026", () => {
    const p = birthYearProfile(1960, 2026);
    expect(p.jan1.fra.label).toBe("66 and 10 months");
    expect(monthLabel(p.jan1.fraMonth)).toBe("October 2026");
    expect(p.jan1.sameFra).toBe(false);
  });
  it("born March 1, 1960 → FRA month February 2027", () => {
    expect(monthLabel(fraMonth({ year: 1960, month: 3, day: 1 }))).toBe("February 2027");
  });
  it("1943–1954 Jan 1 births keep FRA 66 (except Jan 1, 1943)", () => {
    expect(birthYearProfile(1950, 2026).jan1.sameFra).toBe(true);
    expect(birthYearProfile(1943, 2026).jan1.fra.label).toBe("65 and 10 months");
  });
  it("month table: born mid-month 1960 → earliest claim the month after the 62nd birthday", () => {
    const rows = birthMonthRows(1960);
    expect(monthLabel(rows[5].earliestClaim)).toBe("July 2022");
    expect(monthLabel(rows[5].fraMonth)).toBe("June 2027");
    expect(monthLabel(rows[5].age70)).toBe("June 2030");
  });
  it("1959: FRA spans two calendar years by birth month", () => {
    const p = birthYearProfile(1959, 2026);
    expect(p.fraYears).toEqual([
      { year: 2025, months: [1, 2] },
      { year: 2026, months: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    ]);
    expect(p.mainFraYear).toBe(2026);
  });
});

describe("Medicare initial enrollment period (42 CFR 407.14)", () => {
  it("born June 15, 1961 → eligible June 2026; IEP March–September 2026", () => {
    const row = birthMonthRows(1961)[5];
    expect(monthLabel(row.medicare)).toBe("June 2026");
    expect(monthLabel(row.iepStart)).toBe("March 2026");
    expect(monthLabel(row.iepEnd)).toBe("September 2026");
  });
  it("born on the 1st → eligibility the month before the birthday (Medicare.gov)", () => {
    expect(monthLabel(medicareMonth({ year: 1961, month: 6, day: 1 }))).toBe("May 2026");
  });
});

describe("COLAs from age 62 (20 CFR 404.212; ss_mechanics PIA formula example)", () => {
  it("born 1960 (eligible 2022): COLAs 8.7, 3.2, 2.5, 2.8, 3.6 — December 2022 through December 2026", () => {
    const c = colasSince62(1960);
    expect(c.rows.map((r) => r.pct)).toEqual([8.7, 3.2, 2.5, 2.8, 3.6]);
    expect(c.rows[0].effectiveDec).toBe(2022);
    expect(c.rows[0].paidJan).toBe(2023);
    expect(c.cumulative).toBeCloseTo(1.087 * 1.032 * 1.025 * 1.028 * 1.036 - 1, 10);
  });
  it("born 1964 gets only the December 2026 COLA; born 1965 none yet", () => {
    expect(colasSince62(1964).rows.map((r) => r.pct)).toEqual([3.6]);
    expect(colasSince62(1965).rows).toEqual([]);
    expect(colasSince62(1965).cumulative).toBe(0);
  });
  it("every page year has a complete COLA history (no gaps)", () => {
    for (const y of BIRTH_YEARS) expect(() => colasSince62(y)).not.toThrow();
  });
});

describe("RMD applicable age by birth month (Treas. Reg. §1.401(a)(9)-2(b)(2))", () => {
  it("1948: 70½ — first year depends on half of the year", () => {
    expect(rmdGroups(1948)).toEqual([
      { age: 70.5, firstYear: 2018, months: [1, 2, 3, 4, 5, 6] },
      { age: 70.5, firstYear: 2019, months: [7, 8, 9, 10, 11, 12] },
    ]);
  });
  it("1949 splits at July 1: 70½ in 2019, then 72 in 2021", () => {
    expect(rmdGroups(1949)).toEqual([
      { age: 70.5, firstYear: 2019, months: [1, 2, 3, 4, 5, 6] },
      { age: 72, firstYear: 2021, months: [7, 8, 9, 10, 11, 12] },
    ]);
  });
  it("1951 → 73 in 2024; 1959 → 73 in 2032 (proposed regs); 1960 → 75 in 2035", () => {
    expect(rmdGroups(1951)).toEqual([{ age: 73, firstYear: 2024, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }]);
    expect(rmdGroups(1959)[0]).toMatchObject({ age: 73, firstYear: 2032 });
    expect(rmdGroups(1960)[0]).toMatchObject({ age: 75, firstYear: 2035 });
  });
});

describe("senior deduction years (IRS Schedule 1-A birth cutoffs in params/tax.ts)", () => {
  it("1960 and earlier qualify all four years", () => {
    expect(seniorDeductionYears(1960).typical).toEqual([2025, 2026, 2027, 2028]);
  });
  it("1961–1963 phase in; Jan 1 birthdays qualify a year earlier", () => {
    expect(seniorDeductionYears(1961).typical).toEqual([2026, 2027, 2028]);
    expect(seniorDeductionYears(1961).jan1).toEqual([2025, 2026, 2027, 2028]);
    expect(seniorDeductionYears(1962).typical).toEqual([2027, 2028]);
    expect(seniorDeductionYears(1963).typical).toEqual([2028]);
  });
  it("1964: only a Jan 1 birthday qualifies (2028); 1965+: never under current law", () => {
    expect(seniorDeductionYears(1964).typical).toEqual([]);
    expect(seniorDeductionYears(1964).jan1).toEqual([2028]);
    expect(seniorDeductionYears(1965).jan1).toEqual([]);
  });
});

describe("life expectancy", () => {
  it("2023 period table e(65) = 18.12 / 20.66 (ss_longevity.json)", () => {
    expect(periodLifeExpectancy(65)).toEqual({ male: 18.12, female: 20.66 });
  });
  it("cohort e(62), e(65) computed from q(x) match SSA's published cohort tables to ±0.01", () => {
    const t = table("ss_longevity", "cohort_life_expectancy_at_claiming_ages_by_birth_year");
    const first = cohortQx.ages[0];
    for (const r of t.rows) {
      const y = String(r[0]);
      expect(lifeExpectancyFromQ(cohortQx.male[y], first, 62)).toBeCloseTo(r[1] as number, 1);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.male[y], first, 62) - (r[1] as number))).toBeLessThanOrEqual(0.0101);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.male[y], first, 65) - (r[2] as number))).toBeLessThanOrEqual(0.0101);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.female[y], first, 62) - (r[5] as number))).toBeLessThanOrEqual(0.0101);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.female[y], first, 65) - (r[6] as number))).toBeLessThanOrEqual(0.0101);
    }
  });
  it("cohort e(x) at the age reached in 2026 matches SSA for 1943–1966", () => {
    const t = table("ss_longevity", "cohort_life_expectancy_at_attained_age_in_2026");
    const first = cohortQx.ages[0];
    for (const r of t.rows) {
      const y = String(r[0]);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.male[y], first, r[1] as number) - (r[2] as number))).toBeLessThanOrEqual(0.0101);
      expect(Math.abs(lifeExpectancyFromQ(cohortQx.female[y], first, r[1] as number) - (r[3] as number))).toBeLessThanOrEqual(0.0101);
    }
  });
  it("survival probabilities are proper probabilities", () => {
    const q = cohortQx.female["1960"];
    const p85 = survivalFromQ(q, cohortQx.ages[0], 65, 85);
    const p90 = survivalFromQ(q, cohortQx.ages[0], 65, 90);
    expect(p85).toBeGreaterThan(p90);
    expect(p85).toBeLessThan(1);
    expect(p90).toBeGreaterThan(0);
  });
});

describe("birth-year pages", () => {
  it("phase by year in 2026", () => {
    expect(phaseOf(birthYearProfile(1950, 2026))).toBe("past70");
    expect(phaseOf(birthYearProfile(1956, 2026))).toBe("turning70");
    expect(phaseOf(birthYearProfile(1957, 2026))).toBe("fraTo70");
    expect(phaseOf(birthYearProfile(1959, 2026))).toBe("reachingFra");
    expect(phaseOf(birthYearProfile(1960, 2026))).toBe("reachingFra");
    expect(phaseOf(birthYearProfile(1962, 2026))).toBe("62toFra");
    expect(phaseOf(birthYearProfile(1964, 2026))).toBe("62toFra");
    expect(phaseOf(birthYearProfile(1965, 2026))).toBe("before62");
  });
  it("tags mark the real turning points", () => {
    expect(cohortTags(1943, 2026)).toContain("First year with FRA 66");
    expect(cohortTags(1954, 2026)).toContain("Last year with FRA 66");
    expect(cohortTags(1957, 2026)).toContain("FRA phase-in: 66 and 6 months");
    expect(cohortTags(1960, 2026)).toEqual(expect.arrayContaining(["First year with FRA 67", "First year with RMD age 75"]));
    expect(cohortTags(1949, 2026)).toContain("RMD age changes on July 1");
    expect(cohortTags(1951, 2026)).toContain("First year with RMD age 73");
    expect(cohortTags(1959, 2026)).toContain("RMD age not final in law");
    expect(cohortTags(1961, 2026)).toContain("Turns 65 in 2026");
    expect(cohortTags(1964, 2026)).toContain("Turns 62 in 2026");
    expect(cohortTags(1956, 2026)).toContain("Turns 70 in 2026");
  });
  it("title ≤ 60 characters and description 140–160 characters for every year", () => {
    for (const y of BIRTH_YEARS) {
      const m = birthYearMeta(birthYearProfile(y, 2026));
      expect(m.title.length, m.title).toBeLessThanOrEqual(60);
      expect(m.description.length, m.description).toBeGreaterThanOrEqual(140);
      expect(m.description.length, m.description).toBeLessThanOrEqual(160);
    }
  });
});

describe("generated FAQ copy (answers go into FAQPage JSON-LD verbatim)", () => {
  const words = (s: string) => s.trim().split(/\s+/).length;
  const check = (items: { q: string; a: string }[], label: string) => {
    expect(items.length, label).toBeGreaterThanOrEqual(5);
    expect(items.length, label).toBeLessThanOrEqual(7);
    for (const f of items) {
      expect(words(f.a), `${label}: ${f.q} → ${f.a}`).toBeGreaterThanOrEqual(40);
      expect(words(f.a), `${label}: ${f.q} → ${f.a}`).toBeLessThanOrEqual(80);
      expect(f.a).not.toMatch(/undefined|NaN|\[object/);
    }
  };
  it("every birth-year page has 5–7 answers of 40–80 words", () => {
    for (const y of BIRTH_YEARS) check(birthYearFaq(birthYearProfile(y, 2026), 2026), String(y));
  });
  it("FRA page and hub FAQs", () => {
    check(fraFaq(), "fra");
    check(hubFaq(), "hub");
  });
  it("year-specific facts land in the answers", () => {
    const f1960 = birthYearFaq(birthYearProfile(1960, 2026), 2026);
    expect(f1960[0].a).toContain("It is 67");
    expect(f1960[0].a).toContain("66 and 10 months");
    expect(f1960[3].a).toContain("2035");
    expect(birthYearFaq(birthYearProfile(1959, 2026), 2026)[3].a).toContain("ambiguous");
    expect(birthYearFaq(birthYearProfile(1949, 2026), 2026)[3].a).toContain("70½");
    expect(birthYearFaq(birthYearProfile(1950, 2026), 2026)).toHaveLength(7);
    expect(fraFaq()[0].a).toContain("October 2026");
  });
});

describe("year-range labels", () => {
  it("consecutive years collapse, gaps say 'or'", async () => {
    const { shortRange } = await import("./basics");
    expect(shortRange([2025, 2026, 2027, 2028])).toBe("2025–28");
    expect(shortRange([2022, 2023])).toBe("2022–23");
    expect(shortRange([2019, 2021])).toBe("2019 or 2021");
    expect(shortRange([2027])).toBe("2027");
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Adversarial review additions
// ---------------------------------------------------------------------------------------------------------------

const param = (file: string, key: string) => {
  const p = research(file).params.find((x: { key: string }) => x.key === key);
  if (!p) throw new Error(`research param not found: ${key}`);
  return p.value;
};

describe("FRA finder (POMS GN 00302.400 / RS 00202.010 worked examples)", () => {
  const born = (year: number, month: number, day: number) => fraFinder({ year, month, day });
  it("DOB 1960-03-01 → attains ages on Feb 29; FRA month February 2027 (POMS example)", () => {
    const r = born(1960, 3, 1);
    expect(r.base).toEqual({ year: 1960, month: 2, day: 29 });
    expect(monthLabel(r.fraMonth)).toBe("February 2027");
    expect(r.firstOfMonth).toBe(true);
  });
  it("DOB 1960-01-01 → cohort 1959, FRA 66 and 10 months in October 2026; Medicare month December 2024", () => {
    const r = born(1960, 1, 1);
    expect(r.cohort).toBe(1959);
    expect(r.jan1).toBe(true);
    expect(r.fra.label).toBe("66 and 10 months");
    expect(r.calendarFra.label).toBe("67");
    expect(monthLabel(r.fraMonth)).toBe("October 2026");
    expect(monthLabel(r.earliest)).toBe("January 2022");
    expect(monthLabel(r.medicare)).toBe("December 2024");
  });
  it("first month at 62: only the 2nd gets 60 reduction months (70%); the 1st and the 15th get 59 (70.417%)", () => {
    // ss_mechanics.json rule: "for a 1960+ cohort, 60 only if born on the 2nd; otherwise 59 (born on the 1st: entitled in
    // the birth month, but FRA falls in the previous month)".
    const b2 = born(1960, 3, 2);
    const b1 = born(1960, 3, 1);
    const b15 = born(1960, 3, 15);
    expect(monthLabel(b2.earliest)).toBe("March 2022");
    expect(monthLabel(b1.earliest)).toBe("March 2022");
    expect(monthLabel(b15.earliest)).toBe("April 2022");
    expect([b2.early.monthsEarly, b1.early.monthsEarly, b15.early.monthsEarly]).toEqual([60, 59, 59]);
    expect(num3(b2.early.factor)).toBe(70);
    expect(num3(b1.early.factor)).toBe(70.417);
    expect(num3(b15.early.factor)).toBe(70.417);
  });
  it("age-70 factor matches POMS RS 00615.692 maximum credits (1959 cohort 25.33%, 1933 cohort 27.5%)", () => {
    expect(Math.round((born(1960, 1, 1).late.factor - 1) * 10000) / 100).toBe(25.33);
    expect(born(1934, 1, 1).cohort).toBe(1933);
    expect(Math.round((born(1934, 1, 1).late.factor - 1) * 10000) / 100).toBe(27.5);
    expect(num3(born(1960, 6, 15).late.factor)).toBe(124);
  });
  it("survivor benefit at 60 is 71.5% for every cohort", () => {
    for (const y of [1940, 1950, 1960, 1990]) expect(num3(born(y, 6, 15).survivorPctAt60)).toBe(71.5);
  });
  it("the earliest selectable year never lands in a cohort without a delayed-credit rate (Jan 1 included)", () => {
    expect(drcPerMonth(cohortYear({ year: FINDER_FIRST_YEAR, month: 1, day: 1 }))).toBeGreaterThan(0);
    expect(drcPerMonth(cohortYear({ year: FINDER_FIRST_YEAR - 1, month: 1, day: 1 }))).toBe(0);
  });
  it("URL dates are kept inside the picker: unknown years → default, day clamped to month end", () => {
    expect(finderDob({ year: FINDER_FIRST_YEAR - 1, month: 1, day: 1 })).toEqual(FINDER_DEFAULT_DOB);
    expect(finderDob({ year: 2030, month: 1, day: 1 })).toEqual(FINDER_DEFAULT_DOB);
    expect(finderDob({ year: Number.NaN, month: 1, day: 1 })).toEqual(FINDER_DEFAULT_DOB);
    expect(finderDob({ year: 1960, month: 13, day: 1 })).toEqual(FINDER_DEFAULT_DOB);
    expect(finderDob({ year: 1961, month: 2, day: 30 })).toEqual({ year: 1961, month: 2, day: 28 });
    expect(finderDob({ year: 1960, month: 2, day: 31 })).toEqual({ year: 1960, month: 2, day: 29 });
    expect(finderDob({ year: 1955, month: 4, day: 31 })).toEqual({ year: 1955, month: 4, day: 30 });
  });
  it("month-end and leap-day birthdays give valid months, never NaN", () => {
    for (const d of [
      { year: 1960, month: 2, day: 29 },
      { year: 1959, month: 12, day: 31 },
      { year: 1956, month: 3, day: 1 },
      { year: 1995, month: 12, day: 31 },
    ]) {
      const r = fraFinder(d);
      for (const v of [r.fraMonth, r.earliest, r.medicare, r.early.factor, r.late.factor]) expect(Number.isFinite(v)).toBe(true);
      expect(monthLabel(r.fraMonth)).not.toMatch(/undefined|NaN/);
    }
  });
});

describe("reduction rates shown in prose come from params", () => {
  it("fractions print the way SSA writes them", () => {
    expect(fractionOfOnePct(CLAIMING_RULES.earlyFirst36PerMonth)).toBe("5/9 of 1%");
    expect(fractionOfOnePct(CLAIMING_RULES.earlyBeyond36PerMonth)).toBe("5/12 of 1%");
    expect(fractionOfOnePct(CLAIMING_RULES.spousalFirst36PerMonth)).toBe("25/36 of 1%");
    expect(fractionOfOnePct(CLAIMING_RULES.drcPerMonth1943Plus)).toBe("2/3 of 1%");
    expect(fractionOfOnePct(13 / 24 / 100)).toBe("13/24 of 1%");
    expect(fractionOfOnePct(0.08)).toBe("8%");
  });
  it("EARLY_REDUCTION tier and CLAIMING_RULES rates agree with ss-core (75% at 48 months, 70% at 60)", () => {
    const tier = EARLY_REDUCTION.value.firstTierMonths;
    expect(earlyRetirementFactor(tier)).toBeCloseTo(1 - tier * CLAIMING_RULES.earlyFirst36PerMonth, 12);
    expect(earlyRetirementFactor(tier + 1) - earlyRetirementFactor(tier)).toBeCloseTo(-CLAIMING_RULES.earlyBeyond36PerMonth, 12);
    expect(earlyRetirementFactor(48)).toBeCloseTo(0.75, 12);
    expect(earlyRetirementFactor(60)).toBeCloseTo(0.7, 12);
  });
});

describe("COLA copy edge cases (0% years; January 1 birthdays)", () => {
  it("counts only COLAs that raised benefits: Dec 2009, 2010 and 2015 had none", () => {
    expect(colasSince62(1943)).toMatchObject({ raises: 19 });
    expect(colasSince62(1943).rows).toHaveLength(22);
    expect(colasSince62(1948)).toMatchObject({ raises: 15 });
    expect(colasSince62(1948).rows).toHaveLength(17);
    expect(colasSince62(1960)).toMatchObject({ raises: 5 });
  });
  it("January 1 birthdays add the COLA of the December before the age-62 year — which can be 0", () => {
    expect(colasSince62(1948).jan1Extra).toBe(0); // reached 62 on Dec 31, 2009
    expect(colasSince62(1949).jan1Extra).toBe(0); // Dec 31, 2010
    expect(colasSince62(1954).jan1Extra).toBe(0); // Dec 31, 2015
    expect(colasSince62(1962).jan1Extra).toBe(3.2); // Dec 31, 2023
    expect(colasSince62(1960).jan1Extra).toBe(5.9); // Dec 31, 2021
  });
});

describe("earnings test rows (POMS RS 02501.021; limits from ssa_annual.json)", () => {
  const lower26 = param("ss_mechanics", "ret_exempt_lower_2026").annual;
  const higher26 = param("ss_mechanics", "ret_exempt_higher_2026").annual;
  const lower27 = param("ss_mechanics", "ret_exempt_lower_2027").annual;
  it("params match the research file", () => {
    expect([SS_YEAR[2026].value.retUnderFraAnnual, SS_YEAR[2026].value.retFraYearAnnual, SS_YEAR[2027].value.retUnderFraAnnual]).toEqual([lower26, higher26, lower27]);
  });
  it("1959 in 2026: Jan–Feb births are past FRA, Mar–Dec births use the higher limit; nobody has a limit in 2027", () => {
    const rows = earningsTestRows(birthYearProfile(1959, 2026));
    expect(rows.map((r) => [r.year, r.who, r.limit])).toEqual([
      [2026, "Born January–February", "No limit"],
      [2026, "Born March–December", "$65,160"],
      [2027, "Born in 1959", "No limit"],
    ]);
  });
  it("1964 (turns 62 in 2026): the lower limit both years; 1966: not eligible yet, no rows; 1950: no limit", () => {
    expect(earningsTestRows(birthYearProfile(1964, 2026)).map((r) => [r.year, r.limit])).toEqual([
      [2026, "$24,480"],
      [2027, "$25,560"],
    ]);
    expect(earningsTestRows(birthYearProfile(1966, 2026))).toEqual([]);
    expect(earningsTestRows(birthYearProfile(1950, 2026)).every((r) => r.limit === "No limit")).toBe(true);
  });
  it("a planning year without published figures is skipped instead of crashing", () => {
    expect(() => earningsTestRows(birthYearProfile(1966, 2027))).not.toThrow();
  });
});

describe("benefit if claimed in the planning year (no retroactive months before FRA)", () => {
  it("uses the age reached in 2026, not 62", () => {
    expect(pctIfClaimingIn(birthYearProfile(1962, 2026))).toMatchObject({ age: 64, label: "64" });
    expect(num3(pctIfClaimingIn(birthYearProfile(1962, 2026))!.pct)).toBe(80);
    expect(num3(pctIfClaimingIn(birthYearProfile(1961, 2026))!.pct)).toBe(86.667);
    expect(pctIfClaimingIn(birthYearProfile(1964, 2026))).toMatchObject({ label: "62 and 1 month" });
    expect(num3(pctIfClaimingIn(birthYearProfile(1964, 2026))!.pct)).toBe(70.417);
    expect(pctIfClaimingIn(birthYearProfile(1965, 2026))).toBeNull();
  });
});

describe("1959 RMD copy (rmd.json: 73 proposed, statute also reads 75)", () => {
  it("names both readings from the rules, not typed numbers", () => {
    const a = rmdAnswer(birthYearProfile(1959, 2026), 2026);
    expect(a).toContain("Age 73 under the IRS proposed regulations");
    expect(a).toContain("73 or 75");
  });
});
