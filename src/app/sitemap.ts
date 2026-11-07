import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { AGE_PAGES, ageHref } from "@/components/calculators/rmd/RmdAgeData";
import { BIRTH_YEARS } from "@/components/reference/birth-year/basics";
import { STATES } from "@/data/states";
import { getBlogSitemapEntries } from "@/lib/blog";

/** Every indexable URL. lastModified = the date the numbers were last verified (real, not "now"). */
export default function sitemap(): MetadataRoute.Sitemap {
  const verified: string = SITE.dataVerifiedOn;
  const url = (path: string, priority = 0.6, lastModified = verified) => ({ url: `${SITE.url}${path}`, lastModified, priority });
  return [
    url("/", 1),
    url("/calculators", 0.8),
    ...TOOLS.map((t) => url(`/${t.slug}`, t.kind === "calculator" ? 0.9 : 0.8)),
    ...AGE_PAGES.map((a) => url(ageHref(a), 0.6)),
    ...BIRTH_YEARS.map((y) => url(`/social-security-by-birth-year/${y}`, 0.6)),
    ...STATES.map((s) => url(`/state-retirement-taxes/${s.slug}`, 0.6)),
    ...["/about", "/methodology", "/faq", "/contact", "/privacy", "/terms", "/cookies"].map((p) => url(p, 0.3)),
    ...getBlogSitemapEntries().map((e) => url(e.path, 0.5, e.lastModified ?? verified)),
  ];
}
