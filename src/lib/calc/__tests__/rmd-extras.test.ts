import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AgePage from "@/app/(site)/rmd/[slug]/page";
import TablePage from "@/app/(site)/rmd-table/page";
import { TOOLS } from "@/lib/tools";
import { bool, date, num } from "@/hooks/useUrlState";
import { RMD_AGE_RULES } from "@/data/params/rmd";
import {
  AGE_PAGES,
  AGE_PAGE_MAX,
  JOINT_GAP,
  REF_BALANCE,
  RULE_72_BORN,
  SPOUSE_EXAMPLE_GAP,
  aMoney,
  lookupCalcHref,
  sinceText,
  FIRST_73_BIRTH_YEAR,
  FIRST_75_BIRTH_YEAR,
  FIRST_75_FIRST_YEAR,
  GAP_YEARS,
  LAST_73_BIRTH_YEAR,
  LAST_73_FIRST_YEAR,
  OWNER_LIMIT,
  QCD_LIMIT_THIS_YEAR,
  QCD_MIN_AGE,
  RMD_AGE_LATER,
  RMD_AGE_NOW,
  THIS_YEAR,
  UNIFORM_AGES,
  ageDescription,
  ageFaq,
  ageTitle,
  bandFor,
  breakEvenGrowth,
  calcHref,
  cohortRows,
  factorAt,
  fmtPct,
  jointApplies,
  jointAt,
  parseAgeSlug,
  qcdNextSentence,
  rmdAt,
  shareAt,
  singleAt,
  startYears,
  tableAgeLabel,
} from "@/components/calculators/rmd/RmdAgeData";
import { EXCISE_TIMING, PUB590B_BENEFICIARY_EXAMPLE, PUB590B_JUSTIN_EXAMPLE, PUB590B_TABLE_II_DIFFS, RMD_SRC, RMD_TABLES_TIMELINE, STILL_WORKING_RULE } from "@/data/params/rmd-extra";
import { QCD } from "@/data/params/tax";
import { readFileSync } from "node:fs";
import { CALC_SPOUSE_BIRTH_YEARS, NEXT_YEAR } from "@/components/calculators/rmd/RmdAgeData";
import { computeRmd, firstRmdYear, moreThanTenYearsYounger, rmdApplicableAge } from "../rmd";

const words = (s: string) => s.trim().split(/\s+/).length;
const d = (year: number, month = 6, day = 15) => ({ year, month, day });

describe("age pages: routing", () => {
  it("covers ages 73–105 (33 pages)", () => {
    expect(AGE_PAGES.length).toBe(33);
    expect(AGE_PAGES[0]).toBe(73);
    expect(AGE_PAGES[AGE_PAGES.length - 1]).toBe(105);
  });
  it("parses only canonical slugs", () => {
    expect(parseAgeSlug("age-73")).toBe(73);
    expect(parseAgeSlug("age-105")).toBe(105);
    expect(parseAgeSlug("age-72")).toBeNull();
    expect(parseAgeSlug("age-106")).toBeNull();
    expect(parseAgeSlug("age-075")).toBeNull();
    expect(parseAgeSlug("75")).toBeNull();
    expect(parseAgeSlug("age-75.5")).toBeNull();
  });
});

