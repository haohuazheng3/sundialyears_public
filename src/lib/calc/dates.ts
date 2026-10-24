/**
 * Calendar helpers that follow SSA/IRS conventions.
 * SSA: you "attain" an age on the day BEFORE your birthday (20 CFR 404.2(c)(4); POMS GN 00302.400),
 * so someone born January 1 belongs to the previous year's cohort and someone born on the 1st of a month
 * is treated as born in the previous month.
 */
export interface YMD {
  year: number;
  month: number; // 1–12
  day: number;
}

/** Month index counted from year 0 (for month arithmetic). */
export const monthIndex = (year: number, month1: number) => year * 12 + (month1 - 1);
export const fromMonthIndex = (idx: number) => ({ year: Math.floor(idx / 12), month: (idx % 12) + 1 });

/** The day before the birthday, as a Y/M/D (the SSA "attainment" date base). */
export function attainmentBase(dob: YMD): YMD {
  const d = new Date(Date.UTC(dob.year, dob.month - 1, dob.day));
  d.setUTCDate(d.getUTCDate() - 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** SSA cohort year (birth year for FRA/DRC purposes): Jan 1 birthdays count as the prior year. */
export function ssaCohortYear(dob: YMD) {
  return attainmentBase(dob).year;
}

/** Month (as index) in which the person attains `years` + `months` of age under SSA rules. */
export function monthAttaining(dob: YMD, years: number, months = 0) {
  const a = attainmentBase(dob);
  return monthIndex(a.year, a.month) + years * 12 + months;
}

/** Calendar age at the END of a given calendar year (IRS convention for RMDs: "age you reach in the year"). */
export function ageAtEndOfYear(dob: YMD, year: number) {
  return year - dob.year;
}

/** Exact age in completed years on a date. */
export function ageOn(dob: YMD, on: YMD) {
  let age = on.year - dob.year;
  if (on.month < dob.month || (on.month === dob.month && on.day < dob.day)) age--;
  return age;
}

export const daysInMonth = (year: number, month1: number) => new Date(Date.UTC(year, month1, 0)).getUTCDate();

export const roundDownToDime = (x: number) => Math.floor(Math.round(x * 1000) / 100) / 10;
export const roundDownToDollar = (x: number) => Math.floor(Math.round(x * 100) / 100);
export const roundToCents = (x: number) => Math.round(x * 100) / 100;
/** Nearest $0.10; exact odd 5-cent amounts round up (CMS premium rounding). */
export const roundToDime = (x: number) => Math.round(Math.round(x * 1000) / 100) / 10;
