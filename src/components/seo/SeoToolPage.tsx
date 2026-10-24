import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection } from "@/components/tool/CalculatorShell";
import { Faq } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { getSeoPage } from "@/lib/seo-pages";
import { toolBySlug } from "@/lib/tools";

export function seoMetadata(slug: string): Metadata {
  const p = getSeoPage(slug);
  const tool = toolBySlug(slug)!;
  return p ? pageMetadata({ title: p.title, description: p.description, path: p.path }) : pageMetadata({ title: tool.title, description: tool.blurb, path: `/${slug}` });
}

/** Tool-first SEO page: H1 + answer → the calculator → keyword sections → CTA → FAQ → sources → next tools. */
export function SeoToolPage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const p = getSeoPage(slug);
  const tool = toolBySlug(slug)!;
  const next = toolBySlug(tool.next[0]);
  if (!p) {
    // Code-only checkout without the written content: the calculator still works.
    return (
      <>
        <ToolHero crumbs={[{ name: tool.navTitle, path: `/${slug}` }]} eyebrow={tool.group} icon={tool.icon} title={tool.title} lead={<p>{tool.blurb}</p>} />
        {children}
        <ContentSection className="mt-16">
          <RelatedTools slugs={tool.next} />
        </ContentSection>
      </>
    );
  }
  return (
    <>
      <JsonLd data={calculatorLd({ name: p.name, description: p.description, path: p.path })} />
      <ToolHero
        crumbs={[{ name: p.crumb, path: p.path }]}
        eyebrow={tool.group}
        icon={tool.icon}
        title={p.title}
        lead={<p>{p.lead}</p>}
        chips={<StatusChip status={p.chip.status}>{p.chip.text}</StatusChip>}
      />

      {children}

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <article className="float prose-sy mx-auto max-w-[860px] p-6 sm:p-10" dangerouslySetInnerHTML={{ __html: p.html }} />

        <aside aria-label="Next step" className="float-soft mx-auto flex max-w-[860px] flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="eyebrow">Your numbers, your answer</p>
            <p className="mt-2 text-[1.15rem] font-semibold leading-snug text-ink">Try a second scenario — the result updates as you type.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="#calculator" className="btn btn-primary">
              Back to the calculator
            </a>
            {next ? (
              <Link href={`/${next.slug}`} className="btn btn-ghost">
                {next.title} <Icon name="arrow" size={18} />
              </Link>
            ) : null}
          </div>
        </aside>

        <Faq items={p.faqs} />
        <SourceList sources={p.sources} />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
