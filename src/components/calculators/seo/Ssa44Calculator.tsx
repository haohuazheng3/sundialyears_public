"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { lifeChangingEventEffect, type IrmaaFiling } from "@/lib/calc/irmaa";
import { LIFE_CHANGING_EVENTS } from "@/data/params/medicare";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const EVIDENCE: Record<number, string> = {
  0: "Marriage certificate",
  1: "Divorce decree or annulment papers",
  2: "Death certificate",
  3: "Signed letter from your employer, or proof of retirement date",
  4: "Employer letter showing the reduced hours or pay",
  5: "Insurance claim, police report or proof of the loss",
  6: "Letter from the pension plan about the termination or cut",
  7: "Letter from your employer about the settlement",
};

const D = { year: 2027, fs: "mfj" as IrmaaFiling, ev: 3, old: 260000, now: 150000 };

export function Ssa44Calculator() {
  const { state: s, set } = useUrlState(D, { year: num, fs: str(["single", "mfj", "mfs", "mfsApart"] as const), ev: num, old: num, now: num });
  const year = s.year === 2026 ? 2026 : 2027;
  const qualifying = s.ev >= 0 && s.ev < LIFE_CHANGING_EVENTS.length;
  const r = lifeChangingEventEffect({ year, filingStatus: s.fs, magi: s.old, people: s.fs === "mfj" ? 2 : 1 }, s.now);
  const worth = qualifying && r.significant;
  useResultTrack("calc_ssa44_result", `${year}|${s.fs}|${s.ev}|${s.old}|${s.now}`, { worth, ev: s.ev });

  const inputs = (
    <>
      <Segmented label="Premium year" value={year} onChange={(v) => set("year", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <SelectField label="What happened" value={s.ev} onChange={(v) => set("ev", v)} options={[...LIFE_CHANGING_EVENTS.map((e, i) => ({ value: i, label: e })), { value: 99, label: "Something else (sold a house, big one-time gain…)" }]} />
      <Segmented label="Filing status" value={s.fs === "mfsApart" ? "mfs" : s.fs} onChange={(v) => set("fs", v as IrmaaFiling)} options={[{ value: "single", label: "Single" }, { value: "mfj", label: "Joint" }, { value: "mfs", label: "Separate" }]} />
      <NumberField label={`MAGI SSA used (your ${year - 2} return)`} prefix="$" value={s.old} onChange={(v) => set("old", v ?? 0)} min={0} max={MAX_INPUT} hint="It's in the IRMAA letter SSA sent you." />
      <NumberField label="Expected MAGI this year (after the event)" prefix="$" value={s.now} onChange={(v) => set("now", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label={worth ? "File Form SSA-44 — estimated savings" : qualifying ? "SSA-44 wouldn't lower your tier" : "This event doesn't qualify"}
        value={worth ? `${money(r.savingsPerYear)}/yr` : "—"}
        tone={worth ? "sage" : "ember"}
        sub={worth ? <>Your tier would drop from {r.currentTier} to {r.newTier === 0 ? "no IRMAA" : r.newTier}.</> : qualifying ? <>Your newer income still lands in the same IRMAA tier (Tier {r.currentTier}).</> : <>One-time income spikes aren&rsquo;t life-changing events. You can still ask for reconsideration if SSA used the wrong tax return or an amended one.</>}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Tier now" value={r.currentTier === 0 ? "None" : String(r.currentTier)} />
        <Stat label="Tier after SSA-44" value={r.newTier === 0 ? "None" : String(r.newTier)} tone="sage" />
        <Stat label="MAGI that would lower it" value={r.targetMagi == null ? "—" : `≤ ${money(r.targetMagi)}`} />
      </div>
      {qualifying ? (
        <div className="mt-5">
          <Callout tone="sky" title="Evidence to attach">
            <p>{EVIDENCE[s.ev]}, plus a copy of your newer tax return or a signed estimate of this year&rsquo;s income.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          SSA normally sets IRMAA from your tax return two years back. Form SSA-44 lets it use a more recent year&rsquo;s income when one of eight life-changing events reduced it. You can file as soon as the event happens; SSA adjusts the premium going forward and refunds any months overpaid in that year.
        </p>
      </ShowMath>
      <NextStep href="/irmaa-brackets-2028" title="Plan the next two years" why="See which 2028 tier your 2026 income would land in." />
      <div className="mt-6">
        <ShareBar tool="ssa44" subject="My SSA-44 IRMAA appeal check" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={worth ? `Saves ${money(r.savingsPerYear)}/yr` : "Not worth filing"} />;
}
