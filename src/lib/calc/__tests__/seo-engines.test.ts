import { describe, expect, it } from "vitest";
import { spousalBenefit, survivorBenefit, piaFromAverage, creditsForEarnings, applyPlan, wepRepeal, gpoRepeal, ssiWithSocialSecurity, retirementBenefit, divorcedEligibility, trustFundCut } from "../ss-more";
import { initialEnrollment, medigapOep, partBPenalty, partDPenalty, m3pSchedule, extraHelpCheck, mspCheck, irmaa2028Projection, tierFor, hsaStop } from "../medicare-more";
import { rule55, niit, filingRequirement, qlacRmds, withdrawalNet, grossUp, qcdSavings, zeroRateRoom, roomInBracket, qssYears } from "../tax-more";
import { moneyDuration, catchUpLimits, pensionCompare, periodSurvival, safeWithdrawal } from "../plan-more";
import { monthIndex } from "../dates";

describe("Social Security engines", () => {
  it("spousal: 50% at FRA, 32.5% of the worker's PIA at 62 when FRA is 67", () => {
    expect(spousalBenefit({ workerPia: 2000, ownPia: 0, birthYear: 1962, claimAgeMonths: 67 * 12 }).total).toBe(1000);
    expect(spousalBenefit({ workerPia: 2000, ownPia: 0, birthYear: 1962, claimAgeMonths: 62 * 12 }).total).toBe(650);
    // own 600 + excess (1000 − 600) at FRA
    expect(spousalBenefit({ workerPia: 2000, ownPia: 600, birthYear: 1962, claimAgeMonths: 67 * 12 }).total).toBe(1000);
  });
  it("survivor: 71.5% at 60, RIB-LIM 82.5% floor when the worker claimed early", () => {
    expect(survivorBenefit({ deceasedPia: 2000, deceasedBenefit: null, survivorBirthYear: 1962, claimAgeMonths: 60 * 12 }).benefit).toBe(1430);
    const r = survivorBenefit({ deceasedPia: 2000, deceasedBenefit: 1400, survivorBirthYear: 1962, claimAgeMonths: 67 * 12 });
    expect(r.benefit).toBe(1650);
    expect(r.ribLimApplied).toBe(true);
    expect(survivorBenefit({ deceasedPia: 2000, deceasedBenefit: 2480, survivorBirthYear: 1962, claimAgeMonths: 67 * 12 }).benefit).toBe(2480);
  });
  it("retirement benefit at 62 is 70% for FRA 67", () => {
    expect(retirementBenefit(2000, 1964, 62 * 12).benefit).toBe(1400);
    expect(retirementBenefit(2000, 1964, 70 * 12).benefit).toBe(2480);
  });
  it("PIA formula at the 2027 bend points", () => {
    const r = piaFromAverage(60000, 35, 1965);
    expect(r.aime).toBe(5000);
    expect(r.pia).toBeCloseTo(2377.2, 1);
  });
  it("credits: $1,970 per credit in 2027, max 4", () => {
    expect(creditsForEarnings(7880, 2027)).toBe(4);
    expect(creditsForEarnings(7879, 2027)).toBe(3);
    expect(creditsForEarnings(50000, 2027)).toBe(4);
  });
  it("apply plan: apply 4 months ahead, first check the month after, on the birthday Wednesday", () => {
    const p = applyPlan({ year: 1964, month: 7, day: 15 }, { year: 2026, month: 8 });
    expect(p.startMonth).toBe(monthIndex(2026, 8));
    expect(p.applyFrom).toBe(monthIndex(2026, 4));
    expect(p.firstPayment.date).toBe("2026-09-16");
    expect(applyPlan({ year: 1964, month: 7, day: 2 }, { year: 2026, month: 1 }).startMonth).toBe(monthIndex(2026, 7));
  });
  it("WEP repeal restores (90% − factor) × first bend point, capped at half the pension", () => {
    const r = wepRepeal({ eligibilityYear: 2015, yearsSubstantial: 20, pension: 2000 })!;
    expect(r.reductionAtEligibility).toBeCloseTo(413, 0);
    expect(r.increaseNow).toBeGreaterThan(413);
    expect(wepRepeal({ eligibilityYear: 2015, yearsSubstantial: 20, pension: 500 })!.reductionAtEligibility).toBe(250);
    expect(wepRepeal({ eligibilityYear: 2015, yearsSubstantial: 30, pension: 2000 })!.reductionAtEligibility).toBe(0);
  });
  it("GPO repeal adds back two-thirds of the pension, up to the full entitlement", () => {
    expect(gpoRepeal({ entitlement: 1200, pension: 1500 })).toMatchObject({ before: 200, after: 1200, increase: 1000 });
  });
  it("SSI with Social Security: $20 exclusion then dollar for dollar", () => {
    const r = ssiWithSocialSecurity({ year: 2027, couple: false, socialSecurity: 500, earned: 0 });
    expect(r.ssi).toBe(1029 - 480);
    expect(ssiWithSocialSecurity({ year: 2027, couple: false, socialSecurity: 1100, earned: 0 }).eligible).toBe(false);
  });
  it("divorced: needs 10 years of marriage", () => {
    expect(divorcedEligibility({ marriageYears: 9, remarried: false, age: 63, exAlive: true, exAge: 64, exClaimed: true, yearsDivorced: 5, remarriedAfter60: false }).eligible).toBe(false);
    expect(divorcedEligibility({ marriageYears: 12, remarried: false, age: 63, exAlive: true, exAge: 64, exClaimed: false, yearsDivorced: 3, remarriedAfter60: false }).eligible).toBe(true);
  });
  it("trust fund: 78% payable after late 2032", () => {
    expect(trustFundCut(2000, 1960).oasi.after).toBe(1560);
  });
});

