import Link from "next/link";
import { Callout } from "@/components/tool/Result";
import { StatusChip } from "@/components/tool/StatusChip";
import { money, money2 } from "@/lib/format";
import { drcPerMonth, earlyRetirementFactor, fraForCohort } from "@/lib/calc/ss-core";
import { SS_YEAR } from "@/data/params/social-security";
import { ADDITIONAL_STD_2026, QCD, SENIOR_DEDUCTION } from "@/data/params/tax";
import { RMD_EXCISE, UNIFORM_LIFETIME } from "@/data/params/rmd";
import { rmdApplicableAge } from "@/lib/calc/rmd";
import { PART_B, PENALTIES } from "@/data/params/medicare";
import { DEEMED_FILING, MEDICARE_ENROLLMENT, RETROACTIVITY, SS_AGES } from "@/data/params/birth-year-extra";
import { PERIOD_LIFE_TABLE_YEAR } from "@/data/generated/period-life-table";
import { fromMonthIndex } from "@/lib/calc/dates";
import {
  AGE_DRC_STOP,
  AGE_EARLY,
  type BirthYearProfile,
  monthLabel,
  monthSpan,
  pct1,
  pct3,
  phaseOf,
  pctOfPiaAtAge,
  rmdAgeLabel,
  drcPerYearLabel,
  shortRange,
  earningsTestRows,
  pctIfClaimingIn,
  type SsYear,
} from "./timeline";
import { SENIOR_AGE, fraWhen, listYears, rmdAnswer, seniorDeductionAnswer } from "./content";
import { BirthMonthTable, ClaimAgeTable, ColaGrid, LifeTable } from "./Tables";
import { type Milestone, statusFor } from "./MilestoneList";
import { LONGEVITY_AGES } from "./longevity-ages";
import type { CohortLife } from "./cohort-life";

const { eligibilityAge: MEDICARE_AGE, iepMonths, monthsBefore, monthsAfter } = MEDICARE_ENROLLMENT.value;
const SURVIVOR_AGE = SS_AGES.value.earliestSurvivor;
const SD = SENIOR_DEDUCTION.value;
type PartBYear = keyof typeof PART_B;

const dobParam = (y: number) => `${y}-6-15`;
const fraYearsOf = (p: BirthYearProfile) => p.fraYears.map((g) => g.year);

