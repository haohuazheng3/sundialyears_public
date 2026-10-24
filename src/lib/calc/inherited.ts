/**
 * Inherited IRA / inherited employer-plan required minimum distributions (RMDs).
 *
 * Rules: IRC §401(a)(9)(B), (E) and (H) as amended by the SECURE Act (2019) §401 and SECURE 2.0 (2022), and the final
 * regulations T.D. 10001 (89 FR 58886, July 19, 2024), applicable to distribution calendar years beginning 2025:
 *  - Treas. Reg. §1.401(a)(9)-3: death before the required beginning date (RBD) — 5-year rule, 10-year rule, life-expectancy
 *    rule for eligible designated beneficiaries, and the surviving spouse's delay until the year the owner would have
 *    reached the applicable age.
 *  - §1.401(a)(9)-4: designated beneficiaries, eligible designated beneficiaries (EDB): spouse, the owner's child under 21
 *    (majority on the 21st birthday), disabled, chronically ill, or not more than 10 years younger (by dates of birth).
 *  - §1.401(a)(9)-5(d)/(e): applicable denominator after death — non-recalculating Single Life value (age in the year after
 *    death, minus 1 per later year); spouse recalculated each year; if death on/after the RBD, the greater of that and the
 *    owner's remaining life expectancy (age in the year of death, minus 1 per later year); 10-year cap for non-EDBs and
 *    after a minor child reaches 21, with annual RMDs continuing; the year-of-death RMD (§1.401(a)(9)-5(c)(1)).
 *  - §1.401(a)(9)-9(b): Single Life Table (2022+); (f)(2): a pre-2022 life expectancy is reset with the new table at the
 *    original age, minus the years elapsed — the same arithmetic used here.
 *  - §1.408-8: IRAs — a surviving spouse may treat the IRA as their own; a Roth IRA owner is treated as dying before the RBD
 *    (so non-EDBs have no annual RMDs, only the 10-year deadline). §1.401(a)(9)-3(a)(2) does the same for designated Roth accounts.
 *  - IRS Notices 2022-53, 2023-54, 2024-35: no excise tax for missed 2021–2024 annual RMDs under the 10-year rule (owners who
 *    died 2020–2023 on/after the RBD); annual RMDs resume in 2025, the 10-year end date is not extended, and the divisor is
 *    NOT restarted (FR preamble: "if an employee died in 2020, then in 2025, there are six years remaining").
 *  - IRS Pub. 590-B (2025): worked example "dividing the account balance by 27.6 (31.6 – 4)".
 *
 * Simplifications (documented on the page): one beneficiary (no multi-beneficiary / trust / separate-account rules), no
 * successor beneficiaries (a beneficiary of a beneficiary), and the proposed (not final) SECURE 2.0 §327 spousal election.
 * Pure and deterministic — never reads the clock.
 */
import { SINGLE_LIFE, INHERITED_RULES } from "@/data/params/rmd";
import { INHERITED_TIMING, EDB_TESTS, TEN_YEAR_RELIEF, EARLY_DISTRIBUTION, YEAR_OF_DEATH_RMD } from "@/data/params/inherited-extra";
import { distributionPeriod, firstRmdYear, requiredBeginningDate, rmdApplicableAge } from "./rmd";
import { ageOn, roundToCents, type YMD } from "./dates";

/** What the user picks (URL param `rel`). */
export type Relationship = "spouse" | "child" | "disabled" | "close-age" | "other" | "estate";
/** URL param `acct`: traditional IRA (incl. SEP/SIMPLE/rollover), traditional employer plan, or any Roth account. */
export type InheritedAccount = "ira" | "plan" | "roth";
/** Surviving spouse: keep it as an inherited ("beneficiary") IRA, or treat it as / roll it into their own. */
export type SpouseChoice = "bene" | "own";

