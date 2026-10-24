/**
 * Data for the RMD reference pages (/rmd-table and /rmd/age-N).
 *
 * Everything here is derived from the IRS tables in Treas. Reg. §1.401(a)(9)-9 (src/data/params/rmd) and the tested
 * lifetime-RMD engine (src/lib/calc/rmd: applicable age per Reg. §1.401(a)(9)-2(b)(2), first distribution year,
 * table age = age attained on the birthday in the distribution year per Reg. §1.401(a)(9)-5). Pure and deterministic —
 * safe to call from server components; no clock reads.
 */
import { UNIFORM_LIFETIME, JOINT_LIFE, SINGLE_LIFE, RMD_AGE_RULES, RMD_EXCISE } from "@/data/params/rmd";
import { EXCISE_TIMING, JOINT_TABLE_RULE, STILL_WORKING_RULE } from "@/data/params/rmd-extra";
import { QCD } from "@/data/params/tax";
import { firstRmdYear, rmdApplicableAge } from "@/lib/calc/rmd";
import { money, pct } from "@/lib/format";
import { SITE } from "@/lib/site";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** The planning year the site is built for (bumped by the yearly data update) and the year after. */
export const THIS_YEAR = SITE.copyrightYear;
export const NEXT_YEAR = SITE.copyrightYear + 1;

/** Uniform Lifetime Table rows: 72 … 120 (120 = "120 and older"). */
export const UNIFORM_AGES = Object.keys(UNIFORM_LIFETIME)
  .map(Number)
  .sort((a, b) => a - b);
export const UNIFORM_MIN_AGE = UNIFORM_AGES[0];
export const UNIFORM_MAX_AGE = UNIFORM_AGES[UNIFORM_AGES.length - 1];

// ── Rule constants, read from the cited params (never typed in) ───────────────────────────────────────────────
const rules = RMD_AGE_RULES.value;
/** The last two tiers in force today: born 1951–1959 → 73; born 1960 or later → 75. */
const rule73 = rules[rules.length - 2];
const rule75 = rules[rules.length - 1];
/** The retired tier whose RMD age is the table's first row (72): born July 1, 1949 – December 31, 1950. */
const rule72 = rules.find((r) => r.age === UNIFORM_MIN_AGE)!;
/** 73 — the RMD age for people born 1951–1959. */
export const RMD_AGE_NOW = rule73.age;
/** 75 — the RMD age for people born 1960 or later. */
export const RMD_AGE_LATER = rule75.age;
/** 1960 — the first birth year whose RMD age is 75. */
export const FIRST_75_BIRTH_YEAR = Number(rule73.bornBefore!.slice(0, 4));
/** 1959 — the last birth year assigned 73 (by proposed regulations; the statute is ambiguous). */
export const LAST_73_BIRTH_YEAR = FIRST_75_BIRTH_YEAR - 1;
/** 1951 — the first birth year assigned 73. */
export const FIRST_73_BIRTH_YEAR = Number(rules[rules.length - 3].bornBefore!.slice(0, 4));
/** 2032 — first RMD year for the 1959 group (if 73 stands). */
export const LAST_73_FIRST_YEAR = firstRmdYear({ year: LAST_73_BIRTH_YEAR, month: 6, day: 15 });
/** 2035 — first RMD year for the 1960 group. */
export const FIRST_75_FIRST_YEAR = firstRmdYear({ year: FIRST_75_BIRTH_YEAR, month: 6, day: 15 });
/**
 * Years in which nobody reaches the RMD age (2033–2034). Not "no first RMDs at all": an employer-plan participant using
 * the still-working exception has a first distribution year equal to the year they retire, whatever it is.
 */
export const GAP_YEARS = range(LAST_73_FIRST_YEAR + 1, FIRST_75_FIRST_YEAR - 1);
/** "born July 1, 1949 – December 31, 1950" — the birth dates that had RMD age 72 (from the cited rule label). */
export const RULE_72_BORN = rule72.label.replace(/^Born /, "born ");

