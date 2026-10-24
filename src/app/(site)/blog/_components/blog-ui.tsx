import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CATEGORIES, categoryPagePath, categoryPath, getCategory, type BlogCategory, type BlogPostMeta } from "@/lib/blog";
import { ORG_ID, WEBSITE_ID } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { longDate } from "@/lib/format";

/** The site's default 1200×630 social card (same file as app/opengraph-image.png). */
export const DEFAULT_SOCIAL_IMAGE = { path: "/brand/og-default.png", alt: "Sundial Years — retirement math, made plain" };

/**
 * Next.js replaces a parent's `openGraph`/`twitter` objects wholesale when a page sets them (pageMetadata does), and the
 * root's file-based opengraph-image is only merged at the root segment — so without this a blog page would ship no
 * og:image at all. Adds the article's own image, or the default card.
 */
export function withSocialImage(meta: Metadata, image?: { path: string; alt: string }): Metadata {
  const img = image ?? DEFAULT_SOCIAL_IMAGE;
  const images = [{ url: absoluteUrl(img.path), alt: img.alt, ...(image ? {} : { width: 1200, height: 630 }) }];
  return { ...meta, openGraph: { ...meta.openGraph, images }, twitter: { ...meta.twitter, images } };
}

/** CollectionPage + ItemList JSON-LD for the blog hub and category hubs. */
export function collectionLd({ name, description, path, items }: { name: string; description: string; path: string; items: { name: string; path: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
    ...(items.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
          },
        }
      : {}),
  };
}

/** One article in a listing. The whole card is clickable (stretched link), the title is the accessible name. */
export function PostCard({ post, showCategory = true }: { post: BlogPostMeta; showCategory?: boolean }) {
  const cat = getCategory(post.category);
  return (
    <article className="float float-lift relative flex h-full flex-col p-6">
      {showCategory && cat ? <p className="eyebrow">{cat.name}</p> : null}
      <h3 className="mt-2 text-[1.35rem] font-semibold leading-snug">
        <Link href={post.path} className="after:absolute after:inset-0 after:rounded-[var(--r-xl)] after:content-['']">
          {post.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-[1.0625rem] leading-relaxed text-ink-2">{post.description}</p>
      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem] text-ink-3">
        <span>
          Updated <time dateTime={post.updated}>{longDate(post.updated)}</time>
        </span>
        <span aria-hidden="true">·</span>
        <span>{post.readingMinutes} min read</span>
        <Icon name="arrow" size={18} className="ml-auto text-sun-ink" />
      </p>
    </article>
  );
}

export function PostGrid({ posts, showCategory = true }: { posts: BlogPostMeta[]; showCategory?: boolean }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.path}>
          <PostCard post={p} showCategory={showCategory} />
        </li>
      ))}
    </ul>
  );
}

/** Page numbers with Newer / Older. Collapses long runs to "…" so it stays one line on a phone. */
export function Pagination({ category, page, totalPages }: { category: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const shown = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  const cells: (number | "gap")[] = [];
  shown.forEach((n, i) => {
    if (i > 0 && n - shown[i - 1] > 1) cells.push("gap");
    cells.push(n);
  });
  return (
    <nav aria-label="Guide pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={categoryPagePath(category, page - 1)} rel="prev" className="btn btn-ghost">
          <Icon name="arrow" size={18} className="rotate-180" /> Newer
        </Link>
      ) : null}
      {cells.map((c, i) =>
        c === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-ink-3">
            …
          </span>
        ) : c === page ? (
          <span key={c} aria-current="page" className="btn min-w-[3.25rem] !px-0" data-active="true">
            <span className="sr-only">Page </span>
            {c}
          </span>
        ) : (
          <Link key={c} href={categoryPagePath(category, c)} className="btn btn-ghost min-w-[3.25rem] !px-0" aria-label={`Page ${c}`}>
            {c}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={categoryPagePath(category, page + 1)} rel="next" className="btn btn-ghost">
          Older <Icon name="arrow" size={18} />
        </Link>
      ) : null}
    </nav>
  );
}

/** The questions a topic answers today, each linking to the calculator or reference page that answers it. */
export function QuestionLinks({ category, limit }: { category: BlogCategory; limit?: number }) {
  const qs = limit ? category.questions.slice(0, limit) : category.questions;
  return (
    <ul className="space-y-1">
      {qs.map((q) => (
        <li key={q.q}>
          <Link href={q.href} className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 py-2 font-semibold text-ink transition-colors hover:bg-sunk">
            <span>{q.q}</span>
            <Icon name="arrow" size={18} className="shrink-0 text-sun-ink transition-transform group-hover:translate-x-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Links to the other topic hubs — keeps readers moving sideways instead of back to search. */
export function OtherCategories({ current }: { current?: string }) {
  const others = CATEGORIES.filter((c) => c.slug !== current);
  return (
    <nav aria-labelledby="topics-h" className="float-soft p-5 sm:p-6">
      <h2 id="topics-h" className="text-[1.35rem] font-semibold">
        Other topics
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {others.map((c) => (
          <li key={c.slug}>
            <Link href={categoryPath(c.slug)} className="btn btn-ghost">
              <Icon name={c.icon} size={18} className="text-sun-ink" /> {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
