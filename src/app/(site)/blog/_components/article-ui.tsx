import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { SITE } from "@/lib/site";
import { longDate } from "@/lib/format";
import type { TocItem } from "@/lib/blog";

/**
 * Article header: breadcrumbs, H1, the description as an answer-first lead, and a byline row with the
 * organization as author (never a person) plus visible Published / Updated dates in <time> elements.
 */
export function ArticleHeader({
  crumbs,
  eyebrow,
  icon,
  title,
  lead,
  published,
  updated,
  readingMinutes,
}: {
  crumbs: { name: string; path: string }[];
  eyebrow: string;
  icon: AnyIcon;
  title: string;
  lead: string;
  published: string;
  updated: string;
  readingMinutes: number;
}) {
  return (
    <header className="mx-auto max-w-[1180px] px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Breadcrumbs items={crumbs} />
      <div className="mx-auto max-w-[860px]">
        <div className="mt-6 flex items-center gap-2.5">
          <span className="float-soft grid h-10 w-10 place-items-center text-sun-ink">
            <Icon name={icon} size={20} />
          </span>
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.1] sm:text-[3.1rem]">{title}</h1>
        <p className="mt-5 text-[1.1875rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">{lead}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[0.95rem]">
          <span className="pill">
            By{" "}
            <Link href="/about" className="font-bold text-ink hover:underline">
              {SITE.name}
            </Link>
          </span>
          <span className="pill">
            <Icon name="calendar" size={15} strokeWidth={2.2} /> Published <time dateTime={published}>{longDate(published)}</time>
          </span>
          <span className="pill">
            <Icon name="check" size={15} strokeWidth={2.2} /> Updated <time dateTime={updated}>{longDate(updated)}</time>
          </span>
          <span className="pill">
            <Icon name="clock" size={15} strokeWidth={2.2} /> {readingMinutes} min read
          </span>
        </div>
        <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-3">
          Checked against primary sources from Social Security, Medicare and the IRS.{" "}
          <Link href="/methodology" className="link">
            How we check our numbers
          </Link>
        </p>
      </div>
    </header>
  );
}

/** Table of contents from the article's H2/H3 headings (plain anchor links — keyboard and screen-reader friendly). */
export function ArticleToc({ items }: { items: TocItem[] }) {
  const h2Count = items.filter((i) => i.depth === 2).length;
  if (h2Count < 2) return null;
  return (
    <nav aria-labelledby="toc-h" className="sunk mx-auto max-w-[860px] p-5 sm:p-6">
      <p id="toc-h" className="eyebrow">
        In this guide
      </p>
      <ol className="mt-3 space-y-0.5 text-[1.0625rem]">
        {items.map((it) => (
          <li key={it.id} className={it.depth === 3 ? "pl-6" : ""}>
            <a
              href={`#${it.id}`}
              className={`flex min-h-11 items-center gap-2 leading-snug ${it.depth === 2 ? "link font-semibold" : "text-ink-2 hover:text-ink"}`}
            >
              {it.depth === 3 ? <span aria-hidden="true" className="text-ink-3">–</span> : null}
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Sources from the article's frontmatter ({label, url}); the publisher pill is the link's host name. */
export function ArticleSources({ sources }: { sources: { label: string; url: string }[] }) {
  if (!sources.length) return null;
  const host = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "source";
    }
  };
  return (
    <section aria-labelledby="sources-h" className="float p-6 sm:p-8">
      <h2 id="sources-h" className="flex items-center gap-2 text-[1.5rem] font-semibold">
        <Icon name="source" size={22} className="text-sun-ink" /> Sources
      </h2>
      <p className="mt-1 text-[1rem] text-ink-3">Primary sources this guide relies on. We re-check them whenever an agency publishes new figures.</p>
      <ol className="mt-5 space-y-3">
        {sources.map((s) => (
          <li key={s.url} className="flex gap-3">
            <span className="pill mt-0.5 shrink-0 !px-2 !py-0.5 text-[0.75rem]">{host(s.url)}</span>
            <a href={s.url} target="_blank" rel="noopener" className="link min-w-0 break-words text-[1rem]">
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
