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
import { JsonLd } from "@/components/site/JsonLd";
import { TileMap } from "@/components/reference/states/TileMap";
import { StateTable } from "@/components/reference/states/StateTable";
import { stateRows } from "@/components/reference/states/table-rows";
import { VerdictPill } from "@/components/reference/states/style";
import { capitalize, listJoin, numberWord, statesPhrase } from "@/components/reference/states/words";
import { STATES, SUMMARY, VERDICT_RULES, RELIEF_TERMS, LOW_RATE, HIGH_RATE, LARGE_RELIEF_MIN, INCOME_CLIFF_MAX, stateByCode, type StateTax } from "@/data/states";
import type { Source } from "@/data/params/types";
import { datasetLd, pageMetadata } from "@/lib/seo";
import { longDate, money } from "@/lib/format";

const SLUG = "state-retirement-taxes";
const TITLE = "State Taxes on Retirement Income 2026: All 50 States";
const DESC =
  "Which states tax Social Security, pensions and IRA withdrawals in 2026? Compare all 50 states and DC with official state sources, rates and senior breaks.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const href = (s: StateTax) => `/${SLUG}/${s.slug}`;
const names = (list: StateTax[]) => list.map((s) => s.name);

const ssTax = SUMMARY.taxSocialSecurity;
const ssPartly = SUMMARY.taxSocialSecurityPartly;
const ssFully = SUMMARY.taxSocialSecurityFully;
const noTax = SUMMARY.noBroadIncomeTax;
const exemptAll = SUMMARY.exemptAllRetirement;
const bigOnly = SUMMARY.bigExclusion.filter((s) => s.relief.level === "large");
const ssFree = SUMMARY.dontTaxSocialSecurity;
const cliff = SUMMARY.bigExclusion.filter((s) => s.relief.incomeLimited);
const exempt65 = ssTax.filter((s) => s.socialSecurity.exemptAt65);
const WA = stateByCode("WA");

const FAQ: FaqItem[] = [
  {
    q: "Which states tax Social Security in 2026?",
    a: `${capitalize(numberWord(ssTax.length))} states tax at least some Social Security benefits in 2026: ${listJoin(names(ssTax))}. ${listJoin(names(ssFully))} taxes benefits the same way the federal return does; the other ${numberWord(ssPartly.length)} exempt them below an income limit or above an age, so many retirees there owe nothing on their benefits.`,
  },
  {
    q: "Which states have no state income tax for retirees?",
    a: `${capitalize(numberWord(noTax.length))} states have no broad income tax: ${listJoin(names(noTax))}. Social Security, pensions and IRA withdrawals are not taxed there. The caveat is ${WA.name}: ${WA.noTaxNote}`,
  },
  {
    q: "Which states don’t tax pensions or IRA withdrawals?",
    a: `Besides the ${numberWord(noTax.length)} states without an income tax, ${listJoin(names(exemptAll))} exempt essentially all pension, IRA and 401(k) income for retirees. ${exemptAll.map((s) => `${s.name}: ${s.relief.headline}`).join(" ")} ${capitalize(numberWord(bigOnly.length))} more states offer a large break — at least ${money(LARGE_RELIEF_MIN)} per person, or most employer pensions in full — though in some it ends at higher incomes.`,
  },
  {
    q: "Are required minimum distributions taxed by states?",
    a: "Yes, in most states with an income tax: an RMD is simply an IRA or 401(k) withdrawal, so it follows the state’s rules for those accounts. In states with a retirement exclusion, the RMD can be partly or fully covered by it. Open your state’s page to see the exact rule.",
  },
  {
    q: "How do you decide whether a state is tax-friendly for retirees?",
    a: `We apply one written rule to every state using three facts: whether Social Security is taxed, how much pension and IRA income the state excludes, and the top income tax rate (under ${LOW_RATE}% counts as low; ${HIGH_RATE}% or more as high). The rule is spelled out on this page under “How we rate each state.”`,
  },
];

/** One primary source per state (the first listed), so the page cites every jurisdiction. */
const SOURCES: Source[] = STATES.map((s) => ({ label: `${s.name}: ${s.sources[0].label}`, url: s.sources[0].url, publisher: "State" }));

