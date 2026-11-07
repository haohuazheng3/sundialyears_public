import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { IrmaaBracketTable, IrmaaMfsTable, IrmaaYearlyTable } from "@/components/calculators/irmaa/IrmaaTables";
import { CMS_2027_EXPECTED, S26, S27, TIERS, inWords, oneDollarOver, partBTotal, yearlyPerPerson } from "@/components/calculators/irmaa/irmaa-content";
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
import { IRMAA_PCT, LIFE_CHANGING_EVENTS, PART_B_REBATE_2026 } from "@/data/params/medicare";
import { CMS_RELEASE_DATES, IRMAA_IMMUNO_2026, IRMAA_INDEXING_RULE, IRMAA_SRC, IRMAA_THRESHOLD_HISTORY } from "@/data/params/irmaa-extra";
import { longDate, money, money2, moneySmart } from "@/lib/format";

const SLUG = "irmaa-brackets-2026";
const Y = S26.premiumYear;
const TAX = S26.magiTaxYear;
const history = IRMAA_THRESHOLD_HISTORY.value;
const prevYear = history.find((h) => h.year === Y - 1);
const immuno = IRMAA_IMMUNO_2026.value;
const rebate = PART_B_REBATE_2026.value;
const PUBLISHED = longDate(CMS_RELEASE_DATES.value[Y]);
const mfsOver = oneDollarOver(Y, "mfs");

