"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { trustFundCut } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, yearOptions, MiniTable } from "./kit";

const D = { ben: 2100, by: 1962 };

export function TrustFundCalculator() {
  const { state: s, set } = useUrlState(D, { ben: num, by: num });
  const r = trustFundCut(s.ben, s.by);
  const lost = (s.ben - r.oasi.after) * 12;
  useResultTrack("calc_trust_result", `${s.ben}|${s.by}`, { by: s.by });

  const inputs = (
    <>
      <NumberField label="Your monthly Social Security (or expected)" prefix="$" value={s.ben} onChange={(v) => set("ben", v ?? 0)} min={0} max={MAX_INPUT} />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1935, 1990)} />
    </>
  );

  const result = (
    <>
      <ResultHero label={`If nothing changes, from late ${r.oasi.year}`} value={money(r.oasi.after)} tone="ember" sub={<>{r.oasi.pct}% of {money(s.ben)} — about {money(lost)} a year less, starting when you are about {r.oasi.age}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Retirement fund (OASI) runs dry" value={`${r.oasi.year} Q${r.oasi.quarter}`} sub={`${r.oasi.pct}% payable`} />
        <Stat label="If merged with disability (OASDI)" value={`${r.combined.year} Q${r.combined.quarter}`} sub={`${money(r.combined.after)}/mo`} />
        <Stat label="Payable by 2100" value={`${r.longRun.pct}%`} sub={`${money(r.longRun.after)}/mo today's terms`} />
      </div>
      <MiniTable
        head={["Scenario", "Starts", "Your check"]}
        rows={[
          ["Congress acts in time (every time so far)", "—", money(s.ben)],
          ["Retirement fund alone", `late ${r.oasi.year}`, money(r.oasi.after)],
          ["Funds combined", `${r.combined.year}`, money(r.combined.after)],
        ]}
      />
      <div className="mt-5">
        <Callout tone="sky" title="Depletion is not zero">
          <p>Payroll taxes keep flowing after the reserve is gone, which is why benefits would fall to roughly four-fifths, not to nothing.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          From the 2026 Social Security Trustees Report, intermediate assumptions: the retirement trust fund (OASI) is projected to be depleted in the fourth quarter of {r.oasi.year}, after which incoming taxes cover {r.oasi.pct}% of scheduled benefits. Combined with the disability fund, depletion moves to {r.combined.year} at {r.combined.pct}%. This is a projection, not current law.
        </p>
      </ShowMath>
      <NextStep href="/social-security-break-even-calculator" title="Does this change when you should claim?" why="The break-even calculator has a switch to model the cut." />
      <div className="mt-6">
        <ShareBar tool="trust" subject="My Social Security after trust fund depletion" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`After ${r.oasi.year}: ${money(r.oasi.after)}/mo`} />;
}
