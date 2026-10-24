"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { withdrawalNet } from "@/lib/calc/tax-more";
import { EARLY_EXCEPTIONS, EARLY_DIST } from "@/data/params/tax";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { amt: 25000, acct: "plan" as "plan" | "ira" | "simple2", ex: "none", inc: 70000, fs: "single" as "single" | "mfj" };

export function EarlyPenaltyCalculator() {
  const { state: s, set } = useUrlState(D, { amt: num, acct: str(["plan", "ira", "simple2"] as const), ex: str(["none", ...EARLY_EXCEPTIONS.value.map((e) => e.id)]), inc: num, fs: str(["single", "mfj"] as const) });
  const kind = s.acct === "plan" ? "plan" : "ira";
  const options = EARLY_EXCEPTIONS.value.filter((e) => (kind === "plan" ? e.plan : e.ira));
  const ex = options.find((e) => e.id === s.ex);
  const exempt = ex ? Math.min(s.amt, ex.limit ?? Infinity) : 0;
  const rate = s.acct === "simple2" ? EARLY_DIST.value.simpleFirst2Years : EARLY_DIST.value.rate;
  const penalty = Math.round(Math.max(0, s.amt - exempt) * rate);
  const tax = withdrawalNet({ filingStatus: s.fs, ssBenefits: 0, wages: s.inc }, s.amt, { penalty: false, statePct: 0, account: kind }).fedTax;
  useResultTrack("calc_earlypen_result", JSON.stringify(s), { ex: s.ex, acct: s.acct });

  const inputs = (
    <>
      <NumberField label="Amount you want to withdraw" prefix="$" value={s.amt} onChange={(v) => set("amt", v ?? 0)} min={0} max={MAX_INPUT} />
      <Segmented label="Account" value={s.acct} onChange={(v) => set("acct", v)} options={[{ value: "plan", label: "401(k)/403(b)" }, { value: "ira", label: "IRA" }, { value: "simple2", label: "SIMPLE, < 2 yrs" }]} />
      <SelectField label="Does an exception apply?" value={ex ? s.ex : "none"} onChange={(v) => set("ex", v)} options={[{ value: "none", label: "None of these" }, ...options.map((e) => ({ value: e.id, label: e.label }))]} />
      <Segmented label="Filing status" value={s.fs} onChange={(v) => set("fs", v)} options={[{ value: "single", label: "Single" }, { value: "mfj", label: "Married jointly" }]} />
      <NumberField label="Your other taxable income this year" prefix="$" value={s.inc} onChange={(v) => set("inc", v ?? 0)} min={0} max={MAX_INPUT} hint="Wages and other income, to find your tax bracket." />
    </>
  );

  const result = (
    <>
      <ResultHero label="Early withdrawal penalty" value={money(penalty)} tone={penalty ? "ember" : "sage"} sub={<>Plus about {money(tax)} of federal income tax — {money(penalty + tax)} in total on {money(s.amt)}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Penalty rate" value={`${Math.round(rate * 100)}%`} sub={s.acct === "simple2" ? "SIMPLE IRA, first 2 years" : "under 59½"} />
        <Stat label="Exempt from penalty" value={money(exempt)} tone="sage" />
        <Stat label="You keep (before state tax)" value={money(s.amt - penalty - tax)} />
      </div>
      {s.acct === "plan" && !ex ? (
        <div className="mt-5">
          <Callout tone="sun" title="Left this job at 55 or later?">
            <p>The Rule of 55 lets you take money from that employer&rsquo;s plan with no 10% penalty — but only if you don&rsquo;t roll it to an IRA first.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          The additional tax is 10% of the taxable amount withdrawn before 59½ (25% from a SIMPLE IRA in the first two years). Exceptions cover all or part of a withdrawal; several have dollar limits. Report the penalty and any exception on Form 5329. Income tax is estimated with 2026 brackets on top of the income you entered.
        </p>
      </ShowMath>
      <NextStep href="/rule-of-55-calculator" title="Check the Rule of 55" why="The most-missed exception for people retiring in their late 50s." />
      <div className="mt-6">
        <ShareBar tool="earlypen" subject="My early withdrawal penalty" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Penalty: ${money(penalty)}`} />;
}
