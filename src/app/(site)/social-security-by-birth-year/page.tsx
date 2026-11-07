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
import { YearGrid, yearHref } from "@/components/reference/birth-year/Navigation";
import { SummaryTable } from "@/components/reference/birth-year/Tables";
import { hubFaq, listYears } from "@/components/reference/birth-year/content";
import {
  AGE_DRC_STOP,
  AGE_EARLY,
  BIRTH_YEAR_FIRST,
  BIRTH_YEAR_LAST,
  monthLabel,
  pct1,
  pctOfPiaAtAge,
  rmdAgeLabel,
  seniorDeductionYears,
} from "@/components/reference/birth-year/timeline";
import { datasetLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { longDate, money } from "@/lib/format";
import { fraForCohort, fraMonth } from "@/lib/calc/ss-core";
import { rmdApplicableAge, firstRmdYear } from "@/lib/calc/rmd";
import { SRC } from "@/data/params/sources";
import { SENIOR_DEDUCTION } from "@/data/params/tax";
import { BY_SRC, DEEMED_FILING, MEDICARE_ENROLLMENT } from "@/data/params/birth-year-extra";

const SLUG = "social-security-by-birth-year";
const TITLE = `Social Security by Birth Year: Every Date, ${BIRTH_YEAR_FIRST} to ${BIRTH_YEAR_LAST}`;
const DESC = `Social Security, Medicare and RMD dates for every birth year from ${BIRTH_YEAR_FIRST} to ${BIRTH_YEAR_LAST}: full retirement age, earliest claim, Medicare at ${MEDICARE_ENROLLMENT.value.eligibilityAge} and your first RMD.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const REF = SITE.copyrightYear;
const mid = (year: number) => ({ year, month: 6, day: 15 });

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  const f54 = fraForCohort(1954).label;
  const f60 = fraForCohort(1960).label;
  const deemedYear = Number(DEEMED_FILING.value.dobCutoff.slice(0, 4));
  const sdYears = SENIOR_DEDUCTION.value.years;
  const turningPoints: { year: number; text: React.ReactNode }[] = [
    { year: 1943, text: <>First birth year with a full retirement age of {fraForCohort(1943).label} and the {pct1(pctOfPiaAtAge(1943, AGE_DRC_STOP) - 1)} maximum delayed bonus.</> },
    {
      year: 1949,
      text: (
        <>
          The RMD age splits at July 1: {rmdAgeLabel(rmdApplicableAge({ year: 1949, month: 6, day: 30 }))} if born before July 1, 1949,{" "}
          {rmdAgeLabel(rmdApplicableAge({ year: 1949, month: 7, day: 1 }))} if born on or after it.
        </>
      ),
    },
    { year: 1951, text: <>First birth year with an RMD age of {rmdApplicableAge(mid(1951))}.</> },
    {
      year: 1954,
      text: (
        <>
          Last birth year with a full retirement age of {f54}; from January 2, {deemedYear}, “deemed filing” ends restricted applications for spousal benefits.
        </>
      ),
    },
    { year: 1955, text: <>The phase-in starts: {fraForCohort(1955).label}, then two more months per birth year through 1959.</> },
    {
      year: 1959,
      text: (
        <>
          Full retirement age {fraForCohort(1959).label}, and the one birth year whose RMD age the law leaves unclear ({rmdApplicableAge(mid(1959))} under proposed IRS
          rules).
        </>
      ),
    },
    {
      year: 1960,
      text: (
        <>
          First birth year with a full retirement age of {f60} and an RMD age of {rmdApplicableAge(mid(1960))} (first RMD for {firstRmdYear(mid(1960))}).
        </>
      ),
    },
    {
      year: 1961,
      text: (
        <>
          Turns {MEDICARE_ENROLLMENT.value.eligibilityAge} in {1961 + MEDICARE_ENROLLMENT.value.eligibilityAge} and gets the {money(SENIOR_DEDUCTION.value.perPerson)}{" "}
          senior deduction for {listYears(seniorDeductionYears(1961).typical)} only. Later birth years get fewer years, and anyone born on or after{" "}
          {longDate(SENIOR_DEDUCTION.value.birthCutoff[sdYears[sdYears.length - 1] as keyof typeof SENIOR_DEDUCTION.value.birthCutoff])} gets none under current law.
        </>
      ),
    },
  ];

  return (
    <>
      <JsonLd
        data={datasetLd({
          name: `Social Security, Medicare and RMD milestones by birth year, ${BIRTH_YEAR_FIRST}–${BIRTH_YEAR_LAST}`,
          description: "Full retirement age, earliest claiming year, Medicare eligibility, age 70 and first required minimum distribution year for each birth year.",
          path: `/${SLUG}`,
          dateModified: SITE.dataVerifiedOn,
          sources: [SRC.ssaFra.url, BY_SRC.ecfrFra.url, BY_SRC.ecfrMedicareIep.url, SRC.ecfrRmdAge.url],
        })}
      />
      <ToolHero
        crumbs={[{ name: "Social Security by Birth Year", path: `/${SLUG}` }]}
        eyebrow="Social Security"
        icon="calendar"
        title={
          <>
            Social Security, Medicare &amp; RMD dates <span className="italic font-normal text-sun-ink">by birth year</span>
          </>
        }
        lead={
          <p>
            Pick your birth year to see every date that matters: your full retirement age, the first month you can claim, Medicare at{" "}
            {MEDICARE_ENROLLMENT.value.eligibilityAge}, when RMDs start, and your benefit at every age from {AGE_EARLY} to {AGE_DRC_STOP}. Born 1960 or later? Full
            retirement age {f60}, RMDs at {rmdApplicableAge(mid(1960))}.
          </p>
        }
        chips={<StatusChip status="official">SSA, CMS &amp; IRS rules</StatusChip>}
      />

      <ContentSection>
        <YearGrid refYear={REF} />
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What changes from one birth year to the next?</h2>
          <p className="answer">
            Your birth year sets your full retirement age ({f54} for 1943–1954, rising to {f60} for 1960 and later), the calendar years you turn {AGE_EARLY},{" "}
            {MEDICARE_ENROLLMENT.value.eligibilityAge} and {AGE_DRC_STOP}, and the age your required minimum distributions start. Here they are side by side.
          </p>
          <SummaryTable refYear={REF} />

          <h2>Which birth years sit at a turning point?</h2>
          <p className="answer">
            A handful of birth years mark the edges of a rule change — the first or last group under an old age, or the one year a rule treats unclearly. If yours
            is on this list, read its page closely: generic advice written for the year before or after may not fit.
          </p>
          <ul>
            {turningPoints.map((t) => (
              <li key={t.year}>
                <Link href={yearHref(t.year)}>
                  <strong>{t.year}</strong>
                </Link>
                : {t.text}
              </li>
            ))}
          </ul>

          <h2>Why do people born on January 1 use the previous year?</h2>
          <p className="answer">
            Social Security says you reach an age on the day before your birthday, so a January 1 birthday counts as December 31 of the year before. For full
            retirement age, delayed credits and survivor benefits you belong to the earlier birth year.
          </p>
          <p>
            Example: someone born January 1, 1960 has a full retirement age of {fraForCohort(1959).label} and reaches it in{" "}
            {monthLabel(fraMonth({ year: 1960, month: 1, day: 1 }))}; someone born a day later waits until {f60}, in{" "}
            {monthLabel(fraMonth({ year: 1960, month: 1, day: 2 }))}. The same rule makes anyone born on the 1st of a month reach every age one month early —
            including Medicare. The IRS applies it too, for the senior deduction.
          </p>

          <h2>How should I use these pages?</h2>
          <p className="answer">
            Use your birth-year page as a map of the dates, then run the calculators with your real birthday and benefit amount. The year pages assume a mid-month
            birthday; your exact day can move some dates by a month.
          </p>
          <ul>
            <li>
              Not sure of your exact full retirement age month? Use the <Link href="/full-retirement-age">full retirement age finder</Link>.
            </li>
            <li>
              Deciding when to claim? The <Link href="/social-security-break-even-calculator">break-even calculator</Link> compares {AGE_EARLY}, full retirement
              age and {AGE_DRC_STOP} in dollars.
            </li>
            <li>
              Married? Look up both birth years. The higher earner’s claiming age decides the survivor’s benefit, so it’s a joint decision.
            </li>
          </ul>
        </ProseCard>

        <Faq items={hubFaq()} />
        <SourceList
          sources={[
            SRC.ssaFra,
            BY_SRC.ecfrFra,
            BY_SRC.pomsAgeAttainment,
            BY_SRC.pomsFirstMonth,
            SRC.ssaArDrc,
            BY_SRC.ecfrMedicareIep,
            SRC.ecfrRmdAge,
            SRC.irsSeniorDeduction,
            DEEMED_FILING.source,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
