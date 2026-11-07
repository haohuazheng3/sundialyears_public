import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { InheritedCalculator } from "@/components/calculators/inherited/InheritedCalculator";
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
import { RMD_AGE_RULES, SINGLE_LIFE } from "@/data/params/rmd";
import { PUB590B_BENEFICIARY_EXAMPLE, RMD_SRC } from "@/data/params/rmd-extra";
import { SRC_INHERITED, TEN_YEAR_RELIEF } from "@/data/params/inherited-extra";
import { money, pct } from "@/lib/format";
import {
  ANNUAL_FROM,
  CLOSE_GAP,
  DETERMINATION_DATE,
  EARLY_RATE,
  EXCISE_RATE,
  EXCISE_RATE_CORRECTED,
  FIVE,
  MAJORITY_AGE,
  PENALTY_FREE_AGE,
  RELIEF_YEARS,
  SECURE_FIRST_DEATH_YEAR,
  TEN,
  ageLabel,
  reliefRange,
} from "@/components/calculators/inherited/copy";

const SLUG = "inherited-ira-rmd-calculator";
const TITLE = `Inherited IRA RMD Calculator: ${TEN}-Year Rule & Yearly RMDs`;
const DESC = `Inherited an IRA or 401(k)? Get your ${SITE.copyrightYear} or ${SITE.copyrightYear + 1} required withdrawal, the ${TEN}-year deadline, spouse options and the exact IRS math under the final rules.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

// ── Values used in the prose (all derived from cited params) ─────────────────────────────────────────────────────────
const THIS_YEAR = SITE.copyrightYear;
const AGE_RULES = RMD_AGE_RULES.value;
const RMD_AGE_NOW = AGE_RULES[AGE_RULES.length - 2].age;
const RMD_AGE_LATER = AGE_RULES[AGE_RULES.length - 1].age;
const FIRST_NOW_BIRTH_YEAR = Number(AGE_RULES[AGE_RULES.length - 3].bornBefore!.slice(0, 4));
const FIRST_LATER_BIRTH_YEAR = Number(AGE_RULES[AGE_RULES.length - 2].bornBefore!.slice(0, 4));
const AGE_59H = ageLabel(PENALTY_FREE_AGE);
const EARLY = pct(EARLY_RATE);

/** IRS Pub. 590-B example: owner died 2021, beneficiary 55 in 2022 → 2026 divisor = 31.6 − 4. */
const EX = PUB590B_BENEFICIARY_EXAMPLE.value;
const EX_START = SINGLE_LIFE[EX.beneficiaryAgeInFirstYear];
const EX_YEARS = EX.distributionYear - EX.firstYear;
const EX_DIVISOR = Math.round((EX_START - EX_YEARS) * 10) / 10;
const EX_BAL = 100000;

/** Deaths from the first SECURE Act year through this year → 10-year deadline and waived years. */
const DEATH_YEARS = Array.from({ length: THIS_YEAR - SECURE_FIRST_DEATH_YEAR + 1 }, (_, i) => SECURE_FIRST_DEATH_YEAR + i);
const coveredByRelief = (y: number) => (TEN_YEAR_RELIEF.value.coveredDeathYears as readonly number[]).includes(y);
const waivedFor = (y: number) => (coveredByRelief(y) ? RELIEF_YEARS.filter((r) => r > y) : []);
const yearsSpan = (ys: number[]) => (ys.length === 0 ? "None" : ys.length === 1 ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`);

const LE_AGES = [25, 35, 45, 50, 55, 60, 65, 70, 75, 80];
/** Illustration only: how far the divisor has fallen a few years in. */
const LATER_YEARS = 5;
const fmtFactor = (n: number) => n.toFixed(1);

