import { describe, expect, it } from "vitest";
import {
  adjustReductionFactor,
  breakEvenAfterFra,
  chargeExcess,
  computeEarningsTest,
  excessEarnings,
  exemptAmounts,
  fraYearOf,
  prorateBeforeFra,
} from "../earnings-test";
import { earliestRetirementMonth, fra, fraMonth, describeMonth } from "../ss-core";
import { monthIndex } from "../dates";
import { SS_YEAR } from "@/data/params/social-security";
import { RET_EXAMPLES } from "@/data/params/earnings-test-extra";

const d = (year: number, month = 6, day = 15) => ({ year, month, day });
const statuses = (r: ReturnType<typeof computeEarningsTest>) => r.months.map((m) => m.status);

describe("exempt amounts come from the official SSA figures", () => {
  it("2026 and 2027, both tiers", () => {
    expect(exemptAmounts(2026, "under-fra")).toEqual({ annual: 24480, monthly: 2040, ratio: 2 });
    expect(exemptAmounts(2026, "fra-year")).toEqual({ annual: 65160, monthly: 5430, ratio: 3 });
    expect(exemptAmounts(2027, "under-fra")).toEqual({ annual: SS_YEAR[2027].value.retUnderFraAnnual, monthly: 2130, ratio: 2 });
    expect(exemptAmounts(2027, "fra-year")).toEqual({ annual: 67920, monthly: 5660, ratio: 3 });
  });
});

describe("excess earnings (POMS RS 02501.080)", () => {
  it("under FRA: $1 per $2, rounded down — 1999 example $12,121 − $9,600 → $1,260", () => {
    expect(excessEarnings(12121, 9600, 2)).toBe(1260);
  });
  it("FRA year: $1 per $3 — 2000 example $30,000 − $17,000 → $4,333", () => {
    expect(excessEarnings(30000, 17000, 3)).toBe(4333);
  });
  it("at or below the exempt amount → 0", () => {
    expect(excessEarnings(24480, 24480, 2)).toBe(0);
    expect(excessEarnings(1000, 24480, 2)).toBe(0);
    expect(excessEarnings(24482, 24480, 2)).toBe(1);
  });
  it("self-employment is prorated over the months worked (divide, drop cents, multiply)", () => {
    expect(prorateBeforeFra(24000, 5)).toBe(10000); // NESE $24,000, FRA in June
    expect(prorateBeforeFra(44000, 2, 9)).toBe(9776); // SE April–December, FRA June
    // wages $24,000 Jan–May + NESE $7,000 over 7 months (1 month before FRA) → $25,000 → ($25,000 − $17,000) / 3 = $2,666
    expect(excessEarnings(24000 + prorateBeforeFra(7000, 1, 7), 17000, 3)).toBe(2666);
    expect(prorateBeforeFra(50000, 0)).toBe(0);
  });
});

