"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { LineChart } from "@/components/tool/Charts";
import { StatusChip } from "@/components/tool/StatusChip";
import { NumberField, Segmented, BirthDateField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, numOrNull, bool, date } from "@/hooks/useUrlState";
import { computeEarningsTest, prorateBeforeFra, RET_YEARS, type RetYear } from "@/lib/calc/earnings-test";
import { earliestRetirementMonth, fra as fraOf, fraMonth as fraMonthOf, monthAtAge } from "@/lib/calc/ss-core";
import { fromMonthIndex, monthIndex } from "@/lib/calc/dates";
import { MONTHS, money, money2, moneySmart, pct, longDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { SS_YEAR } from "@/data/params/social-security";
import { SRC } from "@/data/params/sources";
import { DIVORCED_SPOUSE_RET, RET_SRC, SUBSTANTIAL_SERVICES, WITHDRAWAL } from "@/data/params/earnings-test-extra";
import { MonthGrid } from "./MonthGrid";
import { MonthPicker, MonthYearField } from "./LocalFields";
import { EXAMPLE, ageLabel, monthCodec, monthLabel, monthsCodec, monthsList } from "./helpers";

const DEFAULTS = {
  year: EXAMPLE.year as number,
  dob: EXAMPLE.dob,
  start: EXAMPLE.start,
  ben: EXAMPLE.ben,
  earn: EXAMPLE.earn,
  /** FRA year only: earnings January → month before FRA. null = prorate `earn`. */
  bfra: null as number | null,
  /** Grace year (monthly test) on/off, and the "retired" months. */
  first: false,
  rm: [] as number[],
  /** Spouse/child benefits on the worker's record. */
  fam: false,
  famben: 800,
};

const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="link" href={href} target="_blank" rel="noopener">
    {children}
  </a>
);

/** Period life expectancy (years remaining) by exact age: { 67: { male, female } }. Passed in by the page so the full table stays out of the client bundle. */
export type LifeExpectancy = { year: number; byAge: Record<number, { male: number; female: number }> };

