import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOG_DIR,
  CATEGORIES,
  POSTS_PER_PAGE,
  RESERVED_IDS,
  categoryPagePath,
  countWords,
  getAllPosts,
  getBlogSitemapEntries,
  getFeaturedPosts,
  getPost,
  getPostsByCategory,
  paginate,
  paginationParams,
  parsePostSource,
  postParams,
  readingMinutesFor,
  renderMarkdown,
  resolveParamToken,
  resolveParamTokens,
  slugify,
} from "@/lib/blog";
import { toolBySlug } from "@/lib/tools";
import { MEDICARE, SS } from "@/data/params";
import { money, money2, pctPlain } from "@/lib/format";

const fm = (extra = "", body = "Body text.") =>
  `---
title: "A valid test article title"
description: "A description long enough to pass validation, written the way a real article summary would be."
published: 2026-10-20
category: medicare
${extra}
---
${body}
`;

const words = (t: string) => t.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean).length;

describe("categories", () => {
  it("has exactly the five planned topics", () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual(["social-security", "medicare", "rmds-and-iras", "retirement-taxes", "retirement-planning"]);
  });

  it.each(CATEGORIES.map((c) => [c.slug, c] as const))("%s: copy fits the SEO limits and every link points at a real tool", (_, c) => {
    expect(c.metaTitle.length).toBeLessThanOrEqual(60);
    expect(c.metaDescription.length).toBeGreaterThanOrEqual(140);
    expect(c.metaDescription.length).toBeLessThanOrEqual(160);
    const sentences = c.description.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(3);
    expect(c.intro.length).toBeGreaterThanOrEqual(1);
    for (const t of c.tools) expect(toolBySlug(t), t).toBeTruthy();
    for (const q of c.questions) expect(toolBySlug(q.href.slice(1)), q.href).toBeTruthy();
  });

  // The hub renders intro[0] as the answer (class "answer") to "What should you know about … first?".
  it.each(CATEGORIES.map((c) => [c.slug, c] as const))("%s: the answer paragraph is 1–2 sentences and 40–60 words", (_, c) => {
    const answer = c.intro[0];
    expect(words(answer)).toBeGreaterThanOrEqual(40);
    expect(words(answer)).toBeLessThanOrEqual(60);
    expect(sentences(answer)).toBeLessThanOrEqual(2);
  });

  it.each(CATEGORIES.map((c) => [c.slug, c] as const))("%s: acronyms are spelled out on the hub before readers need them", (_, c) => {
    const text = [c.description, ...c.intro].join(" ");
    if (/\bRMDs?\b/.test(text)) expect(text).toMatch(/required minimum distributions? \(RMDs?\)/);
    if (/\bIRMAA\b/.test(text)) expect(text).toMatch(/income-related/);
  });

  it("makes no unsourced claims about our own experience or other people's behaviour", () => {
    const text = CATEGORIES.flatMap((c) => [c.description, ...c.intro]).join(" ");
    for (const phrase of [/hundreds of cases/i, /we see most often/i, /most people who qualify/i, /most retirees/i, /usually more expensive/i]) {
      expect(text).not.toMatch(phrase);
    }
  });

  it("states the Social Security withdrawal and earnings-test rules correctly (20 CFR 404.640, 404.412)", () => {
    const ss = CATEGORIES.find((c) => c.slug === "social-security")!.intro.join(" ");
    expect(ss).toMatch(/only once, only within a year of your first month of benefits, and only by repaying/);
    expect(ss).toMatch(/once you reach full retirement age, Social Security raises your monthly check/);
    expect(ss).not.toMatch(/only shortly after you file|only if you understand/);
  });
});

