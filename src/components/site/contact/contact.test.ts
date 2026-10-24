/**
 * Guards for the trust pages (about, methodology, FAQ, contact, privacy, terms, cookies):
 * - the contact form must never send something /api/contact rejects, and ?page= only accepts same-site paths;
 * - the source directory must list every Source cited anywhere in src/data/params;
 * - every cookie / storage key the code writes must appear on /cookies, with the lifetimes the code sets;
 * - operational promises (source-watch interval) must match the config that implements them;
 * - every IRMAA figure the methodology page derives (back-test, 2027 projection, missing-month scenario, Part D
 *   surcharge formula) must follow from the params exactly as the page says it does.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CONTACT_LIMITS, CONTACT_TOPICS, EMAIL_PATTERN, cleanPagePath, isContactTopic, pageFromNavigation } from "./topics";
import { ALL_SOURCES, normalizeSourceUrl, sourcesByAgency } from "./source-registry";
import { SRC } from "@/data/params/sources";
import { OWNER_COOKIE_DAYS, RETENTION, SOURCE_WATCH_HOURS, STORAGE_KEYS } from "./policy";
import { IRMAA_2026, IRMAA_2027, IRMAA_2027_ALT_BOUNDS, IRMAA_2027_INDEXING, IRMAA_PCT, PART_D } from "@/data/params/medicare";
import { CPI_WINDOW_2027, IRMAA_2027_SCENARIO_B, IRMAA_FORMULA, IRMAA_INDEXING_RULE, IRMAA_THRESHOLD_HISTORY } from "@/data/params/irmaa-extra";
import { RMD_SRC } from "@/data/params/rmd-extra";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const route = read("src/app/api/contact/route.ts");

describe("contact topics and limits mirror /api/contact", () => {
  it("topic values equal the API enum, in order", () => {
    const m = /const TOPICS = \[([^\]]+)\] as const/.exec(route);
    expect(m).not.toBeNull();
    const apiTopics = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(CONTACT_TOPICS.map((t) => t.value)).toEqual(apiTopics);
  });
  it("length limits equal the zod schema", () => {
    expect(route).toContain(`name: z.string().trim().max(${CONTACT_LIMITS.nameMax})`);
    expect(route).toContain(`email: z.string().trim().email().max(${CONTACT_LIMITS.emailMax})`);
    expect(route).toContain(`message: z.string().trim().min(${CONTACT_LIMITS.messageMin}).max(${CONTACT_LIMITS.messageMax})`);
    expect(route).toContain(`page: z.string().max(${CONTACT_LIMITS.pageMax})`);
  });
  it("isContactTopic accepts only known topics", () => {
    expect(isContactTopic("number-looks-wrong")).toBe(true);
    expect(isContactTopic("billing")).toBe(false);
    expect(isContactTopic(undefined)).toBe(false);
  });
});

describe("EMAIL_PATTERN", () => {
  it.each(["name@example.com", "first.last+tag@sub.example.org", "o'brien@example.co"])("accepts %s", (e) => expect(EMAIL_PATTERN.test(e)).toBe(true));
  it.each(["", "name", "name@", "@example.com", "name@example", "name@@example.com", "name example@x.com"])("rejects %j", (e) =>
    expect(EMAIL_PATTERN.test(e)).toBe(false),
  );
  // The form must accept exactly what the API's z.string().email() accepts: rejecting more blocks real people,
  // accepting more gets them a confusing server error after pressing Send.
  const corpus = [
    "name@example.com",
    "NAME@EXAMPLE.COM",
    "a@b.co",
    "first.last@example.com",
    "first..last@example.com",
    ".first@example.com",
    "first.@example.com",
    "user+mailbox@example.com",
    "o'brien@example.com",
    "user-name@sub-domain.example.org",
    "user@-example.com",
    "user@example-.com",
    "user@example.c",
    "user@example.museum",
    "user@123.123.123.123",
    "user@[123.123.123.123]",
    "user@localhost",
    "us er@example.com",
    "user@exa mple.com",
    "josé@example.com",
    "user@exämple.com",
    "user@example..com",
    "user@.example.com",
    "\"quoted\"@example.com",
    "user@example.com.",
  ];
  it.each(corpus)("agrees with zod's email check on %j", (e) => {
    expect(EMAIL_PATTERN.test(e)).toBe(z.string().email().safeParse(e).success);
  });
});

describe("cleanPagePath (the ?page= parameter)", () => {
  it("keeps same-site paths and drops the query string", () => {
    expect(cleanPagePath("/rmd-calculator")).toBe("/rmd-calculator");
    expect(cleanPagePath("/rmd/age-73?dob=1953-1-1&bal=500000")).toBe("/rmd/age-73");
    expect(cleanPagePath("/methodology#rounding")).toBe("/methodology");
    expect(cleanPagePath("/")).toBe("/");
  });
  it("rejects other sites, schemes, odd characters and the contact page itself", () => {
    for (const bad of [null, undefined, "", "rmd-calculator", "//evil.com", "https://evil.com/x", "/a b", "/<script>", "/contact", "/contact/x", "/\\evil.com"]) {
      expect(cleanPagePath(bad)).toBeNull();
    }
  });
  it("accepts a path of exactly the API's maximum length and rejects one character more", () => {
    expect(cleanPagePath(`/${"a".repeat(CONTACT_LIMITS.pageMax - 1)}`)).toHaveLength(CONTACT_LIMITS.pageMax);
    expect(cleanPagePath(`/${"a".repeat(CONTACT_LIMITS.pageMax)}`)).toBeNull();
  });
});

/** Every object shaped like a Source ({ label, url, publisher }) reachable from a module's exports. */
function collectSources(value: unknown, out: Map<string, string>, seen = new Set<unknown>(), depth = 0) {
  if (!value || typeof value !== "object" || seen.has(value) || depth > 8) return;
  seen.add(value);
  const o = value as Record<string, unknown>;
  if (typeof o.label === "string" && typeof o.url === "string" && /^https?:\/\//.test(o.url) && typeof o.publisher === "string") {
    out.set(normalizeSourceUrl(o.url), `${o.label} <${o.url}>`);
    return;
  }
  for (const v of Array.isArray(value) ? value : Object.values(o)) collectSources(v, out, seen, depth + 1);
}

