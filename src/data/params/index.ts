export * from "./types";
export { SRC } from "./sources";
export * as SS from "./social-security";
export * as MEDICARE from "./medicare";
export * as TAX from "./tax";
export * as RMD from "./rmd";
export * as PLAN from "./planning";

/** Shown on /api/health and the methodology page: which headline numbers are still projections. */
export const PARAM_STATUS_SUMMARY = {
  pending: [
    { item: "2027 Medicare Part B premium, deductible and IRMAA tables", expected: "Mid-November 2026 (CMS)" },
    { item: "2027 federal tax brackets & standard deduction", expected: "Oct–Nov 2026 (IRS Rev. Proc.)" },
    { item: "2027 Medicare Part A deductible and premiums", expected: "Mid-November 2026 (CMS)" },
    { item: "2027 QCD limit", expected: "IRS retirement-plan limits notice (around November 2026)" },
  ],
  officialHeadlines: ["2027 COLA 3.6%", "2027 earnings-test limits", "2027 taxable maximum", "2027 Part D base premium, deductible, out-of-pocket cap"],
} as const;
