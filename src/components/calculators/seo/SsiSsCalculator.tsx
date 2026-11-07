"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money, money2 } from "@/lib/format";
import { ssiWithSocialSecurity } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { y: 2027, cp: false, ss: 640, earn: 0 };

export function SsiSsCalculator() {
  const { state: s, set } = useUrlState(D, { y: num, cp: bool, ss: num, earn: num });
  const year = (s.y === 2026 ? 2026 : 2027) as 2026 | 2027;
  const r = ssiWithSocialSecurity({ year, couple: s.cp, socialSecurity: s.ss, earned: s.earn });
  useResultTrack("calc_ssiss_result", `${s.y}|${s.cp}|${s.ss}|${s.earn}`, { eligible: r.eligible });

  const inputs = (
    <>
      <Segmented label="Year" value={s.y} onChange={(v) => set("y", v)} size="lg" options={[{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }]} />
      <Segmented label="Applying as" value={s.cp ? "couple" : "one"} onChange={(v) => set("cp", v === "couple")} options={[{ value: "one", label: "Individual" }, { value: "couple", label: "Couple" }]} />
      <NumberField label="Monthly Social Security (gross)" prefix="$" value={s.ss} onChange={(v) => set("ss", v ?? 0)} min={0} max={MAX_INPUT} hint="Before Medicare premiums are deducted; for a couple, both checks combined." />
      <NumberField label="Monthly wages" prefix="$" value={s.earn} onChange={(v) => set("earn", v ?? 0)} min={0} max={MAX_INPUT} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label={r.eligible ? `Your ${s.y} SSI on top` : "SSI on top"}
        value={r.eligible ? money2(r.ssi) : "$0"}
        tone={r.eligible ? "sage" : "ember"}
        sub={r.eligible ? <>Total from both: <strong>{money2(r.total)}</strong> a month (federal amounts; some states add a supplement).</> : <>Your countable income is above the {money(r.fbr)} federal SSI rate, so no federal SSI is payable.</>}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label={`Federal SSI rate ${s.y}`} value={money(r.fbr)} />
        <Stat label="Countable income" value={money2(r.countable)} />
        <Stat label="SSI stops at Social Security of" value={money(r.breakEvenSocialSecurity)} sub="with no other income" />
      </div>
      <div className="mt-5">
        <Callout tone="sky" title="Your two payment days">
          <p>SSI arrives on the 1st and, when you get both, Social Security on the 3rd. A weekend or holiday moves either one earlier.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          SSI ignores the first $20 of income, then subtracts Social Security dollar for dollar. Of wages, the first $65 (plus any unused part of the $20) is ignored and half the rest counts. Couples get one $20 exclusion. Food or shelter someone else provides, and resources over $2,000 ($3,000 for a couple), can reduce or stop SSI.
        </p>
      </ShowMath>
      <NextStep href="/medicare-savings-program-eligibility" title="Most SSI recipients also qualify for help with Medicare" why="Check QMB, SLMB and QI with the 2026 limits." />
      <div className="mt-6">
        <ShareBar tool="ssiss" subject="SSI with Social Security" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`SSI: ${money2(r.ssi)}/mo`} />;
}
