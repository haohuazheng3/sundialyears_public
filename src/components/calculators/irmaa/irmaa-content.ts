/**
 * Derived figures and labels shared by the IRMAA calculator and the /irmaa-brackets-2026 and /irmaa-brackets-2027 pages.
 *
 * Every dollar amount comes from the cited schedules in src/data/params/medicare (IRMAA_SCHEDULES) and
 * src/data/params/irmaa-extra, run through the tested engine in src/lib/calc/irmaa. Pure and deterministic (no clock
 * reads), so it is safe to import from server components.
 */
import { IRMAA_2026, IRMAA_2027, IRMAA_2027_ALT_BOUNDS, IRMAA_PCT, type FilingGroup, type IrmaaSchedule } from "@/data/params/medicare";
import { CMS_RELEASE_DATES, CPI_WINDOW_2027, IRMAA_2027_RELEASE_EXPECTED } from "@/data/params/irmaa-extra";
import { computeIrmaa, type IrmaaFiling, type Tier } from "@/lib/calc/irmaa";
import { MONTHS, longDate } from "@/lib/format";
import { SITE } from "@/lib/site";

export const S26 = IRMAA_2026;
export const S27 = IRMAA_2027;

const cents = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** Monthly IRMAA for one person in one tier (Part B add-on + Part D add-on). */
export const monthlyPerPerson = (s: IrmaaSchedule, tier: Tier) => cents(s.partBAddOn[tier] + s.partDAddOn[tier]);
/** Yearly IRMAA for one person in one tier. */
export const yearlyPerPerson = (s: IrmaaSchedule, tier: Tier) => cents(monthlyPerPerson(s, tier) * 12);
/** Part B premium (standard + add-on) for one person in one tier. */
export const partBTotal = (s: IrmaaSchedule, tier: Tier) => cents(s.standardPartB + s.partBAddOn[tier]);

export const TIERS: Tier[] = [0, 1, 2, 3, 4, 5];
export const pctLabel = (tier: Tier) => (IRMAA_PCT[tier] == null ? "Standard premium" : `${IRMAA_PCT[tier]}% bracket`);

/** The "$1 over the line" example for a premium year and filing status. */
export function oneDollarOver(year: number, filingStatus: IrmaaFiling, people: 1 | 2 = 1) {
  const below = computeIrmaa({ year, filingStatus, magi: 0, people });
  const line = below.next!.startsAt - 1;
  const over = computeIrmaa({ year, filingStatus, magi: line + 1, people });
  return { line, over: line + 1, yearly: over.annual.surcharge, monthlyEach: over.monthly.surcharge };
}

/** The first IRMAA line (highest MAGI that still pays the standard premium) for a schedule and filing group. */
export const firstLine = (s: IrmaaSchedule, group: FilingGroup) =>
  group === "joint" ? s.jointBounds[0] : group === "mfsLivedWithSpouse" ? s.mfsThreshold : s.individualBounds[0];

/** Labels for the filing statuses the calculator accepts. */
export const FILING_OPTIONS: { value: IrmaaFiling; label: string }[] = [
  { value: "single", label: "Single, head of household or surviving spouse" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "mfs", label: "Married filing separately, lived together" },
  { value: "mfsApart", label: "Married filing separately, lived apart all year" },
];

/** "on a joint return" etc. */
export const RETURN_WORD: Record<IrmaaFiling, string> = { single: "single", mfj: "joint", mfs: "separate", mfsApart: "separate" };

/**
 * Form SSA-44 events that change your filing status, and the status the newer return usually has: a joint return
 * after a marriage, a single one after a divorce or a spouse's death (null = the status doesn't change).
 * Matched on the event wording in LIFE_CHANGING_EVENTS (src/data/params/medicare.ts).
 */
export function filingAfterEvent(eventLabel: string | undefined): IrmaaFiling | null {
  if (!eventLabel) return null;
  if (/^marriage\b/i.test(eventLabel)) return "mfj";
  if (/^(divorce|death of your spouse)\b/i.test(eventLabel)) return "single";
  return null;
}

/**
 * Link to the RMD calculator. Its `year` param only accepts this year and next (2026 | 2027, per the
 * cross-calculator URL contract), so a past tax year such as 2025 is left off rather than sent.
 */
export const RMD_CALC_YEARS = [SITE.copyrightYear, SITE.copyrightYear + 1];
export const rmdCalculatorHref = (year?: number) => (year != null && RMD_CALC_YEARS.includes(year) ? `/rmd-calculator?year=${year}` : "/rmd-calculator");

export const GROUP_LABEL: Record<FilingGroup, string> = {
  individual: "Individual table (single, head of household, surviving spouse, or married filing separately and living apart all year)",
  joint: "Joint table (married filing jointly)",
  mfsLivedWithSpouse: "Married filing separately and lived with your spouse at any time that year",
};

/** Tiers whose lines would move if CMS imputes the missing October 2025 CPI-U (2027 only). */
export const ALT_2027 = IRMAA_2027_ALT_BOUNDS;
/** Largest gap between our projected 2027 lines and the alternative ones (individual / joint). */
export const ALT_GAP_2027 = {
  individual: Math.max(...S27.individualBounds.map((b, k) => Math.abs(b - ALT_2027.individualBounds[k]))),
  joint: Math.max(...S27.jointBounds.map((b, k) => Math.abs(b - ALT_2027.jointBounds[k]))),
};

/** "2025-10" → "October 2025" (no Date object needed). */
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** The CPI-U month BLS never published (it sits inside the window that sets the 2027 lines). */
export const MISSING_CPI_MONTH = monthLabel(CPI_WINDOW_2027.value.find((m) => m.value == null)?.month ?? CPI_WINDOW_2027.value[1].month);
/** How many months of the window BLS did publish (11). */
export const PUBLISHED_CPI_MONTHS = CPI_WINDOW_2027.value.filter((m) => m.value != null).length;
export const CPI_WINDOW_LABEL = {
  from: monthLabel(CPI_WINDOW_2027.value[0].month),
  to: monthLabel(CPI_WINDOW_2027.value[CPI_WINDOW_2027.value.length - 1].month),
};

/** When CMS published last year's table, and the plain-English expectation for 2027. */
export const LAST_CMS_RELEASE = longDate(CMS_RELEASE_DATES.value[S26.premiumYear]);
export const CMS_2027_EXPECTED = IRMAA_2027_RELEASE_EXPECTED.value;

// ── Small prose helpers ───────────────────────────────────────────────────────────────────────────────────────
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** 8 → "eight" (numbers above ten stay as digits). */
export const inWords = (n: number) => NUMBER_WORDS[n] ?? String(n);
/** ["a", "b", "c"] → "a, b and c" */
export const listAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
/** 70.5 → "70½" */
export const ageLabel = (a: number) => (Number.isInteger(a) ? String(a) : `${Math.floor(a)}½`);
