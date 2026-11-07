import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { EarningsTestCalculator, type LifeExpectancy } from "@/components/calculators/earnings-test/EarningsTestCalculator";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { money, pct } from "@/lib/format";
import { SRC } from "@/data/params/sources";
import { SS_YEAR, RET_HISTORY } from "@/data/params/social-security";
import { DIVORCED_SPOUSE_RET, RET_EXAMPLES, RET_RATIO, RET_SRC, SUBSTANTIAL_SERVICES, WITHDRAWAL } from "@/data/params/earnings-test-extra";
import { PERIOD_LIFE_TABLE, PERIOD_LIFE_TABLE_YEAR } from "@/data/generated/period-life-table";
import { computeEarningsTest, RET_YEARS } from "@/lib/calc/earnings-test";
import { earlyRetirementFactor } from "@/lib/calc/ss-core";
import { EXAMPLE, ageLabel, monthLabel, monthSpan, monthsList } from "@/components/calculators/earnings-test/helpers";

const SLUG = "social-security-earnings-limit-calculator";
const TITLE = "Social Security Earnings Limit Calculator 2026 & 2027";
const DESC =
  "See how much Social Security withholds if you work before full retirement age in 2026 or 2027, which months are held back, and when you get the money back.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

// Every figure below is computed at build time from the cited parameters (no clock reads, fully static).
const Y27 = SS_YEAR[2027].value;
const Y26 = SS_YEAR[2026].value;
const R2 = RET_RATIO.underFra.value;
const R3 = RET_RATIO.fraYear.value;

/** The calculator's starting example, run through the same engine. */
const EX = computeEarningsTest({ dob: EXAMPLE.dob, year: EXAMPLE.year, monthlyBenefit: EXAMPLE.ben, annualEarnings: EXAMPLE.earn, benefitStart: EXAMPLE.start });
const EX_WITHHELD = EX.months.filter((m) => m.status === "withheld").map((m) => m.month);
const EX_PARTIAL = EX.partialMonth ? EX.months[EX.partialMonth - 1] : null;
const EX_LE = PERIOD_LIFE_TABLE.find((r) => r[0] === EX.fra.years);

/** SSA's and POMS's own worked examples. */
const SSA26 = RET_EXAMPLES.ssa2026UnderFra.value;
const SSA26F = RET_EXAMPLES.ssa2026FraYear.value;
const POMS = RET_EXAMPLES.pomsWholeMonth.value;
const POMS_LEFT = POMS.excess - POMS.fullMonthsWithheld * POMS.monthlyBenefit;
const FAM = RET_EXAMPLES.pomsFamily.value;
const FAM_TOTAL = FAM.worker + FAM.auxiliaries.reduce((a, b) => a + b, 0);
const ARF = RET_EXAMPLES.arf.value;
const ARF_BEFORE = earlyRetirementFactor(ARF.reductionMonthsAtClaim);
const ARF_AFTER = earlyRetirementFactor(ARF.reductionMonthsAfter);
const HOURS = SUBSTANTIAL_SERVICES.value;
/** Life expectancy at the possible full retirement ages (65–67), for the calculator's payback context. */
const LIFE_EXPECTANCY: LifeExpectancy = {
  year: PERIOD_LIFE_TABLE_YEAR,
  byAge: Object.fromEntries(PERIOD_LIFE_TABLE.filter((r) => r[0] >= 65 && r[0] <= 67).map((r) => [r[0], { male: r[3], female: r[6] }])),
};
const HISTORY_YEARS = Object.keys(RET_HISTORY)
  .map(Number)
  .filter((y) => y >= 2022 && y < 2026)
  .sort((a, b) => b - a);

