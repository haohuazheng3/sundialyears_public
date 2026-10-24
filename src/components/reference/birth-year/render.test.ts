/**
 * Renders the three birth-year routes (all 33 year pages) to static HTML and checks the copy: no undefined/NaN leaks,
 * and regression checks for facts the adversarial review corrected.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FraPage from "@/app/(site)/full-retirement-age/page";
import HubPage from "@/app/(site)/social-security-by-birth-year/page";
import YearPage, { generateStaticParams } from "@/app/(site)/social-security-by-birth-year/[year]/page";
import { BIRTH_YEARS } from "./timeline";

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

type YearPageFn = (p: { params: Promise<{ year: string }> }) => Promise<unknown>;
const renderYear = async (y: number | string) => text(renderToStaticMarkup((await (YearPage as unknown as YearPageFn)({ params: Promise.resolve({ year: String(y) }) })) as never));

const LEAKS = /undefined|NaN|Infinity|\[object /;

describe("rendered birth-year pages", () => {
  it("generateStaticParams lists every year page", () => {
    expect(generateStaticParams().map((p) => Number(p.year))).toEqual(BIRTH_YEARS);
  });

  it("/full-retirement-age: default finder result and rule text from params", () => {
    const t = text(renderToStaticMarkup(createElement(FraPage as never)));
    expect(t).not.toMatch(LEAKS);
    expect(t).toContain("June 2027"); // default June 15, 1960 → FRA 67
    expect(t).toContain("5/9 of 1% a month for the first 36 months and 5/12 of 1% after that");
    expect(t).toContain("$24,480 in 2026");
  });

  it("/social-security-by-birth-year: 1949 RMD split shows both ages", () => {
    const t = text(renderToStaticMarkup(createElement(HubPage as never)));
    expect(t).not.toMatch(LEAKS);
    expect(t).toContain("70½ if born before July 1, 1949, 72 if born on or after it");
  });

  it("every year page renders without leaks or retired wording", async () => {
    for (const y of BIRTH_YEARS) {
      const t = await renderYear(y);
      expect(t, String(y)).not.toMatch(LEAKS);
      expect(t, String(y)).not.toMatch(/0% COLA/);
      expect(t, String(y)).not.toContain("born on the 1st or 2nd can do");
      expect(t, String(y)).not.toContain("as little as");
    }
  });

  it("COLA counts skip the years with no COLA; January 1 note handles a 0% December", async () => {
    const t1948 = await renderYear(1948);
    expect(t1948).toContain("from 15 cost-of-living adjustments");
    expect(t1948).toContain("but there was no COLA that December");
    expect(await renderYear(1962)).toContain("the 3.2% COLA effective that December counts for you too");
  });

  it("people already past 62 see the benefit for the age they reach this year", async () => {
    const t = await renderYear(1962);
    expect(t).toContain("starting at 64 pays 80% of your full benefit");
    expect(t).toContain("starting at 64 pays only 80%");
  });

  it("RMD tense follows the first RMD year (1955 turned 70 in 2025 but its first RMD is for 2028)", async () => {
    expect(await renderYear(1955)).toContain("required minimum distributions (at 73, first for 2028)");
    expect(await renderYear(1950)).toContain("required minimum distributions (your RMD age was 72)");
  });

  it("past-70 to-do list follows the RMD start (1955: none yet; 1953: first this year; 1945: yearly)", async () => {
    expect(await renderYear(1955)).toContain("No RMD is due for 2026: your first is for 2028, due by April 1, 2029");
    expect(await renderYear(1954)).toContain("No RMD is due for 2026: your first is for 2027, due by April 1, 2028");
    expect(await renderYear(1953)).toContain("Your first RMD is for 2026: take it by December 31, or by April 1, 2027 at the latest");
    const t1945 = await renderYear(1945);
    expect(t1945).toContain("Check that your RMD for 2026 is out by December 31");
    for (const y of [1953, 1954, 1955]) expect(await renderYear(y), String(y)).not.toContain("Check that your RMD for 2026");
  });

  it("turning 62 this year: a December birthday (3rd or later) cannot start until January of next year", async () => {
    const t = await renderYear(1964);
    expect(t).toContain("most of you can start Social Security in 2026");
    expect(t).toContain("(born in December after the 2nd? Your first possible month is January 2027)");
    const t1963 = await renderYear(1963);
    expect(t1963).not.toContain("most of you");
    expect(t1963).not.toContain("Your first possible month is");
  });

  it("taxable-SS link only prefills age65=1 for people who are 65 by the planning year", async () => {
    const html = async (y: number) => renderToStaticMarkup((await (YearPage as unknown as YearPageFn)({ params: Promise.resolve({ year: String(y) }) })) as never);
    expect(await html(1961)).toContain('href="/taxable-social-security-calculator?age65=1"');
    const h1962 = await html(1962);
    expect(h1962).toContain('href="/taxable-social-security-calculator"');
    expect(h1962).not.toContain("taxable-social-security-calculator?age65=1");
  });

  it("unknown years are not found", async () => {
    await expect(renderYear(1942)).rejects.toThrow();
    await expect(renderYear("19x0")).rejects.toThrow();
  });
});
