"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { StatusChip } from "@/components/tool/StatusChip";
import {
  NumberField,
  Segmented,
  SelectField,
  Toggle,
} from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, numOrNull, str, bool } from "@/hooks/useUrlState";
import {
  compareYears,
  averagePlanPremium,
  nextIrmaaLine,
  tierRange,
  tierUncertain2027,
  schedule,
  partDPenaltyRaw,
  holdHarmlessBasis,
  type Coverage,
  type PartAQuarters,
  type PersonInput,
  type PersonResult,
  type PremiumYear,
  type TaxFiling,
  type HouseholdResult,
} from "@/lib/calc/medicare";
import {
  IRMAA_2027_ALT_BOUNDS,
  IRMAA_PCT,
  PART_A,
  PART_B,
  PART_B_REBATE_2026,
  PART_D,
  PENALTIES,
} from "@/data/params/medicare";
import {
  AVG_PLAN_PREMIUM,
  PART_A_PENALTY,
  SRC_MEDICARE_EXTRA,
} from "@/data/params/medicare-extra";
import { AVG_BENEFITS } from "@/data/params/social-security";
import { SRC } from "@/data/params/sources";
import { money, money2, moneySmart, pct, longDate } from "@/lib/format";
import { roundToCents } from "@/lib/calc/dates";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { CostBar, type CostSegment } from "./CostBar";

/* ── Defaults: a typical retiree (average 2026 retired-worker benefit, income under the first IRMAA line). ── */
const avgRow = (prefix: string) =>
  AVG_BENEFITS.value.find((r) => r.type.startsWith(prefix));
const AVG_WORKER_2026 = avgRow("All retired")?.jan2026 ?? 0;
const AVG_COUPLE_2026 = avgRow("Aged couple")?.jan2026 ?? 0;

/**
 * When Part B started coming out of the Social Security check — this decides hold-harmless eligibility, which needs Part B
 * deducted from LAST December's payment: "y1" = by December 2025 (protected in 2026 and 2027), "y2" = during 2026 (only 2027),
 * "no" = not deducted (billed directly, or Part B starts later).
 */
type HhSince = "y1" | "y2" | "no";
const HH_FIRST = holdHarmlessBasis(2026).priorYear; // December 2025 → 2026 protection
const HH_SECOND = holdHarmlessBasis(2027).priorYear; // December 2026 → 2027 protection
/** Also accepts the older 1/0 links. */
const hhCodec = {
  parse: (r: string): HhSince | undefined =>
    r === "y1" || r === "1"
      ? "y1"
      : r === "y2"
        ? "y2"
        : r === "no" || r === "0"
          ? "no"
          : undefined,
  format: (v: HhSince) => v,
};

/** "auto" = not chosen yet: single for one person, married filing jointly for a couple (so ?people=2 alone means joint). */
type FsChoice = TaxFiling | "auto";

const DEFAULTS = {
  year: 2027 as PremiumYear,
  people: 1 as 1 | 2,
  fs: "auto" as FsChoice,
  magi: 80000,
  magi2: 40000,
  cov: "orig_d" as Coverage,
  plan: null as number | null,
  ss1: AVG_WORKER_2026,
  hh1: "y1" as HhSince,
  b1: 0,
  d1: 0,
  a1: "40" as PartAQuarters,
  ap1: false,
  ss2: Math.max(0, AVG_COUPLE_2026 - AVG_WORKER_2026),
  hh2: "y1" as HhSince,
  b2: 0,
  d2: 0,
  a2: "40" as PartAQuarters,
  ap2: false,
};
type State = typeof DEFAULTS;

const yearCodec = {
  parse: (r: string) =>
    (r === "2026" ? 2026 : r === "2027" ? 2027 : undefined) as
      PremiumYear | undefined,
  format: (v: PremiumYear) => String(v),
};
const peopleCodec = {
  parse: (r: string) =>
    (r === "1" ? 1 : r === "2" ? 2 : undefined) as 1 | 2 | undefined,
  format: (v: 1 | 2) => String(v),
};
/** Accepts every filing status other calculators link with; IRMAA only distinguishes three groups. */
const fsCodec = {
  parse: (r: string): FsChoice | undefined =>
    r === "mfj"
      ? "mfj"
      : r === "mfs"
        ? "mfs"
        : ["single", "hoh", "qss", "mfsApart"].includes(r)
          ? "single"
          : undefined,
  format: (v: FsChoice) => v,
};
const quarters = str(["40", "30", "0"] as const);
/** Dollar amounts from a shared link: never negative. */
const dollars = {
  parse: (r: string) =>
    num.parse(r) == null ? undefined : Math.max(0, num.parse(r)!),
  format: num.format,
};
/** Month counts from a shared link: whole months, 0–1,200. */
const months = {
  parse: (r: string) =>
    num.parse(r) == null
      ? undefined
      : Math.min(1200, Math.max(0, Math.floor(num.parse(r)!))),
  format: num.format,
};
const planCodec = {
  parse: (r: string) => {
    const v = numOrNull.parse(r);
    return v == null ? v : Math.max(0, v);
  },
  format: numOrNull.format,
};

const FILING_OPTIONS: { value: TaxFiling; label: string }[] = [
  { value: "single", label: "Single, head of household or widow(er)" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "mfs", label: "Married filing separately (lived together)" },
];
const FILING_WORDS: Record<TaxFiling, string> = {
  single: "single filer",
  mfj: "married filing jointly",
  mfs: "married filing separately",
};

const COVERAGE_OPTIONS: { value: Coverage; label: string }[] = [
  { value: "orig_d", label: "Original Medicare + a Part D drug plan" },
  { value: "orig", label: "Original Medicare, no drug plan" },
  { value: "ma", label: "Medicare Advantage plan with drug coverage" },
];

const QUARTER_OPTIONS: { value: PartAQuarters; label: string }[] = [
  { value: "40", label: "40 or more (10+ years) — Part A is free" },
  { value: "30", label: "30 to 39 quarters" },
  { value: "0", label: "Fewer than 30 quarters" },
];