describe("whole-month charging (POMS RS 02501.095 / .100)", () => {
  it("$562 a month, excess $2,880 → January–May withheld, June suspended in full and $492 paid later", () => {
    const ex = RET_EXAMPLES.pomsWholeMonth.value;
    const r = chargeExcess(ex.excess, Array(12).fill(ex.monthlyBenefit));
    expect(r.charged.slice(0, 5)).toEqual([562, 562, 562, 562, 562]);
    expect(r.charged[5]).toBe(70);
    expect(r.partialIndex).toBe(5);
    expect(562 - r.charged[5]).toBe(492);
    expect(r.charged.slice(6).every((c) => c === 0)).toBe(true);
    expect(r.totalCharged).toBe(2880);
  });
  it("the same example through the full engine (verify_ss_mechanics.json corrected $2,881/$491 to POMS's $2,880/$492)", () => {
    const ex = RET_EXAMPLES.pomsWholeMonth.value;
    // $2,880 of excess in 2026 needs $24,480 + 2 × $2,880 of earnings; benefits from January.
    const r = computeEarningsTest({ dob: d(1963), year: 2026, monthlyBenefit: ex.monthlyBenefit, annualEarnings: 24480 + 2 * ex.excess, benefitStart: monthIndex(2025, 7) });
    expect(r.excess).toBe(ex.excess);
    expect(r.fullMonthsWithheld).toBe(ex.fullMonthsWithheld);
    expect(r.partialMonth).toBe(6);
    expect(r.months[5].paidLater).toBe(492);
    expect(r.creditingMonths).toBe(6);
  });
  it("excess larger than a year of benefits is dropped, never carried forward", () => {
    const r = chargeExcess(10000, Array(12).fill(500));
    expect(r.totalCharged).toBe(6000);
    expect(r.notCharged).toBe(4000);
    expect(r.partialIndex).toBe(-1);
  });
  it("family charging: worker $378 + spouse $160 + child $160, excess $2,094 → January–March for the whole family", () => {
    const ex = RET_EXAMPLES.pomsFamily.value;
    const total = ex.worker + ex.auxiliaries.reduce((a, b) => a + b, 0);
    expect(total).toBe(698);
    const r = chargeExcess(ex.excess, Array(12).fill(total));
    expect(r.charged.filter((c) => c > 0).length).toBe(ex.monthsWithheld);
    expect(r.partialIndex).toBe(-1);
    // Same through the full engine: excess $2,094 in 2026 needs $24,480 + 2 × $2,094 of earnings.
    const full = computeEarningsTest({
      dob: d(1963),
      year: 2026,
      monthlyBenefit: ex.worker,
      familyOnRecord: 320,
      annualEarnings: 24480 + 2 * 2094,
      benefitStart: monthIndex(2025, 7),
    });
    expect(full.totalWithheld).toBe(2094);
    expect(statuses(full).slice(0, 4)).toEqual(["withheld", "withheld", "withheld", "paid"]);
    expect(full.workerWithheld).toBe(3 * 378);
    expect(full.workerBenefitsDue).toBe(12 * 378);
    expect(full.workerPaid).toBe(9 * 378);
  });
});

describe("SSA's own 2026 examples (ssa.gov, Receiving Benefits While Working)", () => {
  it("under FRA all year: $800/month, $33,400 earned → $4,460 withheld, $5,140 received", () => {
    const ex = RET_EXAMPLES.ssa2026UnderFra.value;
    const r = computeEarningsTest({ dob: d(1963), year: 2026, monthlyBenefit: ex.monthlyBenefit, annualEarnings: ex.earnings, benefitStart: monthIndex(2025, 7) });
    expect(r.phase).toBe("under-fra");
    expect(r.countedEarnings - r.exempt.annual).toBe(ex.overLimit);
    expect(r.excess).toBe(ex.withheld);
    expect(r.totalWithheld).toBe(ex.withheld);
    expect(r.totalPaid).toBe(ex.received);
    expect(r.status).toBe("withheld");
    // Whole months: January–May withheld, June suspended and $340 paid after the year.
    expect(statuses(r)).toEqual(["withheld", "withheld", "withheld", "withheld", "withheld", "partial", "paid", "paid", "paid", "paid", "paid", "paid"]);
    expect(r.months[5].withheld).toBe(460);
    expect(r.months[5].paidLater).toBe(340);
    expect(r.fullMonthsWithheld).toBe(5);
    expect(r.partialMonth).toBe(6);
    expect(r.creditingMonths).toBe(6);
  });
  it("FRA in August 2026: $66,000 earned January–July → $280 withheld, $5,320 of $5,600 received before FRA", () => {
    const ex = RET_EXAMPLES.ssa2026FraYear.value;
    const dob = d(1959, 10, 15); // FRA 66 and 10 months → August 2026
    expect(describeMonth(fraMonth(dob)).label).toBe("August 2026");
    const r = computeEarningsTest({ dob, year: 2026, monthlyBenefit: ex.monthlyBenefit, annualEarnings: 72000, earningsBeforeFra: ex.earningsBeforeFra, benefitStart: monthIndex(2025, 1) });
    expect(r.phase).toBe("fra-year");
    expect(r.monthsBeforeFraInYear).toBe(7);
    expect(r.countedEarnings - r.exempt.annual).toBe(ex.overLimit);
    expect(r.totalWithheld).toBe(ex.withheld);
    const beforeFra = r.months.slice(0, 7);
    expect(beforeFra.reduce((a, m) => a + m.benefit - m.withheld, 0)).toBe(ex.receivedBeforeFra);
    expect(r.months[0].status).toBe("partial");
    expect(r.months[0].paidLater).toBe(520);
    expect(statuses(r).slice(7)).toEqual(Array(5).fill("at-fra"));
  });
});

