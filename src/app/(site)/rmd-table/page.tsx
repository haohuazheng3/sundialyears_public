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
import { ShareBar } from "@/components/tool/ShareBar";
import { JsonLd } from "@/components/site/JsonLd";
import { RmdAgeGrid } from "@/components/calculators/rmd/RmdAgeGrid";
import { RmdAgeJointLookup } from "@/components/calculators/rmd/RmdAgeJointLookup";
import { RmdAgeShareChart } from "@/components/calculators/rmd/RmdAgeShareChart";
import {
  AGE_PAGE_MAX,
  AGE_PAGE_MIN,
  FIRST_73_BIRTH_YEAR,
  FIRST_75_BIRTH_YEAR,
  FIRST_75_FIRST_YEAR,
  JOINT_GAP,
  LAST_73_BIRTH_YEAR,
  NEXT_YEAR,
  REF_BALANCE,
  RMD_AGE_LATER,
  RMD_AGE_NOW,
  QCD_MIN_AGE,
  RULE_72_BORN,
  SPOUSE_EXAMPLE_GAP,
  THIS_YEAR,
  UNIFORM_AGES,
  UNIFORM_MAX_AGE,
  UNIFORM_MIN_AGE,
  aAn,
  ageHref,
  ageLabel,
  breakEvenGrowth,
  factorAt,
  fmtFactor,
  fmtPct,
  hasAgePage,
  jointAt,
  rmdAt,
  shareAt,
  singleAt,
  tableAgeLabel,
} from "@/components/calculators/rmd/RmdAgeData";
import {
  IRS_WORKSHEETS_STALE,
  PUB590B_BENEFICIARY_EXAMPLE,
  PUB590B_JUSTIN_EXAMPLE,
  PUB590B_TABLE_II_DIFFS,
  RMD_SRC,
  RMD_TABLES_TIMELINE,
} from "@/data/params/rmd-extra";
import { INHERITED_TIMING } from "@/data/params/inherited-extra";
import { SRC } from "@/data/params/sources";
import { datasetLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { money, pct } from "@/lib/format";

const SLUG = "rmd-table";
const TITLE = `RMD Table ${THIS_YEAR}: Uniform Lifetime Table & RMD Chart by Age`;
const DESC = `The IRS Uniform Lifetime Table for ${THIS_YEAR} and ${NEXT_YEAR}: the RMD factor, the % to withdraw and the RMD per $100k at every age ${UNIFORM_MIN_AGE}–${UNIFORM_MAX_AGE}, plus the spouse table.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

// Illustration choices (inputs, not parameters).
const EXAMPLE_AGE = RMD_AGE_LATER; // worked example uses 75
const JOINT_OWNER_AGES = [RMD_AGE_NOW, RMD_AGE_LATER, 80, 85, 90];
const JOINT_GAPS = [JOINT_GAP + 1, SPOUSE_EXAMPLE_GAP, 20, 25];
const SINGLE_AGES = [30, 40, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const TEN_YEARS = INHERITED_TIMING.value.tenYearRuleYears;
const TIMELINE = RMD_TABLES_TIMELINE.value;

/** Row headers inside .table-sy: undo the column-header look (uppercase, sticky, darker rule). */
const ROW_TH_BASE = "text-left !text-[1rem] !normal-case !tracking-normal !font-bold !text-ink";
const ROW_TH = `${ROW_TH_BASE} !border-b-[color:var(--hairline)]`;

/** The two halves of the floating table (72–96 and 97–120+). */
const HALF = Math.ceil(UNIFORM_AGES.length / 2);
const HALVES = [UNIFORM_AGES.slice(0, HALF), UNIFORM_AGES.slice(HALF)];
const MAX_SHARE = shareAt(UNIFORM_MAX_AGE);

function UniformTable({ ages }: { ages: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-sy text-[1.02rem] max-sm:[&_td]:px-2 max-sm:[&_th]:px-2">
        <caption className="sr-only">
          IRS Uniform Lifetime Table, ages {tableAgeLabel(ages[0])} to {tableAgeLabel(ages[ages.length - 1])}
        </caption>
        <thead>
          <tr>
            <th scope="col">Age</th>
            <th scope="col">Factor</th>
            <th scope="col">% to take</th>
            <th scope="col">Per $100k</th>
          </tr>
        </thead>
        <tbody>
          {ages.map((a) => {
            const share = shareAt(a);
            const mark = a === RMD_AGE_NOW ? "start" : a === RMD_AGE_LATER ? `from ${FIRST_75_FIRST_YEAR}` : null;
            const fifth = a % 5 === 4 && a !== ages[ages.length - 1];
            const td = fifth ? "!border-b-[color:var(--hairline-2)]" : "";
            const th = `${ROW_TH_BASE} ${fifth ? td : "!border-b-[color:var(--hairline)]"}`;
            return (
              <tr key={a} className={mark ? "is-hit" : undefined}>
                <th scope="row" className={th} style={{ position: "static", background: mark ? "var(--sun-wash)" : "transparent" }}>
                  {hasAgePage(a) ? (
                    <Link className="link" href={ageHref(a)}>
                      {tableAgeLabel(a)}
                    </Link>
                  ) : (
                    tableAgeLabel(a)
                  )}
                  {mark ? <span className="pill pill-sun ml-2 !px-2 !py-0 align-middle text-[0.72rem]">{mark}</span> : null}
                </th>
                <td className={`num strong ${td}`}>{fmtFactor(factorAt(a))}</td>
                <td className={`num ${td}`}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-[3.6rem] shrink-0">{fmtPct(share)}</span>
                    <span aria-hidden="true" className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-[var(--hairline)] sm:block">
                      <span className="block h-full rounded-full bg-[var(--sun)]" style={{ width: `${Math.max(4, (share / MAX_SHARE) * 100)}%` }} />
                    </span>
                  </span>
                </td>
                <td className={`num ${td}`}>{money(100000 / factorAt(a))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const FAQ: FaqItem[] = [
  {
    q: `What percentage of my IRA do I have to withdraw at ${RMD_AGE_NOW}?`,
    a: `${fmtPct(shareAt(RMD_AGE_NOW))} of last December 31’s balance — you divide it by ${fmtFactor(factorAt(RMD_AGE_NOW))}, the Uniform Lifetime Table factor for ${RMD_AGE_NOW}. That is ${money(100000 / factorAt(RMD_AGE_NOW))} per $100,000. The share rises every year: ${fmtPct(shareAt(RMD_AGE_LATER))} at ${RMD_AGE_LATER}, ${fmtPct(shareAt(80))} at 80, ${fmtPct(shareAt(90))} at 90 and ${fmtPct(shareAt(100))} at 100.`,
  },
  {
    q: `Is there a new RMD table for ${THIS_YEAR} or ${NEXT_YEAR}?`,
    a: `No. The Uniform Lifetime, Joint and Last Survivor, and Single Life tables in Treasury Regulation §1.401(a)(9)-9 apply to every distribution year from ${TIMELINE.tablesFirstDistributionYear} on, and the final RMD regulations left them unchanged. The same factors work for ${THIS_YEAR} and ${NEXT_YEAR}. Only your age and your December 31 balance change from year to year.`,
  },
  {
    q: "Which age do I use in the RMD table?",
    a: `The age you reach on your birthday in the year the RMD is for — not your age on January 1 or last December 31. If you turn ${RMD_AGE_LATER + 1} on December 28, you use the factor for ${RMD_AGE_LATER + 1} for that whole year. Using the previous year’s age gives a larger factor and an RMD that is too small.`,
  },
  {
    q: "Which RMD table do I use if my spouse is my beneficiary?",
    a: `The Uniform Lifetime Table, unless your spouse is more than ${JOINT_GAP} years younger and is the sole beneficiary of the account for the whole year. Then you use the Joint and Last Survivor Table, which gives a larger factor and a smaller RMD. Marital status is set on January 1, so a mid-year change counts from the next year.`,
  },
  {
    q: "Does the Uniform Lifetime Table apply to 401(k)s and Roth accounts?",
    a: "It applies to traditional, SEP and SIMPLE IRAs and to 401(k), 403(b) and 457(b) plans. Roth IRAs have no RMDs while the owner is alive, and Roth 401(k) and Roth 403(b) accounts no longer do either. IRA RMDs can be added together and taken from one IRA, but each 401(k) must pay its own RMD.",
  },
  {
    q: "What table do I use for an inherited IRA?",
    a: `Beneficiaries use the Single Life Table, not the Uniform Lifetime Table. A non-spouse beneficiary looks up their age once — in the year after the owner’s death — and subtracts 1 each later year. Many heirs must also empty the account within ${TEN_YEARS} years. The inherited IRA calculator works out which rules apply to you.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  const exF = factorAt(EXAMPLE_AGE);
  const exRmd = rmdAt(REF_BALANCE, EXAMPLE_AGE);
  const exBirth = THIS_YEAR - EXAMPLE_AGE;
  const jOwner = RMD_AGE_LATER;
  const jSpouse = RMD_AGE_LATER - SPOUSE_EXAMPLE_GAP;
  const justin = PUB590B_JUSTIN_EXAMPLE.value;
  const benef = PUB590B_BENEFICIARY_EXAMPLE.value;
  const benefStart = singleAt(benef.beneficiaryAgeInFirstYear);
  const benefYears = benef.distributionYear - benef.firstYear;
  const diff = PUB590B_TABLE_II_DIFFS.value[0];
  const stale = IRS_WORKSHEETS_STALE.value;
  const chartData = UNIFORM_AGES.map((a) => ({ x: a, y: Number((shareAt(a) * 100).toFixed(2)) }));

  return (
    <>
      <JsonLd
        data={datasetLd({
          name: "IRS Uniform Lifetime Table (RMD table by age)",
          description: DESC,
          path: `/${SLUG}`,
          dateModified: SITE.dataVerifiedOn,
          sources: [SRC.ecfrRmdTables.url, RMD_SRC.irsPub590bPdf.url],
        })}
      />
      <ToolHero
        crumbs={[
          { name: "RMD Calculator", path: "/rmd-calculator" },
          { name: "RMD table", path: `/${SLUG}` },
        ]}
        eyebrow="RMDs & IRAs"
        icon="table"
        title={
          <>
            RMD table {THIS_YEAR}: the IRS <span className="italic font-normal text-sun-ink">Uniform Lifetime Table</span>
          </>
        }
        lead={
          <p>
            Find the age you reach this year and divide last December 31’s balance by its factor. At {RMD_AGE_NOW} that’s {fmtFactor(factorAt(RMD_AGE_NOW))} —{" "}
            {fmtPct(shareAt(RMD_AGE_NOW))} of the balance, or {money(100000 / factorAt(RMD_AGE_NOW))} per $100,000 — and the share climbs every year: {fmtPct(shareAt(80))} at 80,{" "}
            {fmtPct(shareAt(90))} at 90, {fmtPct(shareAt(100))} at 100.
          </p>
        }
        chips={
          <StatusChip status="official">
            Official for {THIS_YEAR} & {NEXT_YEAR}
          </StatusChip>
        }
      />

      {/* The table itself */}
      <section id="table" aria-labelledby="table-h" className="mx-auto max-w-[1180px] scroll-mt-28 px-4 sm:px-6">
        <div className="float px-3 py-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 px-2 sm:px-0">
            <div>
              <h2 id="table-h" className="text-[1.75rem] font-semibold">
                RMD chart by age: the Uniform Lifetime Table for {THIS_YEAR} and {NEXT_YEAR}
              </h2>
              <p className="mt-1 max-w-2xl text-[1.0625rem] text-ink-2">
                Every age from {UNIFORM_MIN_AGE} to {UNIFORM_MAX_AGE} and older. “Factor” is the IRS distribution period; use the age you reach on your birthday this year. Underlined ages open a page with birth years, examples and traps
                for that age.
              </p>
            </div>
            <a className="pill hover:text-ink" href={SRC.ecfrRmdTables.url} target="_blank" rel="noopener">
              Treas. Reg. §1.401(a)(9)-9(c)
            </a>
          </div>
          <div className="mt-6 grid gap-x-8 gap-y-2 lg:grid-cols-2">
            {HALVES.map((h) => (
              <UniformTable key={h[0]} ages={h} />
            ))}
          </div>
          <ul className="mt-5 space-y-1.5 px-2 text-[0.95rem] text-ink-3 sm:px-0">
            <li>
              <span className="pill pill-sun !px-2 !py-0 text-[0.72rem]">start</span> {RMD_AGE_NOW} is the first RMD age for people born {FIRST_73_BIRTH_YEAR}–{LAST_73_BIRTH_YEAR}.
              For {LAST_73_BIRTH_YEAR} that comes from proposed IRS regulations: the law’s wording points to both {RMD_AGE_NOW} and {RMD_AGE_LATER}, and the final rule is still open.
            </li>
            <li>
              <span className="pill pill-sun !px-2 !py-0 text-[0.72rem]">from {FIRST_75_FIRST_YEAR}</span> {RMD_AGE_LATER} is the first RMD age for people born{" "}
              {FIRST_75_BIRTH_YEAR} or later; their first RMDs are for {FIRST_75_FIRST_YEAR}.
            </li>
            <li>
              {UNIFORM_MIN_AGE} was the RMD age for people {RULE_72_BORN}; all of them are past it, so nobody reaches the RMD age at {UNIFORM_MIN_AGE} any more. The{" "}
              {UNIFORM_MAX_AGE}+ row covers {UNIFORM_MAX_AGE} and every age above.
            </li>
          </ul>
          <div className="mt-6 border-t border-[var(--hairline)] px-2 pt-5 sm:px-0">
            <ShareBar tool="rmd-table" subject={`IRS RMD table (Uniform Lifetime Table) for ${THIS_YEAR}`} />
          </div>
        </div>
      </section>

      <section id="by-age" aria-labelledby="by-age-h" className="mx-auto mt-8 max-w-[1180px] scroll-mt-28 px-4 sm:px-6">
        <div className="float p-5 sm:p-8">
          <h2 id="by-age-h" className="text-[1.75rem] font-semibold">
            RMD by age: a page for every age from {AGE_PAGE_MIN} to {AGE_PAGE_MAX}
          </h2>
          <p className="mt-1 text-[1.0625rem] text-ink-2">
            Who is that age in {THIS_YEAR} and {NEXT_YEAR}, the RMD on common balances, the younger-spouse factor and the traps that matter at that age.
          </p>
          <div className="mt-5">
            <RmdAgeGrid />
          </div>
        </div>
      </section>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2 className="!mt-0">How do you use the RMD table?</h2>
          <p className="answer">
            Divide each account’s December 31 balance from last year by the factor for the age you reach this year. The result is the minimum you must withdraw by December
            31 — or by April 1 of next year if it is your very first RMD.
          </p>
          <ol>
            <li>
              <strong>Get last year’s December 31 balance</strong> from each traditional IRA, 401(k), 403(b) or 457(b) statement. Withdrawals you make this year don’t change it.
            </li>
            <li>
              <strong>Find the age you reach on your birthday this year</strong> in the left column.
            </li>
            <li>
              <strong>Divide the balance by that row’s factor.</strong> If your spouse is your only beneficiary and more than {JOINT_GAP} years younger, use the{" "}
              <a href="#joint">joint table</a> instead.
            </li>
            <li>
              <strong>Add up your IRA RMDs</strong> and take the total from any one or more IRAs. Each 401(k) or 457(b) plan pays its own RMD.
            </li>
          </ol>
          <p>
            <strong>Example.</strong> You were born in {exBirth}, so you turn {EXAMPLE_AGE} in {THIS_YEAR}. Your IRA was worth {money(REF_BALANCE)} on December 31,{" "}
            {THIS_YEAR - 1}. The factor for {EXAMPLE_AGE} is {fmtFactor(exF)}, so your {THIS_YEAR} RMD is {money(REF_BALANCE)} ÷ {fmtFactor(exF)} = <strong>{money(exRmd)}</strong>.
            The <Link href="/rmd-calculator">RMD calculator</Link> does this for you and handles the first-year deadline.
          </p>

          <h2>Which age do you look up?</h2>
          <p className="answer">
            The age you reach on your birthday during the year the RMD is for. A December birthday still counts: someone born on December 20, {exBirth} uses {EXAMPLE_AGE} for all
            of {THIS_YEAR}, even though they are {EXAMPLE_AGE - 1} for most of it.
          </p>
          <p>
            Even the IRS slips here. Publication 590-B’s own example has “Justin” — who reaches {justin.ageReached} in {justin.distributionYear} — dividing the{" "}
            {money(justin.balance)} balance for his {justin.distributionYear} RMD by {fmtFactor(factorAt(justin.ageUsedInExample))}, the factor for {justin.ageUsedInExample}, to get{" "}
            {money(justin.rmdShown)}. The correct factor is {fmtFactor(factorAt(justin.ageReached))}, which makes the RMD{" "}
            {money(justin.balance / factorAt(justin.ageReached))}. Using last year’s age always understates the RMD — and a shortfall is what the excise tax is charged on.
          </p>

          <h2>Why does the percentage rise every year?</h2>
          <p className="answer">
            Because each factor is a life expectancy — the joint life expectancy of you and a beneficiary exactly {JOINT_GAP} years younger — and it shrinks as you age. Dividing by
            a smaller number takes a bigger bite: {fmtPct(shareAt(RMD_AGE_NOW))} at {RMD_AGE_NOW}, {fmtPct(shareAt(90))} at 90, {fmtPct(shareAt(UNIFORM_MAX_AGE))} at{" "}
            {UNIFORM_MAX_AGE}.
          </p>
          <div className="not-prose mt-4">
            <RmdAgeShareChart data={chartData} highlight={RMD_AGE_NOW} caption={`Percentage of the balance you must withdraw at each age from ${UNIFORM_MIN_AGE} to ${UNIFORM_MAX_AGE}`} />
          </div>
          <p>
            In practice the RMD alone never empties an account — even at {UNIFORM_MAX_AGE} and older it is {fmtPct(shareAt(UNIFORM_MAX_AGE))} of the balance — but it does start to outpace growth. At 80,
            the account has to earn about {pct(breakEvenGrowth(80), 1)} a year to stay level after the RMD; at 90, about {pct(breakEvenGrowth(90), 1)}. If your investments earn less than that, the balance shrinks — for most people that starts somewhere in their 80s. That
            isn’t a problem to fix; it’s the design. What is worth fixing is the tax: from {ageLabel(QCD_MIN_AGE)} a
            qualified charitable distribution (QCD) sends RMD money to charity tax-free, and Roth conversions before RMDs start shrink what the table forces out later.
          </p>
        </ProseCard>

        {/* Joint and Last Survivor Table */}
        <section id="joint" aria-labelledby="joint-h" className="scroll-mt-28">
          <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] [&>*]:min-w-0">
            <div className="float prose-sy p-6 sm:p-10">
              <h2 id="joint-h" className="!mt-0">
                What if your spouse is more than {JOINT_GAP} years younger?
              </h2>
              <p className="answer">
                Then you use the Joint and Last Survivor Table — if your spouse is the sole beneficiary of the account all year. Its factors are larger, so your RMD is smaller:
                at {jOwner} with {aAn(jSpouse)} {jSpouse}-year-old spouse, you divide by {fmtFactor(jointAt(jOwner, jSpouse))} instead of {fmtFactor(factorAt(jOwner))}.
              </p>
              <p>
                The Uniform table is simply the joint table for a spouse exactly {JOINT_GAP} years younger, which is why a bigger gap is needed before the joint table helps. The
                full table runs from age 0 to {UNIFORM_MAX_AGE} for both people; here is a slice of it.
              </p>
              <div className="not-prose overflow-x-auto">
                <table className="table-sy mt-2 text-[1rem]">
                  <caption className="sr-only">Joint and Last Survivor Table factors for selected owner ages and age gaps, with the Uniform factor for comparison</caption>
                  <thead>
                    <tr>
                      <th scope="col">Owner</th>
                      <th scope="col">Uniform</th>
                      {JOINT_GAPS.map((g, i) => (
                        <th key={g} scope="col" className={i > 1 ? "hidden sm:table-cell" : undefined}>
                          {g} yrs younger
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JOINT_OWNER_AGES.map((o) => (
                      <tr key={o}>
                        <th scope="row" className={ROW_TH} style={{ position: "static", background: "transparent" }}>
                          {o}
                        </th>
                        <td className="num">{fmtFactor(factorAt(o))}</td>
                        {JOINT_GAPS.map((g, i) => (
                          <td key={g} className={`num strong ${i > 1 ? "hidden sm:table-cell" : ""}`}>
                            {fmtFactor(jointAt(o, o - g))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Two details trip people up. Marital status is fixed on January 1, so if your spouse dies or you divorce during the year, you keep the joint factor for that
                year. And the joint table needs your spouse to be the <em>only</em> beneficiary — name a child as a co-beneficiary, even for a small share, and you’re back on
                the Uniform table.
              </p>
              <p className="text-[1rem] text-ink-3">
                We use the regulation’s table. IRS Publication 590-B’s printed version differs in {PUB590B_TABLE_II_DIFFS.value.length} cells — for example, owner{" "}
                {diff.ownerAge} with spouse {diff.spouseAge} shows {fmtFactor(diff.pub590b)} in the publication but {fmtFactor(jointAt(diff.ownerAge, diff.spouseAge))} in the
                regulation, which is what governs.
              </p>
            </div>
            <RmdAgeJointLookup defaultOwner={jOwner} defaultSpouse={jSpouse} />
          </div>
        </section>

        <ProseCard>
          <h2 id="beneficiaries" className="!mt-0 scroll-mt-28">
            Which table do beneficiaries use?
          </h2>
          <p className="answer">
            The Single Life Table. If you inherited an IRA and must take yearly RMDs, you look up your age once — in the year after the owner’s death — and subtract 1 every
            year after that, instead of looking the table up again.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-2 text-[1rem]">
              <caption className="sr-only">Single Life Table factors for selected beneficiary ages</caption>
              <thead>
                <tr>
                  <th scope="col">Beneficiary’s age</th>
                  <th scope="col">Factor</th>
                  <th scope="col">First-year %</th>
                </tr>
              </thead>
              <tbody>
                {SINGLE_AGES.map((a) => (
                  <tr key={a} className={a === benef.beneficiaryAgeInFirstYear ? "is-hit" : undefined}>
                    <th scope="row" className={ROW_TH} style={{ position: "static", background: a === benef.beneficiaryAgeInFirstYear ? "var(--sun-wash)" : "transparent" }}>
                      {a}
                    </th>
                    <td className="num strong">{fmtFactor(singleAt(a))}</td>
                    <td className="num">{fmtPct(1 / singleAt(a))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The IRS’s own example: a beneficiary who was {benef.beneficiaryAgeInFirstYear} in the first distribution year, {benef.firstYear}, starts with{" "}
            {fmtFactor(benefStart)}. For {benef.distributionYear} — {benefYears} years later — the divisor is {fmtFactor(benefStart)} − {benefYears} ={" "}
            <strong>{fmtFactor(benefStart - benefYears)}</strong>, not the table value for their current age. A surviving spouse who is the sole beneficiary is the exception and
            looks the table up fresh each year.
          </p>
          <p>
            Whether you need yearly RMDs at all depends on who you are and whether the owner had already started RMDs. Most non-spouse heirs must empty the account within{" "}
            {TEN_YEARS} years, with yearly RMDs too if the owner had started. And if the owner had started RMDs and was younger than you, the divisor is the
            owner’s remaining life expectancy instead, because the rules use whichever of the two is longer. The <Link href="/inherited-ira-rmd-calculator">inherited IRA RMD calculator</Link> sorts that out
            for you.
          </p>

          <h2>Is the RMD table different for {NEXT_YEAR}?</h2>
          <p className="answer">
            No. The current tables have applied to every distribution year since {TIMELINE.tablesFirstDistributionYear}, and the final RMD regulations published in{" "}
            {TIMELINE.finalRegsPublished.slice(0, 4)} kept them. Your {NEXT_YEAR} RMD uses
            the same factor list — just one row further down, applied to your December 31, {THIS_YEAR} balance.
          </p>
          <p>
            Two things to ignore: the IRS’s online RMD worksheets still say “Use this worksheet for {stale.saysUseFor}” and talk about the year you turn {stale.saysAge}. The
            factors on them are current; only the wording is out of date — the RMD age is now {RMD_AGE_NOW} or {RMD_AGE_LATER}. And proposed regulations that would add younger
            ages to the Uniform table (for surviving spouses) are not final and don’t change any number on this page.
          </p>

          <h2>What mistakes do people make with the RMD table?</h2>
          <p className="answer">
            Most errors come from using the wrong balance, the wrong age or the wrong table — not from the division. The rest are about timing and which account pays: a first RMD
            put off to April 1, or a 401(k) RMD taken from an IRA instead. Check these six before you withdraw.
          </p>
          <ul>
            <li>
              <strong>Using today’s balance.</strong> The RMD is always based on last December 31’s value, even if the market has moved a lot since.
            </li>
            <li>
              <strong>Using last year’s age.</strong> The larger factor understates the RMD (see the Justin example above).
            </li>
            <li>
              <strong>Using the joint table without qualifying.</strong> The spouse has to be more than {JOINT_GAP} years younger <em>and</em> the sole beneficiary all year.
            </li>
            <li>
              <strong>Using this table for an inherited IRA.</strong> Heirs use the Single Life Table and their own deadlines.
            </li>
            <li>
              <strong>Forgetting the first-year double-up.</strong> Waiting until April 1 for your first RMD puts two RMDs in one tax year. On {money(REF_BALANCE)} at{" "}
              {RMD_AGE_NOW}, that’s {money(rmdAt(REF_BALANCE, RMD_AGE_NOW) + rmdAt(REF_BALANCE, RMD_AGE_NOW + 1))} of income at once.
            </li>
            <li>
              <strong>Pooling 401(k)s like IRAs.</strong> IRA RMDs can be combined; each 401(k) and 457(b) must pay its own.
            </li>
          </ul>
        </ProseCard>

        <Faq items={FAQ} title="RMD table: common questions" />
        <SourceList
          sources={[
            SRC.ecfrRmdTables,
            SRC.ecfrRmdBeneficiary,
            SRC.ecfrRmdAge,
            RMD_SRC.ecfrIra408_8,
            RMD_SRC.irsPub590bPdf,
            SRC.irsRmdFaq,
            RMD_SRC.irsRmdTopics,
            RMD_SRC.irsRmdWorksheets,
            SRC.fr2024RmdFinal,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
