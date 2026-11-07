import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Stat } from "@/components/tool/Result";
import { Faq } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { RmdCalculator } from "@/components/calculators/rmd/RmdCalculator";
import { RmdAgeNotes } from "@/components/calculators/rmd/RmdAgeNotes";
import { RmdAgeGrid, RmdAgePrevNext } from "@/components/calculators/rmd/RmdAgeGrid";
import { RmdAgeShareChart } from "@/components/calculators/rmd/RmdAgeShareChart";
import {
  AGE_PAGES,
  AGE_PAGE_MAX,
  AGE_PAGE_MIN,
  EXAMPLE_BALANCES,
  FIRST_73_BIRTH_YEAR,
  FIRST_75_BIRTH_YEAR,
  FIRST_75_FIRST_YEAR,
  LAST_73_BIRTH_YEAR,
  NEXT_YEAR,
  OWNER_LIMIT,
  RMD_AGE_LATER,
  RMD_AGE_NOW,
  REF_BALANCE,
  THIS_YEAR,
  UNIFORM_MAX_AGE,
  UNIFORM_MIN_AGE,
  ageDescription,
  ageFaq,
  ageHref,
  ageLabel,
  ageTitle,
  bandFor,
  breakEvenGrowth,
  cohortRows,
  factorAt,
  fmtFactor,
  fmtPct,
  fmtPts,
  parseAgeSlug,
  rmdAt,
  shareAt,
  startYears,
  statusText,
  type CohortRow,
} from "@/components/calculators/rmd/RmdAgeData";
import { RMD_SRC } from "@/data/params/rmd-extra";
import { SRC } from "@/data/params/sources";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { money, pct } from "@/lib/format";

/** One static page per age, 73–105 (/rmd/age-73 … /rmd/age-105). */
export function generateStaticParams() {
  return AGE_PAGES.map((a) => ({ slug: `age-${a}` }));
}

export async function generateMetadata({ params }: PageProps<"/rmd/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const age = parseAgeSlug(slug);
  if (age == null) return {};
  return pageMetadata({ title: ageTitle(age), description: ageDescription(age), path: ageHref(age) });
}

/**
 * The one way a first RMD year can fall after the RMD age: the still-working exception for the current employer's plan
 * (Treas. Reg. §1.401(a)(9)-2(b)(1)–(3); never for IRAs, §1.408-8(b)(1); not for owners of more than 5%).
 */
const STILL_WORKING_NOTE = `One exception to the dates above: if you kept working past your RMD age, own ${OWNER_LIMIT} or less of the company and its plan let you delay, that plan’s first RMD is for the year you retire — due by April 1 of the next year. IRAs never get this delay.`;

/** Plain-text answer for "who reaches this age, and is it anyone's first RMD year?" */
function whoAnswer(age: number) {
  const b26 = THIS_YEAR - age;
  const b27 = NEXT_YEAR - age;
  switch (bandFor(age)) {
    case "first":
      return `Everyone born in ${b26} reaches ${age} in ${THIS_YEAR}, and everyone born in ${b27} does in ${NEXT_YEAR}. For both groups it is the first RMD year — ${age} is the RMD age for anyone born ${FIRST_73_BIRTH_YEAR}–${LAST_73_BIRTH_YEAR} — so the first withdrawal is due by April 1 of the following year.`;
    case "second":
      return `People born in ${b26} turn ${age} in ${THIS_YEAR}, and people born in ${b27} in ${NEXT_YEAR}. Both groups had their first RMD the year before, at ${RMD_AGE_NOW}, so ${age} is their second RMD year — the one where a postponed first RMD doubles up.`;
    case "seventy-five":
      return `People born in ${b26} turn ${age} in ${THIS_YEAR}, and people born in ${b27} in ${NEXT_YEAR}. It isn’t a first RMD year for either group — they reached the RMD age of ${RMD_AGE_NOW} earlier. ${age} becomes a first RMD year in ${FIRST_75_FIRST_YEAR}, for people born in ${FIRST_75_BIRTH_YEAR}.`;
    default:
      return `People born in ${b26} turn ${age} in ${THIS_YEAR}, and people born in ${b27} in ${NEXT_YEAR}. Neither group reaches its RMD age now: the ${THIS_YEAR} group has been taking RMDs since ${startYears(THIS_YEAR, age).join(" or ")}, the ${NEXT_YEAR} group since ${startYears(NEXT_YEAR, age).join(" or ")}. Both use the same factor at ${age}: ${fmtFactor(factorAt(age))}.`;
  }
}