/** Beneficiary category after checking the dates (e.g. "other" who is not more than 10 years younger → "close-age"). */
export type Category = "spouse" | "minor-child" | "disabled" | "close-age" | "designated" | "none";

export type Method =
  | "ten-year-annual" // non-EDB, owner died on/after RBD: yearly RMDs in years 1–9 + empty by year 10
  | "ten-year-lump" // non-EDB, owner died before RBD (or Roth), or an EDB who elected the 10-year rule: no yearly RMDs
  | "life-expectancy" // EDB (or any individual beneficiary of a pre-2020 death): non-recalculating Single Life payouts
  | "minor-child" // life-expectancy payouts until 21, then annual RMDs + empty by the 10th anniversary of the 21st birthday
  | "spouse-beneficiary" // spouse keeps it as inherited: recalculated Single Life, may delay until owner's RMD age
  | "spouse-own" // spouse treats it as own / rolls over: own RMD age, Uniform Lifetime Table
  | "five-year" // no designated beneficiary, owner died before RBD
  | "owner-life"; // no designated beneficiary, owner died on/after RBD: owner's remaining life expectancy

export type ClassNote = "other-is-close-age" | "close-age-too-young" | "child-not-minor" | "child-is-close-age";

export interface InheritedInput {
  ownerDob: YMD;
  ownerDod: YMD;
  /** Ignored when relationship is "estate". */
  beneDob: YMD;
  relationship: Relationship;
  account: InheritedAccount;
  /** Employer plan only: the owner still worked for the plan sponsor (and owned 5% or less) when they died. */
  ownerStillWorking?: boolean;
  /** Distribution calendar year. */
  year: number;
  /** Inherited account balance on December 31 of `year - 1`. */
  balance: number;
  /** Yearly growth for the projection (0.05 = 5%). */
  growth?: number;
  /** EDB (incl. a spouse keeping it as inherited) whose owner died before the RBD may elect the 10-year rule. */
  electTenYear?: boolean;
  spouseChoice?: SpouseChoice;
  /** Owner died on/after RBD: had they already taken their full RMD for the year of death? */
  ownerTookDeathYearRmd?: boolean;
}

const ymdKey = (d: YMD) => d.year * 10000 + d.month * 100 + d.day;
const round1 = (x: number) => Math.round(x * 10) / 10;
/** A usable balance: negative, NaN or infinite input → 0 (never a negative or non-finite RMD). */
const safeBalance = (b: number) => (Number.isFinite(b) && b > 0 ? b : 0);
/** Projection growth rate: non-finite → 0; kept within −100% … +100% a year so the projection stays finite. */
const safeGrowth = (g: number | undefined) => (g != null && Number.isFinite(g) ? Math.min(1, Math.max(-1, g)) : 0);

/** Single Life Table (Treas. Reg. §1.401(a)(9)-9(b)); ages below 0 use 0, 120 and older use the 120+ row. */
export const singleLife = (age: number) => SINGLE_LIFE[Math.max(0, Math.min(120, Math.floor(age)))];

/**
 * "Not more than 10 years younger" is tested on dates of birth (§1.401(a)(9)-4(e)(6)): owner born Oct 1, 1953 →
 * a beneficiary born on or before Oct 1, 1963 qualifies. Older beneficiaries always qualify.
 */
export function notMoreThanTenYearsYounger(owner: YMD, bene: YMD) {
  const limit = { year: owner.year + EDB_TESTS.value.closeAgeMaxYearsYounger, month: owner.month, day: owner.day };
  return ymdKey(bene) <= ymdKey(limit);
}

/** The owner's child is a minor EDB if under 21 on the date of death; majority is reached on the 21st birthday (§1.401(a)(9)-4(e)(3)). */
export const isMinorAtDeath = (childDob: YMD, dod: YMD) => ageOn(childDob, dod) < EDB_TESTS.value.minorChildMajorityAge;

export interface Classification {
  category: Category;
  /** Eligible designated beneficiary (only meaningful for deaths after 2019). */
  edb: boolean;
  notes: ClassNote[];
}

