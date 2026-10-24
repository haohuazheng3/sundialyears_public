/**
 * Expected dates transcribed from the official SSA "Schedule of Social Security Benefit Payments 2027"
 * (Publication 05-10031, data-raw/ssa/EN-05-10031-2027.pdf).
 */
import { describe, expect, it } from "vitest";
import { paymentDate, yearSchedule, federalHolidays, groupForBirthDay } from "../payment-schedule";

const day = (iso: string) => iso;

describe("2027 Wednesday groups match the SSA schedule", () => {
  const second = ["2027-01-13", "2027-02-10", "2027-03-10", "2027-04-14", "2027-05-12", "2027-06-09", "2027-07-14", "2027-08-11", "2027-09-08", "2027-10-13", "2027-11-10", "2027-12-08"];
  const third = ["2027-01-20", "2027-02-17", "2027-03-17", "2027-04-21", "2027-05-19", "2027-06-16", "2027-07-21", "2027-08-18", "2027-09-15", "2027-10-20", "2027-11-17", "2027-12-15"];
  const fourth = ["2027-01-27", "2027-02-24", "2027-03-24", "2027-04-28", "2027-05-26", "2027-06-23", "2027-07-28", "2027-08-25", "2027-09-22", "2027-10-27", "2027-11-24", "2027-12-22"];
  it("second Wednesday", () => expect(yearSchedule("wed2", 2027).map((p) => p.date)).toEqual(second));
  it("third Wednesday", () => expect(yearSchedule("wed3", 2027).map((p) => p.date)).toEqual(third));
  it("fourth Wednesday", () => expect(yearSchedule("wed4", 2027).map((p) => p.date)).toEqual(fourth));
});

describe("2027 3rd-of-month and SSI dates (weekend/holiday → preceding business day)", () => {
  it("3rd of the month", () => {
    expect(yearSchedule("third", 2027).map((p) => p.date)).toEqual([
      day("2026-12-31"), // Jan 3 is Sunday, Jan 1 holiday → Dec 31, 2026
      "2027-02-03", "2027-03-03", "2027-04-02", "2027-05-03", "2027-06-03",
      "2027-07-02", "2027-08-03", "2027-09-03", "2027-10-01", "2027-11-03", "2027-12-03",
    ]);
  });
  it("SSI on the 1st", () => {
    expect(yearSchedule("ssi", 2027).map((p) => p.date)).toEqual([
      "2026-12-31", "2027-02-01", "2027-03-01", "2027-04-01", "2027-04-30", "2027-06-01",
      "2027-07-01", "2027-07-30", "2027-09-01", "2027-10-01", "2027-11-01", "2027-12-01",
    ]);
    expect(paymentDate("ssi", 2028, 1).date).toBe("2027-12-30"); // Jan 1, 2028 (Sat) observed Fri Dec 31 → Thu Dec 30
  });
});

describe("holidays and grouping", () => {
  it("observed federal holidays", () => {
    const h = federalHolidays(2027).map((x) => x.date);
    expect(h).toContain("2027-06-18"); // Juneteenth (Sat) observed Fri
    expect(h).toContain("2027-07-05"); // Independence Day (Sun) observed Mon
    expect(h).toContain("2027-12-24"); // Christmas (Sat) observed Fri
    expect(h).toContain("2027-12-31"); // New Year's Day 2028 (Sat) observed Fri Dec 31
  });
  it("a Wednesday holiday moves the payment earlier (Veterans Day 2026 is Wed Nov 11)", () => {
    expect(paymentDate("wed2", 2026, 11).date).toBe("2026-11-10");
    expect(paymentDate("wed2", 2026, 11).shifted).toBe(true);
  });
  it("birth-day buckets", () => {
    expect(groupForBirthDay(1)).toBe("wed2");
    expect(groupForBirthDay(10)).toBe("wed2");
    expect(groupForBirthDay(11)).toBe("wed3");
    expect(groupForBirthDay(20)).toBe("wed3");
    expect(groupForBirthDay(21)).toBe("wed4");
    expect(groupForBirthDay(31)).toBe("wed4");
  });
});
