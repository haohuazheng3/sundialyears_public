"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { creditsForEarnings, qcAmount, yearsToCredits } from "@/lib/calc/ss-more";
import { CREDIT_RULES } from "@/data/params/social-security";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { y: 2027, have: 28, earn: 12000 };

export function CreditsCalculator() {
  const { state: s, set } = useUrlState(D, { y: num, have: num, earn: num });
  const thisYear = creditsForEarnings(s.earn, s.y);
  const plan = yearsToCredits(s.have, s.earn, s.y);
  const need = Math.max(0, CREDIT_RULES.value.retirement - s.have);
  const minFor4 = qcAmount(s.y) * 4;
  useResultTrack("calc_credits_result", `${s.y}|${s.have}|${s.earn}`, { need });

  const inputs = (
    <>
      <Segmented label="Year" value={s.y} onChange={(v) => set("y", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <NumberField label="Credits you have now" value={s.have} onChange={(v) => set("have", v ?? 0)} min={0} max={200} hint="Shown on your Social Security statement as quarters or credits earned." />
      <NumberField label="Earnings per year from now on" prefix="$" value={s.earn} onChange={(v) => set("earn", v ?? 0)} min={0} max={MAX_INPUT} hint="Wages plus net self-employment income, before taxes." />
    </>
  );

  const result = (
    <>
      <ResultHero
        label={need === 0 ? "You're fully insured" : "You reach 40 credits in"}
        value={need === 0 ? "40+ credits" : plan.reached != null ? String(plan.reached) : "Not at this income"}
        tone={need === 0 ? "sage" : "sun"}
        sub={need === 0 ? <>You already have the 40 credits needed for retirement benefits and premium-free Part A.</> : <>You need {need} more. At {money(s.earn)} a year you earn {thisYear} credit{thisYear === 1 ? "" : "s"} in {s.y}.</>}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label={`One credit in ${s.y}`} value={money(qcAmount(s.y))} />
        <Stat label="All 4 credits" value={money(minFor4)} sub="the most you can earn per year" />
        <Stat label="Credits this year" value={String(thisYear)} />
      </div>
      {plan.rows.length ? <MiniTable head={["Year", "Credits earned", "Running total"]} rows={plan.rows.slice(0, 10).map((r) => [String(r.year), String(r.earned), String(r.total)])} /> : null}
      {s.have >= 30 && s.have < 40 ? (
        <div className="mt-5">
          <Callout tone="sun" title="30–39 credits already cut your Part A premium">
            <p>With at least 30 quarters you pay the reduced Part A premium instead of the full one; at 40 it&rsquo;s free.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          A credit is earned for each {money(qcAmount(s.y))} of covered earnings in {s.y}, up to 4 a year, no matter when in the year you earn it. Future years use the latest published amount; the real figure rises with national wages, so a fixed income may buy slightly fewer credits later.
        </p>
      </ShowMath>
      <NextStep href="/medicare-part-a-premium" title="What your credits mean for Part A" why="Free, reduced or full premium — and whether a spouse's record covers you." />
      <div className="mt-6">
        <ShareBar tool="credits" subject="My Social Security work credits" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={need === 0 ? "40+ credits" : `40 credits in ${plan.reached ?? "—"}`} />;
}
