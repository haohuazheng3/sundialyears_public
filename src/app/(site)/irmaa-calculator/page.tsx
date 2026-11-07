import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { IrmaaCalculator } from "@/components/calculators/irmaa/IrmaaCalculator";
import { IrmaaBracketTable } from "@/components/calculators/irmaa/IrmaaTables";
import {
  ALT_GAP_2027,
  CMS_2027_EXPECTED,
  LAST_CMS_RELEASE,
  MISSING_CPI_MONTH,
  S26,
  S27,
  ageLabel,
  inWords,
  listAnd,
  oneDollarOver,
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
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { SRC } from "@/data/params/sources";
import { LIFE_CHANGING_EVENTS } from "@/data/params/medicare";
import { AMENDED_RETURN_WINDOW_YEARS, IRMAA_INDEXING_RULE, IRMAA_SRC } from "@/data/params/irmaa-extra";
import { QCD, SENIOR_DEDUCTION } from "@/data/params/tax";
import { money, money2, moneySmart } from "@/lib/format";

const SLUG = "irmaa-calculator";
const THIS_YEAR = SITE.copyrightYear;

const single27 = oneDollarOver(S27.premiumYear, "single");
const couple27 = oneDollarOver(S27.premiumYear, "mfj", 2);
const min27 = yearlyPerPerson(S27, 1);
const max27 = yearlyPerPerson(S27, 5);
/** Extra yearly cost per person of stepping from one tier into the next (2027 projected). */
const jump27 = (t: 2 | 3 | 4 | 5) => yearlyPerPerson(S27, t) - yearlyPerPerson(S27, (t - 1) as 1 | 2 | 3 | 4);
const qcd = QCD[THIS_YEAR as keyof typeof QCD].value;
const jointMultiple = IRMAA_INDEXING_RULE.value.jointMultiple;

const TITLE = `IRMAA Calculator ${S26.premiumYear} & ${S27.premiumYear}: Medicare Surcharge`;
const DESC = `Free IRMAA calculator: enter your income to see your ${S26.premiumYear} or ${S27.premiumYear} Medicare Part B and Part D surcharge, your tier, the next cliff, and how to appeal.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: `What are the IRMAA brackets for ${S27.premiumYear}?`,
    a: `Projected ${S27.premiumYear} IRMAA starts above ${money(S27.individualBounds[0])} of ${S27.magiTaxYear} MAGI for single filers and ${money(S27.jointBounds[0])} for joint filers, with further lines at ${listAnd([...S27.individualBounds.slice(1), S27.topIndividual].map(money))} (joint ${listAnd([...S27.jointBounds.slice(1), S27.topJoint].map(money))}). Part B would cost ${money2(S27.standardPartB + S27.partBAddOn[1])} to ${money2(S27.standardPartB + S27.partBAddOn[5])} a month. CMS is expected to confirm the official table in ${CMS_2027_EXPECTED}.`,
  },
  {
    q: "Does IRMAA apply to both spouses?",
    a: `Yes. If you file jointly and both of you have Medicare, each of you pays the surcharge, based on your combined income. In ${S27.premiumYear} (projected), going one dollar over the first joint line costs ${moneySmart(couple27.yearly)} for the year. If only one spouse is on Medicare, only that spouse pays it.`,
  },
  {
    q: "Do Roth conversions count toward IRMAA?",
    a: "Yes. The amount you convert is taxable income that year, so it raises your MAGI and can push you into a higher IRMAA tier two years later. It affects only that one year’s premiums, so a well-sized conversion is often still worth doing. Size it to stop just under a line rather than just over one.",
  },
  {
    q: "Does tax-exempt interest count for IRMAA?",
    a: "Yes. Medicare adds municipal-bond interest back to your adjusted gross income even though it is free of federal income tax. Moving money into tax-free bonds won’t lower IRMAA. Qualified charitable distributions and qualified Roth withdrawals, which never enter your adjusted gross income, will.",
  },
  {
    q: "How long does IRMAA last?",
    a: `One year at a time. Social Security redetermines it every year from the newest tax return the IRS has, so a one-off jump in income raises only one year of premiums. If your income stays high you keep paying it. The lower income lines rise each year with inflation; the ${money(S27.topIndividual)} top line is fixed until ${IRMAA_INDEXING_RULE.value.topTierFirstIndexedYear}.`,
  },
  {
    q: `Does the new ${money(SENIOR_DEDUCTION.value.perPerson)} senior deduction lower IRMAA?`,
    a: `No. The senior deduction of up to ${money(SENIOR_DEDUCTION.value.perPerson)} per person is taken after adjusted gross income is figured, so it lowers your taxable income but not the MAGI Medicare uses. Only things that reduce adjusted gross income, or keep income off your return entirely, lower IRMAA.`,
  },
  {
    q: "How is IRMAA paid?",
    a: "If you receive Social Security, the Part B and Part D surcharges come out of your monthly benefit along with the standard Part B premium. If you aren’t collecting benefits yet, Medicare bills you. The Part D surcharge is paid to Medicare, not to your drug plan, even if you have a Medicare Advantage plan.",
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "IRMAA Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "IRMAA Calculator", path: `/${SLUG}` }]}
        eyebrow="Medicare"
        icon="shield"
        title={
          <>
            IRMAA calculator for{" "}
            <span className="italic font-normal text-sun-ink">
              {S26.premiumYear} and {S27.premiumYear}
            </span>
          </>
        }
        lead={
          <p>
            IRMAA is the extra Medicare charge for higher incomes. For {S27.premiumYear} it is projected to start above {money(S27.individualBounds[0])} of{" "}
            {S27.magiTaxYear} income for single filers ({money(S27.jointBounds[0])} joint), adding {money(min27)} to {money(max27)} a year per person. Enter
            your income to see your tier, the cost, and how close you are to the next cliff.
          </p>
        }
        chips={
          <>
            <StatusChip status="official">{S26.premiumYear} CMS figures</StatusChip>
            <StatusChip status="projected">{S27.premiumYear} projected</StatusChip>
          </>
        }
      />

      <IrmaaCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What is IRMAA?</h2>
          <p className="answer">
            IRMAA, the income-related monthly adjustment amount, is an extra charge added to your Medicare Part B and Part D premiums when your income from two
            years earlier is above a set line: for {S27.premiumYear}, a projected {money(S27.individualBounds[0])} for single filers and{" "}
            {money(S27.jointBounds[0])} for joint filers. At or below it, you pay the standard premium.
          </p>
          <p>
            It isn’t a penalty and it isn’t permanent. Social Security works it out again every year from your newest tax return. And it is charged per person:
            if you file jointly and both of you are on Medicare, you each pay it.
          </p>

          <h2>Which year’s income sets your IRMAA?</h2>
          <p className="answer">
            Medicare looks back two years. Your {S26.premiumYear} premiums are based on your {S26.magiTaxYear} tax return, and your {S27.premiumYear} premiums
            on your {S27.magiTaxYear} return. If the IRS doesn’t have that return yet, Social Security temporarily uses the year before and corrects it once the
            newer return arrives.
          </p>
          <p>
            That lag is what catches people. The income you have in {THIS_YEAR} (this year’s IRA withdrawals, Roth conversions and capital gains) sets your{" "}
            {THIS_YEAR + 2} premiums. Nobody knows the {THIS_YEAR + 2} lines yet, but they rise with inflation, so the {S27.premiumYear} table is a fair,
            slightly cautious guide for planning this year.
          </p>

          <h2>What counts as income for IRMAA?</h2>
          <p className="answer">
            IRMAA uses your modified adjusted gross income (MAGI): the adjusted gross income on your Form 1040 plus any tax-exempt interest. On a joint return
            it is the couple’s combined figure. Most retirement income counts, including the taxable part of your Social Security.
          </p>
          <p>
            <strong>Counts:</strong>
          </p>
          <ul>
            <li>Wages, self-employment income, pensions and annuities</li>
            <li>Traditional IRA and 401(k) withdrawals, including required minimum distributions (RMDs)</li>
            <li>Roth conversions, in the year you convert</li>
            <li>The taxable part of your Social Security</li>
            <li>Interest (municipal-bond interest too), dividends and capital gains, including a home-sale gain above your exclusion</li>
          </ul>
          <p>
            <strong>Doesn’t count:</strong>
          </p>
          <ul>
            <li>Qualified Roth IRA withdrawals</li>
            <li>Qualified charitable distributions (QCDs) sent straight from your IRA to a charity</li>
            <li>The untaxed part of your Social Security</li>
            <li>
              The {money(SENIOR_DEDUCTION.value.perPerson)} senior deduction and your standard deduction don’t reduce it either: both come off after adjusted
              gross income is figured
            </li>
          </ul>

          <h2>How do IRMAA cliffs work?</h2>
          <p className="answer">
            IRMAA isn’t phased in. Each tier is a cliff: one dollar over a line and you pay that tier’s full surcharge for the whole year. In {S27.premiumYear}{" "}
            (projected), a single filer at {money(single27.line)} pays nothing extra, while {money(single27.over)} costs {moneySmart(single27.yearly)} for the
            year.
          </p>
          <p>
            For a married couple who are both on Medicare the jump is twice as big, {moneySmart(couple27.yearly)}. The next three cliffs are bigger still,
            about {money(jump27(2))} a year per person each, while the last one, into the top tier, adds {money(jump27(5))}. Here is the projected{" "}
            {S27.premiumYear} table; the calculator above shows where you sit on it.
          </p>
          <IrmaaBracketTable year={S27.premiumYear} />
          <p>
            Want the official numbers in force now? See the <Link href="/irmaa-brackets-2026">{S26.premiumYear} IRMAA brackets</Link>, or how we built the{" "}
            <Link href="/irmaa-brackets-2027">{S27.premiumYear} projection</Link>.
          </p>

          <h2>How can you keep IRMAA down?</h2>
          <p className="answer">
            Plan your income two years ahead and aim to land just under a line, not just over it. The most useful moves are qualified charitable distributions
            from age {ageLabel(qcd.minAge)}, Roth conversions sized to stop below the next line, and spreading large capital gains over more than one tax year.
          </p>
          <ul>
            <li>
              <strong>Fill up to the line, not past it.</strong> If you are converting to a Roth IRA, convert until you are a few thousand dollars under a
              threshold. Leave a cushion: a surprise year-end fund distribution can tip you over.
            </li>
            <li>
              <strong>Give from your IRA, not your checkbook.</strong> From age {ageLabel(qcd.minAge)}, a QCD counts toward your RMD but never enters your
              income — up to {money(qcd.limit ?? 0)} per person in {THIS_YEAR}.
            </li>
            <li>
              <strong>Don’t buy municipal bonds to dodge IRMAA.</strong> Their interest is added straight back.
            </li>
            <li>
              <strong>Watch the first-year RMD double-up.</strong> Delaying your first RMD to April stacks two withdrawals in one year. Our{" "}
              <Link href="/rmd-calculator">RMD calculator</Link> shows both.
            </li>
            <li>
              <strong>Sometimes paying IRMAA once is the right call.</strong> One big Roth conversion that triggers a single year of surcharges can cost less
              than a decade of larger RMDs keeping you in a tier every year. Run both before you decide.
            </li>
            <li>
              <strong>Plan for the survivor.</strong> Below the top tier, the joint lines are exactly{" "}
              {jointMultiple === 2 ? "twice" : `${jointMultiple} times`} the single lines. After
              one spouse dies, the other soon files as single on much the same income, and IRMAA often starts.
            </li>
          </ul>

          <h2>Can you appeal IRMAA?</h2>
          <p className="answer">
            Yes, if your income dropped because of one of {inWords(LIFE_CHANGING_EVENTS.length)} life-changing events, such as retiring, cutting back your work,
            or the death of a spouse. You file Form SSA-44 with Social Security and give a newer year’s income. The drop has to move you into a lower tier.
          </p>
          <p>The qualifying events are:</p>
          <ul>
            {LIFE_CHANGING_EVENTS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p>
            Retirement is the classic case. Your {S27.magiTaxYear} return shows a full year of salary, but you stopped working in {THIS_YEAR}: Social Security
            can use your lower {THIS_YEAR} income instead. A one-time spike from a Roth conversion or a sale doesn’t qualify. If the IRS figure was simply
            wrong, or you amended that year’s return within {AMENDED_RETURN_WINDOW_YEARS.value} years, ask Social Security to use the corrected number. The
            calculator above tells you whether an SSA-44 request would change your tier.
          </p>
          <p>
            One trap: after a divorce or a spouse’s death, the newer year is judged on the single table, and below the top tier the single lines are{" "}
            {jointMultiple === 2 ? "half" : `1/${jointMultiple} of`} the joint ones. A widow whose income fell can still land in a higher tier, so check before
            you file.
          </p>

          <h2>Are the {S27.premiumYear} IRMAA brackets final?</h2>
          <p className="answer">
            Not yet. CMS is expected to publish the official {S27.premiumYear} table in {CMS_2027_EXPECTED}; last year’s came out on {LAST_CMS_RELEASE}. Our{" "}
            {S27.premiumYear} lines come from the inflation formula written into the law, and the dollar amounts from the Medicare Trustees Report and the
            official Part D base premium.
          </p>
          <p>
            One wrinkle: the {MISSING_CPI_MONTH} inflation figure was never published because of the government shutdown. Depending on how CMS handles it, the
            second, third and fourth lines could land {money(ALT_GAP_2027.individual)} lower ({money(ALT_GAP_2027.joint)} for joint filers). The calculator
            warns you if your income is that close. We’ll update everything the day CMS publishes.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.cms2026Premiums,
            SRC.fr2026PartB,
            SRC.ssaPomsIrmaa,
            SRC.statuteIrmaa,
            IRMAA_SRC.ecfr418_1115,
            IRMAA_SRC.ecfr418_1135,
            IRMAA_SRC.ecfr418_1205,
            IRMAA_SRC.ecfr418_1215,
            IRMAA_SRC.ecfr423_286,
            SRC.ssaPomsLce,
            IRMAA_SRC.ssa44,
            SRC.medicareTrustees2026,
            SRC.cmsPartD2027,
            SRC.blsCpiU,
            IRMAA_SRC.blsShutdownFaq,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