describe("Uniform Lifetime Table math (Reg. §1.401(a)(9)-9(c), §1.401(a)(9)-5)", () => {
  it("has rows 72 … 120+ with the regulation's end points", () => {
    expect(UNIFORM_AGES[0]).toBe(72);
    expect(UNIFORM_AGES[UNIFORM_AGES.length - 1]).toBe(120);
    expect(UNIFORM_AGES.length).toBe(49);
    expect(factorAt(72)).toBe(27.4);
    expect(factorAt(120)).toBe(2.0);
    expect(factorAt(130)).toBe(2.0); // "120 and older"
    expect(tableAgeLabel(120)).toBe("120+");
  });
  it("matches the RMD engine: age 73, $500,000 → $18,867.92 (÷26.5)", () => {
    expect(rmdAt(500000, 73)).toBeCloseTo(18867.92, 2);
    const r = computeRmd({ dob: d(1953), year: 2026, priorYearEndBalance: 500000, accountType: "ira" });
    expect(r.amount).toBeCloseTo(rmdAt(500000, 73), 2);
  });
  it("prints percentages the way the pages show them", () => {
    expect(fmtPct(shareAt(73))).toBe("3.77%");
    expect(fmtPct(shareAt(80))).toBe("4.95%");
    expect(fmtPct(shareAt(100))).toBe("15.63%");
    expect(fmtPct(shareAt(120))).toBe("50%");
  });
  it("the share rises (factor falls) every year from 72 to 120", () => {
    for (let a = 73; a <= 120; a++) expect(factorAt(a)).toBeLessThan(factorAt(a - 1));
  });
  it("break-even growth keeps the balance level after the RMD", () => {
    for (const a of [73, 85, 105]) {
      const g = breakEvenGrowth(a);
      expect((1 - shareAt(a)) * (1 + g)).toBeCloseTo(1, 12);
    }
  });
  it("IRS Pub. 590-B 'Justin' example: corrected to the age-74 factor", () => {
    const j = PUB590B_JUSTIN_EXAMPLE.value;
    expect(Math.round(j.balance / factorAt(j.ageUsedInExample))).toBe(j.rmdShown); // the publication's $1,313 (÷26.5)
    expect(factorAt(j.ageReached)).toBe(25.5);
    expect(Math.round(j.balance / factorAt(j.ageReached))).toBe(1365);
  });
  it("tables timeline param matches the research file", () => {
    expect(RMD_TABLES_TIMELINE.value.tablesFirstDistributionYear).toBe(2022);
    expect(RMD_TABLES_TIMELINE.value.finalRegsFirstYear).toBe(2025);
    expect(STILL_WORKING_RULE.value.ownerShareLimit).toBe(0.05);
    expect(OWNER_LIMIT).toBe("5%");
  });
});

describe("Joint and Last Survivor Table (Reg. §1.401(a)(9)-9(d), -5(c)(2))", () => {
  it("Uniform(x) equals Joint(x, x−10) for every age 72–120 (verify_rmd.json)", () => {
    for (const a of UNIFORM_AGES) expect(jointAt(a, a - 10)).toBe(factorAt(a));
  });
  it("is used only for a gap of more than 10 years, and then gives a larger factor", () => {
    expect(jointApplies(75, 65)).toBe(false);
    expect(jointApplies(75, 64)).toBe(true);
    expect(jointAt(72, 61)).toBe(28.1);
    expect(jointAt(75, 64)).toBe(25.3); // same cell the engine test uses
    for (const a of AGE_PAGES) expect(jointAt(a, a - 15)).toBeGreaterThan(factorAt(a));
  });
  it("uses the regulation, not the four Pub. 590-B Table II misprints", () => {
    const diffs = PUB590B_TABLE_II_DIFFS.value;
    expect(diffs.length).toBe(4);
    expect(jointAt(90, 76)).toBe(14.7);
    for (const c of diffs) expect(jointAt(c.ownerAge, c.spouseAge)).not.toBe(c.pub590b);
  });
});

describe("Single Life Table for beneficiaries (Reg. §1.401(a)(9)-9(b), non-recalculating)", () => {
  it("Pub. 590-B example: age 55 in 2022 → 31.6; 2026 divisor 31.6 − 4 = 27.6", () => {
    const e = PUB590B_BENEFICIARY_EXAMPLE.value;
    expect(singleAt(e.beneficiaryAgeInFirstYear)).toBe(31.6);
    expect(Number((singleAt(e.beneficiaryAgeInFirstYear) - (e.distributionYear - e.firstYear)).toFixed(1))).toBe(27.6);
  });
});

