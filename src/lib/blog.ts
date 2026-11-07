/**
 * Blog content layer (build time only).
 *
 * Articles are Markdown files at `content/blog/<category>/<slug>.md` with YAML frontmatter:
 *
 *   title:       string                      (the H1 and <title>)
 *   description: string                      (meta description + lead; aim for 140–160 characters)
 *   published:   YYYY-MM-DD
 *   updated:     YYYY-MM-DD                  (optional, defaults to `published`; never earlier than it)
 *   category:    one of CATEGORIES[].slug    (must match the folder name)
 *   draft:       true | false                (drafts render with noindex and are never listed, linked or put in the sitemap)
 *   image:       /public/path.png            (optional hero + social image; 1200×630 recommended)
 *   imageAlt:    string                      (required when `image` is set)
 *   faqs:        [{ q, a }]                  (optional; rendered by <Faq> with FAQPage JSON-LD; plain-text answers)
 *   sources:     [{ label, url }]            (optional; primary sources only)
 *   featured:    true | false                (optional; pins the post to the /blog hub)
 *   tools:       [tool slug, …]              (optional; overrides the category's related calculators)
 *
 * Numbers are never typed into an article (repository law: every figure comes from src/data/params). Write a token
 * instead — `{{SS.COLA.2027|pctPlain}}`, `{{MEDICARE.PART_B.2027.premium|money2}}` — and it is replaced at build time
 * with the formatted official value; a figure that is not final gets a visible "Projected" / "Not announced yet" label.
 * An unknown path or format fails the build with the file name. Tokens work in the body, title, description, image
 * alt text and FAQs (quote a YAML value that contains one). Write `\{{` to show a literal `{{`.
 *
 * Files are read synchronously with `fs` — that is static work, so every blog page still prerenders completely
 * (the (site) layout requires `ensureStatic = "navigation"`). Invalid frontmatter throws with the file path, so a bad
 * article fails the build loudly instead of shipping a broken page.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";
import { z } from "zod";
import { figures } from "@/lib/figures";
import { TOOLS, toolBySlug, type IconName } from "@/lib/tools";
import { SITE } from "@/lib/site";
import { MEDICARE, PLAN, RMD, SS, TAX, type Status } from "@/data/params";
import { money, money2, moneySmart, num, pct, pctPlain } from "@/lib/format";

export const BLOG_DIR = path.join(process.cwd(), "content", "blog");
/** Posts per category listing page (/blog/<category> and /blog/<category>/page/<n>). */
export const POSTS_PER_PAGE = 12;
/** Reading speed used for "N min read" — deliberately unhurried for a 55–80 audience. */
export const WORDS_PER_MINUTE = 200;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `page` is taken by the pagination route (/blog/<category>/page/<n>). */
const RESERVED_SLUGS = new Set(["page"]);
/** Element ids the site chrome and article template put on every article page (skip link target, TOC, FAQ, sources…). */
export const RESERVED_IDS = ["main", "toc-h", "faq-h", "sources-h", "more-h", "next-h", "topics-h", "fb-comment", "mega-menu", "mobile-sheet"] as const;

/* ───────────────────────────── Categories ───────────────────────────── */

export interface BlogCategory {
  slug: string;
  /** Short label (nav, eyebrow, breadcrumbs). */
  name: string;
  /** The topic as it reads mid-sentence ("retirement taxes", "Social Security"). */
  topic: string;
  /** H1 of the category hub. */
  title: string;
  /** <title> tag (≤ 60 characters). */
  metaTitle: string;
  /** Meta description (140–160 characters). */
  metaDescription: string;
  /** 2–3 sentences: what this section covers. Used as the hub lead and on the /blog cards. */
  description: string;
  /** Intro paragraphs on the hub page — plain English, with a point of view. */
  intro: readonly string[];
  icon: IconName;
  /** Related calculator / reference slugs from src/lib/tools.ts. */
  tools: readonly string[];
  /** Questions readers bring to this topic, each answered today by an existing calculator or reference page. */
  questions: readonly { q: string; href: string }[];
}