describe("Medicare engines", () => {
  it("IEP: 3 months before to 3 after; born on the 1st moves a month earlier", () => {
    const r = initialEnrollment({ year: 1961, month: 8, day: 15 });
    expect(r.first).toBe(monthIndex(2026, 5));
    expect(r.last).toBe(monthIndex(2026, 11));
    expect(r.rows.find((x) => x.signup === monthIndex(2026, 6))!.coverage).toBe(monthIndex(2026, 8));
    expect(r.rows.find((x) => x.signup === monthIndex(2026, 9))!.coverage).toBe(monthIndex(2026, 10));
    expect(initialEnrollment({ year: 1961, month: 8, day: 1 }).m65).toBe(monthIndex(2026, 7));
  });
  it("Medigap OEP starts when 65+ and in Part B", () => {
    const r = medigapOep({ year: 1961, month: 8, day: 15 }, { year: 2027, month: 2 });
    expect(r.start).toBe(monthIndex(2027, 2));
    expect(r.end).toBe(monthIndex(2027, 7));
  });
  it("Part B penalty: 10% per full 12 months, rounded to the dime", () => {
    expect(partBPenalty(2026, 26)).toMatchObject({ periods: 2, total: 243.5 });
    expect(partBPenalty(2026, 11).monthly).toBe(0);
  });
  it("Part D penalty: 1% × base premium × months, nearest $0.10", () => {
    expect(partDPenalty(2027, 14).monthly).toBe(5.8);
  });
  it("Prescription Payment Plan matches the CMS worked example", () => {
    const costs = Array(12).fill(0);
    costs[0] = 620;
    costs[1] = 30;
    const rows = m3pSchedule({ annualCap: 2000, startMonth: 1, priorOop: 0, monthlyCosts: costs });
    expect(rows[0].bill).toBe(166.67);
    expect(rows[1].bill).toBe(43.94);
    expect(rows.reduce((s, r) => s + r.bill, 0)).toBeCloseTo(650, 0);
  });
  it("Extra Help and MSP limits (2026)", () => {
    expect(extraHelpCheck({ couple: false, annualIncome: 23940, resources: 18090 }).eligible).toBe(true);
    expect(extraHelpCheck({ couple: false, annualIncome: 23941, resources: 0 }).eligible).toBe(false);
    expect(mspCheck({ couple: false, monthlyIncome: 1350, resources: 0 }).program).toBe("QMB");
    expect(mspCheck({ couple: false, monthlyIncome: 1600, resources: 0 }).program).toBe("SLMB");
    expect(mspCheck({ couple: false, monthlyIncome: 1800, resources: 0 }).program).toBe("QI");
    expect(mspCheck({ couple: false, monthlyIncome: 1900, resources: 0 }).program).toBe(null);
    expect(mspCheck({ couple: false, monthlyIncome: 1000, resources: 10000 }).program).toBe(null);
  });
  it("IRMAA 2028 at 0% inflation reproduces the projected 2027 thresholds", () => {
    const p = irmaa2028Projection(0);
    expect(p.individual.slice(0, 4)).toEqual([112000, 142000, 177000, 212000]);
    expect(tierFor(112000, p.individual)).toBe(0);
    expect(tierFor(112001, p.individual)).toBe(1);
    expect(tierFor(500000, p.individual)).toBe(5);
  });
  it("HSA: Part A backdates 6 months when you apply after 65", () => {
    const r = hsaStop({ dob: { year: 1960, month: 3, day: 10 }, apply: { year: 2027, month: 6 }, family: false });
    expect(r.partAStart).toBe(monthIndex(2026, 12));
    expect(r.monthsEligible).toBe(11);
    expect(r.prorated).toBe(4950);
  });
});