export function classifyBeneficiary(rel: Relationship, ownerDob: YMD, beneDob: YMD, dod: YMD): Classification {
  if (rel === "estate") return { category: "none", edb: false, notes: [] };
  if (rel === "spouse") return { category: "spouse", edb: true, notes: [] };
  if (rel === "disabled") return { category: "disabled", edb: true, notes: [] };
  const close = notMoreThanTenYearsYounger(ownerDob, beneDob);
  if (rel === "child") {
    if (isMinorAtDeath(beneDob, dod)) return { category: "minor-child", edb: true, notes: [] };
    return close ? { category: "close-age", edb: true, notes: ["child-is-close-age"] } : { category: "designated", edb: false, notes: ["child-not-minor"] };
  }
  if (rel === "close-age") return close ? { category: "close-age", edb: true, notes: [] } : { category: "designated", edb: false, notes: ["close-age-too-young"] };
  return close ? { category: "close-age", edb: true, notes: ["other-is-close-age"] } : { category: "designated", edb: false, notes: [] };
}

export interface RbdStatus {
  applicableAge: number;
  /** Year the owner reached (or would have reached) their RMD age. */
  firstYear: number;
  rbd: YMD;
  /** Death on or after the RBD (April 1 of the year after the first distribution year). */
  diedOnOrAfterRbd: boolean;
  /** Why a death after the calendar RBD is still treated as "before". */
  treatedAsBefore: "roth" | "still-working" | null;
}

/**
 * Did the owner die on or after their required beginning date? Roth IRAs and designated Roth accounts: always "before"
 * (§1.408-8; §1.401(a)(9)-3(a)(2)). Employer plan with the still-working exception: the RBD is April 1 after retirement,
 * so an owner who died while still employed died before it (§1.401(a)(9)-2(b)).
 */
export function ownerRbdStatus(ownerDob: YMD, dod: YMD, account: InheritedAccount, ownerStillWorking = false): RbdStatus {
  const applicableAge = rmdApplicableAge(ownerDob);
  const firstYear = firstRmdYear(ownerDob);
  const r = requiredBeginningDate(ownerDob);
  const rbd = { year: r.year, month: r.month, day: r.day };
  const calendarAfter = ymdKey(dod) >= ymdKey(rbd);
  if (account === "roth") return { applicableAge, firstYear, rbd, diedOnOrAfterRbd: false, treatedAsBefore: calendarAfter ? "roth" : null };
  if (account === "plan" && ownerStillWorking && calendarAfter) return { applicableAge, firstYear, rbd, diedOnOrAfterRbd: false, treatedAsBefore: "still-working" };
  return { applicableAge, firstYear, rbd, diedOnOrAfterRbd: calendarAfter, treatedAsBefore: null };
}

export interface LifeExpectancy {
  /** Table age used for the initial lookup. */
  age: number;
  /** Year of the initial lookup. */
  lookupYear: number;
  /** Single Life Table value at `age`. */
  initial: number;
  /** Remaining life expectancy for the requested year. */
  value: number;
  recalculated: boolean;
}

/**
 * Beneficiary's non-recalculating life expectancy (§1.401(a)(9)-5(d)(3)(iii)): Single Life value at the age reached in the
 * year after death, reduced by 1 for each later year. Pub. 590-B example: age 55 in 2022 → 2026 divisor 31.6 − 4 = 27.6.
 */
export function beneficiaryLifeExpectancy(beneDob: YMD, deathYear: number, year: number): LifeExpectancy {
  const lookupYear = deathYear + 1;
  const age = lookupYear - beneDob.year;
  const initial = singleLife(age);
  return { age, lookupYear, initial, value: round1(initial - (year - lookupYear)), recalculated: false };
}

