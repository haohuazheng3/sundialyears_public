/**
 * Plain-text copy that is generated from the rules for each birth year (FAQ answers go into FAQPage JSON-LD verbatim,
 * so they are plain strings). Word counts are checked in timeline.test.ts.
 */
import type { FaqItem } from "@/components/tool/Faq";
import { fraForCohort, fraMonth, earliestRetirementMonth } from "@/lib/calc/ss-core";
import { rmdApplicableAge, firstRmdYear } from "@/lib/calc/rmd";
import { SENIOR_DEDUCTION } from "@/data/params/tax";
import { UNIFORM_LIFETIME } from "@/data/params/rmd";
import { PENALTIES } from "@/data/params/medicare";
import { EARNINGS_TEST_RATIO, MEDICARE_ENROLLMENT, RETROACTIVITY, SS_AGES } from "@/data/params/birth-year-extra";
import { money } from "@/lib/format";
import {
  type BirthYearProfile,
  monthLabel,
  monthSpan,
  pct1,
  phaseOf,
  rmdAgeLabel,
  medicareMonth,
  drcPerYearLabel,
  pctOfPiaAtAge,
} from "./timeline";

const { perPerson, phaseoutStart, phaseoutRate, years: SD_YEARS } = SENIOR_DEDUCTION.value;
const SD_FIRST = SD_YEARS[0];
const SD_LAST = SD_YEARS[SD_YEARS.length - 1];
/** Age the senior deduction requires by December 31 (2025 cutoff "born before January 2, 1961" → 65). */
export const SENIOR_AGE = SD_FIRST - Number(SENIOR_DEDUCTION.value.birthCutoff[SD_FIRST as keyof typeof SENIOR_DEDUCTION.value.birthCutoff].slice(0, 4)) + 1;
const { eligibilityAge: MEDICARE_AGE, iepMonths, monthsBefore, monthsAfter } = MEDICARE_ENROLLMENT.value;
const AGE_62 = SS_AGES.value.earliestRetirement;
const AGE_70 = SS_AGES.value.drcStops;

/** "2027" or "2025 (born January–February) or 2026 (born March–December)". */
export function fraWhen(p: BirthYearProfile) {
  if (p.fraYears.length === 1) return `${p.fraYears[0].year}`;
  return p.fraYears.map((g) => `${g.year} (born ${monthSpan(g.months)})`).join(" or ");
}

/** Joins ["2026", "2027", "2028"] as "2026, 2027 and 2028". */
export function listYears(ys: number[]) {
  if (ys.length <= 1) return ys.join("");
  if (ys.length > 2 && ys[ys.length - 1] - ys[0] === ys.length - 1) return `${ys[0]} through ${ys[ys.length - 1]}`;
  return `${ys.slice(0, -1).join(", ")} and ${ys[ys.length - 1]}`;
}

/** Answer about the senior deduction for one birth year (plain text). */
export function seniorDeductionAnswer(p: BirthYearProfile) {
  const { typical, jan1 } = p.senior;
  const amount = money(perPerson);
  const phaseout = `It shrinks by ${Math.round(phaseoutRate * 100)}% of income above ${money(phaseoutStart.single)} (${money(phaseoutStart.mfj)} for married couples, who must file jointly).`;
  if (typical.length === SD_YEARS.length)
    return `Yes, for every year it exists, ${SD_FIRST} through ${SD_LAST}. Each person who is ${SENIOR_AGE} or older by December 31 can deduct up to ${amount} on top of the standard deduction, whether or not they itemize. ${phaseout} You also need a valid Social Security number.`;
  if (typical.length > 0) {
    const extra = jan1.length > typical.length ? ` Born on January 1, ${p.year}? The IRS treats you as ${SENIOR_AGE} a day early, so ${jan1[0]} counts too.` : "";
    return `Yes, for ${listYears(typical)}, the years you are ${SENIOR_AGE} or older by December 31. Each eligible person deducts up to ${amount} on top of the standard deduction.${extra} ${phaseout}`;
  }
  if (jan1.length > 0)
    return `Only if you were born on January 1, ${p.year}. The IRS treats you as reaching ${SENIOR_AGE} the day before your birthday, which puts you at ${SENIOR_AGE} on December 31, ${jan1[0]}, the last year the ${amount} deduction exists under current law. Everyone else born in ${p.year} turns ${SENIOR_AGE} in ${p.year + SENIOR_AGE}, after it expires, unless Congress extends it.`;
  return `No, not under current law. The ${amount} senior deduction covers tax years ${SD_FIRST} through ${SD_LAST} only, and you turn ${SENIOR_AGE} in ${p.year + SENIOR_AGE}. Congress could extend it before then, but don't count on it. The regular extra standard deduction for people ${SENIOR_AGE} or older has no end date and will still apply.`;
}

