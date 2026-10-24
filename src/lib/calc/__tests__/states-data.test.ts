/**
 * Guards the state retirement-tax dataset (src/data/states) against drift from the research + verification files
 * (docs/research/states_{a,b,c,d}.json and verify_states_{a,b,c,d}.json) and against structural mistakes.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  STATES,
  STATE_CODES,
  NEIGHBORS,
  TILE_GRID,
  TILE_ROWS,
  TILE_COLS,
  SUMMARY,
  VERDICT_ORDER,
  deriveVerdict,
  stateBySlug,
  neighbors,
  type StateTax,
  type Taxed,
} from "@/data/states";
import { stateFaq, shortAnswer } from "@/components/reference/states/content";

type ResearchState = {
  code: string;
  state: string;
  has_broad_income_tax: boolean;
  taxes_social_security: string;
  brackets?: { single_over: number | null; mfj_over: number | null; rate: number }[];
};
type VerifyItem = { key: string; verdict: "confirmed" | "wrong" | "stale" | "unverifiable"; correct_value?: string };

const FILES = ["a", "b", "c", "d"] as const;
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/research", f), "utf8"));
const RESEARCH: (ResearchState & { file: (typeof FILES)[number] })[] = FILES.flatMap((f) =>
  (read(`states_${f}.json`).states as ResearchState[]).map((s) => ({ ...s, file: f })),
);
const VERIFY: VerifyItem[] = FILES.flatMap((f) => read(`verify_states_${f}.json`).checked as VerifyItem[]);
const research = (code: string) => RESEARCH.find((r) => r.code === code)!;

/** Research vocabulary → our three-way flag. */
const SS_FLAG: Record<string, Taxed> = {
  no: "no",
  yes_fully_like_federal: "yes",
  yes_with_exemptions: "partially",
  yes_partially: "partially",
};

/**
 * Official state-government web domains. Everything in the research is a primary source; a few agencies publish
 * outside .gov (Minnesota: revenue.state.mn.us; Florida: floridarevenue.com), so those are allowed explicitly.
 */
const OFFICIAL_NON_GOV = new Set(["floridarevenue.com"]);
const isGov = (url: string) => new URL(url).hostname.endsWith(".gov");
const isOfficial = (url: string) => {
  const host = new URL(url).hostname;
  return host.endsWith(".gov") || /(^|\.)state\.[a-z]{2}\.us$/.test(host) || OFFICIAL_NON_GOV.has(host);
};