export const CATEGORIES = [
  {
    slug: "social-security",
    name: "Social Security",
    topic: "Social Security",
    title: "Social Security guides: claiming, working and taxes",
    metaTitle: "Social Security Guides: Claiming, Working & Taxes",
    metaDescription:
      "Plain-English Social Security guides: when to claim, working while collecting, spousal and survivor benefits, the yearly COLA and taxes, built on SSA rules.",
    description:
      "When to claim, what happens if you keep working, how spousal and survivor benefits fit together, and what the yearly cost-of-living adjustment really adds. Every guide follows the Social Security Administration’s own rules and links to the calculator that does the math for you.",
    intro: [
      // 20 CFR 404.640(b)(4): a withdrawal must be filed within 12 months of the first month of entitlement, once per lifetime,
      // and everything paid must be repaid. 20 CFR 404.412: at full retirement age the reduction is recomputed to credit
      // the months benefits were withheld under the earnings test.
      "Choosing when to start Social Security is one of the largest money decisions in retirement, and it is close to permanent: you can withdraw an application only once, only within a year of your first month of benefits, and only by repaying every dollar you received. So start with your own numbers, not a rule of thumb.",
      "Our view: married couples should judge the higher earner’s claiming age by the survivor benefit it locks in, not by a single break-even age. And if you are still working before full retirement age, the earnings test mostly delays money rather than taking it away: once you reach full retirement age, Social Security raises your monthly check to make up for the months it withheld.",
    ],
    icon: "clock",
    tools: ["social-security-break-even-calculator", "social-security-earnings-limit-calculator", "taxable-social-security-calculator", "social-security-spousal-benefits-calculator", "social-security-survivor-benefits-calculator", "social-security-at-62-calculator", "when-to-apply-for-social-security", "social-security-work-credits-calculator", "windfall-elimination-provision-calculator"],
    questions: [
      { q: "When should I start Social Security?", href: "/social-security-break-even-calculator" },
      { q: "Will working hold back my checks before full retirement age?", href: "/social-security-earnings-limit-calculator" },
      { q: "What is my full retirement age?", href: "/full-retirement-age" },
      { q: "How much is next year’s cost-of-living raise?", href: "/social-security-cola" },
      { q: "Which Social Security dates apply to my birth year?", href: "/social-security-by-birth-year" },
    ],
  },
  {
    slug: "medicare",
    name: "Medicare",
    topic: "Medicare",
    title: "Medicare guides: premiums, IRMAA and enrollment",
    metaTitle: "Medicare Guides: Premiums, IRMAA & Enrollment",
    metaDescription:
      "Medicare guides for retirees: Part B and Part D premiums, how the IRMAA income surcharge works, appeals after a life change, and late-enrollment penalties.",
    description:
      "What Medicare Part B and Part D will cost you, how the income-related surcharge called IRMAA works, and how to avoid late-enrollment penalties that can last for life. We use the figures CMS and the Social Security Administration publish and label next year’s numbers as projected until they are final.",
    intro: [
      // IRMAA uses the tax return from two years before the premium year (42 U.S.C. 1395r(i); 20 CFR 418.1135).
      // Form SSA-44 life-changing events: 20 CFR 418.1205 (work stoppage/reduction, marriage, divorce, death of a spouse…).
      "Two things catch people out: the income surcharge on Part B and Part D is based on your tax return from two years earlier, so a one-time spike such as a large Roth conversion shows up long after the money is spent. And a missed enrollment window can add a penalty that lasts as long as you have coverage.",
      "Our view: check the IRMAA (income-related monthly adjustment amount) brackets before a big income event, not after. If your income has since dropped because you stopped or cut back work, married, divorced or lost a spouse, you can ask Social Security to use a more recent year with Form SSA-44. It is worth filing whenever the drop would move you to a lower bracket.",
    ],
    icon: "medicare",
    tools: ["medicare-premium-calculator", "irmaa-calculator", "irmaa-brackets-2027", "when-can-i-sign-up-for-medicare", "medicare-part-b-late-enrollment-penalty", "medigap-open-enrollment-period", "extra-help-medicare-eligibility", "medicare-savings-program-eligibility", "irmaa-brackets-2028"],
    questions: [
      { q: "What will Medicare cost us next year?", href: "/medicare-premium-calculator" },
      { q: "Will my income trigger the IRMAA surcharge?", href: "/irmaa-calculator" },
      { q: "What are the 2027 IRMAA brackets?", href: "/irmaa-brackets-2027" },
      { q: "What were the 2026 IRMAA brackets?", href: "/irmaa-brackets-2026" },
    ],
  },
  {
    slug: "rmds-and-iras",
    name: "RMDs & IRAs",
    topic: "RMDs and IRAs",
    title: "RMD and IRA guides: required withdrawals, made plain",
    metaTitle: "RMD & IRA Guides: Required Minimum Distributions",
    metaDescription:
      "Guides to required minimum distributions: when your first RMD is due, inherited IRA rules, the 10-year rule, and keeping withdrawals from raising your taxes.",
    description:
      "How required minimum distributions (RMDs) work, when your first one is due, what changes when you inherit an IRA, and how to keep withdrawals from pushing up your taxes and Medicare premiums. Every guide follows the IRS tables and final regulations and links to a calculator that shows your exact amount.",
    intro: [
      // 26 CFR 1.408-8 / 1.401(a)(9)-5: prior year-end balance ÷ distribution period; first RMD may wait until April 1 of the
      // next year; IRA withdrawals never satisfy a 401(k) RMD (IRS RMD FAQs).
      "A required minimum distribution (RMD) is simple arithmetic — your balance at the end of last year divided by a factor from an IRS life-expectancy table — wrapped in rules that are easy to trip over. The arithmetic rarely goes wrong; the deadlines, the account-by-account rules and inherited accounts are where the costly mistakes happen.",
      "Watch for three traps: postponing your first RMD to the following April and then owing two in one tax year, trying to satisfy a 401(k) RMD with an IRA withdrawal (every 401(k) plan must pay out its own), and forgetting the year-of-death RMD on an inherited account. Each guide here starts with the answer and then shows the rule behind it.",
    ],
    icon: "rmd",
    tools: ["rmd-calculator", "inherited-ira-rmd-calculator", "rmd-table", "rmd-age-calculator", "missed-rmd-penalty-calculator", "qcd-calculator", "rmd-tax-calculator", "qlac-calculator", "401k-withdrawal-tax-calculator"],
    questions: [
      { q: "How much do I have to take out of my IRA this year?", href: "/rmd-calculator" },
      { q: "I inherited an IRA — what do I have to withdraw?", href: "/inherited-ira-rmd-calculator" },
      { q: "What share of my balance must I withdraw at my age?", href: "/rmd-table" },
    ],
  },
  {
    slug: "retirement-taxes",
    name: "Retirement taxes",
    topic: "retirement taxes",
    title: "Retirement tax guides: Social Security, IRAs and your state",
    metaTitle: "Retirement Tax Guides: Social Security, IRAs, States",
    metaDescription:
      "How retirement income is taxed: the share of Social Security that is taxable, IRA withdrawals and Roth conversions, the senior deduction and state taxes.",
    description:
      "How much of your Social Security is taxable, how IRA withdrawals and Roth conversions change your bracket, and which states tax retirement income. We work from IRS publications and state revenue departments, and say plainly when next year’s figure has not been announced.",
    intro: [
      "Taxes in retirement are less about rates than about interactions. One extra dollar of IRA income can make more of your Social Security taxable and push you over a Medicare surcharge threshold at the same time, so the real cost of a withdrawal can be far higher than your bracket suggests.",
      "Our view: plan withdrawals across several years instead of one year at a time. The years between retiring and starting Social Security or required minimum distributions are often the cheapest years you will ever have to move money out of a traditional IRA.",
    ],
    icon: "tax",
    tools: ["taxable-social-security-calculator", "state-retirement-taxes", "irmaa-calculator", "retirement-tax-calculator", "roth-conversion-calculator", "senior-deduction-calculator", "capital-gains-tax-over-65-calculator", "social-security-tax-withholding-calculator", "do-seniors-have-to-file-taxes"],
    questions: [
      { q: "How much of my Social Security will be taxed?", href: "/taxable-social-security-calculator" },
      { q: "Does my state tax retirement income?", href: "/state-retirement-taxes" },
      { q: "Will an IRA withdrawal raise my Medicare premium?", href: "/irmaa-calculator" },
    ],
  },
  {
    slug: "retirement-planning",
    name: "Retirement planning",
    topic: "retirement planning",
    title: "Retirement planning guides: dates, numbers and decisions",
    metaTitle: "Retirement Planning Guides: Key Dates & Numbers",
    metaDescription:
      "Retirement planning guides for people in their late 50s to 70s: the dates that matter for your birth year, what changes each January, and how decisions connect.",
    description:
      "The calendar and the numbers behind a retirement plan: which dates matter for your birth year, what changes every January, and how Social Security, Medicare and withdrawals fit together. Practical guides for people in their late 50s through their 70s, built on official figures.",
    intro: [
      "Most retirement decisions come with a date attached: the first month you can claim Social Security, your Medicare enrollment window and the year your required minimum distributions (RMDs) begin. Getting one wrong can mean a permanently smaller check, a late-enrollment penalty that lasts as long as you have coverage, or an IRS penalty on a withdrawal you forgot to take.",
      "Our view: write your own dates down once, then revisit them every fall when Social Security, Medicare and the IRS publish next year’s numbers. The guides here show how one decision changes the next, so you can plan them together rather than one at a time.",
    ],
    icon: "calendar",
    tools: ["social-security-by-birth-year", "retirement-numbers-2027", "social-security-break-even-calculator", "how-long-will-my-money-last-calculator", "4-percent-rule-calculator", "life-expectancy-calculator", "pension-lump-sum-vs-annuity-calculator", "catch-up-contribution-calculator", "social-security-trust-fund-depletion-calculator"],
    questions: [
      { q: "Which dates matter for my birth year?", href: "/social-security-by-birth-year" },
      { q: "Which retirement numbers change in 2027?", href: "/retirement-numbers-2027" },
      { q: "When should I start Social Security?", href: "/social-security-break-even-calculator" },
      { q: "How much do I have to take out of my IRA this year?", href: "/rmd-calculator" },
    ],
  },
] as const satisfies readonly BlogCategory[];

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function isCategorySlug(s: string): s is CategorySlug {
  return CATEGORIES.some((c) => c.slug === s);
}

