import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { SsTaxCalculator } from "@/components/calculators/ss-tax/SsTaxCalculator";
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
import { SS_TAX_THRESHOLDS, SENIOR_DEDUCTION, ADDITIONAL_STD_2026, BRACKETS_2026, QCD, SS_WITHHOLDING_RATES, IRS_2027_ADJUSTMENTS } from "@/data/params/tax";
import { SRC_SS_TAX, SS_INCLUSION, CAP_GAINS_RATES, SSA_OBBBA_CLAIM, NON_ITEMIZER_CHARITY } from "@/data/params/ss-tax-extra";
import { computeFedTax, type FedTaxInput } from "@/lib/calc/fed-tax";
import { money, pct, longDate } from "@/lib/format";

const SLUG = "taxable-social-security-calculator";
const TAX_YEAR = 2026;

// ---- every figure below comes from src/data/params (or the tested engine); nothing is typed in by hand ----
const TH = SS_TAX_THRESHOLDS.value;
const { tier1, tier2, maxFraction } = SS_INCLUSION.value;
const SD = SENIOR_DEDUCTION.value;
const SD_FIRST = SD.years[0];
const SD_LAST = SD.years[SD.years.length - 1];
const SD_ZERO_SINGLE = SD.phaseoutStart.single + SD.perPerson / SD.phaseoutRate;
const SD_ZERO_JOINT = SD.phaseoutStart.mfj + SD.perPerson / SD.phaseoutRate;
const SINGLE_RATES = BRACKETS_2026.value.single.map((r) => r[1]);
const [R10, R12, R22] = SINGLE_RATES;
const QCD_NOW = QCD[TAX_YEAR].value;
const W4V = SS_WITHHOLDING_RATES.value.map((r) => pct(r, 0));
const W4V_TEXT = `${W4V.slice(0, -1).join(", ")} or ${W4V[W4V.length - 1]}`;
const halfAge = (n: number) => (n % 1 === 0.5 ? `${Math.floor(n)}½` : String(n));

/** Worked example 1 — a single retiree, 65+, with a fixed Social Security check and rising IRA withdrawals. */
const EX_SS = 24000;
const EX_ROWS = [0, 10000, 20000, 30000, 40000, 60000].map((ira) => ({
  ira,
  r: computeFedTax({ year: TAX_YEAR, filingStatus: "single", ssBenefits: EX_SS, iraDistributions: ira, people65: 1 }),
}));

/** Worked example 2 — a couple, both 65+: benefits taxable, yet no tax because of the deductions. */
const COUPLE: FedTaxInput = { year: TAX_YEAR, filingStatus: "mfj", ssBenefits: 40000, iraDistributions: 30000, people65: 2 };
const COUPLE_R = computeFedTax(COUPLE);
const COUPLE_NO_SENIOR = computeFedTax({ ...COUPLE, applySeniorDeduction: false });