export function EarningsTestCalculator({ lifeExpectancy }: { lifeExpectancy?: LifeExpectancy }) {
  const { state: s, set, setState } = useUrlState(DEFAULTS, {
    year: num,
    dob: date,
    start: monthCodec,
    ben: num,
    earn: num,
    bfra: numOrNull,
    first: bool,
    rm: monthsCodec,
    fam: bool,
    famben: num,
  });

  const year: RetYear = (RET_YEARS as number[]).includes(s.year) ? (s.year as RetYear) : EXAMPLE.year;
  const fm = fraMonthOf(s.dob);
  const fraAge = fraOf(s.dob);
  const earliest = earliestRetirementMonth(s.dob);
  /** Earliest claiming age in whole years (62), derived from SSA's earliest-month rule rather than typed in. */
  const earliestAge = Math.floor((earliest - monthAtAge(s.dob, 0)) / 12);

  const r = computeEarningsTest({
    dob: s.dob,
    year,
    monthlyBenefit: s.ben,
    annualEarnings: s.earn,
    earningsBeforeFra: s.bfra,
    benefitStart: s.start,
    graceYear: s.first,
    nonServiceMonths: s.rm,
    familyOnRecord: s.fam ? s.famben : 0,
  });
  const ex = r.exempt;
  const jan = monthIndex(year, 1);
  const dec = monthIndex(year, 12);
  const fraCal = fromMonthIndex(fm);
  const lastMonthBeforeFra = r.phase === "fra-year" ? fraCal.month - 1 : 12;
  /** Empty or negative entries count as $0 everywhere (math hints, outbound links), matching the engine. */
  const earn = Number.isFinite(s.earn) && s.earn > 0 ? s.earn : 0;
  const prorated = prorateBeforeFra(earn, r.monthsBeforeFraInYear);
  const beforeFraLabel = lastMonthBeforeFra === 1 ? `January ${year}` : `January through ${MONTHS[lastMonthBeforeFra - 1]} ${year}`;
  const over = Math.max(0, Math.floor(r.countedEarnings) - ex.annual);
  const ratePct = pct(1 / ex.ratio, 0);
  const countedLabel =
    r.phase === "fra-year" ? (lastMonthBeforeFra === 1 ? `January ${year} earnings` : `earnings for January–${MONTHS[lastMonthBeforeFra - 1]} ${year}`) : `${year} earnings`;
  const limitLabel = r.phase === "fra-year" ? "higher limit for the year you reach full retirement age" : "limit for people under full retirement age all year";
  const startsThisYear = r.benefitStart >= jan && r.benefitStart <= dec;
  const canUseGrace = r.phase !== "after-fra" && r.benefitStart <= dec && r.benefitStart < fm;
  const graceMonths = r.months.filter((m) => m.status !== "not-entitled" && m.status !== "at-fra").map((m) => m.month);
  const withheldMonths = r.months.filter((m) => m.status === "withheld").map((m) => m.month);
  const partialRow = r.partialMonth ? r.months[r.partialMonth - 1] : null;
  const hasFamily = s.fam && s.famben > 0;
  const nearlyAll = r.status === "withheld" && r.chargeableBenefits > 0 && r.totalWithheld >= 0.75 * r.chargeableBenefits;
  const ss = SS_YEAR[year];
  const dobParam = `${s.dob.year}-${s.dob.month}-${s.dob.day}`;

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    const key = `${r.status}|${year}|${Math.round(r.totalWithheld / 500)}|${r.creditingMonths}|${r.graceApplied}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_earnings_test_result", {
        status: r.status,
        year,
        phase: r.phase,
        withheld: Math.round(r.totalWithheld / 1000) * 1000,
        months: r.creditingMonths,
        earnings: Math.round(r.countedEarnings / 10000) * 10000,
        grace: r.graceApplied,
        family: hasFamily,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [r.status, r.phase, r.totalWithheld, r.creditingMonths, r.countedEarnings, r.graceApplied, year, hasFamily]);

  const inputs = (
    <>
      <Segmented
        label="Which year?"
        value={year as number}
        onChange={(v) => set("year", v)}
        options={RET_YEARS.map((y) => ({
          value: y as number,
          label: `${y}${y === SITE.copyrightYear ? " (this year)" : y === SITE.copyrightYear + 1 ? " (next year)" : ""}`,
        }))}
        size="lg"
      />
      <BirthDateField
        label="Your date of birth"
        value={s.dob}
        onChange={(v) => set("dob", v)}
        minYear={1940}
        maxYear={1975}
        hint={
          <>
            Your full retirement age (FRA) is <strong>{fraAge.label}</strong>, reached in <strong>{monthLabel(fm)}</strong>.
          </>
        }
      />
      <MonthYearField
        label="When did (or will) your benefits start?"
        value={r.benefitStart}
        onChange={(v) => set("start", v)}
        minIdx={earliest}
        maxIdx={Math.max(fm, dec)}
        hint={
          r.startClamped ? (
            <span className="text-ember">
              Retirement benefits can’t start before {monthLabel(earliest)}, the first month you’re {earliestAge} for the whole month, so we used that.
            </span>
          ) : (
            "The first month you’re paid for. It’s on your award letter."
          )
        }
      />
      <NumberField
        label="Your monthly Social Security benefit"
        prefix="$"
        value={s.ben}
        onChange={(v) => set("ben", v ?? 0)}
        min={0}
        max={10000}
        hint="Before Medicare premiums or tax are taken out. It’s on your award letter or in your my Social Security account."
      />

      {r.phase === "fra-year" ? (
        <>
          <NumberField
            label={`Your earnings for ${beforeFraLabel}`}
            prefix="$"
            value={s.bfra ?? prorated}
            onChange={(v) => set("bfra", v)}
            min={0}
            max={10000000}
            hint={
              <>
                Only months before {monthLabel(fm)}, when you reach full retirement age, count. From then on you can earn any amount.
              </>
            }
          />
          <details className="explainer" open={s.bfra == null}>
            <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
              <Icon name="chev" size={18} className="chev transition-transform" /> Only know your pay for the whole year?
            </summary>
            <div className="mt-4 space-y-3">
              <NumberField
                label={`Expected earnings for all of ${year}`}
                prefix="$"
                value={s.earn}
                onChange={(v) => setState((p) => ({ ...p, earn: v ?? 0, bfra: null }))}
                min={0}
                max={10000000}
                hint={
                  <>
                    We spread it evenly: {money(earn)} ÷ 12 = {money(Math.floor(earn / 12))} a month × {r.monthsBeforeFraInYear} month
                    {r.monthsBeforeFraInYear === 1 ? "" : "s"} = <strong>{money(prorated)}</strong>. If your pay is uneven (a bonus, seasonal work), type the real
                    figure above instead.
                  </>
                }
              />
              {s.bfra != null ? (
                <button type="button" className="btn btn-ghost" onClick={() => set("bfra", null)}>
                  Use {money(prorated)} instead
                </button>
              ) : null}
            </div>
          </details>
        </>
      ) : (
        <NumberField
          label={`Your expected earnings for ${year}`}
          prefix="$"
          value={s.earn}
          onChange={(v) => set("earn", v ?? 0)}
          min={0}
          max={10000000}
          hint={
            r.phase === "after-fra"
              ? "No limit applies this year, so this doesn’t change anything here."
              : `Gross wages before taxes plus net profit from self-employment, for all of ${year} — including months before your benefits start.`
          }
        />
      )}

      <details className="explainer">
        <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> What counts as earnings?
        </summary>
        <div className="mt-3 grid gap-3 text-[1rem] leading-relaxed text-ink-2 sm:grid-cols-2">
          <div>
            <p className="font-bold text-ink">Counts</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Wages before taxes, including bonuses, commissions and vacation pay</li>
              <li>Net profit from self-employment</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-ink">Doesn’t count</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Pensions and annuities</li>
              <li>IRA and 401(k) withdrawals</li>
              <li>Interest, dividends and other investment income</li>
              <li>Veterans benefits, government or military retirement</li>
            </ul>
          </div>
        </div>
      </details>

      {canUseGrace ? (
        <>
          <Toggle
            label="Use the first-year rule (my “grace year”)"
            checked={s.first}
            onChange={(v) => set("first", v)}
            hint={`In the first year you have a “retired” month, SSA pays a full check for every such month, whatever you earned in the rest of the year. Usually the year you stop working. You get it once.`}
          />
          {s.first ? (
            <MonthPicker
              label={`Months of ${year} you’re retired`}
              selected={s.rm.filter((m) => graceMonths.includes(m))}
              enabled={graceMonths}
              onChange={(v) => set("rm", v)}
              hint={
                <>
                  A month counts if your wages are {money(ex.monthly)} or less and you work under {SUBSTANTIAL_SERVICES.value.neverBelowHours} hours in your own
                  business (up to {SUBSTANTIAL_SERVICES.value.generallyAboveHours} hours can still count unless it’s highly skilled work).
                </>
              }
            />
          ) : null}
        </>
      ) : null}

      <Toggle
        label="My spouse or a child also gets benefits on my record"
        checked={s.fam}
        onChange={(v) => set("fam", v)}
        hint={`Your earnings can hold back their checks too. An ex-spouse isn’t affected if you’ve been divorced ${DIVORCED_SPOUSE_RET.value.divorceYears}+ years or you were already collecting before the divorce.`}
      />
      {s.fam ? (
        <NumberField
          label="Their monthly benefits, combined"
          prefix="$"
          value={s.famben}
          onChange={(v) => set("famben", v ?? 0)}
          min={0}
          max={20000}
          hint="Only benefits paid on your work record. Their own earnings affect only their own checks."
        />
      ) : null}
    </>
  );

  const links = (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <Link
        href={`/social-security-break-even-calculator?dob=${dobParam}${r.piaEstimate ? `&pia=${Math.round(r.piaEstimate)}` : ""}`}
        className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
      >
        <Icon name="clock" size={20} className="mt-0.5 text-sun-ink" />
        <span>
          <span className="block font-bold text-ink">Was claiming early worth it?</span>
          <span className="mt-1 block text-[0.95rem] text-ink-3">Compare claiming now with waiting for full retirement age.</span>
        </span>
      </Link>
      <Link
        href={`/taxable-social-security-calculator?ss=${Math.round(r.workerPaid)}&other=${Math.round(earn)}`}
        className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
      >
        <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
        <span>
          <span className="block font-bold text-ink">Will your benefits be taxed?</span>
          <span className="mt-1 block text-[0.95rem] text-ink-3">Wages plus benefits can make part of your Social Security taxable.</span>
        </span>
      </Link>
    </div>
  );

  const workingRaises = (
    <Callout tone="sky" title="Working can still raise your benefit">
      Each year SSA checks whether your new earnings are higher than one of the years your benefit is based on. If they are, your check goes up — back to January
      of the following year. <ExtLink href={SRC.ssaWhileWorking.url}>SSA explains</ExtLink>.
    </Callout>
  );

  let result: React.ReactNode;
  if (r.status === "after-fra") {
    result = (
      <>
        <ResultHero
          label={`Withheld from your ${year} benefits`}
          value="$0"
          tone="sage"
          sub={
            <>
              You {fm < jan ? "reached" : "reach"} full retirement age in <strong>{monthLabel(fm)}</strong>, so there’s no earnings limit in {year}. Earn as much as you like — SSA won’t hold back
              a dollar.
            </>
          }
        />
        <div className="mt-5">{workingRaises}</div>
      </>
    );
  } else if (r.status === "starts-at-fra") {
    result = (
      <>
        <ResultHero
          label={`Withheld from your ${year} benefits`}
          value="$0"
          tone="sage"
          sub={
            <>
              Your benefits start in <strong>{monthLabel(r.benefitStart)}</strong>, at or after your full retirement age ({monthLabel(fm)}). The earnings test never
              applies to you.
            </>
          }
        />
        <div className="mt-5">{workingRaises}</div>
      </>
    );
  } else if (r.status === "not-collecting") {
    const sy = fromMonthIndex(r.benefitStart).year;
    result = (
      <>
        <ResultHero
          label={`Withheld from your ${year} benefits`}
          value="$0"
          tone="sage"
          sub={
            <>
              Your benefits start in <strong>{monthLabel(r.benefitStart)}</strong>, after {year}, so there’s nothing to withhold in {year}.
            </>
          }
        />
        {sy < fraCal.year || (sy === fraCal.year && r.benefitStart < fm) ? (
          <div className="mt-5">
            <Callout tone="sun" title={`Heads-up for ${sy}`}>
              All of your {sy} earnings{sy === fraCal.year ? ` before ${monthLabel(fm)}` : ""} will count against that year’s limit — even months before your first
              check. The first-year rule can protect the months you’re retired.
            </Callout>
          </div>
        ) : null}
      </>
    );
  } else if (r.status === "under-limit") {
    result = (
      <>
        <ResultHero
          label={`Withheld from your ${year} benefits`}
          value="$0"
          tone="sage"
          sub={
            <>
              Your {countedLabel} of {money(r.countedEarnings)} are under your {year} limit of <strong>{money(ex.annual)}</strong>. You could earn{" "}
              <strong>{money(r.headroom)}</strong> more before SSA holds back anything.
            </>
          }
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label={`Your ${year} limit`} value={money(ex.annual)} sub={r.phase === "fra-year" ? "Year you reach FRA" : "Under FRA all year"} />
          <Stat label="Room left" value={money(r.headroom)} tone="sage" sub="Before any withholding" />
          <Stat label={`Benefits in ${year}`} value={money(r.benefitsDue)} sub="Paid in full" />
        </div>
        <h3 className="mt-8 text-[1.3rem] font-semibold">Your {year} checks</h3>
        <div className="mt-3">
          <MonthGrid year={year} months={r.months} />
        </div>
        {links}
      </>
    );
  } else if (r.status === "protected") {
    result = (
      <>
        <ResultHero
          label={`Withheld from your ${year} benefits`}
          value="$0"
          tone="sage"
          sub={
            r.familyMonthly <= 0 ? (
              <>
                Enter your monthly benefit to see which checks are held back. You’re {money(over)} over the {year} limit, so SSA would withhold{" "}
                <strong>{money(r.excess)}</strong> from your checks.
              </>
            ) : r.graceApplied ? (
              <>
                You’re {money(over)} over the limit, but the first-year rule pays a full check for every retired month — and those are the only months you collect
                in {year}. Without the rule SSA would hold back <strong>{money(r.withheldWithoutGrace ?? 0)}</strong>.
              </>
            ) : (
              <>You’re over the limit, but none of your {year} checks can be withheld.</>
            )
          }
        />
        {r.familyMonthly > 0 ? (
          <>
            <h3 className="mt-8 text-[1.3rem] font-semibold">Your {year} checks</h3>
            <div className="mt-3">
              <MonthGrid year={year} months={r.months} />
            </div>
          </>
        ) : null}
        {links}
      </>
    );
  } else {
    const a = r.arf;
    const be = r.breakEven;
    const le = lifeExpectancy?.byAge[fraAge.years];
    const beAge = be ? be.ageMonths / 12 : null;
    const beShown = be != null && beAge != null && beAge <= 100;
    const chartEnd = Math.min(100, Math.max(90, beShown && beAge != null ? Math.ceil(beAge) + 3 : 90));
    const chartStart = Math.floor(fraAge.total / 12);
    const chartPoints = a
      ? Array.from({ length: chartEnd - chartStart + 1 }, (_, i) => {
          const age = chartStart + i;
          return { x: age, y: Math.max(0, age * 12 - fraAge.total) * a.increase };
        })
      : [];
    result = (
      <>
        <ResultHero
          label={hasFamily ? `Withheld from your family’s ${year} benefits` : `Withheld from your ${year} benefits`}
          value={money(r.totalWithheld)}
          tone="ember"
          sub={
            <>
              You’re {money(over)} over the {year} limit, and SSA keeps $1 of every ${ex.ratio} over it. It does that by holding back whole checks:{" "}
              {withheldMonths.length ? <strong>{monthsList(withheldMonths)}</strong> : null}
              {partialRow ? (
                <>
                  {withheldMonths.length ? ", plus " : ""}your <strong>{MONTHS[partialRow.month - 1]}</strong> check, of which {money(partialRow.paidLater)} comes back
                  after the year ends
                </>
              ) : null}
              . You still get {money(r.totalPaid)} of {money(r.benefitsDue)}
              {hasFamily ? " in family benefits" : ""} for {year}.
            </>
          }
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Over the limit" value={money(over)} sub={`Limit: ${money(ex.annual)}`} />
          <Stat label="Withholding rate" value={`$1 per $${ex.ratio}`} tone="ember" sub={`Like a ${ratePct} tax on the amount over — but you get it back later`} />
          <Stat
            label="Checks held back"
            value={String(r.creditingMonths)}
            sub={partialRow ? `${r.fullMonthsWithheld} in full, 1 partly repaid` : r.creditingMonths === 1 ? "In full" : "All in full"}
          />
        </div>

        {nearlyAll ? (
          <div className="mt-5">
            <Callout tone="ember" title={`Most of your ${year} checks are held back`}>
              {r.excessNotCharged > 0 ? (
                <>
                  Your excess ({money(r.excess)}) is more than all your chargeable checks; the leftover {money(r.excessNotCharged)} is dropped, not carried into{" "}
                  {year + 1}.{" "}
                </>
              ) : null}
              If your benefits started within the last {WITHDRAWAL.value.windowMonths} months, you can withdraw your application: you repay everything you received,
              and later you claim again at a bigger, less-reduced amount. It’s allowed only once (<ExtLink href={RET_SRC.ecfrWithdrawal.url}>20 CFR 404.640</ExtLink>).
            </Callout>
          </div>
        ) : null}
        {r.phase === "under-fra" && startsThisYear && r.benefitStart > jan && !s.first ? (
          <div className="mt-5">
            <Callout tone="sun" title="Earnings before your first check still count">
              SSA counts all of your {year} earnings, even from months before your benefits started. If you stopped working when you claimed, turn on the first-year
              rule above — it can protect every retired month.
            </Callout>
          </div>
        ) : null}
        {r.phase === "fra-year" ? (
          <div className="mt-5">
            <Callout tone="sky" title={`From ${monthLabel(fm)} on, there’s no limit`}>
              Earnings from the month you reach full retirement age don’t count, and those checks are never withheld.
            </Callout>
          </div>
        ) : null}
        {hasFamily ? (
          <div className="mt-5">
            <Callout tone="sun" title="Your family’s checks are held back too">
              SSA takes your excess from your check and your family’s together ({money(r.familyMonthly)} a month), so their checks stop in the same months. Your own
              share of the withholding is {money(r.workerWithheld)}.
            </Callout>
          </div>
        ) : null}

        <h3 className="mt-8 text-[1.3rem] font-semibold">Which {year} checks SSA holds back</h3>
        <div className="mt-3">
          <MonthGrid year={year} months={r.months} />
        </div>
        <p className="mt-3 text-[1rem] leading-relaxed text-ink-3">
          SSA starts with your first check of {year} and keeps going until the {money(r.excess)} is covered
          {r.excessNotCharged > 0 ? ` or every check it can hold is gone; the rest is dropped` : ""}.
          {partialRow
            ? ` Because it holds whole checks, it takes ${money(partialRow.paidLater)} too much — that comes back after the year ends, once SSA has your final earnings.`
            : ""}
        </p>

        {a ? (
          <div className="mt-8">
            <h3 className="text-[1.3rem] font-semibold">You don’t lose it: your check goes up at full retirement age</h3>
            <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-2">
              Every month with a check held back — even partly — counts as a month you didn’t claim. At full retirement age ({monthLabel(fm)}), SSA refigures your
              benefit as if you had started {a.creditingMonths} month{a.creditingMonths === 1 ? "" : "s"} later.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Your benefit now" value={money(s.ben)} sub={`${pct(a.factorBefore, 2)} of your full benefit`} />
              <Stat label={`From ${monthLabel(fm)}`} value={money(a.benefitAfter)} tone="sage" sub={`+${money(a.increase)} a month, for life`} />
              <Stat
                label="Withheld money paid back by"
                value={be ? (beShown ? `Age ${Math.floor(be.ageMonths / 12)}` : "After 100") : "—"}
                sub={
                  be
                    ? beShown
                      ? `${be.ageMonths % 12 ? `and ${be.ageMonths % 12} months · ` : ""}${be.months} higher checks`
                      : "The increase is too small to pay it back"
                    : "The increase rounds to $0"
                }
              />
            </div>
            {be && beShown ? (
              <div className="mt-5">
                <LineChart
                  series={[
                    { name: "Extra paid to you from FRA", color: "var(--sage)", points: chartPoints },
                    { name: `Withheld in ${year}`, color: "var(--ember)", dashed: true, points: chartPoints.map((p) => ({ x: p.x, y: r.workerWithheld })) },
                  ]}
                  xLabel="Age"
                  markers={[{ x: be.ageMonths / 12, label: "Paid back" }]}
                  caption={`Cumulative extra benefits from full retirement age compared with the ${money(r.workerWithheld)} withheld in ${year}`}
                />
              </div>
            ) : null}
            <p className="mt-4 text-[1rem] leading-relaxed text-ink-2">
              {le && lifeExpectancy ? (
                <>
                  For comparison, SSA’s {lifeExpectancy.year} life table gives a {fraAge.years}-year-old man about {le.male.toFixed(1)} more years and a woman about{" "}
                  {le.female.toFixed(1)}.{" "}
                </>
              ) : null}
              This counts only {year}’s withholding — other withheld years add more months and a bigger increase. Future cost-of-living raises grow the increase too,
              so the real payback comes a little sooner.
              {hasFamily ? " Your spouse’s benefit is refigured the same way at their full retirement age if they claimed early." : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          <Callout tone="sky" title="Tell SSA your estimate now">
            SSA withholds based on the earnings estimate you give it. If it only learns your earnings later from your W-2 or tax return, you’ll get an overpayment
            notice and have to pay it back. Update your estimate through my Social Security or by phone.
          </Callout>
        </div>

        <ShowMath>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Earnings that count ({countedLabel}): <strong>{money(r.countedEarnings)}</strong>
              {r.phase === "fra-year" && s.bfra == null ? (
                <>
                  {" "}
                  ({money(Math.floor(earn / 12))} a month × {r.monthsBeforeFraInYear})
                </>
              ) : null}
            </li>
            <li>
              {year} {limitLabel}: <ExtLink href={SRC.ssaRet.url}>{money(ex.annual)}</ExtLink>
            </li>
            <li>
              Over the limit: {money(r.countedEarnings)} − {money(ex.annual)} = <strong>{money(over)}</strong>
            </li>
            <li>
              {money(over)} ÷ {ex.ratio}, rounded down to the dollar = <strong>{money(r.excess)}</strong> to withhold (
              <ExtLink href={RET_SRC.pomsExcess.url}>POMS RS 02501.080</ExtLink>)
            </li>
            <li>
              Charged to whole checks of {money(r.familyMonthly)}
              {hasFamily ? " (your benefit plus your family’s)" : ""}, starting with the first month you’re paid in {year}: {r.fullMonthsWithheld} in full
              {partialRow ? (
                <>
                  , then {money(partialRow.withheld)} of {MONTHS[partialRow.month - 1]} — the whole check is held and {money(partialRow.paidLater)} is paid later
                </>
              ) : null}{" "}
              (<ExtLink href={RET_SRC.pomsSuspensions.url}>POMS RS 02501.100</ExtLink>)
            </li>
            {a ? (
              <>
                <li>
                  Months of reduction when you started ({monthLabel(r.benefitStart)} to {monthLabel(fm)}): {a.reductionMonthsAtStart} → {pct(a.factorBefore, 2)} of
                  your full benefit, so your full benefit is about {money2(a.piaEstimate)}
                </li>
                <li>
                  At full retirement age: {a.reductionMonthsAtStart} − {a.creditingMonths} credited months = {a.reductionMonthsAfter} → {pct(a.factorAfter, 2)} ={" "}
                  <strong>{money(a.benefitAfter)}</strong> a month, rounded down as SSA does (<ExtLink href={RET_SRC.ecfrArf.url}>20 CFR 404.412</ExtLink>)
                </li>
                {be ? (
                  <li>
                    Payback: {moneySmart(r.workerWithheld)} ÷ {money(a.increase)} = {be.months} months after {monthLabel(fm)}, around age {ageLabel(be.ageMonths)}
                  </li>
                ) : null}
              </>
            ) : null}
          </ol>
          <p className="mt-3">
            Your full benefit is estimated from the benefit you entered, so it can differ from SSA’s figure by a dollar or two. Cost-of-living raises are left out.
          </p>
        </ShowMath>

        {links}
      </>
    );
  }

  return (
    <CalculatorShell
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="earnings-test" subject={`Our ${year} Social Security earnings test estimate`} />
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[0.9375rem] text-ink-3">
              <StatusChip status={ss.status} />
              <span>
                Uses SSA’s {year} exempt amounts: {money(ss.value.retUnderFraAnnual)} a year under full retirement age, {money(ss.value.retFraYearAnnual)} in the year you
                reach it. Last verified {longDate(SITE.dataVerifiedOn)}.
              </span>
            </p>
          </div>
        </>
      }
      mobileSummary={`${year} withheld: ${money(r.status === "withheld" ? r.totalWithheld : 0)}`}
    />
  );
}
