"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { pct } from "@/lib/format";
import { useLifeTable } from "@/components/calculators/ss-claiming/useLifeTable";
import { survivalModel, lifeExpectancy, probSurvive } from "@/lib/calc/ss-claiming";
import { periodLifeExpectancy } from "@/lib/calc/plan-more";
import { HEALTH_OUTLOOK, type HealthOutlook } from "@/data/params/ss-claiming-extra";
import { NextStep, useResultTrack, MiniTable } from "./kit";

const D = { sex: "f" as "m" | "f", age: 65, h: "average" as HealthOutlook };

export function LifeExpectancyCalculator() {
  const { state: s, set } = useUrlState(D, { sex: str(["m", "f"] as const), age: num, h: str(["shorter", "average", "longer"] as const) });
  const lt = useLifeTable();
  const age = Math.max(40, Math.min(100, Math.round(s.age)));
  const birthYear = lt.asOf.year - age;
  const model = lt.table ? survivalModel(lt.table, s.sex, birthYear, s.h) : null;
  const e = model ? lifeExpectancy(model, age) : periodLifeExpectancy(s.sex, age);
  const odds = [80, 85, 90, 95, 100].filter((a) => a > age).map((a) => [a, model ? probSurvive(model, age, a) : null] as const);
  useResultTrack("calc_lifeexp_result", `${s.sex}|${age}|${s.h}|${!!model}`, { sex: s.sex, age, h: s.h });

  const inputs = (
    <>
      <Segmented label="Sex" value={s.sex} onChange={(v) => set("sex", v)} size="lg" options={[{ value: "f", label: "Female" }, { value: "m", label: "Male" }]} />
      <NumberField label="Your age today" suffix="yrs" value={s.age} onChange={(v) => set("age", v ?? 65)} min={40} max={100} />
      <SelectField label="Your health compared with others your age" value={s.h} onChange={(v) => set("h", v)} options={(Object.keys(HEALTH_OUTLOOK) as HealthOutlook[]).map((k) => ({ value: k, label: HEALTH_OUTLOOK[k].label }))} hint={HEALTH_OUTLOOK[s.h].hint} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Average age you'll live to" value={(age + e).toFixed(1)} tone="sun" sub={<>{e.toFixed(1)} more years on average for {s.sex === "f" ? "a woman" : "a man"} born in {birthYear}{model ? ", from SSA's cohort tables" : ", on SSA's period life table"}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {odds.slice(0, 3).map(([a, p]) => (
          <Stat key={a} label={`Chance of reaching ${a}`} value={p == null ? "…" : pct(p, 0)} tone={a === 90 ? "sage" : undefined} />
        ))}
      </div>
      {odds.length ? <MiniTable head={["Reach age", "Chance"]} rows={odds.map(([a, p]) => [String(a), p == null ? "…" : pct(p, 0)])} /> : null}
      {lt.error ? (
        <div className="mt-5">
          <Callout tone="ember" title="Couldn't load the cohort table">
            <p>
              Showing the period-table figure instead. <button type="button" className="link" onClick={lt.retry}>Try again</button>
            </p>
          </Callout>
        </div>
      ) : null}
      <div className="mt-5">
        <Callout tone="sun" title="Plan for the tail, not the average">
          <p>Half of people outlive the average. Retirement plans that stop at life expectancy run out for half the people who use them.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Uses the Social Security Trustees&rsquo; 2026 cohort life tables (intermediate assumptions), which project future improvements in mortality for your birth year. The health setting multiplies every yearly death rate by 1.5 or ⅔ — a Sundial Years modeling assumption, not an SSA figure. The quick period-table value is {periodLifeExpectancy(s.sex, age).toFixed(1)} years.
        </p>
      </ShowMath>
      <NextStep href="/social-security-break-even-calculator" title="Turn your odds into a claiming decision" why="Expected lifetime benefits at every claiming age, weighted by these odds." />
      <div className="mt-6">
        <ShareBar tool="lifeexp" subject="My life expectancy" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Average: age ${(age + e).toFixed(1)}`} />;
}