describe("no earnings test from the FRA month on", () => {
  const dob = d(1960, 6, 15); // FRA 67 → June 2027
  it("FRA year: months from June are never charged, even with a huge excess", () => {
    expect(describeMonth(fraMonth(dob)).label).toBe("June 2027");
    const r = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 2000, annualEarnings: 0, earningsBeforeFra: 200000, benefitStart: monthIndex(2023, 1) });
    expect(statuses(r)).toEqual(["withheld", "withheld", "withheld", "withheld", "withheld", "at-fra", "at-fra", "at-fra", "at-fra", "at-fra", "at-fra", "at-fra"]);
    expect(r.totalWithheld).toBe(10000);
    expect(r.excessNotCharged).toBe(Math.floor((200000 - 67920) / 3) - 10000);
  });
  it("FRA year with only a yearly figure: prorated to the months before FRA", () => {
    const r = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 2000, annualEarnings: 180000, benefitStart: monthIndex(2023, 1) });
    expect(r.countedEarnings).toBe(75000); // $15,000 × 5 months
    expect(r.excess).toBe(2360);
    const low = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 2000, annualEarnings: 120000, benefitStart: monthIndex(2023, 1) });
    expect(low.status).toBe("under-limit");
  });
  it("years after the FRA year: no test at all", () => {
    const r = computeEarningsTest({ dob: d(1958), year: 2027, monthlyBenefit: 2000, annualEarnings: 500000, benefitStart: monthIndex(2021, 1) });
    expect(fraYearOf(d(1958))).toBe(2025);
    expect(r.status).toBe("after-fra");
    expect(r.totalWithheld).toBe(0);
  });
  it("FRA in January → nothing before FRA that year", () => {
    const r = computeEarningsTest({ dob: d(1960, 1, 15), year: 2027, monthlyBenefit: 2000, annualEarnings: 500000, benefitStart: monthIndex(2023, 1) });
    expect(describeMonth(fraMonth(d(1960, 1, 15))).label).toBe("January 2027");
    expect(r.status).toBe("after-fra");
  });
  it("benefits starting at FRA are never tested", () => {
    const r = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 3000, annualEarnings: 500000, benefitStart: fraMonth(dob) });
    expect(r.status).toBe("starts-at-fra");
    expect(r.totalWithheld).toBe(0);
  });
});

describe("first year of benefits: earnings before you claim count; the monthly test protects retired months", () => {
  const dob = d(1964, 6, 15); // 62 in June 2026 → first possible month July 2026
  const base = { dob, year: 2026 as const, monthlyBenefit: 1500, annualEarnings: 60000, benefitStart: monthIndex(2026, 7) };
  it("earliest month is July 2026", () => {
    expect(earliestRetirementMonth(dob)).toBe(monthIndex(2026, 7));
  });
  it("without the monthly test: all six months withheld; the rest of the excess is dropped", () => {
    const r = computeEarningsTest(base);
    expect(r.excess).toBe(17760);
    expect(r.totalWithheld).toBe(9000);
    expect(r.excessNotCharged).toBe(8760);
    expect(statuses(r).slice(0, 6)).toEqual(Array(6).fill("not-entitled"));
  });
  it("grace year, July–December retired months → nothing withheld", () => {
    const r = computeEarningsTest({ ...base, graceYear: true, nonServiceMonths: [7, 8, 9, 10, 11, 12] });
    expect(r.status).toBe("protected");
    expect(r.totalWithheld).toBe(0);
    expect(r.withheldWithoutGrace).toBe(9000);
    expect(r.graceApplied).toBe(true);
  });
  it("grace year with retired months only October–December → July–September withheld", () => {
    const r = computeEarningsTest({ ...base, graceYear: true, nonServiceMonths: [10, 11, 12] });
    expect(statuses(r).slice(6)).toEqual(["withheld", "withheld", "withheld", "retired-month", "retired-month", "retired-month"]);
    expect(r.totalWithheld).toBe(4500);
  });
  it("retired months are ignored when the grace year does not apply", () => {
    expect(computeEarningsTest({ ...base, graceYear: false, nonServiceMonths: [7, 8, 9] }).totalWithheld).toBe(9000);
  });
});

