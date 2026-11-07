"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField } from "@/components/ui/Fields";
import { useUrlState, num, numOrNull } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { qlacRmds } from "@/lib/calc/tax-more";
import { QLAC } from "@/data/params/rmd";
import { NextStep, useResultTrack, MAX_INPUT, MiniTable } from "./kit";

const D = { bal: 900000, prem: 210000, age: 73, start: 85, g: 5, tax: 22, quote: null as number | null };

export function QlacCalculator() {
  const { state: s, set } = useUrlState(D, { bal: num, prem: num, age: num, start: num, g: num, tax: num, quote: numOrNull });
  const r = qlacRmds({ balance: s.bal, premium: s.prem, age: s.age, startAge: s.start, growthPct: s.g });
  const taxSaved = Math.round((r.totalLower * s.tax) / 100);
  const firstRow = r.rows[0];
  useResultTrack("calc_qlac_result", JSON.stringify(s), { premium: r.premium });

  const inputs = (
    <>
      <NumberField label="IRA / 401(k) balance" prefix="$" value={s.bal} onChange={(v) => set("bal", v ?? 0)} min={0} max={MAX_INPUT} />
      <NumberField label="Amount moved into the QLAC" prefix="$" value={s.prem} onChange={(v) => set("prem", v ?? 0)} min={0} max={MAX_INPUT} hint={`2026 limit: ${money(QLAC.value.limit)} per person.`} />
      <SelectField label="Your age now" value={s.age} onChange={(v) => set("age", v)} options={Array.from({ length: 21 }, (_, i) => ({ value: 60 + i, label: String(60 + i) }))} />
      <SelectField label="QLAC payments start at" value={s.start} onChange={(v) => set("start", v)} options={Array.from({ length: 16 }, (_, i) => ({ value: 70 + i, label: `Age ${70 + i}` }))} />
      <NumberField label="Expected yearly growth" suffix="%" decimals={1} value={s.g} onChange={(v) => set("g", v ?? 0)} min={-5} max={15} />
      <NumberField label="Your tax bracket" suffix="%" value={s.tax} onChange={(v) => set("tax", v ?? 0)} min={0} max={37} />
      <NumberField label="Insurer's quote: yearly income at start (optional)" prefix="$" value={s.quote} onChange={(v) => set("quote", v)} min={0} max={MAX_INPUT} hint="From a real QLAC quote for this premium and start age." />
    </>
  );

  const result = (
    <>
      <ResultHero label="RMDs avoided until the QLAC starts" value={money(r.totalLower)} tone="sun" sub={<>About {money(taxSaved)} of tax deferred at a {s.tax}% bracket{firstRow ? `; your RMD at ${firstRow.age} drops by ${money(firstRow.lower)}` : ""}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Premium (capped)" value={money(r.premium)} />
        <Stat label="Income starts" value={`Age ${r.start}`} />
        <Stat label="Quoted income" value={s.quote ? `${money(s.quote)}/yr` : "—"} sub={s.quote ? `${((s.quote / Math.max(1, r.premium)) * 100).toFixed(1)}% of premium` : "add a quote"} tone="sage" />
      </div>
      {r.rows.length ? <MiniTable head={["Age", "RMD without", "RMD with QLAC", "Lower by"]} rows={r.rows.filter((_, i) => i % 2 === 0).map((x) => [String(x.age), money(x.rmdWithout), money(x.rmdWith), money(x.lower)])} /> : null}
      <div className="mt-5">
        <Callout tone="sun" title="Our take">
          <p>A QLAC is longevity insurance first and an RMD trick second. The tax deferral is modest; the real value is guaranteed income if you live into your 90s. Buy one for that reason, or not at all.</p>
        </Callout>
      </div>
      <ShowMath>
        <p>
          Money in a qualifying longevity annuity contract is left out of the balance used for RMDs until payments begin (no later than 85). We compare RMDs on your balance with and without the premium, both growing at {s.g}%, using the IRS Uniform Lifetime Table. The {money(QLAC.value.limit)} limit applies across all your accounts; the old 25%-of-balance cap no longer exists.
        </p>
      </ShowMath>
      <NextStep href="/rmd-calculator" title="Your RMD this year" why="The full calculation with your birth date and balance." />
      <div className="mt-6">
        <ShareBar tool="qlac" subject="My QLAC and RMD estimate" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={`RMDs avoided: ${money(r.totalLower)}`} />;
}
