import "server-only";

/** Official pages that publish next year's numbers. A change in status or key phrases means: re-verify params. */
export const WATCHED_SOURCES = [
  { key: "cms-2027-partb-factsheet", label: "CMS 2027 Parts A & B premiums fact sheet", url: "https://www.cms.gov/newsroom/fact-sheets/2027-medicare-parts-b-premiums-deductibles", phrases: ["2027", "Part B"] },
  { key: "cms-2027-partb-factsheet-alt", label: "CMS 2027 Parts A & B premiums fact sheet (alt URL)", url: "https://www.cms.gov/newsroom/fact-sheets/2027-medicare-parts-and-b-premiums-and-deductibles", phrases: ["2027", "Part B"] },
  { key: "fr-partb-2027", label: "Federal Register — Part B monthly actuarial rates for 2027", url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=%22Part+B+Monthly+Actuarial+Rates%22&order=newest&per_page=3", phrases: ["January 1, 2027"] },
  { key: "medicare-gov-costs", label: "Medicare.gov — Medicare costs", url: "https://www.medicare.gov/basics/costs/medicare-costs", phrases: ["2027"] },
  { key: "irs-2027-inflation", label: "IRS newsroom — tax year 2027 inflation adjustments", url: "https://www.irs.gov/newsroom/news-releases-for-current-month", phrases: ["tax year 2027"] },
  { key: "fr-ssa-cola-2027", label: "Federal Register — SSA cost-of-living determinations for 2027", url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=%22Cost-of-Living+Increase+and+Other+Determinations+for+2027%22&order=newest&per_page=3", phrases: ["Determinations for 2027"] },
] as const;

export interface ProbeResult {
  key: string;
  label: string;
  url: string;
  status: number;
  found: boolean;
  hash: string;
  note?: string;
}

export async function probeSources(): Promise<ProbeResult[]> {
  const { createHash } = await import("node:crypto");
  return Promise.all(
    WATCHED_SOURCES.map(async (s) => {
      try {
        const r = await fetch(s.url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; SundialYearsSourceWatch/1.0; +https://sundialyears.com/methodology)" },
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        });
        const text = r.status === 200 ? (await r.text()).slice(0, 500000).toLowerCase() : "";
        const found = s.phrases.every((p) => text.includes(p.toLowerCase()));
        return { key: s.key, label: s.label, url: s.url, status: r.status, found, hash: createHash("sha256").update(`${r.status}|${found}`).digest("hex").slice(0, 24) };
      } catch (e) {
        return { key: s.key, label: s.label, url: s.url, status: 0, found: false, hash: "error", note: String(e).slice(0, 200) };
      }
    }),
  );
}
