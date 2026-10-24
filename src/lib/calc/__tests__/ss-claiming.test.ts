import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DEPLETION_MONTH,
  PAYABLE_SHARE,
  bestOf,
  breakEven,
  claimMonthForAge,
  claimTable,
  cumulativeByAge,
  expectedByClaimMonth,
  expectedLifetime,
  factorInMonth,
  householdExpected,
  lifeExpectancy,
  ownPayments,
  payment,
  piaAt,
  probAliveAtAgeMonths,
  ribLim,
  spousalTopUp,
  survivalModel,
  survivorAmount,
  survivorTerms,
  type Person,
  type QxTable,
  type Settings,
} from "../ss-claiming";
import { fraMonth, monthAtAge, survivorFraForCohort } from "../ss-core";
import { monthIndex } from "../dates";

const table = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/cohort-qx-tr2026.json"), "utf8")) as QxTable;
const asOf = { year: 2026, month: 10, day: 23 };
const TODAY: Settings = { asOf, growth: "none", colaPct: 2.4, cut: false };
const FUTURE: Settings = { ...TODAY, growth: "cola" };
const person = (dob: Person["dob"], pia: number, sex: Person["sex"] = "m"): Person => ({ dob, pia, sex, health: "average" });
const pct3 = (x: number) => Math.round(x * 100000) / 1000;

describe("monthly benefit by claiming age (SSA OACT ar_drc table, quickcalc/earlyretire)", () => {
  it("born 1960 (FRA 67): 70 / 75 / 80 / 86.667 / 93.333 / 100 / 108 / 116 / 124 % of PIA", () => {
    const rows = claimTable(person({ year: 1964, month: 6, day: 2 }, 1000), TODAY);
    expect(rows.map((r) => pct3(r.factor))).toEqual([70, 75, 80, 86.667, 93.333, 100, 108, 116, 124]);
    expect(rows.map((r) => r.monthlyToday)).toEqual([700, 750, 800, 866, 933, 1000, 1080, 1160, 1240]);
  });
  it("born 1955 (FRA 66 and 2 months): $1,000 PIA → $741 at 62 (quickcalc), 130.667% at 70", () => {
    const rows = claimTable(person({ year: 1955, month: 3, day: 2 }, 1000), { ...TODAY, asOf: { year: 2016, month: 1, day: 1 } });
    expect(rows[0].monthlyToday).toBe(741);
    expect(rows.find((r) => r.isFra)?.label).toBe("66 and 2 months");
    expect(pct3(rows[rows.length - 1].factor)).toBe(130.667);
  });
  it("born on the 15th: earliest start is 62 and 1 month with 59 reduction months (70.417%)", () => {
    const rows = claimTable(person({ year: 1965, month: 6, day: 15 }, 2000), TODAY);
    expect(rows[0].label).toBe("62 and 1 month");
    expect(rows[0].monthsEarly).toBe(59);
    expect(rows[0].monthlyToday).toBe(1408); // 2000 × 0.704166… = 1408.33 → $1,408.30 → $1,408
  });
  it("rounds the benefit down to the dime, then the payment down to the dollar", () => {
    expect(payment(1234.5, 0.7)).toBe(864); // 864.15 → 864.10 → 864
    expect(payment(999.9, 1.24)).toBe(1239); // 1239.876 → 1239.80 → 1239
  });
  it("past ages are flagged (no retroactive early claims)", () => {
    const rows = claimTable(person({ year: 1962, month: 4, day: 20 }, 2000), TODAY); // 64 today
    expect(rows.filter((r) => r.past).map((r) => Math.floor(r.ageMonths / 12))).toEqual([62, 63, 64]);
  });
});

