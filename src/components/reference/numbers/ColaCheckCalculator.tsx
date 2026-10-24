"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { StatusChip } from "@/components/tool/StatusChip";
import { NumberField, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, str, bool } from "@/hooks/useUrlState";
import { colaCheck, type MedicareRates, type PremiumSituation } from "./cola-math";
import { AVG_BENEFITS, COLA } from "@/data/params/social-security";
import { IRMAA_2026, IRMAA_2027, PART_B } from "@/data/params/medicare";
import { SRC } from "@/data/params/sources";
import { COLA_2027_DATES, SRC_EXTRA } from "@/data/params/numbers-extra";
import { SITE } from "@/lib/site";
import { money, money2, longDate } from "@/lib/format";
import { roundDownToDollar, roundToCents } from "@/lib/calc/dates";
import { track } from "@/lib/analytics";

type Med = "std" | "irmaa" | "hh" | "none";

const COLA_PCT = COLA[2027].value;
const B_NOW = PART_B[2026].value.premium;
const B_NEXT = PART_B[2027];
const RATES: MedicareRates = {
  partBNow: B_NOW,
  partBNext: B_NEXT.value.premium,
  irmaaBNow: IRMAA_2026.partBAddOn,
  irmaaBNext: IRMAA_2027.partBAddOn,
  irmaaDNow: IRMAA_2026.partDAddOn,
  irmaaDNext: IRMAA_2027.partDAddOn,
};

const DEFAULTS = {
  /** SSA's average retired-worker benefit just before the 2027 COLA. */
  ben: AVG_BENEFITS.value[0].jan2027Before,
  med: "std" as Med,
  tier: 1,
  d: true,
  hhp: B_NOW,
};

const MED_OPTIONS: { value: Med; label: string }[] = [
  { value: "std", label: `The standard Part B premium (${money2(B_NOW)})` },
  { value: "irmaa", label: "More than that — I pay IRMAA (a surcharge for higher incomes)" },
  { value: "hh", label: "Less than that — a reduced “hold-harmless” premium" },
  { value: "none", label: "Nothing — no Part B, Medicaid pays it, or I’m billed directly" },
];

const TIERS = [1, 2, 3, 4, 5] as const;
const TIER_OPTIONS = TIERS.map((t) => ({
  value: t,
  label: `Tier ${t}: ${money2(roundToCents(IRMAA_2026.standardPartB + IRMAA_2026.partBAddOn[t]))} a month for Part B`,
}));

/** Input bound for the benefit field (no Social Security benefit comes close: see the maximum-benefit table on the page). */
const BEN_MAX = 10000;

const clampTier = (t: number) => Math.min(5, Math.max(1, Math.round(t))) as (typeof TIERS)[number];