/** Plain-text RMD answer for one birth year. */
export function rmdAnswer(p: BirthYearProfile, refYear: number) {
  const g = p.rmd;
  const ageNow = refYear - p.year;
  const factor = UNIFORM_LIFETIME[ageNow];
  const ongoing =
    factor !== undefined && g.every((x) => x.firstYear < refYear)
      ? ` In ${refYear} you divide your December 31, ${refYear - 1} balance by ${factor}, the IRS factor for age ${ageNow}.`
      : "";
  if (g.length > 1 && g[0].age !== g[1].age)
    return `It depends on your birthday. Born ${monthSpan(g[0].months)} ${p.year}: the old ${rmdAgeLabel(g[0].age)} rule, so your first RMD was for ${g[0].firstYear}. Born ${monthSpan(g[1].months)}: age ${rmdAgeLabel(g[1].age)}, first RMD for ${g[1].firstYear}. Either way you now owe an RMD every year by December 31.${ongoing}`;
  if (g.length > 1)
    return `Your RMD age is ${rmdAgeLabel(g[0].age)}, the old rule. Born ${monthSpan(g[0].months)}, you reached it in ${g[0].firstYear}; born ${monthSpan(g[1].months)}, in ${g[1].firstYear}. Since then an RMD has been due every December 31.${ongoing} Qualified charitable distributions can count toward it.`;
  const { age, firstYear } = g[0];
  if (p.year === 1959) {
    const alt = rmdApplicableAge({ year: p.year + 1, month: 6, day: 15 });
    return `Age ${rmdAgeLabel(age)} under the IRS proposed regulations, which we follow: your first RMD would be for ${firstYear}, due by April 1, ${firstYear + 1}. The law's wording is ambiguous for people born in 1959 (it can be read as ${rmdAgeLabel(age)} or ${rmdAgeLabel(alt)}), and the final rule for your year is still reserved. We will update this page when the IRS settles it.`;
  }
  if (firstYear < refYear)
    return `Your RMD age is ${rmdAgeLabel(age)}, so your first RMD was for ${firstYear} (due by April 1, ${firstYear + 1}). Since then each RMD is due by December 31.${ongoing} Roth IRAs never require withdrawals while you are alive.`;
  return `Your RMD age is ${rmdAgeLabel(age)}, so your first RMD is for ${firstYear} and is due by April 1, ${firstYear + 1}. Every later RMD is due by December 31, so waiting until April means taking two RMDs in ${firstYear + 1}. Roth IRAs never require withdrawals while you are alive.`;
}

