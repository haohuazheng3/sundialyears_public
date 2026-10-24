import type { Source } from "@/data/params/types";
import { SRC } from "@/data/params/sources";
import { IRMAA_SRC } from "@/data/params/irmaa-extra";
import { SRC_MEDICARE_EXTRA } from "@/data/params/medicare-extra";
import { SRC_EXTRA } from "@/data/params/numbers-extra";
import { RET_SRC } from "@/data/params/earnings-test-extra";
import { BY_SRC } from "@/data/params/birth-year-extra";
import { RMD_SRC } from "@/data/params/rmd-extra";
import { SRC_INHERITED } from "@/data/params/inherited-extra";
import { SRC_SS_TAX } from "@/data/params/ss-tax-extra";
import { CLAIM_SRC } from "@/data/params/ss-claiming-extra";

/**
 * Every primary source the federal calculators cite: the shared registry (SRC) plus the calculator-specific registries
 * in the `*-extra.ts` params files. De-duplicated by URL (the first label wins, and SRC comes first).
 * Read-only: this module only collects what the params files already declare. contact.test.ts walks every params
 * module and fails if a cited Source is missing here, so a new `*-extra.ts` registry must be added to this list.
 * State tax agencies (state pages) are cited on each state page and are not part of this list.
 */
const REGISTRIES: Record<string, Source>[] = [
  SRC,
  IRMAA_SRC,
  SRC_MEDICARE_EXTRA,
  SRC_EXTRA,
  RET_SRC,
  BY_SRC,
  RMD_SRC,
  SRC_INHERITED,
  SRC_SS_TAX,
  CLAIM_SRC,
];

export const normalizeSourceUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").toLowerCase();

export const ALL_SOURCES: Source[] = (() => {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const reg of REGISTRIES) {
    for (const s of Object.values(reg)) {
      const k = normalizeSourceUrl(s.url);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
  }
  return out;
})();

/** Display order and plain-English names for each publisher. */
export const AGENCIES: { publisher: Source["publisher"]; name: string; what: string }[] = [
  { publisher: "SSA", name: "Social Security Administration (SSA)", what: "Benefit formulas, the yearly cost-of-living adjustment, earnings-test limits, life tables and the operations manual (POMS) that SSA staff follow." },
  { publisher: "CMS", name: "Centers for Medicare & Medicaid Services (CMS)", what: "Medicare premiums, deductibles, IRMAA amounts, Part D parameters and the Medicare Trustees Report." },
  { publisher: "IRS", name: "Internal Revenue Service (IRS)", what: "Tax brackets, the taxation of Social Security benefits, required minimum distributions and charitable distributions." },
  { publisher: "eCFR", name: "Code of Federal Regulations (eCFR)", what: "The binding regulations behind Social Security benefits and IRMAA (SSA), RMDs (Treasury) and Medicare premiums (CMS)." },
  { publisher: "Federal Register", name: "Federal Register", what: "Official notices of new premium rates and final regulations, as published by the government." },
  {
    publisher: "Congress",
    name: "U.S. Congress",
    what: "The laws themselves (U.S. Code sections and public laws — for example the IRMAA indexing rule and the tax on benefits), plus Congressional Research Service analysis and the text of pending bills we mention. A bill is not law until it is enacted.",
  },
  { publisher: "BLS", name: "Bureau of Labor Statistics (BLS)", what: "Consumer Price Index data used to index IRMAA thresholds and to check the COLA." },
  { publisher: "Treasury", name: "U.S. Department of the Treasury", what: "Treasury guidance not published through the IRS." },
  { publisher: "HHS", name: "Department of Health and Human Services (HHS)", what: "Health program rules outside CMS." },
  { publisher: "State", name: "State tax agencies", what: "State rules on taxing retirement income." },
  { publisher: "PBGC", name: "Pension Benefit Guaranty Corporation (PBGC)", what: "The federal insurance limits on private-sector pensions." },
  {
    publisher: "Research",
    name: "Independent research",
    what: "Published research we cite for planning rules of thumb, such as safe withdrawal rates — clearly labeled as research, never as government figures.",
  },
];

export function sourcesByAgency() {
  return AGENCIES.map((a) => ({
    ...a,
    sources: ALL_SOURCES.filter((s) => s.publisher === a.publisher).sort((x, y) => x.label.localeCompare(y.label)),
  })).filter((g) => g.sources.length > 0);
}