describe("birth cohorts (Reg. §1.401(a)(9)-2(b)(2))", () => {
  it("73 is the first RMD year for 1953 (2026) and 1954 (2027)", () => {
    expect(cohortRows(2026, 73)).toEqual([{ year: 2026, birthYear: 1953, part: "", applicableAge: 73, firstYear: 2026, status: "first" }]);
    expect(cohortRows(2027, 73)[0]).toMatchObject({ birthYear: 1954, status: "first", firstYear: 2027 });
  });
  it("74 is the second (double-up) year; 75 is a later year today", () => {
    expect(cohortRows(2026, 74)[0]).toMatchObject({ birthYear: 1952, status: "second", firstYear: 2025 });
    expect(cohortRows(2027, 74)[0]).toMatchObject({ birthYear: 1953, status: "second" });
    expect(cohortRows(2026, 75)[0]).toMatchObject({ birthYear: 1951, status: "later", firstYear: 2024 });
  });
  it("75 becomes a first RMD year in 2035 for people born in 1960; nobody starts in 2033–2034", () => {
    expect(RMD_AGE_NOW).toBe(73);
    expect(RMD_AGE_LATER).toBe(75);
    expect(FIRST_73_BIRTH_YEAR).toBe(1951);
    expect(LAST_73_BIRTH_YEAR).toBe(1959);
    expect(FIRST_75_BIRTH_YEAR).toBe(1960);
    expect(LAST_73_FIRST_YEAR).toBe(2032);
    expect(FIRST_75_FIRST_YEAR).toBe(2035);
    expect(GAP_YEARS).toEqual([2033, 2034]);
    expect(cohortRows(FIRST_75_FIRST_YEAR, 75)[0]).toMatchObject({ birthYear: 1960, applicableAge: 75, status: "first" });
  });
  it("1949 splits at July 1 between 70½ and 72", () => {
    const rows = cohortRows(2026, 77);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ birthYear: 1949, part: "January–June", applicableAge: 70.5, firstYear: 2019 });
    expect(rows[1]).toMatchObject({ birthYear: 1949, part: "July–December", applicableAge: 72, firstYear: 2021 });
    expect(startYears(2026, 77)).toEqual([2019, 2021]);
  });
  it("born 1946 and earlier: 70½, first year depends on the half of the year", () => {
    expect(cohortRows(2026, 80).map((r) => r.firstYear)).toEqual([2016, 2017]);
    expect(cohortRows(2026, 105).map((r) => r.firstYear)).toEqual([1991, 1992]);
  });
  it("1950 (72-cohort) is a single row", () => {
    expect(cohortRows(2026, 76)).toEqual([{ year: 2026, birthYear: 1950, part: "", applicableAge: 72, firstYear: 2022, status: "later" }]);
  });
});

describe("page copy", () => {
  it("bands", () => {
    expect(bandFor(73)).toBe("first");
    expect(bandFor(74)).toBe("second");
    expect(bandFor(75)).toBe("seventy-five");
    expect(bandFor(79)).toBe("late-seventies");
    expect(bandFor(80)).toBe("eighties");
    expect(bandFor(95)).toBe("nineties");
    expect(bandFor(100)).toBe("hundreds");
  });
  it("titles ≤ 60 characters, descriptions 140–160 characters, for every age page", () => {
    for (const a of AGE_PAGES) {
      expect(ageTitle(a).length, ageTitle(a)).toBeLessThanOrEqual(60);
      const len = ageDescription(a).length;
      expect(len, `${a}: ${len} ${ageDescription(a)}`).toBeGreaterThanOrEqual(140);
      expect(len, `${a}: ${len}`).toBeLessThanOrEqual(160);
    }
  });
  it("every age page has 5 distinct FAQs with 40–80-word answers", () => {
    const seen = new Set<string>();
    for (const a of AGE_PAGES) {
      const faq = ageFaq(a);
      expect(faq).toHaveLength(5);
      expect(new Set(faq.map((f) => f.q)).size).toBe(5);
      for (const f of faq) {
        const n = words(f.a);
        expect(n, `${a}: ${f.q} (${n} words)`).toBeGreaterThanOrEqual(40);
        expect(n, `${a}: ${f.q} (${n} words)`).toBeLessThanOrEqual(80);
        expect(f.a).not.toMatch(/NaN|undefined|Infinity/);
        expect(seen.has(f.a)).toBe(false); // no two pages share an identical answer
        seen.add(f.a);
      }
    }
  });
  it("QCD facts come from params", () => {
    expect(QCD_MIN_AGE).toBe(70.5);
    expect(QCD_LIMIT_THIS_YEAR).toBe(111000);
    expect(ageFaq(80)[4].a).toContain("$111,000");
    expect(THIS_YEAR).toBe(2026);
  });
  it("outbound calculator links follow the URL contract", () => {
    expect(calcHref({ birthYear: 1951, bal: 500000 })).toBe("/rmd-calculator?dob=1951-6-15&bal=500000");
    expect(calcHref({ birthYear: 1951, bal: 500000, spouseBirthYear: 1966 })).toBe("/rmd-calculator?dob=1951-6-15&bal=500000&sp=1&sdob=1966-6-15");
    expect(calcHref({ birthYear: 1954, year: 2027 })).toBe("/rmd-calculator?year=2027&dob=1954-6-15");
  });
});