describe("state dataset shape", () => {
  it("has exactly 51 entries (50 states + DC), one per code", () => {
    expect(STATES).toHaveLength(51);
    expect(new Set(STATES.map((s) => s.code))).toEqual(new Set(STATE_CODES));
    expect(RESEARCH).toHaveLength(51);
    expect(new Set(RESEARCH.map((r) => r.code))).toEqual(new Set(STATE_CODES));
  });

  it("slugs are unique, lowercase-hyphenated names, and resolve", () => {
    const slugs = STATES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(51);
    for (const s of STATES) {
      expect(s.slug).toBe(s.name.toLowerCase().replace(/\s+/g, "-"));
      expect(s.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(stateBySlug(s.slug)?.code).toBe(s.code);
    }
    expect(stateBySlug("new-york")?.code).toBe("NY");
    expect(stateBySlug("district-of-columbia")?.code).toBe("DC");
  });

  it("names match the research files", () => {
    for (const s of STATES) expect(s.name).toBe(research(s.code).state);
  });

  it("every entry has at least one .gov (official) source, and every source is an official government domain", () => {
    for (const s of STATES) {
      expect(s.sources.length, s.code).toBeGreaterThan(0);
      expect(s.sources.some((x) => isOfficial(x.url)), s.code).toBe(true);
      for (const x of s.sources) expect(isOfficial(x.url) || /\.(gov|us)$/.test(new URL(x.url).hostname), `${s.code} ${x.url}`).toBe(true);
    }
    // Only Minnesota and Florida publish without a .gov hostname.
    const noGov = STATES.filter((s) => !s.sources.some((x) => isGov(x.url))).map((s) => s.code);
    expect(noGov.sort()).toEqual(["FL", "MN"]);
  });

  it("every entry is complete and readable", () => {
    for (const s of STATES) {
      expect(s.taxYear).toBe(2026);
      expect(s.lastVerified).toBe("2026-10-23");
      expect(s.highlights.length, s.code).toBeGreaterThanOrEqual(3);
      expect(s.highlights.length, s.code).toBeLessThanOrEqual(5);
      expect(s.metaDescription.length, `${s.code}: ${s.metaDescription}`).toBeGreaterThanOrEqual(140);
      expect(s.metaDescription.length, `${s.code}: ${s.metaDescription}`).toBeLessThanOrEqual(160);
      for (const t of [s.socialSecurity.summary, s.pensions.summary, s.iraAnd401k.summary, s.military.summary, s.rates.summary, s.deductions, s.seniorBreaks, s.changes]) {
        expect(t.trim().length, s.code).toBeGreaterThan(10);
      }
      if (!s.hasBroadIncomeTax) {
        expect(s.rates.type).toBe("none");
        expect(s.rates.topRate).toBe(0);
        expect(s.noTaxNote, s.code).toBeTruthy();
      } else {
        expect(s.rates.topRate).toBeGreaterThan(0);
      }
      if (s.socialSecurity.taxed !== "no") expect(s.socialSecurity.whoPays, s.code).toBeTruthy();
    }
  });
});

describe("facts match the research and verification files", () => {
  it("Social Security 'taxed' flags match research (and no verifier overturned them)", () => {
    for (const s of STATES) {
      const r = research(s.code);
      expect(SS_FLAG[r.taxes_social_security], `unknown research flag ${r.taxes_social_security}`).toBeDefined();
      expect(s.socialSecurity.taxed, s.code).toBe(SS_FLAG[r.taxes_social_security]);
      const checks = VERIFY.filter((v) => new RegExp(`^${s.code}\\.(taxes_)?social_security(?!_)`).test(v.key));
      for (const c of checks) expect(["confirmed", "unverifiable"], `${c.key} is ${c.verdict}`).toContain(c.verdict);
    }
  });

  it("the nine states that tax Social Security in 2026", () => {
    expect(SUMMARY.taxSocialSecurity.map((s) => s.code).sort()).toEqual(["CO", "CT", "MN", "MO", "MT", "NM", "RI", "UT", "VT"]);
    expect(SUMMARY.taxSocialSecurityFully.map((s) => s.code)).toEqual(["MT"]);
  });

  it("broad income tax flags match research", () => {
    for (const s of STATES) expect(s.hasBroadIncomeTax, s.code).toBe(research(s.code).has_broad_income_tax);
    expect(SUMMARY.noBroadIncomeTax.map((s) => s.code).sort()).toEqual(["AK", "FL", "NH", "NV", "SD", "TN", "TX", "WA", "WY"]);
  });

  it("top rates match the highest research bracket", () => {
    for (const s of STATES) {
      const b = research(s.code).brackets;
      if (!b?.length) continue;
      // states_a/b store rates as decimals (0.05), states_c/d as percents (5).
      const scale = ["a", "b"].includes(research(s.code).file) ? 100 : 1;
      const top = Math.max(...b.map((x) => x.rate)) * scale;
      expect(s.rates.topRate, s.code).toBeCloseTo(top, 6);
    }
  });

  it("published brackets match research row by row", () => {
    for (const s of STATES) {
      if (!s.rates.brackets) continue;
      const r = research(s.code);
      const scale = ["a", "b"].includes(r.file) ? 100 : 1;
      expect(r.brackets, s.code).toBeDefined();
      expect(s.rates.brackets.length, s.code).toBe(r.brackets!.length);
      s.rates.brackets.forEach((b, i) => {
        const rb = r.brackets![i];
        expect(b.over, `${s.code} row ${i}`).toBe(rb.single_over);
        expect(b.overJoint, `${s.code} row ${i}`).toBe(rb.mfj_over);
        expect(b.rate, `${s.code} row ${i}`).toBeCloseTo(rb.rate * scale, 6);
      });
      // Ascending, and the last row is the top rate.
      for (let i = 1; i < s.rates.brackets.length; i++) expect(s.rates.brackets[i].overJoint).toBeGreaterThan(s.rates.brackets[i - 1].overJoint);
      expect(s.rates.brackets.at(-1)!.rate).toBe(s.rates.topRate);
    }
  });

  it("applies the verifier's corrections", () => {
    const by = (c: string) => STATES.find((s) => s.code === c)!;
    expect(by("SC").seniorBreaks).toContain("$75,000");
    expect(by("LA").iraAnd401k.detail).toContain("$12,000 since tax year 2025");
    expect(by("HI").deductions).toContain("$12,000 / $24,000 / $18,000 from 2031");
    expect(by("WI").deductions).toContain("$13,960");
    expect(by("OH").deductions).toContain("none at $500,000");
    expect(by("AZ").seniorBreaks).toContain("$3,751");
    expect(by("AR").rates.bracketsNote).toContain("$94,700");
    // Unverifiable 2026 figures are never stated as fact.
    expect(by("WA").rates.summary).toContain("2026 amount isn’t published");
    expect(by("RI").socialSecurity.detail).toContain("not yet published");
  });
});

describe("unverifiable items are never stated as fact (verify_states_*.json)", () => {
  const by = (c: string) => STATES.find((s) => s.code === c)!;
  /** Every user-visible text field of a state, joined. */
  const text = (c: string) => {
    const s = by(c);
    return [
      s.taxYearNote,
      s.socialSecurity.summary,
      s.socialSecurity.detail,
      s.socialSecurity.whoPays ?? "",
      s.pensions.summary,
      s.pensions.detail,
      s.pensions.publicVsPrivate ?? "",
      s.iraAnd401k.summary,
      s.iraAnd401k.detail,
      s.military.summary,
      s.relief.headline,
      s.rates.summary,
      s.rates.bracketsNote ?? "",
      s.deductions,
      s.seniorBreaks,
      s.changes,
      s.noTaxNote ?? "",
      s.metaDescription,
      ...s.highlights,
      ...(s.faqExtra ?? []).flatMap((f) => [f.q, f.a]),
      ...(s.notes ?? []),
    ].join(" ");
  };

  it("every state with an unverifiable verifier item explains it in 'What we couldn't confirm'", () => {
    const codes = [...new Set(VERIFY.filter((v) => v.verdict === "unverifiable").map((v) => v.key.slice(0, 2)))];
    expect(codes.length).toBeGreaterThan(10);
    for (const c of codes) expect(by(c).notes?.length ?? 0, c).toBeGreaterThan(0);
  });

  it("notes only list genuine uncertainties", () => {
    for (const s of STATES) for (const n of s.notes ?? []) expect(n, s.code).not.toMatch(/\.gov\)|isn’t \.gov/);
  });

  it("unpublished 2026 amounts are labeled with their year, not presented as 2026", () => {
    expect(text("AZ")).not.toContain("$16,100"); // ADOR has not published the indexed 2026 amount
    expect(text("WA")).toContain("$278,000 for 2025");
    expect(text("WA")).not.toMatch(/\$2[89]\d,000 for 2026/);
    expect(by("MT").relief.headline).toContain("(2025)"); // $5,660 is the TY2025 figure
    expect(by("MT").notes!.join(" ")).toContain("November 1, 2026");
    expect(text("MD")).not.toMatch(/\$3,400 (single|standard deduction)/); // withholding figure only
    expect(text("ID")).toContain("2025 maximum was $48,216");
    expect(text("RI")).toContain("2025 limits");
    expect(text("UT")).toContain("2026 amounts not located");
  });

  it("unconfirmed bill outcomes and figures are not asserted", () => {
    expect(text("AZ")).not.toMatch(/vetoed/i); // SB 1106 veto unconfirmed
    expect(text("CA")).not.toMatch(/Assembly Appropriations/i); // SB 1407 status unconfirmed (leginfo 403)
    expect(text("CT")).not.toMatch(/\btabled\b/i); // SSB 510 status unconfirmed
    expect(text("DE")).toContain("does not say which tax year"); // SB 219 domicile test start year
    expect(text("KY")).not.toContain("$42,760"); // family size credit threshold varies by family size
    expect(text("NH")).not.toMatch(/\b[345]% /); // historical I&D rates unverified
    expect(text("LA")).not.toMatch(/\$25,000 senior standard deduction applies/i);
    for (const c of ["HI", "NM"]) expect(text(c), c).toMatch(/(could not confirm|hasn’t said|has not said)/);
  });

  it("verifier-corrected wording (wrong/stale items)", () => {
    expect(text("AZ")).not.toContain("$12,500 or less"); // that test belongs to the excise credit, not Form 140PTC
    expect(text("AZ")).toContain("$5,501");
    expect(text("OH")).toContain("$750,000 for 2025");
    expect(text("SC")).toContain("June 30, 2027");
    expect(text("SC")).not.toMatch(/homestead exemption[^.]*\$50,000 of/i);
    expect(text("WI")).toContain("$25,840 joint");
    expect(text("WI")).toContain("$18,030 head of household");
    expect(text("HI")).toContain("$13,500 in 2028–29");
    expect(text("AR")).toContain("$79.90");
    expect(text("LA")).toContain("$6,000 through 2024");
  });

  it("2026 Social Security specifics for the taxing states and West Virginia", () => {
    expect(by("WV").socialSecurity.taxed).toBe("no");
    expect(text("WV")).toMatch(/Social Security is fully exempt for everyone/);
    expect(by("MN").socialSecurity.detail).toContain("$86,410");
    expect(by("MN").socialSecurity.detail).toContain("$110,780");
    expect(by("NM").socialSecurity.detail).toContain("$150,000");
    expect(by("CT").socialSecurity.summary).toContain("25%");
    expect(by("VT").socialSecurity.detail).toContain("$70,000 or less");
    expect(by("UT").socialSecurity.detail).toContain("$54,000");
    expect(by("CO").socialSecurity.exemptAt65).toBe(true);
    expect(by("MO").socialSecurity.exemptAt65).toBe(true);
    expect(by("MO").socialSecurity.summary).toContain("62 or older");
    expect(by("RI").socialSecurity.detail).toContain("full retirement age");
    expect(by("MT").socialSecurity.taxed).toBe("yes");
  });

  it("Delaware's military exclusion is age-split through 2026 (under 60 vs. the general 60+ exclusion)", () => {
    expect(by("DE").military.summary).toContain("under 60");
    expect(by("DE").military.summary).not.toMatch(/Through 2026[^.]*at any age/);
  });
});

