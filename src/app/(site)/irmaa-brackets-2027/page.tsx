import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { IrmaaBracketTable, IrmaaChangeTable, IrmaaMfsTable, IrmaaYearlyTable } from "@/components/calculators/irmaa/IrmaaTables";
import {
  ALT_GAP_2027,
  CMS_2027_EXPECTED,
  CPI_WINDOW_LABEL,
  MISSING_CPI_MONTH,
  S26,
  S27,
  listAnd,
  monthLabel,
  partBTotal,
  yearlyPerPerson,
} from "@/components/calculators/irmaa/irmaa-content";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { datasetLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { SRC } from "@/data/params/sources";
import { IRMAA_2027_ALT_BOUNDS, IRMAA_2027_INDEXING, PART_D } from "@/data/params/medicare";
import {
  CMS_RELEASE_DATES,
  CPI_WINDOW_2027,
  IRMAA_2027_SCENARIO_B,
  IRMAA_INDEXING_RULE,
  IRMAA_PENDING_BILL,
  IRMAA_SRC,
  IRMAA_THRESHOLD_HISTORY,
} from "@/data/params/irmaa-extra";
import { indexThresholds } from "@/lib/calc/irmaa";
import { longDate, money, money2, moneySmart, pct } from "@/lib/format";

const SLUG = "irmaa-brackets-2027";
const Y = S27.premiumYear;
const TAX = S27.magiTaxYear;
const idx = IRMAA_2027_INDEXING.value;
const scenB = IRMAA_2027_SCENARIO_B.value;
const history = IRMAA_THRESHOLD_HISTORY.value;
const prev = history.find((h) => h.year === Y - 1)!;
const lineGrowth = idx.factor / prev.factor - 1;
const bill = IRMAA_PENDING_BILL.value;
const partDBase = PART_D[Y as keyof typeof PART_D];
const topIndexedFrom = IRMAA_INDEXING_RULE.value.topTierFirstIndexedYear;
const cpiMonths = CPI_WINDOW_2027.value;
const publishedMonths = cpiMonths.filter((m) => m.value != null).length;
const backTest = history.map((h) => ({ ...h, computed: indexThresholds(idx.baseAmounts, h.cpiAvg, idx.baseAvgSep2017Aug2018, S27.topIndividual).individual }));
const tier2Margin =
  idx.unrounded[1] -
  (Math.floor(idx.unrounded[1] / IRMAA_INDEXING_RULE.value.roundTo) * IRMAA_INDEXING_RULE.value.roundTo + IRMAA_INDEXING_RULE.value.roundTo / 2);

const TITLE = `IRMAA Brackets ${Y}: Projected Medicare Limits`;
const DESC = `Projected ${Y} IRMAA brackets from ${TAX} income: first line ${money(S27.individualBounds[0])} single, ${money(S27.jointBounds[0])} joint; Part B and Part D surcharges; and how we projected them.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: `What is the IRMAA threshold for ${Y}?`,
    a: `Projected: ${money(S27.individualBounds[0])} of ${TAX} MAGI for single filers and ${money(S27.jointBounds[0])} for married couples filing jointly. This first line comes out the same whichever way CMS handles the missing ${MISSING_CPI_MONTH} inflation figure, so it is the most reliable of the projected lines. CMS is expected to publish the official figures in ${CMS_2027_EXPECTED}.`,
  },
  {
    q: `Will IRMAA go up in ${Y}?`,
    a: `Yes, both the income lines and the charges. The inflation-indexed lines rise about ${pct(lineGrowth)} with inflation, and the projected surcharges rise too: the first tier from ${moneySmart(yearlyPerPerson(S26, 1))} to ${moneySmart(yearlyPerPerson(S27, 1))} a year per person, and the top tier from ${moneySmart(yearlyPerPerson(S26, 5))} to ${moneySmart(yearlyPerPerson(S27, 5))}. The standard Part B premium is projected at ${money2(S27.standardPartB)}.`,
  },
  {
    q: `What year’s income is used for ${Y} IRMAA?`,
    a: `Your ${TAX} tax return. Medicare uses MAGI from two years before the premium year, so ${Y} premiums depend on ${TAX} income, which is already locked in for most people. Income you have in ${TAX + 1} will set your ${Y + 1} premiums. If your income has dropped since ${TAX} because you retired, Form SSA-44 lets Social Security use a newer year.`,
  },
  {
    q: `Why are the ${Y} IRMAA brackets only projected?`,
    a: `Because CMS hasn’t released them yet. It publishes the next year’s Part B premium and IRMAA table each fall; the last two came out in November. We calculate the income lines with the inflation formula in the law, which reproduces every published table from ${history[0].year} to ${prev.year}, and use the Medicare Trustees’ projection for the Part B amounts.`,
  },
  {
    q: `Is the ${money(S27.topIndividual)} IRMAA top tier indexed for ${Y}?`,
    a: `No. The ${money(S27.topIndividual)} line (${money(S27.topJoint)} for joint filers) is fixed by law and isn’t indexed for inflation until ${topIndexedFrom}, so it is the one line in the ${Y} table that is certain. The married-filing-separately top line does move, because it equals ${money(S27.topIndividual)} minus the first threshold: a projected ${money(S27.mfsTop)} for ${Y}.`,
  },
  {
    q: `What is the Part D IRMAA for ${Y}?`,
    a: `Projected at ${listAnd(S27.partDAddOn.slice(1).map(money2))} a month for tiers 1 through 5. These come from the official ${Y} Part D base premium of ${money2(partDBase.value.baseBeneficiaryPremium)} run through the formula in federal regulations, and they match the Medicare Trustees’ projection, so they are very likely to be final.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd
        data={datasetLd({
          name: `${Y} Medicare IRMAA brackets (projected)`,
          description: DESC,
          path: `/${SLUG}`,
          dateModified: SITE.dataVerifiedOn,
          sources: [SRC.blsCpiU.url, SRC.medicareTrustees2026.url, SRC.cmsPartD2027.url, SRC.statuteIrmaa.url],
        })}
      />
      <ToolHero
        crumbs={[
          { name: "IRMAA Calculator", path: "/irmaa-calculator" },
          { name: `IRMAA Brackets ${Y}`, path: `/${SLUG}` },
        ]}
        eyebrow="Medicare"
        icon="chart"
        title={
          <>
            IRMAA brackets <span className="italic font-normal text-sun-ink">{Y}</span> (projected)
          </>
        }
        lead={
          <p>
            Medicare IRMAA for {Y} will be based on your {TAX} tax return. We project it starts above {money(S27.individualBounds[0])} for single filers and{" "}
            {money(S27.jointBounds[0])} for joint filers, with Part B at {money2(partBTotal(S27, 1))} to {money2(partBTotal(S27, 5))} a month. CMS hasn’t
            published the official table yet. It’s expected in {CMS_2027_EXPECTED}, and we’ll update this page the day it appears.
          </p>
        }
        chips={
          <>
            <StatusChip status="projected">Projected, not final</StatusChip>
            <StatusChip status={partDBase.status}>Part D base premium official</StatusChip>
          </>
        }
      />

      <ContentSection className="space-y-10">
        <ProseCard>
          <h2>What are the projected {Y} IRMAA brackets?</h2>
          <p className="answer">
            Five tiers above the standard premium, each set by your {TAX} modified adjusted gross income (MAGI) and your filing status. We project the first
            line at {money(S27.individualBounds[0])} for single filers and {money(S27.jointBounds[0])} for joint filers; the top tier still starts at{" "}
            {money(S27.topIndividual)} and {money(S27.topJoint)}.
          </p>
          <IrmaaBracketTable year={Y} caption={`Projected ${Y} IRMAA brackets by ${TAX} MAGI, with monthly Part B and Part D amounts per person`} />
          <p>Married and filing separately, but lived with your spouse at some point in {TAX}? Your table has only three rows:</p>
          <IrmaaMfsTable year={Y} />
          <p>
            To see where your own income lands, and whether it is close enough to a line to be affected by the open questions below, use the{" "}
            <Link href={`/irmaa-calculator?year=${Y}`}>IRMAA calculator</Link>.
          </p>
        </ProseCard>
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-10 space-y-10">
        <ProseCard>
          <h2>How much will {Y} IRMAA cost per year?</h2>
          <p className="answer">
            Projected at {moneySmart(yearlyPerPerson(S27, 1))} a year per person in the first tier, up to {moneySmart(yearlyPerPerson(S27, 5))} in the top tier,
            counting both the Part B and Part D surcharges. A couple who are both on Medicare and file jointly pays twice that.
          </p>
          <IrmaaYearlyTable year={Y} />

          <h2>
            How do the {Y} brackets compare with {S26.premiumYear}?
          </h2>
          <p className="answer">
            The inflation-indexed lines move up about {pct(lineGrowth)}: the first single line rises by{" "}
            {money(S27.individualBounds[0] - S26.individualBounds[0])}, to {money(S27.individualBounds[0])}, and the first joint line by{" "}
            {money(S27.jointBounds[0] - S26.jointBounds[0])}. The surcharges rise too: someone in the first tier would pay{" "}
            {moneySmart(yearlyPerPerson(S27, 1) - yearlyPerPerson(S26, 1))} more for the year.
          </p>
          <IrmaaChangeTable />
          <p>
            Higher lines are good news if your income is flat: some people who paid IRMAA in {S26.premiumYear} will drop a tier in {Y} without changing
            anything. Higher surcharges are the bad news for everyone who stays in a tier.
          </p>
          <p>
            One line moves the other way. For married people who file separately and lived together, the top tier starts at {money(S27.topIndividual)} minus
            the first line, so it drops from {money(S26.mfsTop)} to {money(S27.mfsTop)}.
          </p>

          <h2>How did we project the {Y} IRMAA thresholds?</h2>
          <p className="answer">
            The law ties the IRMAA lines to inflation. We average the consumer price index (CPI-U) from {CPI_WINDOW_LABEL.from} through {CPI_WINDOW_LABEL.to},
            divide by the September 2017–August 2018 average, multiply the four base amounts in the law by that factor, and round to the nearest{" "}
            {money(IRMAA_INDEXING_RULE.value.roundTo)}.
          </p>
          <p>
            The {publishedMonths} published months average {idx.avgSep2025Aug2026_11mo.toFixed(3)}; the base period averages{" "}
            {idx.baseAvgSep2017Aug2018.toFixed(3)}. That gives a factor of {idx.factor.toFixed(6)}. Joint lines are{" "}
            {IRMAA_INDEXING_RULE.value.jointMultiple === 2 ? "twice" : `${IRMAA_INDEXING_RULE.value.jointMultiple} times`} the rounded single lines.
          </p>
          <div className="not-prose overflow-x-auto rounded-2xl">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">{`How the projected ${Y} IRMAA lines are calculated`}</caption>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Base amount in the law</th>
                  <th scope="col">× {idx.factor.toFixed(6)}</th>
                  <th scope="col">Rounded (single)</th>
                  <th scope="col">Joint</th>
                  <th scope="col">If {MISSING_CPI_MONTH} is filled in</th>
                </tr>
              </thead>
              <tbody>
                {idx.baseAmounts.map((b, k) => (
                  <tr key={b}>
                    <td className="strong">Top of {k === 0 ? "standard premium" : `tier ${k}`}</td>
                    <td className="num">{money(b)}</td>
                    <td className="num">{money2(idx.unrounded[k])}</td>
                    <td className="num strong">{money(S27.individualBounds[k])}</td>
                    <td className="num">{money(S27.jointBounds[k])}</td>
                    <td className="num">
                      {money(IRMAA_2027_ALT_BOUNDS.individualBounds[k])}
                      {IRMAA_2027_ALT_BOUNDS.individualBounds[k] === S27.individualBounds[k] ? " (same)" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            We trust the method because it reproduces every published table we checked. Run on the actual CPI data for each year, it lands on the official lines
            every time:
          </p>
          <div className="not-prose overflow-x-auto rounded-2xl">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">Back-test of the IRMAA indexing formula against published single-filer lines</caption>
              <thead>
                <tr>
                  <th scope="col">Premium year</th>
                  <th scope="col">CPI-U average</th>
                  <th scope="col">Factor</th>
                  <th scope="col">Published single lines</th>
                  <th scope="col">Formula matches?</th>
                </tr>
              </thead>
              <tbody>
                {backTest.map((h) => (
                  <tr key={h.year}>
                    <td className="strong">{h.year}</td>
                    <td className="num">{h.cpiAvg.toFixed(3)}</td>
                    <td className="num">{h.factor.toFixed(6)}</td>
                    <td className="num">{h.bounds.map((b) => money(b)).join(" / ")}</td>
                    <td>{h.computed.every((c, k) => c === h.bounds[k]) ? "Yes, all four" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>
            Why could the {Y} lines still move by {money(ALT_GAP_2027.individual)}?
          </h2>
          <p className="answer">
            Because the {MISSING_CPI_MONTH} inflation number doesn’t exist. The government shutdown stopped the Bureau of Labor Statistics (BLS) from collecting
            it, and BLS says it can’t be filled in later. Averaging the {publishedMonths} published months gives our lines; filling {MISSING_CPI_MONTH} in gives tiers 2–4
            that are {money(ALT_GAP_2027.individual)} lower.
          </p>
          <div className="not-prose overflow-x-auto rounded-2xl">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">{`CPI-U by month, ${CPI_WINDOW_LABEL.from} to ${CPI_WINDOW_LABEL.to}`}</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">CPI-U (not seasonally adjusted)</th>
                </tr>
              </thead>
              <tbody>
                {cpiMonths.map((m) => (
                  <tr key={m.month} className={m.value == null ? "is-hit" : undefined}>
                    <td>{monthLabel(m.month)}</td>
                    <td className="num">{m.value == null ? "Not published" : m.value.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            If CMS instead estimates {MISSING_CPI_MONTH} (for example, halfway between September and November), the average becomes {scenB.avg12mo.toFixed(3)}, the factor {scenB.factor.toFixed(6)}, and the lines{" "}
            {listAnd(IRMAA_2027_ALT_BOUNDS.individualBounds.map(money))} (joint {listAnd(IRMAA_2027_ALT_BOUNDS.jointBounds.map(money))}). The first line and the
            married-filing-separately lines come out the same either way.
          </p>
          <p>
            We went with the {publishedMonths}-month average because that is what BLS itself did for its 2025 annual averages, and the Department of Health and
            Human Services, CMS’s parent department, did the same for the 2026 poverty guidelines. But it is close: the unrounded tier-2 line is{" "}
            {money2(idx.unrounded[1])}, just {money2(tier2Margin)} above the point where it would round down. If your {TAX} income sits between the two
            candidate lines, treat both tiers as possible until CMS publishes.
          </p>

          <h2>Where do the {Y} dollar amounts come from?</h2>
          <p className="answer">
            Part B comes from the 2026 Medicare Trustees Report, which projects a {money2(S27.standardPartB)} standard premium and IRMAA add-ons of{" "}
            {money2(S27.partBAddOn[1])} to {money2(S27.partBAddOn[5])}. Part D comes from the {money2(partDBase.value.baseBeneficiaryPremium)} base premium CMS
            has already set for {Y}, run through the formula in the regulations.
          </p>
          <p>
            Our honest read: the Part D add-ons are nearly certain, the income lines are very likely right to within {money(ALT_GAP_2027.individual)}, and the
            Part B amounts are the least certain part of this page. Final Part B premiums have differed from the Trustees’ projection by several dollars in past
            years.
          </p>

          <h2>When will CMS announce the official {Y} IRMAA brackets?</h2>
          <p className="answer">
            Most likely in {CMS_2027_EXPECTED}, together with the {Y} Part B premium. Last year CMS published on{" "}
            {longDate(CMS_RELEASE_DATES.value[S26.premiumYear])}, and the year before on {longDate(CMS_RELEASE_DATES.value[S26.premiumYear - 1])}. Social
            Security then sends IRMAA notices to the people who will pay it, expected from late November into December.
          </p>
          <p>
            We check for the release daily and will replace every projected number on this page, and in the calculator, the day CMS publishes. Until then, the
            figures here are the best available estimate, not a promise.
          </p>

          <h2>Is Congress changing IRMAA for {Y}?</h2>
          <p className="answer">
            Not as of {longDate(SITE.dataVerifiedOn)}. A bill introduced on {longDate(bill.introduced)}, {bill.bill}, would raise the first threshold to{" "}
            {money(bill.proposedThreshold)} and drop the two lowest tiers starting in {bill.proposedFirstYear}, but it has only been referred to committee.
            Current law, and the projection on this page, still apply.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.statuteIrmaa,
            IRMAA_SRC.ecfr418_1115,
            SRC.blsCpiU,
            IRMAA_SRC.blsShutdownFaq,
            SRC.medicareTrustees2026,
            SRC.cmsPartD2027,
            IRMAA_SRC.ecfr423_286,
            SRC.cms2026Premiums,
            SRC.ssaPomsIrmaa,
            IRMAA_SRC.hr9709,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