describe("delayed credits: January step-up (20 CFR 404.313)", () => {
  const dob = { year: 1960, month: 6, day: 15 }; // FRA June 2027, 70 in June 2030
  it("claiming at 68 pays 7 months of credits until January, then all 12", () => {
    const claim = claimMonthForAge(dob, 68 * 12); // June 2028
    expect(pct3(factorInMonth(dob, claim, claim))).toBe(104.667);
    expect(pct3(factorInMonth(dob, claim, monthIndex(2028, 12)))).toBe(104.667);
    expect(pct3(factorInMonth(dob, claim, monthIndex(2029, 1)))).toBe(108);
  });
  it("credits earned in the year you reach 70 are added in the month you reach 70", () => {
    const claim = monthIndex(2030, 2);
    expect(pct3(factorInMonth(dob, claim, claim))).toBe(pct3(1 + 31 * (2 / 300)));
    expect(pct3(factorInMonth(dob, claim, monthIndex(2030, 6)))).toBe(pct3(1 + 32 * (2 / 300)));
  });
  it("starting in the month you reach 70 gets every credit at once (124%)", () => {
    const claim = claimMonthForAge(dob, 70 * 12);
    expect(pct3(factorInMonth(dob, claim, claim))).toBe(124);
    expect(factorInMonth(dob, claim, claim - 1)).toBe(0);
  });
});

describe("COLAs (20 CFR 404.212)", () => {
  it("December 2026 uses the official 3.6%; later Decembers the assumption; each rounded down to the dime", () => {
    expect(piaAt(2000, FUTURE, monthIndex(2026, 11))).toBe(2000);
    expect(piaAt(2000, FUTURE, monthIndex(2026, 12))).toBe(2072);
    expect(piaAt(2000, FUTURE, monthIndex(2027, 12))).toBe(2121.7); // 2072 × 1.024 = 2121.728
    expect(piaAt(2000, TODAY, monthIndex(2040, 1))).toBe(2000);
  });
  it("a statement read in 2027 already includes the 3.6% COLA — it is not applied twice", () => {
    expect(piaAt(2000, { ...FUTURE, asOf: { year: 2027, month: 3, day: 1 } }, monthIndex(2027, 11))).toBe(2000);
  });
});

describe("break-even ages", () => {
  const p = person({ year: 1964, month: 6, day: 15 }, 2000);
  const at = (ageYears: number) => claimMonthForAge(p.dob, ageYears * 12);
  it("62 vs 70, full retirement age 67, no COLA: about 80½", () => {
    const be = breakEven(p, at(62), at(70), TODAY)!;
    expect(be.ageMonths / 12).toBeGreaterThan(80.25);
    expect(be.ageMonths / 12).toBeLessThan(81);
    // Closed form T = (a2·B2 − a1·B1)/(B2 − B1) with B1 = 1408 at 62y1m, B2 = 2480 at 70 → 80.41
    const closed = (70 * 2480 - (62 + 1 / 12) * 1408) / (2480 - 1408);
    expect(Math.abs(be.ageMonths / 12 - closed)).toBeLessThan(2 / 12);
  });
  it("62 vs 67 ≈ 78¾ and 67 vs 70 ≈ 82½ (today's dollars)", () => {
    expect(breakEven(p, at(62), at(67), TODAY)!.ageMonths / 12).toBeCloseTo(78.75, 0);
    expect(breakEven(p, at(67), at(70), TODAY)!.ageMonths / 12).toBeCloseTo(82.5, 0);
  });
  it("COLAs (future dollars) pull the break-even earlier", () => {
    const real = breakEven(p, at(62), at(70), TODAY)!.ageMonths;
    const nominal = breakEven(p, at(62), at(70), FUTURE)!.ageMonths;
    expect(nominal).toBeLessThan(real);
  });
  it("a trust-fund cut after 2032 pushes it later; identical starts → null", () => {
    const base = breakEven(p, at(62), at(70), TODAY)!.ageMonths;
    expect(breakEven(p, at(62), at(70), { ...TODAY, cut: true })!.ageMonths).toBeGreaterThanOrEqual(base);
    expect(breakEven(p, at(62), at(62), TODAY)).toBeNull();
  });
  it("cumulative totals: later start catches up at the break-even", () => {
    const early = cumulativeByAge(p, at(62), TODAY, 62, 90);
    const late = cumulativeByAge(p, at(70), TODAY, 62, 90);
    expect(early.find((x) => x.x === 80)!.y).toBeGreaterThan(late.find((x) => x.x === 80)!.y);
    expect(early.find((x) => x.x === 82)!.y).toBeLessThan(late.find((x) => x.x === 82)!.y);
    expect(late.find((x) => x.x === 70)!.y).toBe(0);
  });
});

