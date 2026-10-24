/**
 * Planning engines: money duration, 4% rule, pension lump sum vs annuity (with SSA period-life-table odds) and
 * catch-up contribution limits.
 */
import { PERIOD_LIFE_TABLE } from "@/data/generated/period-life-table";
import { CONTRIB_2026 } from "@/data/params/tax";

const pos = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);

/* ───────────── How long will my money last ───────────── */

export interface DurationRow {
  year: number; // 1-based year of retirement
  age: number;
  start: number;
  withdrawal: number;
  end: number;
}

/**
 * Withdraw (spending − other income) at the start of each year, both growing with inflation; the rest earns `returnPct`.
 * Returns the year the money runs out (null if it lasts through `maxYears`).
 */
export function moneyDuration(i: { savings: number; spending: number; income: number; returnPct: number; inflationPct: number; age: number; maxYears?: number }) {
  const r = i.returnPct / 100;
  const inf = i.inflationPct / 100;
  const maxYears = i.maxYears ?? Math.max(1, 110 - Math.round(i.age));
  let bal = pos(i.savings);
  const rows: DurationRow[] = [];
  let runsOut: number | null = null;
  let partial = 0;
  for (let y = 1; y <= maxYears; y++) {
    const need = Math.max(0, (pos(i.spending) - pos(i.income)) * Math.pow(1 + inf, y - 1));
    const start = bal;
    const w = Math.min(need, bal);
    bal = (bal - w) * (1 + r);
    rows.push({ year: y, age: Math.round(i.age) + y - 1, start, withdrawal: w, end: bal });
    if (w < need) {
      runsOut = y;
      partial = need > 0 ? w / need : 0;
      break;
    }
  }
  return { rows, runsOut, years: runsOut == null ? null : runsOut - 1 + partial, lastsPastAge: runsOut == null ? Math.round(i.age) + maxYears : null };
}

/* ───────────── 4% rule ───────────── */

export function safeWithdrawal(savings: number, rate: number, years: number, inflationPct: number) {
  const first = pos(savings) * rate;
  const schedule = Array.from({ length: Math.max(1, Math.round(years)) }, (_, k) => ({ year: k + 1, amount: first * Math.pow(1 + inflationPct / 100, k) }));
  return { first, monthly: first / 12, schedule, total: schedule.reduce((s, x) => s + x.amount, 0) };
}

/* ───────────── Life table helpers (SSA period table) ───────────── */

export type Sex = "m" | "f";
const lives = (sex: Sex, age: number) => {
  const a = Math.max(0, Math.min(PERIOD_LIFE_TABLE.length - 1, Math.floor(age)));
  const row = PERIOD_LIFE_TABLE[a];
  return sex === "m" ? row[2] : row[5];
};

export function periodLifeExpectancy(sex: Sex, age: number) {
  const a = Math.max(0, Math.min(PERIOD_LIFE_TABLE.length - 1, Math.floor(age)));
  const row = PERIOD_LIFE_TABLE[a];
  return sex === "m" ? row[3] : row[6];
}

/** Probability that someone `fromAge` today is alive at `toAge` (period table, whole years). */
export function periodSurvival(sex: Sex, fromAge: number, toAge: number) {
  if (toAge <= fromAge) return 1;
  const l0 = lives(sex, fromAge);
  return l0 > 0 ? lives(sex, toAge) / l0 : 0;
}

/* ───────────── Pension lump sum vs annuity ───────────── */

export interface PensionResult {
  breakEvenAge: number | null;
  impliedReturn: number | null;
  expectedPv: number;
  oddsPastBreakEven: number | null;
  lifeExpectancyAge: number;
}

/** Present value of the annuity paid monthly from `startAge` through `endAge` (no mortality), discounted at `ratePct`. */
function annuityPv(monthly: number, colaPct: number, ratePct: number, ageNow: number, startAge: number, endAge: number) {
  const rm = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  let pv = 0;
  for (let m = Math.round((startAge - ageNow) * 12); m < Math.round((endAge - ageNow) * 12); m++) {
    const yearsPaid = Math.floor(m / 12 - (startAge - ageNow));
    pv += (monthly * Math.pow(1 + colaPct / 100, Math.max(0, yearsPaid))) / Math.pow(1 + rm, m);
  }
  return pv;
}

export function pensionCompare(i: { lump: number; monthly: number; colaPct: number; ageNow: number; startAge: number; sex: Sex; ratePct: number }): PensionResult {
  const lump = pos(i.lump);
  const monthly = pos(i.monthly);
  // Undiscounted break-even.
  let cum = 0;
  let breakEvenAge: number | null = null;
  for (let m = 0; m < 12 * 60; m++) {
    cum += monthly * Math.pow(1 + i.colaPct / 100, Math.floor(m / 12));
    if (cum >= lump) {
      breakEvenAge = i.startAge + (m + 1) / 12;
      break;
    }
  }
  const leAge = i.ageNow + periodLifeExpectancy(i.sex, i.ageNow);
  // Rate at which the annuity paid to life expectancy is worth exactly the lump sum.
  let impliedReturn: number | null = null;
  if (monthly > 0 && lump > 0 && annuityPv(monthly, i.colaPct, 0, i.ageNow, i.startAge, leAge) > lump) {
    let lo = -10;
    let hi = 30;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (annuityPv(monthly, i.colaPct, mid, i.ageNow, i.startAge, leAge) > lump) lo = mid;
      else hi = mid;
    }
    impliedReturn = (lo + hi) / 2;
  }
  // Survival-weighted present value at the chosen rate (period table, yearly steps).
  let expectedPv = 0;
  for (let age = Math.ceil(i.startAge); age < 120; age++) {
    const p = periodSurvival(i.sex, i.ageNow, age);
    const t = age - i.ageNow;
    expectedPv += (p * monthly * 12 * Math.pow(1 + i.colaPct / 100, age - Math.ceil(i.startAge))) / Math.pow(1 + i.ratePct / 100, t);
  }
  return {
    breakEvenAge,
    impliedReturn,
    expectedPv,
    oddsPastBreakEven: breakEvenAge == null ? null : periodSurvival(i.sex, i.ageNow, Math.ceil(breakEvenAge)),
    lifeExpectancyAge: leAge,
  };
}

/* ───────────── Catch-up contributions (2026) ───────────── */

export function catchUpLimits(i: { ageAtYearEnd: number; priorYearFicaWages: number; planHasRoth: boolean }) {
  const L = CONTRIB_2026.value;
  const a = i.ageAtYearEnd;
  const catchUp = a >= 60 && a <= 63 ? L.catchUp60to63 : a >= 50 ? L.catchUp50 : 0;
  const mustBeRoth = catchUp > 0 && pos(i.priorYearFicaWages) > L.rothCatchUpWageThreshold;
  return {
    deferral: L.deferral,
    catchUp,
    planTotal: L.deferral + (mustBeRoth && !i.planHasRoth ? 0 : catchUp),
    ira: L.ira + (a >= 50 ? L.iraCatchUp : 0),
    mustBeRoth,
    blocked: mustBeRoth && !i.planHasRoth,
    superCatchUp: a >= 60 && a <= 63,
  };
}
