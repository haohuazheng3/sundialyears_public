import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentSection } from "@/components/tool/CalculatorShell";
import { Faq } from "@/components/tool/Faq";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { Callout } from "@/components/tool/Result";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { BLOG_PATH, CATEGORIES, categoryPath, getCategory, getPost, getRelatedPosts, postParams } from "@/lib/blog";
import { articleLd, pageMetadata } from "@/lib/seo";
import { DEFAULT_SOCIAL_IMAGE, PostGrid, withSocialImage } from "../../_components/blog-ui";
import { ArticleHeader, ArticleSources, ArticleToc } from "../../_components/article-ui";

/**
 * Every article, drafts included (a draft renders with noindex so it can be previewed on a deploy, but it is never
 * listed, linked or put in the sitemap). `ensureStatic = "navigation"` needs at least one entry: the repo ships a draft
 * style-guide sample; without any content a placeholder resolves to the 404 page.
 */
export function generateStaticParams() {
  const params = postParams();
  return params.length ? params : [{ category: CATEGORIES[0].slug, slug: "no-posts-yet" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const post = getPost(category, slug);
  if (!post) return {};
  const meta = pageMetadata({
    title: post.title,
    description: post.description,
    path: post.path,
    ogType: "article",
    publishedTime: post.published,
    modifiedTime: post.updated,
    noindex: post.draft,
  });
  return withSocialImage(meta, post.image ? { path: post.image, alt: post.imageAlt ?? post.title } : undefined);
}

export default async function ArticlePage({ params }: PageProps<"/blog/[category]/[slug]">) {
  const { category, slug } = await params;
  const post = getPost(category, slug);
  const cat = getCategory(category);
  if (!post || !cat) notFound();
  const more = post.draft ? [] : getRelatedPosts(post);

  return (
    <>
      <JsonLd
        data={articleLd({
          headline: post.title,
          description: post.description,
          path: post.path,
          datePublished: post.published,
          dateModified: post.updated,
          // Google's Article rich result needs an image; fall back to the site card.
          image: post.image ?? DEFAULT_SOCIAL_IMAGE.path,
        })}
      />

      <article>
        <ArticleHeader
          crumbs={[
            { name: "Guides", path: BLOG_PATH },
            { name: cat.name, path: categoryPath(cat.slug) },
            { name: post.title, path: post.path },
          ]}
          eyebrow={cat.name}
          icon={cat.icon}
          title={post.title}
          lead={post.description}
          published={post.published}
          updated={post.updated}
          readingMinutes={post.readingMinutes}
        />

        <ContentSection className="space-y-8">
          {post.draft ? (
            <div className="mx-auto max-w-[860px]">
              <Callout tone="ember" title="Draft — not published">
                <p>This page is a draft. It is not listed on the blog, not linked from other pages, left out of the sitemap and hidden from search engines.</p>
              </Callout>
            </div>
          ) : null}

          {post.verdict ? (
            <aside aria-label="The short answer" className="float mx-auto max-w-[860px] border-l-4 border-[var(--sun)] p-6 sm:p-8">
              <p className="eyebrow">The short answer</p>
              <p className="mt-2 text-[1.3rem] font-semibold leading-snug text-ink">{post.verdict.title}</p>
              <ul className="mt-4 space-y-2 text-[1.0625rem] leading-relaxed text-ink-2">
                {post.verdict.points.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <Icon name="check" size={19} className="mt-1 shrink-0 text-sage" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <Link href={post.verdict.cta.href} className="btn btn-primary mt-5">
                {post.verdict.cta.label} <Icon name="arrow" size={18} />
              </Link>
            </aside>
          ) : null}
          {post.image ? (
            <figure className="mx-auto max-w-[1000px]">
              <div className="float relative aspect-[1200/630] overflow-hidden">
                <Image src={post.image} alt={post.imageAlt ?? ""} fill preload sizes="(min-width: 1060px) 1000px, 100vw" className="object-cover" />
              </div>
            </figure>
          ) : null}

          <ArticleToc items={post.toc} />

          <div className="float prose-sy mx-auto max-w-[860px] p-6 sm:p-10" dangerouslySetInnerHTML={{ __html: post.html }} />
        </ContentSection>
      </article>

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        {post.faqs.length ? <Faq items={post.faqs} /> : null}
        <ArticleSources sources={post.sources} />
        <Feedback />
        {more.length ? (
          <section aria-labelledby="more-h">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <h2 id="more-h" className="text-[1.75rem] font-semibold">
                More {cat.topic} guides
              </h2>
              <Link href={categoryPath(cat.slug)} className="inline-flex items-center gap-1.5 font-bold text-sun-ink">
                All {cat.topic} guides <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="mt-5">
              <PostGrid posts={more} showCategory={false} />
            </div>
          </section>
        ) : null}
        <RelatedTools slugs={post.tools} title="Work out your own numbers" />
      </ContentSection>
    </>
  );
}