describe("trust-fund scenario (2026 Trustees Report)", () => {
  it("OASI depletion in 2032 Q4 → 78% payable from October 2032", () => {
    expect(DEPLETION_MONTH).toBe(monthIndex(2032, 10));
    expect(PAYABLE_SHARE).toBe(0.78);
    const p = person({ year: 1964, month: 6, day: 15 }, 2000);
    const pay = ownPayments(p, claimMonthForAge(p.dob, 67 * 12), { ...TODAY, cut: true }, monthIndex(2032, 9), monthIndex(2032, 10));
    expect([...pay]).toEqual([2000, 1560]);
  });
});

describe("survival (SSA cohort life tables, 2026 Trustees Report)", () => {
  it("reproduces SSA cohort life expectancy for people born in 1960 (e65: men 19.15, women 21.70)", () => {
    expect(lifeExpectancy(survivalModel(table, "m", 1960, "average"), 65)).toBeCloseTo(19.15, 1);
    expect(lifeExpectancy(survivalModel(table, "f", 1960, "average"), 65)).toBeCloseTo(21.7, 1);
    expect(lifeExpectancy(survivalModel(table, "m", 1960, "average"), 62)).toBeCloseTo(21.26, 1);
    expect(lifeExpectancy(survivalModel(table, "f", 1960, "average"), 70)).toBeCloseTo(17.82, 1);
  });
  it("probability of being alive is monotonic and ordered by health outlook and sex", () => {
    const dob = { year: 1962, month: 9, day: 9 };
    for (const sex of ["m", "f"] as const) {
      const m = survivalModel(table, sex, 1962, "average");
      let prev = 1;
      for (let a = 64 * 12; a <= 119 * 12; a += 6) {
        const p = probAliveAtAgeMonths(m, dob, asOf, a);
        expect(p).toBeLessThanOrEqual(prev + 1e-12);
        expect(p).toBeGreaterThanOrEqual(0);
        prev = p;
      }
      expect(probAliveAtAgeMonths(m, dob, asOf, 120 * 12 + 1)).toBe(0); // nobody survives past 120
    }
    const p = (sex: "m" | "f", h: "shorter" | "average" | "longer") => probAliveAtAgeMonths(survivalModel(table, sex, 1962, h), dob, asOf, 85 * 12);
    expect(p("m", "shorter")).toBeLessThan(p("m", "average"));
    expect(p("m", "average")).toBeLessThan(p("m", "longer"));
    expect(p("m", "average")).toBeLessThan(p("f", "average"));
  });
  it("birth years outside 1935–1980 use the nearest table", () => {
    expect(survivalModel(table, "f", 1990, "average").birthYear).toBe(1980);
    expect(survivalModel(table, "f", 1930, "average").birthYear).toBe(1935);
  });
});

describe("expected lifetime benefits", () => {
  const e = { asOf, cut: false, realDiscountPct: 0 };
  it("single man, average health, born 1964: waiting to 70 has the highest expected value", () => {
    const p = person({ year: 1964, month: 6, day: 15 }, 2000);
    const pts = expectedByClaimMonth(p, e, survivalModel(table, "m", 1964, "average"));
    expect(bestOf(pts).ageMonths).toBe(70 * 12);
    expect(pts[0].claimMonth).toBe(monthIndex(2026, 11)); // 62 already — the earliest start still open is next month
  });
  it("a much shorter outlook favors claiming earlier", () => {
    const p = { ...person({ year: 1964, month: 6, day: 15 }, 2000), health: "shorter" as const };
    const short = bestOf(expectedByClaimMonth(p, e, survivalModel(table, "m", 1964, "shorter"))).ageMonths;
    expect(short).toBeLessThan(70 * 12);
  });
  it("a real discount rate lowers values and favors earlier claiming", () => {
    const p = person({ year: 1964, month: 6, day: 15 }, 2000);
    const m = survivalModel(table, "m", 1964, "average");
    const claim70 = claimMonthForAge(p.dob, 840);
    expect(expectedLifetime(p, claim70, { ...e, realDiscountPct: 3 }, m)).toBeLessThan(expectedLifetime(p, claim70, e, m));
    const best0 = bestOf(expectedByClaimMonth(p, e, m)).ageMonths;
    const best5 = bestOf(expectedByClaimMonth(p, { ...e, realDiscountPct: 5 }, m)).ageMonths;
    expect(best5).toBeLessThan(best0);
  });
});