export function ColaCheckCalculator() {
  const { state: s, set } = useUrlState(DEFAULTS, {
    ben: num,
    med: str(["std", "irmaa", "hh", "none"] as const),
    tier: num,
    d: bool,
    hhp: num,
  });

  const tier = clampTier(s.tier);
  const situation: PremiumSituation = s.med === "irmaa" ? (`i${tier}` as PremiumSituation) : s.med;
  const r = colaCheck({
    benefit: Math.max(0, s.ben),
    colaPct: COLA_PCT,
    situation,
    // An emptied "premium now" field means "not entered yet", not a $0 premium: fall back to the standard premium.
    heldHarmlessPremiumNow: s.hhp > 0 ? s.hhp : undefined,
    partDIrmaa: s.med === "irmaa" && s.d,
    rates: RATES,
  });
  /** Nothing entered (or 0 / a negative number), or an impossible amount: ask for the benefit instead of showing a bogus result. */
  const tooBig = s.ben > BEN_MAX;
  const empty = r.benefitNow <= 0 || tooBig;

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    if (empty) return;
    const key = `${situation}|${Math.round(r.benefitNow / 250)}|${r.netRaise}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_cola_result", {
        med: s.med,
        tier: s.med === "irmaa" ? tier : 0,
        bucket: Math.round(r.benefitNow / 250) * 250,
        raise: Math.round(r.netRaise / 10) * 10,
        held_harmless: r.heldHarmless,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [empty, situation, s.med, tier, r.benefitNow, r.netRaise, r.heldHarmless]);

  const hasMedicare = s.med !== "none";
  const raw = roundToCents(r.benefitNow * (1 + COLA_PCT / 100));

  const inputs = (
    <>
      <NumberField
        label="Your monthly Social Security benefit now"
        prefix="$"
        decimals={2}
        value={s.ben}
        onChange={(v) => set("ben", v ?? 0)}
        min={0}
        max={BEN_MAX}
        hint={
          <>
            The amount <strong>before</strong> Medicare is taken out — it’s on your 2026 COLA letter and in your my Social Security account. Only know your
            deposit? Add back what Medicare takes (usually {money2(B_NOW)}).
          </>
        }
      />
      <SelectField label="What does Medicare take out of your check now?" value={s.med} onChange={(v) => set("med", v)} options={MED_OPTIONS} />
      {s.med === "irmaa" ? (
        <>
          <SelectField
            label="Your IRMAA tier in 2026"
            value={tier}
            onChange={(v) => set("tier", v)}
            options={TIER_OPTIONS}
            hint={`Pick the Part B amount on your ${IRMAA_2026.premiumYear} notice. We assume the same tier in ${IRMAA_2027.premiumYear} — it’s set by your ${IRMAA_2027.magiTaxYear} tax return.`}
          />
          <Toggle
            label="I also have Part D drug coverage"
            checked={s.d}
            onChange={(v) => set("d", v)}
            hint="People who pay IRMAA pay a Part D surcharge too, and it usually comes out of the same check."
          />
        </>
      ) : null}
      {s.med === "hh" ? (
        <NumberField
          label="Part B premium taken out now"
          prefix="$"
          decimals={2}
          value={s.hhp}
          onChange={(v) => set("hhp", v ?? B_NOW)}
          min={0}
          max={B_NOW}
          hint={`Some people with small checks pay less than ${money2(B_NOW)} because of the hold-harmless rule. Use the amount on your 2026 notice.`}
        />
      ) : null}
    </>
  );

  // Benefits smaller than the Medicare premium can't have it deducted: Medicare bills the premium instead.
  const billed = r.deductionsExceedBenefit;
  const grossNow = roundDownToDollar(r.benefitNow);
  const grossNext = roundDownToDollar(r.benefitNext);
  const shownRaise = billed ? grossNext - grossNow : r.netRaise;
  const shownSign = shownRaise > 0 ? "+" : shownRaise < 0 ? "−" : "";
  const shownRaiseText = `${shownSign}${money(Math.abs(shownRaise))}`;
  const medicareMore = money2(Math.max(0, r.medicareIncrease));

  let heroLabel = "Your January 2027 payment (estimate)";
  let heroValue = money(r.netNext);
  let heroTone: "ink" | "sage" | "ember" = "ink";
  let heroSub: React.ReactNode;
  if (billed) {
    heroLabel = "Your January 2027 benefit (estimate)";
    heroValue = money(grossNext);
    heroSub =
      r.deductionsNext > r.benefitNext ? (
        <>
          Up {money2(r.colaDollars)} ({COLA_PCT}%). Medicare’s {money2(r.deductionsNext)} a month is more than your whole check, so it usually can’t be taken
          out of it — Medicare bills you for it separately instead.
        </>
      ) : (
        <>
          Up {money2(r.colaDollars)} ({COLA_PCT}%). Today’s {money2(r.deductionsNow)} Medicare premium is more than your current check, so it isn’t taken out
          now — Medicare bills you instead. Your COLA letter will show whether Social Security starts deducting it.
        </>
      );
  } else if (r.netRaise > 0) {
    heroSub = (
      <>
        That’s <strong>{money(r.netRaise)} a month more</strong> than the {money(r.netNow)} you get now — about <strong>{money(r.netRaiseYear)} a year</strong>.
        {hasMedicare ? (
          <>
            {" "}
            The {COLA_PCT}% raise adds {money2(r.colaDollars)}; Medicare takes {medicareMore} of it.
          </>
        ) : null}
      </>
    );
  } else if (r.heldHarmless) {
    heroTone = "sage";
    heroSub = (
      <>
        Your payment stays at {money(r.netNow)}. The {COLA_PCT}% raise ({money2(r.colaDollars)}) all goes to the higher Part B premium, but the hold-harmless rule
        stops your check from shrinking.
      </>
    );
  } else {
    heroTone = "ember";
    heroSub = (
      <>
        {r.netRaise < 0 ? <>Your payment goes down {money(-r.netRaise)} a month</> : <>Your payment doesn’t grow</>}: the {COLA_PCT}% raise adds{" "}
        {money2(r.colaDollars)}, but Medicare takes {medicareMore} more.
      </>
    );
  }

  const result = empty ? (
    <ResultHero
      label="Your January 2027 payment"
      value="—"
      sub={
        tooBig
          ? `That’s more than any monthly Social Security benefit. Enter your monthly amount (under ${money(BEN_MAX)}), not a yearly total.`
          : "Enter your monthly Social Security benefit (the amount before Medicare is taken out) to see your new check."
      }
    />
  ) : (
    <>
      <ResultHero label={heroLabel} value={heroValue} tone={heroTone} sub={heroSub} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Benefit before Medicare" value={money2(r.benefitNext)} sub={`Was ${money2(r.benefitNow)}: +${money2(r.colaDollars)} (${COLA_PCT}%)`} />
        <Stat
          label={billed ? "Medicare premium (billed to you)" : "Taken out for Medicare"}
          value={hasMedicare ? money2(r.deductionsNext) : "$0"}
          sub={
            hasMedicare ? (
              <>
                Was {money2(r.deductionsNow)}
                {B_NEXT.status !== "official" ? (
                  <span className="mt-1.5 block">
                    <StatusChip status={B_NEXT.status}>2027 premium projected</StatusChip>
                  </span>
                ) : null}
              </>
            ) : (
              "Nothing is deducted"
            )
          }
        />
        <Stat
          label={billed ? "Your raise (before Medicare’s bill)" : hasMedicare ? "Your raise after Medicare" : "Your raise"}
          value={`${shownRaiseText}/mo`}
          sub={`${shownSign}${money(Math.abs(shownRaise) * 12)} a year`}
          tone={shownRaise > 0 ? "sage" : r.heldHarmless ? undefined : "ember"}
        />
      </div>

      <div className="mt-5 space-y-3">
        {hasMedicare && B_NEXT.status !== "official" ? (
          <Callout tone="sun" title={`The 2027 Part B premium is a projection (${money2(B_NEXT.value.premium)})`}>
            It comes from the 2026 Medicare Trustees Report. The Centers for Medicare &amp; Medicaid Services (CMS) announce the official 2027 premium in November, and your COLA letter in December will
            show the exact amount. We’ll update this page the day it’s published.
          </Callout>
        ) : null}
        {r.heldHarmless ? (
          <Callout tone="sage" title="The hold-harmless rule protects you">
            Your COLA is too small to cover the full premium increase, so your Part B premium is capped at {money2(r.partBNext)} instead of{" "}
            {money2(B_NEXT.value.premium)}. That keeps your payment from going down.
          </Callout>
        ) : null}
        {s.med === "irmaa" ? (
          <Callout tone="sky" title="IRMAA payers aren’t protected by hold-harmless">
            Your {IRMAA_2027.premiumYear} surcharge is based on your {IRMAA_2027.magiTaxYear} tax return, so your tier can change even if nothing else does. Check it with the{" "}
            <Link className="link" href="/irmaa-calculator?year=2027">
              IRMAA calculator
            </Link>
            . If your income dropped because you retired, Form SSA-44 can lower it.
          </Callout>
        ) : null}
        {r.deductionsExceedBenefit ? (
          <Callout tone="ember" title="Your benefit is smaller than the Medicare premium">
            When the premium can’t come out of your check, you pay Medicare directly — and the hold-harmless rule doesn’t protect you. If money is tight, ask your
            state about a Medicare Savings Program, which can pay the Part B premium for you. Your COLA letter will show exactly what applies to you.
          </Callout>
        ) : null}
      </div>

      <ShowMath>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Your benefit now: <strong>{money2(r.benefitNow)}</strong> (SSA keeps benefits in whole dimes).
          </li>
          <li>
            {money2(r.benefitNow)} × {(1 + COLA_PCT / 100).toFixed(3)} = {money2(raw)}, rounded <em>down</em> to the dime: <strong>{money2(r.benefitNext)}</strong>.
          </li>
          {hasMedicare ? (
            <li>
              {billed ? "Medicare premium" : "Medicare taken out"} in 2027{B_NEXT.status !== "official" ? " (projected)" : ""}:{" "}
              {r.irmaaTier > 0 ? (
                <>
                  Part B {money2(B_NEXT.value.premium)} standard + {money2(IRMAA_2027.partBAddOn[r.irmaaTier])} IRMAA
                  {r.partDNext > 0 ? <> + Part D IRMAA {money2(r.partDNext)}</> : null} = <strong>{money2(r.deductionsNext)}</strong>
                </>
              ) : r.heldHarmless ? (
                <>
                  Part B capped by hold-harmless at {money2(r.partBNow)} + {money2(r.colaDollars)} = <strong>{money2(r.partBNext)}</strong>
                </>
              ) : (
                <>
                  Part B <strong>{money2(r.partBNext)}</strong>
                </>
              )}
              .
            </li>
          ) : null}
          {billed ? (
            <li>
              {r.deductionsNext > r.benefitNext ? (
                <>
                  Medicare’s {money2(r.deductionsNext)} is more than {money2(r.benefitNext)}, so it isn’t deducted;
                </>
              ) : (
                <>
                  Today’s {money2(r.deductionsNow)} premium is more than {money2(r.benefitNow)}, so it isn’t deducted now;
                </>
              )}{" "}
              your benefit is paid rounded <em>down</em> to the
              dollar: <strong>{money(grossNext)}</strong> (was {money(grossNow)}).
            </li>
          ) : hasMedicare ? (
            <>
              <li>
                {money2(r.benefitNext)} − {money2(r.deductionsNext)} = {money2(roundToCents(r.benefitNext - r.deductionsNext))}, rounded <em>down</em> to the
                dollar: <strong>{money(r.netNext)}</strong>.
              </li>
              <li>
                Today: {money2(r.benefitNow)} − {money2(r.deductionsNow)} → <strong>{money(r.netNow)}</strong>. Difference: <strong>{shownRaiseText} a month</strong>.
              </li>
            </>
          ) : (
            <li>
              Rounded <em>down</em> to the dollar: <strong>{money(r.netNext)}</strong>, up from {money(r.netNow)} — <strong>{shownRaiseText} a month</strong>.
            </li>
          )}
        </ol>
        <p className="mt-3">
          SSA technically raises your primary insurance amount (PIA — your benefit at full retirement age) and then recomputes your check, so your letter can differ
          from this by a few cents, rarely more than a dollar. Rules:{" "}
          <a className="link" href={SRC_EXTRA.ssaColaApplication.url} target="_blank" rel="noopener">
            how SSA applies the COLA
          </a>
          ,{" "}
          <a className="link" href={SRC.fr2026PartB.url} target="_blank" rel="noopener">
            the hold-harmless rule
          </a>
          , and the{" "}
          <a className="link" href={SRC.medicareTrustees2026.url} target="_blank" rel="noopener">
            Trustees’ premium projection
          </a>
          .
        </p>
      </ShowMath>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={`/social-security-earnings-limit-calculator?ben=${Math.floor(r.benefitNext)}&year=2027`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="work" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Still working in 2027?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">See if the earnings test will hold back part of your new check.</span>
          </span>
        </Link>
        <Link href={`/taxable-social-security-calculator?ss=${Math.round(r.benefitNext * 12)}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Will more of it be taxed?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">A bigger benefit raises the income the IRS tests.</span>
          </span>
        </Link>
        <Link href="/medicare-premium-calculator?year=2027&people=1" className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="medicare" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Your full 2027 Medicare costs</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Part B and Part D for one or two people, with any surcharge.</span>
          </span>
        </Link>
        <Link href="/retirement-numbers-2027" className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="table" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Every 2027 number in one table</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Social Security, Medicare, RMD and tax limits, with sources.</span>
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <CalculatorShell
      id="new-check"
      inputsTitle="Your check"
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="cola" subject="Our Social Security check after the 2027 COLA" />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              Uses SSA’s {COLA_PCT}% COLA (announced {longDate(COLA_2027_DATES.value.announced)}) and SSA’s rounding rules. Last verified {longDate(SITE.dataVerifiedOn)}.
            </p>
          </div>
        </>
      }
      mobileSummary={empty ? undefined : `Jan 2027 ${billed ? "benefit" : "check"}: ${heroValue} (${shownRaiseText})`}
    />
  );
}