describe("status edge cases", () => {
  it("not collecting yet in the selected year", () => {
    const r = computeEarningsTest({ dob: d(1964), year: 2026, monthlyBenefit: 1500, annualEarnings: 90000, benefitStart: monthIndex(2027, 3) });
    expect(r.status).toBe("not-collecting");
    expect(r.totalWithheld).toBe(0);
  });
  it("start date before age 62 is moved to the earliest possible month", () => {
    const r = computeEarningsTest({ dob: d(1964), year: 2026, monthlyBenefit: 1500, annualEarnings: 0, benefitStart: monthIndex(2026, 1) });
    expect(r.startClamped).toBe(true);
    expect(r.benefitStart).toBe(monthIndex(2026, 7));
  });
  it("under the limit shows the headroom left", () => {
    const r = computeEarningsTest({ dob: d(1963), year: 2027, monthlyBenefit: 1600, annualEarnings: 20000, benefitStart: monthIndex(2025, 7) });
    expect(r.status).toBe("under-limit");
    expect(r.headroom).toBe(5560);
    expect(r.arf).toBeNull();
  });
  it("earnings at which every month is withheld = limit + ratio × a year of benefits", () => {
    const r = computeEarningsTest({ dob: d(1963), year: 2027, monthlyBenefit: 1600, annualEarnings: 40000, benefitStart: monthIndex(2025, 7) });
    expect(r.earningsToWithholdAll).toBe(25560 + 2 * 12 * 1600);
  });
});

describe("getting it back at FRA (20 CFR 404.412; POMS RS 00615.482)", () => {
  it("FRA 67, claimed at 62 (60 months), 25 crediting months → 35 months → 80.56% of the full benefit", () => {
    const ex = RET_EXAMPLES.arf.value;
    const a = adjustReductionFactor({ monthlyBenefit: 700, reductionMonths: ex.reductionMonthsAtClaim, creditingMonths: ex.creditingMonths });
    expect(a.reductionMonthsAfter).toBe(ex.reductionMonthsAfter);
    expect(Math.round(a.factorBefore * 10000) / 100).toBe(70);
    expect(Math.round(a.factorAfter * 10000) / 100).toBe(80.56);
    expect(a.piaEstimate).toBe(1000);
    expect(a.benefitAfter).toBe(805); // $805.55 → $805.50 (dime) → $805 (dollar)
    expect(a.increase).toBe(105);
  });
  it("crediting months can't exceed the reduction months", () => {
    const a = adjustReductionFactor({ monthlyBenefit: 933, reductionMonths: 12, creditingMonths: 20 });
    expect(a.reductionMonthsAfter).toBe(0);
    expect(a.factorAfter).toBe(1);
  });
  it("default scenario: 2027, $1,600/month from July 2025, $40,000 earned", () => {
    const dob = d(1963);
    const r = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 1600, annualEarnings: 40000, benefitStart: monthIndex(2025, 7) });
    expect(r.excess).toBe(7220);
    expect(r.fullMonthsWithheld).toBe(4);
    expect(r.partialMonth).toBe(5);
    expect(r.months[4].paidLater).toBe(780);
    expect(r.creditingMonths).toBe(5);
    expect(r.arf?.reductionMonthsAtStart).toBe(59);
    expect(r.arf?.reductionMonthsAfter).toBe(54);
    expect(r.arf?.benefitAfter).toBe(1647);
    expect(r.breakEven?.months).toBe(154);
    expect(r.breakEven?.ageMonths).toBe(fra(dob).total + 154);
  });
  it("break-even needs a positive increase", () => {
    expect(breakEvenAfterFra(1000, 0, fra(d(1963)), fraMonth(d(1963)))).toBeNull();
    expect(breakEvenAfterFra(1000, 100, fra(d(1963)), fraMonth(d(1963)))?.months).toBe(10);
  });
});