export function getCategory(slug: string): BlogCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/* ───────────────────────────── Paths ───────────────────────────── */

export const BLOG_PATH = "/blog";
export const categoryPath = (category: string) => `${BLOG_PATH}/${category}`;
/** Page 1 is the hub itself; later pages live under /page/<n>. */
export const categoryPagePath = (category: string, page: number) => (page <= 1 ? categoryPath(category) : `${categoryPath(category)}/page/${page}`);
export const postPath = (category: string, slug: string) => `${BLOG_PATH}/${category}/${slug}`;

/* ───────────────────────────── Frontmatter ───────────────────────────── */

const isoDate = z.union([z.string(), z.date()]).transform((v, ctx) => {
  // YAML turns an unquoted 2026-10-23 into a Date (UTC midnight); a quoted one stays a string.
  const s = v instanceof Date ? (Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10)) : v.trim();
  // `new Date("2026-13-01T00:00:00Z")` is an Invalid Date whose toISOString() throws a bare RangeError (no file
  // path) — check the time value first so an impossible month/day becomes a normal frontmatter error.
  const d = new Date(`${s}T00:00:00Z`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  if (!valid) {
    ctx.addIssue({ code: "custom", message: "must be a real date written as YYYY-MM-DD" });
    return z.NEVER;
  }
  return s;
});