const FAQ: FaqItem[] = [
  {
    q: "How much can I earn in 2027 and still collect Social Security?",
    a: `Any amount — but if you are under full retirement age all year, Social Security withholds $1 of benefits for every $${R2} you earn above ${money(Y27.retUnderFraAnnual)}. In the year you reach full retirement age the limit is ${money(Y27.retFraYearAnnual)} and SSA withholds $1 for every $${R3} over it, counting only earnings before the month you reach that age.`,
  },
  {
    q: "Does the earnings limit apply after full retirement age?",
    a: "No. Starting with the month you reach full retirement age, you can earn any amount and SSA will not withhold a dollar. In the calendar year you reach it, only the earnings from January through the month before count, against the higher limit. After that year there is no test at all.",
  },
  {
    q: "Do IRA withdrawals, pensions or investment income count toward the limit?",
    a: "No. Only wages from a job and net profit from self-employment count. Pensions, annuities, IRA and 401(k) withdrawals, interest, dividends and other investment income, veterans benefits, and government or military retirement pay are all ignored by the earnings test — though they may still make your benefits taxable.",
  },
  {
    q: "Do I get the withheld Social Security back?",
    a: "Yes, in a different form. When you reach full retirement age, SSA recalculates your benefit as if you had not claimed in the months it withheld, so your monthly check goes up for the rest of your life. Whether you fully recover the money depends on how long you live after that age.",
  },
  {
    q: "Is the earnings limit based on gross or net income?",
    a: "Wages count at their gross amount, before income tax and payroll tax are taken out, including bonuses, commissions and vacation pay. For self-employment, SSA uses net earnings — your profit after business expenses. If you have both, add them together; a self-employment loss reduces the total.",
  },
  {
    q: "Does my spouse's income affect my earnings limit?",
    a: `No. The test looks only at your own earnings and your own benefit. It works the other way, though: if you earn over the limit, SSA also holds back benefits your spouse or children receive on your record. An ex-spouse is not affected if you have been divorced at least ${DIVORCED_SPOUSE_RET.value.divorceYears} years or were already collecting before the divorce.`,
  },
  {
    q: "Can I earn over the limit in the year I retire and still get checks?",
    a: `Usually yes. In your first year with a "retired" month, SSA applies a monthly test: you get a full check for every month your wages are at or below the monthly limit (${money(Y27.retUnderFraMonthly)} in 2027, or ${money(Y27.retFraYearMonthly)} in the year you reach full retirement age) and you are not working substantially in your own business, no matter what you earned earlier that year.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "Social Security Earnings Test Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "Earnings Limit Calculator", path: `/${SLUG}` }]}
        eyebrow="Social Security"
        icon="work"
        title={
          <>
            Social Security earnings limit calculator for <span className="italic font-normal text-sun-ink">2026 and 2027</span>
          </>
        }
        lead={
          <p>
            Under full retirement age and still working? In 2027 Social Security holds back $1 for every ${R2} you earn above {money(Y27.retUnderFraAnnual)} — then
            pays it back as a bigger check once you reach full retirement age. Enter your numbers to see the exact amount, which months are withheld, and when you
            break even.
          </p>
        }
        chips={<StatusChip status={SS_YEAR[2027].status}>2026 & 2027 SSA limits</StatusChip>}
      />

      <EarningsTestCalculator lifeExpectancy={LIFE_EXPECTANCY} />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What is the Social Security earnings limit for 2027?</h2>
          <p className="answer">
            In 2027 you can earn {money(Y27.retUnderFraAnnual)} before Social Security withholds anything if you are under full retirement age (FRA) all year; above
            that, it keeps $1 of every ${R2}. In the year you reach FRA, the limit is {money(Y27.retFraYearAnnual)} and it keeps $1 of every ${R3}.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Under FRA all year</th>
                  <th>Year you reach FRA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {RET_YEARS.map((y) => {
                  const v = SS_YEAR[y].value;
                  return (
                    <tr key={y} className={y === 2027 ? "is-hit" : undefined}>
                      <td className="strong">{y}</td>
                      <td>
                        {money(v.retUnderFraAnnual)} a year ({money(v.retUnderFraMonthly)}/mo)
                        <br />
                        $1 withheld per ${R2} over
                      </td>
                      <td>
                        {money(v.retFraYearAnnual)} a year ({money(v.retFraYearMonthly)}/mo)
                        <br />
                        $1 withheld per ${R3} over
                      </td>
                      <td>
                        <StatusChip status={SS_YEAR[y].status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            The monthly figures matter only in your first year of retirement (more below). The limits usually rise each year with the national average wage index; 2027’s lower limit is{" "}
            {money(Y27.retUnderFraAnnual - Y26.retUnderFraAnnual)} higher than 2026’s. Earlier years:{" "}
            {HISTORY_YEARS.map((y) => `${y}: ${money(RET_HISTORY[y].under)}`).join(" · ")}.
          </p>

          <h2>How does the Social Security earnings test work?</h2>
          <p className="answer">
            SSA adds up your wages and self-employment profit for the year, subtracts the limit, and divides what’s left by {R2} (or by {R3} in your FRA year). That
            result is withheld from your checks — whole checks, starting in January — until it is covered.
          </p>
          <p>
            SSA’s own 2026 example: a benefit of {money(SSA26.monthlyBenefit)} a month and {money(SSA26.earnings)} of earnings. That’s {money(SSA26.overLimit)} over the{" "}
            {money(Y26.retUnderFraAnnual)} limit, so {money(SSA26.withheld)} is withheld and {money(SSA26.received)} of the year’s {money(SSA26.monthlyBenefit * 12)} still
            arrives.
          </p>
          <p>
            Our calculator’s starting example works the same way for 2027: {money(EXAMPLE.earn)} earned on a {money(EXAMPLE.ben)} benefit is{" "}
            {money(EX.countedEarnings - EX.exempt.annual)} over, so {money(EX.excess)} is withheld — the {monthsList(EX_WITHHELD)} checks in full
            {EX_PARTIAL ? `, plus the ${monthSpan(EX_PARTIAL.month, EX_PARTIAL.month)} check, of which ${money(EX_PARTIAL.paidLater)} comes back later` : ""}.
          </p>

          <h2>Which months does Social Security hold back?</h2>
          <p className="answer">
            SSA normally doesn’t trim each check a little. It stops whole checks from January (or your first month of benefits) until the excess is covered, then pays
            back whatever it over-withheld after the year ends, once your final earnings are known.
          </p>
          <p>
            In SSA’s operations manual (POMS), a {money(POMS.monthlyBenefit)} benefit with {money(POMS.excess)} of excess earnings loses the checks for{" "}
            {monthSpan(1, POMS.fullMonthsWithheld)} in full. Only {money(POMS_LEFT)} is still owed for {monthSpan(POMS.fullMonthsWithheld + 1, POMS.fullMonthsWithheld + 1)},
            but that whole check is held too, and the {money(POMS.monthlyBenefit - POMS_LEFT)} difference is paid later. Plan your budget around the empty months at
            the start of the year — that’s where the pain is.
          </p>

          <h2>Do you lose the money Social Security withholds?</h2>
          <p className="answer">
            No — this is the biggest myth about working while collecting Social Security. At full retirement age SSA recalculates your benefit as if you had not
            claimed in the months it withheld, so your check is permanently higher from then on.
          </p>
          <p>
            The rule (20 CFR 404.412, applied in SSA’s POMS RS 00615.482) counts every month with a check withheld, even partly, as a month you didn’t claim. The official illustration: someone with an FRA
            of {ARF.fraYears} who claimed at {ARF.fraYears - ARF.reductionMonthsAtClaim / 12} starts with {ARF.reductionMonthsAtClaim} months of reduction, or {pct(ARF_BEFORE, 2)} of the full benefit. If{" "}
            {ARF.creditingMonths} months were withheld before FRA, the benefit is refigured with {ARF.reductionMonthsAfter} months — {pct(ARF_AFTER, 2)} of the full
            benefit, for life.
          </p>
          {EX.arf && EX.breakEven ? (
            <p>
              In our 2027 example, {EX.creditingMonths} withheld months lift the check from {money(EXAMPLE.ben)} to {money(EX.arf.benefitAfter)} at full retirement age
              ({monthLabel(EX.fraMonth)}). The extra {money(EX.arf.increase)} a month repays the {money(EX.totalWithheld)} by about age {ageLabel(EX.breakEven.ageMonths)}
              {EX_LE ? (
                <>
                  . SSA’s {PERIOD_LIFE_TABLE_YEAR} life table expects a {EX.fra.years}-year-old man to live about {EX_LE[3].toFixed(1)} more years and a woman about{" "}
                  {EX_LE[6].toFixed(1)}
                </>
              ) : null}
              .
            </p>
          ) : null}
          <p>
            Our honest take: treat withholding as a delayed payment, not a tax. It roughly evens out if you live into your 80s, comes out ahead if you live longer, and
            costs you if you don’t. The real damage is to cash flow — several months with no check at all.
          </p>

          <h2>What counts as earnings — and what doesn’t?</h2>
          <p className="answer">
            Only pay for work counts: gross wages from a job and net profit from self-employment. Money from savings, pensions and investments never counts, no matter
            how large — so a big IRA withdrawal or a pension check can’t cost you a single Social Security check under this test.
          </p>
          <ul>
            <li>
              <strong>Counts:</strong> wages before taxes, including bonuses, commissions and vacation pay; net self-employment earnings (minus any self-employment loss).
            </li>
            <li>
              <strong>Doesn’t count:</strong> pensions, annuities, IRA and 401(k) withdrawals (including required minimum distributions), interest, dividends and
              other investment income, veterans benefits, and government or military retirement pay.
            </li>
          </ul>
          <p>
            A common mistake is cutting back on IRA withdrawals to “stay under the limit.” They don’t matter here — although they can make more of your benefit{" "}
            <Link href="/taxable-social-security-calculator">taxable</Link>.
          </p>

          <h2>What is the first-year “grace year” rule?</h2>
          <p className="answer">
            In your first year with a retired month, SSA pays a full check for every month you are retired, whatever you earned in the rest of the year. That protects people
            who retire mid-year after a full salary, who would otherwise lose most of their first year’s checks to the annual test.
          </p>
          <p>
            A month counts as retired if your wages are at or below the monthly limit — {money(Y27.retUnderFraMonthly)} in 2027 ({money(Y27.retFraYearMonthly)} in the
            year you reach FRA) — and you don’t perform substantial services in your own business. Under {HOURS.neverBelowHours} hours a month is never substantial;
            over {HOURS.generallyAboveHours} usually is; in between depends on how skilled the work is. You get the grace year once, and you can’t pick which year it is.
          </p>

          <h2>What changes in the year you reach full retirement age?</h2>
          <p className="answer">
            The limit jumps to {money(Y27.retFraYearAnnual)} in 2027, SSA withholds only $1 of every ${R3} above it, and only earnings before the month you reach FRA
            count. From that month on there is no limit, so many people lose little or nothing in their FRA year.
          </p>
          <p>
            SSA’s 2026 example: someone reaching FRA in {monthSpan(SSA26F.fraMonth, SSA26F.fraMonth)} earns {money(SSA26F.earningsBeforeFra)} from January through{" "}
            {monthSpan(SSA26F.fraMonth - 1, SSA26F.fraMonth - 1)} — {money(SSA26F.overLimit)} over the {money(Y26.retFraYearAnnual)} limit. Just {money(SSA26F.withheld)}{" "}
            is withheld. If you only know your yearly pay, the calculator spreads it evenly and counts the months before FRA.
          </p>

          <h2>Does working affect my spouse’s benefits?</h2>
          <p className="answer">
            Yes, if your spouse or children collect on your record: your excess earnings are taken from the whole family’s checks, in the same months, so household
            income drops faster than yours alone. Their own earnings, though, only affect their own benefit — never yours.
          </p>
          <p>
            POMS shows a worker getting {money(FAM.worker)} plus a spouse and child at {FAM.auxiliaries.map((a) => money(a)).join(" and ")}: {money(FAM_TOTAL)} a month
            for the family. An excess of {money(FAM.excess)} stops all three checks for {monthSpan(1, FAM.monthsWithheld)}. An ex-spouse is not affected if you have
            been divorced at least {DIVORCED_SPOUSE_RET.value.divorceYears} years or were already collecting before the divorce.
          </p>

          <h2>Should you claim early if you are still working?</h2>
          <p className="answer">
            If you expect to earn well above the limit, usually not. Most of the benefit would be withheld anyway, and simply waiting gives you a larger, cleaner check
            without the paperwork, the empty months and the risk of surprise overpayment notices.
          </p>
          <ul>
            <li>
              <strong>Already claimed and earning a lot?</strong> Within {WITHDRAWAL.value.windowMonths} months of your first month of benefits, you can withdraw your
              application, repay what you received (including anything paid to family members on your record, who must agree in writing), and claim later as if you
              never had. It’s a one-time option.
            </li>
            <li>
              <strong>Just over the limit?</strong> Don’t turn down work to stay under it. SSA keeps at most $1 of every ${R2} above the limit, so extra work always
              leaves you with more money — and the withheld part comes back at FRA.
            </li>
            <li>
              <strong>Always:</strong> give SSA an honest earnings estimate, and update it when your plans change. Then run the{" "}
              <Link href="/social-security-break-even-calculator">break-even calculator</Link> to see whether claiming early still pays.
            </li>
          </ul>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.ssaWhileWorking,
            SRC.ssaRet,
            SRC.ssaCola2027,
            SRC.ssaCola2026,
            RET_SRC.pomsEt,
            RET_SRC.pomsExcess,
            RET_SRC.pomsCharging,
            RET_SRC.pomsSuspensions,
            RET_SRC.pomsMet,
            RET_SRC.pomsSubstantial,
            RET_SRC.pomsCrediting,
            RET_SRC.ecfrArf,
            RET_SRC.ecfrWithdrawal,
            RET_SRC.pomsDivorced,
            SRC.ssaPeriodLife,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
