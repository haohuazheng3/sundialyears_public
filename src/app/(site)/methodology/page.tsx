import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { OnThisPage } from "@/components/site/contact/OnThisPage";
import { SourceDirectory } from "@/components/site/contact/SourceDirectory";
import { ALL_SOURCES } from "@/components/site/contact/source-registry";
import { REPLY_PROMISE } from "@/components/site/contact/topics";
import { SOURCE_WATCH_HOURS, UPDATE_TARGET } from "@/components/site/contact/policy";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Feedback } from "@/components/tool/Feedback";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { ORG_ID, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";
import { MONTHS, longDate, money, money2, moneySmart } from "@/lib/format";
import { PARAM_STATUS_SUMMARY } from "@/data/params";
import { SRC } from "@/data/params/sources";
import { COLA, FAIRNESS_ACT } from "@/data/params/social-security";
import { IRMAA_2026, IRMAA_2027, IRMAA_2027_ALT_BOUNDS, IRMAA_2027_INDEXING, IRMAA_PCT, PART_B, PART_D } from "@/data/params/medicare";
import { CMS_RELEASE_DATES, CPI_WINDOW_2027, IRMAA_FORMULA, IRMAA_INDEXING_RULE, IRMAA_SRC, IRMAA_THRESHOLD_HISTORY } from "@/data/params/irmaa-extra";
import { COLA_2027_DATES, SRC_EXTRA } from "@/data/params/numbers-extra";
import { RMD_SRC } from "@/data/params/rmd-extra";
import { IRS_2027_ADJUSTMENTS, QCD } from "@/data/params/tax";

const PATH = "/methodology";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = "2026-10-23";
const TITLE = "Methodology: Our Sources, Checks and Update Calendar";
const DESC =
  "Where every Sundial Years number comes from, how each one is verified against SSA, CMS and IRS documents, when we update, and how projections are made.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const TOC = [
  { id: "sources", label: "Where our numbers come from" },
  { id: "verification", label: "How every number is checked" },
  { id: "calendar", label: "Update calendar" },
  { id: "projections", label: "How projections are made" },
  { id: "rounding", label: "Rounding rules" },
  { id: "limits", label: "What the calculators can’t do" },
  { id: "errors", label: "Found an error?" },
  { id: "all-sources", label: "Every federal source, by agency" },
];

const H2 = "scroll-mt-28";