/** Programmatic age pages: today's RMD age (73) through 105 (birth years 1921–1922, inside the calculator's birth-year picker, which starts at 1920). */
export const AGE_PAGE_MIN = RMD_AGE_NOW;
export const AGE_PAGE_MAX = 105;
export const AGE_PAGES = range(AGE_PAGE_MIN, AGE_PAGE_MAX);
export const ageHref = (age: number) => `/rmd/age-${age}`;
export const hasAgePage = (age: number) => Number.isInteger(age) && age >= AGE_PAGE_MIN && age <= AGE_PAGE_MAX;

/** "age-75" → 75; anything else (including "age-075") → null, so each age has exactly one URL. */
export function parseAgeSlug(slug: string): number | null {
  const m = /^age-([1-9]\d{1,2})$/.exec(slug);
  if (!m) return null;
  const n = Number(m[1]);
  return hasAgePage(n) ? n : null;
}

/** Example balances used on every age page (illustrative inputs, not parameters). */
export const EXAMPLE_BALANCES = [100000, 250000, 500000, 1000000, 2000000];
export const REF_BALANCE = 500000;
/** A small IRA, for the "no balance is too small" answer (illustrative input). */
export const SMALL_BALANCE = 20000;
/** Gap used for the "much younger spouse" worked example on each age page. */
export const SPOUSE_EXAMPLE_GAP = 15;
/** Illustrative Roth-conversion amount used to show how conversions shrink later RMDs. */
export const CONVERSION_EXAMPLE = 10000;
export const JOINT_GAP = JOINT_TABLE_RULE.value.spouseYoungerByMoreThan;
export const QCD_LIMIT_THIS_YEAR = QCD[THIS_YEAR].value.limit ?? 0;
export const QCD_MIN_AGE = QCD[THIS_YEAR].value.minAge;
const qcdNext = QCD[NEXT_YEAR as keyof typeof QCD];
export const QCD_NEXT_STATUS = qcdNext.status;
export const QCD_NEXT_LIMIT = qcdNext.value.limit;
/** Plain-text sentence about next year's QCD limit, driven by the param's status. */
export const qcdNextSentence = () =>
  QCD_NEXT_LIMIT == null ? `The IRS has not announced the ${NEXT_YEAR} limit yet.` : `The ${NEXT_YEAR} limit is ${money(QCD_NEXT_LIMIT)}.`;
export const EXCISE_RATE = RMD_EXCISE.value.rate;
export const EXCISE_RATE_CORRECTED = RMD_EXCISE.value.correctedRate;
const ORDINALS = ["first", "second", "third", "fourth", "fifth"];
/** "second" — the correction window runs to the end of the second year after the year the missed RMD was due. */
export const CORRECTION_WINDOW_ORDINAL = ORDINALS[EXCISE_TIMING.value.correctionWindowYearsAfter - 1];
/** "5%" — owners above this share of the plan sponsor can't use the still-working exception. */
export const OWNER_LIMIT = pct(STILL_WORKING_RULE.value.ownerShareLimit, 0);

/** 70.5 → "70½" */
export const ageLabel = (age: number) => (Number.isInteger(age) ? String(age) : `${Math.floor(age)}½`);
/** "a 60-year-old" / "an 85-year-old" — the article English uses before a spoken age (8, 11, 18, 80–89). */
export const aAn = (n: number) => (n === 11 || n === 18 || String(n).startsWith("8") ? "an" : "a");
/**
 * "an $18,868" / "a $20,325" / "an $83,333" / "a $108,696": the article follows how the leading group of digits is
 * spoken ("eighteen thousand", "eighty-three thousand", "one hundred eight thousand").
 */