/** Owner's remaining life expectancy (§1.401(a)(9)-5(d)(1)(ii)): Single Life value at the owner's age in the year of death, minus 1 per later year. */
export function ownerRemainingLifeExpectancy(ownerDob: YMD, deathYear: number, year: number): LifeExpectancy {
  const age = deathYear - ownerDob.year;
  const initial = singleLife(age);
  return { age, lookupYear: deathYear, initial, value: round1(initial - (year - deathYear)), recalculated: false };
}

/** Surviving spouse as sole beneficiary: life expectancy redetermined every year at the spouse's current age (§1.401(a)(9)-5(d)(3)(iv)). */
export function spouseLifeExpectancy(spouseDob: YMD, year: number): LifeExpectancy {
  const age = year - spouseDob.year;
  const v = singleLife(age);
  return { age, lookupYear: year, initial: v, value: v, recalculated: true };
}

export interface Divisor {
  value: number;
  basis: "beneficiary" | "owner" | "spouse" | "uniform";
  beneficiary?: LifeExpectancy;
  owner?: LifeExpectancy;
  /** Uniform Lifetime Table age (spouse treating the account as their own). */
  uniformAge?: number;
}

export interface Plan {
  method: Method;
  category: Category;
  edb: boolean;
  notes: ClassNote[];
  rbd: RbdStatus;
  /** Owner died before 2020: SECURE Act 10-year rule does not apply (old "stretch" rules). */
  grandfathered: boolean;
  deathYear: number;
  /** First year a yearly RMD is required (null = never, only the deadline). */
  firstYear: number | null;
  /** The account must be empty by December 31 of this year (null = no fixed deadline). */
  deadlineYear: number | null;
  deadlineKind: "ten-year" | "five-year" | "minor-child" | null;
  /** Minor child: the year of the 21st birthday. */
  majorityYear: number | null;
  /** Years whose annual RMD was waived (2021–2024 relief). */
  waivedYears: number[];
  canElectTenYear: boolean;
  electedTenYear: boolean;
  /** Spouse beneficiary waiting until the year the owner would have reached RMD age. */
  delayedStart: boolean;
  /**
   * Spouse who treats the account as their own: the year they reach their own RMD age, if that is after the death. Its RMD
   * may wait until the spouse's own required beginning date, April 1 of the next year (§1.408-8(c): the spouse is then the
   * IRA owner; §1.401(a)(9)-2(a)/(b): first distribution year and RBD). null otherwise.
   */
  ownFirstYearRbd: number | null;
  divisor: (year: number) => Divisor | null;
}