/** Chronological milestones for the timeline at the top of a birth-year page. */
export function birthYearMilestones(p: BirthYearProfile): Milestone[] {
  const ref = p.refYear;
  const fraYs = fraYearsOf(p);
  const rmdYears = [...new Set(p.rmd.map((g) => g.firstYear))];
  const rmdAges = [...new Set(p.rmd.map((g) => g.age))];
  const items: Milestone[] = [
    {
      key: "62",
      year: p.age62Year,
      when: String(p.age62Year),
      age: `Age ${AGE_EARLY}`,
      title: "Earliest Social Security retirement benefit",
      detail: (
        <>
          Benefits can start the month after your {AGE_EARLY}nd birthday (your birthday month if you were born on the 1st or 2nd), at{" "}
          {pct1(p.pctFirstPossibleMonth)} of your full benefit ({pct1(p.pctAt62)} if you were born on the 2nd and start in your birthday month). Cost-of-living
          raises count from December {p.age62Year}, claimed or not.
        </>
      ),
      status: statusFor([p.age62Year], ref),
    },
    {
      key: "65",
      year: p.age65Year,
      when: String(p.age65Year),
      age: `Age ${MEDICARE_AGE}`,
      title: "Medicare eligibility",
      detail: (
        <>
          A {iepMonths}-month sign-up window: {monthsBefore} months before your birthday month through {monthsAfter} months after. Sign up early and coverage
          starts the month you turn {MEDICARE_AGE}.
        </>
      ),
      status: statusFor([p.age65Year], ref),
    },
    {
      key: "fra",
      year: fraYs[0],
      when: shortRange(fraYs),
      age: `Age ${p.fra.label}`,
      title: "Full retirement age",
      detail: (
        <>
          100% of your benefit, and the earnings test no longer applies.
          {p.fraYears.length > 1 ? (
            <>
              {" "}
              Born {monthSpan(p.fraYears[0].months)}: {p.fraYears[0].year}; born {monthSpan(p.fraYears[1].months)}: {p.fraYears[1].year}.
            </>
          ) : null}
        </>
      ),
      status: statusFor(fraYs, ref),
    },
    {
      key: "70",
      year: p.age70Year,
      when: String(p.age70Year),
      age: `Age ${AGE_DRC_STOP}`,
      title: "Biggest possible benefit — delayed credits stop",
      detail: (
        <>
          Starting at {AGE_DRC_STOP} pays {pct1(p.pctAt70)} of your full benefit. Waiting longer adds nothing, so claim by then.
        </>
      ),
      status: statusFor([p.age70Year], ref),
    },
    {
      key: "rmd",
      year: rmdYears[0],
      when: shortRange(rmdYears),
      age: `Age ${rmdAges.map(rmdAgeLabel).join(" or ")}`,
      title: "First required minimum distribution (RMD)",
      detail: (
        <>
          Due by April 1, {rmdYears[0] + 1}
          {rmdYears.length > 1 ? ` (or ${rmdYears[1] + 1}, by birth month)` : ""}; every later one by December 31.
          {p.year === 1959 ? ` Age ${rmdAgeLabel(p.rmd[0].age)} comes from proposed IRS rules — the law’s wording for 1959 is not settled.` : ""}
        </>
      ),
      status: statusFor(rmdYears, ref),
    },
  ];
  if (p.senior.typical.length) {
    const ys = p.senior.typical;
    items.push({
      key: "senior",
      year: ys[0],
      when: shortRange(ys),
      age: "Tax years",
      title: `${money(SD.perPerson)} senior deduction`,
      detail: <>Each eligible person can deduct up to {money(SD.perPerson)} a year for {listYears(ys)}, on top of the standard deduction.</>,
      status: statusFor(ys, ref),
    });
  }
  const order = ["62", "senior", "65", "fra", "70", "rmd"];
  return items.sort((a, b) => a.year - b.year || order.indexOf(a.key) - order.indexOf(b.key));
}

/** Answer-first hero lead, by where the cohort stands in refYear. */
export function BirthYearLead({ p }: { p: BirthYearProfile }) {
  const phase = phaseOf(p);
  const rmd = p.rmd[0];
  const rmdText = p.rmd.length > 1 && p.rmd[0].age !== p.rmd[1].age ? `${rmdAgeLabel(p.rmd[0].age)} or ${rmdAgeLabel(p.rmd[1].age)}` : rmdAgeLabel(rmd.age);
  const ages = `In ${p.refYear} you turn ${p.ageInRefYear.after}.`;
  switch (phase) {
    case "past70":
      return (
        <p>
          Born in {p.year}, you reached full retirement age ({p.fra.label}) in {fraWhen(p)} and turned {AGE_DRC_STOP} in {p.age70Year}, so every Social Security
          deadline is behind you. {ages} What’s left to manage: required minimum distributions (
          {p.rmd.every((g) => g.firstYear < p.refYear) ? `your RMD age was ${rmdText}` : `at ${rmdText}, first for ${shortRange([...new Set(p.rmd.map((g) => g.firstYear))])}`}),
          Medicare costs and taxes.
        </p>
      );
    case "turning70":
      return (
        <p>
          Born in {p.year}, you turn {AGE_DRC_STOP} in {p.refYear}: delayed credits stop growing in your birthday month, at {pct1(p.pctAt70)} of your full benefit.
          Your full retirement age of {p.fra.label} came in {fraWhen(p)}, Medicare in {p.age65Year}, and your first RMD is for {rmd.firstYear}.
        </p>
      );
    case "fraTo70":
      return (
        <p>
          Born in {p.year}, you reached full retirement age ({p.fra.label}) in {fraWhen(p)}. Every month you wait until {AGE_DRC_STOP} (in {p.age70Year}) still adds{" "}
          {pct3(drcPerMonth(p.year))} to your check. {ages} Your first required minimum distribution is for {rmd.firstYear}, at age {rmdText}.
        </p>
      );
    case "reachingFra":
      return (
        <p>
          Born in {p.year}, your full retirement age of {p.fra.label} falls in {fraWhen(p)}. Medicare started at {MEDICARE_AGE} in {p.age65Year}, waiting until{" "}
          {AGE_DRC_STOP} ({p.age70Year}) pays {pct1(p.pctAt70)} of your full benefit, and RMDs begin at {rmdText} in {rmd.firstYear}.
        </p>
      );
    case "62toFra": {
      const now = pctIfClaimingIn(p);
      const notYet = p.months.some((r) => fromMonthIndex(r.earliestClaim).year > p.refYear);
      return (
        <p>
          Born in {p.year}, {notYet ? "most of you" : "you"} can start Social Security in {p.refYear}, but early: starting at {now ? now.label : AGE_EARLY} pays{" "}
          {pct1(now ? now.pct : p.pctFirstPossibleMonth)} of your full benefit for life. Your full retirement age is {p.fra.label}, reached in {fraWhen(p)}; Medicare
          starts at {MEDICARE_AGE} in {p.age65Year}, and RMDs begin at {rmdText} in {rmd.firstYear}.
        </p>
      );
    }
    default:
      return (
        <p>
          Born in {p.year}, your full retirement age is {p.fra.label}, reached in {fraWhen(p)}. You can claim from {AGE_EARLY} (in {p.age62Year}) at{" "}
          {pct1(p.pctAt62)} of your full benefit, Medicare starts at {MEDICARE_AGE} in {p.age65Year}, and RMDs begin at {rmdText} in {rmd.firstYear}.
        </p>
      );
  }
}

