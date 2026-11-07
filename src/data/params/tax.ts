// Federal tax parameters. Values copied mechanically from the verified research file (docs/research/federal_tax.json).
import { cite } from "./types";
import { SRC } from "./sources";

export type FilingStatus = "single" | "mfj" | "hoh" | "mfs" | "mfsApart" | "qss";

/** Taxation of Social Security (IRC §86 / IRS Pub. 915). Fixed by law since 1984/1994 — never inflation-indexed. */
export const SS_TAX_THRESHOLDS = cite(
  {
    base: { single: 25000, hoh: 25000, qss: 25000, mfsApart: 25000, mfj: 32000, mfs: 0 },
    adjusted: { single: 34000, hoh: 34000, qss: 34000, mfsApart: 34000, mfj: 44000, mfs: 0 },
  },
  "official",
  "all years",
  SRC.irsPub915,
  "Not adjusted for inflation, which is why more retirees pay tax on benefits every year.",
);

/** OBBBA (P.L. 119-21) senior deduction: $6,000 per person 65+, tax years 2025–2028. Does NOT change how much of Social Security is taxable. */
export const SENIOR_DEDUCTION = cite(
  {
    perPerson: 6000,
    phaseoutStart: { single: 75000, mfj: 150000 },
    phaseoutRate: 0.06,
    years: [2025, 2026, 2027, 2028],
    birthCutoff: { 2025: "1961-01-02", 2026: "1962-01-02", 2027: "1963-01-02", 2028: "1964-01-02" },
    marriedMustFileJointly: true,
  },
  "official",
  "2025–2028",
  SRC.irsSeniorDeduction,
);

/** 2026 brackets: [over, rate, tax at lower bound] (Rev. Proc. 2025-32 §4.01). */
export const BRACKETS_2026 = cite(
  {"single": [[0, 0.1, 0], [12400, 0.12, 1240], [50400, 0.22, 5800], [105700, 0.24, 17966], [201775, 0.32, 41024], [256225, 0.35, 58448], [640600, 0.37, 192979.25]], "mfj": [[0, 0.1, 0], [24800, 0.12, 2480], [100800, 0.22, 11600], [211400, 0.24, 35932], [403550, 0.32, 82048], [512450, 0.35, 116896], [768700, 0.37, 206583.5]], "hoh": [[0, 0.1, 0], [17700, 0.12, 1770], [67450, 0.22, 7740], [105700, 0.24, 16155], [201750, 0.32, 39207], [256200, 0.35, 56631], [640600, 0.37, 191171]], "mfs": [[0, 0.1, 0], [12400, 0.12, 1240], [50400, 0.22, 5800], [105700, 0.24, 17966], [201775, 0.32, 41024], [256225, 0.35, 58448], [384350, 0.37, 103291.75]]} as Record<"single" | "mfj" | "hoh" | "mfs", [number, number, number][]>,
  "official",
  2026,
  SRC.irsRevProc202532,
);

export const STANDARD_DEDUCTION_2026 = cite(
  { single: 16100, mfs: 16100, hoh: 24150, mfj: 32200, qss: 32200 },
  "official",
  2026,
  SRC.irsRevProc202532,
);

/** Additional standard deduction per person per condition (65+ or blind), 2026. */
export const ADDITIONAL_STD_2026 = cite(
  { married: 1650, unmarried: 2050 },
  "official",
  2026,
  SRC.irsRevProc202532,
);

/** Long-term capital gains / qualified dividends 0% and 15% ceilings, 2026. */
export const CAP_GAINS_2026 = cite(
  { mfj: [98900, 613700], mfs: [49450, 306850], hoh: [66200, 579600], single: [49450, 545500] } as Record<"single" | "mfj" | "hoh" | "mfs", [number, number]>,
  "official",
  2026,
  SRC.irsRevProc202532,
);

export const NIIT = cite({ rate: 0.038, thresholds: { mfj: 250000, qss: 250000, mfs: 125000, single: 200000, hoh: 200000 } }, "official", "all years", SRC.irsNiit);

export const QCD = {
  2026: cite({ limit: 111000, splitInterest: 55000, minAge: 70.5 }, "official", 2026, SRC.irsQcd),
  2027: cite({ limit: null as number | null, splitInterest: null as number | null, minAge: 70.5 }, "not_yet_announced", 2027, SRC.irsQcd, "IRS has not announced the 2027 QCD limit yet (it is inflation-indexed under SECURE 2.0)."),
};

export const SS_WITHHOLDING_RATES = cite([0.07, 0.1, 0.12, 0.22], "official", "2026", SRC.irsPub915, "Voluntary federal withholding on Social Security via Form W-4V.");

export const IRS_2027_ADJUSTMENTS = cite(null, "not_yet_announced", 2027, SRC.irsRevProc202532, "IRS normally releases next-year brackets and standard deductions in October or November.");
/** 2026 gross-income filing thresholds (IRS Pub. 501 rule: standard deduction plus the extra amount for age), derived. */
export const FILING_THRESHOLDS_2026 = cite(
  {
    single: { under65: STANDARD_DEDUCTION_2026.value.single, over65: STANDARD_DEDUCTION_2026.value.single + ADDITIONAL_STD_2026.value.unmarried },
    hoh: { under65: STANDARD_DEDUCTION_2026.value.hoh, over65: STANDARD_DEDUCTION_2026.value.hoh + ADDITIONAL_STD_2026.value.unmarried },
    mfj: { none65: STANDARD_DEDUCTION_2026.value.mfj, one65: STANDARD_DEDUCTION_2026.value.mfj + ADDITIONAL_STD_2026.value.married, both65: STANDARD_DEDUCTION_2026.value.mfj + 2 * ADDITIONAL_STD_2026.value.married },
    qss: { under65: STANDARD_DEDUCTION_2026.value.qss, over65: STANDARD_DEDUCTION_2026.value.qss + ADDITIONAL_STD_2026.value.married },
    mfs: 5,
  },
  "official",
  2026,
  SRC.irsPub501,
);

export * from "./tax-programs";