describe("spousal benefits (20 CFR 404.333, POMS RS 00615.201 / RS 00615.020)", () => {
  const worker = person({ year: 1962, month: 1, day: 10 }, 2000); // FRA 67 → January 2029
  const wClaim = claimMonthForAge(worker.dob, 64 * 12);
  it("never more than 50% of the worker's PIA, even if the worker waits to 70", () => {
    const sp = person({ year: 1962, month: 3, day: 2 }, 0, "f");
    const atFra = fraMonth(sp.dob);
    expect(spousalTopUp(sp, atFra, worker, wClaim, atFra)).toBe(1000);
    const w70 = claimMonthForAge(worker.dob, 70 * 12);
    expect(spousalTopUp(sp, w70, worker, w70, w70)).toBe(1000);
  });
  it("at 62 with FRA 67 (60 months early) it is 65% of the full spousal amount = 32.5% of PIA", () => {
    const sp = person({ year: 1964, month: 3, day: 2 }, 0, "f");
    const w = claimMonthForAge(worker.dob, 64 * 12);
    const sClaim = claimMonthForAge(sp.dob, 62 * 12);
    expect(fraMonth(sp.dob) - sClaim).toBe(60);
    expect(spousalTopUp(sp, sClaim, worker, w, Math.max(sClaim, w))).toBe(650);
  });
  it("only the excess over your own PIA is paid; own and spousal reduced separately", () => {
    const sp = person({ year: 1964, month: 3, day: 2 }, 400, "f");
    const sClaim = claimMonthForAge(sp.dob, 62 * 12);
    const start = Math.max(sClaim, wClaim);
    const own = payment(400, factorInMonth(sp.dob, sClaim, start));
    expect(own).toBe(280);
    expect(spousalTopUp(sp, sClaim, worker, wClaim, start)).toBe(390); // (1000 − 400) × 65%
  });
  it("own delayed credits don't stack on top: the total stays at 50% of the worker's PIA", () => {
    const sp = person({ year: 1960, month: 3, day: 2 }, 400, "f");
    const s70 = claimMonthForAge(sp.dob, 70 * 12);
    const own = payment(400, factorInMonth(sp.dob, s70, s70));
    expect(own).toBe(496);
    expect(own + spousalTopUp(sp, s70, worker, wClaim, s70)).toBe(1000);
  });
  it("nothing until the worker has filed; nothing if your own PIA is at least half of theirs", () => {
    const sp = person({ year: 1960, month: 3, day: 2 }, 300, "f");
    const w70 = claimMonthForAge(worker.dob, 70 * 12);
    expect(spousalTopUp(sp, fraMonth(sp.dob), worker, w70, w70 - 1)).toBe(0);
    expect(spousalTopUp(sp, fraMonth(sp.dob), worker, w70, w70)).toBe(700);
    expect(spousalTopUp(person(sp.dob, 1000), fraMonth(sp.dob), worker, w70, w70)).toBe(0);
  });
});

