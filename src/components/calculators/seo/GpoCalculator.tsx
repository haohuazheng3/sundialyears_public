"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { gpoRepeal } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { kind: "widow" as "spouse" | "widow", spia: 2400, pen: 2600 };

export function GpoCalculator() {
  const { state: s, set } = useUrlState(D, { kind: str(["spouse", "widow"] as const), spia: num, pen: num });
  const entitlement = s.kind === "spouse" ? s.spia / 2 : s.spia;
  const r = gpoRepeal({ entitlement, pension: s.pen });
  useResultTrack("calc_gpo_result", `${s.kind}|${s.spia}|${s.pen}`, { kind: s.kind });

  const inputs = (
    <>
      <Segmented label="You are claiming as a" value={s.kind} onChange={(v) => set("kind", v)} options={[{ value: "spouse", label: "Spouse" }, { value: "widow", label: "Widow(er)" }]} />
      <NumberField label={s.kind === "spouse" ? "Spouse's benefit at full retirement age" : "Late spouse's monthly benefit"} prefix="$" value={s.spia} onChange={(v) => set("spia", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Your government pension (non-covered)" prefix="$" value={s.pen} onChange={(v) => set("pen", v ?? 0)} min={0} max={MAX_INPUT} hint="A pension from work where you didn't pay Social Security tax — many teachers, police and some federal workers." />
    </>
  );

  const result = (
    <>
      <ResultHero label={s.kind === "spouse" ? "Spousal benefit now" : "Survivor benefit now"} value={money(r.after)} tone="sage" sub={<>Under the old offset you would have received <strong>{money(r.before)}</strong> — the repeal adds {money(r.increase)} a month.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Old offset (⅔ of pension)" value={money(r.offset)} />
        <Stat label="Before repeal" value={money(r.before)} />
        <Stat label="Increase" value={money(r.increase)} tone="sage" />
      </div>
      {r.before === 0 ? (
        <div className="mt-5">
          <Callout tone="sun" title="You may never have applied">
            <p>If the offset wiped out the benefit, SSA may not have a claim from you on file. Apply now: back pay for a new application is limited, so every month you wait can be a month lost.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          The Government Pension Offset subtracted two-thirds of a non-covered government pension from spouse and widow(er) benefits: ⅔ × {money(s.pen)} = {money(r.offset)}. The Social Security Fairness Act repealed it for benefits from January 2024. Spousal amounts here assume you claim at full retirement age; earlier claiming reduces them.
        </p>
      </ShowMath>
      <NextStep href={s.kind === "spouse" ? "/social-security-spousal-benefits-calculator" : "/social-security-survivor-benefits-calculator"} title={s.kind === "spouse" ? "Fine-tune the spousal amount by age" : "See the survivor benefit by age"} why="Early or late claiming changes the amount the repeal restored." />
      <div className="mt-6">
        <ShareBar tool="gpo" subject="My GPO repeal estimate" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Now: ${money(r.after)}/mo`} />;
}
