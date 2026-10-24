"use client";

import { useDeferredValue, useMemo } from "react";
import { Callout } from "@/components/tool/Result";
import { longDate, money } from "@/lib/format";
import { DEEMED_FILING_DOB, REDUCTION_TIER_MONTHS, SPOUSAL, SURVIVOR } from "@/data/params/ss-claiming-extra";
import { CLAIMING_RULES } from "@/data/params/social-security";
import { monthAtAge, survivorFraForCohort, cohortYear } from "@/lib/calc/ss-core";
import {
  ageLabel,
  ageMonthsIn,
  asOfMonth,
  factorInMonth,
  householdExpected,
  spousalTopUp,
  survivalModel,
  survivorAmount,
  survivorTerms,
  type ExpectedSettings,
  type HouseholdExpected,
  type Person,
  type QxTable,
} from "@/lib/calc/ss-claiming";
import { roundDownToDime, roundDownToDollar } from "@/lib/calc/dates";
import { fractionOfOnePercent, pctOfPia } from "./labels";

export interface HouseholdInput {
  table: QxTable;
  you: Person;
  spouse: Person;
  /** Start months to compare (already moved to the first month still available). */
  youOptions: number[];
  spouseOptions: number[];
  youPlan: number;
  spousePlan: number;
  exp: ExpectedSettings;
}

export interface HouseholdCell {
  you: number;
  spouse: number;
  value: HouseholdExpected;
}

export interface HouseholdGrid {
  cells: HouseholdCell[];
  best: HouseholdCell;
  /** Both start as early as the grid allows. */
  earliest: HouseholdCell;
  plan: HouseholdExpected;
}

/**
 * Survival-weighted household totals for every combination of start months (≤ 3 × 3) plus the couple's own plan.
 * Deferred so typing stays responsive — the grid is the heaviest calculation on the page (~100 ms); moving the
 * "your plan" slider only recomputes the plan, not the grid.
 */
export function useHouseholdGrid(input: HouseholdInput | null): { grid: HouseholdGrid | null; stale: boolean } {
  const deferred = useDeferredValue(input);
  const table = deferred?.table ?? null;
  const you = deferred?.you ?? null;
  const spouse = deferred?.spouse ?? null;
  const youOptions = deferred?.youOptions ?? null;
  const spouseOptions = deferred?.spouseOptions ?? null;
  const exp = deferred?.exp ?? null;
  const youPlan = deferred?.youPlan ?? 0;
  const spousePlan = deferred?.spousePlan ?? 0;

  const models = useMemo(
    () => (table && you && spouse ? { mY: survivalModel(table, you.sex, you.dob.year, you.health), mS: survivalModel(table, spouse.sex, spouse.dob.year, spouse.health) } : null),
    [table, you, spouse],
  );
  const cells = useMemo(() => {
    if (!models || !you || !spouse || !youOptions || !spouseOptions || !exp) return null;
    const out: HouseholdCell[] = [];
    for (const a of youOptions) for (const b of spouseOptions) out.push({ you: a, spouse: b, value: householdExpected(you, a, spouse, b, exp, models.mY, models.mS) });
    return out;
  }, [models, you, spouse, youOptions, spouseOptions, exp]);
  const grid = useMemo(() => {
    if (!cells || !cells.length || !models || !you || !spouse || !exp) return null;
    const best = cells.reduce((x, c) => (c.value.total > x.value.total + 1e-6 ? c : x), cells[0]);
    const known = cells.find((c) => c.you === youPlan && c.spouse === spousePlan);
    const plan = known ? known.value : householdExpected(you, youPlan, spouse, spousePlan, exp, models.mY, models.mS);
    return { cells, best, earliest: cells[0], plan };
  }, [cells, models, you, spouse, exp, youPlan, spousePlan]);
  return { grid, stale: deferred !== input };
}