// ── Adversarial review (2026-10-23): rules re-derived from docs/research/rmd.json + verify_rmd.json ──────────────────

describe("applicable-age boundaries feeding the page copy (Treas. Reg. §1.401(a)(9)-2(b)(2), quoted in rmd.json)", () => {
  it("switches exactly at July 1, 1949, January 1, 1951 and January 1, 1960", () => {
    expect(rmdApplicableAge(d(1949, 6, 30))).toBe(70.5);
    expect(rmdApplicableAge(d(1949, 7, 1))).toBe(72);
    expect(rmdApplicableAge(d(1950, 12, 31))).toBe(72);
    expect(rmdApplicableAge(d(1951, 1, 1))).toBe(73);
    expect(rmdApplicableAge(d(1959, 12, 31))).toBe(73); // proposed reg; statute ambiguous (73 vs 75)
    expect(rmdApplicableAge(d(1960, 1, 1))).toBe(75);
  });
  it("the 72-cohort wording on /rmd-table comes from the cited rule label", () => {
    expect(RULE_72_BORN).toBe("born July 1, 1949 – December 31, 1950");
    expect(RMD_AGE_RULES.value.find((r) => r.age === 72)?.label).toBe("Born July 1, 1949 – December 31, 1950");
  });
  it("70½ is reached six calendar months after the 70th birthday (old Pub. 590-B: June 30 → same year, July 1 → next year)", () => {
    expect(firstRmdYear(d(1948, 6, 30))).toBe(2018);
    expect(firstRmdYear(d(1948, 7, 1))).toBe(2019);
    expect(firstRmdYear(d(1948, 1, 1))).toBe(2018);
    expect(firstRmdYear(d(1948, 12, 31))).toBe(2019);
  });
  it("nobody REACHES the RMD age in 2033–2034 (every birth date 1940–1975, month starts/ends)", () => {
    for (let y = 1940; y <= 1975; y++)
      for (let m = 1; m <= 12; m++)
        for (const day of [1, 15, 28]) expect(GAP_YEARS).not.toContain(firstRmdYear(d(y, m, day)));
  });
});

describe("joint-table test by date of birth vs. whole-year ages (Reg. §1.401(a)(9)-4(e)(6) example, -5(c)(2))", () => {
  it("reg example: owner born Oct 1, 1953 — spouse born Oct 1, 1963 is NOT more than 10 years younger; Oct 2, 1963 is", () => {
    expect(moreThanTenYearsYounger(d(1953, 10, 1), d(1963, 10, 1))).toBe(false);
    expect(moreThanTenYearsYounger(d(1953, 10, 1), d(1963, 10, 2))).toBe(true);
  });
  it("whole-year jointApplies never disagrees with the date-of-birth test in a way that changes the factor", () => {
    for (const [om, od] of [[1, 1], [6, 15], [12, 31]])
      for (const [sm, sd] of [[1, 1], [6, 15], [12, 31]])
        for (let gap = 0; gap <= 30; gap++) {
          const owner = d(1950, om, od);
          const spouse = d(1950 + gap, sm, sd);
          const year = 2026;
          const viaEngine = computeRmd({ dob: owner, year, priorYearEndBalance: REF_BALANCE, accountType: "ira", spouse: { dob: spouse, soleBeneficiary: true } }).amount;
          const o = year - owner.year;
          const s = year - spouse.year;
          const viaPage = REF_BALANCE / (jointApplies(o, s) ? jointAt(o, s) : factorAt(o));
          expect(viaEngine, `gap ${gap} ${om}/${od} vs ${sm}/${sd}`).toBeCloseTo(viaPage, 2);
        }
  });
  it("every age page's spouse example matches the engine to the cent", () => {
    for (const a of AGE_PAGES) {
      const r = computeRmd({ dob: d(THIS_YEAR - a), year: THIS_YEAR, priorYearEndBalance: REF_BALANCE, accountType: "ira", spouse: { dob: d(THIS_YEAR - a + SPOUSE_EXAMPLE_GAP), soleBeneficiary: true } });
      expect(r.lookup?.table).toBe("joint");
      expect(r.amount).toBeCloseTo(REF_BALANCE / jointAt(a, a - SPOUSE_EXAMPLE_GAP), 2);
      const u = computeRmd({ dob: d(THIS_YEAR - a), year: THIS_YEAR, priorYearEndBalance: REF_BALANCE, accountType: "ira" });
      expect(u.amount).toBeCloseTo(rmdAt(REF_BALANCE, a), 2);
    }
  });
});

