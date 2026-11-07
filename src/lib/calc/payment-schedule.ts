/**
 * Social Security & SSI payment dates (SSA Publication 05-10031 "Schedule of Social Security Benefit Payments").
 * Rules (printed on the schedule):
 *  - Birth date 1st–10th → second Wednesday; 11th–20th → third Wednesday; 21st–31st → fourth Wednesday.
 *  - Received Social Security before May 1997, or receive both Social Security and SSI → Social Security on the 3rd.
 *  - SSI → the 1st.
 *  - A payment date that falls on a weekend or federal holiday is paid on the preceding business day (20 CFR 404.1807 /
 *    SSA practice), which is why SSI for January is often paid on December 31.
 */

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
}

const iso = (d: DateParts) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
const utc = (d: DateParts) => new Date(Date.UTC(d.year, d.month - 1, d.day));
const fromUtc = (dt: Date): DateParts => ({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() });
const weekday = (d: DateParts) => utc(d).getUTCDay(); // 0 Sun … 6 Sat

function nthWeekday(year: number, month: number, dow: number, n: number): DateParts {
  const first = weekday({ year, month, day: 1 });
  const day = 1 + ((dow - first + 7) % 7) + (n - 1) * 7;
  return { year, month, day };
}
function lastWeekday(year: number, month: number, dow: number): DateParts {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lw = weekday({ year, month, day: last });
  return { year, month, day: last - ((lw - dow + 7) % 7) };
}
/** Federal "in lieu of" rule (5 U.S.C. 6103): Saturday holidays are observed Friday, Sunday holidays Monday. */
function observed(d: DateParts): DateParts {
  const w = weekday(d);
  const dt = utc(d);
  if (w === 6) dt.setUTCDate(dt.getUTCDate() - 1);
  if (w === 0) dt.setUTCDate(dt.getUTCDate() + 1);
  return fromUtc(dt);
}

/** Federal holidays (observed dates) for a calendar year, per 5 U.S.C. 6103(a). Includes next year's Jan 1 if observed on Dec 31. */
export function federalHolidays(year: number): { date: string; name: string }[] {
  const list: { d: DateParts; name: string }[] = [
    { d: observed({ year, month: 1, day: 1 }), name: "New Year’s Day" },
    { d: nthWeekday(year, 1, 1, 3), name: "Martin Luther King Jr. Day" },
    { d: nthWeekday(year, 2, 1, 3), name: "Washington’s Birthday" },
    { d: lastWeekday(year, 5, 1), name: "Memorial Day" },
    { d: observed({ year, month: 6, day: 19 }), name: "Juneteenth" },
    { d: observed({ year, month: 7, day: 4 }), name: "Independence Day" },
    { d: nthWeekday(year, 9, 1, 1), name: "Labor Day" },
    { d: nthWeekday(year, 10, 1, 2), name: "Columbus Day" },
    { d: observed({ year, month: 11, day: 11 }), name: "Veterans Day" },
    { d: nthWeekday(year, 11, 4, 4), name: "Thanksgiving Day" },
    { d: observed({ year, month: 12, day: 25 }), name: "Christmas Day" },
  ];
  // New Year's Day of the following year observed on Dec 31 of this year.
  const ny = observed({ year: year + 1, month: 1, day: 1 });
  if (ny.year === year) list.push({ d: ny, name: "New Year’s Day (observed)" });
  return list.map((h) => ({ date: iso(h.d), name: h.name }));
}

function isBusinessDay(d: DateParts) {
  const w = weekday(d);
  if (w === 0 || w === 6) return false;
  const key = iso(d);
  return !federalHolidays(d.year).some((h) => h.date === key);
}

/** Move back to the preceding business day when the date is a weekend or federal holiday. */
export function precedingBusinessDay(d: DateParts): DateParts {
  const dt = utc(d);
  let cur = fromUtc(dt);
  while (!isBusinessDay(cur)) {
    dt.setUTCDate(dt.getUTCDate() - 1);
    cur = fromUtc(dt);
  }
  return cur;
}

export type PaymentGroup = "wed2" | "wed3" | "wed4" | "third" | "ssi";

export function groupForBirthDay(birthDay: number): "wed2" | "wed3" | "wed4" {
  if (birthDay <= 10) return "wed2";
  if (birthDay <= 20) return "wed3";
  return "wed4";
}

export interface Payment {
  /** The month the payment is FOR (benefits are paid for the prior month; SSI/3rd-of-month payments are dated in the month). */
  month: number;
  year: number;
  date: string; // ISO yyyy-mm-dd of the actual deposit
  shifted: boolean; // moved earlier because of a weekend/holiday
  note?: string;
}

/** Payment date in a given calendar month for a group. */
export function paymentDate(group: PaymentGroup, year: number, month: number): Payment {
  let nominal: DateParts;
  if (group === "wed2") nominal = nthWeekday(year, month, 3, 2);
  else if (group === "wed3") nominal = nthWeekday(year, month, 3, 3);
  else if (group === "wed4") nominal = nthWeekday(year, month, 3, 4);
  else if (group === "third") nominal = { year, month, day: 3 };
  else nominal = { year, month, day: 1 };
  const actual = precedingBusinessDay(nominal);
  return {
    month,
    year,
    date: iso(actual),
    shifted: iso(actual) !== iso(nominal),
    note: group === "ssi" && actual.month !== month ? `Your ${monthName(month)} SSI arrives early, on ${monthName(actual.month)} ${actual.day}.` : undefined,
  };
}

export function yearSchedule(group: PaymentGroup, year: number): Payment[] {
  return Array.from({ length: 12 }, (_, i) => paymentDate(group, year, i + 1));
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (m: number) => MONTH_NAMES[m - 1];

export function prettyDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const w = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday({ year: y, month: m, day: d })];
  return { weekday: w, label: `${monthName(m)} ${d}, ${y}`, short: `${monthName(m).slice(0, 3)} ${d}` };
}
