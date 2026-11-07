"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { computeFedTax } from "@/lib/calc/fed-tax";
import { qssYears } from "@/lib/calc/tax-more";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable, yearOptions } from "./kit";

const D = { dy: 2025, kid: true, ss: 36000, pen: 40000, ira: 30000, a65: true };
const LABEL = { mfj: "Married filing jointly", qss: "Qualifying surviving spouse", hoh: "Head of household", single: "Single" } as const;

export function QssCalculator() {
  const { state: s, set } = useUrlState(D, { dy: num, kid: bool, ss: num, pen: num, ira: num, a65: bool });
  const years = qssYears(s.dy, s.kid);
  const inc = { ssBenefits: s.ss, pension: s.pen, iraDistributions: s.ira, people65: s.a65 ? 1 : 0 };
  const joint = computeFedTax({ filingStatus: "qss", ...inc });
  const single = computeFedTax({ filingStatus: "single", ...inc });
  const hoh = computeFedTax({ filingStatus: "hoh", ...inc });
  const penalty = Math.max(0, (s.kid ? hoh : single).totalTax - joint.totalTax);
  useResultTrack("calc_qss_result", JSON.stringify(s), { kid: s.kid });

  const inputs = (
    <>
      <SelectField label="Year your spouse died" value={s.dy} onChange={(v) => set("dy", v)} options={yearOptions(2018, 2027)} />
      <Toggle label="I have a dependent child living with me" checked={s.kid} onChange={(v) => set("kid", v)} hint="A son, daughter or stepchild you can claim, and you paid over half the cost of the home." />
      <Toggle label="I'm 65 or older" checked={s.a65} onChange={(v) => set("a65", v)} />
      <NumberField label="Your Social Security (yearly, incl. survivor benefit)" prefix="$" value={s.ss} onChange={(v) => set("ss", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Pension income" prefix="$" value={s.pen} onChange={(v) => set("pen", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="IRA withdrawals" prefix="$" value={s.ira} onChange={(v) => set("ira", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero label={s.kid ? "Joint rates are worth" : "Filing single will cost"} value={`${money(s.kid ? hoh.totalTax - joint.totalTax : single.totalTax - joint.totalTax)}/yr`} tone={s.kid ? "sage" : "ember"} sub={s.kid ? <>As a qualifying surviving spouse in {s.dy + 1} and {s.dy + 2}, you keep the joint brackets and standard deduction.</> : <>Without a dependent child, you file single from {s.dy + 1}: the same income, half-size brackets — the &ldquo;widow&rsquo;s penalty&rdquo;.</>} />
      <MiniTable head={["Tax year", "Filing status"]} rows={years.map((y) => [String(y.year), LABEL[y.status]])} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Tax on joint rates" value={money(joint.totalTax)} tone="sage" />
        <Stat label="Tax as head of household" value={money(hoh.totalTax)} />
        <Stat label="Tax as single" value={money(single.totalTax)} tone="ember" />
      </div>
      <div className="mt-5">
        <Callout tone="ember" title="IRMAA hits widows too">
          <p>From the first single return, IRMAA uses single thresholds — half the joint ones — on income that often barely fell. A Form SSA-44 for &ldquo;death of spouse&rdquo; can help.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          In the year of death you can still file jointly. For the next two years, a qualifying surviving spouse with a dependent child uses the joint brackets and standard deduction. After that — or straight away without a qualifying child — it&rsquo;s head of household or single. The comparison applies 2026 tax law to the same income; the gap is the extra tax you&rsquo;d pay ({money(penalty)} with your answers).
        </p>
      </ShowMath>
      <NextStep href="/ssa-44-irmaa-appeal" title="Cut IRMAA after a spouse's death" why="Check whether Form SSA-44 lowers your Medicare premiums." />
      <div className="mt-6">
        <ShareBar tool="qss" subject="Qualifying surviving spouse tax" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Gap: ${money(penalty)}/yr`} />;
}
