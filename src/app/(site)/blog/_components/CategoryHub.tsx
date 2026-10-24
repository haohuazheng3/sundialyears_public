import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { BLOG_PATH, categoryPagePath, categoryPath, getPostsByCategory, paginate, type BlogCategory } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";
import { OtherCategories, Pagination, PostGrid, QuestionLinks, collectionLd, withSocialImage } from "./blog-ui";

/**
 * Metadata for a category hub page. A hub with no published guides is still a useful page (intro + calculators),
 * but it is thin for search, so it carries noindex until its first guide is published.
 */
export function categoryMetadata(category: BlogCategory, page: number): Metadata {
  const total = getPostsByCategory(category.slug).length;
  const title = page > 1 ? `${category.metaTitle} — Page ${page}` : category.metaTitle;
  const description = page > 1 ? `Page ${page} of our ${category.topic} guides. ${category.metaDescription}` : category.metaDescription;
  return withSocialImage(pageMetadata({ title, description, path: categoryPagePath(category.slug, page), noindex: total === 0 }));
}

/** Category hub (page 1) and its later listing pages: same template, intro only on page 1. */
export function CategoryHub({ category, page }: { category: BlogCategory; page: number }) {
  const all = getPostsByCategory(category.slug);
  const { items, totalPages } = paginate(all, page);
  const path = categoryPagePath(category.slug, page);
  const crumbs = [
    { name: "Guides", path: BLOG_PATH },
    { name: category.name, path: categoryPath(category.slug) },
    ...(page > 1 ? [{ name: `Page ${page}`, path }] : []),
  ];

  return (
    <>
      <JsonLd
        data={collectionLd({
          name: category.title,
          description: category.description,
          path,
          items: items.map((p) => ({ name: p.title, path: p.path })),
        })}
      />
      <ToolHero
        crumbs={crumbs}
        eyebrow={`Guides · ${category.name}`}
        icon={category.icon}
        title={page > 1 ? `${category.title} (page ${page})` : category.title}
        lead={<p>{category.description}</p>}
        chips={
          <span className="pill">
            <Icon name="source" size={15} strokeWidth={2.2} />
            {all.length === 0 ? "Calculators ready · guides in progress" : `${all.length} ${all.length === 1 ? "guide" : "guides"}`}
          </span>
        }
      />

      <ContentSection className="space-y-10">
        {page === 1 ? (
          <ProseCard>
            <h2>What should you know about {category.topic} first?</h2>
            <p className="answer">{category.intro[0]}</p>
            {category.intro.slice(1).map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            <h2>Which {category.topic} questions can you answer right now?</h2>
            <p className="answer">
              Each of these questions opens a free calculator or reference page that works out the official answer for your own situation in a minute
              or two. There is no sign-up and nothing to download, and every result shows the official figures and sources behind it, so you can
              check the math yourself.
            </p>
            <div className="sunk p-2 sm:p-3">
              <QuestionLinks category={category} />
            </div>
          </ProseCard>
        ) : null}

        <section aria-labelledby="posts-h">
          <h2 id="posts-h" className="px-1 text-[1.75rem] font-semibold">
            {page > 1 ? `More ${category.topic} guides` : `Latest ${category.topic} guides`}
          </h2>
          {items.length ? (
            <div className="mt-5">
              <PostGrid posts={items} showCategory={false} />
            </div>
          ) : (
            <div className="float-soft mt-5 p-6 text-[1.0625rem] leading-relaxed text-ink-2">
              <p>
                No {category.topic} guides are published yet. The calculators below already answer the questions people ask most, using the
                official figures — start there, and new guides will appear on this page.
              </p>
              <p className="mt-3">
                <Link href={BLOG_PATH} className="link">
                  See all guide topics
                </Link>
              </p>
            </div>
          )}
          <Pagination category={category.slug} page={page} totalPages={totalPages} />
        </section>
      </ContentSection>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <RelatedTools slugs={[...category.tools]} title={`Calculators for ${category.topic}`} />
        <OtherCategories current={category.slug} />
        <Feedback />
      </ContentSection>
    </>
  );
}