/** Builds the payout rule that applies to this beneficiary. */
export function buildPlan(i: InheritedInput): Plan {
  const D = i.ownerDod.year;
  const T = INHERITED_TIMING.value;
  const rbd = ownerRbdStatus(i.ownerDob, i.ownerDod, i.account, i.ownerStillWorking);
  const after = rbd.diedOnOrAfterRbd;
  const cls = classifyBeneficiary(i.relationship, i.ownerDob, i.beneDob, i.ownerDod);
  const grandfathered = D < T.secureActFirstDeathYear;
  const spouseOwn = cls.category === "spouse" && i.spouseChoice === "own";
  const canElectTenYear = !grandfathered && !after && cls.edb && !spouseOwn;
  const electedTenYear = canElectTenYear && !!i.electTenYear;

  const owner = (y: number) => ownerRemainingLifeExpectancy(i.ownerDob, D, y);
  const bene = (y: number) => beneficiaryLifeExpectancy(i.beneDob, D, y);
  /** Death on/after RBD → greater of the beneficiary's and the owner's remaining life expectancy (§1.401(a)(9)-5(d)(1)). */
  const greaterOf = (b: LifeExpectancy, o: LifeExpectancy): Divisor =>
    b.value >= o.value ? { value: b.value, basis: b.recalculated ? "spouse" : "beneficiary", beneficiary: b, owner: o } : { value: o.value, basis: "owner", beneficiary: b, owner: o };
  const leDivisor = (y: number): Divisor => (after ? greaterOf(bene(y), owner(y)) : { value: bene(y).value, basis: "beneficiary", beneficiary: bene(y) });

  const base = {
    category: cls.category,
    edb: cls.edb,
    notes: cls.notes,
    rbd,
    grandfathered,
    deathYear: D,
    majorityYear: null as number | null,
    waivedYears: [] as number[],
    canElectTenYear,
    electedTenYear,
    delayedStart: false,
    ownFirstYearRbd: null as number | null,
  };

  // No designated beneficiary (estate, charity, non-see-through trust): §1.401(a)(9)-3(c)(2) / -5(d)(1)(ii).
  if (cls.category === "none") {
    if (!after) {
      const skip = D < T.fiveYearDisregardedYear && D + T.fiveYearRuleYears >= T.fiveYearDisregardedYear ? 1 : 0;
      return { ...base, method: "five-year", firstYear: null, deadlineYear: D + T.fiveYearRuleYears + skip, deadlineKind: "five-year", divisor: () => null };
    }
    return { ...base, method: "owner-life", firstYear: D + 1, deadlineYear: null, deadlineKind: null, divisor: (y) => ({ value: owner(y).value, basis: "owner", owner: owner(y) }) };
  }

  // Spouse treats the IRA as their own (or rolls it over): ordinary lifetime RMDs on the spouse's own schedule (§1.408-8(c)).
  if (spouseOwn) {
    const ownAgeYear = firstRmdYear(i.beneDob);
    const first = i.account === "roth" ? null : Math.max(ownAgeYear, D + 1);
    return {
      ...base,
      method: "spouse-own",
      firstYear: first,
      // The spouse's first distribution year as owner (their own RMD-age year) can be paid by April 1 of the next year.
      ownFirstYearRbd: first != null && first === ownAgeYear ? ownAgeYear : null,
      deadlineYear: null,
      deadlineKind: null,
      divisor: (y) => {
        const p = distributionPeriod(i.beneDob, y);
        return { value: p.period, basis: "uniform", uniformAge: p.ownerAge };
      },
    };
  }

  if (electedTenYear) {
    return { ...base, method: "ten-year-lump", firstYear: null, deadlineYear: D + T.tenYearRuleYears, deadlineKind: "ten-year", divisor: () => null };
  }

  // Spouse keeps it as an inherited IRA: recalculated life expectancy; before the RBD may wait until the owner's RMD year (§1.401(a)(9)-3(d)).
  if (cls.category === "spouse") {
    const first = after ? D + 1 : Math.max(D + 1, rbd.firstYear);
    return {
      ...base,
      method: "spouse-beneficiary",
      firstYear: first,
      deadlineYear: null,
      deadlineKind: null,
      delayedStart: !after && rbd.firstYear > D + 1,
      divisor: (y) => {
        const s = spouseLifeExpectancy(i.beneDob, y);
        return after ? greaterOf(s, owner(y)) : { value: s.value, basis: "spouse", beneficiary: s };
      },
    };
  }

  // Deaths before 2020: every individual beneficiary may stretch over life expectancy (no 10-year cap).
  if (grandfathered) {
    return { ...base, method: "life-expectancy", firstYear: D + 1, deadlineYear: null, deadlineKind: null, divisor: leDivisor };
  }

  // Minor child: life expectancy until 21, then annual RMDs continue and the account empties by the 10th anniversary of the 21st birthday.
  if (cls.category === "minor-child") {
    const majorityYear = i.beneDob.year + EDB_TESTS.value.minorChildMajorityAge;
    return { ...base, method: "minor-child", majorityYear, firstYear: D + 1, deadlineYear: majorityYear + T.tenYearRuleYears, deadlineKind: "minor-child", divisor: leDivisor };
  }

  if (cls.edb) {
    return { ...base, method: "life-expectancy", firstYear: D + 1, deadlineYear: null, deadlineKind: null, divisor: leDivisor };
  }

  // Designated beneficiary who is not an EDB: the 10-year rule.
  if (after) {
    const covered = (TEN_YEAR_RELIEF.value.coveredDeathYears as readonly number[]).includes(D);
    const waivedYears = covered ? INHERITED_RULES.value.reliefYears.filter((y) => y > D) : [];
    return { ...base, method: "ten-year-annual", waivedYears, firstYear: D + 1, deadlineYear: D + T.tenYearRuleYears, deadlineKind: "ten-year", divisor: leDivisor };
  }
  return { ...base, method: "ten-year-lump", firstYear: null, deadlineYear: D + T.tenYearRuleYears, deadlineKind: "ten-year", divisor: () => null };
}