export const aMoney = (n: number) => {
  const s = money(n);
  const lead = Number(s.replace(/^[^\d]*/, "").split(",")[0]);
  return `${aAn(lead)} ${s}`;
};
/** "2024" or "2019 or 2021, depending on their birth date" — the qualifier only when the birth year really splits. */
export const sinceText = (years: number[]) => (years.length > 1 ? `${years.join(" or ")}, depending on their birth date` : String(years[0]));
/** 120 → "120+" (the last row of each IRS table means "120 and older"). */
export const tableAgeLabel = (age: number) => (age >= UNIFORM_MAX_AGE ? `${UNIFORM_MAX_AGE}+` : String(age));

// ── Table math ────────────────────────────────────────────────────────────────────────────────────────────────
const clampAge = (age: number) => Math.min(UNIFORM_MAX_AGE, Math.max(UNIFORM_MIN_AGE, Math.round(age)));
/** Uniform Lifetime Table distribution period (Reg. §1.401(a)(9)-9(c)). */
export const factorAt = (age: number) => UNIFORM_LIFETIME[clampAge(age)];
/** Share of the prior Dec 31 balance that must come out at this age. */
export const shareAt = (age: number) => 1 / factorAt(age);
/** RMD = prior Dec 31 balance ÷ distribution period (Reg. §1.401(a)(9)-5(a), (c)). */
export const rmdAt = (balance: number, age: number) => balance / factorAt(age);
/**
 * Yearly return the account needs just to stay level after this year's RMD: (1 − 1/f)(1 + g) = 1 → g = 1/(f − 1).
 * Above it the balance (and next RMD) still grows; below it the account shrinks.
 */
export const breakEvenGrowth = (age: number) => 1 / (factorAt(age) - 1);
/** Joint and Last Survivor Table (Reg. §1.401(a)(9)-9(d)): row = owner's age, column = spouse's age. */
const clamp120 = (n: number) => Math.min(120, Math.max(0, Math.round(n)));
export const jointAt = (ownerAge: number, spouseAge: number) => JOINT_LIFE[clamp120(ownerAge)][clamp120(spouseAge)];
/** Joint table applies only when the spouse is more than 10 years younger; with whole-year ages that means a gap of 11+. */
export const jointApplies = (ownerAge: number, spouseAge: number) => ownerAge - spouseAge > JOINT_GAP;
/** Single Life Table (Reg. §1.401(a)(9)-9(b)) — beneficiaries. */
export const singleAt = (age: number) => SINGLE_LIFE[clamp120(age)];

export const fmtPct = (share: number) => pct(share, 2);
/** Distribution periods are printed with one decimal, as in the regulation (22.0, not 22). */
export const fmtFactor = (f: number) => f.toFixed(1);
/** Change in percentage points for tables, e.g. 0.0014 → "+0.14 pts". */
export const fmtPts = (d: number) => `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(2)} pts`;
/** Unsigned change for prose, e.g. 0.0014 → "0.14 percentage points". */
export const fmtPtsLong = (d: number) => `${Math.abs(d * 100).toFixed(2)} percentage points`;

/** Link into the RMD calculator using the cross-calculator URL contract (dob, bal, sp, sdob). Mid-year birthdays. */
export function calcHref({ birthYear, bal, spouseBirthYear, year }: { birthYear: number; bal?: number; spouseBirthYear?: number; year?: number }) {
  const sp = new URLSearchParams();
  if (year) sp.set("year", String(year));
  sp.set("dob", `${birthYear}-6-15`);
  if (bal != null) sp.set("bal", String(Math.round(bal)));
  if (spouseBirthYear != null) {
    sp.set("sp", "1");
    sp.set("sdob", `${spouseBirthYear}-6-15`);
  }
  return `/rmd-calculator?${sp.toString()}`;
}

/**
 * Birth-year range of the RMD calculator's spouse date picker (a UI limit in RmdCalculator.tsx, not a tax parameter). A spouse
 * born outside it can't be shown in the picker, so such a link would compute with a date the reader can't see.
 */
export const CALC_SPOUSE_BIRTH_YEARS = { min: 1930, max: 2005 } as const;