const TITLE = `Social Security Tax Calculator ${TAX_YEAR}: How Much Is Taxable?`;
const DESC = `How much of your Social Security is taxable? Run the IRS provisional income worksheet and see your ${TAX_YEAR} federal tax, ${money(SD.perPerson)} senior deduction and tax torpedo.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: "Is Social Security taxable after age 65 or 70?",
    a: `Yes. Age never makes benefits tax-free; only income does. At any age, if half your benefits plus your other income is over ${money(TH.base.single)} (${money(TH.base.mfj)} for joint filers), part of your benefits is taxable. Turning 65 does bring a bigger standard deduction and, for ${SD_FIRST}–${SD_LAST}, the ${money(SD.perPerson)} senior deduction, which often cuts the actual tax to zero.`,
  },
  {
    q: "Do I have to pay tax if Social Security is my only income?",
    a: `Usually not. With no other income, your provisional income is just half your benefits, which rarely tops the ${money(TH.base.single)} or ${money(TH.base.mfj)} base amount, so none of your benefits are taxable. The exception is married people filing separately who lived together at any time: their base amount is zero, so part of their benefits is taxable even with no other income.`,
  },
  {
    q: "Do the Medicare premiums taken out of my check count as benefits?",
    a: "Yes. Use the net benefits in box 5 of your SSA-1099. That figure still includes the Medicare Part B premiums (and any Part C or D premiums) Social Security deducted before paying you. Many people use the smaller amount that reaches their bank account and understate their benefits. If you itemize, those premiums can count as medical expenses.",
  },
  {
    q: "Are disability and survivor benefits taxed the same way?",
    a: "Yes. Social Security Disability Insurance (SSDI), survivor and spousal benefits all go through the same IRS worksheet and thresholds as retirement benefits. Supplemental Security Income (SSI) is different: it is not taxable at all. Benefits paid for a child count as the child's income, not the parent's.",
  },
  {
    q: "Will the thresholds ever be raised for inflation?",
    a: `Not unless Congress changes the law. The ${money(TH.base.single)}, ${money(TH.base.mfj)}, ${money(TH.adjusted.single)} and ${money(TH.adjusted.mfj)} amounts are written into the tax code and, unlike the brackets and the standard deduction, are not indexed. Bills to repeal the tax on benefits have been introduced, but none had become law as of ${longDate(SITE.dataVerifiedOn)}.`,
  },
  {
    q: "Can delaying Social Security lower the tax on it?",
    a: "Often, yes, through timing. Retirees who live on IRA withdrawals or do Roth conversions in their 60s, then claim a larger check at 70, have less IRA money left to stack on top of their benefits later. That can shrink or skip the tax torpedo. Weigh it against the break-even age for delaying.",
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "Taxable Social Security Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "Taxable Social Security Calculator", path: `/${SLUG}` }]}
        eyebrow="Taxes"
        icon="tax"
        title={
          <>
            Is your Social Security <span className="italic font-normal text-sun-ink">taxable?</span>
          </>
        }
        lead={
          <p>
            Up to {pct(maxFraction, 0)} of your benefits can be taxable. It depends on your provisional income — half your benefits plus all your other income,
            including tax-exempt interest — compared with {money(TH.base.single)} ({money(TH.base.mfj)} if married filing jointly). Enter your numbers for the exact IRS
            worksheet result and your {TAX_YEAR} federal tax.
          </p>
        }
        chips={
          <>
            <StatusChip status="official">IRS Pub 915 & {TAX_YEAR} brackets</StatusChip>
            <StatusChip status={IRS_2027_ADJUSTMENTS.status}>{TAX_YEAR + 1} brackets not announced</StatusChip>
          </>
        }
      />

      <SsTaxCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>Is Social Security taxable?</h2>
          <p className="answer">
            Yes, for many retirees — but never all of it. Up to {pct(maxFraction, 0)} of your benefits can be counted as taxable income. If half your benefits plus
            all your other income stays at or below {money(TH.base.single)} ({money(TH.base.mfj)} for married couples filing jointly), none of your Social Security is
            taxed by the federal government.
          </p>
          <p>
            Congress set those thresholds decades ago and, unlike the tax brackets and the standard deduction, they have never been adjusted for inflation. Each
            cost-of-living raise pushes a few more retirees over the line, which is why a couple who paid nothing on their benefits ten years ago may pay today with
            no change in how they live.
          </p>
          <p>
            “Taxable” doesn’t mean you lose that share. The taxable part is added to your other income, and you pay your normal rate on it — often {pct(R10, 0)} or{" "}
            {pct(R12, 0)}, and sometimes nothing once your deductions are subtracted.
          </p>

          <h2>How much of my Social Security is taxable?</h2>
          <p className="answer">
            Between 0% and {pct(maxFraction, 0)}, depending on your filing status and provisional income. The IRS worksheet taxes {pct(tier1, 0)} of each dollar of
            provisional income above the base amount, then {pct(tier2, 0)} of each dollar above the adjusted base amount, and never more than {pct(maxFraction, 0)} of
            your benefits in total.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th>Filing status</th>
                  <th>Nothing taxable if provisional income is</th>
                  <th>Up to {pct(tier1, 0)} taxable</th>
                  <th>Up to {pct(tier2, 0)} taxable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Single, head of household, surviving spouse</td>
                  <td>{money(TH.base.single)} or less</td>
                  <td>
                    {money(TH.base.single)} – {money(TH.adjusted.single)}
                  </td>
                  <td>Over {money(TH.adjusted.single)}</td>
                </tr>
                <tr>
                  <td className="strong">Married filing jointly</td>
                  <td>{money(TH.base.mfj)} or less</td>
                  <td>
                    {money(TH.base.mfj)} – {money(TH.adjusted.mfj)}
                  </td>
                  <td>Over {money(TH.adjusted.mfj)}</td>
                </tr>
                <tr>
                  <td className="strong">Married filing separately, lived apart all year</td>
                  <td>{money(TH.base.mfsApart)} or less</td>
                  <td>
                    {money(TH.base.mfsApart)} – {money(TH.adjusted.mfsApart)}
                  </td>
                  <td>Over {money(TH.adjusted.mfsApart)}</td>
                </tr>
                <tr>
                  <td className="strong">Married filing separately, lived together</td>
                  <td>{money(TH.base.mfs)}</td>
                  <td>—</td>
                  <td>From the first dollar</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Watch the last row. Married, filing separately and living together at any point in the year means a base amount of {money(TH.base.mfs)}:{" "}
            {pct(tier2, 0)} of your provisional income is taxable from the first dollar. Filing separately to “protect” benefits almost always backfires.
          </p>
          <p>
            Here is how it plays out for a single retiree, 65 or older, with {money(EX_SS)} of Social Security, as IRA withdrawals rise ({TAX_YEAR} tax figures):
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th>IRA withdrawals</th>
                  <th>Provisional income</th>
                  <th>Taxable benefits</th>
                  <th>Share taxable</th>
                  <th>Federal tax</th>
                </tr>
              </thead>
              <tbody>
                {EX_ROWS.map(({ ira, r }) => (
                  <tr key={ira}>
                    <td className="strong">{money(ira)}</td>
                    <td>{money(r.ss.provisionalIncome)}</td>
                    <td>{money(r.ss.taxable)}</td>
                    <td>{pct(r.ss.taxablePct, 0)}</td>
                    <td>{money(r.totalTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>What is provisional income?</h2>
          <p className="answer">
            Provisional income — Social Security’s website calls it combined income — is half of your Social Security plus all your other income, including tax-exempt
            interest. It is figured before the standard or itemized deduction, so neither those nor the new senior deduction lowers it.
          </p>
          <p>Counts in full:</p>
          <ul>
            <li>IRA, 401(k) and 403(b) withdrawals, including RMDs and Roth conversions</li>
            <li>Pensions, annuities and wages</li>
            <li>Interest, dividends and capital gains — even gains taxed at {pct(CAP_GAINS_RATES.value.zero, 0)}</li>
            <li>Tax-exempt municipal bond interest</li>
          </ul>
          <p>Doesn’t count:</p>
          <ul>
            <li>Qualified Roth IRA withdrawals</li>
            <li>Qualified charitable distributions (QCDs) sent straight from an IRA to charity</li>
            <li>Money you take from savings, or the part of an investment sale that is your original cost</li>
            <li>Health savings account (HSA) withdrawals for medical bills</li>
          </ul>
          <p>
            The only subtractions allowed are the “adjustments” on Schedule 1, such as half of self-employment tax or a deductible traditional IRA contribution — and
            not even all of those: student-loan interest is added back.
          </p>
          <p>
            The mistake we see most: buying municipal bonds to keep Social Security untaxed. The interest is free of federal tax itself, but it goes straight into
            provisional income and can make more of your benefits taxable.
          </p>

          <h2>Did the One Big Beautiful Bill make Social Security tax-free?</h2>
          <p className="answer">
            No. The law signed on {longDate(SRC_SS_TAX.pl11921.published)} left the Social Security formula untouched. It added a temporary {money(SD.perPerson)} deduction for each person 65 or older, for tax years{" "}
            {SD_FIRST}–{SD_LAST}. For many retirees that deduction wipes out the tax, but up to {pct(maxFraction, 0)} of benefits still counts as taxable income.
          </p>
          <p>
            Social Security’s own press release said “{SSA_OBBBA_CLAIM.value.wording} of Social Security beneficiaries will no longer pay federal income taxes on their
            benefits.” That describes the effect of the bigger deduction, not a change to the rules — and the deduction ends after {SD_LAST} unless Congress extends
            it.
          </p>
          <p>
            Example: a couple, both 65, with {money(COUPLE.ssBenefits)} of Social Security and {money(COUPLE.iraDistributions ?? 0)} of IRA withdrawals. The worksheet still
            makes <strong>{money(COUPLE_R.ss.taxable)}</strong> of their benefits taxable. After the standard deduction and{" "}
            {money(COUPLE_R.senior.total)} of senior deductions they owe <strong>{money(COUPLE_R.totalTax)}</strong>; without the senior deduction they would owe{" "}
            {money(COUPLE_NO_SENIOR.totalTax)}.
          </p>
          <ul>
            <li>
              {money(SD.perPerson)} per person 65 or older — {money(SD.perPerson * 2)} for a married couple who both qualify.
            </li>
            <li>
              It shrinks by {pct(SD.phaseoutRate, 0)} of modified adjusted gross income above {money(SD.phaseoutStart.single)} ({money(SD.phaseoutStart.mfj)} joint) and
              is gone at {money(SD_ZERO_SINGLE)} ({money(SD_ZERO_JOINT)} joint).
            </li>
            <li>
              You get it whether you itemize or not, on top of the extra standard deduction for age ({money(ADDITIONAL_STD_2026.value.unmarried)} single or head of household,{" "}
              {money(ADDITIONAL_STD_2026.value.married)} per married person in {TAX_YEAR}).
            </li>
            <li>Married couples must file jointly, and each person needs a valid Social Security number.</li>
            <li>It doesn’t lower adjusted gross income, so it changes neither your taxable benefits nor your Medicare IRMAA surcharge.</li>
          </ul>

          <h2>What is the Social Security tax torpedo?</h2>
          <p className="answer">
            It’s the income range where each extra dollar you withdraw also makes {Math.round(tier1 * 100)} or {Math.round(tier2 * 100)} cents of Social Security
            taxable. Your real rate there is {1 + tier1} or {1 + tier2} times your bracket, so a {pct(R12, 0)} bracket behaves like {pct(R12 * (1 + tier2), 1)} and a{" "}
            {pct(R22, 0)} bracket like {pct(R22 * (1 + tier2), 1)}.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th>Your bracket</th>
                  <th>In the {pct(tier1, 0)} zone</th>
                  <th>In the {pct(tier2, 0)} zone</th>
                  <th>…plus senior deduction phasing out (one / two people 65+)</th>
                </tr>
              </thead>
              <tbody>
                {[R10, R12, R22].map((rate) => (
                  <tr key={rate}>
                    <td className="strong">{pct(rate, 0)}</td>
                    <td>{pct(rate * (1 + tier1), 1)}</td>
                    <td>{pct(rate * (1 + tier2), 1)}</td>
                    <td>
                      {rate === R22
                        ? `${pct(rate * (1 + tier2) * (1 + SD.phaseoutRate), 1)} / ${pct(rate * (1 + tier2) * (1 + 2 * SD.phaseoutRate), 1)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The calculator above draws this curve for your own numbers. Older articles quote higher peaks because they use older, higher tax brackets. One more trap: if
            you have qualified dividends or long-term gains near the top of the {pct(CAP_GAINS_RATES.value.zero, 0)} capital-gains band, each extra IRA dollar can also
            push gains into the {pct(CAP_GAINS_RATES.value.mid, 0)} band — real rates near{" "}
            {pct((R12 + CAP_GAINS_RATES.value.mid) * (1 + tier2), 2)} are possible.
          </p>
          <p>
            The torpedo has an end: once {pct(maxFraction, 0)} of your benefits is taxable, the extra charge stops and you are back to your normal bracket. Before
            you decide how much to withdraw or convert each year, find where your zone starts and ends — the chart in the calculator shows it — because a dollar
            inside the zone can cost nearly twice what the same dollar costs on either side of it.
          </p>

          <h2>How can I reduce the tax on my Social Security?</h2>
          <p className="answer">
            Lower your provisional income, not just your taxable income. The levers that work are qualified charitable distributions, Roth money, and timing: doing
            more of your IRA withdrawals or Roth conversions in the years before benefits start, so less lands on top of Social Security later.
          </p>
          <ul>
            <li>
              <strong>QCDs from age {halfAge(QCD_NOW.minAge)}.</strong> Up to {money(QCD_NOW.limit ?? 0)} per person in {TAX_YEAR} can go straight from an IRA to
              charity, count toward your RMD and never enter provisional income. That beats the new deduction for non-itemizers ({money(NON_ITEMIZER_CHARITY.value.single)}
              , {money(NON_ITEMIZER_CHARITY.value.mfj)} joint), which comes off after the worksheet.
            </li>
            <li>
              <strong>Roth conversions in the gap years.</strong> Between retirement and claiming Social Security there are no benefits for a conversion to drag
              into tax, so it costs only your bracket rate — and every dollar converted is one fewer dollar of RMDs stacked on your benefits later. Within two years of
              starting Medicare, also check it against the IRMAA (income-related Medicare surcharge) brackets: premiums look back two years.
            </li>
            <li>
              <strong>Spend from Roth or savings inside the torpedo zone</strong> and from the IRA above it.
            </li>
            <li>
              <strong>Spread one-off income.</strong> A large capital gain in one year can make {pct(maxFraction, 0)} of that year’s benefits taxable.
            </li>
          </ul>
          <p>
            If we had to pick one move for a charitable retiree over {halfAge(QCD_NOW.minAge)} with an IRA, it’s the QCD — the only giving strategy that reaches back
            into the Social Security worksheet.
          </p>

          <h2>Should I have federal tax withheld from Social Security?</h2>
          <p className="answer">
            If you will owe tax, yes — or pay quarterly estimated tax instead. Withholding is voluntary: file Form W-4V with Social Security and choose {W4V_TEXT} of each
            payment. No other percentages and no flat dollar amounts are allowed, and nothing is withheld unless you ask.
          </p>
          <p>
            Those four choices are coarse. Having tax withheld from IRA withdrawals or a pension, where you can pick any amount, is usually more precise. The calculator
            shows the smallest W-4V rate that covers your estimate.
          </p>

          <h2>Does my state tax Social Security too?</h2>
          <p className="answer">
            Most states don’t tax Social Security at all, and the few that do usually exempt it below an income limit or offer a retiree deduction. This calculator
            covers federal tax only, so check your own state’s rules separately — they can change which withdrawals are cheapest.
          </p>
          <p>
            See <Link href="/state-retirement-taxes">state taxes on retirement income</Link> for every state’s treatment of Social Security, pensions and IRA
            withdrawals.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.irsPub915,
            SRC.irc86,
            SRC_SS_TAX.crsR48613,
            SRC_SS_TAX.pl11921,
            SRC.irsSeniorDeduction,
            SRC_SS_TAX.irsSchedule1A,
            SRC.irsRevProc202532,
            SRC_SS_TAX.irsNiitQa,
            SRC.irsQcd,
            SRC_SS_TAX.irsFormW4V,
            SRC_SS_TAX.ssaWithholding,
            SRC_SS_TAX.ssaPress20250703,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
