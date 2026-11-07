/**
 * Guards against hand-typed drift: every headline parameter must equal the value in the verified research files
 * (docs/research/*.json, produced by primary-source research + an adversarial verification pass).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SS_YEAR, COLA, BEND_POINTS, RET_HISTORY } from "../params/social-security";
import { IRMAA_2026, IRMAA_2027, PART_B, PART_D } from "../params/medicare";
import { BRACKETS_2026, STANDARD_DEDUCTION_2026, ADDITIONAL_STD_2026, SS_TAX_THRESHOLDS, SENIOR_DEDUCTION } from "../params/tax";
import { UNIFORM_LIFETIME, SINGLE_LIFE, JOINT_LIFE } from "../params/rmd";

const R = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/research", f), "utf8"));
const param = (file: string, key: string) => {
  const p = R(file).params.find((x: { key: string }) => x.key === key);
  if (!p) throw new Error(`missing ${key} in ${file}`);
  return p.value;
};
const table = (file: string, prefix: string) => R(file).tables.find((t: { name: string }) => t.name.startsWith(prefix));

describe("Social Security parameters", () => {
  it("COLA", () => {
    expect(COLA[2027].value).toBe(param("ssa_annual.json", "ss_cola_2027"));
    expect(COLA[2026].value).toBe(param("ssa_annual.json", "ss_cola_2026"));
  });
  it("2026/2027 program amounts", () => {
    for (const y of [2026, 2027] as const) {
      const v = SS_YEAR[y].value;
      expect(v.taxableMax).toBe(param("ssa_annual.json", `ss_taxable_max_${y}`));
      expect(v.quarterOfCoverage).toBe(param("ssa_annual.json", `ss_quarter_of_coverage_${y}`));
      expect(v.retUnderFraAnnual).toBe(param("ssa_annual.json", `ss_ret_exempt_under_fra_annual_${y}`));
      expect(v.retUnderFraMonthly).toBe(param("ssa_annual.json", `ss_ret_exempt_under_fra_monthly_${y}`));
      expect(v.retFraYearAnnual).toBe(param("ssa_annual.json", `ss_ret_exempt_fra_year_annual_${y}`));
      expect(v.retFraYearMonthly).toBe(param("ssa_annual.json", `ss_ret_exempt_fra_year_monthly_${y}`));
      expect(v.maxBenefitAtFra).toBe(param("ssa_annual.json", `ss_max_benefit_at_fra_${y}`));
      expect(v.ssiIndividual).toBe(param("ssa_annual.json", `ssi_fbr_individual_${y}`));
      expect(v.piaBendPoints).toEqual(param("ssa_annual.json", `ss_pia_bend_points_${y}`));
      expect(v.familyMaxBendPoints).toEqual(param("ssa_annual.json", `ss_family_max_bend_points_${y}`));
    }
  });
  it("bend point and earnings-test history match SSA tables", () => {
    for (const [y, a, b, c, d, e] of table("ssa_annual.json", "PIA and family").rows) {
      expect(BEND_POINTS[y]).toEqual({ pia: [a, b], fm: [c, d, e] });
    }
    for (const r of table("ssa_annual.json", "Wage-indexed").rows) expect(RET_HISTORY[r[0]]).toEqual({ under: r[1], fraYear: r[2] });
  });
});

describe("Medicare parameters", () => {
  const b26 = param("medicare.json", "irmaa_part_b_table_2026");
  const d26 = param("medicare.json", "irmaa_part_d_table_2026");
  it("2026 IRMAA table", () => {
    expect(IRMAA_2026.individualBounds).toEqual(b26.individual.slice(0, 4).map((r: { magi_le: number }) => r.magi_le));
    expect(IRMAA_2026.jointBounds).toEqual(b26.joint.slice(0, 4).map((r: { magi_le: number }) => r.magi_le));
    expect(IRMAA_2026.partBAddOn).toEqual(b26.individual.map((r: { irmaa: number }) => r.irmaa));
    expect(IRMAA_2026.partDAddOn).toEqual(d26.individual.map((r: { irmaa: number }) => r.irmaa));
    expect(IRMAA_2026.mfsTop).toBe(b26.married_filing_separately_lived_with_spouse[2].magi_ge);
    expect(IRMAA_2026.standardPartB).toBe(param("medicare.json", "medicare_part_b_standard_premium_2026"));
  });
  it("2027 projections", () => {
    const a = param("medicare.json", "irmaa_thresholds_2027_projected_scenario_a");
    expect(IRMAA_2027.individualBounds).toEqual(a.individual_upper_bounds.slice(0, 4));
    expect(IRMAA_2027.jointBounds).toEqual(a.joint_upper_bounds.slice(0, 4));
    const pb = param("medicare.json", "irmaa_part_b_adjustments_2027_projected");
    expect(IRMAA_2027.partBAddOn.slice(1)).toEqual([pb.tier_35pct, pb.tier_50pct, pb.tier_65pct, pb.tier_80pct, pb.tier_85pct]);
    const pd = param("medicare.json", "irmaa_part_d_adjustments_2027_projected");
    expect(IRMAA_2027.partDAddOn.slice(1)).toEqual([pd.tier_35pct, pd.tier_50pct, pd.tier_65pct, pd.tier_80pct, pd.tier_85pct]);
    expect(PART_B[2027].value.premium).toBe(param("medicare.json", "medicare_part_b_standard_premium_2027_projected"));
    expect(PART_D[2027].value.baseBeneficiaryPremium).toBe(param("medicare.json", "part_d_base_beneficiary_premium_2027"));
    expect(PART_D[2027].value.outOfPocketCap).toBe(param("medicare.json", "part_d_out_of_pocket_threshold_2027"));
  });
});

describe("Federal tax parameters", () => {
  it("2026 brackets, deductions, SS thresholds", () => {
    const br = param("federal_tax.json", "tax_brackets_2026");
    expect(BRACKETS_2026.value.single.map((r) => r[0])).toEqual(br.single.map((r: { over: number }) => r.over));
    expect(BRACKETS_2026.value.mfj.map((r) => r[2])).toEqual(br.married_filing_jointly_and_qss.map((r: { base_tax: number }) => r.base_tax));
    expect(STANDARD_DEDUCTION_2026.value.mfj).toBe(param("federal_tax.json", "standard_deduction_2026").married_filing_jointly);
    expect(ADDITIONAL_STD_2026.value.unmarried).toBe(param("federal_tax.json", "additional_standard_deduction_aged_blind_2026").unmarried_single_or_head_of_household);
    expect(SS_TAX_THRESHOLDS.value.base.mfj).toBe(32000);
    expect(SS_TAX_THRESHOLDS.value.adjusted.single).toBe(34000);
    expect(SENIOR_DEDUCTION.value.perPerson).toBe(param("federal_tax.json", "senior_deduction_amount"));
  });
});

describe("RMD tables (eCFR parse) agree with the independent research transcription", () => {
  it("Uniform Lifetime + Single Life", () => {
    for (const [age, v] of table("rmd.json", "Uniform Lifetime").rows) expect(UNIFORM_LIFETIME[age === "120+" ? 120 : age]).toBe(v);
    for (const [age, v] of table("rmd.json", "Single Life").rows) expect(SINGLE_LIFE[age === "120+" ? 120 : age]).toBe(v);
  });
  it("Joint table spot checks and Uniform = Joint(x, x−10)", () => {
    expect(JOINT_LIFE[75][64]).toBe(25.3);
    expect(JOINT_LIFE[80][65]).toBe(23.8);
    expect(JOINT_LIFE[90][76]).toBe(14.7);
    for (let x = 72; x <= 120; x++) expect(JOINT_LIFE[x][x - 10]).toBe(UNIFORM_LIFETIME[x]);
  });
});
