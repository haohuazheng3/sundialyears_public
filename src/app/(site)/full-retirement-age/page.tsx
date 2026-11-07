import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { FraFinder } from "@/components/reference/birth-year/FraFinder";
import { ClaimingTable, FraChartTable, SurvivorTable } from "@/components/reference/birth-year/Tables";
import { fraFaq } from "@/components/reference/birth-year/content";
import { AGE_DRC_STOP, AGE_EARLY, fractionOfOnePct, monthLabel, pct1, pctOfPiaAtAge, drcPerYearLabel } from "@/components/reference/birth-year/timeline";
import { calculatorLd, datasetLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { MONTHS, money } from "@/lib/format";
import { earliestRetirementMonth, fraForCohort, fraMonth, survivorFactor, survivorFraForCohort } from "@/lib/calc/ss-core";
import { SRC } from "@/data/params/sources";
import { CLAIMING_RULES, SS_YEAR } from "@/data/params/social-security";
import { SS_INCLUSION } from "@/data/params/ss-tax-extra";
import { BY_SRC, EARLY_REDUCTION, EARNINGS_TEST_RATIO, MEDICARE_ENROLLMENT, SS_AGES } from "@/data/params/birth-year-extra";

const SLUG = "full-retirement-age";
const F54 = fraForCohort(1954).label;
const F60 = fraForCohort(1960).label;
const TITLE = "Full Retirement Age Chart: Social Security Age by Birth Year";
const DESC = `Social Security full retirement age by birth year: ${F54} for 1943–1954, rising to ${F60} for 1960 or later. Your exact month, benefit at ${AGE_EARLY}–${AGE_DRC_STOP} and survivor ages.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const REF = SITE.copyrightYear;
const dob = (year: number, month: number, day: number) => ({ year, month, day });

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  const survivor60 = survivorFraForCohort(1960);
  const survivorPct60 = survivorFactor(survivor60.total - SS_AGES.value.earliestSurvivor * 12, survivor60);
  const { beforeFraYear, fraYear } = EARNINGS_TEST_RATIO.value;
  const et = (SS_YEAR[REF as keyof typeof SS_YEAR] as (typeof SS_YEAR)[keyof typeof SS_YEAR] | undefined)?.value;
  const etNext = SS_YEAR[(REF + 1) as keyof typeof SS_YEAR] as (typeof SS_YEAR)[keyof typeof SS_YEAR] | undefined;
  const examples = [
    { d: dob(1960, 1, 1), note: "counted with 1959" },
    { d: dob(1960, 3, 1), note: "treated as born in February" },
    { d: dob(1960, 3, 2), note: "62 for the whole birthday month" },
    { d: dob(1960, 3, 15), note: "the usual case" },
  ];
  const sources = [
    SRC.ssaFra,
    BY_SRC.ssaNra,
    BY_SRC.ecfrFra,
    BY_SRC.pomsAgeAttainment,
    BY_SRC.pomsFirstMonth,
    SRC.ssaArDrc,
    SRC.ssaAgeReduction,
    SRC.ssaDelayedCredits,
    BY_SRC.pomsSurvivorReduction,
    SRC.ssaSurvivor,
    SRC.ssaRet,
    BY_SRC.ecfrMedicareIep,
  ];

  return (
    <>
      <JsonLd
        data={[
          calculatorLd({ name: "Full Retirement Age Finder", description: DESC, path: `/${SLUG}` }),
          datasetLd({
            name: "Social Security full retirement age by year of birth",
            description: "Full retirement age, benefit at 62 and 70, delayed retirement credit and survivor full retirement age by year of birth (20 CFR 404.409).",
            path: `/${SLUG}`,
            dateModified: SITE.dataVerifiedOn,
            sources: [SRC.ssaFra.url, BY_SRC.ecfrFra.url, SRC.ssaArDrc.url],
          }),
        ]}
      />
      <ToolHero
        crumbs={[{ name: "Full Retirement Age Chart", path: `/${SLUG}` }]}
        eyebrow="Social Security"
        icon="calendar"
        title={
          <>
            Full retirement age chart <span className="italic font-normal text-sun-ink">by birth year</span>
          </>
        }
        lead={
          <p>
            Your full retirement age is <strong>{F60}</strong> if you were born in 1960 or later and <strong>{F54}</strong> if you were born from 1943 through 1954;
            1955–1959 fall in between, two months per year. Born on January 1? Use the year before. Enter your birth date for your exact month.
          </p>
        }
        chips={<StatusChip status="official">20 CFR 404.409 · SSA tables</StatusChip>}
      />

      <FraFinder />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What is my full retirement age?</h2>
          <p className="answer">
            It depends only on the year you were born: {F54} for 1943 through 1954, then two months more for each year until it reaches {F60} for everyone born in
            1960 or later. Find your year in the chart; if you were born on January 1, read the row for the year before.
          </p>
          <FraChartTable />
          <p>
            “Months early at {AGE_EARLY}” counts from the month you turn {AGE_EARLY} to your full retirement age — that is what sets the early-claiming cut. The last
            two columns show what you’d get as a share of your full benefit if you started at exactly {AGE_EARLY} or waited until {AGE_DRC_STOP}. Tap a year for every
            date that matters to people born then, from Medicare to required minimum distributions.
          </p>

          <h2>Is the full retirement age for 1960 really {F60}?</h2>
          <p className="answer">
            Yes. 1960 is the first birth year with a full retirement age of {F60}, reached in {1960 + fraForCohort(1960).years} in the month of your {F60}th
            birthday. The one exception is a January 1, 1960 birthday: Social Security groups you with 1959, so your full retirement age is{" "}
            {fraForCohort(1959).label}, reached in {monthLabel(fraMonth(dob(1960, 1, 1)))}.
          </p>
          <p>
            For the 1960 group, {F60} means claiming at {AGE_EARLY} pays {pct1(pctOfPiaAtAge(1960, AGE_EARLY))} of the full benefit for life, while waiting until{" "}
            {AGE_DRC_STOP} pays {pct1(pctOfPiaAtAge(1960, AGE_DRC_STOP))}. That’s a {pct1(pctOfPiaAtAge(1960, AGE_DRC_STOP) / pctOfPiaAtAge(1960, AGE_EARLY) - 1)}{" "}
            larger check for the same work record. See <Link href="/social-security-by-birth-year/1960">every 1960 date</Link>, including when RMDs start (also a new
            age for your year).
          </p>

          <h2>Why do January 1 and 1st-of-the-month birthdays count differently?</h2>
          <p className="answer">
            Social Security says you reach an age on the day before your birthday. A January 1 birthday therefore belongs to the previous birth year, and a birthday
            on the 1st of any month is treated as falling in the month before — so every milestone arrives a month early.
          </p>
          <p>Four people born in early 1960 show how much the exact day matters:</p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-2 min-w-[36rem] text-[1rem]">
              <caption className="sr-only">Examples: how the birth day changes the full retirement age month and the first month you can claim</caption>
              <thead>
                <tr>
                  <th scope="col">Born</th>
                  <th scope="col">Full retirement age</th>
                  <th scope="col">Reached in</th>
                  <th scope="col">First month you can claim</th>
                </tr>
              </thead>
              <tbody>
                {examples.map(({ d, note }) => (
                  <tr key={`${d.month}-${d.day}`}>
                    <td className="strong">
                      {MONTHS[d.month - 1]} {d.day}, {d.year}
                      <span className="block text-[0.9rem] font-normal text-ink-3">{note}</span>
                    </td>
                    <td>{fraForCohort(d.month === 1 && d.day === 1 ? d.year - 1 : d.year).label}</td>
                    <td className="strong">{monthLabel(fraMonth(d))}</td>
                    <td>{monthLabel(earliestRetirementMonth(d))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Compare the last two rows: someone born on the 2nd is {AGE_EARLY} for every day of the birthday month, so they can start right away, while someone born on
            the 15th has to wait until the following month. And the March 1 birthday reaches full retirement age a month early, in February. A month either way makes a
            small but permanent difference in the check.
          </p>

          <h2>
            How much do I get at each claiming age, {AGE_EARLY} to {AGE_DRC_STOP}?
          </h2>
          <p className="answer">
            Claiming before full retirement age cuts your benefit by {fractionOfOnePct(CLAIMING_RULES.earlyFirst36PerMonth)} a month for the first{" "}
            {EARLY_REDUCTION.value.firstTierMonths} months and {fractionOfOnePct(CLAIMING_RULES.earlyBeyond36PerMonth)} after that. Waiting past it adds{" "}
            {drcPerYearLabel(1960)} a year (for anyone born January 2, 1943 or later) until {AGE_DRC_STOP}. The table shows the result at each birthday.
          </p>
          <ClaimingTable />
          <p>
            These percentages match Social Security’s own table. Each column assumes benefits start in the month you reach that age; because you must be{" "}
            {AGE_EARLY} for a whole month, most people’s earliest start is really {AGE_EARLY} and 1 month, a fraction of a percent higher than the {AGE_EARLY} column.
            Spousal benefits are cut more steeply for early claiming and earn no delayed credits.
          </p>

          <h2 id="survivor-fra">What is the survivor full retirement age?</h2>
          <p className="answer">
            Widows and widowers have their own schedule, running two birth years behind the retirement one: {survivor60.label} for a survivor born in 1960, and{" "}
            {survivorFraForCohort(1962).label} only from 1962. Survivor benefits can start at {SS_AGES.value.earliestSurvivor} at {pct1(survivorPct60)} of the
            deceased’s benefit.
          </p>
          <SurvivorTable />
          <p>
            Because survivor and retirement benefits are separate, a widow or widower can take one early and switch to the other later — for example survivor
            benefits from {SS_AGES.value.earliestSurvivor} and their own, larger benefit at {AGE_DRC_STOP}. The reduction is spread evenly over the months from{" "}
            {SS_AGES.value.earliestSurvivor} to the survivor full retirement age, so it always totals the same at {SS_AGES.value.earliestSurvivor}.
          </p>

          <h2>Should I claim at full retirement age?</h2>
          <p className="answer">
            Not automatically. Full retirement age is simply the point where the early-claiming cut ends; nothing special happens to your lifetime total there. The
            real choice is between taking a smaller check sooner and a larger one later.
          </p>
          <ul>
            <li>
              <strong>Claim early</strong> if your health is poor, you have no other money to live on, or you’re the lower earner in a couple and your spouse plans
              to delay.
            </li>
            <li>
              <strong>Claim at full retirement age</strong> if you’re still working and earning above the earnings-test limit — it stops applying that month.
            </li>
            <li>
              <strong>Wait until {AGE_DRC_STOP}</strong> if you’re healthy, can live on savings or work for now, and especially if you’re the higher earner: your
              larger check becomes your spouse’s survivor benefit.
            </li>
          </ul>
          <p>
            Our view: for most healthy people with some savings, waiting is the cheapest inflation-protected income you can buy. The{" "}
            <Link href="/social-security-break-even-calculator">break-even calculator</Link> shows the age at which waiting starts to pay off for your own numbers.
          </p>

          <h2>What else changes at full retirement age — and what doesn’t?</h2>
          <p className="answer">
            The earnings test ends, so you can work without any benefits being withheld. Medicare, required minimum distributions and the tax on your benefits do
            not follow your full retirement age at all.
          </p>
          <ul>
            <li>
              <strong>Earnings test:</strong> before the year you reach full retirement age, $1 is withheld for every ${beforeFraYear} you earn over a yearly limit
              {et ? <> ({money(et.retUnderFraAnnual)} in {REF})</> : null}; in that year, $1 for every ${fraYear} over a higher limit
              {et ? <> ({money(et.retFraYearAnnual)})</> : null}, counting only months before your full-retirement-age month.
              {etNext ? (
                <>
                  {" "}
                  For {REF + 1}: {money(etNext.value.retUnderFraAnnual)} and {money(etNext.value.retFraYearAnnual)} <StatusChip status={etNext.status} />.
                </>
              ) : null}{" "}
              <Link href="/social-security-earnings-limit-calculator">See what would be withheld</Link>.
            </li>
            <li>
              <strong>Medicare:</strong> eligibility is {MEDICARE_ENROLLMENT.value.eligibilityAge} for everyone. Sign up in the{" "}
              {MEDICARE_ENROLLMENT.value.iepMonths}-month window around your {MEDICARE_ENROLLMENT.value.eligibilityAge}th birthday even if you wait to claim Social
              Security.
            </li>
            <li>
              <strong>Required minimum distributions:</strong> set by your birth year under IRS rules, not by Social Security — see the{" "}
              <Link href="/rmd-calculator">RMD calculator</Link>.
            </li>
            <li>
              <strong>Taxes:</strong> up to {pct1(SS_INCLUSION.value.maxFraction)} of benefits can be taxable at any age, depending on your other income — check with the{" "}
              <Link href="/taxable-social-security-calculator">taxable Social Security calculator</Link>.
            </li>
          </ul>
        </ProseCard>

        <Faq items={fraFaq()} />
        <SourceList sources={sources} />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
