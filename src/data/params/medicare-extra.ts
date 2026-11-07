import { cite, type Source } from "./types";
import { SRC } from "./sources";

/**
 * Extra Medicare figures used by the Medicare premium calculator that are not in ./medicare.ts.
 * Every value is copied from docs/research/medicare.json / verify_medicare.json (primary sources).
 */

export const SRC_MEDICARE_EXTRA = {
  cmsMaPdp2027: {
    label: "CMS press release — Medicare Advantage and Part D programs expected to remain stable in 2027",
    url: "https://www.cms.gov/newsroom/press-releases/medicare-advantage-medicare-prescription-drug-programs-expected-remain-stable-2027",
    publisher: "CMS",
    published: "2026-09-28",
  },
  cmsPartD2026: {
    label: "CMS — 2026 Medicare Part D bid information (base beneficiary premium $38.99)",
    url: "https://www.cms.gov/newsroom/fact-sheets/2026-medicare-part-d-bid-information-and-part-d-premium-stabilization-demonstration-parameters",
    publisher: "CMS",
    published: "2025-07-28",
  },
  medicareGovPartDLep: {
    label: "Medicare.gov — Part D late enrollment penalty (publication 11222)",
    url: "https://www.medicare.gov/publications/11222-part-d-late-enrollment-penalty.pdf",
    publisher: "CMS",
  },
  ecfr40824: {
    label: "42 CFR §408.24 — Part B premium increase for late enrollment",
    url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-408/subpart-B/section-408.24",
    publisher: "eCFR",
  },
  ecfr40827: {
    label: "42 CFR §408.27 — Rounding of Part B monthly premiums to the nearest 10 cents",
    url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-408/subpart-B/section-408.27",
    publisher: "eCFR",
  },
  ecfr423286: {
    label: "42 CFR §423.286 — Part D premiums, late-enrollment penalty and income-related adjustment",
    url: "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-423/subpart-F/section-423.286",
    publisher: "eCFR",
  },
  ecfr4181205: {
    label: "20 CFR §418.1205 — Major life-changing events that can lower IRMAA (Form SSA-44)",
    url: "https://www.ecfr.gov/current/title-20/chapter-III/part-418/subpart-B/section-418.1205",
    publisher: "eCFR",
  },
} satisfies Record<string, Source>;

/** 2025 Part B standard premium — the starting point of the 2026 hold-harmless test. */
export const PART_B_2025 = cite(
  { premium: 185 },
  "official",
  2025,
  SRC.cms2026Premiums,
  "CMS: “$202.90 for 2026, an increase of $17.90 from $185.00 in 2025.”",
);

/**
 * Average total monthly plan premiums (CMS). Used only as the default plan premium when the reader
 * doesn't enter their own plan's premium. 2026 = CMS-reported average; 2027 = CMS projection from plan bids.
 */
export const AVG_PLAN_PREMIUM = {
  2026: cite(
    { pdp: 35.09, ma: 14.37 },
    "official",
    2026,
    SRC_MEDICARE_EXTRA.cmsMaPdp2027,
    "Average total premium for stand-alone Part D plans and for Medicare Advantage plans in 2026.",
  ),
  2027: cite(
    { pdp: 36, ma: 12 },
    "projected",
    2027,
    SRC_MEDICARE_EXTRA.cmsMaPdp2027,
    "CMS projection (Sept. 28, 2026): stand-alone Part D average about $36, Medicare Advantage average $12.00. Your plan's premium can be very different.",
  ),
} as const;

/** The Part D Premium Stabilization Demonstration ends after 2026 (CMS, July 28, 2026). */
export const PART_D_DEMO_ENDS = cite({ lastYear: 2026 }, "official", 2027, SRC.cmsPartD2027, "“CMS will discontinue the demonstration at the end of CY 2026.”");

/** Part A late-enrollment penalty (premium Part A only): +10%, paid for twice the number of years you delayed. */
export const PART_A_PENALTY = cite(
  { rate: 0.1, yearsMultiple: 2 },
  "official",
  "all",
  SRC.medicareGovPenalty,
  "“your monthly premium may go up 10%. You'll have to pay the penalty for twice the number of years you didn't sign up.”",
);