describe("copy helpers", () => {
  it("article before dollar amounts follows the spoken number", () => {
    expect(aMoney(rmdAt(REF_BALANCE, 73))).toBe("an $18,868");
    expect(aMoney(rmdAt(REF_BALANCE, 101))).toBe("an $83,333");
    expect(aMoney(rmdAt(REF_BALANCE, 105))).toBe("a $108,696");
    expect(aMoney(REF_BALANCE)).toBe("a $500,000");
    expect(aMoney(800)).toBe("an $800");
    expect(aMoney(11000)).toBe("an $11,000");
    expect(aMoney(1000000)).toBe("a $1,000,000");
  });
  it("'depending on their birth date' only when the birth year really splits", () => {
    expect(sinceText([2024])).toBe("2024");
    expect(sinceText([2019, 2021])).toBe("2019 or 2021, depending on their birth date");
    for (const a of [75, 76]) expect(ageFaq(a).map((f) => f.a).join(" ")).not.toMatch(/depending on/);
    expect(ageFaq(77)[1].a).toContain("since 2019 or 2021, depending on their birth date");
  });
  it("the yearly rise in the required share is NOT larger every single year in the 80s (so the page must not say so)", () => {
    const step = (a: number) => shareAt(a) - shareAt(a - 1);
    expect(step(81)).toBeLessThan(step(80));
    expect(step(83)).toBeLessThan(step(82));
    expect(step(89)).toBeGreaterThan(2 * step(80));
  });
  it("joint-lookup calculator links follow the URL contract and stay inside the calculator's date picker", () => {
    const href = lookupCalcHref(75, 60);
    const q = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/rmd-calculator?")).toBe(true);
    expect(date.parse(q.get("dob")!)).toEqual({ year: THIS_YEAR - 75, month: 6, day: 15 });
    expect(date.parse(q.get("sdob")!)).toEqual({ year: THIS_YEAR - 60, month: 6, day: 15 });
    expect(bool.parse(q.get("sp")!)).toBe(true);
    expect(num.parse(q.get("bal")!)).toBe(REF_BALANCE);
    expect(lookupCalcHref(75, 75 - JOINT_GAP)).not.toContain("sp=");
    expect(lookupCalcHref(AGE_PAGE_MAX + 1, 60)).toBe("/rmd-calculator");
    expect(lookupCalcHref(120, 100)).toBe("/rmd-calculator");
  });
});

// ── Rendered pages (server components rendered to static HTML) ─────────────────────────────────────────────────
const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const answers = (html: string) =>
  html
    .split("<h2")
    .slice(1)
    .map((part) => /^[^>]*>([\s\S]*?)<\/h2>\s*<p class="answer">([\s\S]*?)<\/p>/.exec(part))
    .filter((m): m is RegExpExecArray => m != null)
    .map((m) => ({ q: strip(m[1]).trim(), a: strip(m[2]).trim() }));
const KNOWN_ROUTES = new Set([
  ...TOOLS.map((t) => `/${t.slug}`),
  ...AGE_PAGES.map((a) => `/rmd/age-${a}`),
  "/",
  "/blog",
  "/about",
  "/methodology",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/faq",
  "/state-retirement-taxes",
  "/irmaa-brackets-2026",
  "/irmaa-brackets-2027",
]);