const Frontmatter = z.strictObject({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(50).max(320),
  published: isoDate,
  updated: isoDate.optional(),
  category: z.string(),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  image: z
    .string()
    .regex(/^\/[^\s?#]+\.(png|jpe?g|webp|avif)$/i, "must be a path under /public, e.g. /blog/my-image.png")
    .optional(),
  imageAlt: z.string().trim().min(3).max(240).optional(),
  faqs: z.array(z.strictObject({ q: z.string().trim().min(5), a: z.string().trim().min(10) })).default([]),
  sources: z.array(z.strictObject({ label: z.string().trim().min(2), url: z.string().regex(/^https?:\/\/\S+$/, "must be an http(s) URL") })).default([]),
  tools: z.array(z.string()).optional(),
  /** Conclusion card at the top of a decision article: the verdict, 2–4 supporting points and a CTA into a calculator. */
  verdict: z
    .strictObject({
      title: z.string().trim().min(10).max(320),
      points: z.array(z.string().trim().min(10)).min(2).max(4),
      cta: z.strictObject({ label: z.string().trim().min(3).max(60), href: z.string().regex(/^\/[a-z0-9/-]*$/, "must be a site path") }),
    })
    .optional(),
});

/* ───────────────────────────── Types ───────────────────────────── */

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface BlogPostMeta {
  slug: string;
  category: CategorySlug;
  path: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  draft: boolean;
  featured: boolean;
  image?: string;
  imageAlt?: string;
  faqs: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  /** Related tool slugs (frontmatter `tools`, else the category's). */
  tools: string[];
  wordCount: number;
  readingMinutes: number;
  verdict?: { title: string; points: string[]; cta: { label: string; href: string } };
}

export interface BlogPost extends BlogPostMeta {
  html: string;
  toc: TocItem[];
}

interface Loaded {
  meta: BlogPostMeta;
  body: string;
}

/* ───────────────────────────── Markdown ───────────────────────────── */

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** URL fragment for a heading: "What’s my RMD at 73?" → "whats-my-rmd-at-73". */
export function slugify(text: string) {
  const s = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return s || "section";
}

/**
 * Markdown → HTML for the article template, plus the table of contents.
 * - Every heading gets a stable, unique id; `#` headings are demoted to H2 (the page owns the only H1).
 * - The first paragraph after each H2 gets class "answer" (the site's answer-first style).
 * - Tables scroll sideways on phones and use the site's table style; images lazy-load.
 * - External links get rel="noopener"; `javascript:` links are dropped.
 */
export function renderMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  // Ids the article template already uses on the same page; a heading must never take one of them.
  const used = new Set<string>(RESERVED_IDS);
  const uniqueId = (base: string) => {
    // "A", "A", "A 2" must give a, a-2, a-2-2 — not a second "a-2" (duplicate ids break the table of contents).
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };

  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        // Plain text for the TOC and the id: the text renderer passes inline HTML through, so drop a token's status pill
        // whole (its label must not read "… $202.90 Projected in 2027" in the TOC, nor change the id when the figure
        // becomes official), then strip any other tags.
        const plain = this.parser
          .parseInline(tokens, this.parser.textRenderer)
          .replace(/\s*<span class="pill[^"]*"[^>]*>[^<]*<\/span>/g, "")
          .replace(/<[^>]*>/g, "");
        const text = decodeEntities(plain).replace(/\s+/g, " ").trim();
        const level = Math.min(Math.max(depth, 2), 6);
        const id = uniqueId(slugify(text));
        if (level <= 3) toc.push({ id, text, depth: level as 2 | 3 });
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        if (/^\s*(javascript|vbscript|data):/i.test(href)) return inner;
        const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE.url);
        const t = title ? ` title="${escapeAttr(title)}"` : "";
        return `<a href="${escapeAttr(href)}"${t}${external ? ' rel="noopener"' : ""}>${inner}</a>`;
      },
      image({ href, title, text }) {
        const t = title ? ` title="${escapeAttr(title)}"` : "";
        return `<img src="${escapeAttr(href)}" alt="${escapeAttr(decodeEntities(text))}"${t} loading="lazy" decoding="async" class="rounded-[var(--r-lg)]" />`;
      },
    },
  });

  const raw = md.parse(markdown, { async: false });
  const html = raw
    .replace(/(<\/h2>\n?)<p>/g, '$1<p class="answer">')
    .replace(/<table>/g, '<div class="overflow-x-auto"><table class="table-sy text-[1rem]">')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/<blockquote>/g, '<blockquote class="sunk px-5 py-4">')
    .replace(/<hr>/g, '<hr class="divider-dots border-0" />');
  return { html, toc };
}

