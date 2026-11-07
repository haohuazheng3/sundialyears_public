import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { RmdCalculator } from "@/components/calculators/rmd/RmdCalculator";
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
import { SRC } from "@/data/params/sources";
import { UNIFORM_LIFETIME } from "@/data/params/rmd";
import { QCD } from "@/data/params/tax";
import { money } from "@/lib/format";

const SLUG = "rmd-calculator";
const TITLE = "RMD Calculator 2026 & 2027: Your Required Minimum Distribution";
const DESC =
  "Calculate your 2026 or 2027 required minimum distribution from an IRA or 401(k) with the official IRS tables, see the exact deadline, avoid the first-year double-up, and project future RMDs.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: "How do I calculate my RMD?",
    a: "Divide your account balance on December 31 of last year by the IRS distribution period for the age you reach this year. At 73 the factor is 26.5, so a $500,000 IRA requires $18,868. Use the Joint and Last Survivor table instead if your only beneficiary is a spouse more than 10 years younger.",
  },
  {
    q: "What age do RMDs start in 2026?",
    a: "Your RMD age is 73 if you were born from 1951 through 1959, and 75 if you were born in 1960 or later. People born in 1953 reach 73 in 2026, so their first RMD is for 2026 and is due by April 1, 2027.",
  },
  {
    q: "What happens if I miss an RMD?",
    a: "The IRS charges an excise tax of 25% of the amount you should have withdrawn, cut to 10% if you correct it within the correction window. File Form 5329; the IRS also waives the tax for reasonable errors you fix promptly, which you request by attaching an explanation.",
  },
  {
    q: "Can I take my RMD from just one IRA?",
    a: "Yes. Calculate the RMD for each traditional IRA separately, add them up, and withdraw the total from any one or more of your IRAs. 403(b) accounts can be combined the same way, but each 401(k) or 457(b) plan must pay its own RMD.",
  },
  {
    q: "Do Roth IRAs have required minimum distributions?",
    a: "No. Roth IRA owners never have lifetime RMDs, and starting in 2024 Roth 401(k) and Roth 403(b) accounts don’t either. Beneficiaries who inherit a Roth account generally must empty it within 10 years.",
  },
  {
    q: "Can my RMD go straight to charity?",
    a: `Yes, once you are 70½ a qualified charitable distribution (QCD) sent directly from your IRA to a charity counts toward your RMD and is left out of your taxable income — up to ${money(QCD[2026].value.limit ?? 0)} in 2026. It must leave the IRA by December 31.`,
  },
];

const TABLE_PREVIEW = [73, 74, 75, 76, 77, 78, 80, 85, 90, 95, 100];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "RMD Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "RMD Calculator", path: `/${SLUG}` }]}
        eyebrow="RMDs & IRAs"
        icon="rmd"
        title={
          <>
            RMD calculator for <span className="italic font-normal text-sun-ink">2026 and 2027</span>
          </>
        }
        lead={
          <p>
            Your required minimum distribution is last December 31’s balance divided by the IRS factor for your age. Enter your birth date and balance below to
            get the exact amount, the deadline, and what it means for your taxes and Medicare.
          </p>
        }
        chips={<StatusChip status="official">2026 & 2027 IRS tables</StatusChip>}
      />

      <RmdCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>How is a required minimum distribution calculated?</h2>
          <p className="answer">
            Take your account balance on December 31 of the prior year and divide it by the distribution period for the age you reach this year. Most people use the
            IRS Uniform Lifetime Table; married owners whose only beneficiary is a spouse more than 10 years younger use the Joint and Last Survivor Table.
          </p>
          <p>
            The factor shrinks every year, so the share you must withdraw grows — about 3.8% at 73, 5% at 80, 8.2% at 90 and 15.6% at 100. That is by design: the
            government gave you a tax break when you contributed, and RMDs are how it collects.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th>Age</th>
                  <th>Distribution period</th>
                  <th>% of balance</th>
                  <th>RMD per $100,000</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_PREVIEW.map((a) => (
                  <tr key={a}>
                    <td className="strong">
                      <Link className="link" href={`/rmd/age-${a}`}>
                        {a}
                      </Link>
                    </td>
                    <td>{UNIFORM_LIFETIME[a]}</td>
                    <td>{((1 / UNIFORM_LIFETIME[a]) * 100).toFixed(2)}%</td>
                    <td>{money(100000 / UNIFORM_LIFETIME[a])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            See the <Link href="/rmd-table">full Uniform Lifetime Table</Link> for every age from 72 to 120.
          </p>

          <h2>When is my RMD due?</h2>
          <p className="answer">
            Every RMD is due by December 31 — except your very first one, which you may delay until April 1 of the following year.
          </p>
          <p>
            Delaying sounds generous, but it usually backfires: you then owe two RMDs in the same tax year. For someone with a $600,000 IRA that’s roughly
            $46,000 of extra income in one year, enough to cross a tax bracket and an IRMAA threshold. Unless your income will drop sharply next year, take the first
            RMD in the year you turn 73.
          </p>

          <h2>What is my RMD age?</h2>
          <p className="answer">It depends only on your birth date: 73 if you were born 1951–1959, 75 if you were born in 1960 or later.</p>
          <ul>
            <li>Born before July 1, 1949: 70½ (old rule)</li>
            <li>Born July 1, 1949 – December 31, 1950: 72</li>
            <li>Born 1951 – 1959: 73</li>
            <li>Born 1960 or later: 75</li>
          </ul>
          <p>
            One wrinkle: the law’s wording is ambiguous for people born in 1959. Proposed IRS regulations say 73, and we use 73 — it doesn’t matter in practice until
            2032.
          </p>

          <h2>What if I’m still working?</h2>
          <p className="answer">
            If you still work for the company that sponsors your 401(k) or 403(b) and own 5% or less of it, that plan’s RMDs can wait until you retire.
          </p>
          <p>The exception never applies to IRAs — including rollover IRAs from old jobs — or to plans from former employers.</p>

          <h2>How to keep RMDs from raising your taxes</h2>
          <ul>
            <li>
              <strong>Give it away tax-free.</strong> From 70½, a qualified charitable distribution (QCD) sent straight from your IRA to a charity counts toward your RMD but
              never shows up in your income — which also helps with <Link href="/irmaa-calculator">IRMAA</Link> and the{" "}
              <Link href="/taxable-social-security-calculator">tax on your Social Security</Link>.
            </li>
            <li>
              <strong>Have taxes withheld from the RMD itself.</strong> Withholding is treated as paid evenly through the year, so a December RMD can cover a whole year
              of estimated tax.
            </li>
            <li>
              <strong>Convert before RMDs start.</strong> Roth conversions in your 60s shrink the balance that future RMDs are based on.
            </li>
          </ul>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList sources={[SRC.ecfrRmdTables, SRC.ecfrRmdAge, SRC.irsRmdFaq, SRC.irsPub590b, SRC.fr2024RmdFinal, SRC.irsExcise4974, SRC.irsQcd]} />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