describe("rendered /rmd/age-N and /rmd-table pages", async () => {
  const pages: { name: string; html: string; text: string }[] = [];
  for (const a of AGE_PAGES) {
    const html = renderToStaticMarkup(await AgePage({ params: Promise.resolve({ slug: `age-${a}` }) } as never));
    pages.push({ name: `age-${a}`, html, text: strip(html) });
  }
  const tableHtml = renderToStaticMarkup(TablePage());
  pages.push({ name: "rmd-table", html: tableHtml, text: strip(tableHtml) });
  const page = (n: string) => pages.find((p) => p.name === n)!;

  it("never prints NaN, Infinity, undefined or null", () => {
    for (const p of pages) expect(p.text, p.name).not.toMatch(/\bNaN\b|Infinity|\bundefined\b|\bnull\b/);
  });
  it("every question H2 is followed by a 40–60-word answer paragraph", () => {
    for (const p of pages) {
      const list = answers(p.html);
      expect(list.length, p.name).toBeGreaterThanOrEqual(4);
      for (const { q, a } of list) {
        const n = words(a);
        expect(n, `${p.name} — ${q}: ${n} words`).toBeGreaterThanOrEqual(40);
        expect(n, `${p.name} — ${q}: ${n} words`).toBeLessThanOrEqual(60);
      }
    }
  });
  it("internal links point to routes that exist, and in-page anchors exist on /rmd-table", () => {
    const anchors = new Set([...tableHtml.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const p of pages)
      for (const [, href] of p.html.matchAll(/href="(\/[^"]*)"/g)) {
        const [path, hash] = href.replace(/&amp;/g, "&").split("#");
        const route = path.split("?")[0];
        expect(KNOWN_ROUTES.has(route) || route === "", `${p.name}: ${href}`).toBe(true);
        if (hash && route === "/rmd-table") expect(anchors.has(hash), `${p.name}: #${hash}`).toBe(true);
      }
  });
  it("makes no claim the research contradicts", () => {
    for (const p of pages) {
      expect(p.text, p.name).not.toMatch(/Faster every year/); // yearly steps are not monotonic
      expect(p.text, p.name).not.toMatch(/Nobody has a first RMD/); // still-working exception: first year = retirement year
      expect(p.text, p.name).not.toMatch(/isn’t anyone’s first RMD year/);
      expect(p.text, p.name).not.toMatch(/rarely empty/); // the Uniform table never asks for more than 50%
      expect(p.text, p.name).not.toMatch(/\ba \$(8|1[18],)/); // "an $18,868", "an $83,333"
      expect(p.text, p.name).not.toMatch(/roll that money into an IRA first/); // the 401(k) RMD itself can't be rolled over
    }
    // Second-year balance rule is IRA-specific (Reg. §1.408-8(b)(2)); employer plans may credit an early-year payment.
    expect(page("age-74").text).toMatch(/for an IRA, your 74 RMD is figured on the full December 31 balance/);
    // 1959 cohort: 73 only under proposed regulations — disclose wherever the 1951–1959 range is stated as a rule.
    expect(page("rmd-table").text).toMatch(/For 1959 that comes from proposed IRS regulations/);
    expect(page("rmd-table").text).toContain("“Use this worksheet for 2022”");
    expect(page("rmd-table").text).toContain("72 was the RMD age for people born July 1, 1949 – December 31, 1950");
    for (const a of AGE_PAGES.filter((x) => x > 73)) expect(page(`age-${a}`).text, `age-${a}`).toContain("IRAs never get this delay");
  });
  it("explains the 1949 July 1 split (70½ vs 72) where it applies", () => {
    expect(page("age-77").text).toContain("Born in 1949? The old rules split your year at July 1: with a January–June birthday your RMD age was 70½ and your first RMD year 2019; with a July–December birthday, 72 and 2021.");
    expect(page("age-78").text).toContain("Born in 1949?"); // 2027 group; preferred over the 70½-only 1948 split
  });
  it("missed-RMD FAQ: 25% excise, 10% if corrected (Treas. Reg. §54.4974-1)", () => {
    const a = ageFaq(73).find((f) => f.q.startsWith("What happens if I miss"))!.a;
    expect(a).toContain("$4,717"); // 25% × $18,867.92
    expect(a).toContain("$1,887"); // 10% × $18,867.92
    expect(a).toContain("Form 5329");
  });
  it("shows the next year's QCD limit only when the IRS has published it", () => {
    for (const p of pages.filter((x) => x.name.startsWith("age-"))) expect(p.text).toContain(qcdNextSentence());
  });
});