/* ───────────────────────────── Parameter tokens ───────────────────────────── */

/** Roots a token may start from — the same cited parameter modules the calculators import. */
const PARAM_ROOTS: Record<string, unknown> = { SS, MEDICARE, TAX, RMD, PLAN };
const NUMBER_FORMATS: Record<string, (n: number) => string> = {
  money, // $1,234
  money2, // $1,234.50
  moneySmart, // cents only when they exist
  num, // 1,234
  pct: (n) => pct(n), // 0.036 → 3.6%
  pctPlain: (n) => pctPlain(n), // 3.6 → 3.6%
  raw: (n) => String(n),
};
const STATUS_RANK: Record<Status, number> = { official: 0, projected: 1, not_yet_announced: 2 };
const STATUS_TEXT: Record<Exclude<Status, "official">, { label: string; cls: string; title: string }> = {
  projected: { label: "Projected", cls: "pill-sun", title: "Not final yet. We update it the day the agency publishes the official figure." },
  not_yet_announced: { label: "Not announced yet", cls: "pill-ember", title: "The agency has not published this figure yet." },
};
const isStatus = (v: unknown): v is Status => v === "official" || v === "projected" || v === "not_yet_announced";
const TOKEN_RE = /(?<!\\)\{\{\s*([^{}|]+?)\s*(?:\|\s*([A-Za-z0-9]+)\s*)?\}\}/g;