const signed = (n: number, fmt: (x: number) => string = money2) =>
  Math.abs(n) < 0.005 ? fmt(0) : `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const sumP = (r: HouseholdResult, f: (p: PersonResult) => number) =>
  r.persons.reduce((a, p) => a + f(p), 0);

function rangeText(r: ReturnType<typeof tierRange>) {
  if (r.atLeast != null) return `${money(r.atLeast)} or more`;
  if (r.over == null && r.atMost != null) return `${money(r.atMost)} or less`;
  if (r.over != null && r.atMost != null)
    return `over ${money(r.over)} up to ${money(r.atMost)}`;
  return `over ${money(r.over ?? 0)} and under ${money(r.under ?? 0)}`;
}

interface PersonState {
  ss: number;
  hh: HhSince;
  b: number;
  d: number;
  a: PartAQuarters;
  ap: boolean;
}

function PersonFields({
  legend,
  you,
  v,
  onChange,
  year,
  hasD,
}: {
  legend: string;
  you: boolean;
  v: PersonState;
  onChange: (patch: Partial<PersonState>) => void;
  year: PremiumYear;
  hasD: boolean;
}) {
  const hhb = holdHarmlessBasis(year);
  const anyLate = v.b > 0 || v.d > 0 || v.a !== "40";
  // Opens by itself when late-enrollment values arrive (e.g. from a shared link) but never snaps shut while someone is
  // editing — clearing a field to 0 must not hide the field that has focus.
  const [open, setOpen] = useState(anyLate);
  const [autoOpened, setAutoOpened] = useState(anyLate);
  if (anyLate && !autoOpened) {
    setAutoOpened(true);
    setOpen(true);
  }
  const your = you ? "your" : "their";
  return (
    <fieldset className="sunk space-y-5 p-4 sm:p-5">
      <legend className="sr-only">{legend}</legend>
      <p className="text-[1.15rem] font-bold text-ink" aria-hidden="true">
        {legend}
      </p>
      <NumberField
        label={
          you
            ? "Your monthly Social Security in 2026"
            : "Spouse’s monthly Social Security in 2026"
        }
        prefix="$"
        value={v.ss}
        onChange={(n) => onChange({ ss: Math.max(0, n ?? 0) })}
        min={0}
        max={10000}
        hint={
          <>
            Before Medicare is taken out — the amount on {your} 2026 benefit
            letter. Enter 0 if {you ? "you don’t" : "they don’t"} collect yet.
            {year === 2027
              ? ` We add the official ${hhb.colaPct}% raise for 2027.`
              : ""}
          </>
        }
      />
      {v.ss > 0 ? (
        <SelectField
          label={`When did Part B start coming out of ${your} Social Security check?`}
          value={v.hh}
          onChange={(x) => onChange({ hh: x })}
          options={[
            { value: "y1", label: `In December ${HH_FIRST} or earlier` },
            { value: "y2", label: `During ${HH_SECOND}` },
            { value: "no", label: "It doesn’t — Medicare bills me" },
          ]}
          hint={`The “hold-harmless” rule can keep Part B from rising more than the cost-of-living raise, but only if Part B came out of last December’s check (December ${year - 1} for ${year} premiums).`}
        />
      ) : null}
      <details
        className="explainer"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="flex min-h-[3rem] cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" />{" "}
          Signed up late, or short on work credits?
        </summary>
        <div className="mt-4 space-y-5">
          <NumberField
            label="Months without Part B that count toward the penalty"
            suffix="mo"
            value={v.b}
            onChange={(n) => onChange({ b: Math.max(0, Math.floor(n ?? 0)) })}
            min={0}
            max={600}
            hint="Months after your 7-month Initial Enrollment Period when you could have had Part B but didn’t. Months covered by a current job’s group health plan don’t count. Only full 12-month periods add a penalty."
          />
          {hasD ? (
            <NumberField
              label="Months without Part D or other drug coverage"
              suffix="mo"
              value={v.d}
              onChange={(n) => onChange({ d: Math.max(0, Math.floor(n ?? 0)) })}
              min={0}
              max={600}
              hint={`Full months after your Initial Enrollment Period with no Part D and no “creditable” drug coverage (from a job, retiree plan, TRICARE or VA), counting only gaps of ${PENALTIES.value.partDGapDays} days or more. Your plan’s letter shows the number.`}
            />
          ) : null}
          <SelectField
            label="Quarters of Medicare-covered work (yours or a spouse’s)"
            value={v.a}
            onChange={(x) => onChange({ a: x })}
            options={QUARTER_OPTIONS}
            hint="Almost everyone has 40. You can also qualify on a current, former or late spouse’s record."
          />
          {v.a !== "40" ? (
            <Toggle
              label="I signed up for premium Part A late"
              checked={v.ap}
              onChange={(x) => onChange({ ap: x })}
              hint={`Adds ${pct(PART_A_PENALTY.value.rate, 0)} to the Part A premium for twice the number of years ${you ? "you" : "they"} could have had it.`}
            />
          ) : null}
        </div>
      </details>
    </fieldset>
  );
}

export function MedicareCalculator() {
  const {
    state: s,
    set,
    setState,
  } = useUrlState<State>(DEFAULTS, {
    year: yearCodec,
    people: peopleCodec,
    fs: fsCodec,
    magi: dollars,
    magi2: dollars,
    cov: str(["orig_d", "orig", "ma"] as const),
    plan: planCodec,
    ss1: dollars,
    hh1: hhCodec,
    b1: months,
    d1: months,
    a1: quarters,
    ap1: bool,
    ss2: dollars,
    hh2: hhCodec,
    b2: months,
    d2: months,
    a2: quarters,
    ap2: bool,
  });

  const year = s.year;
  const two = s.people === 2;
  const fs: TaxFiling = s.fs === "auto" ? (two ? "mfj" : "single") : s.fs;
  const hasD = s.cov !== "orig";
  const sched = schedule(year);
  const taxYear = sched.magiTaxYear;
  const separate = two && fs !== "mfj";

  const personInput = (i: 1 | 2): PersonInput => ({
    magi: i === 2 ? s.magi2 : undefined,
    lateBMonths: i === 1 ? s.b1 : s.b2,
    lateDMonths: i === 1 ? s.d1 : s.d2,
    partAQuarters: i === 1 ? s.a1 : s.a2,
    partALatePenalty: i === 1 ? s.ap1 : s.ap2,
    ssBenefit2026: i === 1 ? s.ss1 : s.ss2,
    hhEligible: (i === 1 ? s.hh1 : s.hh2) === "y1",
    hhEligible2027: (i === 1 ? s.hh1 : s.hh2) !== "no",
  });
  const people = two ? [personInput(1), personInput(2)] : [personInput(1)];
  const cmp = compareYears({
    filing: fs,
    magi: s.magi,
    coverage: s.cov,
    planPremium: hasD ? s.plan : null,
    people,
  });
  const r = year === 2027 ? cmp.y2027 : cmp.y2026;
  const monthlyChange = cmp.monthlyChange;

  const patchPerson = (i: 1 | 2, patch: Partial<PersonState>) =>
    setState((prev) => {
      const next = { ...prev } as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) next[`${k}${i}`] = v;
      return next as State;
    });

  // One analytics event per settled result (bucketed, no personal data).
  const maxTier = Math.max(...r.persons.map((p) => p.tier));
  const anyLateB = r.persons.some((p) => p.partB.penalty > 0);
  const anyLateD = r.persons.some((p) => p.partD.penalty > 0);
  const anyPartA = r.persons.some((p) => p.partA.total > 0);
  const anyHh = r.persons.some((p) => p.ss?.holdHarmless?.protected);
  const bucket = Math.round(r.totalMonthly / 50) * 50;
  const last = useRef("");
  useEffect(() => {
    const key = `${year}|${s.people}|${s.cov}|${fs}|${maxTier}|${bucket}|${anyLateB}|${anyLateD}|${anyPartA}|${anyHh}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_medicare_result", {
        year,
        people: s.people,
        coverage: s.cov,
        filing: fs,
        tier: maxTier,
        bucket,
        late_b: anyLateB,
        late_d: anyLateD,
        part_a: anyPartA,
        hold_harmless: anyHh,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [
    year,
    s.people,
    s.cov,
    fs,
    maxTier,
    bucket,
    anyLateB,
    anyLateD,
    anyPartA,
    anyHh,
  ]);

  /* ── Inputs ── */
  const avgPlan = hasD ? averagePlanPremium(year, s.cov) : 0;
  const avgStatus = AVG_PLAN_PREMIUM[year].status;
  const inputs = (
    <>
      <Segmented
        label="Premiums for which year?"
        value={year}
        onChange={(v) => set("year", v)}
        options={[
          { value: 2026, label: "2026 (this year)" },
          { value: 2027, label: "2027 (next year)" },
        ]}
        size="lg"
        hint={
          year === 2027
            ? "2027 Part A and Part B figures and the IRMAA income lines are projections until the Centers for Medicare & Medicaid Services (CMS) announces them, usually in mid-November."
            : undefined
        }
      />
      <Segmented
        label="Who is on Medicare?"
        value={s.people}
        onChange={(v) =>
          setState((prev) => ({
            ...prev,
            people: v,
            fs: prev.fs === "single" ? "auto" : prev.fs,
          }))
        }
        options={[
          { value: 1, label: "Just me" },
          { value: 2, label: "Me and my spouse" },
        ]}
        size="lg"
      />
      <SelectField
        label={`Tax filing status on your ${taxYear} return`}
        value={fs}
        onChange={(v) => set("fs", v)}
        options={FILING_OPTIONS}
        hint={
          fs === "mfs"
            ? "Married filing separately and lived with your spouse at any time that year — this has the harshest IRMAA table. If you lived apart all year, choose Single."
            : two && fs === "single"
              ? "Each spouse is judged on their own return. Use this if you file separately and lived apart all year."
              : `${year} premiums are based on the tax return you filed for ${taxYear}.`
        }
      />
      <NumberField
        label={
          fs === "mfj"
            ? `Joint income (MAGI) on your ${taxYear} return`
            : `Your income (MAGI) on your ${taxYear} return`
        }
        prefix="$"
        value={s.magi}
        onChange={(v) => set("magi", Math.max(0, v ?? 0))}
        min={0}
        max={10000000}
        hint={
          <>
            Modified adjusted gross income (MAGI) = the adjusted gross income on
            your Form 1040 plus tax-exempt interest (line 2a).{" "}
            <Link
              className="link"
              href={`/irmaa-calculator?year=${year}&fs=${fs}&magi=${Math.round(s.magi)}`}
            >
              Build it line by line
            </Link>
            .
          </>
        }
      />
      {separate ? (
        <NumberField
          label={`Spouse’s income (MAGI) on their ${taxYear} return`}
          prefix="$"
          value={s.magi2}
          onChange={(v) => set("magi2", Math.max(0, v ?? 0))}
          min={0}
          max={10000000}
          hint="When you file separately, each spouse’s surcharge depends on their own return."
        />
      ) : null}
      <SelectField
        label="Your coverage"
        value={s.cov}
        onChange={(v) => set("cov", v)}
        options={COVERAGE_OPTIONS}
        hint={
          s.cov === "orig"
            ? "Medigap (supplement) premiums aren’t included — add your quote on top."
            : "Part B is still due with every option. Medigap premiums aren’t included."
        }
      />
      {hasD ? (
        <NumberField
          label={`${s.cov === "ma" ? "Your Medicare Advantage plan’s" : "Your drug plan’s"} monthly premium${two ? " (per person)" : ""}`}
          prefix="$"
          decimals={2}
          value={s.plan}
          onChange={(v) => set("plan", v == null ? null : Math.max(0, v))}
          min={0}
          max={1000}
          placeholder={avgPlan.toFixed(2)}
          hint={
            <>
              Leave blank to use the {year} national average,{" "}
              {avgStatus === "projected"
                ? `about ${moneySmart(avgPlan)} (CMS projection)`
                : money2(avgPlan)}
              . Many plans cost $0; others cost far more — check Medicare Plan
              Finder.
            </>
          }
        />
      ) : null}
      <PersonFields
        legend={two ? "You" : "About you"}
        you
        v={{ ss: s.ss1, hh: s.hh1, b: s.b1, d: s.d1, a: s.a1, ap: s.ap1 }}
        onChange={(p) => patchPerson(1, p)}
        year={year}
        hasD={hasD}
      />
      {two ? (
        <PersonFields
          legend="Your spouse"
          you={false}
          v={{ ss: s.ss2, hh: s.hh2, b: s.b2, d: s.d2, a: s.a2, ap: s.ap2 }}
          onChange={(p) => patchPerson(2, p)}
          year={year}
          hasD={hasD}
        />
      ) : null}
    </>
  );

  /* ── Result ── */
  const planLabel =
    s.cov === "ma" ? "Medicare Advantage plan premium" : "Part D plan premium";
  const segments: CostSegment[] = [
    {
      label: r.persons.some((p) => p.partB.standardCharged < p.partB.standard)
        ? "Part B premium (after hold-harmless)"
        : "Part B standard premium",
      value: sumP(r, (p) => p.partB.standardCharged),
      color: "var(--sun)",
    },
    {
      label: "Part B late penalty",
      value: sumP(r, (p) => p.partB.penalty),
      color: "var(--sun-ink)",
    },
    {
      label: "Part B IRMAA surcharge",
      value: sumP(r, (p) => p.partB.irmaa),
      color: "var(--ember)",
    },
    {
      label: planLabel,
      value: sumP(r, (p) => p.partD.plan),
      color: "var(--sky)",
    },
    {
      label: "Part D IRMAA surcharge",
      value: sumP(r, (p) => p.partD.irmaa),
      color: "color-mix(in oklab, var(--ember) 55%, var(--card))",
    },
    {
      label: "Part D late penalty",
      value: sumP(r, (p) => p.partD.penalty),
      color: "color-mix(in oklab, var(--sky) 55%, var(--card))",
    },
    {
      label: "Part A premium",
      value: sumP(r, (p) => p.partA.total),
      color: "var(--sage)",
    },
  ];

  const anySs = r.persons.some((p) => p.ss);
  const names = two ? ["You", "Your spouse"] : ["You"];
  const otherYear = year === 2027 ? 2026 : 2027;
  const yA = cmp.y2026;
  const yB = cmp.y2027;
  const projected = year === 2027;

  // Callouts, most important first.
  const callouts: React.ReactNode[] = [];

  r.persons.forEach((p, i) => {
    if (p.tier === 0) return;
    if (i === 1 && fs === "mfj") return; // same tier for both — one message
    const who =
      fs === "mfj" && two
        ? "each of you"
        : two
          ? i === 0
            ? "you"
            : "your spouse"
          : "you";
    const perPerson = p.partB.irmaa + p.partD.irmaa;
    const mult = fs === "mfj" && two ? 2 : 1;
    callouts.push(
      <Callout
        key={`irmaa${i}`}
        tone="ember"
        title={`IRMAA surcharge${two && fs !== "mfj" ? ` (${names[i].toLowerCase()})` : ""}: ${money(perPerson * 12 * mult)} a year`}
      >
        An income-related monthly adjustment amount (IRMAA) applies because{" "}
        {fs === "mfj" ? "your joint" : i === 0 ? "your" : "your spouse’s"}{" "}
        {taxYear} MAGI of {money(p.magi)} is in tier {p.tier} of 5 (
        {rangeText(tierRange(sched, fs, p.tier))}). That adds{" "}
        {money2(p.partB.irmaa)} to Part B
        {hasD ? <> and {money2(p.partD.irmaa)} to Part D</> : null} every month
        for {who}. If your income has dropped since {taxYear} because you
        retired, cut back work, married, divorced or were widowed, ask Social
        Security to use a newer year with Form SSA-44.{" "}
        <Link
          className="link"
          href={`/irmaa-calculator?year=${year}&fs=${fs}&magi=${Math.round(p.magi)}`}
        >
          Check the IRMAA calculator
        </Link>
        .
      </Callout>,
    );
  });

  if (projected) {
    const uncertain = r.persons.some(
      (p, i) => (i === 0 || separate) && tierUncertain2027(fs, p.magi),
    );
    if (uncertain) {
      const gap =
        sched.individualBounds[1] - IRMAA_2027_ALT_BOUNDS.individualBounds[1];
      callouts.push(
        <Callout
          key="unc"
          tone="sun"
          title="Your 2027 IRMAA tier isn’t certain yet"
        >
          One month of the inflation data CMS uses to set the 2027 income lines
          (October 2025) was never published. Depending on how CMS handles that,
          the lines above the first one could land {money(gap)} lower
          {fs === "mfj" ? ` (${money(gap * 2)} for joint filers)` : ""} — and
          your income is close enough for that to change your tier.
        </Callout>,
      );
    }
  }

  r.persons.forEach((p, i) => {
    if (i === 1 && fs === "mfj") return;
    const line = nextIrmaaLine(sched, fs, p.magi);
    if (!line || line.headroom > 20000) return;
    const extra = line.extraPartB + (hasD ? line.extraPartD : 0);
    const mult = fs === "mfj" && two ? 2 : 1;
    callouts.push(
      <Callout
        key={`near${i}`}
        tone="sun"
        title={`${two && fs !== "mfj" ? `${names[i]}: ` : ""}${line.headroom < 1 ? "Right at the next IRMAA line" : `${money(line.headroom)} below the next IRMAA line`}`}
      >
        The surcharge works like a cliff: going even $1 over the line costs the
        full next tier — {money2(extra)} a month per person, or{" "}
        {money(extra * 12 * mult)} a year
        {mult === 2 ? " for the two of you" : ""}. Your {year} premium is
        already set by your {taxYear} return, but later years use later returns,
        so keep this line in mind before a Roth conversion, a big IRA withdrawal
        or selling investments at a gain.
      </Callout>,
    );
  });

  r.persons.forEach((p, i) => {
    const raw = i === 0 ? s.b1 : s.b2;
    const who = two ? `${names[i]}: ` : "";
    if (p.partB.penalty > 0) {
      callouts.push(
        <Callout
          key={`lb${i}`}
          tone="ember"
          title={`${who}Part B late penalty of ${pct(p.partB.penaltyPct, 0)} — for life`}
        >
          {p.lateBPeriods} full 12-month period{p.lateBPeriods === 1 ? "" : "s"}{" "}
          without Part B × {pct(PENALTIES.value.partBPerFull12Months, 0)} = a{" "}
          {pct(p.partB.penaltyPct, 0)} surcharge on the standard premium,{" "}
          {money2(p.partB.penalty)} a month in {year}. It rises whenever the
          premium rises and generally lasts as long as you have Part B.
        </Callout>,
      );
    } else if (raw > 0) {
      callouts.push(
        <Callout
          key={`lb${i}`}
          tone="sage"
          title={`${who}No Part B penalty yet`}
        >
          Only full 12-month periods count, so {raw} month{raw === 1 ? "" : "s"}{" "}
          without Part B doesn’t add a penalty. Twelve would.
        </Callout>,
      );
    }
    if (p.partD.penalty > 0) {
      const m = i === 0 ? s.d1 : s.d2;
      callouts.push(
        <Callout
          key={`ld${i}`}
          tone="ember"
          title={`${who}Part D late penalty: ${money2(p.partD.penalty)} a month`}
        >
          {pct(PENALTIES.value.partDPerMonth, 0)} × the {year} national base
          premium ({money2(PART_D[year].value.baseBeneficiaryPremium)}) × {m}{" "}
          months, rounded to the nearest 10 cents. It’s refigured every January
          from the new base premium and lasts as long as you have drug coverage.
          People who get Extra Help don’t pay it.
        </Callout>,
      );
    }
  });

  r.persons.forEach((p, i) => {
    const hh = p.ss?.holdHarmless;
    if (!hh) return;
    const who = two ? `${names[i]}: ` : "";
    const your = i === 0 ? "your" : "their";
    const heldBefore = hh.previous?.protected ? hh.previous : null;
    if (hh.protected) {
      callouts.push(
        <Callout
          key={`hh${i}`}
          tone="sky"
          title={`${who}Hold-harmless limits ${your} Part B increase`}
        >
          {heldBefore ? (
            <>
              The rule already held {your} 2026 Part B at about{" "}
              {money2(heldBefore.standardPaid)} instead of{" "}
              {money2(heldBefore.newStandard)}.{" "}
            </>
          ) : null}
          The {year} cost-of-living raise ({money2(hh.colaRaise)}) is smaller
          than the {money2(hh.premiumIncrease)} it would take to reach the{" "}
          {money2(hh.newStandard)} standard premium. Because Part B already
          comes out of the check and there’s no IRMAA, Part B can rise only as
          far as keeps the payment from shrinking — to about{" "}
          {money2(hh.standardPaid)}. It’s an estimate; the Social Security
          notice shows the exact figure.
        </Callout>,
      );
    } else if (heldBefore) {
      callouts.push(
        <Callout
          key={`hh${i}`}
          tone="sun"
          title={`${who}Hold-harmless protection ends in ${year}`}
        >
          The rule held {your} 2026 Part B at about{" "}
          {money2(heldBefore.standardPaid)}. The {year} raise (
          {money2(hh.colaRaise)}) is big enough to cover the step up to the full{" "}
          {money2(hh.newStandard)} premium, so {your} Part B rises by{" "}
          {money2(hh.premiumIncrease)} while the payment still doesn’t shrink.
        </Callout>,
      );
    } else if (
      hh.colaRaise < hh.premiumIncrease &&
      (hh.reason === "irmaa" ||
        hh.reason === "not-eligible" ||
        hh.reason === "too-small")
    ) {
      callouts.push(
        <Callout
          key={`hh${i}`}
          tone="sun"
          title={`${who}No hold-harmless protection`}
        >
          The raise ({money2(hh.colaRaise)}) is smaller than the Part B increase
          ({money2(hh.premiumIncrease)}), but the rule doesn’t apply:{" "}
          {hh.reason === "irmaa"
            ? "people who pay IRMAA aren’t protected."
            : hh.reason === "not-eligible"
              ? `it only protects people whose Part B was already coming out of their Social Security check in December ${holdHarmlessBasis(year).priorYear}.`
              : `a ${money2(hh.priorBenefit)} benefit didn’t cover last December’s ${money2(hh.priorPremium)} premium, so there was no payment left for the rule to protect.`}
        </Callout>,
      );
    }
    if (p.ss && !p.ss.covers) {
      callouts.push(
        <Callout
          key={`short${i}`}
          tone="ember"
          title={`${who}The check is smaller than the Medicare deductions`}
        >
          A {money2(p.ss.benefit)} monthly benefit can’t cover the{" "}
          {money2(p.fromSsCheck)} Social Security would take out for Medicare,
          so the premium can’t all come out of the check. Expect a bill from
          Medicare for what isn’t deducted, and ask Social Security how {your}{" "}
          premium will be paid.
        </Callout>,
      );
    }
  });

  if (year === 2026) {
    const rb = PART_B_REBATE_2026.value;
    callouts.push(
      <Callout
        key="rebate"
        tone={r.rebate > 0 ? "sage" : "sky"}
        title={`The one-time ${money(rb.amount)} Part B rebate (${rb.month})`}
      >
        {r.rebate > 0 ? (
          <>
            People in Original Medicare who don’t pay IRMAA got a one-time{" "}
            {money(rb.amount)} Part B premium rebate in {rb.month}
            {two && r.rebate > rb.amount ? " — each of you" : ""}. After it,
            your 2026 total is {money(r.netAnnualAfterRebate)}.
          </>
        ) : (
          <>
            A one-time {money(rb.amount)} Part B premium rebate went out in{" "}
            {rb.month}, but not to{" "}
            {s.cov === "ma"
              ? "Medicare Advantage members"
              : "people who pay IRMAA"}{" "}
            (or people whose premium Medicaid pays), so it doesn’t apply here.
          </>
        )}
      </Callout>,
    );
  }

  if (s.cov === "ma") {
    callouts.push(
      <Callout
        key="ma"
        tone="sky"
        title="Medicare Advantage doesn’t replace the Part B premium"
      >
        You keep paying Part B ({money2(PART_B[year].value.premium)} standard in{" "}
        {year}) on top of the plan’s own premium — even with a “$0 premium”
        plan. Any Part D IRMAA applies to Advantage drug coverage too.
      </Callout>,
    );
  }

  r.persons.forEach((p, i) => {
    if (p.partA.total <= 0) return;
    const q = (i === 0 ? s.a1 : s.a2) === "30" ? "30 to 39" : "fewer than 30";
    callouts.push(
      <Callout
        key={`pa${i}`}
        tone="sky"
        title={`${two ? `${names[i]}: ` : ""}Part A costs ${money2(p.partA.total)} a month`}
      >
        With {q} quarters of work, Part A isn’t free
        {p.partA.penalty > 0
          ? `, and the late penalty adds ${money2(p.partA.penalty)}`
          : ""}
        . If you’re married — or were for 10 years before a divorce, or are
        widowed — you may get premium-free Part A on your spouse’s record. Ask
        Social Security.
      </Callout>,
    );
  });

  if (r.persons.some((p) => !p.ss)) {
    callouts.push(
      <Callout
        key="bill"
        tone="sky"
        title="Not collecting Social Security yet?"
      >
        Then nothing can be taken out of a check: Medicare sends you a bill for
        Part B{hasD ? " and any Part D IRMAA" : ""}
        {anyPartA ? " and the Part A premium" : ""} instead (every three months
        when it’s only Part B). You can pay online or set up Medicare Easy Pay.
        Once benefits start, the deductions begin automatically.
      </Callout>,
    );
  }

  const hasPerPersonDiff = two;
  const rowsSpec: {
    label: string;
    get: (p: PersonResult) => number;
    show: boolean;
  }[] = [
    {
      label: r.persons.some((p) => p.partB.standardCharged < p.partB.standard)
        ? "Part B premium (after hold-harmless)"
        : "Part B standard premium",
      get: (p) => p.partB.standardCharged,
      show: true,
    },
    {
      label: "Part B late penalty",
      get: (p) => p.partB.penalty,
      show: sumP(r, (p) => p.partB.penalty) > 0,
    },
    {
      label: "Part B IRMAA",
      get: (p) => p.partB.irmaa,
      show: sumP(r, (p) => p.partB.irmaa) > 0,
    },
    { label: planLabel, get: (p) => p.partD.plan, show: hasD },
    {
      label: "Part D IRMAA",
      get: (p) => p.partD.irmaa,
      show: hasD && sumP(r, (p) => p.partD.irmaa) > 0,
    },
    {
      label: "Part D late penalty",
      get: (p) => p.partD.penalty,
      show: hasD && sumP(r, (p) => p.partD.penalty) > 0,
    },
    {
      label: "Part A premium",
      get: (p) => p.partA.total,
      show: sumP(r, (p) => p.partA.total) > 0,
    },
  ];

  const compareRows: { label: string; a: number; b: number }[] = [
    {
      label: "Part B (with any penalty & IRMAA)",
      a: sumP(yA, (p) => p.partB.total),
      b: sumP(yB, (p) => p.partB.total),
    },
    ...(hasD
      ? [
          {
            label: planLabel,
            a: sumP(yA, (p) => p.partD.plan),
            b: sumP(yB, (p) => p.partD.plan),
          },
        ]
      : []),
    ...(hasD &&
    sumP(yA, (p) => p.partD.irmaa + p.partD.penalty) +
      sumP(yB, (p) => p.partD.irmaa + p.partD.penalty) >
      0
      ? [
          {
            label: "Part D IRMAA + late penalty",
            a: sumP(yA, (p) => p.partD.irmaa + p.partD.penalty),
            b: sumP(yB, (p) => p.partD.irmaa + p.partD.penalty),
          },
        ]
      : []),
    ...(sumP(yA, (p) => p.partA.total) + sumP(yB, (p) => p.partA.total) > 0
      ? [
          {
            label: "Part A premium",
            a: sumP(yA, (p) => p.partA.total),
            b: sumP(yB, (p) => p.partA.total),
          },
        ]
      : []),
  ];

  // Taxable-benefits link: a joint return counts both spouses' benefits; a separate return only your own.
  const annualSs = r.persons.reduce(
    (a, p, i) =>
      a + (p.ss && (i === 0 || fs === "mfj") ? p.ss.benefit * 12 : 0),
    0,
  );
  const tssFs =
    fs === "mfs" ? "mfs" : fs === "mfj" ? "mfj" : two ? "mfsApart" : "single";

  // Where each dollar goes: taken from a Social Security check, billed by Medicare, or paid to the plan.
  const deducted = sumP(r, (p) => (p.ss?.covers ? p.fromSsCheck : 0));
  const billed = roundToCents(
    sumP(r, (p) => (p.ss?.covers ? 0 : p.fromSsCheck) + p.billed),
  );

  const result = (
    <>
      <ResultHero
        label={
          two
            ? `Your household’s ${year} Medicare premiums`
            : `Your ${year} Medicare premiums`
        }
        value={
          <>
            {money2(r.totalMonthly)}
            <span className="ml-1 text-[1.4rem] font-normal text-ink-3 sm:text-[1.6rem]">
              /month
            </span>
          </>
        }
        sub={
          <>
            That’s <strong>{money(r.annual)} a year</strong>
            {two ? " for the two of you" : ""}.{" "}
            {deducted > 0 ? (
              <>
                <strong>{money2(deducted)}</strong> a month comes straight out
                of Social Security
                {billed > 0 ? (
                  <>, and Medicare bills you {money2(billed)}</>
                ) : null}
                .
              </>
            ) : billed > 0 ? (
              <>
                Medicare bills you <strong>{money2(billed)}</strong> a month
                directly.
              </>
            ) : null}
            {r.toPlan > 0 ? (
              <>
                {" "}
                The plan premium{two ? "s" : ""} ({money2(r.toPlan)}){" "}
                {two ? "are" : "is"} paid to the plan unless you ask for{" "}
                {two ? "them" : "it"} to come out of your check.
              </>
            ) : null}
          </>
        }
      >
        <div className="mt-4 flex flex-wrap gap-2">
          {projected ? (
            <>
              <StatusChip status="projected">
                2027 Part A/B & IRMAA: projected
              </StatusChip>
              <StatusChip status="official">
                2027 Part D base premium & COLA: official
              </StatusChip>
            </>
          ) : (
            <StatusChip status="official">2026 CMS figures</StatusChip>
          )}
        </div>
      </ResultHero>

      <div className="mt-6">
        <CostBar
          segments={segments}
          caption={`Monthly Medicare premiums by part, ${year}`}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Per year"
          value={money(r.annual)}
          sub={
            year === 2026 && r.rebate > 0
              ? `${money(r.netAnnualAfterRebate)} after the ${money(r.rebate)} rebate`
              : `${money2(r.totalMonthly)} × 12`
          }
        />
        {anySs ? (
          <Stat
            label={
              two
                ? "Social Security checks after Medicare"
                : "Your check after Medicare"
            }
            value={money(sumP(r, (p) => p.ss?.netCheck ?? 0))}
            sub={`a month in ${year}, rounded down to the dollar as SSA pays it`}
          />
        ) : (
          <Stat
            label="Billed by Medicare"
            value={money2(billed)}
            sub="a month (a Part B-only bill comes every three months)"
          />
        )}
        <Stat
          label={year === 2027 ? "Change from 2026" : "Change in 2027"}
          value={signed(monthlyChange)}
          tone={
            monthlyChange > 0.004
              ? "ember"
              : monthlyChange < -0.004
                ? "sage"
                : undefined
          }
          sub={`a month (${signed(cmp.annualChange)} a year), same income`}
        />
      </div>

      {callouts.length ? (
        <div className="mt-6 space-y-3">{callouts}</div>
      ) : null}

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">Line by line</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="table-sy text-[1rem]">
            <caption className="sr-only">
              Monthly Medicare premiums in {year} by item
              {two ? " and person" : ""}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  {hasPerPersonDiff ? `Per month, ${year}` : `${year} premiums`}
                </th>
                {hasPerPersonDiff ? (
                  <>
                    <th scope="col">You</th>
                    <th scope="col">Spouse</th>
                    <th scope="col">Both</th>
                  </>
                ) : (
                  <>
                    <th scope="col">Monthly</th>
                    <th scope="col">Yearly</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rowsSpec
                .filter((x) => x.show)
                .map((x) => (
                  <tr key={x.label}>
                    <td>{x.label}</td>
                    {hasPerPersonDiff ? (
                      <>
                        <td>{money2(x.get(r.persons[0]))}</td>
                        <td>{money2(x.get(r.persons[1]))}</td>
                        <td className="strong">{money2(sumP(r, x.get))}</td>
                      </>
                    ) : (
                      <>
                        <td>{money2(x.get(r.persons[0]))}</td>
                        <td>{money(x.get(r.persons[0]) * 12)}</td>
                      </>
                    )}
                  </tr>
                ))}
              <tr>
                <td className="strong">Total</td>
                {hasPerPersonDiff ? (
                  <>
                    <td className="strong">
                      {money2(r.persons[0].totalMonthly)}
                    </td>
                    <td className="strong">
                      {money2(r.persons[1].totalMonthly)}
                    </td>
                    <td className="strong">{money2(r.totalMonthly)}</td>
                  </>
                ) : (
                  <>
                    <td className="strong">{money2(r.totalMonthly)}</td>
                    <td className="strong">{money(r.annual)}</td>
                  </>
                )}
              </tr>
              {anySs ? (
                <tr>
                  <td>Social Security check after Medicare</td>
                  {hasPerPersonDiff ? (
                    <>
                      <td>
                        {r.persons[0].ss
                          ? money(r.persons[0].ss.netCheck)
                          : "—"}
                      </td>
                      <td>
                        {r.persons[1].ss
                          ? money(r.persons[1].ss.netCheck)
                          : "—"}
                      </td>
                      <td>{money(sumP(r, (p) => p.ss?.netCheck ?? 0))}</td>
                    </>
                  ) : (
                    <>
                      <td>{money(r.persons[0].ss?.netCheck ?? 0)}</td>
                      <td>{money((r.persons[0].ss?.netCheck ?? 0) * 12)}</td>
                    </>
                  )}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">
          {otherYear === 2027
            ? "What changes in 2027"
            : "2026 compared with 2027"}{" "}
          {two ? "(both of you)" : ""}
        </h3>
        <p className="mt-1 text-[1rem] text-ink-3">
          Same income and coverage in both years
          {hasD && r.planPremiumIsAverage
            ? ", with each year’s national-average plan premium"
            : hasD
              ? " and the same plan premium"
              : ""}{" "}
          — only the official and projected Medicare figures change.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="table-sy text-[1rem]">
            <caption className="sr-only">
              Monthly premiums in 2026 and 2027
            </caption>
            <thead>
              <tr>
                <th scope="col">Per month</th>
                <th scope="col">2026</th>
                <th scope="col">2027</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((x) => (
                <tr key={x.label}>
                  <td>{x.label}</td>
                  <td>{money2(x.a)}</td>
                  <td>{money2(x.b)}</td>
                  <td>{signed(x.b - x.a)}</td>
                </tr>
              ))}
              <tr>
                <td className="strong">Total premiums</td>
                <td className="strong">{money2(yA.totalMonthly)}</td>
                <td className="strong">{money2(yB.totalMonthly)}</td>
                <td className="strong">{signed(monthlyChange)}</td>
              </tr>
              {hasD ? (
                <>
                  <tr>
                    <td>Part D deductible (per person, per year)</td>
                    <td>{money(PART_D[2026].value.deductible)}</td>
                    <td>{money(PART_D[2027].value.deductible)}</td>
                    <td>
                      {signed(
                        PART_D[2027].value.deductible -
                          PART_D[2026].value.deductible,
                        money,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Part D out-of-pocket cap (per person, per year)</td>
                    <td>{money(PART_D[2026].value.outOfPocketCap)}</td>
                    <td>{money(PART_D[2027].value.outOfPocketCap)}</td>
                    <td>
                      {signed(
                        PART_D[2027].value.outOfPocketCap -
                          PART_D[2026].value.outOfPocketCap,
                        money,
                      )}
                    </td>
                  </tr>
                </>
              ) : null}
              <tr>
                <td>Part B deductible (per person, per year)</td>
                <td>{money(PART_B[2026].value.deductible)}</td>
                <td>{money(PART_B[2027].value.deductible)}</td>
                <td>
                  {signed(
                    PART_B[2027].value.deductible -
                      PART_B[2026].value.deductible,
                    money,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {hasD ? (
          <p className="mt-3 text-[1rem] text-ink-2">
            Beyond premiums, the most anyone pays for covered Part D drugs is
            the out-of-pocket cap: {money(PART_D[2026].value.outOfPocketCap)} in
            2026 and {money(PART_D[2027].value.outOfPocketCap)} in 2027{" "}
            <StatusChip status={PART_D[2027].status} />. After that, covered
            drugs cost $0 for the rest of the year.
          </p>
        ) : null}
      </div>

      <ShowMath>
        <div className="space-y-5">
          {r.persons.map((p, i) => {
            const lateB = i === 0 ? s.b1 : s.b2;
            const lateD = i === 0 ? s.d1 : s.d2;
            const hh = p.ss?.holdHarmless;
            const std = p.partB.standard;
            return (
              <div key={i}>
                {two ? <p className="font-bold text-ink">{names[i]}</p> : null}
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Standard Part B premium for {year}:{" "}
                    <a
                      className="link"
                      href={PART_B[year].source.url}
                      target="_blank"
                      rel="noopener"
                    >
                      {money2(std)}
                    </a>{" "}
                    (
                    {PART_B[year].status === "official"
                      ? "CMS, official"
                      : "2026 Medicare Trustees Report projection"}
                    ).
                    {hh && (hh.protected || hh.previous?.protected) ? (
                      <>
                        {" "}
                        Hold-harmless (the payment after Part B, rounded down to
                        the dollar, can’t shrink):
                        {hh.previous?.protected ? (
                          <>
                            {" "}
                            in 2026, ≈{money2(hh.previous.priorBenefit)} −{" "}
                            {money2(hh.previous.priorPremium)} →{" "}
                            {money(hh.previous.decPayment)} paid in December{" "}
                            {HH_FIRST}, so 2026 Part B ={" "}
                            {money2(hh.previous.newBenefit)} −{" "}
                            {money(hh.previous.decPayment)} ={" "}
                            {money2(hh.previous.standardPaid)};
                          </>
                        ) : null}{" "}
                        in {year}, {year === 2026 ? "≈" : ""}
                        {money2(hh.priorBenefit)} − {money2(hh.priorPremium)} →{" "}
                        {money(hh.decPayment)} paid in December {year - 1}, and{" "}
                        {money2(hh.newBenefit)} − {money(hh.decPayment)} ={" "}
                        {money2(hh.cap)}
                        {hh.protected ? (
                          <>
                            , below the standard premium, so the standard part
                            is{" "}
                            <strong>{money2(p.partB.standardCharged)}</strong>.
                          </>
                        ) : (
                          <>
                            , not below the standard premium, so the full
                            premium applies.
                          </>
                        )}
                      </>
                    ) : null}
                  </li>
                  {lateB > 0 ? (
                    <li>
                      Late penalty: {lateB} months → {p.lateBPeriods} full
                      12-month period{p.lateBPeriods === 1 ? "" : "s"} ×{" "}
                      {pct(PENALTIES.value.partBPerFull12Months, 0)} ={" "}
                      {pct(p.partB.penaltyPct, 0)}. {money2(std)} ×{" "}
                      {(1 + p.partB.penaltyPct).toFixed(2)} ={" "}
                      {money2(std * (1 + p.partB.penaltyPct))}, rounded to the
                      nearest 10 cents ={" "}
                      <a
                        className="link"
                        href={SRC_MEDICARE_EXTRA.ecfr40827.url}
                        target="_blank"
                        rel="noopener"
                      >
                        {money2(std + p.partB.penalty)}
                      </a>{" "}
                      → penalty <strong>{money2(p.partB.penalty)}</strong>.
                    </li>
                  ) : null}
                  <li>
                    IRMAA: {fs === "mfj" ? "joint " : ""}MAGI {money(p.magi)} on
                    the {taxYear} return ({FILING_WORDS[fs]}) is{" "}
                    {rangeText(tierRange(sched, fs, p.tier))}
                    {" → "}
                    {p.tier === 0 ? (
                      <strong>no IRMAA</strong>
                    ) : (
                      <>
                        tier {p.tier} ({IRMAA_PCT[p.tier]}% of program cost):{" "}
                        <strong>+{money2(p.partB.irmaa)}</strong> Part B
                        {hasD ? (
                          <>
                            , <strong>+{money2(p.partD.irmaa)}</strong> Part D
                          </>
                        ) : null}
                      </>
                    )}
                    .
                  </li>
                  {p.partB.penalty > 0 || p.partB.irmaa > 0 ? (
                    <li>
                      Part B total: {money2(p.partB.standardCharged)}
                      {p.partB.penalty > 0
                        ? ` + ${money2(p.partB.penalty)}`
                        : ""}
                      {p.partB.irmaa > 0 ? ` + ${money2(p.partB.irmaa)}` : ""} ={" "}
                      <strong>{money2(p.partB.total)}</strong>.
                    </li>
                  ) : null}
                  {hasD ? (
                    <li>
                      {s.cov === "ma" ? "Medicare Advantage" : "Part D"}: plan{" "}
                      {money2(p.partD.plan)}
                      {r.planPremiumIsAverage ? " (national average)" : ""}
                      {p.partD.irmaa > 0
                        ? ` + IRMAA ${money2(p.partD.irmaa)}`
                        : ""}
                      {lateD > 0 ? (
                        <>
                          {" "}
                          + late penalty {pct(
                            PENALTIES.value.partDPerMonth,
                            0,
                          )}{" "}
                          × {money2(PART_D[year].value.baseBeneficiaryPremium)}{" "}
                          × {Math.floor(lateD)} ={" "}
                          {money2(partDPenaltyRaw(year, lateD))} →{" "}
                          {money2(p.partD.penalty)}
                        </>
                      ) : null}
                      {p.partD.irmaa > 0 || p.partD.penalty > 0 ? (
                        <>
                          {" "}
                          = <strong>{money2(p.partD.total)}</strong>
                        </>
                      ) : null}
                      .
                    </li>
                  ) : null}
                  {p.partA.total > 0 ? (
                    <li>
                      Part A premium: {money2(p.partA.premium)}
                      {p.partA.penalty > 0
                        ? ` + ${pct(PART_A_PENALTY.value.rate, 0)} late penalty ${money2(p.partA.penalty)}`
                        : ""}{" "}
                      = <strong>{money2(p.partA.total)}</strong> (
                      {PART_A[year].status === "official"
                        ? "CMS, official"
                        : "Trustees projection"}
                      ).
                    </li>
                  ) : null}
                  {p.ss ? (
                    <li>
                      Social Security: {money2(p.ss.benefit)}
                      {year === 2027
                        ? ` (2026 benefit + ${holdHarmlessBasis(2027).colaPct}% COLA, rounded down to the dime)`
                        : ""}
                      {p.ss.covers ? (
                        <>
                          {" "}
                          − Medicare deductions {money2(p.fromSsCheck)} ={" "}
                          {money2(p.ss.benefit - p.fromSsCheck)}, paid as{" "}
                          <strong>{money(p.ss.netCheck)}</strong> (rounded down
                          to the dollar).
                        </>
                      ) : (
                        <>
                          {" "}
                          is less than the {money2(p.fromSsCheck)} of Medicare
                          deductions, so the payment is{" "}
                          <strong>{money(0)}</strong> and Medicare bills the
                          rest.
                        </>
                      )}
                    </li>
                  ) : null}
                </ol>
              </div>
            );
          })}
          <p>
            Late-penalty rules: 42 CFR §408.22–408.27 (Part B) and §423.286
            (Part D). IRMAA tiers: SSA POMS HI 01101.020. Rounding: Medicare
            premiums to the nearest 10 cents; Social Security payments down to
            the whole dollar.{" "}
            <a
              className="link"
              href={SRC.medicareGovPenalty.url}
              target="_blank"
              rel="noopener"
            >
              Medicare.gov penalty rules
            </a>
            .
          </p>
        </div>
      </ShowMath>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/irmaa-calculator?year=${year}&fs=${fs}&magi=${Math.round(s.magi)}`}
          className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
        >
          <Icon name="shield" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">
              How close am I to an IRMAA line?
            </span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">
              Build your MAGI from your tax return and see the next cliff.
            </span>
          </span>
        </Link>
        {annualSs > 0 ? (
          <Link
            href={`/taxable-social-security-calculator?fs=${tssFs}&ss=${Math.round(annualSs)}`}
            className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
          >
            <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
            <span>
              <span className="block font-bold text-ink">
                Is my Social Security taxable?
              </span>
              <span className="mt-1 block text-[0.95rem] text-ink-3">
                Medicare premiums don’t lower the taxable amount — check it.
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href="/social-security-cola"
            className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
          >
            <Icon name="spark" size={20} className="mt-0.5 text-sun-ink" />
            <span>
              <span className="block font-bold text-ink">
                What the 2027 COLA does to your check
              </span>
              <span className="mt-1 block text-[0.95rem] text-ink-3">
                The raise, and how much Medicare takes back.
              </span>
            </span>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <CalculatorShell
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar
              tool="medicare"
              subject={`Our ${year} Medicare premium estimate`}
            />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              Uses CMS’s 2026 premiums and IRMAA table; 2027 Part B and IRMAA
              amounts are 2026 Trustees Report projections until CMS publishes
              them. Last verified {longDate(SITE.dataVerifiedOn)}.
            </p>
          </div>
        </>
      }
      mobileSummary={`${year} Medicare: ${money2(r.totalMonthly)}/mo`}
    />
  );
}