/** FAQ for a birth-year page (5–7 items, 40–80 words each). */
export function birthYearFaq(p: BirthYearProfile, refYear: number): FaqItem[] {
  const y = p.year;
  const phase = phaseOf(p);
  const jan1Dob = { year: y, month: 1, day: 1 };
  const firstMonthPct = pct1(p.pctFirstPossibleMonth);
  const per1000 = (x: number) => money(1000 * x);
  const items: FaqItem[] = [
    {
      q: `What is the full retirement age for someone born in ${y}?`,
      a: `It is ${p.fra.label}. People born in ${y} reach full retirement age in ${fraWhen(p)}, in the month they turn ${p.fra.label}. From then on Social Security pays 100% of your benefit. Claiming earlier cuts the check for life; waiting past it adds ${drcPerYearLabel(y)} a year until ${AGE_70}. ${
        p.jan1.sameFra ? `A January 1 birthday doesn't change it.` : `Born on January 1, ${y}? SSA counts you with ${y - 1}, so yours is ${p.jan1.fra.label}.`
      }`,
    },
    {
      q: `How much Social Security do I get at ${AGE_62} if I was born in ${y}?`,
      a: `Claiming in the month you turn ${AGE_62} pays ${pct1(p.pctAt62)} of your full benefit, because you start ${p.monthsEarlyAt62} months before full retirement age. Most people can't start until ${AGE_62} and 1 month (${firstMonthPct}), because SSA requires you to be ${AGE_62} for the whole month. Each $1,000 of full benefit becomes about ${per1000(p.pctAt62)}. Waiting until ${AGE_70} raises it to ${per1000(p.pctAt70)}, or ${pct1(p.pctAt70)}.`,
    },
    {
      q: `When can I get Medicare if I was born in ${y}?`,
      a:
        p.age65Year < refYear
          ? `You became eligible at ${MEDICARE_AGE}, in ${p.age65Year}, during a ${iepMonths}-month Initial Enrollment Period around your birthday month. If you skipped Part B then without job-based coverage from current work, the premium is ${Math.round(PENALTIES.value.partBPerFull12Months * 100)}% higher for each full 12 months you went without it, usually for life. Medicare starts at the same age for everyone, whatever your Social Security full retirement age.`
          : `At ${MEDICARE_AGE}, in ${p.age65Year}. Your Initial Enrollment Period lasts ${iepMonths} months: the ${monthsBefore} months before your birthday month, that month, and the ${monthsAfter} months after. Sign up in the first ${monthsBefore} months and coverage starts the month you turn ${MEDICARE_AGE}. Born on the 1st? Everything moves one month earlier. Medicare's age does not follow Social Security's full retirement age of ${p.fra.label}.`,
    },
    { q: `What age do RMDs start if I was born in ${y}?`, a: rmdAnswer(p, refYear) },
    { q: `Can people born in ${y} take the ${money(perPerson)} senior deduction?`, a: seniorDeductionAnswer(p) },
    {
      q: `What if I was born on January 1, ${y}?`,
      a: `SSA says you reach each age on the day before your birthday, so a January 1, ${y} birthday is treated as ${y - 1}. Your full retirement age is ${p.jan1.fra.label}, reached in ${monthLabel(p.jan1.fraMonth)}, and you can claim from ${monthLabel(earliestRetirementMonth(jan1Dob))}. Medicare starts a month early too, in ${monthLabel(medicareMonth(jan1Dob))}. The IRS uses the same day-before rule for the senior deduction.`,
    },
  ];
  if (phase === "past70" || phase === "turning70") {
    const past = phase === "past70";
    items.push({
      q: `I was born in ${y} and haven't claimed Social Security yet. What should I do?`,
      a: past
        ? `Apply now. Delayed retirement credits stopped when you turned ${AGE_70} in ${p.age70Year}, so every month you wait is a month of benefits you never get back. SSA pays at most ${RETROACTIVITY.value.months} months of back benefits, so anything older is lost. Your check will be ${pct1(p.pctAt70)} of your full benefit plus every cost-of-living raise since ${p.age62Year}.`
        : `File for the month you turn ${AGE_70} in ${p.age70Year}, at the latest. That month locks in ${pct1(p.pctAt70)} of your full benefit, and delayed credits stop growing after it. If you file late, SSA pays at most ${RETROACTIVITY.value.months} months of back benefits, so every month beyond that is simply lost. Don't let it slide into next year.`,
    });
  }
  return items;
}