/**
 * Calculator link for the joint-table lookup (ages reached in THIS_YEAR). The calculator's birth-date picker only reaches
 * back to age {@link AGE_PAGE_MAX}; for older owners a prefilled birth year would be computed but not shown, so the link
 * stays unprefilled. The spouse is passed only when the joint table actually applies.
 */
export function lookupCalcHref(ownerAge: number, spouseAge: number) {
  if (!hasAgePage(ownerAge) || !Number.isInteger(spouseAge) || spouseAge < 0) return "/rmd-calculator";
  const spouseBirthYear = THIS_YEAR - spouseAge;
  const joint = jointApplies(ownerAge, spouseAge);
  // A spouse the calculator's picker can't show: prefill only the owner (the reader then adds the spouse by hand).
  const showable = spouseBirthYear >= CALC_SPOUSE_BIRTH_YEARS.min && spouseBirthYear <= CALC_SPOUSE_BIRTH_YEARS.max;
  return calcHref({ birthYear: THIS_YEAR - ownerAge, bal: REF_BALANCE, spouseBirthYear: joint && showable ? spouseBirthYear : undefined });
}

// ── Birth cohorts ─────────────────────────────────────────────────────────────────────────────────────────────
export type CohortStatus = "first" | "second" | "later" | "not-yet";

export interface CohortRow {
  year: number;
  birthYear: number;
  /** "" for the whole year, or "January–June" / "July–December" when the rules split the year (1949 and earlier). */
  part: "" | "January–June" | "July–December";
  applicableAge: number;
  firstYear: number;
  status: CohortStatus;
}

/**
 * Who reaches `age` in `year`, their RMD (applicable) age and first distribution year. Birth years up to 1949 split at
 * July 1: the old 70½ rule (and the 1949 switch to 72) depends on the half of the year you were born in.
 */
export function cohortRows(year: number, age: number): CohortRow[] {
  const birthYear = year - age;
  const h1 = { year: birthYear, month: 6, day: 30 };
  const h2 = { year: birthYear, month: 7, day: 1 };
  const row = (dob: typeof h1, part: CohortRow["part"]): CohortRow => {
    const firstYear = firstRmdYear(dob);
    const status: CohortStatus = year < firstYear ? "not-yet" : year === firstYear ? "first" : year === firstYear + 1 ? "second" : "later";
    return { year, birthYear, part, applicableAge: rmdApplicableAge(dob), firstYear, status };
  };
  const a = row(h1, "January–June");
  const b = row(h2, "July–December");
  if (a.applicableAge === b.applicableAge && a.firstYear === b.firstYear) return [{ ...a, part: "" }];
  return [a, b];
}

export function statusText(r: CohortRow) {
  switch (r.status) {
    case "first":
      return `First RMD year — due by April 1, ${r.year + 1}`;
    case "second":
      return "Second RMD year — two RMDs if the first was postponed";
    case "later":
      return `Taking RMDs since ${r.firstYear}`;
    default:
      return `First RMD in ${r.firstYear}`;
  }
}

/** Distinct first-RMD years for everyone who reaches `age` in `year` (one or two values). */
export const startYears = (year: number, age: number) =>
  cohortRows(year, age)
    .map((r) => r.firstYear)
    .filter((v, i, a) => a.indexOf(v) === i);

/** Age bands with genuinely different advice. */
export type Band = "first" | "second" | "seventy-five" | "late-seventies" | "eighties" | "nineties" | "hundreds";
export function bandFor(age: number): Band {
  if (age <= RMD_AGE_NOW) return "first";
  if (age === RMD_AGE_NOW + 1) return "second";
  if (age === RMD_AGE_LATER) return "seventy-five";
  if (age < 80) return "late-seventies";
  if (age < 90) return "eighties";
  if (age < 100) return "nineties";
  return "hundreds";
}

