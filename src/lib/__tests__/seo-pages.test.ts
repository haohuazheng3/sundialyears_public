import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSeoPage, seoSlugs } from "../seo-pages";
import { TOOLS } from "../tools";

const slugs = seoSlugs();
const MARKERS = /\b(TODO|TBD|FIXME|XXX|lorem)\b|[一-鿿]/;
const known = new Set(["", "calculators", "blog", "about", "methodology", "faq", "contact", "privacy", "terms", "cookies", "rmd", "social-security-by-birth-year", "state-retirement-taxes", ...TOOLS.map((t) => t.slug)]);

describe("SEO tool pages", () => {
  it("every content file has a TOOLS entry and a route", () => {
    for (const s of slugs) {
      expect(TOOLS.some((t) => t.slug === s), s).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), "src/app/(site)", s, "page.tsx")), s).toBe(true);
    }
  });
  it.each(slugs)("%s renders and passes the publish gates", (slug) => {
    const p = getSeoPage(slug)!;
    expect(p.faqs.length).toBeGreaterThanOrEqual(3);
    expect(p.faqs.length).toBeLessThanOrEqual(5);
    expect(p.wordCount).toBeGreaterThanOrEqual(300);
    expect(p.wordCount).toBeLessThanOrEqual(820);
    expect(p.images.length).toBeGreaterThanOrEqual(2);
    expect(p.html + p.title + p.description + p.lead + JSON.stringify(p.faqs)).not.toMatch(MARKERS);
    expect(p.html).not.toMatch(/\{\{/);
    for (const [, href] of p.html.matchAll(/href="(\/[^"#?]*)/g)) {
      expect(known.has(href.replace(/^\//, "").split("/")[0]), `${slug} → ${href}`).toBe(true);
    }
  });
  it("every long-tail tool has written content (skipped in a code-only checkout)", () => {
    if (!slugs.length) return;
    for (const t of TOOLS.filter((x) => x.tier === "more")) expect(slugs, t.slug).toContain(t.slug);
  });
  it("titles and descriptions are unique", () => {
    const pages = slugs.map((s) => getSeoPage(s)!);
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });
});