describe("verdicts", () => {
  it("every verdict is derived by the documented rule", () => {
    for (const s of STATES) {
      expect(VERDICT_ORDER).toContain(s.verdict.label);
      expect(s.verdict).toEqual(deriveVerdict(s));
    }
  });

  it("no-income-tax states are tax-free; states taxing Social Security are never 'Very friendly'", () => {
    for (const s of STATES) {
      if (!s.hasBroadIncomeTax) expect(s.verdict.label).toBe("Tax-free retirement income");
      else expect(s.verdict.label).not.toBe("Tax-free retirement income");
      if (s.socialSecurity.taxed !== "no" && !s.socialSecurity.exemptAt65) expect(s.verdict.label).not.toBe("Very friendly");
    }
  });

  it("spot checks", () => {
    const v = (c: string) => STATES.find((s) => s.code === c)!.verdict.label;
    expect(v("IL")).toBe("Very friendly");
    expect(v("PA")).toBe("Very friendly");
    expect(v("MT")).toBe("Less friendly");
    expect(v("CA")).toBe("Less friendly");
    expect(v("NJ")).toBe("Friendly"); // big exclusion, but it ends at $150,000
  });
});

describe("neighbors and tile map", () => {
  it("neighbor map is symmetric, valid and self-free", () => {
    for (const code of STATE_CODES) {
      for (const n of NEIGHBORS[code]) {
        expect(n).not.toBe(code);
        expect(NEIGHBORS[n], `${code}→${n}`).toContain(code);
      }
    }
    expect(NEIGHBORS.AK).toEqual([]);
    expect(NEIGHBORS.HI).toEqual([]);
    expect(neighbors("TN").length).toBe(8);
    expect(neighbors("MO").length).toBe(8);
  });

  it("neighbor map follows real land borders (Four Corners and Great Lakes water borders excluded)", () => {
    // Four Corners: only a point contact.
    expect(NEIGHBORS.AZ).not.toContain("CO");
    expect(NEIGHBORS.UT).not.toContain("NM");
    // Water-only borders.
    expect(NEIGHBORS.MI).not.toContain("IL");
    expect(NEIGHBORS.MI).not.toContain("MN");
    const set = (c: (typeof STATE_CODES)[number]) => [...NEIGHBORS[c]].sort();
    expect(set("CO")).toEqual(["KS", "NE", "NM", "OK", "UT", "WY"]);
    expect(set("KY")).toEqual(["IL", "IN", "MO", "OH", "TN", "VA", "WV"]);
    expect(set("ID")).toEqual(["MT", "NV", "OR", "UT", "WA", "WY"]);
    expect(set("DC")).toEqual(["MD", "VA"]);
    expect(set("ME")).toEqual(["NH"]);
    expect(set("WV")).toEqual(["KY", "MD", "OH", "PA", "VA"]);
    // Regression guard: 105 land borders between the 48 contiguous states (no Four Corners or water-only pairs) + 2 for DC.
    const edges = STATE_CODES.reduce((n, c) => n + NEIGHBORS[c].length, 0) / 2;
    expect(edges).toBe(107);
  });

  it("tile grid places all 51 on distinct cells inside 8×12", () => {
    const cells = new Set<string>();
    for (const code of STATE_CODES) {
      const [r, c] = TILE_GRID[code];
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(TILE_ROWS);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(TILE_COLS);
      cells.add(`${r},${c}`);
    }
    expect(cells.size).toBe(51);
  });
});

