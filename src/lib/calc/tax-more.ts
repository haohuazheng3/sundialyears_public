/**
 * Tax and RMD engines for the QCD, RMD-tax, withdrawal, early-penalty, Rule of 55, QLAC, Roth conversion, senior
 * deduction, W-4V, surviving-spouse, filing-requirement, capital-gains and NIIT tools. Built on computeFedTax (2026 law).
 */
import { computeFedTax, standardDeduction, type FedTaxInput, type FedTaxResult } from "./fed-tax";
import { taxableSocialSecurity } from "./ss-tax";
import { UNIFORM_LIFETIME } from "@/data/params/rmd";
import { QLAC } from "@/data/params/rmd";
import { SS_TAX_THRESHOLDS, NIIT, EARLY_DIST, DIST_WITHHOLDING, QSS_RULES, type FilingStatus } from "@/data/params/tax";

const pos = (x: number | undefined) => (x != null && Number.isFinite(x) ? Math.max(0, x) : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

export type Household = Omit<FedTaxInput, "year">;

/** Tax before and after adding income (or changing inputs). */
export function taxDelta(base: Household, change: Partial<Household>) {
  const before = computeFedTax(base);
  const after = computeFedTax({ ...base, ...change });
  return { before, after, delta: r2(after.totalTax - before.totalTax) };
}

const add = (base: Household, key: keyof Household, amount: number): Partial<Household> => ({ [key]: pos(base[key] as number) + amount });

/* ───────────── RMD / withdrawal tax ───────────── */

export function withdrawalTax(base: Household, amount: number) {
  const d = taxDelta(base, add(base, "iraDistributions", pos(amount)));
  return {
    ...d,
    rate: amount > 0 ? d.delta / amount : 0,
    extraTaxableSs: r2(d.after.ss.taxable - d.before.ss.taxable),
    agiBefore: d.before.agi,
    agiAfter: d.after.agi,
  };
}

export interface WithdrawalNet {
  gross: number;
  fedTax: number;
  penalty: number;
  stateTax: number;
  net: number;
  withheld: number;
  owedAtFiling: number;
}

/** Net from a gross withdrawal: incremental federal tax, optional 10% penalty and a flat state rate. */
export function withdrawalNet(base: Household, gross: number, o: { penalty: boolean; statePct: number; account: "plan" | "ira" }): WithdrawalNet {
  const g = pos(gross);
  const fedTax = withdrawalTax(base, g).delta;
  const penalty = o.penalty ? r2(g * EARLY_DIST.value.rate) : 0;
  const stateTax = r2((g * pos(o.statePct)) / 100);
  const withheld = r2(g * (o.account === "plan" ? DIST_WITHHOLDING.value.eligibleRolloverMandatory : DIST_WITHHOLDING.value.iraDefault));
  return { gross: g, fedTax, penalty, stateTax, net: r2(g - fedTax - penalty - stateTax), withheld, owedAtFiling: r2(fedTax + penalty - withheld) };
}

/** Smallest gross withdrawal that nets at least `target` after tax and penalty (binary search, $1 precision). */
export function grossUp(base: Household, target: number, o: { penalty: boolean; statePct: number; account: "plan" | "ira" }) {
  const t = pos(target);
  if (t === 0) return withdrawalNet(base, 0, o);
  let lo = t;
  let hi = t * 3 + 1000;
  while (withdrawalNet(base, hi, o).net < t && hi < 1e9) hi *= 2;
  for (let i = 0; i < 60 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2;
    if (withdrawalNet(base, mid, o).net >= t) hi = mid;
    else lo = mid;
  }
  return withdrawalNet(base, Math.ceil(hi), o);
}

/* ───────────── Early withdrawal & Rule of 55 ───────────── */

export function rule55(i: { birthYear: number; separationYear: number; publicSafety: boolean; account: "plan" | "ira" | "457b" }) {
  const age = i.publicSafety ? EARLY_DIST.value.publicSafetyAge : EARLY_DIST.value.rule55Age;
  const yearTurning = i.birthYear + age;
  if (i.account === "457b") return { qualifies: true, reason: "457b" as const, yearTurning };
  if (i.account === "ira") return { qualifies: false, reason: "ira" as const, yearTurning };
  return i.separationYear >= yearTurning ? { qualifies: true, reason: "age" as const, yearTurning } : { qualifies: false, reason: "too-early" as const, yearTurning };
}

/* ───────────── QCD ───────────── */

/**
 * Giving `gift` straight from the IRA (QCD) versus taking the same amount as an RMD and giving cash.
 * Cash gifts only reduce tax if you itemize; a QCD lowers AGI either way.
 */
export function qcdSavings(base: Household, i: { rmd: number; gift: number; itemizedOther: number }) {
  const gift = pos(i.gift);
  const rmd = pos(i.rmd);
  const ira = pos(base.iraDistributions) + rmd;
  const cash = computeFedTax({ ...base, iraDistributions: ira, itemizedDeductions: pos(i.itemizedOther) + gift });
  const qcd = computeFedTax({ ...base, iraDistributions: Math.max(0, ira - gift), itemizedDeductions: pos(i.itemizedOther) });
  return { cash, qcd, saved: r2(cash.totalTax - qcd.totalTax), agiDrop: r2(cash.agi - qcd.agi), cashItemized: cash.deductionType === "itemized" };
}

/* ───────────── Bracket room & Roth conversion ───────────── */

/** Largest extra amount of `key` income that keeps the next dollar in the current bracket (or the chosen one). */
export function roomInBracket(base: Household, key: "iraDistributions" | "qualifiedDividendsLtcg", targetRate?: number) {
  const now = computeFedTax(base);
  const target = targetRate ?? now.bracket;
  const ok = (x: number) => computeFedTax({ ...base, ...add(base, key, x) }).bracket <= target;
  if (!ok(0)) return 0;
  let lo = 0;
  let hi = 10000;
  while (ok(hi) && hi < 5e7) hi *= 2;
  for (let i = 0; i < 60 && hi - lo > 1; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
}

export function rothConversion(base: Household, amount: number) {
  const w = withdrawalTax(base, amount);
  return { ...w, room: roomInBracket(base, "iraDistributions"), magiAfter: w.after.agi + pos(base.taxExemptInterest) };
}

/* ───────────── Capital gains at 0% ───────────── */

/** How much more long-term gain can be realized with no extra federal tax (accounts for Social Security taxation). */
export function zeroRateRoom(base: Household) {
  const t0 = computeFedTax(base).totalTax;
  const free = (x: number) => computeFedTax({ ...base, ...add(base, "qualifiedDividendsLtcg", x) }).totalTax - t0 < 0.5;
  if (!free(1)) return 0;
  let lo = 0;
  let hi = 10000;
  while (free(hi) && hi < 5e7) hi *= 2;
  for (let i = 0; i < 60 && hi - lo > 1; i++) {
    const mid = (lo + hi) / 2;
    if (free(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
}

/* ───────────── NIIT ───────────── */

export function niit(i: { filingStatus: FilingStatus; magi: number; nii: number }) {
  const k = i.filingStatus === "mfsApart" ? "mfs" : i.filingStatus;
  const threshold = NIIT.value.thresholds[k as keyof typeof NIIT.value.thresholds];
  const over = Math.max(0, pos(i.magi) - threshold);
  const base = Math.min(pos(i.nii), over);
  return { threshold, over, base, tax: r2(base * NIIT.value.rate) };
}

/* ───────────── Filing requirement ───────────── */

export interface FilingCheck {
  threshold: number;
  grossIncome: number;
  includesSs: boolean;
  taxableSs: number;
  mustFile: boolean;
  selfEmployment: boolean;
}

/** IRS Pub. 501 gross-income test for 2026 (plus the $400 self-employment rule). */
export function filingRequirement(i: { filingStatus: FilingStatus; people65: number; ssBenefits: number; otherGross: number; taxExempt: number; selfEmployment: number }): FilingCheck {
  const fs = i.filingStatus;
  const threshold = fs === "mfs" ? 5 : standardDeduction(fs, i.people65, 0).total;
  const base = fs === "mfs" ? 0 : SS_TAX_THRESHOLDS.value.base[fs as keyof typeof SS_TAX_THRESHOLDS.value.base];
  const half = pos(i.ssBenefits) / 2;
  const includesSs = fs === "mfs" || half + pos(i.otherGross) + pos(i.taxExempt) > base;
  const taxableSs = includesSs ? taxableSocialSecurity({ filingStatus: fs, benefits: pos(i.ssBenefits), otherIncome: pos(i.otherGross), taxExemptInterest: pos(i.taxExempt) }).taxable : 0;
  const grossIncome = pos(i.otherGross) + taxableSs;
  const selfEmployment = pos(i.selfEmployment) >= 400;
  return { threshold, grossIncome, includesSs, taxableSs, mustFile: grossIncome >= threshold || selfEmployment, selfEmployment };
}

/* ───────────── Qualifying surviving spouse ───────────── */

export function qssYears(deathYear: number, hasDependentChild: boolean) {
  const years: { year: number; status: "mfj" | "qss" | "hoh" | "single" }[] = [{ year: deathYear, status: "mfj" }];
  for (let k = 1; k <= QSS_RULES.value.yearsAfterDeath; k++) years.push({ year: deathYear + k, status: hasDependentChild ? "qss" : "single" });
  years.push({ year: deathYear + QSS_RULES.value.yearsAfterDeath + 1, status: hasDependentChild ? "hoh" : "single" });
  return years;
}

/* ───────────── QLAC ───────────── */

export interface QlacRow {
  age: number;
  rmdWithout: number;
  rmdWith: number;
  lower: number;
}

/** RMDs with and without moving `premium` into a QLAC at `age`, until the QLAC starts paying (≤ 85). */
export function qlacRmds(i: { balance: number; premium: number; age: number; startAge: number; growthPct: number }) {
  const premium = Math.min(pos(i.premium), pos(i.balance), QLAC.value.limit);
  const start = Math.min(QLAC.value.latestStartAge, Math.max(i.age + 1, Math.round(i.startAge)));
  const g = pos(i.growthPct) / 100;
  let a = pos(i.balance);
  let b = pos(i.balance) - premium;
  const rows: QlacRow[] = [];
  for (let age = Math.max(73, i.age); age < start; age++) {
    const div = UNIFORM_LIFETIME[Math.min(120, Math.max(72, age))];
    const ra = age >= 73 ? a / div : 0;
    const rb = age >= 73 ? b / div : 0;
    rows.push({ age, rmdWithout: Math.round(ra), rmdWith: Math.round(rb), lower: Math.round(ra - rb) });
    a = (a - ra) * (1 + g);
    b = (b - rb) * (1 + g);
  }
  return { premium, start, rows, totalLower: rows.reduce((s, r) => s + r.lower, 0) };
}

export type { FedTaxResult };