export default function MethodologyPage() {
  const idx = IRMAA_2027_INDEXING.value;
  const publishedCpiMonths = CPI_WINDOW_2027.value.filter((m) => m.value != null).length;
  const history = IRMAA_THRESHOLD_HISTORY.value;
  const firstBackTest = history[0].year;
  const lastBackTest = history[history.length - 1].year;
  const b26 = PART_B[2026].value;
  const b27 = PART_B[2027].value;
  const d27 = PART_D[2027].value;
  const dBase = IRMAA_FORMULA.partDBasePct.value;
  const altGap = Math.max(...IRMAA_2027.individualBounds.map((b, i) => b - IRMAA_2027_ALT_BOUNDS.individualBounds[i]));
  const movedTiers = IRMAA_2027.individualBounds.filter((b, i) => b !== IRMAA_2027_ALT_BOUNDS.individualBounds[i]).length;
  const [lastY, lastM] = CPI_WINDOW_2027.value[CPI_WINDOW_2027.value.length - 1].month.split("-").map(Number);
  const lastCpiMonth = `${MONTHS[lastM - 1]} ${lastY}`;
  const missing = CPI_WINDOW_2027.value.find((m) => m.value == null)?.month.split("-").map(Number);
  const missingCpiMonth = missing ? `${MONTHS[missing[1] - 1]} ${missing[0]}` : "one month";
  const missingMonthName = missing ? MONTHS[missing[1] - 1] : "the missing month";
  const partDTier1Exact = (d27.baseBeneficiaryPremium * ((IRMAA_PCT[1] ?? 0) - dBase)) / dBase;
  const jointMult = IRMAA_INDEXING_RULE.value.jointMultiple;
  const tierLabels = ["First surcharge tier starts above", "Second tier starts above", "Third tier starts above", "Fourth tier starts above"];

  const calendar: { when: string; what: string; who: string; latest: React.ReactNode; status: React.ReactNode }[] = [
    {
      when: "Mid-October",
      what: "Cost-of-living adjustment (COLA), taxable maximum, earnings-test limits, bend points, SSI amounts",
      who: "SSA",
      latest: <>2027 figures announced {longDate(COLA_2027_DATES.value.announced)}</>,
      status: <StatusChip status={COLA[2027].status} />,
    },
    {
      when: "October – November",
      what: "Tax brackets, standard deduction and other inflation adjustments (Revenue Procedure)",
      who: "IRS",
      latest: <>2026 figures came out {longDate(SRC.irsRevProc202532.published)}</>,
      status: <StatusChip status={IRS_2027_ADJUSTMENTS.status} />,
    },
    {
      when: "November",
      what: "Retirement-plan limits, including the qualified charitable distribution (QCD) limit",
      who: "IRS",
      latest: (
        <>
          2026 limit ({money(QCD[2026].value.limit ?? 0)}) came out {longDate(RMD_SRC.irsNotice2567.published ?? "")}
        </>
      ),
      status: <StatusChip status={QCD[2027].status} />,
    },
    {
      when: "Early to mid-November",
      what: "Part B premium and deductible, Part A amounts, IRMAA brackets and surcharges",
      who: "CMS",
      latest: <>2026 figures came out {longDate(CMS_RELEASE_DATES.value[2026])}</>,
      status: <StatusChip status={PART_B[2027].status} />,
    },
    {
      when: "April",
      what: "Part D deductible and out-of-pocket cap (Rate Announcement)",
      who: "CMS",
      latest: <>2027 figures published {longDate(SRC.cmsRate2027.published)}</>,
      status: <StatusChip status={PART_D[2027].status} />,
    },
    {
      when: "Late July",
      what: "Part D base beneficiary premium (the basis of Part D IRMAA and late-enrollment penalties)",
      who: "CMS",
      latest: <>2027 figure published {longDate(SRC.cmsPartD2027.published)}</>,
      status: <StatusChip status={PART_D[2027].status} />,
    },
    {
      when: "Spring – summer",
      what: "Social Security and Medicare Trustees Reports (life tables, trust-fund outlook, next year’s Part B projection)",
      who: "SSA / CMS",
      latest: <>2026 reports released {longDate(SRC.ssaTrustees2026.published)}</>,
      status: <StatusChip status="official">2026 reports in use</StatusChip>,
    },
    {
      when: "When issued",
      what: "Required minimum distribution (RMD) regulations",
      who: "Treasury / IRS",
      latest: <>Final regulations published {longDate(SRC.fr2024RmdFinal.published)}; some proposed rules still pending</>,
      status: <StatusChip status="official">Current rules in use</StatusChip>,
    },
    {
      when: "Monthly",
      what: "Consumer Price Index (CPI-U), used to project next year’s IRMAA brackets",
      who: "BLS",
      latest: <>Months through {lastCpiMonth} used for the 2027 projection</>,
      status: <StatusChip status="official" />,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          url: absoluteUrl(PATH),
          description: DESC,
          dateModified: UPDATED,
          about: { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          inLanguage: "en-US",
        }}
      />
      <TrustHero
        crumbs={[{ name: "Methodology", path: PATH }]}
        eyebrow="Methodology & sources"
        icon="source"
        title={
          <>
            Where our numbers come from, <span className="italic font-normal text-sun-ink">and how we check them</span>
          </>
        }
        lead={
          <p>
            Every figure on {SITE.name} comes from an official government document — SSA, CMS, the IRS, Treasury, BLS or the law itself — is
            re-checked by an independent second review, and is labeled <StatusChip status="official" /> or <StatusChip status="projected" /> so
            you always know whether it is final. Automated tests check the headline figures and the formulas.
          </p>
        }
        updated={UPDATED}
        showVerified
      />

      <ContentSection className="space-y-10">
        <OnThisPage items={TOC} />

        <ProseCard>
          <h2 id="sources" className={H2}>
            Where do our numbers come from?
          </h2>
          <p className="answer">
            Only from the bodies that set them: the Social Security Administration (SSA), the Centers for Medicare &amp; Medicaid Services (CMS),
            the Internal Revenue Service (IRS), Treasury regulations, federal law, the Bureau of Labor Statistics (BLS) and, for state taxes, each
            state’s own tax agency. No official document, no number.
          </p>
          <p>
            We never copy a figure from a news story, a blog, a financial firm’s summary or another calculator. Those are useful for spotting that
            something changed — but they round, simplify and sometimes get it wrong. We go to the fact sheet, the regulation or the agency’s
            operations manual itself. Today that is {ALL_SOURCES.length} federal documents; the <a href="#all-sources">full list</a> is at the
            bottom of this page, each calculator lists the ones it uses, and each state page lists that state’s own sources.
          </p>
          <p>
            Large tables — the IRS life-expectancy tables for RMDs, the history of every COLA, SSA’s life tables and the national average wage
            index — are never typed in by hand: a script reads the agency’s own file and generates the table, so a copying slip can’t creep into a
            single row.
          </p>

          <h2 id="verification" className={H2}>
            How is each number checked before it goes live?
          </h2>
          <p className="answer">
            Three times, in three different ways: a research pass that reads the primary source, an independent verification pass that tries to
            prove the first one wrong, and automated tests that compare the headline figures in the site’s code with the verified record and run
            the calculators against the agencies’ own worked examples.
          </p>
          <ol>
            <li>
              <strong>Research.</strong> Each value is recorded together with the document’s address, the exact wording it came from and any worked
              example the agency gives. Rules (who qualifies, which year’s income counts, how a deadline works) are recorded the same way, not just
              the numbers.
            </li>
            <li>
              <strong>Independent, adversarial verification.</strong> A second review starts from the sources, not from the first answer, and
              tries to break every value: re-derive it from the formula, compare it with earlier years, look for errata and later corrections.
              Where the two disagree, the document decides, and the correction is written down.
            </li>
            <li>
              <strong>Automated cross-checks.</strong> Tests compare every headline figure in the code with the verified research record, and run
              each calculator against the agencies’ own examples — IRS Publication 590-B for RMDs, the Publication 915 worksheet for taxes on
              benefits, SSA’s earnings-test examples. They run automatically every time a change is pushed to the site.
            </li>
          </ol>
          <p>
            A rule has to prove itself on the past before we trust it with the future. The formula we use to project next year’s IRMAA brackets,
            for example, reproduces every published bracket from {firstBackTest} through {lastBackTest} exactly.
          </p>

          <h2 id="calendar" className={H2}>
            When do the numbers change, and how fast do we update?
          </h2>
          <p className="answer">
            Most change once a year, on a predictable schedule: Social Security in mid-October, IRS tax figures in October or November, Medicare
            premiums in November. An automated watcher checks the key official pages every {SOURCE_WATCH_HOURS} hours, and we aim to have new
            figures on the site {UPDATE_TARGET} of publication.
          </p>
          <p>
            Until then, the page keeps showing the previous official figure or a clearly labeled projection — never a silent mix. When the official
            number arrives, the label flips to Official and the “Verified” date at the top of every calculator moves forward.
          </p>
        </ProseCard>

        <div className="float overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-sy text-[1rem]">
              <caption className="px-5 pb-2 pt-5 text-left text-[1.2rem] font-semibold text-ink sm:px-6">
                The yearly calendar of retirement numbers
              </caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">What changes</th>
                  <th scope="col">Who</th>
                  <th scope="col">Latest</th>
                  <th scope="col">2027 status</th>
                </tr>
              </thead>
              <tbody>
                {calendar.map((r) => (
                  <tr key={r.what}>
                    <td className="strong whitespace-nowrap">{r.when}</td>
                    <td className="min-w-[16rem]">{r.what}</td>
                    <td className="whitespace-nowrap">{r.who}</td>
                    <td className="min-w-[12rem]">{r.latest}</td>
                    <td className="whitespace-nowrap">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ProseCard>
          <h3 className="!mt-0">Where things stand on {longDate(SITE.dataVerifiedOn)}</h3>
          <p>Still waiting on the agency (shown as a projection or as “not announced yet” until it arrives):</p>
          <ul>
            {PARAM_STATUS_SUMMARY.pending.map((p) => (
              <li key={p.item}>
                <strong>{p.item}.</strong> Expected: {p.expected}
              </li>
            ))}
          </ul>
          <p>Already official for 2027:</p>
          <ul>
            {PARAM_STATUS_SUMMARY.officialHeadlines.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <h2 id="projections" className={H2}>
            How do we project numbers that aren’t official yet?
          </h2>
          <p className="answer">
            Only when the law spells out a formula or the government’s own actuaries have published a projection. The 2027 IRMAA income brackets
            come from the inflation formula written into the Medicare statute; the 2027 Part B premium comes from the Medicare Trustees Report. Both
            stay labeled Projected until CMS publishes.
          </p>

          <h3>2027 IRMAA brackets: the inflation formula</h3>
          <p>
            IRMAA (the income-related monthly adjustment amount) is the surcharge higher-income people pay on Medicare Parts B and D. By law
            (42 U.S.C. §1395r(i)(5)) its income brackets rise with the consumer price index for urban consumers (CPI-U): take the average CPI-U for
            the 12 months from September through August before the premium year, divide it by the same average for September 2017 – August 2018 (
            {idx.baseAvgSep2017Aug2018}), multiply the original bracket amounts by that ratio and round to the nearest{" "}
            {money(IRMAA_INDEXING_RULE.value.roundTo)}. For joint filers, the four indexed brackets are exactly{" "}
            {jointMult === 2 ? "double" : `${jointMult} times`} the single-filer ones. The top bracket is the exception: it starts at{" "}
            {money(IRMAA_2027.topIndividual)} for single filers but {money(IRMAA_2027.topJoint)} — not double — for joint filers.
          </p>
          <p>
            The wrinkle this year is a missing month. BLS never published the CPI-U for {missingCpiMonth} because of the federal government
            shutdown, and says it can’t be collected after the fact. Averaging the{" "}
            {publishedCpiMonths} published months gives {idx.avgSep2025Aug2026_11mo} and a ratio of {idx.factor}. If CMS instead fills in the
            missing month, {movedTiers} of the {IRMAA_2027.individualBounds.length} brackets come out {money(altGap)} lower. We show the first
            version and mention the second wherever it matters.
          </p>
        </ProseCard>

        <div className="float overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-sy text-[1rem]">
              <caption className="px-5 pb-2 pt-5 text-left text-[1.2rem] font-semibold text-ink sm:px-6">
                IRMAA income brackets for single filers: 2026 official vs. 2027 projected
              </caption>
              <thead>
                <tr>
                  <th scope="col">Bracket</th>
                  <th scope="col">Original amount</th>
                  <th scope="col">2026 (official)</th>
                  <th scope="col">2027 before rounding</th>
                  <th scope="col">2027 projection</th>
                  <th scope="col">If {missingMonthName} is filled in</th>
                </tr>
              </thead>
              <tbody>
                {tierLabels.map((label, i) => (
                  <tr key={label}>
                    <td className="strong min-w-[12rem]">{label}</td>
                    <td>{money(idx.baseAmounts[i])}</td>
                    <td>{money(IRMAA_2026.individualBounds[i])}</td>
                    <td>{money2(idx.unrounded[i])}</td>
                    <td className="strong">{money(IRMAA_2027.individualBounds[i])}</td>
                    <td>{money(IRMAA_2027_ALT_BOUNDS.individualBounds[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 pb-5 pt-3 text-[0.9375rem] text-ink-3 sm:px-6">
            The top bracket ({money(IRMAA_2027.topIndividual)} for single filers) is fixed in law and is not indexed until{" "}
            {IRMAA_INDEXING_RULE.value.topTierFirstIndexedYear}. Sources: <a className="link" href={SRC.statuteIrmaa.url} target="_blank" rel="noopener">42 U.S.C. §1395r(i)</a>,{" "}
            <a className="link" href={SRC.blsCpiU.url} target="_blank" rel="noopener">BLS CPI-U</a>,{" "}
            <a className="link" href={IRMAA_SRC.blsShutdownFaq.url} target="_blank" rel="noopener">BLS shutdown FAQ</a>.
          </p>
        </div>

        <ProseCard>
          <h3 className="!mt-0">2027 Part B premium: the Trustees’ projection</h3>
          <p>
            Each year the Medicare Trustees Report projects next year’s Part B premium. The {longDate(SRC.medicareTrustees2026.published)} report
            puts the 2027 standard premium at {moneySmart(b27.premium)} a month (up from {moneySmart(b26.premium)} in 2026) and the deductible at{" "}
            {money(b27.deductible)} (from {money(b26.deductible)}). We use those figures, and the Trustees’ IRMAA amounts for Part B, until CMS
            publishes the official ones — usually in November. A Trustees projection is an estimate made months in advance, which is why the label
            matters.
          </p>
          <p>
            The Part D side is firmer. The 2027 base beneficiary premium ({money2(d27.baseBeneficiaryPremium)}) is already official, and federal
            regulation (42 CFR 423.286) fixes how the Part D surcharge follows from it: base premium × (applicable percentage − {dBase}) ÷ {dBase}.
            For the first tier that is {money2(d27.baseBeneficiaryPremium)} × ({IRMAA_PCT[1]} − {dBase}) ÷ {dBase} = $
            {partDTier1Exact.toFixed(3)}, which rounds to the nearest dime: {money2(IRMAA_2027.partDAddOn[1])} a month.
          </p>

          <h3>What we don’t project</h3>
          <p>
            We don’t guess at the 2027 tax brackets, the 2027 standard deduction or the 2027 QCD limit. The IRS computes them with its own
            inflation measure and rounding rules, and recent tax law changed several of them; a wrong guess would quietly flow into your tax
            estimate. Until the IRS publishes, those items carry a <StatusChip status={IRS_2027_ADJUSTMENTS.status} /> label and the calculators
            use the official 2026 figures, said out loud.
          </p>

          <h2 id="rounding" className={H2}>
            How do we round?
          </h2>
          <p className="answer">
            Exactly the way each agency does, because a few cents can change an answer: SSA rounds benefits down to the dime and payments down to the
            whole dollar, CMS rounds premiums to the nearest dime, and IRMAA brackets are rounded to the nearest{" "}
            {money(IRMAA_INDEXING_RULE.value.roundTo)}.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Figure</th>
                  <th scope="col">Rule</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Social Security benefit (PIA and each adjustment)</td>
                  <td>Rounded down to the next lower dime</td>
                  <td>
                    <a className="link" href={SRC_EXTRA.ssaPiaFormula.url} target="_blank" rel="noopener">
                      SSA benefit formula
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="strong">Social Security payment you receive</td>
                  <td>Rounded down to the whole dollar</td>
                  <td>
                    <a className="link" href={SRC_EXTRA.ssaColaApplication.url} target="_blank" rel="noopener">
                      SSA: how the COLA is applied
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="strong">Medicare premiums and IRMAA surcharges</td>
                  <td>Nearest {money2(IRMAA_FORMULA.roundTo.value)}</td>
                  <td>
                    <a className="link" href={IRMAA_FORMULA.roundTo.source.url} target="_blank" rel="noopener">
                      42 CFR 408.27
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="strong">IRMAA income brackets</td>
                  <td>Nearest {money(IRMAA_INDEXING_RULE.value.roundTo)}</td>
                  <td>
                    <a className="link" href={IRMAA_INDEXING_RULE.source.url} target="_blank" rel="noopener">
                      42 U.S.C. §1395r(i)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="strong">Required minimum distribution</td>
                  <td>No IRS rounding rule — we compute to the cent</td>
                  <td>
                    <a className="link" href={SRC.irsPub590b.url} target="_blank" rel="noopener">
                      IRS Publication 590-B
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Headlines show whole dollars so they’re easy to read; the “Show the math” panel under each result shows the exact table values and each
            step. When in doubt, round a required withdrawal up — taking slightly more than the minimum is always allowed.
          </p>

          <h2 id="limits" className={H2}>
            What can’t our calculators do?
          </h2>
          <p className="answer">
            They give educational estimates from the official rules and the numbers you enter — not personal financial, tax or legal advice. They
            can’t see your earnings record or tax return, and a few situations need the agency or a professional.
          </p>
          <ul>
            <li>
              <strong>Your own record wins.</strong> Social Security results start from the benefit amount you enter. The figure on your{" "}
              <em>my Social Security</em> statement is the authority; SSA has your full earnings history and we don’t.
            </li>
            <li>
              <strong>Public pensions.</strong> {FAIRNESS_ACT.value} So we no longer reduce benefits for a pension from work that didn’t pay Social
              Security tax — if an older calculator still does, it is out of date.
            </li>
            <li>
              <strong>Pensions and annuities.</strong> We treat their payments as income you enter. We don’t compare pension payout options or value an
              annuity.
            </li>
            <li>
              <strong>Disability and survivors.</strong> We don’t model Social Security disability benefits (SSDI) or the full set of survivor
              rules. If you are on disability or claiming on a late spouse’s record, call SSA before you decide anything.
            </li>
            <li>
              <strong>Medicare plans.</strong> We cover the Part B premium, IRMAA and Part D surcharges. We don’t price Medicare Advantage,
              Medigap or individual drug plans, or help programs such as Extra Help and the Medicare Savings Programs.
            </li>
            <li>
              <strong>Taxes.</strong> The calculators use federal rules. State rules are summarized on our{" "}
              <Link href="/state-retirement-taxes">state retirement taxes</Link> page.
            </li>
          </ul>
          <p>
            A common mistake we see: treating a projection as a promise. This year {movedTiers} of the projected IRMAA brackets hinge on how CMS
            handles one missing month — a {money(altGap)} swing. If your income is within a couple of thousand dollars of a bracket, plan with a
            cushion, or wait for the official table.
          </p>

          <h2 id="errors" className={H2}>
            Found an error?
          </h2>
          <p className="answer">
            Please tell us — it is the most useful message we get. Use the contact form with the topic “A number looks wrong”, and include the page
            and, if you have it, a link to the official figure. {REPLY_PROMISE}.
          </p>
          <p>
            Every report is checked against the primary source by a person. Confirmed errors are fixed in the single data file every page reads
            from, so the correction reaches every calculator at once, and the research record is updated with it.
          </p>
          <p>
            <Link href="/contact?topic=number-looks-wrong&page=/methodology" className="btn btn-primary text-void no-underline">
              Report a number that looks wrong
            </Link>
          </p>
        </ProseCard>

        <SourceDirectory />

        <Feedback />

        <RelatedTools slugs={["retirement-numbers-2027", "irmaa-brackets-2027", "social-security-cola"]} title="See the numbers themselves" />
      </ContentSection>
    </>
  );
}
