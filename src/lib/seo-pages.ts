/**
 * Content layer for the tool-first SEO pages (build time only).
 *
 * Each page is `content/seo/<slug>.md` — the slug must also be a TOOLS entry and have a route file at
 * `src/app/(site)/<slug>/page.tsx` that renders <SeoToolPage slug=…> around its calculator.
 *
 *   title:       string   (the H1 and <title>: the page's main entry title)
 *   description: string   (meta description)
 *   crumb:       string   (short breadcrumb label)
 *   name:        string   (WebApplication name in JSON-LD)
 *   chip:        { status: official | projected | not_yet_announced, text }
 *   lead:        string   (answer-first paragraph under the H1; tokens allowed)
 *   faqs:        [{ q, a }]  (3–5)
 *   sources:     [SRC key, …]
 *   published / updated: YYYY-MM-DD
 *
 * The body is Markdown: one H2 per secondary keyword (written as a stand-alone search-result title), each opening with
 * a 40–60 word answer. Figures are `{{…}}` parameter tokens (same rules as the blog). Images are local Pexels photos —
 * `![alt](/images/seo/<file>.webp)` — and get their size and photo credit from `content/seo/_images.json`.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { renderMarkdown, resolveParamTokens, countWords, type TocItem } from "@/lib/blog";
import { SRC, type SourceKey } from "@/data/params/sources";
import type { Source, Status } from "@/data/params/types";
import { toolBySlug } from "@/lib/tools";
import { figures } from "@/lib/figures";

export const SEO_DIR = path.join(process.cwd(), "content", "seo");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const Frontmatter = z.strictObject({
  title: z.string().trim().min(10).max(200),
  description: z.string().trim().min(80).max(200),
  crumb: z.string().trim().min(3).max(60),
  name: z.string().trim().min(5).max(120),
  chip: z.strictObject({ status: z.enum(["official", "projected", "not_yet_announced"]), text: z.string().trim().min(3).max(60) }),
  lead: z.string().trim().min(60).max(600),
  faqs: z.array(z.strictObject({ q: z.string().trim().min(8), a: z.string().trim().min(20) })).min(3).max(5),
  sources: z.array(z.string()).min(2),
  published: isoDate,
  updated: isoDate.optional(),
});

export interface SeoPage {
  slug: string;
  path: string;
  title: string;
  description: string;
  crumb: string;
  name: string;
  chip: { status: Status; text: string };
  lead: string;
  faqs: { q: string; a: string }[];
  sources: Source[];
  published: string;
  updated: string;
  html: string;
  toc: TocItem[];
  wordCount: number;
  images: string[];
}

export function parseSeoSource(source: string, slug: string, file = `content/seo/${slug}.md`): SeoPage {
  const fm = matter(source);
  const data: Record<string, unknown> = { ...fm.data };
  for (const key of ["published", "updated"] as const) if (data[key] instanceof Date) data[key] = (data[key] as Date).toISOString().slice(0, 10);
  const parsed = Frontmatter.safeParse(data);
  if (!parsed.success) throw new Error(`${file}: invalid frontmatter\n${z.prettifyError(parsed.error)}`);
  const f = parsed.data;
  if (!toolBySlug(slug)) throw new Error(`${file}: "${slug}" is not in the TOOLS registry (src/lib/tools.ts).`);
  const unknown = f.sources.filter((k) => !(k in SRC));
  if (unknown.length) throw new Error(`${file}: unknown source key(s) ${unknown.join(", ")} — add them to src/data/params/sources.ts.`);
  const tokens = (text: string, mode: "html" | "text") => {
    try {
      return resolveParamTokens(text, mode);
    } catch (e) {
      throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const title = tokens(f.title, "text");
  if (title.length > 75) throw new Error(`${file}: title is ${title.length} characters after figures are filled in (max 75).`);
  const body = tokens(fm.content, "html");
  const { html: raw, toc } = renderMarkdown(body);
  const images: string[] = [];
  const html = figures(raw, file, images);
  const faqs = f.faqs.map((q) => ({ q: tokens(q.q, "text"), a: tokens(q.a, "text") }));
  const lead = tokens(f.lead, "text");
  return {
    slug,
    path: `/${slug}`,
    title,
    description: tokens(f.description, "text"),
    crumb: f.crumb,
    name: f.name,
    chip: f.chip,
    lead,
    faqs,
    sources: f.sources.map((k) => SRC[k as SourceKey] as Source),
    published: f.published,
    updated: f.updated ?? f.published,
    html,
    toc,
    wordCount: countWords(body) + countWords(lead) + faqs.reduce((n, q) => n + countWords(`${q.q} ${q.a}`), 0),
    images,
  };
}

const cache = new Map<string, SeoPage>();
/** The page's content, or null when content/seo/<slug>.md isn't present (e.g. the public code mirror ships no articles). */
export function getSeoPage(slug: string): SeoPage | null {
  const hit = cache.get(slug);
  if (hit) return hit;
  const file = path.join(SEO_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const page = parseSeoSource(fs.readFileSync(file, "utf8"), slug);
  cache.set(slug, page);
  return page;
}

export function seoSlugs(): string[] {
  if (!fs.existsSync(SEO_DIR)) return [];
  return fs
    .readdirSync(SEO_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}