export function BirthYearArticle({ p, life }: { p: BirthYearProfile; life: { male: CohortLife; female: CohortLife } }) {
  const y = p.year;
  const ref = p.refYear;
  const phase = phaseOf(p);
  const fraYs = fraYearsOf(p);
  const pastFra = Math.max(...fraYs) < ref;
  const per = (x: number) => money(1000 * x);
  const etRows = earningsTestRows(p);
  const lastFraYear = Math.max(...fraYs);
  const prevFra = fraForCohort(y - 1);
  const nextFra = fraForCohort(y + 1);
  const firstYearCost = 1 - earlyRetirementFactor(12);
  const laterYearCost = earlyRetirementFactor(36) - earlyRetirementFactor(48);
  const ageNow = ref - y;
  const factorNow = UNIFORM_LIFETIME[ageNow];
  const rmdStarted = p.rmd.every((g) => g.firstYear < ref);
  const rmdFirstYear = Math.min(...p.rmd.map((g) => g.firstYear));
  /** Birth months whose first possible claim month falls after refYear (a December birthday at 62). */
  const claimNextYear = p.months.filter((r) => fromMonthIndex(r.earliestClaim).year > ref);
  const colasStarted = p.colas.rows.length > 0;
  const jan1Cola = p.colas.jan1Extra;
  const noColaYears = p.colas.rows.length - p.colas.raises;
  const claimNow = pctIfClaimingIn(p);
  const nextEt = SS_YEAR[(ref + 1) as SsYear] as (typeof SS_YEAR)[SsYear] | undefined;
  const partBNow = PART_B[ref as PartBYear];
  const partBNext = PART_B[(ref + 1) as PartBYear];
  const qcd = QCD[ref as keyof typeof QCD]?.value.limit ?? null;
  const [, target90] = LONGEVITY_AGES.targets;
  const deemedYear = Number(DEEMED_FILING.value.dobCutoff.slice(0, 4));
  const survivorSame = p.survivorFra.total === p.fra.total;
  const altRmdAge = rmdApplicableAge({ year: y + 1, month: 6, day: 15 });
  const periodGap = life.male.e65 - p.period65.male;

  return (
    <>
      <h2>What is the full retirement age for someone born in {y}?</h2>
      <p className="answer">
        If you were born in {y}, your full retirement age is <strong>{p.fra.label}</strong>. You reach it in {fraWhen(p)} — the month you turn {p.fra.label} — and
        from then on Social Security pays 100% of your benefit with no earnings test.
      </p>
      {y <= 1954 && prevFra.total !== p.fra.total ? (
        <p>
          You were the first birth year with a full retirement age of {p.fra.label}; people born in {y - 1} had {prevFra.label}. Everyone born from {y} through 1954
          shares it.
        </p>
      ) : y <= 1954 && nextFra.total !== p.fra.total ? (
        <p>
          You are the last birth year with a full retirement age of {p.fra.label}. From 1955 it rises two months per birth year until it reaches{" "}
          {fraForCohort(1960).label} for people born in 1960.
        </p>
      ) : y <= 1954 ? (
        <p>Everyone born from 1943 through 1954 shares the same full retirement age of {p.fra.label}, so a year earlier or later makes no difference here.</p>
      ) : y <= 1959 ? (
        <p>
          You are in the phase-in group: the full retirement age rose two months per birth year from {fraForCohort(1955).label} (1955) to {fraForCohort(1960).label}{" "}
          (1960). Compared with someone born in {y - 1}, you wait two months longer for your full benefit, and claiming at {AGE_EARLY} pays a little less (
          {pct1(pctOfPiaAtAge(y - 1, AGE_EARLY))} for {y - 1}, {pct1(p.pctAt62)} for you).
        </p>
      ) : y === 1960 ? (
        <p>
          You are the first birth year with a full retirement age of {p.fra.label}, the top of the schedule under current law. That also makes you the first group
          for whom claiming at {AGE_EARLY} means the full {pct1(1 - p.pctAt62)} cut.
        </p>
      ) : (
        <p>Like everyone born after 1959, your full retirement age is {p.fra.label}, the top of the schedule under current law.</p>
      )}
      <p>
        <strong>Born on January 1, {y}?</strong> Social Security says you reach each age on the day before your birthday, so you are grouped with {y - 1}
        {p.jan1.sameFra ? (
          <>
            . Your full retirement age is still {p.fra.label}, but it arrives a month sooner, in {monthLabel(p.jan1.fraMonth)}.
          </>
        ) : (
          <>
            : your full retirement age is <strong>{p.jan1.fra.label}</strong>, reached in {monthLabel(p.jan1.fraMonth)}.
          </>
        )}{" "}
        The same rule moves every date one month earlier for anyone born on the 1st of a month.
      </p>
      <h3>Your key months, by birthday month</h3>
      <BirthMonthTable p={p} />

      <h2>
        How much Social Security do I get at {AGE_EARLY}, {AGE_EARLY + 1} … or {AGE_DRC_STOP}?
      </h2>
      <p className="answer">
        Born in {y}, you get {pct1(p.pctAt62)} of your full benefit if you start in the month you turn {AGE_EARLY} and {pct1(p.pctAt70)} if you wait until{" "}
        {AGE_DRC_STOP}. Each year you wait past full retirement age adds {drcPerYearLabel(y)}; each year you claim early costs {pct1(firstYearCost)} (
        {pct1(laterYearCost)} for years more than three years early).
      </p>
      <ClaimAgeTable p={p} />
      <p>
        The {AGE_EARLY} row assumes you start in the month you turn {AGE_EARLY}, which only someone born on the 2nd can do. Everyone else — including people
        born on the 1st, whom Social Security counts as a month older — starts at {AGE_EARLY} and 1 month at the earliest, at {pct1(p.pctFirstPossibleMonth)}:{" "}
        {per(p.pctFirstPossibleMonth)} for each $1,000 of full benefit.
      </p>
      {phase === "past70" ? (
        <p>
          These percentages are locked in now. Your monthly amount only changes with cost-of-living raises — and, if you still work, when a high-earning year replaces
          a lower one in your record.
        </p>
      ) : phase === "before62" ? (
        <p>
          Our view: treat {AGE_EARLY} as the emergency exit, not the plan. The gap between {pct1(p.pctAt62)} and {pct1(p.pctAt70)} is the difference between{" "}
          {per(p.pctAt62)} and {per(p.pctAt70)} a month for each $1,000 of full benefit, adjusted for inflation for the rest of your life.
        </p>
      ) : (
        <p>
          Our view: if you’re in reasonable health and have savings or work income to bridge the gap, waiting at least to full retirement age usually pays, and for
          the higher earner in a married couple, waiting to {AGE_DRC_STOP} also locks in a bigger survivor benefit. Claim earlier if your health is poor or you truly
          need the income. The <Link href={`/social-security-break-even-calculator?dob=${dobParam(y)}`}>break-even calculator</Link> shows the crossover age for your
          own benefit.
        </p>
      )}

      <h2>
        Will the earnings limit cut my benefits in {ref} or {ref + 1}?
      </h2>
      {pastFra ? (
        <p className="answer">
          No. The earnings test stopped in the month you reached full retirement age, in {fraWhen(p)}. You can earn any amount without Social Security withholding a
          dollar, and a strong earnings year can even raise your benefit if it replaces a lower year in your record.
        </p>
      ) : p.age62Year > ref + 1 ? (
        <p className="answer">
          Not yet. The earnings test only matters if you collect benefits before full retirement age while still working, and you can’t claim until {p.age62Year}.
          If you do, a yearly limit applies until {lastFraYear}
          {nextEt ? (
            <>
              {" "}
              — for comparison, it is {money(nextEt.value.retUnderFraAnnual)} in {ref + 1}
            </>
          ) : null}
          .
        </p>
      ) : (
        <p className="answer">
          Only if you claim before full retirement age and keep working. Social Security then withholds part of your benefit when your earnings pass a yearly limit,
          and it stops counting in the month you reach {p.fra.label}. The limits that apply to you are below.
        </p>
      )}
      {!pastFra && etRows.length ? (
        <div className="not-prose overflow-x-auto">
          <table className="table-sy mt-4 min-w-[34rem] text-[1rem]">
            <caption className="sr-only">Earnings test limits for people born in {y}</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Who</th>
                <th scope="col">Earnings limit</th>
                <th scope="col">How it works</th>
              </tr>
            </thead>
            <tbody>
              {etRows.map((r) => (
                <tr key={`${r.year}-${r.who}`}>
                  <td className="strong">
                    {r.year} <StatusChip status={SS_YEAR[r.year].status} />
                  </td>
                  <td>{r.who}</td>
                  <td className="strong">{r.limit}</td>
                  <td>{r.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!pastFra && p.age62Year <= ref + 1 ? (
        <p>
          Withheld money isn’t lost: at full retirement age Social Security raises your monthly benefit to credit back the months it held. See exactly what would be
          withheld with the <Link href={`/social-security-earnings-limit-calculator?dob=${dobParam(y)}&year=${ref}`}>earnings test calculator</Link>.
        </p>
      ) : null}

      <h2>When can I get Medicare if I was born in {y}?</h2>
      {p.age65Year < ref ? (
        <p className="answer">
          You became eligible at {MEDICARE_AGE}, in {p.age65Year}, during a {iepMonths}-month Initial Enrollment Period around your birthday month. If you skipped
          Part B then and had no job-based coverage from current work, the late penalty adds {pct1(PENALTIES.value.partBPerFull12Months)} of the standard premium for
          each full 12 months you went without it.
        </p>
      ) : (
        <p className="answer">
          At {MEDICARE_AGE}, in {p.age65Year}. Your Initial Enrollment Period lasts {iepMonths} months — the {monthsBefore} months before your birthday month, the
          month itself and the {monthsAfter} months after — and signing up in the first {monthsBefore} months makes coverage start the month you turn {MEDICARE_AGE}.
        </p>
      )}
      {p.age65Year >= ref ? (
        <p>
          Your window for each birthday month is in the table above. Medicare doesn’t wait for your Social Security full retirement age of {p.fra.label}: if you
          aren’t collecting Social Security by {MEDICARE_AGE}, you have to sign up yourself — waiting can cost you a late penalty for life.
        </p>
      ) : null}
      {partBNow ? (
        <p>
          The standard Part B premium is {money2(partBNow.value.premium)} a month in {ref}
          {partBNext ? (
            <>
              {" "}
              and {partBNext.status === "official" ? "will be" : "is projected at"} {money2(partBNext.value.premium)} for {ref + 1}{" "}
              <StatusChip status={partBNext.status} />
            </>
          ) : null}
          . Higher incomes pay more through IRMAA, based on your tax return from two years earlier — check yours with the{" "}
          <Link href="/irmaa-calculator">IRMAA calculator</Link>.
        </p>
      ) : null}

      <h2>When do my required minimum distributions start?</h2>
      <p className="answer">{rmdAnswer(p, ref)}</p>
      {rmdStarted && factorNow !== undefined ? (
        <p>
          That works out to {pct1(1 / factorNow)} of the balance — {money(100000 / factorNow)} for every $100,000 — and the share rises every year.
          {qcd !== null ? (
            <>
              {" "}
              Giving to charity? A qualified charitable distribution (QCD) of up to {money(qcd)} in {ref}, sent straight from your IRA, counts toward the RMD and stays
              out of your taxable income — which also helps with IRMAA and the tax on your Social Security.
            </>
          ) : null}
        </p>
      ) : y === 1959 ? (
        <Callout tone="sun" title="1959 is the one birth year without a settled RMD age">
          If the final rule says {rmdAgeLabel(altRmdAge)} instead of {rmdAgeLabel(p.rmd[0].age)}, your first RMD moves from {p.rmd[0].firstYear} to{" "}
          {y + altRmdAge} — two more years of tax-deferred growth and two more low-income years for Roth conversions. Nothing to do yet; just don’t lock in plans
          around {p.rmd[0].firstYear} until it’s settled.
        </Callout>
      ) : (
        <p>
          One trap to plan for: if you delay your first RMD to the April 1 deadline, your second is due by December 31 of the same year — two withdrawals in
          one tax year, which can push you into a higher bracket and raise Medicare premiums through IRMAA two years later. The years before RMDs start are also the
          cheapest time for Roth conversions.
        </p>
      )}
      <p>
        See your exact amount with the <Link href={`/rmd-calculator?dob=${dobParam(y)}`}>RMD calculator</Link>.
      </p>

      <h2>
        Do people born in {y} get the {money(SD.perPerson)} senior deduction?
      </h2>
      <p className="answer">{seniorDeductionAnswer(p)}</p>
      {p.senior.typical.length ? (
        <p>
          It stacks with the extra standard deduction everyone {SENIOR_AGE} or older already gets ({money(ADDITIONAL_STD_2026.value.unmarried)} if single,{" "}
          {money(ADDITIONAL_STD_2026.value.married)} per married person in 2026). It lowers taxable income, not the
          “provisional income” that decides how much of your Social Security is taxed — the{" "}
          <Link href={`/taxable-social-security-calculator${p.age65Year <= ref ? "?age65=1" : ""}`}>taxable Social Security calculator</Link> handles both.
        </p>
      ) : null}

      {colasStarted ? (
        <>
          <h2>How much have cost-of-living raises added since I turned {AGE_EARLY}?</h2>
          {p.colas.rows.length === 1 ? (
            <p className="answer">
              {pct1(p.colas.cumulative)} so far, from the one cost-of-living adjustment (COLA) effective December {p.colas.firstEffective} — the year you{" "}
              {p.colas.firstEffective < ref ? "turned" : "turn"} {AGE_EARLY} — first paid in January {p.colas.latest + 1}. It applies to your full benefit amount even
              if you haven’t claimed, and every later COLA will too.
            </p>
          ) : (
            <p className="answer">
              About {pct1(p.colas.cumulative)} in total, from {p.colas.raises} cost-of-living adjustments (COLAs): every one from December{" "}
              {p.colas.firstEffective} — the year you turned {AGE_EARLY} — through the {p.colas.rows[p.colas.rows.length - 1].pct}% raise paid from January{" "}
              {p.colas.latest + 1}
              {noColaYears > 0 ? `, with ${noColaYears === 1 ? "one year" : `${noColaYears} years`} of no COLA at all` : ""}. They apply to your full benefit amount
              even if you haven’t claimed yet.
            </p>
          )}
          <ColaGrid rows={p.colas.rows} />
          <p>
            That’s the compounded total; Social Security rounds your benefit down to the dime after each raise, so your actual figure can be a few cents lower.
            {jan1Cola !== undefined && jan1Cola > 0 ? (
              <>
                {" "}
                Born January 1, {y}? You reached {AGE_EARLY} on December 31, {p.colas.firstEffective - 1}, so the {jan1Cola}% COLA effective that December counts for
                you too.
              </>
            ) : jan1Cola === 0 ? (
              <>
                {" "}
                Born January 1, {y}? You reached {AGE_EARLY} on December 31, {p.colas.firstEffective - 1}, but there was no COLA that December, so your total is the
                same.
              </>
            ) : null}
          </p>
        </>
      ) : (
        <>
          <h2>When will cost-of-living raises start counting for me?</h2>
          <p className="answer">
            Your first cost-of-living adjustment (COLA) will be the one effective December {p.colas.firstEffective}, the year you turn {AGE_EARLY}, first paid in
            January {p.colas.firstEffective + 1}. From then on every raise applies to your full benefit amount, whether or not you have claimed. Until then, your
            future benefit grows with national wages instead.
          </p>
        </>
      )}

      <h2>How long should I plan for my money to last?</h2>
      <p className="answer">
        Social Security’s actuaries project that a man born in {y} who reaches {MEDICARE_AGE} lives another {life.male.e65.toFixed(1)} years on average, and a woman{" "}
        {life.female.e65.toFixed(1)}. Averages hide a long tail: {pct1(life.female.p90from65)} of women and {pct1(life.male.p90from65)} of men who reach{" "}
        {MEDICARE_AGE} live to {target90}.
      </p>
      <LifeTable life={life} p={p} />
      <p>
        These come from SSA’s cohort life tables (2026 Trustees Report), which build in the improvement in death rates expected over your lifetime. Most websites
        quote the {PERIOD_LIFE_TABLE_YEAR} period table instead, which freezes death rates at {PERIOD_LIFE_TABLE_YEAR} levels
        {periodGap >= 0.1 ? (
          <>
            {" "}
            and runs about {periodGap.toFixed(1) === "1.0" ? "1 year" : `${periodGap.toFixed(1)} years`} shorter at {MEDICARE_AGE} for men born in {y}
          </>
        ) : null}
        . Our advice: plan to at least {target90}. Running out of money in your late
        80s is a far worse outcome than leaving some behind, and that’s the real case for a bigger, inflation-protected Social Security check.
      </p>

      <h2>What is my survivor full retirement age?</h2>
      <p className="answer">
        If you’re widowed, your survivor full retirement age is <strong>{p.survivorFra.label}</strong> — {survivorSame ? "the same as" : "not the same as"} your own
        full retirement age of {p.fra.label}. Survivor benefits can start at {SURVIVOR_AGE} at {pct1(p.survivorPctAt60)} of what the deceased was entitled to, and
        reach 100% at {p.survivorFra.label}.
      </p>
      <p>
        {survivorSame
          ? "The survivor schedule runs two birth years behind the retirement schedule; for your birth year the two happen to line up."
          : "The survivor schedule runs two birth years behind the retirement schedule, which is why the two ages differ for you."}{" "}
        A widow or widower can take one benefit early and switch to the other later — for example survivor benefits first and your own, larger benefit at{" "}
        {AGE_DRC_STOP}. The full survivor table is on our <Link href="/full-retirement-age#survivor-fra">full retirement age chart</Link>.
      </p>
      {y === deemedYear - 1 || y === deemedYear ? (
        <p>
          {y === deemedYear - 1 ? (
            <>
              <strong>One more {y} quirk:</strong> people born on or before January 1, {deemedYear} were the last who could file a “restricted application” for
              spousal benefits only at full retirement age while letting their own benefit grow. Everyone born January 2, {deemedYear} or later is “deemed” to apply
              for both at once.
            </>
          ) : (
            <>
              <strong>One more {y} quirk:</strong> if you were born on January 2, {y} or later, filing for your own benefit or a spouse’s benefit counts as filing for
              both, at any age. The old “restricted application” strategy ended with people born on January 1, {y}.
            </>
          )}
        </p>
      ) : null}

      <h2>What should people born in {y} do now?</h2>
      {phase === "past70" ? (
        <>
          <p className="answer">
            If you haven’t claimed Social Security, file now — you’ve earned every delayed credit there is, and SSA pays at most {RETROACTIVITY.value.months} months of
            back benefits. Otherwise the work left is on the tax side: RMDs on time, charitable giving through QCDs, and keeping an eye on IRMAA.
          </p>
          <ul>
            <li>
              {rmdStarted ? (
                <>Check that your RMD for {ref} is out by December 31</>
              ) : rmdFirstYear === ref ? (
                <>
                  Your first RMD is for {ref}: take it by December 31, or by April 1, {ref + 1} at the latest (then two are due in {ref + 1})
                </>
              ) : (
                <>
                  No RMD is due for {ref}: your first is for {rmdFirstYear}, due by April 1, {rmdFirstYear + 1}
                </>
              )}{" "}
              — a missed one costs an excise tax of {pct1(RMD_EXCISE.value.rate)} of the shortfall ({pct1(RMD_EXCISE.value.correctedRate)} if you fix it promptly).
            </li>
            <li>Review federal tax withholding on your Social Security and IRA withdrawals once a year.</li>
            <li>Make sure your beneficiary designations are current; they override your will.</li>
          </ul>
        </>
      ) : phase === "turning70" ? (
        <>
          <p className="answer">
            If you’ve been waiting, claim for the month you turn {AGE_DRC_STOP} this year — there is nothing more to gain after it, and SSA pays at most{" "}
            {RETROACTIVITY.value.months} months of back benefits if you file late.
          </p>
          <ul>
            <li>Your first RMD is for {p.rmd[0].firstYear}; plan whether to take it that year or by the April deadline (and pay two in one year).</li>
            <li>A bigger Social Security check plus RMDs can raise the share of benefits that’s taxed — run the numbers before year-end.</li>
          </ul>
        </>
      ) : phase === "fraTo70" ? (
        <>
          <p className="answer">
            Each month you wait still adds {pct3(drcPerMonth(y))}, or {drcPerYearLabel(y)} a year, until {AGE_DRC_STOP} in {p.age70Year}. If you’re healthy, have
            other money to live on, and especially if you’re the higher earner in a marriage, waiting is usually the best deal left in retirement.
          </p>
          <ul>
            <li>Claim now if your health is poor or you need the income — waiting only pays if you live past the break-even age.</li>
            <li>Delayed credits earned during the year you claim are added the following January, so don’t panic if the first check looks a bit low.</li>
          </ul>
        </>
      ) : phase === "reachingFra" ? (
        <>
          <p className="answer">
            Your full retirement age falls in {fraWhen(p)}. If you’re still working, that’s when the earnings test disappears — a natural moment to claim if you
            need the income. If you don’t, each month you wait after it adds {pct3(drcPerMonth(y))} until {AGE_DRC_STOP}.
          </p>
          <ul>
            <li>
              Already on Medicare? Check your {ref + 1} Part B premium on the notice Social Security mails late in {ref}; any IRMAA surcharge is based on your{" "}
              {ref - 1} tax return.
            </li>
            <li>Married? Decide claiming ages together: the higher earner’s choice sets the survivor’s benefit.</li>
          </ul>
        </>
      ) : phase === "62toFra" ? (
        <>
          <p className="answer">
            You can claim in {ref}, but starting at {claimNow ? claimNow.label : AGE_EARLY} pays only{" "}
            {pct1(claimNow ? claimNow.pct : p.pctFirstPossibleMonth)} of your full benefit, for life
            {claimNextYear.length ? (
              <>
                {" "}
                (born in {monthSpan(claimNextYear.map((r) => r.month))} after the 2nd? Your first possible month is {monthLabel(claimNextYear[0].earliestClaim)})
              </>
            ) : null}
            . Unless your health is poor or you’ve run out of other money,
            waiting at least to {p.fra.label} — ideally {AGE_DRC_STOP} if you’re the higher earner — is usually worth it.
          </p>
          <ul>
            <li>
              Sign up for Medicare at {MEDICARE_AGE} ({p.age65Year}) even if you wait on Social Security
              {p.age65Year >= ref ? " — enrollment is not automatic until you collect benefits" : ""}.
            </li>
            <li>Low-income years before RMDs at {rmdAgeLabel(p.rmd[0].age)} are a good window for Roth conversions.</li>
          </ul>
        </>
      ) : (
        <>
          <p className="answer">
            Check your earnings record now with a my Social Security account — mistakes are much easier to fix before you claim. Then plan around three dates: {AGE_EARLY}{" "}
            in {p.age62Year}, Medicare at {MEDICARE_AGE} in {p.age65Year}, and full retirement age in {fraWhen(p)}.
          </p>
          <ul>
            <li>Married? The higher earner’s claiming age sets the survivor’s benefit — plan it as a couple.</li>
            <li>Your RMDs won’t start until {p.rmd[0].firstYear}; the years between retiring and then are prime time for Roth conversions.</li>
          </ul>
        </>
      )}
    </>
  );
}
