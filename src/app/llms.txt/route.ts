import { SITE } from "@/lib/site";
import { CALCULATORS, REFERENCES } from "@/lib/tools";

/** llms.txt — a plain-language map of the site for AI answer engines (https://llmstxt.org). Prerendered. */
export function GET() {
  const line = (slug: string, title: string, blurb: string) => `- [${title}](${SITE.url}/${slug}): ${blurb}`;
  const body = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Every figure is taken from primary sources (Social Security Administration, CMS/Medicare.gov, IRS, Federal Register, eCFR, state revenue departments) and labeled Official, Projected or Not yet announced. As of October 23, 2026: the 2027 Social Security COLA is 3.6% (official); 2027 Medicare Part B premium and IRMAA brackets are projections until CMS publishes them (expected mid-November 2026).",
    "",
    "## Calculators",
    ...CALCULATORS.map((t) => line(t.slug, t.title, t.blurb)),
    "",
    "## Reference",
    ...REFERENCES.map((t) => line(t.slug, t.title, t.blurb)),
    `- [RMD by age](${SITE.url}/rmd/age-73): one page per age from 73 to 105 with the IRS factor and examples.`,
    `- [Social Security by birth year](${SITE.url}/social-security-by-birth-year): one page per birth year from 1943 to 1975.`,
    "",
    "## About",
    `- [Methodology & sources](${SITE.url}/methodology): how numbers are verified and updated.`,
    `- [About](${SITE.url}/about)`,
    `- [Contact](${SITE.url}/contact): ${SITE.contactEmail}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