describe("renderMarkdown", () => {
  const md = `# Demoted title

## What is an RMD?

An RMD is a required minimum distribution.

Second paragraph.

### Step one & two

## What is an RMD?

| A | B |
| --- | --- |
| 1 | 2 |

[SSA](https://www.ssa.gov/) and [our calculator](/rmd-calculator) but not [this](javascript:alert(1)).

![Alt "text"](/brand/og-default.png)

> Quote

---
`;
  const { html, toc } = renderMarkdown(md);

  it("demotes H1 to H2 so the page keeps a single H1", () => {
    expect(html).not.toContain("<h1");
    expect(html).toContain('<h2 id="demoted-title">Demoted title</h2>');
  });

  it("builds a TOC of H2/H3 with unique ids and decoded text", () => {
    expect(toc).toEqual([
      { id: "demoted-title", text: "Demoted title", depth: 2 },
      { id: "what-is-an-rmd", text: "What is an RMD?", depth: 2 },
      { id: "step-one-two", text: "Step one & two", depth: 3 },
      { id: "what-is-an-rmd-2", text: "What is an RMD?", depth: 2 },
    ]);
    expect(html).toContain('<h3 id="step-one-two">Step one &amp; two</h3>');
  });

  it("marks the first paragraph after each H2 as the answer", () => {
    expect(html).toContain('<h2 id="what-is-an-rmd">What is an RMD?</h2>\n<p class="answer">An RMD is a required minimum distribution.</p>');
    expect(html).toContain("<p>Second paragraph.</p>");
  });

  it("wraps tables, styles quotes and rules, handles links and images safely", () => {
    expect(html).toContain('<div class="overflow-x-auto"><table class="table-sy text-[1rem]">');
    expect(html).toContain("</table></div>");
    expect(html).toContain('<blockquote class="sunk px-5 py-4">');
    expect(html).toContain('<hr class="divider-dots border-0" />');
    expect(html).toContain('<a href="https://www.ssa.gov/" rel="noopener">SSA</a>');
    expect(html).toContain('<a href="/rmd-calculator">our calculator</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('alt="Alt &quot;text&quot;"');
    expect(html).toContain('loading="lazy"');
  });

  it("never repeats an id, even when a heading text looks like a generated suffix", () => {
    const ids = renderMarkdown("## A\n\nx\n\n## A\n\ny\n\n## A 2\n\nz\n\n## A 2\n\nw").toc.map((t) => t.id);
    expect(ids).toEqual(["a", "a-2", "a-2-2", "a-2-3"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never gives a heading an id the page template already uses", () => {
    const { toc, html } = renderMarkdown("## Main\n\nx\n\n## Sources h\n\ny\n\n## Toc h\n\nz");
    for (const t of toc) expect(RESERVED_IDS as readonly string[]).not.toContain(t.id);
    expect(toc.map((t) => t.id)).toEqual(["main-2", "sources-h-2", "toc-h-2"]);
    expect(html).not.toContain('id="main"');
  });

  it("only marks a paragraph that directly follows the H2 as the answer", () => {
    const { html } = renderMarkdown("## Q?\n\n- a list first\n\nThen a paragraph.\n\n### Sub\n\nUnder an H3.");
    expect(html).not.toContain('class="answer"');
  });

  it("slugifies punctuation and accents", () => {
    expect(slugify("What’s my RMD at 73?")).toBe("whats-my-rmd-at-73");
    expect(slugify("Café & Medicare")).toBe("cafe-medicare");
    expect(slugify("???")).toBe("section");
  });
});

describe("parsePostSource", () => {
  it("parses a valid post and normalizes YAML dates", () => {
    const { meta } = parsePostSource(fm(), "medicare", "a-valid-post");
    expect(meta.published).toBe("2026-10-20");
    expect(meta.updated).toBe("2026-10-20");
    expect(meta.draft).toBe(false);
    expect(meta.path).toBe("/blog/medicare/a-valid-post");
    expect(meta.tools).toEqual(CATEGORIES.find((c) => c.slug === "medicare")!.tools);
    expect(meta.readingMinutes).toBe(1);
  });

  it("accepts quoted dates, FAQs, sources and a tools override", () => {
    const { meta } = parsePostSource(
      fm(`updated: "2026-10-22"
faqs:
  - q: "Is it valid?"
    a: "Yes, this answer is long enough."
sources:
  - label: "CMS"
    url: "https://www.cms.gov/"
tools: [irmaa-calculator]`),
      "medicare",
      "with-extras",
    );
    expect(meta.updated).toBe("2026-10-22");
    expect(meta.faqs).toHaveLength(1);
    expect(meta.sources[0].url).toBe("https://www.cms.gov/");
    expect(meta.tools).toEqual(["irmaa-calculator"]);
  });

  it.each([
    ["category folder mismatch", fm(), "social-security", "ok-slug", /must match its folder/],
    ["unknown folder", fm(), "pensions", "ok-slug", /not a blog category/],
    ["reserved slug", fm(), "medicare", "page", /file name/],
    ["bad slug", fm(), "medicare", "Bad_Slug", /file name/],
    ["updated before published", fm("updated: 2026-10-01"), "medicare", "ok-slug", /earlier than published/],
    ["image without alt", fm("image: /brand/og-default.png"), "medicare", "ok-slug", /imageAlt is required/],
    ["missing image file", fm(`image: /blog/does-not-exist.png\nimageAlt: "A chart"`), "medicare", "ok-slug", /does not exist/],
    ["unknown tool", fm("tools: [not-a-tool]"), "medicare", "ok-slug", /unknown tool/],
    ["typo'd key", fm("updatd: 2026-10-21"), "medicare", "ok-slug", /invalid frontmatter/],
    ["impossible date", fm("updated: 2026-02-30"), "medicare", "ok-slug", /invalid frontmatter/],
    ["non-http source", fm(`sources:\n  - label: "x"\n    url: "ftp://x"`), "medicare", "ok-slug", /invalid frontmatter/],
    ["month 13 (YAML rolls it into next year)", fm("updated: 2026-13-01"), "medicare", "ok-slug", /ok-slug\.md: invalid frontmatter/],
    ["day 32", fm("updated: 2026-12-32"), "medicare", "ok-slug", /ok-slug\.md: invalid frontmatter/],
    ["quoted impossible date", fm(`updated: "2026-04-31"`), "medicare", "ok-slug", /ok-slug\.md: invalid frontmatter/],
    ["a date with a time", fm("updated: 2026-10-21T09:00:00Z"), "medicare", "ok-slug", /invalid frontmatter/],
    ["draft written as a string", fm(`draft: "true"`), "medicare", "ok-slug", /invalid frontmatter/],
    ["duplicate FAQ question", fm(`faqs:\n  - q: "Same question?"\n    a: "First answer, long enough."\n  - q: "Same question?"\n    a: "Second answer, long enough."`), "medicare", "ok-slug", /appears twice/],
    ["duplicate source", fm(`sources:\n  - label: "CMS"\n    url: "https://www.cms.gov/"\n  - label: "CMS again"\n    url: "https://www.cms.gov/"`), "medicare", "ok-slug", /listed twice/],
  ])("rejects %s", (_, src, folder, slug, err) => {
    expect(() => parsePostSource(src, folder, slug)).toThrow(err);
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parsePostSource(fm("updated: 2028-02-29"), "medicare", "leap").meta.updated).toBe("2028-02-29");
    expect(() => parsePostSource(fm("updated: 2027-02-29"), "medicare", "leap")).toThrow(/invalid frontmatter/);
  });

  it("parses the same source twice identically (gray-matter caches by content)", () => {
    const src = fm("updated: 2026-10-21");
    expect(parsePostSource(src, "medicare", "twice").meta).toEqual(parsePostSource(src, "medicare", "twice").meta);
  });
});

describe("parameter tokens (articles never type a number)", () => {
  it("resolves official values with the requested format, straight from src/data/params", () => {
    expect(resolveParamToken("SS.COLA.2027", "pctPlain")).toEqual({ text: pctPlain(SS.COLA[2027].value), status: "official" });
    expect(resolveParamToken("SS.SS_YEAR.2027.retUnderFraAnnual", "money")).toEqual({
      text: money(SS.SS_YEAR[2027].value.retUnderFraAnnual),
      status: SS.SS_YEAR[2027].status,
    });
  });

  it("carries a non-final status through and labels it — as a pill in HTML, in words in plain text", () => {
    const premium = money2(MEDICARE.PART_B[2027].value.premium);
    expect(MEDICARE.PART_B[2027].status).not.toBe("official");
    expect(resolveParamToken("MEDICARE.PART_B.2027.premium", "money2")).toEqual({ text: premium, status: MEDICARE.PART_B[2027].status });
    const html = resolveParamTokens("Part B: {{ MEDICARE.PART_B.2027.premium | money2 }}.", "html");
    expect(html).toMatch(new RegExp(`^Part B: \\${premium} <span class="pill pill-(sun|ember)" title="[^"]+">(Projected|Not announced yet)</span>\\.$`));
    expect(resolveParamTokens("Part B: {{MEDICARE.PART_B.2027.premium|money2}}", "text")).toMatch(/\((projected|not yet announced)\)$/);
  });

  it("keeps a token's status pill out of the table of contents text", () => {
    const { toc } = renderMarkdown(resolveParamTokens("## Is Part B {{MEDICARE.PART_B.2027.premium|money2}} in 2027?\n\nAnswer.", "html"));
    expect(toc[0].text).not.toMatch(/[<>]/);
    // The pill's label must not leak into the TOC or the id (the id would change the day the figure becomes official).
    expect(toc[0].text).toBe(`Is Part B ${money2(MEDICARE.PART_B[2027].value.premium)} in 2027?`);
    expect(toc[0].id).not.toMatch(/projected|announced/);
  });

  it("keeps an escaped token literal", () => {
    expect(resolveParamTokens("Write `\\{{SS.COLA.2027|pctPlain}}`", "html")).toBe("Write `{{SS.COLA.2027|pctPlain}}`");
  });

  it.each([
    ["SS.COLA.2027", undefined, /needs a format/],
    ["SS.COLA.2027", "dollars", /unknown format/],
    ["SS.COLA.2031", "pctPlain", /no "2031"/],
    ["SS.toString", "raw", /no "toString"/],
    ["IRS.BRACKETS", "num", /unknown root/],
    ["MEDICARE.IRMAA_2027", undefined, /a table/],
    ["TAX.IRS_2027_ADJUSTMENTS", "num", /empty value/],
  ])("rejects {{%s|%s}}", (expr, format, err) => {
    expect(() => resolveParamToken(expr, format)).toThrow(err);
  });

  it("resolves tokens in the body and the plain-text fields, and a bad token fails with the file path", () => {
    const { meta, body } = parsePostSource(
      fm(
        `faqs:\n  - q: "How big is the raise?"\n    a: "The 2027 increase is {{SS.COLA.2027|pctPlain}} for everyone."`,
        "The raise is {{SS.COLA.2027|pctPlain}}.",
      ),
      "medicare",
      "tokens",
    );
    expect(body).toContain(`The raise is ${pctPlain(SS.COLA[2027].value)}.`);
    expect(meta.faqs[0].a).toBe(`The 2027 increase is ${pctPlain(SS.COLA[2027].value)} for everyone.`);
    expect(() => parsePostSource(fm("", "Bad {{SS.NOPE|num}}"), "medicare", "bad-token")).toThrow(/bad-token\.md: \{\{SS\.NOPE\}\}/);
  });
});

describe("reading time and pagination", () => {
  it("counts prose words, not markup", () => {
    expect(countWords("## Heading here\n\nOne [two](https://x.y) three `four`.\n\n```\ncode is skipped\n```")).toBe(6);
    expect(readingMinutesFor(0)).toBe(1);
    expect(readingMinutesFor(1000)).toBe(5);
  });

  it("splits listings into pages of 12", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(POSTS_PER_PAGE).toBe(12);
    expect(paginate(items, 1).items).toHaveLength(12);
    expect(paginate(items, 3).items).toEqual([24]);
    expect(paginate(items, 3).totalPages).toBe(3);
    expect(paginate(items, 4).items).toEqual([]);
    expect(paginate([], 1).totalPages).toBe(1);
    expect(categoryPagePath("medicare", 1)).toBe("/blog/medicare");
    expect(categoryPagePath("medicare", 2)).toBe("/blog/medicare/page/2");
  });
});

describe("repository content", () => {
  it("loads every Markdown file without errors", () => {
    expect(() => getAllPosts({ includeDrafts: true })).not.toThrow();
  });

  it("every FAQ answer (drafts included) is 40–80 words", () => {
    for (const p of getAllPosts({ includeDrafts: true })) {
      for (const f of p.faqs) {
        expect(words(f.a), `${p.path}: ${f.q}`).toBeGreaterThanOrEqual(40);
        expect(words(f.a), `${p.path}: ${f.q}`).toBeLessThanOrEqual(80);
      }
    }
  });
});

// content/ is not part of the public mirror (only README.md may be published as Markdown), so these run only where the
// sample exists — the public repo's `npm test` must still pass without it.
const SAMPLE_FILE = path.join(BLOG_DIR, "retirement-planning", "style-guide-sample.md");
describe.skipIf(!fs.existsSync(SAMPLE_FILE))("style-guide sample", () => {
  const sample = { category: "retirement-planning", slug: "style-guide-sample" };

  it("ships the draft style-guide sample, which is prerendered but never listed", () => {
    expect(postParams()).toContainEqual(sample);
    expect(getAllPosts().some((p) => p.slug === sample.slug)).toBe(false);
    expect(getPostsByCategory(sample.category).some((p) => p.slug === sample.slug)).toBe(false);
    expect(getFeaturedPosts().some((p) => p.slug === sample.slug)).toBe(false);
    expect(getBlogSitemapEntries().some((e) => e.path.includes(sample.slug))).toBe(false);
  });

  it("renders the sample with every template feature", () => {
    const post = getPost(sample.category, sample.slug)!;
    expect(post.draft).toBe(true);
    expect(post.image).toBeTruthy();
    expect(post.imageAlt).toBeTruthy();
    expect(post.faqs.length).toBeGreaterThan(0);
    expect(post.sources.length).toBeGreaterThan(0);
    expect(post.toc.filter((t) => t.depth === 2).length).toBeGreaterThanOrEqual(2);
    expect(post.toc.some((t) => t.depth === 3)).toBe(true);
    for (const needle of ['class="answer"', "<table", "<ol>", "<ul>", "<blockquote", "<img", 'rel="noopener"', 'class="pill pill-']) expect(post.html).toContain(needle);
    // Every token resolved; the only "{{" left is the escaped example inside <code>.
    expect(post.html.replace(/<code>[^<]*<\/code>/g, "")).not.toContain("{{");
    expect(post.html).toContain(pctPlain(SS.COLA[2027].value));
  });
});

describe("listing pages and sitemap", () => {
  it("only generates listing pages that exist, and the sitemap skips empty hubs", () => {
    for (const { category, n } of paginationParams()) {
      expect(Number(n)).toBeGreaterThanOrEqual(2);
      expect(getPostsByCategory(category).length).toBeGreaterThan((Number(n) - 1) * POSTS_PER_PAGE);
    }
    const entries = getBlogSitemapEntries();
    expect(entries[0].path).toBe("/blog");
    for (const c of CATEGORIES) {
      expect(entries.some((e) => e.path === `/blog/${c.slug}`)).toBe(getPostsByCategory(c.slug).length > 0);
    }
  });
});