describe("source directory (methodology page)", () => {
  it("includes every shared SRC entry exactly once and has no duplicate URLs", () => {
    const urls = ALL_SOURCES.map((s) => normalizeSourceUrl(s.url));
    expect(new Set(urls).size).toBe(urls.length);
    for (const s of Object.values(SRC)) expect(urls).toContain(normalizeSourceUrl(s.url));
  });
  it("lists every Source cited anywhere in src/data/params (a new *-extra.ts registry must be added to source-registry.ts)", async () => {
    const dir = path.join(ROOT, "src/data/params");
    const cited = new Map<string, string>();
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      collectSources(await import(path.join(dir, f)), cited);
    }
    const listed = new Set(ALL_SOURCES.map((s) => normalizeSourceUrl(s.url)));
    const missing = [...cited].filter(([k]) => !listed.has(k)).map(([, v]) => v);
    expect(missing).toEqual([]);
    expect(cited.size).toBe(listed.size);
  });
  it("puts every source in exactly one agency group", () => {
    const grouped = sourcesByAgency().reduce((n, g) => n + g.sources.length, 0);
    expect(grouped).toBe(ALL_SOURCES.length);
  });
  it("has a publication date for the QCD-limit notice shown in the update calendar", () => {
    expect(RMD_SRC.irsNotice2567.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Cookie policy: the "complete list" must stay complete.

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      out.push(...sourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("storage keys match the code that writes them (/cookies lists them all)", () => {
  const files = sourceFiles(path.join(ROOT, "src")).map((f) => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, "utf8") }));
  const listed = new Set<string>(Object.values(STORAGE_KEYS));
  // Resolve identifiers such as KEY / ADMIN_COOKIE / CONSENT_KEY to the string they hold.
  const consts = new Map<string, string>();
  for (const { text } of files) {
    for (const m of text.matchAll(/\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]+)"/g)) consts.set(m[1], m[2]);
    for (const m of text.matchAll(/\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*STORAGE_KEYS\.(\w+)/g)) {
      const v = (STORAGE_KEYS as Record<string, string>)[m[2]];
      if (v) consts.set(m[1], v);
    }
  }
  const resolve = (token: string): string | null => {
    const t = token.trim();
    const lit = /^["'`]([^"'`$]+)["'`]$/.exec(t);
    if (lit) return lit[1];
    const sk = /^STORAGE_KEYS\.(\w+)$/.exec(t);
    if (sk) return (STORAGE_KEYS as Record<string, string>)[sk[1]] ?? null;
    return consts.get(t) ?? null;
  };

  it("consent key is the one CookieNotice uses", () => {
    expect(read("src/components/site/CookieNotice.tsx")).toContain(`const KEY = "${STORAGE_KEYS.consent}"`);
  });

  it("every localStorage / sessionStorage key used in src is listed", () => {
    const problems: string[] = [];
    for (const { file, text } of files) {
      for (const m of text.matchAll(/\b(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)) {
        const key = resolve(m[1]);
        if (!key || !listed.has(key)) problems.push(`${file}: ${m[1].trim()} → ${key ?? "unresolved"}`);
      }
      if (/document\.cookie\s*=(?!=)/.test(text)) problems.push(`${file}: writes document.cookie`);
    }
    expect(problems).toEqual([]);
  });

  it("every cookie the server sets is listed", () => {
    const problems: string[] = [];
    for (const { file, text } of files) {
      const jars = [...text.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*await\s+cookies\(\)/g)].map((m) => m[1]);
      const setters = [...jars.map((j) => new RegExp(`\\b${j}\\.set\\(\\s*([^,]+),`, "g")), /\.cookies\.set\(\s*([^,]+),/g];
      for (const re of setters) {
        for (const m of text.matchAll(re)) {
          const key = resolve(m[1]);
          if (!key || !listed.has(key)) problems.push(`${file}: ${m[1].trim()} → ${key ?? "unresolved"}`);
        }
      }
      if (/["']set-cookie["']/i.test(text)) problems.push(`${file}: sets a raw Set-Cookie header`);
    }
    expect(problems).toEqual([]);
  });

  it("owner-cookie lifetimes on /cookies equal the maxAge the code sets", () => {
    const seconds = (expr: string) => expr.split("*").reduce((p, x) => p * Number(x.trim()), 1);
    const login = read("src/app/api/admin/login/route.ts");
    const fwLine = login.split("\n").find((l) => l.includes(`"${STORAGE_KEYS.fwExclude}"`) && l.includes(".set("));
    const fwAge = fwLine && /maxAge:\s*([0-9*\s]+)/.exec(fwLine);
    expect(fwAge).toBeTruthy();
    expect(seconds(fwAge![1]) / 86400).toBe(OWNER_COOKIE_DAYS.fwExclude);

    const admin = read("src/lib/server/admin.ts");
    expect(admin).toContain(`ADMIN_COOKIE = "${STORAGE_KEYS.admin}"`);
    const ttl = /TTL_SECONDS\s*=\s*([0-9*\s]+);/.exec(admin);
    expect(ttl).toBeTruthy();
    expect(seconds(ttl![1]) / 86400).toBe(OWNER_COOKIE_DAYS.admin);
    // "secure, not readable by scripts" on /cookies
    expect(login).toMatch(/set\(ADMIN_COOKIE,[^)]*httpOnly: true[^)]*secure: true/);
  });
});

describe("operational promises match the config that implements them", () => {
  it(`source watcher runs every ${SOURCE_WATCH_HOURS} hours (methodology page)`, () => {
    const vercel = JSON.parse(read("vercel.json")) as { crons?: { path: string; schedule: string }[] };
    const watch = vercel.crons?.find((c) => c.path === "/api/cron/source-watch");
    expect(watch).toBeDefined();
    expect(watch!.schedule.split(/\s+/)[1]).toBe(`*/${SOURCE_WATCH_HOURS}`);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Methodology page: every IRMAA number it shows must follow from the params the way the page says.

const roundTo = IRMAA_INDEXING_RULE.value.roundTo;
const roundBracket = (x: number) => Math.round(x / roundTo) * roundTo;
const roundDime = (x: number) => Math.round(x * 10 + 1e-9) / 10;
const idx = IRMAA_2027_INDEXING.value;

describe("methodology: IRMAA bracket indexing (42 U.S.C. 1395r(i)(5))", () => {
  it("back-test: CPI ratio × base amounts, rounded to $1,000, reproduces every published bracket 2021–2026", () => {
    const hist = IRMAA_THRESHOLD_HISTORY.value;
    expect(hist[0].year).toBe(2021);
    expect(hist[hist.length - 1].year).toBe(2026);
    for (const h of hist) {
      const factor = h.cpiAvg / idx.baseAvgSep2017Aug2018;
      expect(factor).toBeCloseTo(h.factor, 5);
      expect(idx.baseAmounts.map((b) => roundBracket(b * factor))).toEqual(h.bounds);
    }
    expect([...IRMAA_2026.individualBounds]).toEqual(hist[hist.length - 1].bounds);
  });

  it("CPI window: Sep 2025 – Aug 2026, October 2025 the only missing month", () => {
    const w = CPI_WINDOW_2027.value;
    expect(w).toHaveLength(12);
    expect(w[0].month).toBe("2025-09");
    expect(w[w.length - 1].month).toBe("2026-08");
    expect(w.filter((m) => m.value == null).map((m) => m.month)).toEqual(["2025-10"]);
  });

  it("2027 projection: 11-month average, ratio, unrounded and rounded brackets", () => {
    const vals = CPI_WINDOW_2027.value.flatMap((m) => (m.value == null ? [] : [m.value]));
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(avg).toBeCloseTo(idx.avgSep2025Aug2026_11mo, 5);
    const factor = avg / idx.baseAvgSep2017Aug2018;
    expect(factor).toBeCloseTo(idx.factor, 5);
    idx.baseAmounts.forEach((b, i) => expect(b * factor).toBeCloseTo(idx.unrounded[i], 1));
    expect(idx.unrounded.map(roundBracket)).toEqual([...IRMAA_2027.individualBounds]);
    expect(IRMAA_2027.jointBounds).toEqual(IRMAA_2027.individualBounds.map((b) => b * IRMAA_INDEXING_RULE.value.jointMultiple));
    // The page's caveat: the top tier is NOT double for joint filers.
    expect(IRMAA_2027.topJoint).not.toBe(IRMAA_2027.topIndividual * IRMAA_INDEXING_RULE.value.jointMultiple);
  });

  it("missing-month scenario: imputing October moves exactly 3 brackets down by $1,000", () => {
    const w = CPI_WINDOW_2027.value;
    const sep = w[0].value!;
    const nov = w[2].value!;
    const sc = IRMAA_2027_SCENARIO_B.value;
    expect(Math.sqrt(sep * nov)).toBeCloseTo(sc.imputedOct2025, 3);
    const twelve = w.map((m) => m.value ?? sc.imputedOct2025);
    const avg12 = twelve.reduce((a, b) => a + b, 0) / 12;
    expect(avg12).toBeCloseTo(sc.avg12mo, 4);
    const alt = idx.baseAmounts.map((b) => roundBracket((b * avg12) / idx.baseAvgSep2017Aug2018));
    expect(alt).toEqual([...IRMAA_2027_ALT_BOUNDS.individualBounds]);
    const diffs = IRMAA_2027.individualBounds.map((b, i) => b - alt[i]);
    expect(diffs.filter((d) => d !== 0)).toHaveLength(3);
    expect(Math.max(...diffs)).toBe(roundTo);
  });
});

describe("methodology: Part D IRMAA = base premium × (pct − 25.5) ÷ 25.5, nearest dime (42 CFR 423.286(d)(4))", () => {
  const base = IRMAA_FORMULA.partDBasePct.value;
  it("reproduces CMS's official 2026 Part D surcharges from the $38.99 base premium", () => {
    const b = PART_D[2026].value.baseBeneficiaryPremium;
    const got = IRMAA_PCT.map((p) => (p == null ? 0 : roundDime((b * (p - base)) / base)));
    expect(got).toEqual([...IRMAA_2026.partDAddOn]);
  });
  it("gives the 2027 Part D surcharges shown on the site from the official 2027 base premium", () => {
    const b = PART_D[2027].value.baseBeneficiaryPremium;
    const got = IRMAA_PCT.map((p) => (p == null ? 0 : roundDime((b * (p - base)) / base)));
    expect(got).toEqual([...IRMAA_2027.partDAddOn]);
    // the worked example printed on the page: first tier, unrounded to 3 decimals, then rounded
    const tier1 = (b * ((IRMAA_PCT[1] ?? 0) - base)) / base;
    expect(tier1.toFixed(3)).toBe("15.397");
    expect(roundDime(tier1)).toBe(IRMAA_2027.partDAddOn[1]);
  });
});

describe("pageFromNavigation (which page a contact message is about)", () => {
  const base = { search: "", referrer: "", origin: "https://sundialyears.com", loadedPath: "/contact", currentPath: "/contact" };
  it("explicit ?page= wins, even after client-side navigation", () => {
    expect(pageFromNavigation({ ...base, search: "?page=/rmd-calculator", loadedPath: "/faq" })).toBe("/rmd-calculator");
  });
  it("uses a same-site referrer when /contact was the document the browser loaded", () => {
    expect(pageFromNavigation({ ...base, referrer: "https://sundialyears.com/irmaa-calculator?magi=120000" })).toBe("/irmaa-calculator");
  });
  it("ignores the referrer after a client-side navigation (it describes the first page of the visit, not the last)", () => {
    expect(pageFromNavigation({ ...base, referrer: "https://sundialyears.com/blog", loadedPath: "/rmd-calculator" })).toBeNull();
    expect(pageFromNavigation({ ...base, referrer: "https://sundialyears.com/blog", loadedPath: null })).toBeNull();
  });
  it("ignores other sites, malformed referrers and an invalid ?page=", () => {
    expect(pageFromNavigation({ ...base, referrer: "https://www.google.com/" })).toBeNull();
    expect(pageFromNavigation({ ...base, referrer: "not a url" })).toBeNull();
    expect(pageFromNavigation({ ...base, search: "?page=//evil.com", referrer: "https://sundialyears.com/faq" })).toBe("/faq");
  });
});

describe("privacy promises match the code that keeps them", () => {
  it("retention periods on /privacy equal the deletes in the daily cleanup cron", () => {
    const cron = read("src/app/api/cron/cleanup/route.ts");
    const interval = (table: string) => new RegExp(`delete from ${table} where [a-z_]+ < now\\(\\) - interval '([^']+)'`).exec(cron)?.[1];
    expect(interval("contact_messages")).toBe(`${RETENTION.contactMonths} months`);
    expect(interval("feedback")).toBe(`${RETENTION.feedbackMonths} months`);
    expect(interval("errors")).toBe(`${RETENTION.errorLogDays} days`);
    expect(read("vercel.json")).toContain('"/api/cron/cleanup"');
  });
  it(`backups roll off after ${RETENTION.backupDays} days (backup workflow keeps that many dumps)`, () => {
    expect(read(".github/workflows/backup.yml")).toMatch(new RegExp(`keeps ${RETENTION.backupDays} dumps`));
  });
  it("ads honor 'Essential only' and Global Privacy Control, and get the page address without the query string", () => {
    const ad = read("src/components/tool/AdSlot.tsx");
    expect(ad).toContain(STORAGE_KEYS.consent);
    expect(ad).toContain("globalPrivacyControl");
    expect(ad).toMatch(/requestNonPersonalizedAds\s*=\s*1/);
    expect(ad).toMatch(/data-page-url=[^\n]*location\.pathname/);
  });
  it("the cookie notice announces a choice with the event the /cookies page listens for", () => {
    expect(read("src/components/site/CookieNotice.tsx")).toContain('new CustomEvent("sy-consent"');
    expect(read("src/components/site/contact/CookieChoice.tsx")).toContain('addEventListener("sy-consent"');
  });
});
