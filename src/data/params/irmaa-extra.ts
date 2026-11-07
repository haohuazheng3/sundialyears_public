// IRMAA-specific parameters and sources that are not in medicare.ts.
// Every value is copied from docs/research/medicare.json + verify_medicare.json (adversarially verified 2026-10-23).
import { cite, type Source } from "./types";
import { SRC } from "./sources";

/** Primary sources used only by the IRMAA calculator and bracket pages. */
export const IRMAA_SRC = {
  ecfr418_1115: {
    label: "20 CFR 418.1115 — What are the modified adjusted gross income ranges and applicable percentages?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1115",
    publisher: "eCFR",
  },
  ecfr418_1135: {
    label: "20 CFR 418.1135 — What modified adjusted gross income information will SSA use?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1135",
    publisher: "eCFR",
  },
  ecfr418_1150: {
    label: "20 CFR 418.1150 — When will SSA use an amended tax return?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1150",
    publisher: "eCFR",
  },
  ecfr418_1205: {
    label: "20 CFR 418.1205 — What is a major life-changing event?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1205",
    publisher: "eCFR",
  },
  ecfr418_1215: {
    label: "20 CFR 418.1215 — What is a significant reduction in income?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1215",
    publisher: "eCFR",
  },
  ecfr418_1230: {
    label: "20 CFR 418.1230 — When will a new initial determination based on a life-changing event be effective?",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1230",
    publisher: "eCFR",
  },
  ecfr423_286: {
    label: "42 CFR 423.286 — Rules regarding premiums (Part D income-related monthly adjustment)",
    url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-423/subpart-F/section-423.286",
    publisher: "eCFR",
  },
  ecfr408_27: {
    label: "42 CFR 408.27 — Rounding of the monthly premium",
    url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-408/subpart-B/section-408.27",
    publisher: "eCFR",
  },
  blsShutdownFaq: {
    label: "BLS — 2025 federal government shutdown: impact on the Consumer Price Index (FAQ)",
    url: "https://www.bls.gov/cpi/additional-resources/2025-federal-government-shutdown-impact-cpi-faq.htm",
    publisher: "BLS",
  },
  ssa44: {
    label: "SSA — Form SSA-44, Medicare Income-Related Monthly Adjustment Amount: Life-Changing Event",
    url: "https://www.ssa.gov/forms/ssa-44.pdf",
    publisher: "SSA",
  },
  medicareCosts2026: {
    label: "Medicare.gov — 2026 Medicare costs (CMS Product No. 11579)",
    url: "https://www.medicare.gov/publications/11579-medicare-costs.pdf",
    publisher: "CMS",
  },
  hr9709: {
    label: "H.R. 9709 — Medicare Premiums Reduction Act of 2026 (introduced text)",
    url: "https://www.govinfo.gov/content/pkg/BILLS-119hr9709ih/html/BILLS-119hr9709ih.htm",
    publisher: "Congress",
    published: "2026-07-15",
  },
} satisfies Record<string, Source>;

/**
 * Share of program cost that the standard premium covers. IRMAA tiers charge the applicable percentage
 * (35/50/65/80/85) instead: Part B adds (pct − 25 points) of the unsubsidized cost (42 U.S.C. 1395r(i)(3)(A));
 * Part D adds base beneficiary premium × (pct − 25.5) / 25.5 (42 CFR 423.286(d)(4)(ii)).
 */
export const IRMAA_FORMULA = {
  partBStandardPct: cite(25, "official", "all years", SRC.statuteIrmaa),
  partDBasePct: cite(25.5, "official", "all years", IRMAA_SRC.ecfr423_286),
  /** CMS premiums are rounded to the nearest 10 cents (42 CFR 408.27). */
  roundTo: cite(0.1, "official", "all years", IRMAA_SRC.ecfr408_27),
} as const;

/**
 * Threshold indexing rule (42 U.S.C. 1395r(i)(5)): base amounts × CPI-U ratio, rounded to the nearest $1,000.
 * Joint bounds = 2 × the rounded individual bounds (CMS practice, verified against the 2021 Federal Register table).
 * The $500,000 / $750,000 top tier is not indexed until 2028.
 */
export const IRMAA_INDEXING_RULE = cite(
  { roundTo: 1000, jointMultiple: 2, topTierFirstIndexedYear: 2028 },
  "official",
  "2020 onward",
  SRC.statuteIrmaa,
);