// ── Page copy that is also used in metadata / FAQ schema (plain text) ─────────────────────────────────────────
export function ageTitle(age: number) {
  return `RMD at Age ${age}: ${THIS_YEAR} Factor, Percentage & Examples`;
}

export function ageDescription(age: number) {
  const f = factorAt(age);
  return `At ${age} the IRS RMD factor is ${fmtFactor(f)}, so you must withdraw ${fmtPct(1 / f)} of your balance (${money(100000 / f)} per $100k). Who is ${age} in ${THIS_YEAR} and ${NEXT_YEAR}, the spouse table and traps.`;
}

export interface FaqText {
  q: string;
  a: string;
}

/** Five age-specific FAQs (plain text; 40–80 words each). */
export function ageFaq(age: number): FaqText[] {
  const f = factorAt(age);
  const share = fmtPct(1 / f);
  const b26 = THIS_YEAR - age;
  const b27 = NEXT_YEAR - age;
  const since = startYears(THIS_YEAR, age);
  const band = bandFor(age);
  const r500 = rmdAt(REF_BALANCE, age);
  const items: FaqText[] = [
    {
      q: `How much is the required minimum distribution at age ${age}?`,
      a: `At ${age} you divide last December 31’s account balance by ${fmtFactor(f)}, the IRS Uniform Lifetime Table factor, which means withdrawing ${share} of it. That is ${money(100000 / f)} per $100,000, ${money(r500)} on ${money(REF_BALANCE)} and ${money(rmdAt(1000000, age))} on $1 million. If your only beneficiary is a spouse more than ${JOINT_GAP} years younger, the Joint and Last Survivor Table gives a smaller RMD.`,
    },
  ];

  const statusSentence =
    band === "first"
      ? `For both groups ${age} is the first RMD year, so the first withdrawal may wait until April 1 of the following year.`
      : band === "second"
        ? `For both groups it is the second RMD year — the year two withdrawals come due if the first one was postponed.`
        : `People born in ${b26} have been taking RMDs since ${sinceText(since)}.`;
  items.push({
    q: `What birth year is age ${age} for RMDs in ${THIS_YEAR}?`,
    a: `Anyone born in ${b26} reaches ${age} on their ${THIS_YEAR} birthday, and the IRS uses that age for the whole year — even if the birthday is in December. In ${NEXT_YEAR}, the age-${age} group is people born in ${b27}. ${statusSentence}`,
  });

  if (band === "first") {
    items.push({
      q: `Can I wait until April 1 to take my first RMD at ${age}?`,
      a: `Yes. Your first RMD can wait until April 1 of the year after you turn ${age}, but that year’s own RMD is still due by December 31. On a steady ${money(REF_BALANCE)} IRA that stacks about ${money(r500 + rmdAt(REF_BALANCE, age + 1))} of taxable withdrawals into one year instead of two. Unless your income will drop sharply next year, take the first RMD in the year you turn ${age}.`,
    });
  } else if (band === "second") {
    items.push({
      q: `Why is my RMD bigger at ${age} than at ${age - 1}?`,
      a: `The factor falls from ${fmtFactor(factorAt(age - 1))} at ${age - 1} to ${fmtFactor(f)} at ${age}, so the required share rises from ${fmtPct(shareAt(age - 1))} to ${share} of your balance. On an unchanged ${money(REF_BALANCE)} balance the RMD grows from ${money(rmdAt(REF_BALANCE, age - 1))} to ${money(r500)}. If you postponed your first RMD to April 1 of this year, you owe both in the same tax year.`,
    });
  } else if (band === "seventy-five") {
    items.push({
      q: `Is ${age} the new RMD age?`,
      a: `Only for people born in ${FIRST_75_BIRTH_YEAR} or later, who take their first RMD for the year they turn ${age} — ${FIRST_75_FIRST_YEAR} at the earliest. Anyone who is ${age} in ${THIS_YEAR} was born in ${b26} and has been taking RMDs since ${sinceText(since)}. The factor at ${age} is ${fmtFactor(f)}, or ${share} of the prior year-end balance.`,
    });
  } else if (band === "late-seventies") {
    items.push({
      q: `Do I have to take an RMD at ${age} if I’m still working?`,
      a: `From an IRA, yes — the still-working exception never applies to IRAs, including SEP and SIMPLE IRAs. From your current employer’s 401(k) or 403(b), you can usually wait until you retire if you own ${OWNER_LIMIT} or less of the company. For everything else, the RMD at ${age} is ${share} of last December 31’s balance, or ${money(100000 / f)} per $100,000.`,
    });
  } else if (band === "eighties") {
    const later = Math.min(age + 5, UNIFORM_MAX_AGE);
    items.push({
      q: `Why does my RMD percentage keep rising in my 80s?`,
      a: `Because the Uniform Lifetime Table factor shrinks every year: ${share} at ${age}, ${fmtPct(shareAt(age + 1))} at ${age + 1} and ${fmtPct(shareAt(later))} at ${later}. Unless your investments earn more than about ${pct(breakEvenGrowth(age), 1)} a year, the balance — and eventually the dollar RMD — starts to fall. A qualified charitable distribution or tax withholding from the RMD itself can soften the yearly tax bill.`,
    });
  } else if (band === "nineties") {
    items.push({
      q: `Do I have to take an RMD at ${age} even if my IRA is small?`,
      a: `Yes. No balance is too small to be exempt: at ${age} you must withdraw ${share} of any traditional IRA balance — ${money(rmdAt(SMALL_BALANCE, age))} on ${money(SMALL_BALANCE)}. Each IRA’s RMD is figured separately, but you can take the total from just one of them. Many people this age consolidate small IRAs into one account and set the RMD to pay out automatically.`,
    });
  } else {
    items.push({
      q: `Is there still an RMD at age ${age}?`,
      a: `Yes. RMDs never stop while you own a traditional IRA or 401(k). At ${age} the factor is ${fmtFactor(f)}, so you must withdraw ${share} of the prior year-end balance — ${money(100000 / f)} per $100,000. The percentage keeps rising but never reaches 100%: at ${UNIFORM_MAX_AGE} and older the factor is ${fmtFactor(factorAt(UNIFORM_MAX_AGE))}, or ${fmtPct(shareAt(UNIFORM_MAX_AGE))} of the balance a year.`,
    });
  }

  items.push({
    q: `What happens if I miss my RMD at ${age}?`,
    a: `The IRS charges an excise tax of ${pct(EXCISE_RATE)} of the amount you didn’t take — ${money(r500 * EXCISE_RATE)} if you skipped the whole ${money(r500)} RMD on ${money(REF_BALANCE)}. Take the missed amount and report it on ${RMD_EXCISE.value.form} by the end of the ${CORRECTION_WINDOW_ORDINAL} year after the year it was due — before the IRS contacts you — and the tax drops to ${pct(EXCISE_RATE_CORRECTED)}, or ${money(r500 * EXCISE_RATE_CORRECTED)}. For a reasonable error you fix promptly, you can ask the IRS to waive it entirely.`,
  });

  items.push({
    q: `Can a charitable donation count as my RMD at ${age}?`,
    a: `Yes. You are past ${ageLabel(QCD_MIN_AGE)}, so a qualified charitable distribution (QCD) sent directly from your IRA to a charity counts toward the RMD and stays out of your taxable income — up to ${money(QCD_LIMIT_THIS_YEAR)} per person in ${THIS_YEAR}. ${
      r500 <= QCD_LIMIT_THIS_YEAR
        ? `At ${age}, ${aMoney(r500)} QCD would cover the whole RMD on ${aMoney(REF_BALANCE)} IRA.`
        : `At ${age}, the limit covers ${money(QCD_LIMIT_THIS_YEAR)} of the ${money(r500)} RMD on ${aMoney(REF_BALANCE)} IRA.`
    } ${qcdNextSentence()}`,
  });
  return items;
}
