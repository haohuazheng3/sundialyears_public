"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, str } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { RMD_EXCISE } from "@/data/params/rmd";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { req: 18000, took: 6000, fix: "soon" as "soon" | "late" | "waiver" };

export function RmdPenaltyCalculator() {
  const { state: s, set } = useUrlState(D, { req: num, took: num, fix: str(["soon", "late", "waiver"] as const) });
  const short = Math.max(0, s.req - s.took);
  const rate = s.fix === "waiver" ? 0 : s.fix === "soon" ? RMD_EXCISE.value.correctedRate : RMD_EXCISE.value.rate;
  const tax = Math.round(short * rate);
  useResultTrack("calc_rmdpen_result", `${s.req}|${s.took}|${s.fix}`, { fix: s.fix });

  const inputs = (
    <>
      <NumberField label="RMD you were required to take" prefix="$" value={s.req} onChange={(v) => set("req", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Amount you actually took by the deadline" prefix="$" value={s.took} onChange={(v) => set("took", v ?? 0)} min={0} max={MAX_INPUT} />
      <Segmented label="How you'll handle it" value={s.fix} onChange={(v) => set("fix", v)} options={[{ value: "waiver", label: "Fix + waiver" }, { value: "soon", label: "Fix within 2 yrs" }, { value: "late", label: "Leave it" }]} />
    </>
  );

  const result = (
    <>
      <ResultHero label="Excise tax on the missed RMD" value={money(tax)} tone={tax ? "ember" : "sage"} sub={<>{Math.round(rate * 100)}% of the {money(short)} shortfall{s.fix === "waiver" ? " — the IRS usually waives it for a reasonable error you've corrected." : "."}</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Not corrected" value={money(Math.round(short * RMD_EXCISE.value.rate))} sub="25%" tone="ember" />
        <Stat label="Corrected in time" value={money(Math.round(short * RMD_EXCISE.value.correctedRate))} sub="10%" />
        <Stat label="With a granted waiver" value="$0" tone="sage" />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="Fix it this month">
          <p>1) Withdraw the missed amount now. 2) File Form 5329 for the year it was missed. 3) Write &ldquo;RC&rdquo; and the shortfall on line 54 and attach a short letter: what went wrong, that you&rsquo;ve fixed it. 4) Don&rsquo;t pay the tax up front — let the IRS decide.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Since 2023 the excise tax is 25% of the amount not withdrawn, cut to 10% if you take it during the correction window (generally by the end of the second year after the miss, before the IRS assesses the tax). A waiver for reasonable error brings it to $0. You still owe regular income tax on the late withdrawal.
        </p>
      </ShowMath>
      <NextStep href="/rmd-calculator" title="Get next year's RMD right" why="Your exact RMD with the uniform lifetime table." />
      <div className="mt-6">
        <ShareBar tool="rmdpen" subject="My missed RMD penalty" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`Penalty: ${money(tax)}`} />;
}
