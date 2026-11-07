"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { useUrlState } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { computeFedTax } from "@/lib/calc/fed-tax";
import { zeroRateRoom } from "@/lib/calc/tax-more";
import { CAP_GAINS_2026 } from "@/data/params/tax";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold } from "./household";
import { NextStep, useResultTrack } from "./kit";

const D = { ...HH_DEFAULTS, ira: 15000, cg: 25000 };

export function CapGainsCalculator() {
  const { state: s, set } = useUrlState(D, HH_SCHEMA);
  const t = computeFedTax(toHousehold(s));
  const room = zeroRateRoom(toHousehold(s));
  const p = t.pref;
  const key = s.fs === "mfj" || s.fs === "qss" ? "mfj" : s.fs === "hoh" ? "hoh" : s.fs === "mfs" ? "mfs" : "single";
  const ceiling = CAP_GAINS_2026.value[key][0];
  useResultTrack("calc_capgains_result", JSON.stringify(s), { room });

  const inputs = <HouseholdFields s={s} set={set} />;

  const result = (
    <>
      <ResultHero label="More gains you could take at 0%" value={money(room)} tone="sage" sub={<>Beyond the {money(s.cg)} you entered, with no extra federal tax — after accounting for Social Security that becomes taxable.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Gain taxed at 0%" value={money(p.at0)} tone="sage" />
        <Stat label="Gain taxed at 15%" value={money(p.at15)} />
        <Stat label="0% bracket ends at" value={money(ceiling)} sub="taxable income, 2026" />
      </div>
      <div className="mt-5">
        <Callout tone="sun" title="There's no age break — but there is a trap">
          <p>Turning 65 doesn&rsquo;t change capital gains rates. What changes things for retirees is Social Security: extra gains can make more benefits taxable, which can turn a &ldquo;0%&rdquo; gain into a taxed one. The room shown already includes that effect.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Long-term gains and qualified dividends stack on top of ordinary taxable income. The part below {money(ceiling)} of taxable income is taxed at 0%, then 15%, then 20%. We find the largest extra gain that leaves your 2026 federal tax unchanged by recalculating the full return. The 3.8% NIIT is included if your income is high enough.
        </p>
      </ShowMath>
      <NextStep href="/net-investment-income-tax-calculator" title="Selling a lot? Check the 3.8% NIIT" why="It applies above $200,000 single / $250,000 joint, never indexed." />
      <div className="mt-6">
        <ShareBar tool="capgains" subject="My 0% capital gains room" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`0% room: ${money(room)}`} />;
}