describe("calculator URL params and labels (components/calculators/earnings-test/helpers)", () => {
  it("benefit-start month round-trips as YYYY-M", async () => {
    const { monthCodec, monthsCodec, monthsList, fractionLabel } = await import("@/components/calculators/earnings-test/helpers");
    expect(monthCodec.parse("2025-7")).toBe(monthIndex(2025, 7));
    expect(monthCodec.format(monthIndex(2025, 7))).toBe("2025-7");
    expect(monthCodec.parse("2025-13")).toBeUndefined();
    expect(monthsCodec.parse("12.7.8.7")).toEqual([7, 8, 12]);
    expect(monthsCodec.parse("0.3")).toBeUndefined();
    expect(monthsCodec.format([7, 8, 9])).toBe("7.8.9");
    expect(monthsList([1, 2, 3, 4, 6])).toBe("January–April and June");
    expect(monthsList([5])).toBe("May");
    expect(fractionLabel(5 / 9)).toBe("5/9");
  });
});

describe("SSA birthday rules feed the test (day-before-birthday attainment)", () => {
  it("born January 1, 1960 → 1959 cohort, FRA 66 and 10 months in October 2026: 2026 is the FRA year, 2027 has no test", () => {
    const dob = d(1960, 1, 1);
    expect(fra(dob).label).toBe("66 and 10 months");
    expect(describeMonth(fraMonth(dob)).label).toBe("October 2026");
    const r26 = computeEarningsTest({ dob, year: 2026, monthlyBenefit: 1000, annualEarnings: 120000, benefitStart: monthIndex(2024, 7) });
    expect(r26.phase).toBe("fra-year");
    expect(r26.monthsBeforeFraInYear).toBe(9);
    expect(r26.exempt.annual).toBe(65160);
    expect(r26.countedEarnings).toBe(10000 * 9);
    expect(r26.excess).toBe(Math.floor((90000 - 65160) / 3));
    expect(statuses(r26).slice(9)).toEqual(["at-fra", "at-fra", "at-fra"]);
    expect(computeEarningsTest({ dob, year: 2027, monthlyBenefit: 1000, annualEarnings: 120000, benefitStart: monthIndex(2024, 7) }).status).toBe("after-fra");
  });
  it("born January 2, 1960 → FRA 67 in January 2027: all of 2026 uses the lower limit, and 2027 has no test", () => {
    const dob = d(1960, 1, 2);
    expect(describeMonth(fraMonth(dob)).label).toBe("January 2027");
    const r = computeEarningsTest({ dob, year: 2026, monthlyBenefit: 1000, annualEarnings: 30000, benefitStart: monthIndex(2024, 7) });
    expect(r.phase).toBe("under-fra");
    expect(r.exempt.annual).toBe(24480);
    expect(r.excess).toBe(2760);
  });
  it("born on the 2nd: entitled in the month of the 62nd birthday, 60 reduction months (FRA 67)", () => {
    const dob = d(1964, 7, 2);
    expect(earliestRetirementMonth(dob)).toBe(monthIndex(2026, 7));
    const r = computeEarningsTest({ dob, year: 2026, monthlyBenefit: 1400, annualEarnings: 40000, benefitStart: monthIndex(2026, 1) });
    expect(r.startClamped).toBe(true);
    expect(r.reductionMonths).toBe(60);
  });
  it("born on the 1st: treated as born the month before, entitled in the birth month with 59 reduction months", () => {
    const dob = d(1964, 7, 1);
    expect(earliestRetirementMonth(dob)).toBe(monthIndex(2026, 7));
    expect(describeMonth(fraMonth(dob)).label).toBe("June 2031");
    const r = computeEarningsTest({ dob, year: 2026, monthlyBenefit: 1400, annualEarnings: 40000, benefitStart: monthIndex(2026, 7) });
    expect(r.reductionMonths).toBe(59);
    // All 2026 earnings count, including January–June before benefits started.
    expect(r.excess).toBe(Math.floor((40000 - 24480) / 2));
  });
  it("FRA in February: only January counts in the FRA year", () => {
    const dob = d(1960, 2, 20); // FRA February 2027
    const r = computeEarningsTest({ dob, year: 2027, monthlyBenefit: 2000, annualEarnings: 120000, benefitStart: monthIndex(2023, 1) });
    expect(r.monthsBeforeFraInYear).toBe(1);
    expect(r.countedEarnings).toBe(10000);
    expect(r.status).toBe("under-limit");
  });
});