const FAQ: FaqItem[] = [
  {
    q: "Do I have to take an RMD from an inherited IRA every year?",
    a: `Only in some cases. Eligible beneficiaries taking life-expectancy payouts do, and so does anyone under the ${TEN}-year rule if the original owner had already reached their required beginning date. If the owner died before that date, or the account is a Roth, a non-eligible beneficiary owes nothing until the deadline year — but must empty the account by then.`,
  },
  {
    q: `What is the ${TEN}-year rule for inherited IRAs?`,
    a: `Most non-spouse heirs of owners who died in ${SECURE_FIRST_DEATH_YEAR} or later must empty the account by December 31 of the year containing the ${TEN}th anniversary of the death — a ${THIS_YEAR - 1} death means December 31, ${THIS_YEAR - 1 + TEN}. If the owner died on or after their required beginning date, a yearly minimum is also due in each of the years before the deadline.`,
  },
  {
    q: "Can I roll an inherited IRA into my own IRA?",
    a: "Only if you are the surviving spouse: a spouse can roll it over or simply treat it as their own. Everyone else must keep it as an inherited IRA in the original owner’s name and move it only by direct trustee-to-trustee transfer. Money paid out to you can’t be put back, so a check made out to you is a taxable withdrawal.",
  },
  {
    q: "What happens if I miss an inherited IRA RMD?",
    a: `You owe an excise tax of ${pct(EXCISE_RATE)} of the shortfall, cut to ${pct(EXCISE_RATE_CORRECTED)} if you take the missed amount and file Form 5329 within the correction window. The IRS can also waive it entirely for a reasonable error you are fixing; attach an explanation to the form. Missed ${reliefRange} yearly RMDs under the ${TEN}-year rule were waived and don’t have to be made up.`,
  },
  {
    q: `Do I pay the ${EARLY} early-withdrawal penalty on an inherited IRA?`,
    a: `No. Money paid to a beneficiary because of the owner’s death is exempt from the ${EARLY} additional tax at any age. Withdrawals from a traditional inherited IRA are still taxed as ordinary income. A surviving spouse who makes the IRA their own loses this exemption until they reach ${AGE_59H}.`,
  },
  {
    q: `Does the ${TEN}-year rule apply if the owner died before ${SECURE_FIRST_DEATH_YEAR}?`,
    a: `No. If the owner died before ${SECURE_FIRST_DEATH_YEAR}, individual beneficiaries keep the old “stretch” rules: yearly RMDs over their life expectancy and no ${TEN}-year deadline. For non-spouse heirs the divisor was reset under the 2022 IRS tables: the new factor at their original starting age, minus 1 for each year since.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "Inherited IRA RMD Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "Inherited IRA RMD Calculator", path: `/${SLUG}` }]}
        eyebrow="RMDs & IRAs"
        icon="inherit"
        title={
          <>
            Inherited IRA RMD calculator <span className="italic font-normal text-sun-ink">for {THIS_YEAR} and {THIS_YEAR + 1}</span>
          </>
        }
        lead={
          <p>
            Most adult children and grandchildren must empty an inherited IRA within {TEN} years — and if the original owner died on or after their required
            beginning date (April 1 after the year they reached RMD age), take a required minimum distribution (RMD) every year along the way. Enter the dates and balance below to see what you owe this year, your final deadline, and the IRS
            math.
          </p>
        }
        chips={<StatusChip status="official">Final IRS rules (T.D. 10001)</StatusChip>}
      />

      <InheritedCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>Which inherited IRA rules apply to me?</h2>
          <p className="answer">
            Two facts decide it: who you are to the person who died, and whether they died before or after their required beginning date — April 1 after the year they
            reached RMD age. Spouses, the owner’s minor children, disabled or chronically ill heirs, and anyone not more than {CLOSE_GAP} years younger can stretch
            payouts; most others get {TEN} years.
          </p>
          <p>
            RMD stands for required minimum distribution, and the IRS calls the people who can stretch “eligible designated beneficiaries.” The owner’s RMD age depends on
            their birth year: {RMD_AGE_NOW} for people born {FIRST_NOW_BIRTH_YEAR}–{FIRST_LATER_BIRTH_YEAR - 1}, {RMD_AGE_LATER} for {FIRST_LATER_BIRTH_YEAR} or later, and
            earlier ages for older owners. The calculator works it out from the date of birth.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">You are…</th>
                  <th scope="col">Owner died before the required beginning date</th>
                  <th scope="col">Owner died on or after it</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">The surviving spouse</td>
                  <td>Treat it as your own, or take life-expectancy RMDs — starting as late as the year the owner would have reached RMD age</td>
                  <td>Treat it as your own, or take life-expectancy RMDs from the year after death</td>
                </tr>
                <tr>
                  <td className="strong">The owner’s child under {MAJORITY_AGE}</td>
                  <td colSpan={2}>
                    Life-expectancy RMDs until {MAJORITY_AGE}, then empty by the year the child turns {MAJORITY_AGE + TEN}
                  </td>
                </tr>
                <tr>
                  <td className="strong">Disabled, chronically ill, or not more than {CLOSE_GAP} years younger</td>
                  <td>Life-expectancy RMDs (or choose the {TEN}-year rule)</td>
                  <td>Life-expectancy RMDs — yours or the owner’s, whichever is longer</td>
                </tr>
                <tr>
                  <td className="strong">Anyone else (adult child, grandchild, friend)</td>
                  <td>Empty by year {TEN}; nothing required before</td>
                  <td>A minimum every year, and empty by year {TEN}</td>
                </tr>
                <tr>
                  <td className="strong">An estate, charity or non-qualifying trust</td>
                  <td>Empty by year {FIVE}</td>
                  <td>Yearly RMDs over the owner’s remaining life expectancy</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Roth accounts always follow the “before” column, however old the owner was: the IRS treats a Roth owner as dying before their required beginning date. If the owner
            died before{" "}
            {SECURE_FIRST_DEATH_YEAR}, every individual beneficiary keeps the old stretch rules. The beneficiary list is settled on {DETERMINATION_DATE}, so anyone who disclaims or is
            paid out by then drops out.
          </p>

          <h2>How does the 10-year rule work?</h2>
          <p className="answer">
            Empty the account by December 31 of the year containing the {TEN}th anniversary of the death — a {THIS_YEAR - 2} death means December 31,{" "}
            {THIS_YEAR - 2 + TEN}. If the owner died on or after their required beginning date, a minimum is also due every year in between; if not, nothing is due
            until the last year.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Year of death</th>
                  <th scope="col">Account empty by</th>
                  <th scope="col">Missed yearly RMDs forgiven</th>
                </tr>
              </thead>
              <tbody>
                {DEATH_YEARS.map((y) => (
                  <tr key={y}>
                    <td className="strong">{y}</td>
                    <td>December 31, {y + TEN}</td>
                    <td>{yearsSpan(waivedFor(y))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The yearly-minimum requirement caught many heirs by surprise, so the IRS waived the penalty for missed {reliefRange} RMDs. You don’t have to make those up. From{" "}
            {ANNUAL_FROM} they are enforced, and the deadline never moved: a {SECURE_FIRST_DEATH_YEAR} death still means the account must be empty in{" "}
            {SECURE_FIRST_DEATH_YEAR + TEN}. Your divisor isn’t reset either — it keeps falling by 1 a year as if you had taken every minimum.
          </p>

          <h2>How is an inherited IRA RMD calculated?</h2>
          <p className="answer">
            Divide last December 31’s balance by your life expectancy from the IRS Single Life Table. Look the factor up once — at the age you reach in the year after the
            death — and subtract 1 every year after that. Only a surviving spouse looks it up fresh each year.
          </p>
          <p>
            The IRS’s own example in Publication 590-B: a father died in {EX.ownerDeathYear} and his beneficiary was {EX.beneficiaryAgeInFirstYear} in {EX.firstYear}. The
            factor at {EX.beneficiaryAgeInFirstYear} is {fmtFactor(EX_START)}, so the {EX.distributionYear} divisor is {fmtFactor(EX_START)} − {EX_YEARS} ={" "}
            {fmtFactor(EX_DIVISOR)}. On a {money(EX_BAL)} balance that’s a {money(EX_BAL / EX_DIVISOR)} RMD.
          </p>
          <p>
            When the owner died on or after their required beginning date, the divisor is the owner’s remaining life expectancy instead whenever that is longer — their
            factor in the year of death, minus 1 a year. In practice that only happens for beneficiaries older than the owner.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Your age the year after the death</th>
                  <th scope="col">Starting divisor</th>
                  <th scope="col">First RMD per {money(EX_BAL)}</th>
                  <th scope="col">Divisor {LATER_YEARS} years later</th>
                </tr>
              </thead>
              <tbody>
                {LE_AGES.map((a) => (
                  <tr key={a}>
                    <td className="strong">{a}</td>
                    <td>{fmtFactor(SINGLE_LIFE[a])}</td>
                    <td>{money(EX_BAL / SINGLE_LIFE[a])}</td>
                    <td>{fmtFactor(SINGLE_LIFE[a] - LATER_YEARS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>What should a surviving spouse do with an inherited IRA?</h2>
          <p className="answer">
            If you are {AGE_59H} or older, treating the IRA as your own is usually simplest and gives the smallest RMDs. If you’re younger and may need the money, keep it as
            an inherited IRA — withdrawals carry no {EARLY} penalty — and switch later. An older spouse of a younger owner can stay a beneficiary to delay RMDs.
          </p>
          <ul>
            <li>
              <strong>Treat it as your own (or roll it over).</strong> Your own RMD age, the Uniform Lifetime Table and your own beneficiaries. The catch: withdrawals
              before {AGE_59H} face the {EARLY} early-withdrawal tax.
            </li>
            <li>
              <strong>Keep it as an inherited IRA.</strong> No early-withdrawal tax at any age. If the owner died before their required beginning date, you can wait until
              the year they would have reached RMD age; the divisor is looked up fresh every year.
            </li>
            <li>
              <strong>Choose the {TEN}-year rule.</strong> Allowed only if the owner died before their required beginning date, and rarely the best choice for a spouse.
            </li>
          </ul>
          <p>
            A newer option lets a spouse elect to be treated as the deceased employee in a workplace plan, but the IRS’s detailed rules for it are still only proposed, so
            this calculator doesn’t model it.
          </p>

          <h2>Do inherited Roth IRAs have required distributions?</h2>
          <p className="answer">
            Not yearly, for most heirs. A Roth owner is always treated as dying before their required beginning date, so a non-eligible beneficiary has no annual minimum
            but must still empty the account by the {TEN}-year deadline. Eligible beneficiaries who take life-expectancy payouts do have yearly RMDs.
          </p>
          <p>
            Our view: with an inherited Roth, wait. Withdrawals are usually tax-free, so every extra year of growth is free money. Put the deadline year on your calendar and
            take it all then — or sooner if you need it.
          </p>

          <h2>Should you withdraw more than the minimum?</h2>
          <p className="answer">
            Usually yes, from a traditional inherited IRA under the {TEN}-year rule. The minimums are small at first, which pushes most of the money and its growth into the
            final year. One giant withdrawal can push you up a bracket or two and trigger Medicare’s IRMAA surcharge; a steadier spread usually costs less tax.
          </p>
          <ul>
            <li>
              <strong>Fill the low-income years first.</strong> The years between retiring and starting Social Security or your own RMDs are the cheapest time to withdraw.
            </li>
            <li>
              <strong>Watch the cliffs.</strong> Medicare’s income-related surcharge (IRMAA) looks at income from two years earlier — check it with the{" "}
              <Link href="/irmaa-calculator">IRMAA calculator</Link>. Withdrawals can also make more of your Social Security taxable; see the{" "}
              <Link href="/taxable-social-security-calculator">Social Security tax calculator</Link>.
            </li>
            <li>
              <strong>Have tax withheld from the withdrawal itself.</strong> Ask the IRA company to withhold federal tax when it pays you, so a big year doesn’t arrive as a surprise bill at tax time.
            </li>
            <li>
              <strong>The exception:</strong> if your income will drop sharply in the last few years — say you retire — back-loading can make sense.
            </li>
          </ul>

          <h2>What are the most common inherited IRA mistakes?</h2>
          <p className="answer">
            Missing the owner’s own RMD for the year they died, recalculating your life expectancy every year, and moving the money into your own IRA. Each one can trigger a{" "}
            {pct(EXCISE_RATE)} excise tax or make the whole account taxable at once — and all three are easy to avoid.
          </p>
          <ul>
            <li>
              <strong>Skipping the death-year RMD.</strong> If the owner died on or after their required beginning date without finishing that year’s RMD, the beneficiary
              must take the rest by December 31. Taking it by your tax-filing deadline, or by the end of the next year if later, earns an automatic penalty waiver.
            </li>
            <li>
              <strong>Rolling it into your own IRA.</strong> Only a spouse can. Anyone else must move it by direct trustee-to-trustee transfer into an inherited IRA.
            </li>
            <li>
              <strong>Mixing accounts.</strong> Inherited IRAs from the same person can share one withdrawal, but never with your own IRAs or one inherited from someone else.
            </li>
            <li>
              <strong>Re-looking-up the table.</strong> Non-spouse beneficiaries subtract 1 a year; a fresh lookup gives the wrong (too small) RMD.
            </li>
            <li>
              <strong>Paying for forgiven years.</strong> The waived {reliefRange} minimums never have to be made up.
            </li>
          </ul>
          <p>
            Missed one anyway? The excise tax is {pct(EXCISE_RATE)} of the shortfall, or {pct(EXCISE_RATE_CORRECTED)} if you correct it in time. Take the missed amount, file
            Form 5329 and ask for a waiver with a short explanation — the IRS can waive the whole tax when the shortfall was a reasonable error and you are fixing it. For your own (not inherited) accounts,
            use the <Link href="/rmd-calculator">RMD calculator</Link>.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.fr2024RmdFinal,
            SRC_INHERITED.ecfrDeathBeforeRbd,
            SRC_INHERITED.ecfrBeneficiary,
            SRC.ecfrRmdBeneficiary,
            SRC.ecfrRmdTables,
            SRC_INHERITED.ecfrIra,
            SRC_INHERITED.irsNotice202435,
            SRC_INHERITED.ecfrExcise,
            RMD_SRC.irsPub590bPdf,
            SRC_INHERITED.irc72t,
            SRC_INHERITED.ecfrGeneral,
            SRC.irsRmdFaq,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