export default function Page() {
  const rows = stateRows();
  const stats = [
    { n: ssTax.length, label: "states tax some Social Security", note: `${names(ssTax).slice(0, 3).join(", ")} and ${ssTax.length - 3} more` },
    { n: noTax.length, label: "states have no broad income tax", note: "Social Security, pensions and IRAs untaxed" },
    { n: exemptAll.length, label: "income-tax states exempt all pension and IRA income", note: listJoin(names(exemptAll)) },
    {
      n: ssFree.filter((s) => s.code !== "DC").length,
      label: `states${ssFree.some((s) => s.code === "DC") ? " + DC" : ""} don’t tax Social Security`,
      note: "Including every no-income-tax state",
    },
  ];

  return (
    <>
      <JsonLd
        data={datasetLd({
          name: "State taxes on retirement income, 2026",
          description: DESC,
          path: `/${SLUG}`,
          dateModified: SUMMARY.lastVerified,
          sources: SOURCES.map((s) => s.url),
        })}
      />
      <ToolHero
        crumbs={[{ name: "State retirement taxes", path: `/${SLUG}` }]}
        eyebrow="Taxes · All 50 states + DC"
        icon="map"
        title={
          <>
            State taxes on retirement income <span className="italic font-normal text-sun-ink">in 2026</span>
          </>
        }
        lead={
          <p>
            <strong className="text-ink">{capitalize(numberWord(ssTax.length))} states tax Social Security in 2026</strong> — {listJoin(names(ssTax))}. In{" "}
            {numberWord(ssPartly.length)} of them an income or age limit exempts many retirees; only {listJoin(names(ssFully))} taxes benefits the way the IRS
            does. <strong className="text-ink">{capitalize(numberWord(noTax.length))} states have no broad income tax</strong>, so retirement income there
            isn’t taxed at all. Everywhere else, the real question is how much pension and IRA income your state lets you exclude.
          </p>
        }
        chips={
          <>
            <StatusChip status="official">2026 state rules</StatusChip>
            <StatusChip status="not_yet_announced">A few 2026 amounts still pending</StatusChip>
          </>
        }
      />

      <ContentSection>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-labelledby="map-h" className="float p-4 sm:p-7">
            <h2 id="map-h" className="text-[1.5rem] font-semibold sm:text-[1.75rem]">
              The map: how each state treats retirees
            </h2>
            <p className="mb-5 mt-1 text-[1rem] text-ink-3">Tap a state for its full 2026 rules.</p>
            <TileMap />
          </section>
          <div className="grid content-start gap-3 sm:gap-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="float-soft flex flex-col p-4 sm:p-5">
                  <span className="num font-display text-[2.2rem] font-semibold leading-none text-ink sm:text-[2.6rem]">{s.n}</span>
                  <span className="mt-2 text-[1rem] font-bold leading-snug text-ink sm:text-[1.0625rem]">{s.label}</span>
                  <span className="mt-1 text-[0.9rem] leading-snug text-ink-3 sm:text-[0.95rem]">{s.note}</span>
                </div>
              ))}
            </div>
            <div className="float-soft p-5">
              <p className="font-bold text-ink">How to read the ratings</p>
              <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">
                Each label comes from one written rule: is Social Security taxed, how much pension and IRA income is excluded, and how high the top rate is.
              </p>
              <a href="#how-we-rate" className="link mt-2 inline-block text-[1rem]">
                See the rule
              </a>
            </div>
          </div>
        </div>
      </ContentSection>

      <ContentSection className="mt-10">
        <section aria-labelledby="compare-h" className="float p-4 sm:p-8">
          <h2 id="compare-h" className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
            Compare all 50 states and DC
          </h2>
          <p className="mb-6 mt-2 max-w-3xl text-[1.0625rem] text-ink-2">
            Filter, search or sort, then open any state for the exact 2026 rules. “Partly taxed” means an exclusion, cap, age test or income limit applies.
          </p>
          <StateTable rows={rows} />
        </section>
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2 id="social-security">Which states tax Social Security in 2026?</h2>
          <p className="answer">
            {capitalize(numberWord(ssTax.length))} states: {listJoin(names(ssTax))}. All the other states, plus DC, leave Social Security alone — that’s{" "}
            {statesPhrase(ssFree.map((s) => s.code))}.
          </p>
          <p>
            Even in these {numberWord(ssTax.length)}, many retirees owe little or nothing on their benefits. Here is who actually pays (AGI is the adjusted gross
            income on your federal return):
          </p>
          <ul>
            {ssTax.map((s) => (
              <li key={s.code}>
                <Link href={href(s)}>
                  <strong>{s.name}</strong>
                </Link>{" "}
                — {s.socialSecurity.whoPays}
              </li>
            ))}
          </ul>
          <p>
            New for 2026: <Link href={`/${SLUG}/west-virginia`}>West Virginia</Link> finished phasing out its tax on benefits, so it no longer taxes Social
            Security for anyone. To see how much of your benefit is taxable on your federal return, use the{" "}
            <Link href="/taxable-social-security-calculator">taxable Social Security calculator</Link>.
          </p>

          <h2 id="no-income-tax">Which states have no income tax?</h2>
          <p className="answer">
            {capitalize(numberWord(noTax.length))}: {listJoin(names(noTax))}. None of them taxes Social Security, pensions, IRA withdrawals or military
            retirement pay.
          </p>
          <ul>
            {noTax.map((s) => (
              <li key={s.code}>
                <Link href={href(s)}>
                  <strong>{s.name}</strong>
                </Link>{" "}
                — {s.noTaxNote}
              </li>
            ))}
          </ul>
          <p>No income tax doesn’t mean no taxes — property, sales and other taxes can still add up, and we don’t compare them here.</p>

          <h2 id="biggest-exclusions">Which states have the biggest retirement income exclusions?</h2>
          <p className="answer">
            {listJoin(names(exemptAll))} exempt essentially all pension, IRA and 401(k) income. Next come {numberWord(bigOnly.length)} states that exclude at
            least {money(LARGE_RELIEF_MIN)} per person, or most employer pensions in full.
          </p>
          <ul>
            {exemptAll.map((s) => (
              <li key={s.code}>
                <Link href={href(s)}>
                  <strong>{s.name}</strong>
                </Link>{" "}
                — {s.relief.headline}
              </li>
            ))}
            {bigOnly.map((s) => (
              <li key={s.code}>
                <Link href={href(s)}>
                  <strong>{s.name}</strong>
                </Link>{" "}
                — {s.relief.headline}
                {s.relief.incomeLimited ? " (Income limits apply.)" : ""}
              </li>
            ))}
          </ul>
          <p>
            Big exclusions matter most in the years your required minimum distributions grow — see what yours will be with the{" "}
            <Link href="/rmd-calculator">RMD calculator</Link>.
          </p>

          <h2 id="how-we-rate">How we rate each state</h2>
          <p className="answer">
            Every label comes from one written rule applied to three facts: whether Social Security is taxed, how much pension and IRA income is excluded, and the
            top income tax rate.
          </p>
          <p>First, each state’s pension and IRA break is put in one of three groups:</p>
          <dl className="not-prose grid gap-3 sm:grid-cols-3">
            {RELIEF_TERMS.map((r) => (
              <div key={r.term} className="sunk p-4">
                <dt className="font-bold text-ink">{r.term}</dt>
                <dd className="mt-1 text-[1rem] leading-relaxed text-ink-2">{r.meaning}</dd>
              </div>
            ))}
          </dl>
          <p>Then the label follows from that, Social Security and the top rate:</p>
          <div className="not-prose space-y-3">
            {VERDICT_RULES.map((r) => (
              <div key={r.label} className="sunk flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                <span className="shrink-0 sm:w-60">
                  <VerdictPill label={r.label} />
                </span>
                <p className="text-[1.0625rem] leading-relaxed text-ink-2">{r.rule}</p>
              </div>
            ))}
          </div>
          <p>
            So a big exclusion that disappears entirely at {money(INCOME_CLIFF_MAX)} of income or less (as in {listJoin(names(cliff))}) counts as a partial
            break, and Social Security that is exempt for everyone 65 or older ({listJoin(names(exempt65))}) counts as untaxed for the rating — though those
            states still appear in the Social Security list above.
          </p>
          <h3>Tax year, sources and confidence</h3>
          <p>
            Everything here describes tax year 2026, from state revenue departments, statutes and legislatures — no blogs. Each state was researched from primary
            sources and then checked by a separate adversarial review; where the reviewer found an error we use the corrected figure, and where a 2026 amount
            hasn’t been published yet we show the latest official one and say so. We rate our confidence high for {SUMMARY.highConfidence} of {SUMMARY.total} and
            medium for the rest. Last verified {longDate(SUMMARY.lastVerified)}.
          </p>
          <p>
            This page covers state income tax only. Local income taxes (in states such as Indiana, Maryland, Michigan and New York), property and sales taxes
            aren’t part of the rating.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList sources={SOURCES} title="Sources (one primary source per state)" />
        <Feedback />
        <RelatedTools slugs={["taxable-social-security-calculator", "rmd-calculator", "irmaa-calculator"]} />
      </ContentSection>
    </>
  );
}