/** FAQ for /full-retirement-age. */
export function fraFaq(): FaqItem[] {
  const f60 = fraForCohort(1960);
  const f59 = fraForCohort(1959);
  const f55 = fraForCohort(1955);
  const f54 = fraForCohort(1954);
  const f37 = fraForCohort(1937);
  const firstRise = [1938, 1939, 1940].find((c) => fraForCohort(c).total > f37.total)!;
  const jan1960 = monthLabel(fraMonth({ year: 1960, month: 1, day: 1 }));
  const { beforeFraYear, fraYear } = EARNINGS_TEST_RATIO.value;
  return [
    {
      q: "What is the full retirement age for someone born in 1960?",
      a: `It is ${f60.label}, the top of the schedule. People born in 1960 reach it in ${1960 + f60.years}, in the month of their ${f60.label}th birthday. One exception: if you were born on January 1, 1960, SSA counts you with 1959, so your full retirement age is ${f59.label} and you reached it in ${jan1960}. Everyone born after 1960 also has a full retirement age of ${f60.label}.`,
    },
    {
      q: `Is my full retirement age ${f54.label} or ${f60.label}?`,
      a: `It is ${f54.label} if you were born from 1943 through 1954 and ${f60.label} if you were born in 1960 or later. Birth years 1955 through 1959 fall in between: two months are added per year, from ${f55.label} for 1955 to ${f59.label} for 1959. If you were born on January 1, use the previous year.`,
    },
    {
      q: "Why does a January 1 birthday use the previous year?",
      a: `Social Security says you reach an age on the day before your birthday. Someone born January 1 therefore turns ${AGE_62}, ${f54.label} or ${f60.label} on December 31 of the year before, and SSA groups them with that earlier birth year. The same rule means anyone born on the 1st of any month is treated as born in the month before.`,
    },
    {
      q: "Can I work after full retirement age without losing benefits?",
      a: `Yes. The earnings test stops in the month you reach full retirement age, so from then on you can earn any amount without anything being withheld. Before that, Social Security holds back $1 for every $${beforeFraYear} (or, in the year you reach full retirement age, every $${fraYear}) you earn over a yearly limit, and repays it later through a higher monthly benefit.`,
    },
    {
      q: "Does Medicare start at full retirement age?",
      a: `No. Medicare eligibility starts at ${MEDICARE_AGE} for everyone, no matter when your Social Security full retirement age is. If you plan to wait until ${f54.label} or ${f60.label} to claim Social Security, you still need to sign up for Medicare during the ${iepMonths}-month window around your ${MEDICARE_AGE}th birthday, or you risk a lifelong late-enrollment penalty on Part B.`,
    },
    {
      q: "Will the full retirement age go up again?",
      a: `Not under current law. ${f60.label} is the top of the schedule in the regulations (20 CFR 404.409) for everyone born in 1960 or later, and no further step is scheduled. Raising it would take a new act of Congress. The last increase was phased in gradually, two months per birth year, starting with people born in ${firstRise}.`,
    },
  ];
}

/** FAQ for the /social-security-by-birth-year hub. */
export function hubFaq(): FaqItem[] {
  const f60 = fraForCohort(1960);
  const f59 = fraForCohort(1959);
  const f54 = fraForCohort(1954);
  const mid = (y: number) => ({ year: y, month: 6, day: 15 });
  const rmd60 = rmdApplicableAge(mid(1960));
  const rmd51 = rmdApplicableAge(mid(1951));
  const rmd50 = rmdApplicableAge(mid(1950));
  return [
    {
      q: "How does my birth year affect Social Security?",
      a: `Your birth year sets your full retirement age, which decides how much claiming early costs and how much waiting earns. It also sets your survivor full retirement age, your Medicare year and your RMD age. People born in 1960 or later have a full retirement age of ${f60.label}; claiming at ${AGE_62} pays them ${pct1(pctOfPiaAtAge(1960, AGE_62))} of the full benefit for life.`,
    },
    {
      q: `Which birth years have a full retirement age of ${f60.label}?`,
      a: `Everyone born in 1960 or later, except people born on January 1, 1960, who are counted with 1959 and have a full retirement age of ${f59.label}. People born from 1943 through 1954 have a full retirement age of ${f54.label}, and the years 1955 to 1959 phase in between the two in two-month steps.`,
    },
    {
      q: "What is the earliest age to claim Social Security retirement benefits?",
      a: `Age ${AGE_62}, but you must be ${AGE_62} for the entire month. In practice your first month is the month after your ${AGE_62}nd birthday. Only people born on the 1st or 2nd of a month can start in the birthday month itself. Widows and widowers are different: survivor benefits can start at ${SS_AGES.value.earliestSurvivor}.`,
    },
    {
      q: `What birth years have RMDs at ${rmd60}?`,
      a: `Everyone born in 1960 or later has a required minimum distribution age of ${rmd60}, so the first RMD for someone born in 1960 is for ${firstRmdYear(mid(1960))}. People born from 1951 through 1959 start at ${rmd51} (1959 is assigned ${rmd51} by proposed IRS regulations), and those born July 1, 1949 through 1950 started at ${rmd50}.`,
    },
    {
      q: "Does my birth year change when I get Medicare?",
      a: `Only the calendar year. Medicare eligibility is age ${MEDICARE_AGE} for everyone, so it falls in the year you turn ${MEDICARE_AGE}. Your ${iepMonths}-month sign-up window runs from ${monthsBefore} months before your birthday month to ${monthsAfter} months after. If your birthday is on the 1st, eligibility starts the month before, just as Social Security treats you as a month older.`,
    },
  ];
}