/**
 * Resolve one token body ("SS.SS_YEAR.2027.retUnderFraAnnual", format "money") to its formatted value and the least
 * final status met on the way (a Cited<T> value, or a table such as an IRMAA schedule that carries its own status).
 */
export function resolveParamToken(pathExpr: string, format?: string): { text: string; status: Status } {
  const segs = pathExpr.trim().split(".");
  if (!(segs[0] in PARAM_ROOTS)) throw new Error(`{{${pathExpr}}}: unknown root "${segs[0]}" — start with ${Object.keys(PARAM_ROOTS).join(", ")}.`);
  let node: unknown = PARAM_ROOTS[segs[0]];
  let status: Status = "official";
  const absorb = () => {
    while (node !== null && typeof node === "object" && "status" in node && isStatus((node as { status: unknown }).status)) {
      const s = (node as { status: Status }).status;
      if (STATUS_RANK[s] > STATUS_RANK[status]) status = s;
      // Cited<T> → its value; any other status-carrying table stays as it is.
      if ("value" in node && "source" in node) node = (node as { value: unknown }).value;
      else break;
    }
  };
  for (const seg of segs.slice(1)) {
    absorb();
    if (node === null || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, seg)) {
      throw new Error(`{{${pathExpr}}}: there is no "${seg}" at that point in src/data/params.`);
    }
    node = (node as Record<string, unknown>)[seg];
  }
  absorb();
  if (typeof node === "number") {
    if (!format) throw new Error(`{{${pathExpr}}}: a number needs a format — add |${Object.keys(NUMBER_FORMATS).join(", |")}.`);
    const f = NUMBER_FORMATS[format];
    if (!f) throw new Error(`{{${pathExpr}|${format}}}: unknown format. Use one of ${Object.keys(NUMBER_FORMATS).join(", ")}.`);
    if (!Number.isFinite(node)) throw new Error(`{{${pathExpr}}}: the value is not a finite number.`);
    return { text: f(node), status };
  }
  if (typeof node === "string") {
    if (format && format !== "raw") throw new Error(`{{${pathExpr}|${format}}}: "${format}" only applies to numbers.`);
    return { text: node, status };
  }
  const what = node === null || node === undefined ? "an empty value (not announced yet)" : Array.isArray(node) ? "a list" : typeof node === "object" ? "a table" : `a ${typeof node}`;
  throw new Error(`{{${pathExpr}}}: points to ${what}, not a single number or text.`);
}

/**
 * Replace every `{{path|format}}` in `text`. In "html" mode (Markdown body) a non-final figure gets an inline status
 * pill (text, never color alone); in "text" mode (title, description, FAQ — also used verbatim in JSON-LD) it gets
 * "(projected)" / "(not yet announced)".
 */
