// Extra federal-tax parameters used only by the taxable-Social-Security calculator.
// Values copied exactly from docs/research/federal_tax.json (+ verify_federal_tax.json); each cites its primary source.
import { cite, type Source } from "./types";
import { SRC } from "./sources";

/** Primary sources not (yet) in the shared SRC registry. */
export const SRC_SS_TAX = {
  irsSchedule1A: {
    label: "IRS Schedule 1-A (Form 1040) — Additional Deductions (Part V: enhanced deduction for seniors)",
    url: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf",
    publisher: "IRS",
  },
  irsSchedule1A2026Draft: {
    label: "IRS draft 2026 Schedule 1-A (Form 1040) — senior deduction age test",
    url: "https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf",
    publisher: "IRS",
    published: "2026-06-16",
  },
  crsR48613: {
    label: "Congressional Research Service R48613 — Taxation of Social Security benefits after P.L. 119-21",
    url: "https://www.congress.gov/crs_external_products/R/PDF/R48613/R48613.1.pdf",
    publisher: "Congress",
    published: "2025-08-01",
  },
  pl11921: {
    label: "Public Law 119-21, §70103 — Enhanced deduction for seniors (IRC §151(d)(5)(C))",
    url: "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm",
    publisher: "Congress",
    published: "2025-07-04",
  },
  irsFormW4V: {
    label: "IRS Form W-4V — Voluntary Withholding Request (Rev. January 2026)",
    url: "https://www.irs.gov/pub/irs-pdf/fw4v.pdf",
    publisher: "IRS",
  },
  irsNiitQa: {
    label: "IRS — Questions and answers on the Net Investment Income Tax",
    url: "https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax",
    publisher: "IRS",
  },
  ssaPress20250703: {
    label: "SSA press release — Social Security applauds passage of the One Big Beautiful Bill (July 3, 2025, updated July 7)",
    url: "https://www.ssa.gov/news/en/press/releases/2025-07-03.html",
    publisher: "SSA",
    published: "2025-07-03",
  },
  ssaWithholding: {
    label: "SSA — Request to withhold taxes",
    url: "https://www.ssa.gov/manage-benefits/request-withhold-taxes",
    publisher: "SSA",
  },
} satisfies Record<string, Source>;

/**
 * Inclusion rates for Social Security benefits (IRC §86(a)(1)–(2); Pub. 915 Worksheet 1 lines 2, 14, 16, 18).
 * research key: ss_taxation_inclusion_rates.
 */
export const SS_INCLUSION = cite(
  { tier1: 0.5, tier2: 0.85, maxFraction: 0.85 },
  "official",
  "all years",
  SRC.irsPub915,
  "Fixed by statute: 50% tier and 85% tier; never more than 85% of benefits is taxable.",
);

/**
 * Long-term capital gain / qualified dividend rates (IRC §1(h), §1(j)(5)); breakpoints in CAP_GAINS_2026.
 * research key: capital_gains_rate_thresholds_2026 ("The 20% rate applies above the max 15% amount").
 */
export const CAP_GAINS_RATES = cite({ zero: 0, mid: 0.15, top: 0.2 }, "official", 2026, SRC.irsRevProc202532);

/** Source for the NIIT rate/thresholds (values live in tax.ts → NIIT). research key: niit. */
export const NIIT_SOURCE = SRC_SS_TAX.irsNiitQa;

/**
 * SSA's own framing of the 2025 law (verify_federal_tax.json, obbba_made_social_security_tax_free):
 * "nearly 90% of Social Security beneficiaries will no longer pay federal income taxes on their benefits".
 * The effect comes from the bigger deduction, not from any change to IRC §86.
 */
export const SSA_OBBBA_CLAIM = cite({ share: 0.9, wording: "nearly 90%" }, "official", 2025, SRC_SS_TAX.ssaPress20250703);

/**
 * Charitable deduction for people who do NOT itemize (P.L. 119-21 §70424, IRC §170(p)), from tax year 2026:
 * up to $1,000 of cash gifts ($2,000 joint), taken below AGI. verify_federal_tax.json missing_items:
 * "by striking ``$300 ($600'' and inserting ``$1,000 ($2,000''". Shown in prose only (the estimate does not ask about gifts).
 * Unlike a QCD it does not lower AGI or provisional income.
 */
export const NON_ITEMIZER_CHARITY = cite({ single: 1000, mfj: 2000, fromYear: 2026 }, "official", "2026 and later", SRC_SS_TAX.pl11921);