export type YearStatus =
  | "before-death" // distribution year earlier than the death
  | "not-started" // year of death, spouse delay, or spouse's own RMD age not reached
  | "no-annual" // 10-year / 5-year rule without yearly minimums
  | "annual" // a yearly RMD = balance ÷ divisor
  | "waived" // 2021–2024 relief: computed but not required
  | "all-due" // divisor at 1 or less → whole balance
  | "final-year" // deadline year → whole balance
  | "past-deadline"; // after the deadline → whole balance is overdue

export interface YearRequirement {
  year: number;
  status: YearStatus;
  /** Amount required by December 31 of `year` (0 when waived). */
  amount: number;
  /** What the formula gives even when waived. */
  computed: number;
  divisor: Divisor | null;
}

/** Required amount for one distribution year given the prior December 31 balance. RMD never exceeds the balance. */
export function requirementFor(plan: Plan, year: number, balance: number): YearRequirement {
  const bal = safeBalance(balance);
  const r = (status: YearStatus, amount: number, divisor: Divisor | null = null, computed = amount): YearRequirement => ({ year, status, amount: roundToCents(amount), computed: roundToCents(computed), divisor });
  if (year < plan.deathYear) return r("before-death", 0);
  if (plan.deadlineYear != null && year > plan.deadlineYear) return r("past-deadline", bal);
  if (plan.deadlineYear != null && year === plan.deadlineYear) return r("final-year", bal, plan.firstYear != null && year >= plan.firstYear ? plan.divisor(year) : null);
  if (plan.firstYear == null) return r("no-annual", 0);
  if (year < plan.firstYear) return r("not-started", 0);
  const d = plan.divisor(year);
  if (!d) return r("no-annual", 0);
  if (d.value <= 1) return r("all-due", bal, d);
  const amt = Math.min(bal, bal / d.value);
  if (plan.waivedYears.includes(year)) return r("waived", 0, d, amt);
  return r("annual", amt, d);
}

export interface DeathYearRmd {
  year: number;
  ownerAge: number;
  period: number;
  table: "uniform" | "joint";
  /** Known only when the distribution year is the year of death (the input balance is then the right Dec 31 balance). */
  amount: number | null;
  taken: boolean;
  /** Taking it by Dec 31 of this year earns the automatic excise-tax waiver (§54.4974-1). */
  waiverYear: number;
}

export interface ScheduleRow {
  year: number;
  /** Beneficiary's age reached in the year (null for an estate). */
  age: number | null;
  startBalance: number;
  divisor: number | null;
  status: YearStatus;
  withdrawal: number;
}

export interface StrategySummary {
  total: number;
  largest: number;
  largestYear: number;
  rows: ScheduleRow[];
}

const MAX_ROWS = 45;

/**
 * Year-by-year projection from `startYear`. Each year's requirement uses the prior Dec 31 balance; what's left grows at
 * `growth`. "minimum" withdraws only what's required; "even" withdraws at least balance ÷ years left so the account empties
 * evenly by the deadline (only differs when there is a deadline). `deathYearOwed` (the owner's untaken year-of-death RMD,
 * §1.401(a)(9)-5(c)(1)) is added to the year-of-death row. A negative, NaN or infinite balance counts as $0 and growth is held to
 * ±100% a year, so every row stays finite. Educational estimate — real returns vary.
 */