/** Steady-state monthly amounts (today's dollars) once both have filed and any January step-up has happened. */
export function steadyAmounts(p: Person, pClaim: number, q: Person, qClaim: number) {
  const m = Math.max(pClaim, qClaim) + 13;
  const ownDime = roundDownToDime(p.pia * factorInMonth(p.dob, pClaim, m));
  const top = spousalTopUp(p, pClaim, q, qClaim, m);
  return { own: roundDownToDollar(ownDime), top: roundDownToDollar(top), total: roundDownToDollar(ownDime + top) };
}

/** Widow(er) check if `deceased` dies after filing, once the survivor has reached survivor FRA (today's dollars). */
function survivorCheck(deceased: Person, deceasedClaim: number, survivor: Person, survivorOwn: number, now: number) {
  const sFra = survivorFraForCohort(cohortYear(survivor.dob));
  const death = Math.max(deceasedClaim + 1, monthAtAge(survivor.dob, sFra.years, sFra.months), now + 1);
  const wib = Math.floor(survivorAmount(survivorTerms(deceased, deceasedClaim, death, survivor), deceased.pia));
  return { wib, gets: Math.max(wib, survivorOwn) };
}

export function MarriedResults({
  input,
  grid,
  stale,
  youFraTotal,
  spouseFraTotal,
  spouseAlready,
}: {
  input: Omit<HouseholdInput, "table">;
  grid: HouseholdGrid | null;
  stale: boolean;
  youFraTotal: number;
  spouseFraTotal: number;
  spouseAlready: boolean;
}) {
  const { you, spouse, youPlan, spousePlan, youOptions, spouseOptions } = input;
  const now = asOfMonth(input.exp.asOf);
  const yours = steadyAmounts(you, youPlan, spouse, spousePlan);
  const theirs = steadyAmounts(spouse, spousePlan, you, youPlan);
  const youHigher = you.pia >= spouse.pia;
  const label = (p: Person, m: number, fraTotal: number) => {
    const a = ageMonthsIn(p.dob, m);
    return a === fraTotal ? `${ageLabel(a)} (FRA)` : ageLabel(a);
  };
  const half = SPOUSAL.value.basePctOfPia;
  const ribFloor = SURVIVOR.value.ribLimFloorPctOfPia;

  return (
    <section className="mt-10" aria-labelledby="couple-h">
      <h3 id="couple-h" className="text-[1.3rem] font-semibold">
        You and your spouse
      </h3>
      <p className="mt-1 text-[1rem] text-ink-3">All amounts in today’s dollars. FRA = full retirement age.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="table-sy text-[1rem]">
          <caption className="sr-only">Monthly checks once both of you have filed, with your current plan</caption>
          <thead>
            <tr>
              <th>Who</th>
              <th>Starts at</th>
              <th>Own benefit</th>
              <th>Spousal top-up</th>
              <th>Monthly total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="strong">You</td>
              <td>{label(you, youPlan, youFraTotal)}</td>
              <td>{money(yours.own)}</td>
              <td>{yours.top ? money(yours.top) : "—"}</td>
              <td className="strong">{money(yours.total)}</td>
            </tr>
            <tr>
              <td className="strong">Spouse</td>
              <td>
                {label(spouse, spousePlan, spouseFraTotal)}
                {spouseAlready ? " (already collecting)" : ""}
              </td>
              <td>{money(theirs.own)}</td>
              <td>{theirs.top ? money(theirs.top) : "—"}</td>
              <td className="strong">{money(theirs.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">
        A spousal benefit tops you up to {pctOfPia(half)} of your spouse’s full-retirement-age amount — never their delayed-credit amount — and only once they have filed. Started
        before your own full retirement age it is cut by {fractionOfOnePercent(CLAIMING_RULES.spousalFirst36PerMonth)} a month for {REDUCTION_TIER_MONTHS.value} months and{" "}
        {fractionOfOnePercent(CLAIMING_RULES.spousalBeyond36PerMonth)} after that. Anyone born on or after {longDate(DEEMED_FILING_DOB.value)} who files for one benefit is treated as filing for both.
      </p>

      <h4 className="mt-7 text-[1.15rem] font-semibold">What the survivor would get</h4>
      <p className="mt-1 text-[1rem] text-ink-3">Monthly check for the one left behind, once they reach full survivor age — by when the first to die had started.</p>
      {[
        { who: "If you die first, your spouse gets", d: you, s: spouse, opts: youOptions, fraTotal: youFraTotal, survOwn: theirs.own, mine: true },
        { who: "If your spouse dies first, you get", d: spouse, s: you, opts: spouseOptions, fraTotal: spouseFraTotal, survOwn: yours.own, mine: false },
      ].map((row) => (
        <div key={row.who} className="mt-4">
          <p className="font-bold text-ink">{row.who}</p>
          <ul className="mt-2 grid gap-3 sm:grid-cols-3">
            {row.opts.map((m) => {
              const r = survivorCheck(row.d, m, row.s, row.survOwn, now);
              return (
                <li key={m} className="sunk p-4">
                  <p className="text-[0.9375rem] font-semibold text-ink-3">
                    {row.mine ? "You" : "Spouse"} started at {label(row.d, m, row.fraTotal)}
                  </p>
                  <p className="num mt-1 text-[1.5rem] font-bold leading-tight text-ink">{money(r.gets)}</p>
                  <p className="mt-1 text-[0.9375rem] leading-snug text-ink-3">{r.wib > row.survOwn ? "Survivor benefit" : "Keeps own (larger) check"}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">
        The survivor keeps the <strong>larger</strong> of the two checks, and the other one stops. A widow(er) at full survivor age gets 100% of what the deceased was owed —
        including delayed credits — but if the deceased started early, no more than the larger of their reduced check or {pctOfPia(ribFloor)} of their full amount. That is why{" "}
        <strong>{youHigher ? "your" : "your spouse’s"}</strong> start age (the bigger check) matters most: it sets the income of whoever lives longer.
      </p>

      <h4 className="mt-7 text-[1.15rem] font-semibold">Expected household lifetime benefits</h4>
      <p className="mt-1 text-[1rem] text-ink-3">Survival-weighted for both of you, including the survivor years. Best combination highlighted.</p>
      {grid ? (
        <div className={`mt-3 overflow-x-auto transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
          <table className="table-sy text-[1rem]">
            <caption className="sr-only">Expected household lifetime benefits for each pair of start ages</caption>
            <thead>
              <tr>
                <th>You start ↓ · Spouse starts →</th>
                {spouseOptions.map((b) => (
                  <th key={b}>{label(spouse, b, spouseFraTotal)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {youOptions.map((a) => (
                <tr key={a}>
                  <td className="strong">{label(you, a, youFraTotal)}</td>
                  {spouseOptions.map((b) => {
                    const c = grid.cells.find((x) => x.you === a && x.spouse === b);
                    const isBest = grid.best.you === a && grid.best.spouse === b;
                    return (
                      <td key={b} className={isBest ? "strong bg-[var(--sage-wash)]" : undefined}>
                        {c ? money(c.value.total) : "—"}
                        {isBest ? <span className="pill pill-sage ml-2 !px-2 !py-0.5 text-[0.75rem]">Best</span> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[1rem] text-ink-2">
            Your current plan (you {label(you, youPlan, youFraTotal)}, your spouse {label(spouse, spousePlan, spouseFraTotal)}): <strong>{money(grid.plan.total)}</strong>
            {grid.best.value.total - grid.plan.total >= 1 ? <> — {money(grid.best.value.total - grid.plan.total)} less than the best combination.</> : " — the best combination."}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      )}
      {spouseAlready ? (
        <div className="mt-4">
          <Callout tone="sky" title="Your spouse has already started">
            We keep your spouse’s start date fixed and compare only your choices. What you decide still changes their spousal top-up and their survivor benefit.
          </Callout>
        </div>
      ) : null}
    </section>
  );
}