const bornLabel = (r: CohortRow) => (r.part ? `${r.birthYear} (${r.part})` : String(r.birthYear));

export default async function Page({ params }: PageProps<"/rmd/[slug]">) {
  const { slug } = await params;
  const age = parseAgeSlug(slug);
  if (age == null) notFound();

  const tool = toolBySlug("rmd-calculator")!;
  const path = ageHref(age);
  const f = factorAt(age);
  const share = shareAt(age);
  const prev = age - 1;
  const next = age + 1;
  const b26 = THIS_YEAR - age;
  const b27 = NEXT_YEAR - age;
  const rows = [...cohortRows(THIS_YEAR, age), ...cohortRows(NEXT_YEAR, age)];
  // Explain one split birth year; prefer the one where the RMD AGE differs (1949: 70½ vs 72) over a 70½-only split.
  const splitRows = rows.filter((r) => r.part);
  const split = splitRows.find((r) => splitRows.some((o) => o.year === r.year && o.applicableAge !== r.applicableAge)) ?? splitRows[0];
  const splitPair = split ? rows.filter((r) => r.year === split.year) : [];
  const faq = ageFaq(age);
  const desc = ageDescription(age);
  const chartData = AGE_PAGES.map((a) => ({ x: a, y: Number((shareAt(a) * 100).toFixed(2)) }));

  return (
    <>
      <JsonLd data={calculatorLd({ name: `RMD calculator for age ${age}`, description: desc, path })} />
      <ToolHero
        crumbs={[
          { name: "RMD Calculator", path: "/rmd-calculator" },
          { name: "RMD by age", path: "/rmd-table" },
          { name: `Age ${age}`, path },
        ]}
        eyebrow="RMD by age"
        icon="rmd"
        title={
          <>
            RMD at age {age}: <span className="italic font-normal text-sun-ink">{fmtPct(share)} of your balance</span>
          </>
        }
        lead={
          <p>
            At {age}, your required minimum distribution (RMD) is last December 31’s balance divided by <strong>{fmtFactor(f)}</strong>, the IRS Uniform Lifetime Table factor —
            that’s <strong>{fmtPct(share)}</strong> of the account, or <strong>{money(100000 / f)}</strong> for every $100,000. In {THIS_YEAR} that means people born in {b26}; in{" "}
            {NEXT_YEAR}, people born in {b27}.
          </p>
        }
        chips={
          <>
            <StatusChip status="official">
              IRS table for {THIS_YEAR} & {NEXT_YEAR}
            </StatusChip>
            <span className="pill">
              Born {b26} ({THIS_YEAR}) · {b27} ({NEXT_YEAR})
            </span>
          </>
        }
      />

      {/* The answer, in numbers */}
      <section aria-labelledby="numbers-h" className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="float p-5 sm:p-8">
          <h2 id="numbers-h" className="text-[1.75rem] font-semibold">
            Your RMD at {age}, in numbers
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
            <Stat label="IRS factor (distribution period)" value={fmtFactor(f)} sub={`${fmtFactor(factorAt(prev))} at ${prev} · ${fmtFactor(factorAt(next))} at ${next}`} />
            <Stat label="Share you must withdraw" value={fmtPct(share)} sub={`${fmtPts(share - shareAt(prev))} vs. age ${prev}`} tone="sun" />
            <Stat label="RMD per $100,000" value={money(100000 / f)} sub={`${money(100000 / factorAt(next))} at ${next}`} />
            <Stat label="Return needed to stay level" value={pct(breakEvenGrowth(age), 1)} sub="What the account must earn after this RMD" />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
            <div>
              <h3 className="text-[1.3rem] font-semibold">RMD at {age} for common balances</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="table-sy text-[1rem]">
                  <caption className="sr-only">
                    Required minimum distribution at age {age} for balances from {money(EXAMPLE_BALANCES[0])} to {money(EXAMPLE_BALANCES[EXAMPLE_BALANCES.length - 1])}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Dec 31 balance</th>
                      <th scope="col">RMD at {age}</th>
                      <th scope="col" className="hidden sm:table-cell">
                        Per month
                      </th>
                      <th scope="col">At {next}*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXAMPLE_BALANCES.map((b) => (
                      <tr key={b}>
                        <td className="num">{money(b)}</td>
                        <td className="num strong">{money(rmdAt(b, age))}</td>
                        <td className="num hidden sm:table-cell">{money(rmdAt(b, age) / 12)}</td>
                        <td className="num">{money(rmdAt(b, next))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-[1.3rem] font-semibold">
                {prev}, {age} and {next} side by side
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="table-sy text-[1rem]">
                  <caption className="sr-only">
                    Uniform Lifetime Table factors for ages {prev}, {age} and {next}
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
                    {[prev, age, next].map((a) => (
                      <tr key={a} className={a === age ? "is-hit" : undefined}>
                        <td className="strong">
                          {a === age || a < AGE_PAGE_MIN || a > AGE_PAGE_MAX ? (
                            <>
                              {a}
                              {a === age ? <span className="sr-only"> (this page)</span> : null}
                            </>
                          ) : (
                            <Link className="link" href={ageHref(a)}>
                              {a}
                            </Link>
                          )}
                        </td>
                        <td className="num">{fmtFactor(factorAt(a))}</td>
                        <td className="num">{fmtPct(shareAt(a))}</td>
                        <td className="num">{money(100000 / factorAt(a))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[0.95rem] text-ink-3">
            *If the balance is unchanged. Balances are examples — the math is the same for any amount. Factors from the{" "}
            <a className="link" href={SRC.ecfrRmdTables.url} target="_blank" rel="noopener">
              Uniform Lifetime Table, Treas. Reg. §1.401(a)(9)-9(c)
            </a>
            .
          </p>

          <div className="mt-8">
            <h3 className="text-[1.3rem] font-semibold">
              Where {age} sits: the share you must take, ages {AGE_PAGE_MIN}–{AGE_PAGE_MAX}
            </h3>
            <div className="mt-3">
              <RmdAgeShareChart data={chartData} highlight={age} caption={`Percentage of the balance you must withdraw at each age from ${AGE_PAGE_MIN} to ${AGE_PAGE_MAX}; age ${age} highlighted`} height={220} />
            </div>
          </div>
        </div>
      </section>

      {/* Who is this age */}
      <ContentSection className="mt-10">
        <ProseCard>
          <h2 className="!mt-0">
            Who turns {age} in {THIS_YEAR} and {NEXT_YEAR}?
          </h2>
          <p className="answer">{whoAnswer(age)}</p>
          <ul className="not-prose space-y-3 sm:hidden">
            {rows.map((r) => (
              <li key={`${r.year}-${r.part}`} className={`rounded-[var(--r-md)] p-4 ${r.status === "first" ? "bg-sun-wash" : "sunk"}`}>
                <p className="num text-[1.125rem] font-bold text-ink">
                  {r.year}: born {bornLabel(r)}
                </p>
                <p className="num mt-1 text-[1rem] text-ink-2">
                  RMD age {ageLabel(r.applicableAge)} · first RMD {r.firstYear}
                </p>
                <p className="mt-1 text-[1rem] text-ink-2">{statusText(r)}</p>
              </li>
            ))}
          </ul>
          <div className="not-prose hidden overflow-x-auto sm:block">
            <table className="table-sy mt-2 text-[1rem]">
              <caption className="sr-only">
                Birth years that reach age {age} in {THIS_YEAR} and {NEXT_YEAR}, with their RMD age and first RMD year
              </caption>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Born</th>
                  <th scope="col">RMD age</th>
                  <th scope="col">First RMD</th>
                  <th scope="col">What {age} means</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.year}-${r.part}`} className={r.status === "first" ? "is-hit" : undefined}>
                    <td className="num strong">{r.year}</td>
                    <td className="num">{bornLabel(r)}</td>
                    <td className="num">{ageLabel(r.applicableAge)}</td>
                    <td className="num">{r.firstYear}</td>
                    <td>{statusText(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bandFor(age) !== "first" ? <p>{STILL_WORKING_NOTE}</p> : null}
          {split && splitPair.length === 2 ? (
            <p>
              <strong>Born in {split.birthYear}?</strong> The old rules split your year at July 1: with a January–June birthday your RMD age was{" "}
              {ageLabel(splitPair[0].applicableAge)} and your first RMD year {splitPair[0].firstYear}; with a July–December birthday, {ageLabel(splitPair[1].applicableAge)} and{" "}
              {splitPair[1].firstYear}. Either way, the factor you use today is the same: {fmtFactor(f)} at {age}.
            </p>
          ) : null}
          {age === RMD_AGE_NOW + 1 ? (
            <p>
              The last people for whom {age} is the double-up year are those born in {LAST_73_BIRTH_YEAR} (in {LAST_73_BIRTH_YEAR + age}), if the proposed RMD age of{" "}
              {RMD_AGE_NOW} for that birth year stands. For people born in {FIRST_75_BIRTH_YEAR} or later, whose RMDs start at {RMD_AGE_LATER}, the double-up year moves to{" "}
              {RMD_AGE_LATER + 1}.
            </p>
          ) : null}
          <p>
            The table always uses the age you reach on your birthday <em>during</em> the year, so someone born on December 31, {b26} uses {age} for all of {THIS_YEAR}. See the{" "}
            <Link href="/rmd-table#table">full RMD table</Link> for every age from {UNIFORM_MIN_AGE} to {UNIFORM_MAX_AGE} and older.
          </p>
        </ProseCard>
      </ContentSection>

      {/* Calculator, prefilled with a birth date for this age */}
      <ContentSection className="mt-12">
        <h2 className="px-1 text-[1.75rem] font-semibold">Work out your own RMD at {age}</h2>
        <p className="mt-1 max-w-3xl px-1 text-[1.0625rem] text-ink-2">
          The calculator starts with a {b26} birth date and a {money(REF_BALANCE)} balance. Change either one, pick {NEXT_YEAR} to plan ahead, or add a much younger spouse.
        </p>
      </ContentSection>
      <div className="mt-5">
        <RmdCalculator initialAge={age} />
      </div>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <RmdAgeNotes age={age} />
        </ProseCard>

        <section aria-labelledby="ages-h" className="float p-6 sm:p-8">
          <h2 id="ages-h" className="text-[1.75rem] font-semibold">
            RMD at other ages
          </h2>
          <p className="mt-1 text-[1.0625rem] text-ink-2">Each tile shows the share of the balance you must withdraw at that age.</p>
          <div className="mt-5">
            <RmdAgePrevNext age={age} />
          </div>
          <div className="mt-6">
            <RmdAgeGrid current={age} />
          </div>
        </section>

        <Faq items={faq} title={`RMD at ${age}: common questions`} />
        <SourceList
          sources={[
            SRC.ecfrRmdTables,
            SRC.ecfrRmdAge,
            SRC.ecfrRmdBeneficiary,
            RMD_SRC.ecfrIra408_8,
            SRC.irsRmdFaq,
            RMD_SRC.irsRmdTopics,
            RMD_SRC.irsPub590bPdf,
            SRC.irsExcise4974,
            RMD_SRC.ecfrExcise54_4974,
            RMD_SRC.irsNotice2567,
            RMD_SRC.irc6654,
            SRC.fr2024RmdFinal,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