export function resolveParamTokens(text: string, mode: "html" | "text"): string {
  return text
    .replace(TOKEN_RE, (_, expr: string, format?: string) => {
      const { text: value, status } = resolveParamToken(expr, format);
      if (status === "official") return mode === "html" ? escapeHtml(value) : value;
      const s = STATUS_TEXT[status];
      return mode === "html"
        ? `${escapeHtml(value)} <span class="pill ${s.cls}" title="${escapeAttr(s.title)}">${s.label}</span>`
        : `${value} (${s.label.toLowerCase()})`;
    })
    .replace(/\\\{\{/g, "{{");
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rough prose word count (code, HTML tags, link targets and Markdown punctuation removed). */
export function countWords(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~]/g, " ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export const readingMinutesFor = (words: number) => Math.max(1, Math.round(words / WORDS_PER_MINUTE));

/* ───────────────────────────── Loading ───────────────────────────── */

/** Parse one Markdown file's source. Exported for tests; `file` is only used in error messages. */
export function parsePostSource(source: string, folder: string, slug: string, file = `content/blog/${folder}/${slug}.md`): Loaded {
  if (!isCategorySlug(folder)) {
    throw new Error(`${file}: "${folder}" is not a blog category. Use one of: ${CATEGORIES.map((c) => c.slug).join(", ")}.`);
  }
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    throw new Error(`${file}: the file name must be lowercase-words-with-hyphens and not "${[...RESERVED_SLUGS].join('", "')}".`);
  }
  const fmFile = matter(source);
  const { content } = fmFile;
  const data: Record<string, unknown> = { ...fmFile.data };
  // YAML silently rolls an impossible unquoted date (2026-02-30) over to a real one — validate what was written.
  for (const key of ["published", "updated"] as const) {
    const literal = new RegExp(`^${key}:[ \\t]*["']?([^"'\\s#]+)`, "m").exec(fmFile.matter)?.[1];
    if (literal && data[key] instanceof Date) data[key] = literal;
  }
  const parsed = Frontmatter.safeParse(data);
  if (!parsed.success) throw new Error(`${file}: invalid frontmatter\n${z.prettifyError(parsed.error)}`);
  const fm = parsed.data;
  if (fm.category !== folder) throw new Error(`${file}: frontmatter category "${fm.category}" must match its folder "${folder}".`);
  const updated = fm.updated ?? fm.published;
  if (updated < fm.published) throw new Error(`${file}: updated (${updated}) is earlier than published (${fm.published}).`);
  if (fm.image && !fm.imageAlt) throw new Error(`${file}: imageAlt is required when image is set.`);
  // A typo here would ship a broken hero image and a broken og:image / Article JSON-LD image without any warning.
  if (fm.image && !fs.existsSync(path.join(process.cwd(), "public", fm.image))) {
    throw new Error(`${file}: image ${fm.image} does not exist — put the file in public${fm.image}.`);
  }
  // Duplicates would render twice and collide as React keys (FAQ questions, source links).
  const dupe = (list: string[]) => list.find((v, i) => list.indexOf(v) !== i);
  const dupeQ = dupe(fm.faqs.map((f) => f.q));
  if (dupeQ) throw new Error(`${file}: the FAQ question "${dupeQ}" appears twice.`);
  const dupeUrl = dupe(fm.sources.map((s) => s.url));
  if (dupeUrl) throw new Error(`${file}: the source ${dupeUrl} is listed twice.`);
  const unknownTools = (fm.tools ?? []).filter((t) => !toolBySlug(t));
  if (unknownTools.length) throw new Error(`${file}: unknown tool slug(s) ${unknownTools.join(", ")}. Valid: ${TOOLS.map((t) => t.slug).join(", ")}.`);

  const category = getCategory(folder)!;
  const tokens = (text: string, mode: "html" | "text") => {
    try {
      return resolveParamTokens(text, mode);
    } catch (e) {
      throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const body = tokens(content, "html");
  const wordCount = countWords(body);
  return {
    body,
    meta: {
      slug,
      category: folder,
      path: postPath(folder, slug),
      title: tokens(fm.title, "text"),
      description: tokens(fm.description, "text"),
      published: fm.published,
      updated,
      draft: fm.draft,
      featured: fm.featured,
      image: fm.image,
      imageAlt: fm.imageAlt === undefined ? undefined : tokens(fm.imageAlt, "text"),
      faqs: fm.faqs.map((f) => ({ q: tokens(f.q, "text"), a: tokens(f.a, "text") })),
      sources: fm.sources,
      tools: fm.tools?.length ? fm.tools : [...category.tools],
      wordCount,
      readingMinutes: readingMinutesFor(wordCount),
      verdict: fm.verdict
        ? { title: tokens(fm.verdict.title, "text"), points: fm.verdict.points.map((x) => tokens(x, "text")), cta: fm.verdict.cta }
        : undefined,
    },
  };
}

function readAll(): Loaded[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const out: Loaded[] = [];
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    if (!entry.isDirectory()) continue; // e.g. a README next to the category folders
    const dir = path.join(BLOG_DIR, entry.name);
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith(".md") || file.startsWith(".") || file.startsWith("_")) continue;
      const slug = file.slice(0, -3);
      out.push(parsePostSource(fs.readFileSync(path.join(dir, file), "utf8"), entry.name, slug, `content/blog/${entry.name}/${file}`));
    }
  }
  return out.sort(byNewest);
}

function byNewest(a: Loaded, b: Loaded) {
  return b.meta.published.localeCompare(a.meta.published) || b.meta.updated.localeCompare(a.meta.updated) || a.meta.title.localeCompare(b.meta.title);
}

// Cached for the life of a production build/server; re-read on every call in development so edits show up.
let cache: Loaded[] | null = null;
function loaded(): Loaded[] {
  if (process.env.NODE_ENV !== "production") return readAll();
  cache ??= readAll();
  return cache;
}

/* ───────────────────────────── Queries ───────────────────────────── */

/** All posts, newest first. Drafts are excluded unless `includeDrafts` (only the article route needs them). */
export function getAllPosts({ includeDrafts = false }: { includeDrafts?: boolean } = {}): BlogPostMeta[] {
  return loaded()
    .filter((p) => includeDrafts || !p.meta.draft)
    .map((p) => p.meta);
}

export function getPostsByCategory(category: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}): BlogPostMeta[] {
  return getAllPosts({ includeDrafts }).filter((p) => p.category === category);
}