const TITLE = `IRMAA Brackets ${Y}: Official Part B & D Table`;
const DESC = `The official ${Y} IRMAA brackets, based on ${TAX} income: MAGI tiers for single, joint and separate filers, with Part B and Part D costs per month and per year.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: `What is the IRMAA threshold for ${Y}?`,
    a: `${money(S26.individualBounds[0])} of ${TAX} MAGI for single filers, heads of household and surviving spouses, and ${money(S26.jointBounds[0])} for married couples filing jointly. At or below those amounts you pay the standard ${money2(S26.standardPartB)} Part B premium. One dollar more puts you in the first tier, which adds ${money2(S26.partBAddOn[1])} a month to Part B and ${money2(S26.partDAddOn[1])} to Part D, per person.`,
  },
  {
    q: `What is the highest IRMAA for ${Y}?`,
    a: `The top tier starts at ${money(S26.topIndividual)} of ${TAX} MAGI (${money(S26.topJoint)} for joint filers, ${money(S26.mfsTop)} for married people filing separately who lived together). It brings Part B to ${money2(partBTotal(S26, 5))} a month and adds ${money2(S26.partDAddOn[5])} a month for Part D: ${moneySmart(yearlyPerPerson(S26, 5))} a year per person above the standard premium.`,
  },
  {
    q: `Is ${Y} IRMAA based on ${TAX} or ${TAX + 1} income?`,
    a: `${TAX}. Medicare uses the tax return from two years before the premium year, so ${Y} premiums depend on your ${TAX} MAGI, and your ${TAX + 1} income sets ${Y + 1} premiums. If your income has dropped since ${TAX} because of retirement or another life-changing event, you can ask Social Security to use a newer year.`,
  },
  {
    q: "Does the hold-harmless rule protect me from IRMAA?",
    a: "No. The hold-harmless rule, which stops a Part B premium increase from shrinking your Social Security check, does not apply to anyone who pays IRMAA. If you are in an IRMAA tier, the full premium increase comes out of your benefit, even when it is larger than your cost-of-living raise.",
  },
  {
    q: "Do I pay the Part D IRMAA if I have Medicare Advantage?",
    a: "Yes, if your Medicare Advantage plan includes drug coverage. The Part D surcharge applies to anyone with Part D coverage, whether through a stand-alone drug plan or a Medicare Advantage plan, and it is paid to Medicare on top of your plan’s own premium. With no Part D coverage there is no Part D surcharge.",
  },
  {
    q: `Are the ${Y} IRMAA brackets final?`,
    a: `Yes. CMS published them on ${PUBLISHED}, and Social Security’s operations manual uses the same table. They apply to every month of ${Y}. The ${Y + 1} table is due in ${CMS_2027_EXPECTED}; until then our ${Y + 1} figures are projections.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd
        data={datasetLd({
          name: `${Y} Medicare IRMAA brackets (Part B and Part D)`,
          description: DESC,
          path: `/${SLUG}`,
          dateModified: SITE.dataVerifiedOn,
          sources: [S26.source.url, SRC.fr2026PartB.url, SRC.ssaPomsIrmaa.url],
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
            IRMAA brackets <span className="italic font-normal text-sun-ink">{Y}</span>
          </>
        }
        lead={
          <p>
            For {Y}, IRMAA applies if your {TAX} MAGI was above {money(S26.individualBounds[0])} (single) or {money(S26.jointBounds[0])} (married filing
            jointly). Part B then costs {money2(partBTotal(S26, 1))} to {money2(partBTotal(S26, 5))} a month instead of {money2(S26.standardPartB)}, and Part D
            adds {money2(S26.partDAddOn[1])} to {money2(S26.partDAddOn[5])} a month on top of your plan’s premium.
          </p>
        }
        chips={<StatusChip status="official">Official CMS figures</StatusChip>}
      />

      <ContentSection className="space-y-10">
        <ProseCard>
          <h2>What are the {Y} IRMAA brackets?</h2>
          <p className="answer">
            There are five IRMAA tiers above the standard premium. Your tier depends on your {TAX} modified adjusted gross income (MAGI) and your filing status,
            and each tier adds a fixed amount to your Part B and Part D premiums for every month of {Y}.
          </p>
          <IrmaaBracketTable year={Y} caption={`Official ${Y} IRMAA brackets by ${TAX} MAGI, with monthly Part B and Part D amounts per person`} />
          <p>
            The single column also covers heads of household, qualifying surviving spouses, and married people who filed separately and lived apart for all of{" "}
            {TAX}. Read the edges carefully: each tier starts one dollar above the line before it, and the top tier starts exactly at {money(S26.topIndividual)}
            . CMS published this table on {PUBLISHED}, and Social Security’s operations manual uses the same numbers.
          </p>
          <p>
            Want your own number? The <Link href="/irmaa-calculator">IRMAA calculator</Link> finds your tier, your yearly cost and how far you are from the next
            line.
          </p>
        </ProseCard>
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-10 space-y-10">
        <ProseCard>
          <h2>How much does each {Y} IRMAA tier cost per year?</h2>
          <p className="answer">
            From {moneySmart(yearlyPerPerson(S26, 1))} a year per person in the first tier to {moneySmart(yearlyPerPerson(S26, 5))} in the top tier, counting
            both the Part B and Part D surcharges. A married couple who are both on Medicare pays twice that, because each spouse is charged separately.
          </p>
          <IrmaaYearlyTable year={Y} />
          <p>
            Those are the surcharges alone. Your total Part B bill for {Y} is the standard {money2(S26.standardPartB)} a month plus the add-on, so someone in
            the first tier pays {money2(partBTotal(S26, 1) * 12)} for the year instead of {money2(S26.standardPartB * 12)}.
          </p>

          <h2>What if you’re married and file separately?</h2>
          <p className="answer">
            If you lived with your spouse at any point in {TAX} and filed separately, a harsher table applies: any MAGI above {money(S26.mfsThreshold)} goes
            straight to the {IRMAA_PCT[4]}% bracket, and {money(S26.mfsTop)} or more to the top bracket. If you lived apart the whole year, you use the single
            column.
          </p>
          <IrmaaMfsTable year={Y} />
          <p>
            For most couples on Medicare this makes filing separately a costly choice. Someone one dollar over the line, at {money(mfsOver.over)}, pays{" "}
            {moneySmart(mfsOver.yearly)} a year in surcharges; on a joint return the same couple might pay nothing.
          </p>

          <h2>Which income counts for {Y} IRMAA?</h2>
          <p className="answer">
            Your {TAX} MAGI: the adjusted gross income on your {TAX} Form 1040 plus any tax-exempt interest. If the IRS didn’t have your {TAX} return when
            Social Security set your premium, it used {TAX - 1} instead and will correct it once the {TAX} figures arrive.
          </p>
          <p>
            That includes IRA and 401(k) withdrawals, Roth conversions, the taxable part of Social Security, capital gains and municipal-bond interest. It
            excludes qualified Roth withdrawals and qualified charitable distributions (QCDs). A large one-off item in {TAX}, such as a home sale or a big
            conversion, raises your {Y} premiums only.
          </p>

          <h2>Is IRMAA different for immunosuppressive-drug coverage?</h2>
          <p className="answer">
            Slightly. People who keep Part B only for immunosuppressive drugs pay a lower standard premium of {money2(immuno.standard)} in {Y}, and IRMAA
            amounts of {money2(immuno.addOn[1])} to {money2(immuno.addOn[5])} a month. The income tiers are the same as for full Part B coverage, based on your{" "}
            {TAX} MAGI.
          </p>
          <div className="not-prose overflow-x-auto rounded-2xl">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">{`${Y} IRMAA for Part B immunosuppressive-drug coverage`}</caption>
              <thead>
                <tr>
                  <th scope="col">Tier</th>
                  <th scope="col">IRMAA per month</th>
                  <th scope="col">Total premium per month</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t}>
                    <td className="strong">{t === 0 ? "No IRMAA" : `Tier ${t}`}</td>
                    <td className="num">{money2(immuno.addOn[t])}</td>
                    <td className="num">{money2(immuno.standard + immuno.addOn[t])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Do IRMAA payers get the {money(rebate.amount)} Part B rebate?</h2>
          <p className="answer">
            No. CMS is sending a one-time {money(rebate.amount)} Part B premium rebate in {rebate.month} to people with Original Medicare Part B, but anyone
            who pays IRMAA is left out, along with Medicare Advantage members and people whose Part B premium Medicaid pays.
          </p>

          <h2>Can you get your {Y} IRMAA lowered?</h2>
          <p className="answer">
            Yes, if your income has fallen since {TAX} because of a life-changing event such as retirement. File Form SSA-44 and Social Security can use your{" "}
            {TAX + 1} return or a {Y} estimate instead. A one-time spike, like a {TAX} Roth conversion, doesn’t qualify.
          </p>
          <p>
            The {inWords(LIFE_CHANGING_EVENTS.length)} qualifying events are marriage, divorce, a spouse’s death, stopping or cutting back work, losing
            income-producing property, losing a pension, and an employer settlement payment. The change generally applies from January 1 of the year you ask. So
            if you retired in {TAX + 1} or {Y} and you are paying {Y} IRMAA on a {TAX} salary, don’t wait: send the form before {Y} ends. Our{" "}
            <Link href="/irmaa-calculator">calculator</Link> checks whether your new income would drop you a tier.
          </p>

          <h2>How do the {Y} brackets compare with other years?</h2>
          <p className="answer">
            The lines rise with inflation every year. The first single line went from {money(prevYear?.bounds[0] ?? 0)} in {Y - 1} to{" "}
            {money(S26.individualBounds[0])} in {Y} and is projected at {money(S27.individualBounds[0])} for {Y + 1}, while the {money(S26.topIndividual)} top
            line stays fixed until {IRMAA_INDEXING_RULE.value.topTierFirstIndexedYear}. The same income can land in a lower tier from one year to the next.
          </p>
          <div className="not-prose overflow-x-auto rounded-2xl">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">IRMAA single-filer lines by premium year</caption>
              <thead>
                <tr>
                  <th scope="col">Premium year</th>
                  <th scope="col">Tier 1 starts over</th>
                  <th scope="col">Tier 2 starts over</th>
                  <th scope="col">Tier 3 starts over</th>
                  <th scope="col">Tier 4 starts over</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.year} className={h.year === Y ? "is-hit" : undefined}>
                    <td className="strong">
                      {h.year}
                      {h.year === Y ? " (this page)" : ""}
                    </td>
                    {h.bounds.map((b) => (
                      <td key={b} className="num">
                        {money(b)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="strong">
                    <Link className="link" href="/irmaa-brackets-2027">
                      {Y + 1}
                    </Link>{" "}
                    <StatusChip status="projected" />
                  </td>
                  {S27.individualBounds.map((b) => (
                    <td key={b} className="num">
                      {money(b)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Joint lines are always twice these. See the <Link href="/irmaa-brackets-2027">projected {Y + 1} IRMAA brackets</Link> for how the next table is
            built and why its middle lines could still move.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.cms2026Premiums,
            SRC.fr2026PartB,
            SRC.ssaPomsIrmaa,
            IRMAA_SRC.medicareCosts2026,
            SRC.statuteIrmaa,
            IRMAA_SRC.ecfr418_1115,
            IRMAA_SRC.ecfr418_1135,
            IRMAA_SRC.ecfr423_286,
            IRMAA_SRC.ecfr418_1205,
            IRMAA_SRC.ecfr418_1230,
            IRMAA_SRC.ssa44,
            SRC.cmsRebate2026,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
