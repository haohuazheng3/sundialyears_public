"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { StatusChip } from "@/components/tool/StatusChip";
import { NumberField, Segmented, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, numOrNull, str, bool } from "@/hooks/useUrlState";
import {
  computeIrmaa,
  lifeChangingEventEffect,
  magiFromIncome,
  parseFilingParam,
  projectionRisk,
  rangeLabel,
  scheduleFor,
  surchargeSteps,
  tierName,
  IRMAA_YEARS,
  type IrmaaFiling,
  type IrmaaYear,
} from "@/lib/calc/irmaa";
import { IRMAA_PCT, LIFE_CHANGING_EVENTS } from "@/data/params/medicare";
import { AMENDED_RETURN_WINDOW_YEARS, IRMAA_SRC } from "@/data/params/irmaa-extra";
import { money, money2, moneySmart, longDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { IrmaaBracketTable, IrmaaMfsTable } from "./IrmaaTables";
import { CliffChart } from "./CliffChart";
import {
  CMS_2027_EXPECTED,
  FILING_OPTIONS,
  GROUP_LABEL,
  MISSING_CPI_MONTH,
  PUBLISHED_CPI_MONTHS,
  RETURN_WORD,
  filingAfterEvent,
  rmdCalculatorHref,
} from "./irmaa-content";

type Mode = "auto" | "magi" | "build";

/** The premium year people are planning for (next year), if we have a schedule for it. */
const DEFAULT_YEAR = ((IRMAA_YEARS as number[]).includes(SITE.copyrightYear + 1) ? SITE.copyrightYear + 1 : IRMAA_YEARS[IRMAA_YEARS.length - 1]) as IrmaaYear;
const OTHER_EVENT = -1;

// Illustrative starting inputs (not parameters): a married couple, both on Medicare, a little over the first joint line.
const DEFAULTS = {
  year: DEFAULT_YEAR,
  fs: "mfj" as IrmaaFiling,
  people: 2 as 1 | 2,
  magi: 230000,
  pd: true,
  in: "auto" as Mode,
  rmd: null as number | null,
  wages: 0,
  pens: 0,
  roth: 0,
  tss: 0,
  int: 0,
  tei: 0,
  div: 0,
  cg: 0,
  oth: 0,
  lce: false,
  ev: 3,
  nmagi: null as number | null,
  /** Filing status on the newer return (only asked for marriage, divorce or a spouse's death). */
  nfs: null as IrmaaFiling | null,
};

const yearCodec = {
  parse: (r: string) => ((IRMAA_YEARS as number[]).includes(Number(r)) ? (Number(r) as IrmaaYear) : undefined),
  format: (v: IrmaaYear) => String(v),
};
const peopleCodec = { parse: (r: string) => (r === "1" ? 1 : r === "2" ? 2 : undefined) as 1 | 2 | undefined, format: (v: 1 | 2) => String(v) };
/** Accepts every filing code other calculators link with (hoh / qss → the individual column). */
const fsCodec = { parse: parseFilingParam, format: (v: IrmaaFiling) => v };
const fsOrNullCodec = {
  parse: (r: string) => (r === "" ? null : parseFilingParam(r)),
  format: (v: IrmaaFiling | null) => v ?? "",
};

/** The largest dollar amount the fields accept (a UI limit, not a Medicare parameter). */
const MAX_INPUT = 100_000_000;
const clampMagi = (n: number, min: number) => Math.min(MAX_INPUT, Math.max(min, n));

function sum(...xs: number[]) {
  return xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function IrmaaCalculator() {
  const { state: s, set, setState } = useUrlState(DEFAULTS, {
    year: yearCodec,
    fs: fsCodec,
    people: peopleCodec,
    magi: num,
    pd: bool,
    in: str(["auto", "magi", "build"] as const),
    rmd: numOrNull,
    wages: num,
    pens: num,
    roth: num,
    tss: num,
    int: num,
    tei: num,
    div: num,
    cg: num,
    oth: num,
    lce: bool,
    ev: num,
    nmagi: numOrNull,
    nfs: fsOrNullCodec,
  });

  // A link from the RMD calculator (?rmd=…) opens the income builder with the IRA line filled in.
  const building = s.in === "build" || (s.in === "auto" && s.rmd != null);
  const ira = Math.max(0, s.rmd ?? 0);
  const built = magiFromIncome({
    wages: s.wages,
    pensions: s.pens,
    iraWithdrawals: ira,
    rothConversions: s.roth,
    taxableSocialSecurity: s.tss,
    taxableInterest: s.int,
    taxExemptInterest: s.tei,
    dividends: s.div,
    capitalGains: s.cg,
    otherIncome: s.oth,
  });
  // Links can carry any finite number (?magi=1e300): keep MAGI inside the fields' range so text and chart stay sane.
  const magi = clampMagi(Math.round(building ? built.magi : s.magi), building ? -MAX_INPUT : 0);
  const joint = s.fs === "mfj";
  const people: 1 | 2 = joint ? s.people : 1;
  const input = { year: s.year, filingStatus: s.fs, magi, people, partD: s.pd };
  const r = computeIrmaa(input);
  const risk = projectionRisk(input);
  const schedule = scheduleFor(s.year);
  const taxYear = r.magiTaxYear;
  const projected = r.status !== "official";
  const both = people === 2;
  const eventIndex = s.ev === OTHER_EVENT || (Number.isInteger(s.ev) && s.ev >= 0 && s.ev < LIFE_CHANGING_EVENTS.length) ? s.ev : DEFAULTS.ev;
  // Marriage, divorce and a spouse's death change the filing status; SSA then uses the newer return's table.
  const statusAfter = eventIndex === OTHER_EVENT ? null : filingAfterEvent(LIFE_CHANGING_EVENTS[eventIndex]);
  const newerFs: IrmaaFiling = statusAfter ? (s.nfs ?? statusAfter) : s.fs;
  // Those events also change the household, so the saving is counted for you alone (people: 1).
  const lceInput = statusAfter ? { ...input, people: 1 as const } : input;
  const newerMagi = s.nmagi == null ? null : clampMagi(Math.round(s.nmagi), 0);
  const lce = s.lce && newerMagi != null && eventIndex !== OTHER_EVENT ? lifeChangingEventEffect(lceInput, newerMagi, newerFs) : null;
  const onNewReturn = lce?.statusChanged ? ` on a ${RETURN_WORD[newerFs]} return` : "";

  // One analytics event per settled result (bucketed, no personal data).
  const nearLine = risk ? "projected-line" : r.next && r.next.headroom <= 10000 ? "near-next" : "no";
  const last = useRef("");
  useEffect(() => {
    const key = `${s.year}|${s.fs}|${people}|${r.tier}|${Math.round(magi / 10000)}|${building ? "b" : "m"}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_irmaa_result", {
        year: s.year,
        fs: s.fs,
        people,
        tier: r.tier,
        input: building ? "builder" : "magi",
        magiBucket: Math.round(magi / 10000) * 10000,
        nearLine,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [s.year, s.fs, people, r.tier, magi, building, nearLine]);

  // ── Cliff chart range: from a bit below the first line to a bit past the top tier, always including the reader. ──
  const firstLineMagi = r.rows[0].to ?? 0;
  const topStart = r.rows[r.rows.length - 1].from ?? firstLineMagi * 4;
  let lo = Math.floor((firstLineMagi * 0.6) / 1000) * 1000;
  let hi = Math.ceil((topStart * 1.2) / 1000) * 1000;
  lo = Math.max(0, Math.min(lo, Math.floor((magi * 0.9) / 1000) * 1000));
  hi = Math.max(hi, Math.ceil((magi * 1.1) / 1000) * 1000);
  const steps = surchargeSteps({ year: s.year, filingStatus: s.fs, people, partD: s.pd }, lo, hi);

  const fsForLinks = s.fs === "mfsApart" ? "single" : s.fs;
  // Carry the income builder's lines over only while it is in use (hidden lines may hold stale numbers).
  const otherTaxable = building ? sum(s.wages, s.pens, s.roth, s.int, s.div, s.cg, s.oth) : 0;
  const ssLink = `/taxable-social-security-calculator?${new URLSearchParams({
    fs: s.fs,
    ...(building && ira ? { ira: String(Math.round(ira)) } : {}),
    ...(otherTaxable ? { other: String(Math.round(otherTaxable)) } : {}),
    ...(building && s.tei ? { tei: String(Math.round(s.tei)) } : {}),
  }).toString()}`;
  const premiumLink = `/medicare-premium-calculator?year=${s.year}&fs=${fsForLinks}&magi=${magi}&people=${people}`;

  const inputs = (
    <>
      <Segmented
        label="Which year’s Medicare premiums?"
        value={s.year}
        onChange={(v) => set("year", v)}
        options={IRMAA_YEARS.map((y) => ({ value: y, label: `${y} (${scheduleFor(y).magiTaxYear} income)` }))}
        size="lg"
        hint={`Medicare looks back two years: ${s.year} premiums use your ${taxYear} tax return.`}
      />
      <SelectField
        label={`Filing status on your ${taxYear} tax return`}
        value={s.fs}
        onChange={(v) => set("fs", v)}
        options={FILING_OPTIONS}
        hint={`Married but filed separately? Pick “lived together” if you lived with your spouse at any time in ${taxYear}, even for a day; “lived apart” only if you were apart the whole year.`}
      />
      {joint ? (
        <Segmented
          label="Who is on Medicare?"
          value={s.people}
          onChange={(v) => set("people", v)}
          options={[
            { value: 1, label: "One of us" },
            { value: 2, label: "Both of us" },
          ]}
          size="lg"
          hint="Each spouse on Medicare pays the surcharge, based on your joint income."
        />
      ) : null}

      <Segmented
        label="Your income"
        value={building ? "build" : "magi"}
        onChange={(v) => set("in", v)}
        options={[
          { value: "magi", label: "I know my MAGI" },
          { value: "build", label: "Help me add it up" },
        ]}
        size="lg"
      />

      {!building ? (
        <NumberField
          label={`Your ${taxYear} MAGI (modified adjusted gross income)`}
          prefix="$"
          value={s.magi}
          onChange={(v) => set("magi", v ?? 0)}
          min={0}
          max={MAX_INPUT}
          hint={
            <>
              From your {taxYear} Form 1040: the adjusted gross income line, plus any tax-exempt interest (line 2a).
              {joint ? " Use the joint return’s total." : ""} Not sure?
              Choose “Help me add it up”.
            </>
          }
        />
      ) : (
        <fieldset className="space-y-5">
          <legend className="field-label">Your {taxYear} income (whole household on a joint return)</legend>
          <p className="field-hint !mt-0">Enter yearly amounts. Leave lines that don’t apply at $0. This gets you close; your tax return is exact.</p>
          <NumberField label="Wages and self-employment income" prefix="$" value={s.wages} onChange={(v) => set("wages", v ?? 0)} min={0} max={MAX_INPUT} />
          <NumberField label="Pensions and annuities (taxable part)" prefix="$" value={s.pens} onChange={(v) => set("pens", v ?? 0)} min={0} max={MAX_INPUT} />
          <NumberField
            label="IRA and 401(k) withdrawals, including RMDs"
            prefix="$"
            value={s.rmd ?? 0}
            onChange={(v) => set("rmd", v ?? 0)}
            min={0}
            max={MAX_INPUT}
            hint={
              <>
                Taxable amount only (box 2a of your {taxYear} Form 1099-R). Money you sent straight to charity as a qualified charitable distribution (QCD)
                doesn’t count. Planning a later year?{" "}
                <Link className="link" href={rmdCalculatorHref()}>
                  Work out your required minimum distribution (RMD)
                </Link>
                .
              </>
            }
          />
          <NumberField
            label="Roth conversions"
            prefix="$"
            value={s.roth}
            onChange={(v) => set("roth", v ?? 0)}
            min={0}
            max={MAX_INPUT}
            hint="The full amount converted counts as income that year."
          />
          <NumberField
            label="Taxable Social Security"
            prefix="$"
            value={s.tss}
            onChange={(v) => set("tss", v ?? 0)}
            min={0}
            max={1000000}
            hint={
              <>
                Only the taxable part, not your whole benefit.{" "}
                <Link className="link" href={ssLink}>
                  Find your taxable amount
                </Link>
                .
              </>
            }
          />
          <NumberField label="Taxable interest" prefix="$" value={s.int} onChange={(v) => set("int", v ?? 0)} min={0} max={MAX_INPUT} />
          <NumberField
            label="Tax-exempt interest (municipal bonds)"
            prefix="$"
            value={s.tei}
            onChange={(v) => set("tei", v ?? 0)}
            min={0}
            max={MAX_INPUT}
            hint="It’s free of income tax, but Medicare adds it back. It counts."
          />
          <NumberField
            label="Dividends (ordinary, which include qualified)"
            prefix="$"
            value={s.div}
            onChange={(v) => set("div", v ?? 0)}
            min={0}
            max={MAX_INPUT}
          />
          <NumberField
            label="Capital gains"
            prefix="$"
            value={s.cg}
            onChange={(v) => set("cg", v ?? 0)}
            min={-MAX_INPUT}
            max={MAX_INPUT}
            hint="Net gain for the year, including a home-sale gain above your exclusion. A net loss: enter only the loss your return actually deducts, as a negative number, not your total loss for the year."
          />
          <NumberField
            label="Other taxable income"
            prefix="$"
            value={s.oth}
            onChange={(v) => set("oth", v ?? 0)}
            min={-MAX_INPUT}
            max={MAX_INPUT}
            hint="Rental profit, business income, and so on. Subtract any deductions that lower your adjusted gross income."
          />
          <div className="sunk p-4" aria-live="polite">
            <p className="flex items-baseline justify-between gap-3 text-[1rem] text-ink-2">
              <span>Adjusted gross income</span>
              <span className="num font-bold text-ink">{money(built.agi)}</span>
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3 text-[1rem] text-ink-2">
              <span>+ Tax-exempt interest</span>
              <span className="num font-bold text-ink">{money(built.taxExemptInterest)}</span>
            </p>
            <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-[var(--hairline)] pt-2 text-[1.0625rem] font-bold text-ink">
              <span>MAGI for IRMAA</span>
              <span className="num">{money(built.magi)}</span>
            </p>
          </div>
        </fieldset>
      )}

      <Toggle
        label="I have Part D drug coverage"
        checked={s.pd}
        onChange={(v) => set("pd", v)}
        hint="A stand-alone drug plan, a Medicare Advantage plan with drug coverage, or an employer or union retiree plan that is a Part D plan. Other retiree drug coverage that isn’t Part D carries no Part D surcharge; if unsure, ask the plan."
      />
    </>
  );

  const tierHeadline = r.tier === 0 ? "No IRMAA" : `${tierName(r.tier)} (${IRMAA_PCT[r.tier]}% bracket)`;
  const each = both ? " each" : "";

  const result = (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {projected ? <StatusChip status="projected">{s.year} figures projected</StatusChip> : <StatusChip status="official">{s.year} CMS figures</StatusChip>}
        <span className="pill">Based on your {taxYear} return</span>
      </div>
      {r.tier === 0 ? (
        <ResultHero
          label={`Your ${s.year} IRMAA${both ? " (both of you)" : ""}`}
          value="$0"
          tone="sage"
          sub={
            <>
              <strong>No surcharge.</strong> A {taxYear} MAGI of {money(magi)} is at or below the {money(r.next!.startsAt - 1)} line, so you pay the standard
              Part B premium of {money2(r.standardPartB)} a month{each}.
            </>
          }
        />
      ) : (
        <ResultHero
          label={`Your ${s.year} IRMAA surcharge${both ? " for both of you" : ""}`}
          value={
            <>
              {moneySmart(r.annual.surcharge)}
              <span className="ml-2 align-middle text-[1.25rem] font-normal text-ink-3 sm:text-[1.5rem]">a year</span>
            </>
          }
          tone="ember"
          sub={
            <>
              <strong>{tierHeadline}.</strong> {both ? "Each of you pays" : "You pay"} {money2(r.monthly.partB)} more for Part B
              {r.partD ? ` and ${money2(r.monthly.partD)} more for Part D` : ""} every month of {s.year}, because your {taxYear} MAGI of {money(magi)} falls in
              the “{rangeLabel(r.row)}” row.
            </>
          }
        />
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label={`Part B premium${both ? ", each" : ""}`}
          value={`${money2(r.monthly.partBTotal)}/mo`}
          sub={r.tier === 0 ? "The standard premium" : `Standard is ${money2(r.standardPartB)}`}
          tone={r.tier === 0 ? "sage" : "ember"}
        />
        {r.next ? (
          <Stat
            label="Room before the next tier"
            value={money(r.next.headroom)}
            sub={`${tierName(r.next.tier)} starts at ${money(r.next.startsAt)}: +${money(r.next.extraPerYear)} a year`}
          />
        ) : (
          <Stat label="Room before the next tier" value="—" sub="You’re in the top tier" />
        )}
        {r.lower ? (
          <Stat
            label="Cut to drop a tier"
            value={money(r.lower.cut)}
            sub={`${money(r.lower.maxMagi)} or less saves ${money(r.lower.savingsPerYear)} a year`}
            tone="sage"
          />
        ) : (
          <Stat label="Yearly IRMAA" value="$0" sub={`Standard Part B: ${money(r.annual.standardPartB)} a year${both ? " for both" : ""}`} tone="sage" />
        )}
      </div>

      <div className="mt-6 space-y-4">
        {risk ? (
          <Callout tone="ember" title={`Close to a projected ${s.year} line`}>
            {risk.altLine != null && risk.tierIfAlt !== risk.tier ? (
              <p>
                We project this tier ends at {money(risk.line)}. If CMS fills in the missing {MISSING_CPI_MONTH} inflation number instead of averaging{" "}
                {PUBLISHED_CPI_MONTHS} months, the line lands at {money(risk.altLine)} — and a MAGI of {money(magi)} would be in {tierName(risk.tierIfAlt)},
                costing {money(risk.extraPerYearIfAlt)} more a year. CMS is expected to publish the official {s.year} table in {CMS_2027_EXPECTED}; we’ll
                update this page that day.
              </p>
            ) : risk.altLine != null ? (
              <p>
                We project this tier ends at {money(risk.line)}, but if CMS fills in the missing {MISSING_CPI_MONTH} inflation number the line lands at{" "}
                {money(risk.altLine)}. You’d stay in {tierName(risk.tier)} either way, but your room before the next tier would shrink to{" "}
                {money(risk.distance)}. The official table is due in {CMS_2027_EXPECTED}.
              </p>
            ) : (
              <p>
                Your MAGI is {money(risk.distance)} from the projected {money(risk.line)} line. Both ways of handling the missing {MISSING_CPI_MONTH} inflation
                number give the same line, but it stays a projection until CMS publishes (expected {CMS_2027_EXPECTED}).
              </p>
            )}
          </Callout>
        ) : null}

        {r.lower && r.lower.cut <= r.lower.savingsPerYear ? (
          <Callout tone="ember" title={`$1 over the line costs the whole tier`}>
            <p>
              You’re only {money(r.lower.cut)} over {money(r.lower.maxMagi)}, and that costs {money(r.lower.savingsPerYear)} a year. Your {taxYear} income is
              already locked in, but the same lines (adjusted for inflation) apply to the income you earn this year. Next time, an IRA withdrawal moved to
              January or a smaller Roth conversion would have kept you under.
            </p>
          </Callout>
        ) : r.next && r.next.headroom <= 10000 ? (
          <Callout tone="sun" title={`${money(r.next.headroom)} from the next cliff`}>
            <p>
              Going {money(r.next.headroom + 1)} higher puts you in {tierName(r.next.tier)} for the whole year: +{money(r.next.extraPerYear)}. An extra IRA
              withdrawal, a Roth conversion or a capital gain is enough to do it.
            </p>
          </Callout>
        ) : null}

        {s.fs === "mfs" ? (
          <Callout tone="ember" title="Filing separately while living together is the costliest IRMAA status">
            <p>
              There are no small tiers: above {money(schedule.mfsThreshold)} you jump straight to the {IRMAA_PCT[4]}% bracket (
              {money2(schedule.partBAddOn[4] + (s.pd ? schedule.partDAddOn[4] : 0))} a month), and to the top bracket at {money(schedule.mfsTop)}. If you lived
              apart the entire year, choose “Separately, lived apart” instead.
            </p>
          </Callout>
        ) : null}

        {building && s.in === "auto" && ira > 0 ? (
          <Callout tone="sky" title="We filled in your RMD">
            <p>
              The IRA line shows the {money(ira)} from the RMD calculator. Add your other income (pensions, the taxable part of Social Security, interest,
              dividends) for a real answer. And remember the two-year lag: a {SITE.copyrightYear} withdrawal counts toward {SITE.copyrightYear + 2} premiums, so
              treat the {s.year} lines as a guide.
            </p>
          </Callout>
        ) : null}

        {building && s.tei > 0 ? (
          <Callout tone="sky" title="Tax-free interest still counts">
            <p>Your {money(s.tei)} of municipal-bond interest is free of income tax, but Medicare adds it back when it measures your income.</p>
          </Callout>
        ) : null}
      </div>

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">Your premiums compared with the standard</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl">
          <table className="table-sy text-[1rem]">
            <caption className="sr-only">Your {s.year} Medicare premiums compared with the standard premium</caption>
            <thead>
              <tr>
                <th scope="col">Monthly, per person</th>
                <th scope="col">Standard</th>
                <th scope="col">You</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Part B premium</td>
                <td className="num">{money2(r.standardPartB)}</td>
                <td className="num strong">{money2(r.monthly.partBTotal)}</td>
              </tr>
              <tr>
                <td>Part D IRMAA</td>
                <td className="num">$0</td>
                <td className="num strong">{r.partD ? money2(r.monthly.partD) : "No Part D"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Per year{both ? ", both of you" : ""}</strong>
                </td>
                <td className="num">{money2(r.annual.standardPartB)}</td>
                <td className="num strong">{money2(r.annual.partBTotal + r.monthly.partD * 12 * people)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-3">
          The Part D IRMAA is added on top of your drug plan’s own premium, which depends on the plan you choose.
        </p>
      </div>

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">The IRMAA cliffs</h3>
        <p className="mt-1 text-[1rem] text-ink-3">
          Yearly surcharge{both ? " for both of you" : ""} at each {taxYear} income. Each step is a cliff: one dollar over and you pay the whole next tier.
        </p>
        <div className="mt-4">
          <CliffChart
            points={steps}
            from={lo}
            to={hi}
            magi={magi}
            lines={r.rows.slice(0, -1).map((row) => row.to ?? 0)}
            caption={`${s.year} IRMAA per year by ${taxYear} MAGI${both ? ", both of you" : ""}`}
            rows={r.rows.map((row) => ({ tier: row.tier, range: rangeLabel(row), yearly: steps.find((p) => p.tier === row.tier)?.y ?? 0 }))}
          />
        </div>
      </div>

      <details className="explainer mt-6">
        <summary className="flex min-h-[3.25rem] cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> See the full {s.year} table (you’re in {tierName(r.tier)})
        </summary>
        <div className="mt-3">
          {r.group === "mfsLivedWithSpouse" ? (
            <IrmaaMfsTable year={s.year} highlightTier={r.tier} />
          ) : (
            <IrmaaBracketTable year={s.year} highlight={{ tier: r.tier, group: r.group }} />
          )}
          <p className="mt-3 text-[0.9375rem] text-ink-3">
            <Link className="link" href={`/irmaa-brackets-${s.year}`}>
              {s.year} IRMAA brackets explained
            </Link>
          </p>
        </div>
      </details>

      <ShowMath>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            {s.year} premiums use the {taxYear} tax return. MAGI: <strong>{money(magi)}</strong>
            {building ? ` (adjusted gross income ${money(built.agi)} + tax-exempt interest ${money(built.taxExemptInterest)})` : ""}.
          </li>
          <li>
            Table: {GROUP_LABEL[r.group]}. Row: <strong>{rangeLabel(r.row)}</strong> → {tierHeadline}.
          </li>
          <li>
            Part B: {money2(r.standardPartB)} standard + {money2(r.monthly.partB)} IRMAA = <strong>{money2(r.monthly.partBTotal)}</strong> a month.
          </li>
          <li>
            Part D:{" "}
            {r.partD ? (
              <>
                + <strong>{money2(r.monthly.partD)}</strong> a month on top of the plan premium
              </>
            ) : (
              "no Part D coverage, so no Part D IRMAA"
            )}
            .
          </li>
          <li>
            Yearly IRMAA: ({money2(r.monthly.partB)} + {money2(r.monthly.partD)}) × 12 months{both ? " × 2 people" : ""} ={" "}
            <strong>{moneySmart(r.annual.surcharge)}</strong>.
          </li>
        </ol>
        <p className="mt-3">
          Boundaries follow the CMS wording exactly: a tier applies when MAGI is more than its lower line and at most its upper line; the top bracket starts at
          its line.{" "}
          {projected ? (
            <>
              {s.year} lines are projected with the inflation formula in the law (
              <a className="link" href={schedule.source.url} target="_blank" rel="noopener">
                {schedule.source.publisher} CPI-U data
              </a>
              ); Part B amounts are from the{" "}
              {schedule.amountsSource ? (
                <a className="link" href={schedule.amountsSource.url} target="_blank" rel="noopener">
                  {schedule.amountsSource.label}
                </a>
              ) : (
                "Medicare Trustees Report"
              )}
              ; Part D amounts use the official base premium and the formula in{" "}
              <a className="link" href={IRMAA_SRC.ecfr423_286.url} target="_blank" rel="noopener">
                42 CFR 423.286
              </a>
              .
            </>
          ) : (
            <>
              Source:{" "}
              <a className="link" href={schedule.source.url} target="_blank" rel="noopener">
                {schedule.source.label}
              </a>
              .
            </>
          )}
        </p>
      </ShowMath>

      <section aria-labelledby="lce-h" className="sunk mt-8 space-y-5 p-5">
        <div>
          <h3 id="lce-h" className="text-[1.25rem] font-semibold text-ink">
            Did your income drop because you retired?
          </h3>
          <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">
            Medicare uses your {taxYear} return. If a life-changing event has lowered your income since then, you can ask Social Security to use a newer year
            with Form SSA-44.
          </p>
        </div>
        <Toggle label={`Yes, my income has dropped since ${taxYear}`} checked={s.lce} onChange={(v) => set("lce", v)} />
        {s.lce ? (
          <>
            <SelectField
              label="What happened?"
              value={eventIndex}
              onChange={(v) => setState((prev) => ({ ...prev, ev: v, nfs: null }))}
              options={[
                ...LIFE_CHANGING_EVENTS.map((e, i) => ({ value: i, label: e })),
                { value: OTHER_EVENT, label: "Something else (a big one-time withdrawal, a sale, investment losses)" },
              ]}
            />
            {eventIndex === OTHER_EVENT ? (
              <Callout tone="ember" title="That doesn’t qualify for Form SSA-44">
                <p>
                  Only the events in the list count. A one-time Roth conversion, a home or stock sale, or a market loss isn’t one. The good news: IRMAA is set
                  one year at a time, so a one-off spike only raises one year’s premiums. If the IRS figure Medicare used is wrong, or you filed an amended
                  return within {AMENDED_RETURN_WINDOW_YEARS.value} years of that tax year, Social Security can update it.
                </p>
              </Callout>
            ) : (
              <>
                {statusAfter ? (
                  <SelectField
                    label="Filing status for that newer year"
                    value={newerFs}
                    onChange={(v) => set("nfs", v)}
                    options={FILING_OPTIONS}
                    hint="Social Security uses the table for the newer return’s filing status. After a marriage that is usually a joint return. After a divorce, single. After a spouse’s death you can still file jointly for that year, then usually as single."
                  />
                ) : null}
                <NumberField
                  label={`Your MAGI after the change (${s.year} estimate, or your ${s.year - 1} return)`}
                  prefix="$"
                  value={s.nmagi}
                  onChange={(v) => set("nmagi", v)}
                  min={0}
                  max={MAX_INPUT}
                  hint={
                    statusAfter
                      ? "The MAGI on that return (both of you together on a joint return). Social Security checks your estimate against your tax return later."
                      : "Use the same filing status. Social Security checks your estimate against your tax return later."
                  }
                />
                {r.tier === 0 ? (
                  <Callout tone="sage" title="Nothing to appeal">
                    <p>You don’t owe IRMAA for {s.year}, so there’s nothing to lower.</p>
                  </Callout>
                ) : lce == null ? (
                  <p className="text-[1rem] text-ink-3">Enter your new income to see whether Social Security would lower your surcharge.</p>
                ) : lce.newTier > lce.currentTier ? (
                  <Callout tone="ember" title="Don’t file: the newer year would raise your tier">
                    <p>
                      At {money(newerMagi!)}
                      {onNewReturn} you’d be in {tierName(lce.newTier)}, higher than the {tierName(lce.currentTier)} you pay now. Form SSA-44 only helps when it
                      lowers your tier, so keep the {taxYear} figure Medicare already uses.
                      {lce.statusChanged && newerFs !== "mfj"
                        ? " The single lines are much lower than the joint ones, so a survivor or a divorced spouse can owe more on less income."
                        : ""}
                    </p>
                  </Callout>
                ) : lce.significant ? (
                  <Callout tone="sage" title={`File Form SSA-44: it would save about ${money(lce.savingsPerYear)} a year${statusAfter ? " for you" : ""}`}>
                    <p>
                      At {money(newerMagi!)}
                      {onNewReturn} you’d be in {lce.newTier === 0 ? "no IRMAA tier at all" : tierName(lce.newTier)} instead of {tierName(lce.currentTier)},
                      which counts as a significant reduction. What to do:
                    </p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                      <li>
                        Download{" "}
                        <a className="link" href={IRMAA_SRC.ssa44.url} target="_blank" rel="noopener">
                          Form SSA-44
                        </a>{" "}
                        and tick “{LIFE_CHANGING_EVENTS[eventIndex]}” with the date it happened.
                      </li>
                      <li>
                        Give your new MAGI: your {s.year - 1} return if it shows the drop, or your {s.year} estimate.
                      </li>
                      <li>
                        Attach proof of the event (for retirement, a letter from your employer with your last day of work) and your tax return if you have it.
                      </li>
                      <li>Mail it to, or bring it to, your local Social Security office. Keep a copy.</li>
                      <li>
                        If approved, the change generally applies from January 1 of the year you ask, so ask during the year you’re paying the surcharge, not
                        after it ends.
                      </li>
                    </ol>
                  </Callout>
                ) : !lce.isDrop && !lce.statusChanged ? (
                  <Callout tone="sun" title={`That isn’t lower than your ${taxYear} income`}>
                    <p>
                      Form SSA-44 only helps when your income has gone down. At {money(newerMagi!)} you’d still be in {tierName(lce.newTier)}, so keep the {taxYear}{" "}
                      figure Medicare already uses.
                    </p>
                  </Callout>
                ) : (
                  <Callout tone="sun" title="This change wouldn’t lower your tier">
                    <p>
                      At {money(newerMagi!)}
                      {onNewReturn} you’d still be in {tierName(lce.newTier)}. Social Security only counts a reduction that moves you to a lower tier
                      {lce.targetMagi != null ? `, so you’d need ${money(lce.targetMagi)} or less${onNewReturn}` : ""}.
                    </p>
                  </Callout>
                )}
              </>
            )}
          </>
        ) : null}
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={premiumLink} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="medicare" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">See your whole Medicare bill</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Part B, Part D and any late-enrollment penalties for {s.year}.</span>
          </span>
        </Link>
        <Link href={ssLink} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">How much of your Social Security is taxable?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">The taxable part counts toward IRMAA.</span>
          </span>
        </Link>
        <Link href={rmdCalculatorHref(SITE.copyrightYear)} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="rmd" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Will your RMDs push you over a line?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Required withdrawals count toward IRMAA two years later.</span>
          </span>
        </Link>
        <Link href={`/irmaa-brackets-${s.year}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="chart" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">{s.year} IRMAA brackets</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">
              Every tier for single, joint and separate filers{projected ? ", with how we projected them" : ""}.
            </span>
          </span>
        </Link>
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
            <ShareBar tool="irmaa" subject={`Our ${s.year} Medicare IRMAA estimate`} />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              {projected ? `${s.year} figures are projected until CMS publishes the official table (expected ${CMS_2027_EXPECTED}). ` : `Official CMS figures for ${s.year}. `}
              Last verified {longDate(SITE.dataVerifiedOn)}.
            </p>
          </div>
        </>
      }
      mobileSummary={`${s.year} IRMAA: ${r.tier === 0 ? "$0" : `${money(r.annual.surcharge)}/yr`}`}
    />
  );
}
