import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { BLOG_PATH, CATEGORIES, categoryPath, getFeaturedPosts, getPostsByCategory } from "@/lib/blog";
import { CALCULATORS } from "@/lib/tools";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { longDate } from "@/lib/format";
import { PostGrid, QuestionLinks, collectionLd, withSocialImage } from "./_components/blog-ui";

const TITLE = "Retirement Guides: Social Security, Medicare, RMDs & Taxes";
const DESC =
  "Plain-English guides to Social Security, Medicare and IRMAA, RMDs, IRAs and retirement taxes — answer first, built on the official SSA, CMS and IRS rules.";

export const metadata: Metadata = withSocialImage(pageMetadata({ title: TITLE, description: DESC, path: BLOG_PATH }));

export default function BlogHome() {
  const featured = getFeaturedPosts(6);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.slug, getPostsByCategory(c.slug).length]));

  return (
    <>
      <JsonLd
        data={collectionLd({
          name: "Sundial Years retirement guides",
          description: DESC,
          path: BLOG_PATH,
          items: CATEGORIES.map((c) => ({ name: c.title, path: categoryPath(c.slug) })),
        })}
      />
      <ToolHero
        crumbs={[{ name: "Guides", path: BLOG_PATH }]}
        eyebrow="Guides"
        icon="source"
        title={
          <>
            Retirement guides, <span className="italic font-normal text-sun-ink">in plain English</span>
          </>
        }
        lead={
          <p>
            Short, source-checked guides to the retirement decisions that come with a date — when to claim Social Security, what Medicare will cost,
            how much you must withdraw, and how it all gets taxed. Pick a topic, or go straight to a calculator for your own numbers.
          </p>
        }
      />

      <ContentSection className="space-y-12">
        <section aria-labelledby="topics-h">
          <h2 id="topics-h" className="px-1 text-[1.75rem] font-semibold sm:text-[2rem]">
            Browse by topic
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {CATEGORIES.map((c) => {
              const n = counts[c.slug];
              return (
                <li key={c.slug} className="float flex flex-col p-6 sm:p-7">
                  <div className="flex items-start gap-3">
                    <span className="float-soft grid h-11 w-11 shrink-0 place-items-center text-sun-ink">
                      <Icon name={c.icon} size={21} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[1.45rem] font-semibold leading-snug">
                        <Link href={categoryPath(c.slug)} className="hover:underline">
                          {c.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-[0.95rem] font-semibold text-ink-3">
                        {n ? `${n} ${n === 1 ? "guide" : "guides"}` : "Calculators ready · guides in progress"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">{c.description}</p>
                  <p className="mt-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-ink-3">Answer it now</p>
                  <div className="mt-2 flex-1">
                    <QuestionLinks category={c} limit={3} />
                  </div>
                  <Link href={categoryPath(c.slug)} className="mt-4 inline-flex items-center gap-1.5 font-bold text-sun-ink">
                    {c.name} guides <Icon name="arrow" size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {featured.length ? (
          <section aria-labelledby="featured-h">
            <h2 id="featured-h" className="px-1 text-[1.75rem] font-semibold sm:text-[2rem]">
              {featured.some((p) => p.featured) ? "Featured guides" : "Latest guides"}
            </h2>
            <div className="mt-5">
              <PostGrid posts={featured} />
            </div>
          </section>
        ) : null}
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>How are these guides written?</h2>
          <p className="answer">
            Every guide starts with the answer, then shows the official rule behind it and a worked example, and ends with the primary sources it relies
            on: the Social Security Administration, the Centers for Medicare &amp; Medicaid Services, the IRS and the Federal Register. No guide is
            written to sell you anything.
          </p>
          <p>
            We write for people deciding something this year, so each guide says what we would actually do in your position and flags the mistakes we
            see most often. Where a rule depends on your birth date, income or filing status, the guide links to the calculator that works it out for
            you instead of offering a rule of thumb.
          </p>

          <h2>How do we keep the numbers current?</h2>
          <p className="answer">
            Each fall, when Social Security, Medicare and the IRS publish next year’s figures, we re-check every number and update the date shown at the
            top of each guide. A figure that is not final yet is labeled projected, never presented as official.
          </p>
          <p>
            The numbers on this site were last verified against primary sources on{" "}
            <time dateTime={SITE.dataVerifiedOn}>{longDate(SITE.dataVerifiedOn)}</time>. Read{" "}
            <Link href="/methodology">how we check our numbers</Link> or <Link href="/about">who we are</Link>.
          </p>

          <h2>Are these guides financial advice?</h2>
          <p className="answer">
            No. They explain the official rules and the math, which is often enough to make a confident decision or to ask an adviser better questions.
            For advice that weighs your whole situation, talk to a fee-only fiduciary adviser or a tax professional.
          </p>
        </ProseCard>

        <RelatedTools slugs={CALCULATORS.map((t) => t.slug)} title="While you’re here: free calculators" />
        <Feedback />
      </ContentSection>
    </>
  );
}