describe("survivor benefits (20 CFR 404.338, POMS RS 00615.301 / RS 00615.320)", () => {
  const deceased = person({ year: 1960, month: 6, day: 15 }, 2000);
  const survivor = person({ year: 1962, month: 6, day: 15 }, 0, "f"); // survivor FRA 67
  const death = monthIndex(2040, 5); // survivor is 77
  const amount = (claimAge: number) => survivorAmount(survivorTerms(deceased, claimMonthForAge(deceased.dob, claimAge * 12), death, survivor), deceased.pia);
  it("100% of the PIA if the deceased claimed at FRA; 124% if they waited to 70", () => {
    expect(amount(67)).toBe(2000);
    expect(amount(70)).toBe(2480);
  });
  it("RIB-LIM: early claimers leave the larger of their reduced benefit or 82.5% of PIA", () => {
    expect(amount(62)).toBe(1650); // 70.4% < 82.5%
    expect(amount(64)).toBe(1650); // 80% < 82.5%
    expect(amount(66)).toBe(1866.6); // 93.33% > 82.5%
  });
  it("POMS RIB-LIM example: PIA $374.90, deceased's RIB $350 → limit $350 (82.5% would be only $309.20)", () => {
    expect(ribLim(374.9, 350 / 374.9)).toBe(350);
    expect(ribLim(374.9, 0.7)).toBe(309.2);
  });
  it("POMS reduction example: OB $987.60, 37 months early, survivor FRA 65 and 2 months → $819.60", () => {
    const sFra = survivorFraForCohort(1940);
    expect(sFra.label).toBe("65 and 2 months");
    const t = { start: 0, baseFactor: 1, deceasedReducedFactor: null, reductionMonths: 37, reductionFactor: 1 - (37 * 0.285) / 62 };
    expect(survivorAmount(t, 987.6)).toBe(819.6);
  });
  it("as early as 60 at 71.5%", () => {
    const young = person({ year: 1970, month: 6, day: 15 }, 0, "f");
    const t = survivorTerms(deceased, claimMonthForAge(deceased.dob, 67 * 12), monthIndex(2029, 1), young);
    expect(t.start).toBe(monthAtAge(young.dob, 60));
    expect(survivorAmount(t, 2000)).toBe(1430);
  });
  it("death after FRA but before filing: delayed credits up to the month before death count", () => {
    const t = survivorTerms(deceased, claimMonthForAge(deceased.dob, 70 * 12), fraMonth(deceased.dob) + 12, survivor);
    expect(pct3(t.baseFactor)).toBe(108);
  });
});

describe("couples: expected household benefits", () => {
  const e = { asOf, cut: false, realDiscountPct: 0 };
  const you = person({ year: 1964, month: 6, day: 15 }, 2400, "m");
  const sp = person({ year: 1965, month: 2, day: 10 }, 900, "f");
  const mY = survivalModel(table, "m", 1964, "average");
  const mS = survivalModel(table, "f", 1965, "average");
  const c = (p: Person, age: number) => claimMonthForAge(p.dob, age * 12);
  it("the higher earner waiting to 70 raises the household's expected total (survivor protection)", () => {
    const early = householdExpected(you, c(you, 62), sp, c(sp, 67), e, mY, mS);
    const late = householdExpected(you, c(you, 70), sp, c(sp, 67), e, mY, mS);
    expect(late.total).toBeGreaterThan(early.total);
    // Most of the gain shows up on the spouse's side through the larger widow benefit.
    expect(late.spouse).toBeGreaterThan(early.spouse);
  });
  it("household total = sum of both sides and exceeds the higher earner alone", () => {
    const r = householdExpected(you, c(you, 67), sp, c(sp, 67), e, mY, mS);
    expect(r.total).toBeCloseTo(r.you + r.spouse, 6);
    expect(r.total).toBeGreaterThan(expectedLifetime(you, c(you, 67), e, mY));
  });
});

