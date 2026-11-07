import type { Metadata } from "next";
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
import { BirthYearArticle, BirthYearLead, birthYearMilestones } from "@/components/reference/birth-year/BirthYearArticle";
import { BirthYearTimeline } from "@/components/reference/birth-year/MilestoneList";
import { RunNumbers, YearNav, yearHref } from "@/components/reference/birth-year/Navigation";
import { birthYearFaq } from "@/components/reference/birth-year/content";
import { cohortLife } from "@/components/reference/birth-year/cohort-life";
import {
  AGE_DRC_STOP,
  AGE_EARLY,
  BIRTH_YEARS,
  birthYearMeta,
  birthYearProfile,
  cohortTags,
  isBirthYear,
  pct1,
} from "@/components/reference/birth-year/timeline";
import { articleLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { SRC } from "@/data/params/sources";
import { BY_SRC, DEEMED_FILING } from "@/data/params/birth-year-extra";

const REF = SITE.copyrightYear;
const HUB = "social-security-by-birth-year";

/** One static page per birth year, 1943–1975. */
export function generateStaticParams() {
  return BIRTH_YEARS.map((y) => ({ year: String(y) }));
}

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const y = Number(raw);
  return isBirthYear(y) ? y : null;
}

export async function generateMetadata({ params }: PageProps<"/social-security-by-birth-year/[year]">): Promise<Metadata> {
  const { year } = await params;
  const y = parseYear(year);
  if (y == null) return {};
  const m = birthYearMeta(birthYearProfile(y, REF));
  return pageMetadata({ title: m.title, description: m.description, path: yearHref(y) });
}

export default async function Page({ params }: PageProps<"/social-security-by-birth-year/[year]">) {
  const { year } = await params;
  const y = parseYear(year);
  if (y == null) notFound();

  const tool = toolBySlug(HUB)!;
  const p = birthYearProfile(y, REF);
  const meta = birthYearMeta(p);
  const life = cohortLife(y, REF);
  const tags = cohortTags(y, REF);
  const sources = [
    SRC.ssaFra,
    BY_SRC.ecfrFra,
    BY_SRC.pomsAgeAttainment,
    BY_SRC.pomsFirstMonth,
    SRC.ssaArDrc,
    SRC.ssaDelayedCredits,
    SRC.ssaRet,
    BY_SRC.ecfrMedicareIep,
    BY_SRC.medicareGovCoverageStart,
    SRC.medicareGovPenalty,
    SRC.ecfrRmdAge,
    SRC.irsRmdFaq,
    SRC.irsSeniorDeduction,
    BY_SRC.irsSchedule1A,
    BY_SRC.ecfrColaFrom62,
    SRC.ssaColaSeries,
    SRC.ssaCohortLife,
    SRC.ssaPeriodLife,
    BY_SRC.pomsSurvivorReduction,
    ...(y === 1953 || y === 1954 ? [DEEMED_FILING.source] : []),
  ];

  return (
    <>
      <JsonLd
        data={articleLd({
          headline: meta.title,
          description: meta.description,
          path: yearHref(y),
          datePublished: SITE.dataVerifiedOn,
          dateModified: SITE.dataVerifiedOn,
        })}
      />
      <ToolHero
        crumbs={[
          { name: "Social Security by Birth Year", path: `/${HUB}` },
          { name: `Born in ${y}`, path: yearHref(y) },
        ]}
        eyebrow="Social Security by birth year"
        icon="calendar"
        title={
          <>
            Born in <span className="italic font-normal text-sun-ink">{y}</span>: your Social Security, Medicare &amp; RMD dates
          </>
        }
        lead={<BirthYearLead p={p} />}
        chips={
          <>
            <StatusChip status="official">SSA, CMS &amp; IRS rules</StatusChip>
            <span className="pill">
              Age {p.ageInRefYear.before}–{p.ageInRefYear.after} in {REF}
            </span>
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="pill pill-sun">
                {t}
              </span>
            ))}
          </>
        }
      />

      <section aria-label={`Timeline for people born in ${y}`} className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6">
          <div className="float p-5 sm:p-8">
            <h2 className="text-[1.6rem] font-semibold leading-tight">Your timeline</h2>
            <p className="mt-1 text-[1rem] text-ink-3">
              For a birthday in mid-{y}. Status as of {REF}; your exact birthday can shift a date by a month.
            </p>
            <BirthYearTimeline items={birthYearMilestones(p)} refYear={REF} />
          </div>
          <div className="space-y-5 lg:sticky lg:top-24">
            <section aria-labelledby="glance-h" className="float p-6 sm:p-7">
              <h2 id="glance-h" className="text-[1.45rem] font-semibold">
                At a glance
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Full retirement age" value={p.fra.label} />
                <Stat label="Survivor full retirement age" value={p.survivorFra.label} />
                <Stat label={`Benefit at ${AGE_EARLY}`} value={pct1(p.pctAt62)} sub="of your full benefit" />
                <Stat label={`Benefit at ${AGE_DRC_STOP}`} value={pct1(p.pctAt70)} sub="of your full benefit" tone="sage" />
              </div>
            </section>
            <RunNumbers p={p} />
          </div>
        </div>
      </section>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <BirthYearArticle p={p} life={life} />
        </ProseCard>
        <Faq items={birthYearFaq(p, REF)} title={`Born in ${y}: common questions`} />
        <YearNav year={y} />
        <SourceList sources={sources} />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
