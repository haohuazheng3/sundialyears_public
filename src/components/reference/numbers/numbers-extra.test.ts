/**
 * Guards src/data/params/numbers-extra.ts and the assembled 2026→2027 table against the verified research files
 * (docs/research/ssa_annual.json + verify_ssa_annual.json). Same idea as src/data/__tests__/params-vs-research.test.ts.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  COLA_1999,
  COLA_2027_DATES,
  COLA_NOTICES_2027,
  CPIW_Q3_MONTHLY,
  MAX_BENEFIT_2026,
  MAX_EXAMPLE_AGE62,
  NEXT_COLA,
  PART_A_LIFETIME_RESERVE_DAYS,
  PENDING_2027_EXTRA,
  PAYROLL_TAX,
  PIA_FACTORS,
  RET_WITHHOLDING,
  SS_BENEFIT_TAXABLE_SHARE,
  SSI_ESSENTIAL_PERSON_2027,
  SSI_RESOURCE_LIMITS,
  SSI_STUDENT_EXCLUSION,
  SSI_UNROUNDED_ANNUAL,
  TRUSTEES_COLA_ASSUMPTION,
  WORK_CREDITS,
} from "@/data/params/numbers-extra";
import { AVG_BENEFITS, COLA, MAX_BENEFIT_2027, SS_YEAR } from "@/data/params/social-security";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { PART_A } from "@/data/params/medicare";
import { SENIOR_DEDUCTION } from "@/data/params/tax";
import { PARAM_STATUS_SUMMARY } from "@/data/params";
import { NUMBER_GROUPS, allSources, changeOf, formatCell, maxOasdiTax, pendingItems, rowById, statusCounts } from "./numbers-data";

const R = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/research", f), "utf8"));
const research = R("ssa_annual.json");
const verify = R("verify_ssa_annual.json");
const param = (key: string) => {
  const p = research.params.find((x: { key: string }) => x.key === key);
  if (!p) throw new Error(`missing ${key}`);
  return p;
};
const rule = (name: string) => research.rules.find((r: { name: string }) => r.name === name)?.description as string;
const table = (prefix: string) => research.tables.find((t: { name: string }) => t.name.startsWith(prefix));

describe("numbers-extra params match the research files", () => {
  it("CPI-W monthly values behind the 2027 COLA", () => {
    const notes: string = param("cpiw_q3_avg_2026").notes;
    const m = /Jul\/Aug\/Sep 2026 = ([\d.]+) \/ ([\d.]+) \/ ([\d.]+); Jul\/Aug\/Sep 2025 = ([\d.]+) \/ ([\d.]+) \/ ([\d.]+)/.exec(notes);
    expect(m).not.toBeNull();
    expect([...CPIW_Q3_MONTHLY.value[2026]]).toEqual(m!.slice(1, 4).map(Number));
    expect([...CPIW_Q3_MONTHLY.value[2025]]).toEqual(m!.slice(4, 7).map(Number));
  });
  it("COLA key dates", () => {
    expect(param("ss_cola_2027").published_date).toBe(COLA_2027_DATES.value.announced);
    const update = research.upcoming_updates.find((u: { what: string }) => u.what.startsWith("First 2027-COLA payments"));
    expect(update.expected_date).toContain(COLA_2027_DATES.value.ssiFirstPaid);
    const notices = research.upcoming_updates.find((u: { what: string }) => u.what.startsWith("Individual COLA notices"));
    expect(notices.what).toContain("Nov 18, 2026");
    expect(COLA_NOTICES_2027.value.onlineEnrollBy).toBe("2026-11-18");
  });
  it("next COLA announcement", () => {
    expect(param("ss_next_cola_announcement").value).toBe(NEXT_COLA.value.announceMonth);
  });
  it("1999 COLA: the fallback matches SSA, and agrees with the generated table whenever the parser picks the year up", () => {
    // The generated table used to miss 1999 (footnoted cell); it now has it. The patch must never contradict it.
    if (COLA_BY_EFFECTIVE_YEAR[1999] !== undefined) expect(COLA_BY_EFFECTIVE_YEAR[1999]).toBe(COLA_1999.value);
    expect(table("Social Security COLA history").notes).toContain(`1999 ${COLA_1999.value}`);
  });
  it("Trustees' assumed COLA for December 2026", () => {
    expect(verify.missing_items.join(" ")).toContain(`COLA 为 ${TRUSTEES_COLA_ASSUMPTION.value.dec2026Assumed}%`);
  });
  it("SSI unrounded amounts, essential person, resource limits and student exclusion", () => {
    expect(param("ssi_fbr_individual_2027").notes).toContain("12,358.92");
    expect(param("ssi_fbr_couple_2027").notes).toContain("18,536.33");
    expect(param("ssi_fbr_individual_2026").notes).toContain("11,929.46");
    const coupleEvidence = verify.checked.find((c: { key: string }) => c.key === "ssi_fbr_couple_2027").evidence_quote as string;
    expect(coupleEvidence).toContain("17,892.21");
    expect(SSI_UNROUNDED_ANNUAL.value[2027]).toEqual({ individual: 12358.92, couple: 18536.33, essentialPerson: 6193.63 });
    expect(SSI_UNROUNDED_ANNUAL.value[2026]).toEqual({ individual: 11929.46, couple: 17892.21 });
    expect(rule("SSI federal payment amount computation")).toContain("$6,193.63");
    expect(SSI_ESSENTIAL_PERSON_2027.value).toBe(param("ssi_essential_person_2027").value);
    expect(SSI_RESOURCE_LIMITS.value).toEqual(param("ssi_resource_limit_2027").value);
    expect(SSI_RESOURCE_LIMITS.value).toEqual(param("ssi_resource_limit_2026").value);
    expect(SSI_STUDENT_EXCLUSION.value[2027]).toEqual(param("ssi_student_exclusion_2027").value);
    const row = table("Social Security 2026 vs 2027").rows.find((r: [string]) => r[0] === "SSI student exclusion monthly");
    expect(SSI_STUDENT_EXCLUSION.value[2026].monthly).toBe(row[1]);
  });
  it("payroll tax, work credits, PIA factors and earnings-test withholding", () => {
    const p = param("ss_payroll_tax_rates_2026_2027").value;
    expect(PAYROLL_TAX.value).toEqual({ oasdiEmployee: p.oasdi_employee, hiEmployee: p.hi_employee, combinedEmployee: p.combined_employee, combinedSelfEmployed: p.combined_self_employed });
    expect(rule("Quarter of coverage")).toContain(`min(${WORK_CREDITS.value.maxPerYear},`);
    expect(rule("Quarter of coverage")).toContain(`${WORK_CREDITS.value.neededForRetirement} QCs needed`);
    expect(param("ss_pia_bend_points_2027").notes).toContain(`Factors ${PIA_FACTORS.value.map((f) => `${f}%`).join(" / ")}`);
    expect(rule("Retirement earnings test")).toContain(`$1 for every $${RET_WITHHOLDING.value.beforeFraYear} `);
    expect(rule("Retirement earnings test")).toContain(`$1 for every $${RET_WITHHOLDING.value.inFraYear} `);
  });
  it("maximum benefits for January 2026 retirees (and their 2027 checks)", () => {
    const v = param("ss_max_benefit_age62_and_70_2026").value;
    expect(MAX_BENEFIT_2026.value).toEqual({
      age62: v.age62,
      age65: v.age65,
      age66: v.age66,
      age67: v.age67,
      age70: v.age70,
      in2027AfterCola: v.in_2027_after_cola,
    });
    const v27 = param("ss_max_benefit_age62_and_70_2027").value;
    for (const k of ["age62", "age65", "age66", "age67", "age70"] as const) expect(MAX_BENEFIT_2027.value[k]).toBe(v27[k]);
  });
  it("taxable share of benefits (IRC §86)", () => {
    const fed = R("federal_tax.json").params.find((x: { key: string }) => x.key === "ss_taxation_inclusion_rates").value;
    expect(SS_BENEFIT_TAXABLE_SHARE.value).toEqual({ aboveBase: Math.round(fed.tier1_rate * 100), aboveAdjusted: Math.round(fed.tier2_rate * 100) });
  });
  it("maximum OASDI tax = SSA's figure", () => {
    expect(maxOasdiTax(SS_YEAR[2027].value.taxableMax)).toBe(param("ss_max_oasdi_tax_employee_2027").value);
  });
  it("average benefits table matches SSA's fact sheets", () => {
    const t = table("Estimated average monthly benefits");
    expect(AVG_BENEFITS.value.map((r) => [r.jan2026, r.jan2027Before, r.jan2027After])).toEqual(t.rows.map((r: number[]) => [r[2], r[3], r[4]]));
  });
});

describe("2026 → 2027 table", () => {
  const rows = NUMBER_GROUPS.flatMap((g) => g.rows);

  it("every row has a unique id and a primary-source link", () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) expect(r.source.url).toMatch(/^https:\/\//);
  });
  it("a missing 2027 value is never labelled official", () => {
    for (const r of rows) if (r.y2027.t === "pending") expect(r.status).toBe("not_yet_announced");
  });
  it("headline rows show the official SSA figures", () => {
    expect(formatCell(rowById("cola").y2027).value).toBe(`${COLA[2027].value}%`);
    expect(formatCell(rowById("taxable-max").y2027)).toEqual({ value: "$192,300", per: "a year" });
    expect(formatCell(rowById("partb-premium").y2026)).toEqual({ value: "$202.90", per: "a month" });
    expect(formatCell(rowById("ss-tax-50").y2027).value).toBe("$25,000 / $32,000");
    expect(rowById("partb-premium").status).toBe("projected");
    expect(rowById("partd-cap").status).toBe("official");
  });
  it("describes changes in words", () => {
    expect(changeOf(rowById("cola").y2026, rowById("cola").y2027).text).toBe("+0.8 points");
    expect(changeOf(rowById("taxable-max").y2026, rowById("taxable-max").y2027).text).toBe("+$7,800 (+4.2%)");
    expect(changeOf(rowById("partb-premium").y2026, rowById("partb-premium").y2027).text).toBe("+$6.60 (+3.3%)");
    expect(changeOf(rowById("irmaa-first").y2026, rowById("irmaa-first").y2027).text).toBe("+$3,000 / +$6,000");
    expect(changeOf(rowById("ss-tax-85").y2026, rowById("ss-tax-85").y2027)).toEqual({ text: "No change", direction: "same" });
    expect(changeOf(rowById("std-single").y2026, rowById("std-single").y2027).direction).toBe("pending");
    const first = rowById("rmd-first");
    expect(changeOf(first.y2026, first.y2027, first.changeNote).text).toBe("Next birth year");
    expect(changeOf({ t: "usd", v: 10 }, { t: "usd", v: 8 })).toEqual({ text: "−$2 (−20.0%)", direction: "down" });
  });
  it("counts and sources", () => {
    const c = statusCounts();
    expect(c.official + c.projected + c.not_yet_announced).toBe(rows.length);
    expect(c.not_yet_announced).toBeGreaterThan(0);
    expect(allSources().length).toBe(new Set(rows.map((r) => r.source.url)).size);
    expect(() => rowById("nope")).toThrow();
  });
});

describe("review fixes", () => {
  const medicare = R("medicare.json");
  const mparam = (key: string) => medicare.params.find((x: { key: string }) => x.key === key);

  it("lifetime reserve days and SSA's “age 62” definition come from the research files", () => {
    expect(mparam("medicare_part_a_lifetime_reserve_coinsurance_2026").notes).toContain(`${PART_A_LIFETIME_RESERVE_DAYS.value} lifetime reserve days`);
    expect(param("ss_max_benefit_age62_and_70_2027").notes).toContain(`exact age ${MAX_EXAMPLE_AGE62.value.label}`);
    expect(MAX_EXAMPLE_AGE62.value.label).toBe(`${MAX_EXAMPLE_AGE62.value.years} and ${MAX_EXAMPLE_AGE62.value.months} month`);
  });
  it("the extra 'still waiting' item covers the projected Part A rows, with CMS's expected timing", () => {
    expect(PART_A[2027].status).toBe("projected");
    const u = medicare.upcoming_updates.find((x: { what: string }) => x.what.startsWith("Official 2027 Part A deductible"));
    expect(u.expected_date).toMatch(/Early-to-mid November 2026/);
    expect(PENDING_2027_EXTRA.value[0].expected).toContain("November 2026");
    expect(PENDING_2027_EXTRA.value[0].item).toContain("Part A");
  });
  it("a pair that changes on one side only shows an unsigned $0, never “−$0”", () => {
    expect(changeOf({ t: "pair", v: [2000, 3000] }, { t: "pair", v: [2000, 3500] })).toEqual({ text: "$0 / +$500", direction: "up" });
    expect(changeOf({ t: "pair", v: [2000, 3000] }, { t: "pair", v: [1900, 3000] })).toEqual({ text: "−$100 / $0", direction: "down" });
  });
  it("labels read correctly and carry no hand-typed parameter values", () => {
    expect(rowById("parta-lrd").label).toMatch(/coinsurance/i);
    expect(rowById("parta-lrd").detail).toContain(String(PART_A_LIFETIME_RESERVE_DAYS.value));
    const sen = SENIOR_DEDUCTION.value.years;
    expect(rowById("senior-deduction").label).toContain(`${sen[0]}–${sen[sen.length - 1]}`);
    expect(rowById("max-age62").detail).toContain(MAX_EXAMPLE_AGE62.value.label);
  });
  it("every displayed cell is a finite number (no NaN/undefined in the table)", () => {
    for (const g of NUMBER_GROUPS)
      for (const r of g.rows)
        for (const c of [r.y2026, r.y2027]) {
          const f = formatCell(c);
          expect(f.value).not.toMatch(/NaN|undefined|Infinity/);
          const ch = changeOf(r.y2026, r.y2027, r.changeNote);
          expect(ch.text).not.toMatch(/NaN|undefined|Infinity|−\$0(?![.,\d])/);
        }
  });
  it("“Still waiting on” lists every shared pending item once and Part A exactly once (the shared list now names Part A)", () => {
    const items = pendingItems().map((p) => p.item);
    expect(new Set(items).size).toBe(items.length);
    for (const p of PARAM_STATUS_SUMMARY.pending) expect(items).toContain(p.item);
    if (PART_A[2027].status !== "official") expect(items.filter((i) => /part a/i.test(i))).toHaveLength(1);
    for (const p of pendingItems()) expect(p.expected).toMatch(/2026/);
  });
});
