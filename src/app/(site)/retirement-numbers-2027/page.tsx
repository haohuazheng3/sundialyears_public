import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { Stat } from "@/components/tool/Result";
import { JsonLd } from "@/components/site/JsonLd";
import { NumbersGroupTable, NumbersJumpNav, StillWaiting } from "@/components/reference/numbers/NumbersTables";
import { NUMBER_GROUPS, allSources, statusCounts } from "@/components/reference/numbers/numbers-data";
import { datasetLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { longDate, money, money2 } from "@/lib/format";
import { AWI } from "@/data/generated/awi";
import { COLA, MAX_BENEFIT_2027, SS_YEAR } from "@/data/params/social-security";
import { IRMAA_2026, IRMAA_2027, IRMAA_2027_ALT_BOUNDS, PART_A, PART_B, PART_D } from "@/data/params/medicare";
import { NIIT, QCD, SENIOR_DEDUCTION, SS_TAX_THRESHOLDS } from "@/data/params/tax";
import { RMD_AGE_RULES, RMD_EXCISE } from "@/data/params/rmd";
import { RET_WITHHOLDING, SS_BENEFIT_TAXABLE_SHARE } from "@/data/params/numbers-extra";

const SLUG = "retirement-numbers-2027";

/* ---------- every figure on this page comes from the params ---------- */
const C = COLA[2027].value;
const SS26 = SS_YEAR[2026].value;
const SS27 = SS_YEAR[2027].value;
const B26 = PART_B[2026].value;
const B27 = PART_B[2027];
const A27 = PART_A[2027];
const D27 = PART_D[2027];
const D26 = PART_D[2026].value;
const AWI_GROWTH = (AWI[2025] / AWI[2024] - 1) * 100;
const IRMAA_ALT_GAP = IRMAA_2027.individualBounds[1] - IRMAA_2027_ALT_BOUNDS.individualBounds[1];
const RMD73 = RMD_AGE_RULES.value.find((r) => r.age === 73)!;
const RMD75 = RMD_AGE_RULES.value.find((r) => r.age === 75)!;
const SEN = SENIOR_DEDUCTION.value;
const TH = SS_TAX_THRESHOLDS.value;
const COUNTS = statusCounts();
const ROWS = NUMBER_GROUPS.reduce((n, g) => n + g.rows.length, 0);
const p1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

const TITLE = "2027 Retirement Numbers: Social Security, Medicare & Tax";
const DESC = `Every 2027 retirement number in one table: the ${C}% COLA, ${money(SS27.taxableMax)} taxable max, earnings limits, Medicare premiums, IRMAA, RMD and tax figures.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: "What are the biggest Social Security changes for 2027?",
    a: `Benefits rise ${C}% starting in January 2027. The taxable maximum goes up to ${money(SS27.taxableMax)}, the earnings-test limit before full retirement age to ${money(SS27.retUnderFraAnnual)} a year, and the maximum benefit at full retirement age to ${money(SS27.maxBenefitAtFra)} a month. All of these are official, published by the Social Security Administration.`,
  },
  {
    q: "What will Medicare Part B cost in 2027?",
    a: `The 2026 Medicare Trustees Report projects a standard premium of ${money2(B27.value.premium)} a month, up from ${money2(B26.premium)}, and a ${money(B27.value.deductible)} deductible, up from ${money(B26.deductible)}. These are projections: Medicare announces the official 2027 figures in November, and higher-income enrollees pay more through IRMAA.`,
  },
  {
    q: "What is the Social Security earnings limit for 2027?",
    a: `If you collect benefits before full retirement age and work, the 2027 limit is ${money(SS27.retUnderFraAnnual)}; SSA holds back $1 for every $${RET_WITHHOLDING.value.beforeFraYear} you earn above it. In the calendar year you reach full retirement age the limit is ${money(SS27.retFraYearAnnual)}, counting only earnings in the months before you reach it, with $1 held back for every $${RET_WITHHOLDING.value.inFraYear} over.`,
  },
  {
    q: "Has the IRS released the 2027 tax brackets?",
    a: "Not as of our last check. The IRS normally publishes next year's brackets, standard deductions and capital-gains thresholds in October or November, and the 2027 QCD limit follows with its retirement-plan adjustments. Until then, this page shows the 2026 figures and marks the 2027 column as not announced.",
  },
  {
    q: "What income triggers IRMAA in 2027?",
    a: `Our projection is modified adjusted gross income above ${money(IRMAA_2027.individualBounds[0])} for single filers or ${money(IRMAA_2027.jointBounds[0])} for joint filers, using your ${IRMAA_2027.magiTaxYear} tax return. The thresholds are indexed to inflation, and Medicare publishes the official 2027 table in November. The top tier stays at ${money(IRMAA_2027.topIndividual)} and ${money(IRMAA_2027.topJoint)}.`,
  },
  {
    q: "Is the RMD age changing in 2027?",
    a: `No. Required minimum distributions start at ${RMD73.age} if you were ${RMD73.label.toLowerCase()} and at ${RMD75.age} if you were ${RMD75.label.toLowerCase()}. That means people born in ${2027 - RMD73.age} owe their first RMD for 2027, due by April 1, ${2027 + 1}. The missed-RMD penalty stays ${Math.round(RMD_EXCISE.value.rate * 100)}%.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  const glance = [
    { label: "Social Security COLA", value: `${C}%`, sub: `Was ${COLA[2026].value}%`, status: COLA[2027].status },
    { label: "Part B premium", value: money2(B27.value.premium), sub: `Was ${money2(B26.premium)} a month`, status: B27.status },
    { label: "Earnings-test limit", value: money(SS27.retUnderFraAnnual), sub: `Was ${money(SS26.retUnderFraAnnual)} a year`, status: SS_YEAR[2027].status },
    { label: "Part D out-of-pocket cap", value: money(D27.value.outOfPocketCap), sub: `Was ${money(D26.outOfPocketCap)} a year`, status: D27.status },
  ];

  return (
    <>
      <JsonLd
        data={datasetLd({
          name: "2027 retirement numbers: Social Security, Medicare, RMD and federal tax",
          description: `${ROWS} retirement-related figures for 2026 and 2027 — Social Security COLA and wage-indexed amounts, SSI, Medicare Part A/B/D and IRMAA, RMD and QCD rules, and federal tax thresholds — each with its status (official, projected or not yet announced) and primary source.`,
          path: `/${SLUG}`,
          dateModified: SITE.dataVerifiedOn,
          sources: allSources().map((s) => s.url),
        })}
      />
      <ToolHero
        crumbs={[{ name: "2027 retirement numbers", path: `/${SLUG}` }]}
        eyebrow="Key numbers"
        icon="spark"
        title={
          <>
            Every 2027 retirement number, <span className="italic font-normal text-sun-ink">in one place</span>
          </>
        }
        lead={
          <p>
            For 2027, Social Security checks rise {C}%, the earnings limit climbs to {money(SS27.retUnderFraAnnual)} and the taxable maximum to{" "}
            {money(SS27.taxableMax)} — all official. Medicare’s Part B premium is projected at {money2(B27.value.premium)}, and the IRS hasn’t published 2027 tax
            brackets yet. Each row shows 2026, 2027, the change, its status and the source.
          </p>
        }
        chips={
          <>
            <StatusChip status="official">{COUNTS.official} official</StatusChip>
            <StatusChip status="projected">{COUNTS.projected} projected</StatusChip>
            <StatusChip status="not_yet_announced">{COUNTS.not_yet_announced} not announced yet</StatusChip>
          </>
        }
      />

      <ContentSection className="space-y-6">
        <section aria-label="2027 at a glance" className="float p-5 sm:p-7">
          <h2 className="text-[1.35rem] font-semibold">2027 at a glance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {glance.map((g) => (
              <Stat
                key={g.label}
                label={g.label}
                value={g.value}
                sub={
                  <>
                    {g.sub}
                    <span className="mt-1.5 block">
                      <StatusChip status={g.status} />
                    </span>
                  </>
                }
              />
            ))}
          </div>
          <div className="mt-6">
            <NumbersJumpNav groups={NUMBER_GROUPS} />
          </div>
        </section>

        {NUMBER_GROUPS.map((g) => (
          <NumbersGroupTable key={g.id} group={g} />
        ))}

        <StillWaiting />
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What changes for Social Security in 2027?</h2>
          <p className="answer">
            Everything Social Security sets for 2027 is final. Benefits rise {C}%, the taxable maximum climbs to {money(SS27.taxableMax)}, and the earnings limit
            before full retirement age rises to {money(SS27.retUnderFraAnnual)} a year. The top benefit at full retirement age is {money(SS27.maxBenefitAtFra)} a
            month; the maximum SSI payment rises to {money(SS27.ssiIndividual)}.
          </p>
          <p>
            Two different engines drive these numbers. The COLA follows prices — the CPI-W, a consumer price index for wage earners. Most of the other figures —
            the taxable maximum, earnings limits, work-credit amount and benefit-formula bend points — follow wages: the national average wage index rose{" "}
            {p1(AWI_GROWTH)} to {money2(AWI[2025])} for 2025, which sets the 2027 amounts.
          </p>
          <p>
            If you’re collecting early and still working, the earnings limit is the number to watch: SSA holds back $1 for every ${RET_WITHHOLDING.value.beforeFraYear}{" "}
            you earn above {money(SS27.retUnderFraAnnual)}, or $1 for every ${RET_WITHHOLDING.value.inFraYear} above {money(SS27.retFraYearAnnual)} in the year you
            reach full retirement age. The money isn’t lost — your benefit is recalculated later — but it can upset a budget. Our{" "}
            <Link href="/social-security-earnings-limit-calculator?year=2027">earnings limit calculator</Link> shows which months get withheld, and the{" "}
            <Link href="/social-security-cola">2027 COLA page</Link> shows what the raise does to your own check.
          </p>

          <h2>How much will Medicare cost in 2027?</h2>
          <p className="answer">
            Part B is projected at {money2(B27.value.premium)} a month, up from {money2(B26.premium)}, with a {money(B27.value.deductible)} deductible — not final
            until Medicare announces it in November. Part D numbers are final: the out-of-pocket cap rises to {money(D27.value.outOfPocketCap)} and the maximum
            deductible to {money(D27.value.deductible)}.
          </p>
          <p>
            The projected Part A hospital deductible is {money(A27.value.deductible)} per benefit period. If your income is higher, the income-related monthly
            adjustment amount (IRMAA) adds a surcharge to Part B and Part D. For 2027 it’s based on your {IRMAA_2027.magiTaxYear} tax return, and we project it
            starts above {money(IRMAA_2027.individualBounds[0])} (single) or {money(IRMAA_2027.jointBounds[0])} (joint), up from {money(IRMAA_2026.individualBounds[0])}{" "}
            and {money(IRMAA_2026.jointBounds[0])}.
          </p>
          <p>
            The Part D cap is the number that matters most if you take an expensive brand-name drug. Once your out-of-pocket spending on covered drugs reaches{" "}
            {money(D27.value.outOfPocketCap)} in 2027 (it was {money(D26.outOfPocketCap)} in 2026), you pay nothing more for the rest of the year. Plans still
            differ a lot below the cap, so compare them during Medicare’s fall open enrollment.
          </p>
          <p>
            One honest caveat: a month of inflation data is missing because of the 2025 government shutdown, so the upper IRMAA tiers could land{" "}
            {money(IRMAA_ALT_GAP)} lower than our projection. If your {IRMAA_2027.magiTaxYear} income was within a few thousand dollars of a tier, wait for the
            official table — or run both cases in the <Link href="/irmaa-calculator?year=2027">IRMAA calculator</Link>. The full projected tiers are on{" "}
            <Link href="/irmaa-brackets-2027">2027 IRMAA brackets</Link>.
          </p>

          <h2>Do RMD rules change in 2027?</h2>
          <p className="answer">
            No. Your required minimum distribution (RMD) age is still {RMD73.age} if you were {RMD73.label.toLowerCase()} and {RMD75.age} if you were {RMD75.label.toLowerCase()},
            so people born in {2027 - RMD73.age} take their first RMD for 2027. The penalty for a missed RMD stays {Math.round(RMD_EXCISE.value.rate * 100)}%, or{" "}
            {Math.round(RMD_EXCISE.value.correctedRate * 100)}% if you fix it promptly.
          </p>
          <p>
            The qualified charitable distribution (QCD) limit — the amount you can send from an IRA straight to charity, tax-free — was{" "}
            {money(QCD[2026].value.limit ?? 0)} in 2026. It rises with inflation, but the IRS hasn’t announced the 2027 figure yet. If you were born in{" "}
            {2027 - RMD73.age}, think twice before delaying your first RMD to April 1, {2027 + 1}: you’d owe two RMDs in one tax year. The{" "}
            <Link href="/rmd-calculator?year=2027">RMD calculator</Link> shows both amounts.
          </p>

          <h2>What about federal income taxes in 2027?</h2>
          <p className="answer">
            The IRS hasn’t published 2027 brackets or standard deductions; it usually does in October or November. Two things are already settled: the{" "}
            {money(SEN.perPerson)} senior deduction for people 65 and older continues through {SEN.years[SEN.years.length - 1]}, and the thresholds for taxing Social
            Security stay at {money(TH.base.single)} and {money(TH.base.mfj)}.
          </p>
          <p>
            Those Social Security thresholds have never been adjusted for inflation, which is why a COLA can quietly raise your tax bill: as benefits grow, more
            people cross {money(TH.base.single)} (single) or {money(TH.base.mfj)} (joint), and up to {SS_BENEFIT_TAXABLE_SHARE.value.aboveAdjusted}% of benefits
            becomes taxable above {money(TH.adjusted.single)} or {money(TH.adjusted.mfj)}. The {(NIIT.value.rate * 100).toFixed(1)}% net investment income tax
            thresholds — {money(NIIT.value.thresholds.single)} and {money(NIIT.value.thresholds.mfj)} — aren’t indexed either. Check where you stand with the{" "}
            <Link href="/taxable-social-security-calculator">Social Security tax calculator</Link>.
          </p>
          <p>
            The senior deduction is easy to misread. It’s a separate {money(SEN.perPerson)} per person on top of the regular extra standard deduction for age 65,
            it shrinks once income passes {money(SEN.phaseoutStart.single)} (single) or {money(SEN.phaseoutStart.mfj)} (joint), and it does not make Social Security
            tax-free.
          </p>

          <h2>Why do some 2027 numbers say “projected”?</h2>
          <p className="answer">
            Because the agency hasn’t published them yet. “Official” means the agency has published the figure. “Projected” means we computed it from official
            inputs or took it from the Trustees Report. “Not announced yet” means there’s no reliable estimate, so we show 2026 instead.
          </p>
          <p>
            We’d rather show you a clearly labeled projection than a blank, because people plan Roth conversions and budgets months ahead. But don’t file anything
            based on a projected number. Every row links to its primary source, and we update the page the day an agency publishes.
          </p>

          <h2>How should you use these 2027 numbers?</h2>
          <p className="answer">
            Plan with the official figures now and treat the projected ones as placeholders. Budget with the projected Part B premium until Medicare publishes the
            real one in November, remember that Medicare surcharges look back two years at your tax return, and check back once the IRS releases its 2027 tax
            figures.
          </p>
          <ul>
            <li>
              <strong>Budget with the projected Part B premium now, then check back in November.</strong> Your COLA notice in December shows the exact
              deduction.
            </li>
            <li>
              <strong>Mind the two-year lag.</strong> 2027 Medicare premiums use {IRMAA_2027.magiTaxYear} income, and the income on your 2027 tax return sets
              your {IRMAA_2027.premiumYear + 2} premiums. A big IRA withdrawal or Roth conversion shows up in your Medicare bill two years later.
            </li>
            <li>
              <strong>Don’t confuse gross and net.</strong> A {C}% COLA isn’t a {C}% bigger deposit once Medicare is deducted.
            </li>
            <li>
              <strong>Use the links in each row.</strong> Underlined row names open the calculator or reference page built around that number, and the small
              agency name under each row opens the primary source.
            </li>
          </ul>
          <p>
            Also see: the maximum benefit for someone claiming at 70 in January 2027 is {money(MAX_BENEFIT_2027.value.age70)} a month — the{" "}
            <Link href="/social-security-break-even-calculator">break-even calculator</Link> shows whether waiting pays off for you. Figures last verified{" "}
            {longDate(SITE.dataVerifiedOn)}.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList sources={allSources()} />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