// ── Review round 2 (adversarial): correction window, QCD cap, picker limits, year-of-death relief ─────────────────
describe("review fixes", () => {
  it("excise correction window: end of the 2nd year after the year the tax applies (Treas. Reg. §54.4974-1, verify_rmd.json)", () => {
    expect(EXCISE_TIMING.value.correctionWindowYearsAfter).toBe(2);
    expect(EXCISE_TIMING.source.url).toBe("https://www.ecfr.gov/current/title-26/section-54.4974-1");
    const a = ageFaq(80).find((f) => f.q.startsWith("What happens if I miss"))!.a;
    expect(a).toContain("by the end of the second year after the year it was due");
    expect(a).not.toMatch(/about two years/);
  });
  it("QCD answer never claims the limit covers an RMD larger than the limit", () => {
    const limit = QCD[THIS_YEAR as keyof typeof QCD].value.limit!;
    for (const age of [...AGE_PAGES, 110, 115, 120]) {
      const a = ageFaq(age).find((f) => f.q.startsWith("Can a charitable donation"))!.a;
      if (rmdAt(REF_BALANCE, age) > limit) expect(a, `age ${age}`).not.toContain("cover the whole RMD");
      else expect(a, `age ${age}`).toContain("cover the whole RMD");
    }
    expect(ageFaq(115).find((f) => f.q.startsWith("Can a charitable donation"))!.a).toContain("the limit covers $111,000 of the $172,414 RMD");
  });
  it("joint-lookup links never prefill a spouse birth year the calculator's picker can't show", () => {
    const young = lookupCalcHref(75, 10); // spouse born 2016 > picker max
    expect(young.startsWith("/rmd-calculator?")).toBe(true);
    expect(young).not.toContain("sdob=");
    for (let s = 0; s <= 62; s++) {
      const q = new URLSearchParams(lookupCalcHref(75, s).split("?")[1] ?? "");
      const sdob = q.get("sdob");
      if (sdob) {
        const y = date.parse(sdob)!.year;
        expect(y).toBeGreaterThanOrEqual(CALC_SPOUSE_BIRTH_YEARS.min);
        expect(y).toBeLessThanOrEqual(CALC_SPOUSE_BIRTH_YEARS.max);
      }
    }
  });
  it("the picker limits mirror RmdCalculator.tsx (owner 1920+ covers age pages; spouse range as coded there)", () => {
    const src = readFileSync("src/components/calculators/rmd/RmdCalculator.tsx", "utf8");
    expect(src).toContain(`minYear={${CALC_SPOUSE_BIRTH_YEARS.min}} maxYear={${CALC_SPOUSE_BIRTH_YEARS.max}}`);
    const ownerMin = Number(/label="Your date of birth"[^\n]*minYear=\{(\d+)\}/.exec(src)![1]);
    expect(NEXT_YEAR - AGE_PAGE_MAX).toBeGreaterThanOrEqual(ownerMin);
    expect(THIS_YEAR - AGE_PAGE_MAX).toBeGreaterThanOrEqual(ownerMin);
  });
  it("source labels don't hard-code parameter values", () => {
    for (const src of Object.values(RMD_SRC)) expect(src.label, src.label).not.toMatch(/\$\d/);
  });
});

describe("rendered review fixes", async () => {
  const strip2 = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
  const age100 = strip2(renderToStaticMarkup(await AgePage({ params: Promise.resolve({ slug: "age-100" }) } as never)));
  const table = strip2(renderToStaticMarkup(TablePage()));
  it("year-of-death RMD: automatic excise waiver if heirs take it by the end of the following year (§54.4974-1(g)(3))", () => {
    expect(age100).toContain("the IRS waives the excise tax automatically when the heirs take the missing amount by the end of the following year");
    expect(age100).toContain("Treas. Reg. §54.4974-1");
  });
  it("beneficiary section: owner's remaining life expectancy when the owner had started and was younger (rule inherited_owner_died_on_or_after_rbd)", () => {
    expect(table).toContain("the divisor is the owner’s remaining life expectancy instead");
  });
});