export function projectSchedule(plan: Plan, i: InheritedInput, strategy: "minimum" | "even" = "minimum", deathYearOwed = 0): StrategySummary {
  const rows: ScheduleRow[] = [];
  let bal = safeBalance(i.balance);
  const g = safeGrowth(i.growth);
  const owedAtDeath = safeBalance(deathYearOwed);
  const start = Math.max(i.year, plan.deathYear);
  for (let y = start; rows.length < MAX_ROWS; y++) {
    const req = requirementFor(plan, y, bal);
    let w = req.amount + (y === plan.deathYear ? owedAtDeath : 0);
    if (strategy === "even" && plan.deadlineYear != null && y <= plan.deadlineYear) w = Math.max(w, bal / (plan.deadlineYear - y + 1));
    w = roundToCents(Math.min(bal, w));
    rows.push({ year: y, age: i.relationship === "estate" ? null : y - i.beneDob.year, startBalance: roundToCents(bal), divisor: req.divisor?.value ?? null, status: req.status, withdrawal: w });
    bal = Math.max(0, (bal - w) * (1 + g));
    if (plan.deadlineYear != null && y >= plan.deadlineYear) break;
    if (bal < 0.005) break;
    if (i.relationship !== "estate" && y - i.beneDob.year >= 110) break;
  }
  let largest = 0;
  let largestYear = start;
  let total = 0;
  for (const r of rows) {
    total += r.withdrawal;
    if (r.withdrawal > largest) {
      largest = r.withdrawal;
      largestYear = r.year;
    }
  }
  return { total: roundToCents(total), largest, largestYear, rows };
}

export type InputProblem = "death-before-birth" | "year-before-death" | "beneficiary-after-death";

export interface InheritedResult {
  plan: Plan;
  problem: InputProblem | null;
  thisYear: YearRequirement;
  /** Owner died on/after the RBD (traditional account): the owner's year-of-death RMD. */
  deathYearRmd: DeathYearRmd | null;
  /** Beneficiary's own requirement + the owner's untaken year-of-death RMD when the distribution year is the year of death. */
  totalDue: number;
  minimum: StrategySummary;
  even: StrategySummary | null;
  /** Calendar year the beneficiary reaches 59½ (spouse who treats the account as their own). */
  year59Half: number | null;
}

/** Year in which someone reaches 59½ — six calendar months after the 59th birthday (IRC §72(t)(2)(A)(i)). */
export function yearReaching59Half(dob: YMD) {
  const whole = Math.floor(EARLY_DISTRIBUTION.value.penaltyFreeAge);
  const months = Math.round((EARLY_DISTRIBUTION.value.penaltyFreeAge - whole) * 12);
  return dob.year + whole + (dob.month + months > 12 ? 1 : 0);
}