describe("reviewer additions: edge cases from the research files", () => {
  const worker = person({ year: 1960, month: 6, day: 15 }, 2000);
  it("a spouse who never worked (PIA $0) gets 50% at FRA, 32.5% at 62 — and nothing extra for waiting past FRA", () => {
    const sp = person({ year: 1962, month: 6, day: 2 }, 0, "f"); // FRA 67; born on the 2nd → 62 throughout June 2024
    const wClaim = claimMonthForAge(worker.dob, 62 * 12); // the worker has already filed (2022)
    const at = (age: number) => {
      const c = claimMonthForAge(sp.dob, age * 12);
      return spousalTopUp(sp, c, worker, wClaim, Math.max(c, wClaim) + 1);
    };
    expect(at(67)).toBe(1000);
    expect(at(62)).toBe(650); // 60 months early: 36 × 25/36% + 24 × 5/12% = 35% off → 65% of $1,000
    expect(at(70)).toBe(1000); // spousal benefits earn no delayed credits
    // If the worker files later, the spousal benefit starts then and is reduced only for the months still before FRA.
    const late = claimMonthForAge(worker.dob, 67 * 12); // June 2027, when the spouse is 65 → 24 months early
    const c62 = claimMonthForAge(sp.dob, 62 * 12);
    expect(spousalTopUp(sp, c62, worker, late, late - 1)).toBe(0);
    expect(spousalTopUp(sp, c62, worker, late, late)).toBe(833.3);
  });
  it("household expected benefits are positive for a spouse with no record of their own", () => {
    const e = { asOf, cut: false, realDiscountPct: 0 };
    const sp = person({ year: 1962, month: 6, day: 15 }, 0, "f");
    const r = householdExpected(sp, claimMonthForAge(sp.dob, 67 * 12), worker, claimMonthForAge(worker.dob, 67 * 12), e, survivalModel(table, "f", 1962, "average"), survivalModel(table, "m", 1960, "average"));
    expect(r.you).toBeGreaterThan(0); // spousal top-up while both alive + widow benefit after
  });
  it("death before FRA without filing: the widow(er) gets 100% of the PIA (no RIB-LIM, never entitled)", () => {
    const sv = person({ year: 1962, month: 6, day: 15 }, 0, "f");
    const t = survivorTerms(worker, claimMonthForAge(worker.dob, 70 * 12), fraMonth(worker.dob) - 6, sv);
    expect(t.baseFactor).toBe(1);
    expect(t.deceasedReducedFactor).toBeNull();
  });
  it("death in the very month benefits were due to start: not entitled yet (entitlement ends the month before death)", () => {
    const sv = person({ year: 1962, month: 6, day: 15 }, 0, "f");
    const claim = claimMonthForAge(worker.dob, 62 * 12);
    expect(survivorTerms(worker, claim, claim, sv).deceasedReducedFactor).toBeNull();
    expect(survivorTerms(worker, claim, claim + 1, sv).deceasedReducedFactor).not.toBeNull();
  });
  it("RIB-LIM never raises a benefit: deceased took 70% at 62, survivor starts at 60 → 71.5% of PIA ($1,430), not $1,650", () => {
    const sv = person({ year: 1968, month: 6, day: 15 }, 0, "f");
    const claim = claimMonthForAge(worker.dob, 62 * 12);
    const t = survivorTerms(worker, claim, monthAtAge(sv.dob, 59), sv); // dies when the survivor is 59 → benefit starts at 60
    expect(t.start).toBe(monthAtAge(sv.dob, 60));
    expect(survivorAmount(t, 2000)).toBe(1430);
  });
  it("survivors can start in the month they reach 60 even when born on the 1st (no 'throughout the month' rule)", () => {
    const sv = person({ year: 1968, month: 7, day: 1 }, 0, "f"); // attains 60 on June 30, 2028
    const t = survivorTerms(worker, claimMonthForAge(worker.dob, 67 * 12), monthIndex(2027, 1), sv);
    expect(t.start).toBe(monthIndex(2028, 6));
  });
  it("filing in January after FRA: every credit was earned in an earlier year, so there is no later step-up", () => {
    const w = person({ year: 1959, month: 3, day: 15 }, 2000); // FRA 66y10m → January 2026
    const claim = monthIndex(2027, 1);
    expect(factorInMonth(w.dob, claim, claim)).toBeCloseTo(1 + 12 * (2 / 3 / 100), 10);
  });
  it("empty or zero benefit gives $0 everywhere (no NaN)", () => {
    const z = person({ year: 1964, month: 1, day: 1 }, 0);
    for (const r of claimTable(z, TODAY)) {
      expect(r.monthlyToday).toBe(0);
      expect(Number.isFinite(r.firstPayment)).toBe(true);
    }
    expect(breakEven(z, claimMonthForAge(z.dob, 62 * 12), claimMonthForAge(z.dob, 70 * 12), TODAY)).toBeNull();
  });
});
