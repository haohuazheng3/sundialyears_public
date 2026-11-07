"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { partAPremium } from "@/lib/calc/medicare";
import { NextStep, useResultTrack } from "./kit";

const D = { year: 2026, q: 34, sq: 0, sp: false, late: false };

export function PartAPremiumCalculator() {
  const { state: s, set } = useUrlState(D, { year: num, q: num, sq: num, sp: bool, late: bool });
  const year = (s.year === 2026 ? 2026 : 2027) as 2026 | 2027;
  const best = Math.max(s.q, s.sp ? s.sq : 0);
  const band = best >= 40 ? "40" : best >= 30 ? "30" : "0";
  const r = partAPremium(year, band, s.late);
  const usedSpouse = s.sp && s.sq > s.q;
  useResultTrack("calc_parta_result", `${year}|${band}|${s.late}`, { band, usedSpouse });

  const inputs = (
    <>
      <Segmented label="Year" value={year} onChange={(v) => set("year", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <NumberField label="Your work quarters (credits)" value={s.q} onChange={(v) => set("q", v ?? 0)} min={0} max={200} hint="From your Social Security statement. Medicare-covered government work counts too." />
      <Toggle label="Married (1+ year), divorced after 10+ years, or widowed" checked={s.sp} onChange={(v) => set("sp", v)} hint="You can use a current, former or late spouse's quarters." />
      {s.sp ? <NumberField label="Spouse's work quarters" value={s.sq} onChange={(v) => set("sq", v ?? 0)} min={0} max={200} /> : null}
      <Toggle label="I signed up for Part A late" checked={s.late} onChange={(v) => set("late", v)} />
    </>
  );

  const result = (
    <>
      <ResultHero label={`Your Part A premium (${year})`} value={r.total === 0 ? "$0" : `${money2(r.total)}/mo`} tone={r.total === 0 ? "sage" : "sun"} sub={r.total === 0 ? <>Premium-free — {usedSpouse ? "on your spouse's record" : "you have 40+ quarters"}.</> : <>With {best} quarters you pay {band === "30" ? "the reduced" : "the full"} premium{r.penalty ? `, plus a ${money2(r.penalty)} late penalty` : ""}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="40+ quarters" value="$0" tone="sage" />
        <Stat label="30–39 quarters" value={money2(partAPremium(year, "30", false).premium)} />
        <Stat label="Under 30" value={money2(partAPremium(year, "0", false).premium)} />
      </div>
      {band !== "40" ? (
        <div className="mt-5">
          <Callout tone="sun" title={`${40 - best} more quarters would make it free`}>
            <p>Each year you work and earn enough adds up to 4 quarters. Over a year that saves {money(partAPremium(year, band as "30" | "0", false).premium * 12)} in premiums.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          Part A is free with 40 quarters of Medicare-covered work, on your own or a spouse&rsquo;s record. With 30–39 quarters the premium is reduced; under 30 it&rsquo;s the full amount. Signing up late adds a one-time 10% increase, paid for twice the number of years you delayed. {year === 2027 ? "2027 amounts are the Medicare Trustees' projection until CMS announces them." : ""}
        </p>
      </ShowMath>
      <NextStep href="/social-security-work-credits-calculator" title="How fast can you reach 40?" why="Count the years of work you still need." />
      <div className="mt-6">
        <ShareBar tool="parta" subject="My Medicare Part A premium" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Part A: ${r.total === 0 ? "$0" : money2(r.total)}/mo`} />;
}
