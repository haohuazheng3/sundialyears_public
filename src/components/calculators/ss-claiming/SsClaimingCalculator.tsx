"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { LineChart, BarChart, type Series } from "@/components/tool/Charts";
import { StatusChip } from "@/components/tool/StatusChip";
import { NumberField, Segmented, BirthDateField, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, str, bool, date } from "@/hooks/useUrlState";
import { money, money2, longDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { SRC } from "@/data/params/sources";
import { CLAIMING_RULES, COLA, SS_YEAR, TR_ECON, TRUST_FUNDS } from "@/data/params/social-security";
import {
  BENEFIT_TAX_MAX_SHARE,
  CLAIM_SRC,
  ELIGIBILITY_AGE,
  HEALTH_OUTLOOK,
  PIA_FORMULA,
  REDUCTION_TIER_MONTHS,
  RETROACTIVE_MONTHS,
  RET_WITHHOLDING,
  type HealthOutlook,
} from "@/data/params/ss-claiming-extra";
import { age70Month, claimFactor, drcPerMonth, fra, fraMonth, cohortYear } from "@/lib/calc/ss-core";
import { daysInMonth, fromMonthIndex, type YMD } from "@/lib/calc/dates";
import {
  ageLabel,
  ageMonthsIn,
  ageShort,
  asOfMonth,
  bestOf,
  breakEven,
  claimMonthForAge,
  claimTable,
  cumulativeByAge,
  exactAge,
  expectedByClaimMonth,
  factorInMonth,
  firstAvailableMonth,
  lifeExpectancy,
  payment,
  piaAt,
  probAliveAtAgeMonths,
  survivalModel,
  DEPLETION_MONTH,
  type BreakEven,
  type ExpectedSettings,
  type Person,
  type Settings,
  type Sex,
} from "@/lib/calc/ss-claiming";
import { FIRST_BEND_YEAR, estimatePiaFromSalary } from "@/lib/calc/ss-pia";
import { useLifeTable } from "./useLifeTable";
import { MarriedResults, steadyAmounts, useHouseholdGrid, type HouseholdInput } from "./MarriedResults";
import { dobParam, fractionOfOnePercent, monthName, oddsText, optionLabel, pctOfPia } from "./labels";

const HEALTH_KEYS = ["shorter", "average", "longer"] as const;
const SEXES = ["m", "f"] as const;
/** When the best and the earliest start differ by less than this share, we call it a close call. */
const CLOSE_CALL_SHARE = 0.02;

const DEFAULTS = {
  dob: { year: 1965, month: 6, day: 15 },
  pia: 2000,
  est: false,
  sal: 65000,
  stop: 67,
  sex: "m" as Sex,
  health: "average" as HealthOutlook,
  work: false,
  married: false,
  sdob: { year: 1966, month: 9, day: 20 },
  spia: 900,
  ssex: "f" as Sex,
  shealth: "average" as HealthOutlook,
  /** Spouse's start age in months; 0 = their full retirement age. */
  sca: 0,
  /** Show totals in future dollars (with COLAs). */
  fut: false,
  cola: TR_ECON.value.colaAssumptionAfter2027,
  disc: 0,
  cut: false,
  /** Ages (months) compared in the chart; 0 = full retirement age. */
  c1: 62 * 12,
  c2: 0,
  c3: 70 * 12,
  /** "Your plan" start age in months; 0 = full retirement age. */
  cm: 0,
};

const SCHEMA = {
  dob: date,
  pia: num,
  est: bool,
  sal: num,
  stop: num,
  sex: str(SEXES),
  health: str(HEALTH_KEYS),
  work: bool,
  married: bool,
  sdob: date,
  spia: num,
  ssex: str(SEXES),
  shealth: str(HEALTH_KEYS),
  sca: num,
  fut: bool,
  cola: num,
  disc: num,
  cut: bool,
  c1: num,
  c2: num,
  c3: num,
  cm: num,
};

const SERIES_COLORS = ["var(--ember)", "var(--sky)", "var(--sage)"];
const HEALTH_WORD: Record<HealthOutlook, string> = { shorter: "poorer-than-average", average: "average", longer: "better-than-average" };
const unique = (xs: number[]) => xs.filter((x, i) => xs.indexOf(x) === i);
/** Years with published earnings-test limits (SS_YEAR keys), ascending. */
const RET_YEARS = Object.keys(SS_YEAR)
  .map(Number)
  .sort((a, b) => a - b);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** A shared link can carry an impossible date (e.g. 1960-2-31): keep the day inside the month. */
const normDate = (year: number, month: number, day: number): YMD => ({ year, month, day: Math.min(day, daysInMonth(year, month)) });
/** Map any stored start age (months; 0 = full retirement age) onto the whole-year / FRA choices the selects offer. */
const normAge = (v: number, fraTotal: number) => (v === 0 || v === fraTotal ? 0 : clamp(Math.round(v / 12), 62, 70) * 12);
/** "Pays 25/36 of 1%… for 36 months" — the first-tier length of the early-claiming reduction. */
const TIER = REDUCTION_TIER_MONTHS.value;
/** The COLA paid from January 2027 took effect for December 2026. */
const COLA_PAY_YEAR = 2027 as const;
const COLA_DEC_YEAR = COLA_PAY_YEAR - 1;
/** First birth year the pay-based estimate covers (params hold bend points from FIRST_BEND_YEAR = the year you reach 62). */
const FIRST_ESTIMATE_BIRTH_YEAR = FIRST_BEND_YEAR - ELIGIBILITY_AGE.value;

/** Whole ages 62–70 plus full retirement age when it isn't a whole year (value 0 = "full retirement age"). */
function ageOptions(fraTotal: number, pastBefore: (ageMonths: number) => string) {
  const opts: { value: number; label: string }[] = [];
  for (let y = 62; y <= 70; y++) {
    if (fraTotal > (y - 1) * 12 && fraTotal < y * 12) opts.push({ value: 0, label: `${optionLabel(fraTotal, fraTotal)}${pastBefore(fraTotal)}` });
    opts.push({ value: y * 12, label: `${optionLabel(y * 12, fraTotal)}${pastBefore(y * 12)}` });
  }
  return opts;
}
/** Normalize a stored age (0 = FRA) to the option value the select shows. */
const optionValue = (v: number, fraTotal: number) => (v === 0 && fraTotal % 12 === 0 ? fraTotal : v === fraTotal && fraTotal % 12 !== 0 ? 0 : v);

function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton inline-block align-middle ${className}`} />;
}

export function SsClaimingCalculator() {
  const { state: s, set } = useUrlState(DEFAULTS, SCHEMA);
  const { table, error, asOf, retry } = useLifeTable();
  const sliderId = useId();

  // Stable primitives (URL state re-parses objects on every render).
  const { year: dy, month: dm, day: dd } = s.dob;
  const dob = useMemo<YMD>(() => normDate(dy, dm, dd), [dy, dm, dd]);
  const { year: sy, month: sm, day: sd } = s.sdob;
  const sdob = useMemo<YMD>(() => normDate(sy, sm, sd), [sy, sm, sd]);
  const colaPct = clamp(s.cola || 0, 0, 10);

  // ── Your benefit at full retirement age ─────────────────────────────────────────────────────────────────────
  const estimate = useMemo(() => (s.est ? estimatePiaFromSalary({ dob, salary: s.sal, stopAge: clamp(s.stop || 0, 23, 80), asOf }) : null), [s.est, dob, s.sal, s.stop, asOf]);
  const pia = s.est ? (estimate?.piaToday ?? 0) : Math.max(0, s.pia || 0);
  const you = useMemo<Person>(() => ({ dob, pia, sex: s.sex, health: s.health }), [dob, pia, s.sex, s.health]);
  const settings = useMemo<Settings>(() => ({ asOf, growth: s.fut ? "cola" : "none", colaPct, cut: s.cut }), [asOf, s.fut, colaPct, s.cut]);
  const futureSettings = useMemo<Settings>(() => ({ ...settings, growth: "cola" }), [settings]);
  const exp = useMemo<ExpectedSettings>(() => ({ asOf, cut: s.cut, realDiscountPct: clamp(s.disc || 0, 0, 10) }), [asOf, s.cut, s.disc]);

  const youFra = fra(dob);
  const now = asOfMonth(asOf);
  const avail = firstAvailableMonth(dob, asOf);
  const m70 = age70Month(dob);
  const lastChoice = Math.max(avail, m70);
  /** Every delayed credit is already earned (70 this coming month, or older): the only choice left is "now". */
  const past70 = avail >= m70;
  const ageNowMonths = ageMonthsIn(dob, now);
  const startMonthFor = (ageMonths: number) => clamp(claimMonthForAge(dob, ageMonths === 0 ? youFra.total : Math.round(ageMonths)), avail, lastChoice);
  const startAge = (m: number) => ageMonthsIn(dob, claimFactor(dob, m).claimMonth);

  const rows = useMemo(() => claimTable(you, settings), [you, settings]);
  const planMonthMemo = useMemo(() => {
    const first = firstAvailableMonth(dob, asOf);
    return clamp(claimMonthForAge(dob, s.cm === 0 ? fra(dob).total : Math.round(s.cm)), first, Math.max(first, age70Month(dob)));
  }, [dob, asOf, s.cm]);
  const planMonth = planMonthMemo;
  const planFactor = claimFactor(dob, planMonth).factor;
  const planMonthly = payment(pia, planFactor);
  const planFirst = payment(piaAt(pia, futureSettings, planMonth), factorInMonth(dob, planMonth, planMonth));

  // ── Compare three start ages ────────────────────────────────────────────────────────────────────────────────
  const compare = useMemo(() => unique([s.c1, s.c2, s.c3].map((v) => startMonthFor(normAge(v, youFra.total)))).sort((a, b) => a - b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.c1, s.c2, s.c3, dob, avail, lastChoice, youFra.total]);
  const chartFrom = Math.max(62, Math.floor(ageNowMonths / 12));
  const chartTo = 95;
  const series: Series[] = useMemo(
    () =>
      compare.map((m, i) => ({
        name: `Start at ${ageLabel(startAge(m))}`,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        dashed: i === 1,
        points: cumulativeByAge(you, m, settings, chartFrom, chartTo),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compare, you, settings, chartFrom],
  );
  const pairs = useMemo(() => {
    const out: { a: number; b: number; be: BreakEven | null }[] = [];
    for (let i = 0; i < compare.length; i++) for (let j = i + 1; j < compare.length; j++) out.push({ a: compare[i], b: compare[j], be: breakEven(you, compare[i], compare[j], settings) });
    return out;
  }, [compare, you, settings]);
  const outer = pairs.find((p) => p.a === compare[0] && p.b === compare[compare.length - 1]);

  // ── Survival-based results (need the life table) ────────────────────────────────────────────────────────────
  const youModel = useMemo(() => (table ? survivalModel(table, s.sex, dob.year, s.health) : null), [table, s.sex, dob.year, s.health]);
  const curve = useMemo(() => (youModel && pia > 0 ? expectedByClaimMonth(you, exp, youModel) : null), [youModel, you, exp, pia]);
  const best = curve ? bestOf(curve) : null;
  const evAt = (m: number) => curve?.find((p) => p.claimMonth === m)?.value ?? null;
  const ageNowExact = exactAge(dob, asOf);
  const lifeExp = youModel ? ageNowExact + lifeExpectancy(youModel, ageNowExact) : null;
  const odds = (be: BreakEven | null) => (youModel && be ? probAliveAtAgeMonths(youModel, dob, asOf, be.ageMonths) : null);
  const mainBe = useMemo(() => {
    const first = firstAvailableMonth(you.dob, asOf);
    const lastM = Math.max(first, age70Month(you.dob));
    return first < lastM ? breakEven(you, first, lastM, settings) : null;
  }, [you, asOf, settings]);
  const mainOdds = odds(mainBe);

  // ── Married ─────────────────────────────────────────────────────────────────────────────────────────────────
  const spouse = useMemo<Person>(() => ({ dob: sdob, pia: Math.max(0, s.spia || 0), sex: s.ssex, health: s.shealth }), [sdob, s.spia, s.ssex, s.shealth]);
  // Spouse's start (computed in one memo so the household inputs below keep a stable identity).
  const sp = useMemo(() => {
    const spFra = fra(sdob);
    const first = firstAvailableMonth(sdob, asOf);
    const sca = normAge(s.sca, spFra.total);
    const choice = claimMonthForAge(sdob, sca === 0 ? spFra.total : sca);
    const already = choice < first;
    return { fra: spFra, avail: first, already, plan: already ? choice : clamp(choice, first, Math.max(first, age70Month(sdob))), options: already ? [choice] : startOptions(sdob, asOf) };
  }, [sdob, asOf, s.sca]);
  const spFra = sp.fra;
  const spAvail = sp.avail;
  const spouseAlready = sp.already;
  const spousePlan = sp.plan;
  const youOptions = useMemo(() => startOptions(dob, asOf), [dob, asOf]);
  const householdBase = useMemo(
    () => ({ you, spouse, youOptions, spouseOptions: sp.options, youPlan: planMonthMemo, spousePlan: sp.plan, exp }),
    [you, spouse, youOptions, sp, planMonthMemo, exp],
  );
  const householdInput = useMemo<HouseholdInput | null>(() => (s.married && table ? { ...householdBase, table } : null), [s.married, table, householdBase]);
  const { grid, stale } = useHouseholdGrid(householdInput);

  // ── Analytics: one event per settled result (bucketed, no personal data) ───────────────────────────────────
  const last = useRef("");
  const bestAgeYears = best ? Math.round((best.ageMonths / 12) * 2) / 2 : null;
  const beYears = mainBe ? Math.round((mainBe.ageMonths / 12) * 2) / 2 : null;
  const gridBest = s.married && grid ? `${Math.round(ageMonthsIn(dob, grid.best.you) / 12)}-${Math.round(ageMonthsIn(sdob, grid.best.spouse) / 12)}` : null;
  useEffect(() => {
    if (bestAgeYears == null) return;
    const key = `${bestAgeYears}|${beYears}|${s.married}|${gridBest}|${s.health}|${s.sex}|${s.cut}|${s.fut}|${s.est}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_ss_claiming_result", {
        best_age: bestAgeYears,
        break_even: beYears,
        married: s.married,
        couple_best: gridBest,
        health: s.health,
        sex: s.sex,
        cut: s.cut,
        future_dollars: s.fut,
        estimated: s.est,
        pia_bucket: Math.round(pia / 250) * 250,
        age_now: Math.floor(ageNowMonths / 12),
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [bestAgeYears, beYears, s.married, gridBest, s.health, s.sex, s.cut, s.fut, s.est, pia, ageNowMonths]);

  // ── Inputs ──────────────────────────────────────────────────────────────────────────────────────────────────
  const spPast = (a: number) => (claimMonthForAge(sdob, a) < spAvail ? " — already started" : "");
  const youPast = (a: number) => (claimMonthForAge(dob, a) < avail ? " — now" : "");
  const retYear = clamp(fromMonthIndex(planMonth).year, RET_YEARS[0], RET_YEARS[RET_YEARS.length - 1]) as keyof typeof SS_YEAR;
  const ret = SS_YEAR[retYear].value;

  const inputs = (
    <>
      <BirthDateField label="Your date of birth" value={dob} onChange={(v) => set("dob", v)} minYear={1940} maxYear={1980} hint={`Full retirement age for you: ${youFra.label} (${monthName(fraMonth(dob))}).`} />
      <Segmented
        label="Your monthly benefit at full retirement age"
        value={s.est ? "est" : "stmt"}
        onChange={(v) => set("est", v === "est")}
        options={[
          { value: "stmt", label: "I have my statement" },
          { value: "est", label: "Estimate from my pay" },
        ]}
        size="lg"
      />
      {s.est ? (
        <>
          <NumberField
            label="Your yearly pay"
            prefix="$"
            value={s.sal}
            onChange={(v) => set("sal", v ?? 0)}
            min={0}
            max={10000000}
            hint="What you earn now — or earned in your last full year of work, if you’ve stopped. Before taxes."
          />
          <NumberField label="Age you stopped (or will stop) working" suffix="yrs" value={s.stop} onChange={(v) => set("stop", v ?? 0)} min={23} max={80} />
          <div className="sunk p-4" aria-live="polite">
            <p className="text-[0.9375rem] font-semibold text-ink-3">Estimated benefit at full retirement age</p>
            <p className="num mt-1 text-[1.6rem] font-bold text-ink">{estimate ? money(estimate.piaToday) : "—"}</p>
            <p className="mt-1 text-[0.9375rem] leading-snug text-ink-3">
              {estimate
                ? `A rough estimate: it assumes your pay kept pace with average U.S. wages since age 22. Your real record at ssa.gov/myaccount is better.`
                : `The pay-based estimate works for people born in ${FIRST_ESTIMATE_BIRTH_YEAR} or later.`}
            </p>
          </div>
        </>
      ) : (
        <NumberField
          label="Monthly benefit at full retirement age"
          prefix="$"
          value={s.pia}
          onChange={(v) => set("pia", v ?? 0)}
          min={0}
          max={10000}
          hint={
            <>
              On your Social Security Statement (sign in at <a className="link" href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener">ssa.gov/myaccount</a>), use the amount
              shown “at full retirement age.” Officially it’s your primary insurance amount (PIA).
            </>
          }
        />
      )}
      <Segmented
        label="Sex (used only for life expectancy)"
        value={s.sex}
        onChange={(v) => set("sex", v)}
        options={[
          { value: "m", label: "Man" },
          { value: "f", label: "Woman" },
        ]}
        size="lg"
      />
      <Segmented
        label="Your health outlook"
        value={s.health}
        onChange={(v) => set("health", v)}
        options={HEALTH_KEYS.map((k) => ({ value: k, label: k === "average" ? "Average" : k === "shorter" ? "Shorter" : "Longer" }))}
        size="lg"
        hint={`${HEALTH_OUTLOOK[s.health].label}: ${HEALTH_OUTLOOK[s.health].hint}.`}
      />
      <Toggle label="I’m still working" checked={s.work} onChange={(v) => set("work", v)} hint="Before full retirement age, a paycheck can hold back some benefits (the earnings test)." />
      <Toggle label="I’m married" checked={s.married} onChange={(v) => set("married", v)} hint="Adds spousal and survivor benefits and finds your best combined plan." />
      {s.married ? (
        <div className="space-y-6 border-l-2 border-[var(--hairline-2)] pl-4">
          <BirthDateField label="Spouse’s date of birth" value={sdob} onChange={(v) => set("sdob", v)} minYear={1940} maxYear={1985} />
          <NumberField
            label="Spouse’s monthly benefit at their full retirement age"
            prefix="$"
            value={s.spia}
            onChange={(v) => set("spia", v ?? 0)}
            min={0}
            max={10000}
            hint="From their statement. Enter 0 if they never worked under Social Security."
          />
          <Segmented
            label="Spouse’s sex"
            value={s.ssex}
            onChange={(v) => set("ssex", v)}
            options={[
              { value: "m", label: "Man" },
              { value: "f", label: "Woman" },
            ]}
            size="lg"
          />
          <Segmented
            label="Spouse’s health outlook"
            value={s.shealth}
            onChange={(v) => set("shealth", v)}
            options={HEALTH_KEYS.map((k) => ({ value: k, label: k === "average" ? "Average" : k === "shorter" ? "Shorter" : "Longer" }))}
            size="lg"
          />
          <SelectField
            label="When does your spouse start (or when did they)?"
            value={optionValue(s.sca, spFra.total)}
            onChange={(v) => set("sca", v === 0 ? 0 : v)}
            options={ageOptions(spFra.total, spPast)}
            hint={`Their full retirement age: ${spFra.label}.`}
          />
        </div>
      ) : null}
      <details className="explainer">
        <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> Assumptions
        </summary>
        <div className="mt-4 space-y-6">
          <Toggle
            label="What if benefits are cut after the trust fund runs low?"
            checked={s.cut}
            onChange={(v) => set("cut", v)}
            hint={`Pays ${TRUST_FUNDS.value.oasiDepletion.payablePct}% of scheduled benefits from ${monthName(DEPLETION_MONTH)} on — the Trustees’ projection if Congress does nothing.`}
          />
          <Toggle label="Show totals in future dollars (with COLAs)" checked={s.fut} onChange={(v) => set("fut", v)} hint="Off = today’s dollars, the fairest way to compare." />
          <NumberField
            label={`Yearly cost-of-living adjustment (COLA) after ${COLA_PAY_YEAR}`}
            suffix="%"
            decimals={1}
            value={s.cola}
            onChange={(v) => set("cola", v ?? 0)}
            min={0}
            max={10}
            hint={`The Trustees assume ${TR_ECON.value.colaAssumptionAfter2027}%. Used for future-dollar figures and first-check amounts.`}
          />
          <NumberField
            label="Discount rate after inflation"
            suffix="%"
            decimals={1}
            value={s.disc}
            onChange={(v) => set("disc", v ?? 0)}
            min={0}
            max={10}
            hint={`0% simply adds up today’s dollars. Economists use a safe real interest rate — the Trustees’ long-run figure is ${TR_ECON.value.realRateUltimate}%.`}
          />
        </div>
      </details>
    </>
  );

  // ── Result pieces ───────────────────────────────────────────────────────────────────────────────────────────
  const earliestText = avail === earliestMonthOf(dob) ? `at ${ageLabel(startAge(avail))}` : `now (at ${ageLabel(startAge(avail))})`;
  const bestMonthly = best ? payment(pia, claimFactor(dob, best.claimMonth).factor) : null;
  const evFirst = curve ? curve[0].value : null;
  const gain = best && evFirst != null ? best.value - evFirst : null;
  const closeCall = best && gain != null && best.value > 0 ? gain / best.value < CLOSE_CALL_SHARE : false;

  // Someone who never worked under Social Security can still get spousal and survivor benefits on a spouse's record.
  const hasBenefit = pia > 0 || (s.married && spouse.pia > 0);
  let hero: React.ReactNode;
  if (!hasBenefit) {
    hero = <ResultHero label="Your monthly benefit" value="$0" sub="Enter your benefit at full retirement age — or switch to “Estimate from my pay.”" />;
  } else if (s.married && householdInput) {
    const g = grid;
    hero = (
      <ResultHero
        label="Best combined plan (you / your spouse)"
        value={g ? `${ageShort(ageMonthsIn(dob, g.best.you))} / ${ageShort(ageMonthsIn(sdob, g.best.spouse))}` : <Skeleton className="h-[3.2rem] w-64" />}
        sub={
          g ? (
            <>
              You start at <strong>{ageLabel(startAge(g.best.you))}</strong>, your spouse {spouseAlready ? "keeps the start they already made" : <>at <strong>{ageLabel(ageMonthsIn(sdob, g.best.spouse))}</strong></>}. Expected
              lifetime income for the two of you: <strong>{money(g.best.value.total)}</strong> in today’s dollars.
            </>
          ) : (
            "Comparing every combination with SSA’s life tables…"
          )
        }
      />
    );
  } else {
    hero = (
      <ResultHero
        label={past70 ? "You’re past 70 — start now" : "Best age to start, for the most expected lifetime income"}
        value={best ? `Age ${ageShort(best.ageMonths)}` : error ? `${money(pia)}/mo` : <Skeleton className="h-[3.2rem] w-56" />}
        sub={
          best && bestMonthly != null ? (
            <>
              That’s <strong>{money(bestMonthly)} a month</strong> in today’s dollars — {pctOfPia(claimFactor(dob, best.claimMonth).factor)} of your full amount — starting{" "}
              {monthName(best.claimMonth)}.
            </>
          ) : error ? (
            `Your benefit at full retirement age (${youFra.label}). Life tables didn’t load, so we can’t rank start ages yet.`
          ) : (
            "Loading SSA life tables to weigh each age by your odds of collecting…"
          )
        }
      />
    );
  }

  const earlyReasons = [
    s.health === "shorter" ? "a shorter-than-average life expectancy" : null,
    exp.realDiscountPct > 0 ? `a ${exp.realDiscountPct}% discount rate` : null,
    s.cut ? "the trust-fund cut" : null,
  ].filter((x): x is string => x != null);
  let advice: React.ReactNode = null;
  if (pia > 0 && !s.married && best && evFirst != null && gain != null) {
    const beText = mainBe ? `${ageLabel(mainBe.ageMonths)}${exp.realDiscountPct > 0 ? " (before discounting)" : ""}` : null;
    const oddsT = mainOdds != null ? oddsText(mainOdds) : null;
    if (past70) {
      advice = (
        <Callout tone="sage" title="Waiting past 70 earns nothing more">
          If you haven’t applied yet, apply now. SSA can pay up to {RETROACTIVE_MONTHS.value} months of back benefits after full retirement age.
        </Callout>
      );
    } else if (best.claimMonth === lastChoice) {
      advice = (
        <Callout tone="sage" title="If you can afford to wait, 70 pays the most">
          If you’re single, in {HEALTH_WORD[s.health]} health and don’t need the money yet, waiting until 70 gives the most expected lifetime income — about{" "}
          <strong>{money(gain)}</strong> more than starting {earliestText} (today’s dollars).
          {beText ? (
            <>
              {" "}
              Starting {earliestText} instead of at 70 breaks even at <strong>{beText}</strong>; you have a <strong>{oddsT}</strong> chance of living past that age.
            </>
          ) : null}
        </Callout>
      );
    } else if (best.claimMonth === avail) {
      advice = (
        <Callout tone="sun" title="Starting early comes out ahead for you">
          {earlyReasons.length ? `With ${earlyReasons.join(" and ")}, starting` : "Starting"} {earliestText} gives the most expected lifetime income.
          {beText ? (
            <>
              {" "}
              Waiting until 70 only pays off if you live past <strong>{beText}</strong> — about a <strong>{oddsT}</strong> chance for you.
            </>
          ) : null}
        </Callout>
      );
    } else {
      advice = (
        <Callout tone="sage" title={`Your sweet spot is around ${ageLabel(best.ageMonths)}`}>
          Starting at {ageLabel(best.ageMonths)} gives the most expected lifetime income — {money(gain)} more than starting {earliestText}, and{" "}
          {money(best.value - (evAt(lastChoice) ?? best.value))} more than waiting to 70.
          {beText ? (
            <>
              {" "}
              (Starting {earliestText} instead of at 70 breaks even at {beText}; you have a {oddsT} chance of living past it.)
            </>
          ) : null}
        </Callout>
      );
    }
    if (closeCall && !past70) {
      advice = (
        <>
          {advice}
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">
            <strong>It’s a close call:</strong> the best and the earliest start differ by less than {Math.round(CLOSE_CALL_SHARE * 100)}% of expected lifetime income, so let your
            cash needs, taxes and peace of mind decide.
          </p>
        </>
      );
    }
  } else if (hasBenefit && s.married && grid) {
    const youHigher = you.pia >= spouse.pia;
    const gainCouple = grid.best.value.total - grid.earliest.value.total;
    advice = (
      <Callout tone="sage" title={`Of ${grid.cells.length} combinations, this one pays the two of you the most`}>
        Expected household income is <strong>{money(gainCouple)}</strong> higher than {grid.cells.length > 1 ? "both of you starting as early as possible" : "the alternative"}. The bigger
        check is {youHigher ? "yours" : "your spouse’s"}, and whoever lives longer keeps it — so delaying it protects the survivor.
      </Callout>
    );
  }

  const expectedBars = curve
    ? curve.filter((p, i) => i === 0 || p.ageMonths % 12 === 0).map((p) => ({ x: ageShort(p.ageMonths), y: Math.round(p.value) }))
    : [];
  const bestBar = expectedBars.length ? expectedBars.reduce((a, b) => (b.y > a.y ? b : a)).x : undefined;

  const unitNote = s.fut ? `future dollars (COLAs: ${COLA[COLA_PAY_YEAR].value}% for December ${COLA_DEC_YEAR}, then ${s.cola}% a year)` : "today’s dollars";
  const fmtShort = (n: number) => (Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}k`);
  const earnHref = `/social-security-earnings-limit-calculator?dob=${dobParam(dob)}&ben=${planMonthly}&year=${retYear}${s.est ? `&earn=${Math.round(s.sal)}` : ""}`;
  // Yearly benefits once everyone has filed (own checks plus any spousal top-ups), today's dollars.
  const coupleAnnual = s.married ? (steadyAmounts(you, planMonth, spouse, spousePlan).total + steadyAmounts(spouse, spousePlan, you, planMonth).total) * 12 : planMonthly * 12;
  const taxHref = `/taxable-social-security-calculator?fs=${s.married ? "mfj" : "single"}&ss=${Math.round(coupleAnnual)}`;

  const firstRate = CLAIMING_RULES.earlyFirst36PerMonth;
  const beyondRate = CLAIMING_RULES.earlyBeyond36PerMonth;
  const drcRate = drcPerMonth(cohortYear(dob));
  const planCf = claimFactor(dob, planMonth);

  const result = (
    <>
      {hero}
      {advice ? <div className="mt-5">{advice}</div> : null}
      {error ? (
        <div className="mt-5">
          <Callout tone="ember" title="We couldn’t load SSA’s life tables">
            Monthly amounts and break-even ages below still work.{" "}
            <button type="button" className="link font-bold" onClick={retry}>
              Try again
            </button>
          </Callout>
        </div>
      ) : null}

      {!past70 && pia > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label={`Break-even: ${earliestText.replace(/^at /, "")} vs 70`}
            value={mainBe ? ageShort(mainBe.ageMonths) : "—"}
            sub={mainBe ? "Waiting pays off if you live past this age" : "Only one start date left"}
          />
          <Stat label="Chance you live past it" value={mainOdds != null ? oddsText(mainOdds) : mainBe ? <Skeleton className="h-8 w-20" /> : "—"} sub={`SSA cohort tables, ${s.sex === "f" ? "women" : "men"} born ${dob.year}`} />
          <Stat label="Your life expectancy" value={lifeExp != null ? `Age ${Math.round(lifeExp)}` : <Skeleton className="h-8 w-24" />} sub={`On average, with ${HEALTH_WORD[s.health]} health`} />
        </div>
      ) : null}

      {/* Your plan: any month */}
      {pia > 0 ? (
        <div className="mt-8">
          <h3 className="text-[1.3rem] font-semibold">Try any start month</h3>
          {avail < lastChoice ? (
            <div className="mt-3">
              <label htmlFor={sliderId} className="field-label">
                Start in {monthName(planMonth)} — at {ageLabel(startAge(planMonth))}
              </label>
              <input
                id={sliderId}
                type="range"
                className="range"
                min={avail}
                max={lastChoice}
                step={1}
                value={planMonth}
                onChange={(e) => set("cm", startAge(Number(e.target.value)))}
                aria-valuetext={`${monthName(planMonth)}, age ${ageLabel(startAge(planMonth))}, ${money(planMonthly)} a month`}
              />
              <div className="flex justify-between text-[0.9375rem] text-ink-3">
                <span>{ageShort(startAge(avail))}</span>
                <span>{ageShort(startAge(lastChoice))}</span>
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Monthly, today’s dollars" value={money(planMonthly)} sub={`${pctOfPia(planFactor)} of your full amount`} />
            <Stat label="First check, with COLAs" value={money(planFirst)} sub={`Paid in ${monthName(planMonth + 1)}`} />
            <Stat
              label="Expected lifetime total"
              value={curve ? fmtShort(evAt(planMonth) ?? 0) : error ? "—" : <Skeleton className="h-8 w-24" />}
              sub={best && curve ? (best.claimMonth === planMonth ? "The best start for you" : `${money(best.value - (evAt(planMonth) ?? 0))} less than the best start`) : "Today’s dollars"}
              tone={best && best.claimMonth === planMonth ? "sage" : undefined}
            />
          </div>
          {s.work && planMonth < fraMonth(dob) ? (
            <div className="mt-4">
              <Callout tone="ember" title="Working? The earnings test may hold back checks">
                Before the year you reach full retirement age, SSA withholds $1 for every ${RET_WITHHOLDING.value.beforeFraYear} you earn above {money(ret.retUnderFraAnnual)} ({retYear}); in that year, $1 for every $
                {RET_WITHHOLDING.value.fraYear} above{" "}
                {money(ret.retFraYearAnnual)}. Withheld months aren’t lost — your check is raised at full retirement age. <Link className="link" href={earnHref}>See what you’d keep</Link>.
              </Callout>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table: every age */}
      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">Your check at every age from 62 to 70</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="table-sy text-[1rem]">
            <caption className="sr-only">Monthly benefit by starting age</caption>
            <thead>
              <tr>
                <th>Start at</th>
                <th>Monthly (today’s $)</th>
                <th>% of full</th>
                <th>First check (with COLAs)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ageMonths} className={r.claimMonth === planMonth ? "is-hit" : undefined}>
                  <td className="strong">
                    {r.label}
                    {r.isFra ? <span className="block text-[0.875rem] font-normal text-ink-3">Full retirement age</span> : null}
                    {r.past ? <span className="block text-[0.875rem] font-normal text-ink-3">Already passed</span> : null}
                    {r.claimMonth === planMonth ? <span className="block text-[0.875rem] font-bold text-sun-ink">Your pick</span> : null}
                  </td>
                  <td className={r.past ? "text-ink-3" : "strong"}>{money(r.monthlyToday)}</td>
                  <td>{pctOfPia(r.factor)}</td>
                  <td>
                    {r.past ? "—" : money(r.firstPayment)}
                    {!r.past && r.stepUpMonth > r.claimMonth ? (
                      <span className="block text-[0.875rem] text-ink-3">
                        {money(r.fullPayment)} from {monthName(r.stepUpMonth)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-3">
          Highlighted: your chosen start. Rounded the way SSA does — down to the dime, then the payment down to the dollar. Checks arrive the month after the month they’re for.
        </p>
      </div>

      {/* Chart */}
      {pia > 0 && compare.length > 1 ? (
        <div className="mt-8">
          <h3 className="text-[1.3rem] font-semibold">Total collected by each age</h3>
          <p className="mt-1 text-[1rem] text-ink-3">In {unitNote}. Where the lines cross is the break-even age.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["c1", "c2", "c3"] as const).map((k, i) => (
              <SelectField
                key={k}
                label={`Compare start ${i + 1}`}
                value={optionValue(s[k], youFra.total)}
                onChange={(v) => set(k, v)}
                options={ageOptions(youFra.total, youPast)}
              />
            ))}
          </div>
          <div className="mt-4">
            <LineChart
              series={series}
              xLabel="Age"
              markers={outer?.be && outer.be.ageMonths / 12 <= chartTo ? [{ x: outer.be.ageMonths / 12, label: `Break-even ${ageShort(outer.be.ageMonths)}`, color: "var(--ink-3)" }] : []}
              caption={`Cumulative Social Security benefits by age for ${compare.map((m) => ageLabel(startAge(m))).join(", ")} start ages, in ${unitNote}`}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="table-sy text-[1rem]">
              <caption className="sr-only">Break-even ages and the chance of living past them</caption>
              <thead>
                <tr>
                  <th>Comparing</th>
                  <th>Break-even age</th>
                  <th>Chance you live past it</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => {
                  const o = odds(p.be);
                  return (
                    <tr key={`${p.a}-${p.b}`}>
                      <td className="strong">
                        {ageLabel(startAge(p.a))} vs {ageLabel(startAge(p.b))}
                      </td>
                      <td>{p.be ? ageLabel(p.be.ageMonths) : "Never (before 120)"}</td>
                      <td>{o != null ? oddsText(o) : p.be && !error ? <Skeleton className="h-6 w-14" /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Expected value by start age */}
      {expectedBars.length > 1 && !s.married ? (
        <div className="mt-8">
          <h3 className="text-[1.3rem] font-semibold">Expected lifetime benefits by start age</h3>
          <p className="mt-1 text-[1rem] text-ink-3">
            Each month’s check times the chance you’re alive to cash it, added up in today’s dollars{exp.realDiscountPct ? `, discounted ${exp.realDiscountPct}% a year` : ""}. The tallest bar wins.
          </p>
          <div className="mt-4">
            <BarChart data={expectedBars} highlight={bestBar} caption="Expected lifetime Social Security benefits by starting age, in today's dollars" color="var(--sage)" />
          </div>
        </div>
      ) : null}

      {s.married && hasBenefit ? (
        <MarriedResults input={householdBase} grid={grid} stale={stale} youFraTotal={youFra.total} spouseFraTotal={spFra.total} spouseAlready={spouseAlready} />
      ) : null}

      {/* Trust fund */}
      <div className="mt-8">
        {s.cut ? (
          <Callout tone="ember" title={`Showing a ${100 - TRUST_FUNDS.value.oasiDepletion.payablePct}% cut from ${monthName(DEPLETION_MONTH)}`}>
            The 2026 Trustees Report projects the retirement trust fund (OASI) runs dry in {TRUST_FUNDS.value.oasiDepletion.year}; incoming payroll taxes would then cover about{" "}
            {TRUST_FUNDS.value.oasiDepletion.payablePct}% of scheduled benefits. A cut would hit everyone collecting — early and late starters alike. Every result above already includes it.{" "}
            <button type="button" className="link font-bold" onClick={() => set("cut", false)}>
              Turn it off
            </button>
          </Callout>
        ) : (
          <Callout tone="sky" title={`What if benefits are cut ${100 - TRUST_FUNDS.value.oasiDepletion.payablePct}% after ${TRUST_FUNDS.value.oasiDepletion.year}?`}>
            Scheduled benefits assume Congress fixes the shortfall, as it always has. To see the Trustees’ “do nothing” case, where checks drop to {TRUST_FUNDS.value.oasiDepletion.payablePct}% from{" "}
            {monthName(DEPLETION_MONTH)},{" "}
            <button type="button" className="link font-bold" onClick={() => set("cut", true)}>
              turn on the cut
            </button>
            .
          </Callout>
        )}
      </div>

      {s.est && estimate ? (
        <div className="mt-4">
          <Callout tone="sun" title="Your benefit is an estimate">
            We assumed your pay tracked the national average wage every year since {estimate.firstWorkYear}, giving average indexed monthly earnings (AIME) of {money(estimate.aime)}. Gaps,
            part-time years or big raises change the answer — check your actual record at ssa.gov/myaccount.
          </Callout>
        </div>
      ) : null}

      <ShowMath>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Full retirement age for someone born in {cohortYear(dob)}: <strong>{youFra.label}</strong>, reached in {monthName(fraMonth(dob))}. The earliest month you can start is the first
            month you are 62 for the whole month: {monthName(claimFactor(dob, 0).claimMonth)}.
          </li>
          <li>
            Benefit at full retirement age (primary insurance amount, PIA): <strong>{money(pia)}</strong>
            {s.est && estimate ? (
              <>
                {" "}
                — estimated: AIME {money(estimate.aime)} through the {estimate.bendYear} formula: {pctOfPia(PIA_FORMULA.value.first)} of the first {money(estimate.bendPoints[0])},{" "}
                {pctOfPia(PIA_FORMULA.value.second)} up to {money(estimate.bendPoints[1])}, {pctOfPia(PIA_FORMULA.value.third)} above, rounded down to the dime
                {estimate.colasApplied.length ? `, plus COLAs since ${estimate.eligibilityYear}` : ""}.
              </>
            ) : (
              " (from your statement)."
            )}
          </li>
          <li>
            Starting {planCf.monthsEarly ? `${planCf.monthsEarly} months before` : planCf.monthsDelayed ? `${planCf.monthsDelayed} months after` : "at"} full retirement age:{" "}
            {planCf.monthsEarly ? (
              <>
                minus {fractionOfOnePercent(firstRate)} for each of the first {Math.min(TIER, planCf.monthsEarly)} months
                {planCf.monthsEarly > TIER ? <> and {fractionOfOnePercent(beyondRate)} for the other {planCf.monthsEarly - TIER}</> : null}
              </>
            ) : planCf.monthsDelayed ? (
              <>plus {fractionOfOnePercent(drcRate)} per month in delayed retirement credits</>
            ) : (
              <>no reduction or credit</>
            )}{" "}
            = <strong>{pctOfPia(planFactor)}</strong>. {money2(pia)} × {pctOfPia(planFactor)} = {money2(planFactor * pia)} → <strong>{money(planMonthly)}</strong> after rounding down.
          </li>
          {planCf.monthsDelayed && planMonth < m70 ? (
            <li>Delayed credits earned in the year you file are added the following January (or in the month you turn 70), so the first few checks are slightly smaller.</li>
          ) : null}
          <li>
            COLAs: the official <strong>{COLA[COLA_PAY_YEAR].value}%</strong> for December {COLA_DEC_YEAR} <StatusChip status={COLA[COLA_PAY_YEAR].status} />, then your {s.cola}% a year. They raise your PIA every
            year from the year you turn 62 — even if you haven’t filed — so waiting never costs you a COLA.
          </li>
          <li>
            Break-even: the first month the later start’s running total catches up with the earlier one’s, shown as your age at the end of that month, in {unitNote}.
          </li>
          <li>
            Expected lifetime benefits: each month’s check times the chance you’re alive at the end of that month, from SSA’s cohort life table for {s.sex === "f" ? "women" : "men"} born in{" "}
            {youModel ? youModel.birthYear : dob.year} (2026 Trustees Report, intermediate)
            {s.health !== "average" ? `, with every yearly death rate multiplied by ${HEALTH_OUTLOOK[s.health].qxMultiplier.toFixed(2).replace(/\.?0+$/, "")} for your health outlook (our assumption, not SSA’s)` : ""}
            , in today’s dollars{exp.realDiscountPct ? `, discounted ${exp.realDiscountPct}% a year after inflation` : ""}.
          </li>
          {s.cut ? (
            <li>
              Trust-fund case: {TRUST_FUNDS.value.oasiDepletion.payablePct}% of every check from {monthName(DEPLETION_MONTH)} (OASI reserves projected to run out in quarter{" "}
              {TRUST_FUNDS.value.oasiDepletion.quarter} of {TRUST_FUNDS.value.oasiDepletion.year}).
            </li>
          ) : null}
        </ol>
        <p className="mt-3">
          Rules:{" "}
          <a className="link" href={SRC.ssaArDrc.url} target="_blank" rel="noopener">
            SSA reduction and credit table
          </a>
          ,{" "}
          <a className="link" href={CLAIM_SRC.ecfr404_212.url} target="_blank" rel="noopener">
            20 CFR 404.212 (COLAs from 62)
          </a>
          ,{" "}
          <a className="link" href={CLAIM_SRC.ecfr404_313.url} target="_blank" rel="noopener">
            20 CFR 404.313 (delayed credits)
          </a>
          ,{" "}
          <a className="link" href={SRC.ssaCohortLife.url} target="_blank" rel="noopener">
            SSA cohort life tables
          </a>
          ,{" "}
          <a className="link" href={CLAIM_SRC.trHighlights2026.url} target="_blank" rel="noopener">
            2026 Trustees Report
          </a>
          .
        </p>
      </ShowMath>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={earnHref} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="work" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Still working? Check the earnings test</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">See how much SSA would hold back at your pay.</span>
          </span>
        </Link>
        <Link href={taxHref} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Will my benefits be taxed?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Up to {pctOfPia(BENEFIT_TAX_MAX_SHARE.value)} can count as taxable income.</span>
          </span>
        </Link>
      </div>
    </>
  );

  const mobileSummary =
    !hasBenefit
      ? "Enter your benefit"
      : s.married && grid
        ? `Best: you ${ageShort(ageMonthsIn(dob, grid.best.you))}, spouse ${ageShort(ageMonthsIn(sdob, grid.best.spouse))}`
        : best && bestMonthly != null
          ? `Best start: ${ageShort(best.ageMonths)} · ${money(bestMonthly)}/mo`
          : `At ${youFra.label}: ${money(pia)}/mo`;

  return (
    <CalculatorShell
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="ss-claiming" subject="Our Social Security claiming plan" />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              Uses SSA’s claiming rules, the official {COLA[COLA_PAY_YEAR].value}% COLA for {COLA_PAY_YEAR} and SSA cohort life tables (2026 Trustees Report). Last verified {longDate(SITE.dataVerifiedOn)}.
              An educational estimate, not a determination by SSA.
            </p>
          </div>
        </>
      }
      mobileSummary={mobileSummary}
    />
  );
}

/** Start months compared for a couple: 62 (or the first month still open), full retirement age and 70. */
function startOptions(dob: YMD, asOf: YMD) {
  const first = firstAvailableMonth(dob, asOf);
  const lastM = Math.max(first, age70Month(dob));
  return unique([62 * 12, fra(dob).total, 70 * 12].map((a) => clamp(claimMonthForAge(dob, a), first, lastM)));
}

/** First legal start month (the "throughout the month" rule at 62). */
function earliestMonthOf(dob: YMD) {
  return claimFactor(dob, 0).claimMonth;
}