export function computeInherited(i: InheritedInput): InheritedResult {
  const plan = buildPlan(i);
  const D = i.ownerDod.year;
  let problem: InputProblem | null = null;
  if (ymdKey(i.ownerDod) <= ymdKey(i.ownerDob)) problem = "death-before-birth";
  // Only the owner's own child can be born after the death (and then within about a year of it).
  else if (i.relationship !== "estate" && ymdKey(i.beneDob) > ymdKey(i.ownerDod) && (i.relationship !== "child" || i.beneDob.year > D + 1)) problem = "beneficiary-after-death";
  else if (i.year < D) problem = "year-before-death";

  const balance = safeBalance(i.balance);
  const thisYear = requirementFor(plan, i.year, balance);

  let deathYearRmd: DeathYearRmd | null = null;
  if (plan.rbd.diedOnOrAfterRbd) {
    // §1.401(a)(9)-5(c)(1): computed as if the owner lived all year; Joint table only if the spouse was sole beneficiary and > 10 years younger.
    const spouse = i.relationship === "spouse" ? { dob: i.beneDob, soleBeneficiary: true } : undefined;
    const p = distributionPeriod(i.ownerDob, D, spouse);
    const amount = i.year === D ? roundToCents(Math.min(balance, balance / p.period)) : null;
    deathYearRmd = { year: D, ownerAge: p.ownerAge, period: p.period, table: p.table, amount, taken: !!i.ownerTookDeathYearRmd, waiverYear: D + YEAR_OF_DEATH_RMD.value.graceYearsAfterDeath };
  }

  const owed = deathYearRmd && i.year === D && !deathYearRmd.taken && deathYearRmd.amount ? deathYearRmd.amount : 0;
  const totalDue = problem ? 0 : roundToCents(Math.min(balance, thisYear.amount + owed));
  const minimum = projectSchedule(plan, i, "minimum", owed);
  const even = plan.deadlineYear != null && i.year <= plan.deadlineYear ? projectSchedule(plan, i, "even", owed) : null;
  return {
    plan,
    problem,
    thisYear,
    deathYearRmd,
    totalDue,
    minimum,
    even,
    year59Half: i.relationship === "spouse" ? yearReaching59Half(i.beneDob) : null,
  };
}

export type SpouseSuggestion = "stay-under-59" | "own-starts-later" | "own-lower" | "bene-starts-later" | "own-roth" | "either";

export interface SpouseComparison {
  bene: { plan: Plan; thisYear: YearRequirement };
  own: { plan: Plan; thisYear: YearRequirement };
  year59Half: number;
  under59HalfAllYear: boolean;
  suggestion: SpouseSuggestion;
}

/**
 * Surviving spouse (sole beneficiary): keep as inherited vs treat as own. Rules of thumb drawn from the regulations plus
 * IRC §72(t): withdrawals from an inherited IRA are exempt from the 10% early-distribution tax at any age; from the spouse's
 * own IRA they are not before 59½. A younger spouse usually does better treating it as their own (later start, Uniform table);
 * an older spouse whose partner died before the RBD can keep it inherited and wait until the partner would have reached RMD age.
 * Roth: as the spouse's own Roth IRA there are no lifetime RMDs at all (§1.408-8; Roth IRAs have no lifetime RMDs), while a
 * spouse who keeps it inherited must take life-expectancy RMDs — and §72(t)(1) only taxes "the portion ... includible in gross
 * income", so the under-59½ argument is much weaker for a Roth. Roth therefore → "own-roth" (the UI adds the earnings caveat).
 */
export function compareSpouseOptions(i: InheritedInput): SpouseComparison {
  const benePlan = buildPlan({ ...i, relationship: "spouse", spouseChoice: "bene", electTenYear: false });
  const ownPlan = buildPlan({ ...i, relationship: "spouse", spouseChoice: "own", electTenYear: false });
  const bene = { plan: benePlan, thisYear: requirementFor(benePlan, i.year, safeBalance(i.balance)) };
  const own = { plan: ownPlan, thisYear: requirementFor(ownPlan, i.year, safeBalance(i.balance)) };
  const year59Half = yearReaching59Half(i.beneDob);
  const under59HalfAllYear = i.year < year59Half;
  let suggestion: SpouseSuggestion = "either";
  if (ownPlan.firstYear == null) suggestion = "own-roth";
  else if (under59HalfAllYear) suggestion = "stay-under-59";
  else if (benePlan.firstYear != null && ownPlan.firstYear > benePlan.firstYear) suggestion = "own-starts-later";
  else if (benePlan.firstYear != null && benePlan.firstYear > ownPlan.firstYear) suggestion = "bene-starts-later";
  else if (own.thisYear.amount < bene.thisYear.amount) suggestion = "own-lower";
  return { bene, own, year59Half, under59HalfAllYear, suggestion };
}
