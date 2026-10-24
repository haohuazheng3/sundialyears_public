/** Formatting helpers. All deterministic — safe in server components. */
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const money = (n: number) => usd0.format(Math.round(n));
export const money2 = (n: number) => usd2.format(n);
/** $1,234 or $1,234.50 — cents only when they exist. */
export const moneySmart = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? usd0.format(Math.round(n)) : usd2.format(n));
export const num = (n: number) => int.format(n);
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
export const pctPlain = (n: number, digits = 2) => `${n.toFixed(digits).replace(/\.?0+$/, "")}%`;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "66 and 10 months" style. */
export function yearsMonths(totalMonths: number) {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (m === 0) return `${y}`;
  return `${y} and ${m} month${m === 1 ? "" : "s"}`;
}

export function monthYear(year: number, monthIndex0: number) {
  return `${MONTHS[monthIndex0]} ${year}`;
}

export function longDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function parseNumber(input: string): number | null {
  const cleaned = input.replace(/[$,%\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
