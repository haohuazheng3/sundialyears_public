import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { VerdictPill } from "@/components/reference/states/style";
import { BracketTable, KeyPoints, NeighborCompare, TaxedMatrix } from "@/components/reference/states/StateModules";
import { possessive, rateAnswer, shortAnswer, stateFaq } from "@/components/reference/states/content";
import { STATES, nameOf, stateBySlug } from "@/data/states";
import type { Source } from "@/data/params/types";
import { articleLd, pageMetadata } from "@/lib/seo";

const BASE = "/state-retirement-taxes";

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.slug }));
}

const titleFor = (n: string) => `Does ${n} Tax Retirement Income? 2026 Rules`;

export async function generateMetadata({ params }: PageProps<"/state-retirement-taxes/[state]">): Promise<Metadata> {
  const { state } = await params;
  const s = stateBySlug(state);
  if (!s) return {};
  return pageMetadata({
    title: titleFor(nameOf(s)),
    description: s.metaDescription,
    path: `${BASE}/${s.slug}`,
    ogType: "article",
    publishedTime: s.lastVerified,
    modifiedTime: s.lastVerified,
  });
}

/** Facts still waiting on a 2026 publication (drafts, estimates, preliminary schedules). */
const PENDING = /not yet published|isn’t published|aren’t published|not published|preliminary|draft|estimates/i;

export default async function Page({ params }: PageProps<"/state-retirement-taxes/[state]">) {
  const { state } = await params;
  const s = stateBySlug(state);
  if (!s) notFound();

  const n = nameOf(s);
  const path = `${BASE}/${s.slug}`;
  const pending = (s.notes ?? []).some((x) => PENDING.test(x));
  const second = s.hasBroadIncomeTax ? s.relief.headline : (s.noTaxNote ?? "");
  const sources: Source[] = s.sources.map((x) => ({ label: x.label, url: x.url, publisher: "State" }));

  return (
    <>
      <JsonLd
        data={articleLd({
          headline: titleFor(n),
          description: s.metaDescription,
          path,
          datePublished: s.lastVerified,
          dateModified: s.lastVerified,
        })}
      />
      <ToolHero
        crumbs={[
          { name: "State retirement taxes", path: BASE },
          { name: s.name, path },
        ]}
        eyebrow={`State retirement taxes · ${s.taxYear}`}
        icon="map"
        title={
          <>
            Does {n} tax <span className="italic font-normal text-sun-ink">retirement income?</span>
          </>
        }
        lead={
          <>
            <p>
              <strong className="text-ink">Short answer: {shortAnswer(s)}</strong> {s.socialSecurity.summary} {second}
            </p>
            {/\bAGI\b/.test(`${s.socialSecurity.summary} ${second}`) ? (
              <p className="mt-2 text-[1rem] text-ink-3">AGI is the adjusted gross income on your federal tax return.</p>
            ) : null}
          </>
        }
        chips={
          <>
            <VerdictPill label={s.verdict.label} />
            {pending ? <StatusChip status="not_yet_announced">Some 2026 amounts pending</StatusChip> : <StatusChip status="official">2026 rules</StatusChip>}
          </>
        }
      />

      <ContentSection>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <TaxedMatrix s={s} />
          <KeyPoints s={s} />
        </div>
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2 id="social-security" className="scroll-mt-28">
            Does {n} tax Social Security?
          </h2>
          <p className="answer">{s.socialSecurity.summary}</p>
          <p>{s.socialSecurity.detail}</p>
          <p>
            Your federal return is a separate question — see how much of your benefit the IRS taxes with the{" "}
            <Link href="/taxable-social-security-calculator">taxable Social Security calculator</Link>.
          </p>

          <h2 id="pensions" className="scroll-mt-28">
            Are pensions taxed in {n}?
          </h2>
          <p className="answer">{s.pensions.summary}</p>
          <p>{s.pensions.detail}</p>
          {s.pensions.publicVsPrivate ? (
            <p>
              <strong>Public vs. private pensions:</strong> {s.pensions.publicVsPrivate}
            </p>
          ) : null}

          <h2 id="ira-401k" className="scroll-mt-28">
            Are IRA and 401(k) withdrawals taxed in {n}?
          </h2>
          <p className="answer">{s.iraAnd401k.summary}</p>
          <p>{s.iraAnd401k.detail}</p>
          <p>
            Required minimum distributions (RMDs) are IRA and 401(k) withdrawals, so the same rules apply. <Link href="/rmd-calculator">Estimate your RMD</Link>.
          </p>

          <h2 id="military" className="scroll-mt-28">
            Is military retirement pay taxed in {n}?
          </h2>
          <p className="answer">{s.military.summary}</p>

          <h2 id="rate" className="scroll-mt-28">
            What is {possessive(n)} income tax rate?
          </h2>
          <p className="answer">{rateAnswer(s)}</p>
          <p>{s.rates.summary}</p>
          <BracketTable s={s} />
          {s.rates.bracketsNote ? <p className="text-[1rem] text-ink-3">{s.rates.bracketsNote}</p> : null}
          {s.hasBroadIncomeTax ? (
            <>
              <h3>Standard deduction and exemptions</h3>
              <p>{s.deductions}</p>
            </>
          ) : null}

          <h2 id="senior-breaks" className="scroll-mt-28">
            What tax breaks do seniors get in {n}?
          </h2>
          <p className="answer">{s.seniorBreaks}</p>

          <h2 id="changes" className="scroll-mt-28">
            What changed for 2026?
          </h2>
          <p className="answer">{s.changes}</p>
          <p className="text-[1rem] text-ink-3">{s.taxYearNote}</p>

          {s.notes?.length ? (
            <div className="not-prose sunk mt-8 p-5">
              <p className="flex items-center gap-2 font-bold text-ink">
                <Icon name="info" size={18} className="text-sun-ink" /> What we couldn’t confirm
              </p>
              <ul className="mt-2 space-y-2 text-[1rem] leading-relaxed text-ink-2">
                {s.notes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </ProseCard>

        <NeighborCompare s={s} />

        <RelatedTools
          slugs={["taxable-social-security-calculator", "rmd-calculator", "irmaa-calculator"]}
          title="State tax is half the picture — check the federal side"
        />

        <Faq items={stateFaq(s)} title={`${n} retirement tax questions`} />
        <SourceList sources={sources} title={`Sources for ${n}`} />
        <Feedback />
        <p className="text-center">
          <Link href={BASE} className="btn btn-ghost">
            <Icon name="map" size={18} /> Compare all 50 states and DC
          </Link>
        </p>
      </ContentSection>
    </>
  );
}