describe("summary counts", () => {
  it("are computed from the data", () => {
    const count = (f: (s: StateTax) => boolean) => STATES.filter(f).length;
    expect(SUMMARY.total).toBe(51);
    expect(SUMMARY.taxSocialSecurity.length + SUMMARY.dontTaxSocialSecurity.length).toBe(51);
    expect(SUMMARY.noBroadIncomeTax.length).toBe(count((s) => !s.hasBroadIncomeTax));
    expect(Object.values(SUMMARY.byVerdict).reduce((a, l) => a + l.length, 0)).toBe(51);
    expect(SUMMARY.exemptAllRetirement.map((s) => s.code).sort()).toEqual(["IA", "IL", "MS", "PA"]);
  });
});

describe("state page content", () => {
  it("every state gets 3–5 distinct FAQs with real answers and an answer-first lead", () => {
    for (const s of STATES) {
      const faq = stateFaq(s);
      expect(faq.length, s.code).toBeGreaterThanOrEqual(3);
      expect(faq.length, s.code).toBeLessThanOrEqual(5);
      expect(new Set(faq.map((f) => f.q)).size, s.code).toBe(faq.length);
      for (const f of faq) expect(f.a.split(/\s+/).length, `${s.code}: ${f.q}`).toBeGreaterThanOrEqual(6);
      expect(shortAnswer(s).length).toBeGreaterThan(2);
    }
  });
});