/** One post with its rendered HTML and table of contents — drafts included (their page is noindex). */
export function getPost(category: string, slug: string): BlogPost | undefined {
  const hit = loaded().find((p) => p.meta.category === category && p.meta.slug === slug);
  if (!hit) return undefined;
  const { html, toc } = renderMarkdown(hit.body);
  return { ...hit.meta, html: figures(html, `content/blog/${category}/${slug}.md`), toc };
}

/** Featured posts first, then the newest, up to `limit`. Never drafts. */
export function getFeaturedPosts(limit = 6): BlogPostMeta[] {
  const all = getAllPosts();
  return [...all.filter((p) => p.featured), ...all.filter((p) => !p.featured)].slice(0, limit);
}

/** Other published posts in the same category (for "More in …"). */
export function getRelatedPosts(post: Pick<BlogPostMeta, "category" | "slug">, limit = 3): BlogPostMeta[] {
  return getPostsByCategory(post.category)
    .filter((p) => p.slug !== post.slug)
    .slice(0, limit);
}

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
}

/** One listing page (1-based). `items` is empty when the page is out of range. */
export function paginate<T>(items: T[], page: number) {
  const totalPages = pageCount(items.length);
  const start = (page - 1) * POSTS_PER_PAGE;
  return { items: Number.isInteger(page) && page >= 1 ? items.slice(start, start + POSTS_PER_PAGE) : [], page, totalPages, total: items.length };
}

/* ───────────────────────────── Static params & sitemap ───────────────────────────── */

/** Every category hub is prerendered (hubs without posts are still useful pages, marked noindex). */
export function categoryParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

/** Listing pages 2…n that actually exist (page 1 is the hub). May be empty — the route adds its own placeholder. */
export function paginationParams() {
  return CATEGORIES.flatMap((c) => {
    const pages = pageCount(getPostsByCategory(c.slug).length);
    return Array.from({ length: pages - 1 }, (_, i) => ({ category: c.slug, n: String(i + 2) }));
  });
}

/** Every article URL, drafts included (drafts render with noindex so editors can preview them on a deploy). */
export function postParams() {
  return getAllPosts({ includeDrafts: true }).map((p) => ({ category: p.category, slug: p.slug }));
}

/**
 * Blog URLs for the sitemap: /blog, each category hub that has published posts (and its later pages), and every
 * published post. Drafts and empty (noindex) hubs are never included. `lastModified` is an ISO date.
 */
export function getBlogSitemapEntries(): { path: string; lastModified?: string }[] {
  const posts = getAllPosts();
  const newest = (list: BlogPostMeta[]) => list.map((p) => p.updated).sort().at(-1);
  const entries: { path: string; lastModified?: string }[] = [{ path: BLOG_PATH, lastModified: newest(posts) }];
  for (const c of CATEGORIES) {
    const list = posts.filter((p) => p.category === c.slug);
    if (!list.length) continue;
    const pages = pageCount(list.length);
    for (let n = 1; n <= pages; n++) entries.push({ path: categoryPagePath(c.slug, n), lastModified: newest(list) });
  }
  for (const p of posts) entries.push({ path: p.path, lastModified: p.updated });
  return entries;
}