/** CPI-U (CUUR0000SA0, NSA) in the window that sets the 2027 thresholds. October 2025 was never published. */
export const CPI_WINDOW_2027 = cite(
  [
    { month: "2025-09", value: 324.8 },
    { month: "2025-10", value: null },
    { month: "2025-11", value: 324.122 },
    { month: "2025-12", value: 324.054 },
    { month: "2026-01", value: 325.252 },
    { month: "2026-02", value: 326.785 },
    { month: "2026-03", value: 330.213 },
    { month: "2026-04", value: 333.02 },
    { month: "2026-05", value: 335.123 },
    { month: "2026-06", value: 333.952 },
    { month: "2026-07", value: 333.918 },
    { month: "2026-08", value: 334.98 },
  ] as { month: string; value: number | null }[],
  "official",
  2027,
  SRC.blsCpiU,
  "Retrieved from the BLS Public Data API on 2026-10-23. BLS says October 2025 cannot be collected retroactively.",
);

/** Scenario B: October 2025 imputed (geometric mean of September and November) instead of averaging 11 months. */
export const IRMAA_2027_SCENARIO_B = cite(
  { imputedOct2025: 324.4608, avg12mo: 329.223319, factor: 1.320696, unrounded: [112259.16, 141314.47, 176312.92, 211311.36] },
  "projected",
  2027,
  IRMAA_SRC.blsShutdownFaq,
  "Using October = September or October = November gives the same rounded thresholds.",
);

/** Back-test: the indexing rule reproduces every published individual threshold, 2021–2026. */
export const IRMAA_THRESHOLD_HISTORY = cite(
  [
    { year: 2021, cpiAvg: 257.720833, factor: 1.03386, bounds: [88000, 111000, 138000, 165000] },
    { year: 2022, cpiAvg: 265.446583, factor: 1.064852, bounds: [91000, 114000, 142000, 170000] },
    { year: 2023, cpiAvg: 285.848333, factor: 1.146695, bounds: [97000, 123000, 153000, 183000] },
    { year: 2024, cpiAvg: 301.374167, factor: 1.208978, bounds: [103000, 129000, 161000, 193000] },
    { year: 2025, cpiAvg: 310.955, factor: 1.247412, bounds: [106000, 133000, 167000, 200000] },
    { year: 2026, cpiAvg: 319.205, factor: 1.280507, bounds: [109000, 137000, 171000, 205000] },
  ] as { year: number; cpiAvg: number; factor: number; bounds: [number, number, number, number] }[],
  "official",
  "2021–2026",
  SRC.ssaPomsIrmaa,
  "Published values: FR 2020-25029 (2021), FR 2021-25050 (2022), SSA POMS HI 01101.020 history (2023–2025), CMS fact sheet (2026). CPI averages: BLS.",
);

/** 2026 IRMAA for people with Part B immunosuppressive-drug-only coverage (same MAGI tiers as full Part B). */
export const IRMAA_IMMUNO_2026 = cite(
  { standard: 121.6, addOn: [0, 81.1, 202.7, 324.3, 445.9, 486.5] as [number, number, number, number, number, number] },
  "official",
  2026,
  SRC.cms2026Premiums,
);

/** When CMS published recent Part B premium / IRMAA tables (used for "expected" language). */
export const CMS_RELEASE_DATES = cite(
  { 2026: "2025-11-14", 2025: "2024-11-08", 2024: "2023-10-12" } as Record<number, string>,
  "official",
  "2024–2026",
  SRC.cms2026Premiums,
  "2027 figures are expected early-to-mid November 2026.",
);

/**
 * When CMS is expected to publish the 2027 Part B premium and IRMAA table (medicare.json →
 * cms_2027_part_ab_premiums_irmaa_release_status, "expect 2027 values roughly early-to-mid November 2026").
 */
export const IRMAA_2027_RELEASE_EXPECTED = cite(
  "early-to-mid November 2026",
  "not_yet_announced",
  2027,
  SRC.cms2026Premiums,
  "Not released as of 2026-10-23. Past releases: November 14, 2025; November 8, 2024; October 12, 2023.",
);

/** SSA uses an amended return for IRMAA only if it is filed within this many calendar years after the tax year (20 CFR 418.1150). */
export const AMENDED_RETURN_WINDOW_YEARS = cite(3, "official", "all years", IRMAA_SRC.ecfr418_1150);

/** Pending (NOT enacted) bill that would restructure IRMAA. Shown only as context. */
export const IRMAA_PENDING_BILL = cite(
  { bill: "H.R. 9709", introduced: "2026-07-15", proposedThreshold: 171000, proposedFirstYear: 2027 },
  "not_yet_announced",
  2027,
  IRMAA_SRC.hr9709,
  "Introduced July 15, 2026 and referred to committee; would drop the 35% and 50% tiers. Not law.",
);