describe("bad or empty inputs never produce NaN", () => {
  const base = { dob: d(1960, 6, 15), year: 2027 as const, benefitStart: monthIndex(2023, 1) };
  it("NaN / negative / infinite money fields count as $0", () => {
    const r = computeEarningsTest({ ...base, monthlyBenefit: NaN, annualEarnings: -5000, earningsBeforeFra: NaN, familyOnRecord: Infinity });
    expect(r.familyMonthly).toBe(0);
    expect(r.countedEarnings).toBe(0);
    expect(r.status).toBe("under-limit");
    const values = [r.excess, r.totalWithheld, r.totalPaid, r.workerPaid, r.headroom, r.benefitsDue];
    expect(values.every(Number.isFinite)).toBe(true);
  });
  it("a NaN FRA-year figure falls back to prorating the yearly earnings", () => {
    const r = computeEarningsTest({ ...base, monthlyBenefit: 2000, annualEarnings: 180000, earningsBeforeFra: NaN });
    expect(r.countedEarnings).toBe(75000);
  });
  it("no benefit entered but over the limit → nothing can be withheld, excess still reported", () => {
    const r = computeEarningsTest({ dob: d(1963), year: 2027, monthlyBenefit: 0, annualEarnings: 100000, benefitStart: monthIndex(2025, 7) });
    expect(r.familyMonthly).toBe(0);
    expect(r.excess).toBe(37220);
    expect(r.totalWithheld).toBe(0);
    expect(r.arf).toBeNull();
    expect(r.piaEstimate).toBeNull();
  });
  it("huge earnings withhold every chargeable check and drop the rest", () => {
    const r = computeEarningsTest({ dob: d(1963), year: 2027, monthlyBenefit: 1600, annualEarnings: 1e12, benefitStart: monthIndex(2025, 7) });
    expect(r.totalWithheld).toBe(12 * 1600);
    expect(r.workerPaid).toBe(0);
    expect(Number.isFinite(r.excessNotCharged)).toBe(true);
  });
  it("earnings needed to withhold everything is exact even when benefits have cents", () => {
    // 5 chargeable months (benefits from August 2026) of $100.10 = $500.50; $1 per $2 → need $1,002 over the limit, not $1,001.
    const r = computeEarningsTest({ dob: d(1963), year: 2026, monthlyBenefit: 100.1, annualEarnings: 0, benefitStart: monthIndex(2026, 8) });
    expect(r.chargeableBenefits).toBe(500.5);
    expect(r.earningsToWithholdAll).toBe(24480 + 1002);
    const all = computeEarningsTest({ dob: d(1963), year: 2026, monthlyBenefit: 100.1, annualEarnings: r.earningsToWithholdAll!, benefitStart: monthIndex(2026, 8) });
    expect(all.totalWithheld).toBe(500.5);
    const short = computeEarningsTest({ dob: d(1963), year: 2026, monthlyBenefit: 100.1, annualEarnings: r.earningsToWithholdAll! - 1, benefitStart: monthIndex(2026, 8) });
    expect(short.totalWithheld).toBeLessThan(500.5);
  });
});

describe("grace year and family together", () => {
  it("retired months protect the whole family's checks; the excess falls on the worked months", () => {
    const r = computeEarningsTest({
      dob: d(1964, 6, 15),
      year: 2026,
      monthlyBenefit: 1500,
      familyOnRecord: 500,
      annualEarnings: 60000,
      benefitStart: monthIndex(2026, 7),
      graceYear: true,
      nonServiceMonths: [9, 10, 11, 12],
    });
    expect(statuses(r).slice(6)).toEqual(["withheld", "withheld", "retired-month", "retired-month", "retired-month", "retired-month"]);
    expect(r.totalWithheld).toBe(4000);
    expect(r.workerWithheld).toBe(3000);
    expect(r.withheldWithoutGrace).toBe(12000);
  });
});
