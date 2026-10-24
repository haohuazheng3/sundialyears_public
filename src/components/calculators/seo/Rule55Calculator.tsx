"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, SelectField, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, str, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { rule55 } from "@/lib/calc/tax-more";
import { EARLY_DIST } from "@/data/params/tax";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions } from "./kit";

const D = { by: 1970, sep: 2026, ps: false, acct: "plan" as "plan" | "ira" | "457b", amt: 60000 };

export function Rule55Calculator() {
  const { state: s, set } = useUrlState(D, { by: num, sep: num, ps: bool, acct: str(["plan", "ira", "457b"] as const), amt: num });
  const r = rule55({ birthYear: s.by, separationYear: s.sep, publicSafety: s.ps, account: s.acct });
  const saved = r.qualifies && s.acct !== "457b" ? Math.round(s.amt * EARLY_DIST.value.rate) : 0;
  const ageAtSep = s.sep - s.by;
  useResultTrack("calc_rule55_result", JSON.stringify(s), { qualifies: r.qualifies, reason: r.reason });

  const inputs = (
    <>
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1960, 1980)} />
      <SelectField label="Year you left (or will leave) the job" value={s.sep} onChange={(v) => set("sep", v)} options={yearOptions(2015, 2040)} />
      <Toggle label="Public safety employee (police, firefighter, EMS, corrections, air traffic control…)" checked={s.ps} onChange={(v) => set("ps", v)} />
      <Segmented label="Where the money is" value={s.acct} onChange={(v) => set("acct", v)} options={[{ value: "plan", label: "That job's 401(k)/403(b)" }, { value: "457b", label: "Gov't 457(b)" }, { value: "ira", label: "IRA" }]} />
      <NumberField label="Amount you plan to take before 59½" prefix="$" value={s.amt} onChange={(v) => set("amt", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label="Rule of 55"
        value={r.qualifies ? "You qualify" : "Doesn't apply"}
        tone={r.qualifies ? "sage" : "ember"}
        sub={
          r.reason === "457b" ? (
            <>Governmental 457(b) money has no 10% early-withdrawal penalty at any age after you leave — you don&rsquo;t even need the Rule of 55.</>
          ) : r.reason === "ira" ? (
            <>IRAs never get the Rule of 55. Leave the money in the employer plan until you&rsquo;re 59½ if you may need it.</>
          ) : r.qualifies ? (
            <>You leave in {s.sep}, the year you turn {ageAtSep} — on or after the year you turn {s.ps ? 50 : 55}. Withdrawals from that plan skip the 10% penalty: <strong>{money(saved)}</strong> saved.</>
          ) : (
            <>You&rsquo;d leave in {s.sep}, before {r.yearTurning} (the year you turn {s.ps ? 50 : 55}). Leaving even in January {r.yearTurning} would qualify.</>
          )
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Qualifying year" value={`${r.yearTurning}+`} />
        <Stat label="Penalty avoided" value={money(saved)} tone="sage" />
        <Stat label="Income tax still owed" value="Yes" sub="ordinary income rates" />
      </div>
      <div className="mt-5">
        <Callout tone="ember" title="Don't roll it over first">
          <p>The exception covers only the plan of the employer you left. Roll it into an IRA and the money loses the Rule of 55 until 59½. Older plans from previous jobs don&rsquo;t qualify either — unless you rolled them into this plan before leaving.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          IRC §72(t)(2)(A)(v): no 10% additional tax on distributions from a qualified plan after separation from service in or after the year you turn 55 (50 for qualified public safety employees). It&rsquo;s the calendar year that matters, not your birthday. Plans aren&rsquo;t required to allow partial withdrawals, so check your plan&rsquo;s rules.
        </p>
      </ShowMath>
      <NextStep href="/401k-withdrawal-tax-calculator" title="What you keep after tax" why="Federal tax, the 20% withholding and state tax on the withdrawal." />
      <div className="mt-6">
        <ShareBar tool="rule55" subject="Rule of 55 check" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={r.qualifies ? "Rule of 55: you qualify" : "Rule of 55: doesn't apply"} />;
}