describe("Tax and RMD engines", () => {
  const base = { filingStatus: "mfj" as const, ssBenefits: 40000, pension: 30000, people65: 2 };
  it("Rule of 55 and NIIT", () => {
    expect(rule55({ birthYear: 1970, separationYear: 2025, publicSafety: false, account: "plan" }).qualifies).toBe(true);
    expect(rule55({ birthYear: 1970, separationYear: 2024, publicSafety: false, account: "plan" }).qualifies).toBe(false);
    expect(rule55({ birthYear: 1970, separationYear: 2025, publicSafety: false, account: "ira" }).qualifies).toBe(false);
    expect(niit({ filingStatus: "single", magi: 250000, nii: 80000 }).tax).toBe(1900);
  });
  it("filing requirement: Social Security alone usually means no return", () => {
    expect(filingRequirement({ filingStatus: "single", people65: 1, ssBenefits: 30000, otherGross: 0, taxExempt: 0, selfEmployment: 0 }).mustFile).toBe(false);
    expect(filingRequirement({ filingStatus: "single", people65: 1, ssBenefits: 0, otherGross: 20000, taxExempt: 0, selfEmployment: 0 }).mustFile).toBe(true);
    expect(filingRequirement({ filingStatus: "single", people65: 1, ssBenefits: 0, otherGross: 0, taxExempt: 0, selfEmployment: 500 }).mustFile).toBe(true);
  });
  it("withdrawal gross-up nets the target", () => {
    const g = grossUp(base, 20000, { penalty: false, statePct: 0, account: "ira" });
    expect(g.net).toBeGreaterThanOrEqual(20000);
    expect(withdrawalNet(base, g.gross - 5, { penalty: false, statePct: 0, account: "ira" }).net).toBeLessThan(20000);
  });
  it("QCD never costs more tax than taking the RMD and giving cash", () => {
    const r = qcdSavings(base, { rmd: 20000, gift: 5000, itemizedOther: 0 });
    expect(r.saved).toBeGreaterThan(0);
    expect(r.agiDrop).toBeGreaterThanOrEqual(5000); // less of Social Security becomes taxable too
  });
  it("0% capital gains room and bracket room are non-negative and consistent", () => {
    expect(zeroRateRoom({ filingStatus: "mfj", ssBenefits: 0, pension: 0, people65: 2 })).toBeGreaterThan(90000);
    expect(roomInBracket(base, "iraDistributions")).toBeGreaterThan(0);
  });
  it("QLAC limit and QSS years", () => {
    expect(qlacRmds({ balance: 1000000, premium: 300000, age: 73, startAge: 85, growthPct: 5 }).premium).toBe(210000);
    expect(qssYears(2026, true).map((y) => y.status)).toEqual(["mfj", "qss", "qss", "hoh"]);
  });
});

describe("Planning engines", () => {
  it("money duration with no growth runs out on schedule", () => {
    const r = moneyDuration({ savings: 100000, spending: 10000, income: 0, returnPct: 0, inflationPct: 0, age: 65 });
    expect(r.years).toBe(10);
    expect(moneyDuration({ savings: 100000, spending: 5000, income: 5000, returnPct: 0, inflationPct: 0, age: 65 }).runsOut).toBe(null);
  });
  it("4% rule and catch-up limits", () => {
    expect(safeWithdrawal(1000000, 0.04, 30, 0).first).toBe(40000);
    expect(catchUpLimits({ ageAtYearEnd: 61, priorYearFicaWages: 160000, planHasRoth: true })).toMatchObject({ catchUp: 11250, mustBeRoth: true, planTotal: 35750, ira: 8600 });
    expect(catchUpLimits({ ageAtYearEnd: 64, priorYearFicaWages: 0, planHasRoth: false }).catchUp).toBe(8000);
  });
  it("pension compare and survival odds are sane", () => {
    expect(periodSurvival("f", 65, 65)).toBe(1);
    expect(periodSurvival("m", 65, 90)).toBeGreaterThan(0.1);
    const r = pensionCompare({ lump: 300000, monthly: 1800, colaPct: 0, ageNow: 65, startAge: 65, sex: "m", ratePct: 4 });
    expect(r.breakEvenAge).toBeCloseTo(65 + 300000 / 1800 / 12, 0);
    expect(r.impliedReturn).not.toBeNull();
  });
});
