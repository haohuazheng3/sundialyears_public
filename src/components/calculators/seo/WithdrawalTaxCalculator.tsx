"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, str, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { withdrawalNet, grossUp } from "@/lib/calc/tax-more";
import { HouseholdFields, HH_DEFAULTS, HH_SCHEMA, toHousehold, type Fs } from "./household";
import { NextStep, useResultTrack, MAX_INPUT } from "./kit";

const D = { ...HH_DEFAULTS, ira: 0, fs: "single" as Fs, age65: 0, ss: 0, pen: 0, int: 1000, cg: 0, mode: "gross" as "gross" | "net", amt: 40000, acct: "plan" as "plan" | "ira", under: false, st: 4 };

export function WithdrawalTaxCalculator() {
  const { state: s, set } = useUrlState(D, { ...HH_SCHEMA, mode: str(["gross", "net"] as const), amt: num, acct: str(["plan", "ira"] as const), under: bool, st: num });
  const o = { penalty: s.under, statePct: s.st, account: s.acct };
  const base = toHousehold(s);
  const r = s.mode === "gross" ? withdrawalNet(base, s.amt, o) : grossUp(base, s.amt, o);
  useResultTrack("calc_withdrawtax_result", JSON.stringify(s), { mode: s.mode, acct: s.acct });

  const inputs = (
    <>
      <Segmented label="I want to" value={s.mode} onChange={(v) => set("mode", v)} options={[{ value: "gross", label: "Withdraw an amount" }, { value: "net", label: "End up with an amount" }]} />
      <NumberField label={s.mode === "gross" ? "Amount to withdraw" : "Amount you need after tax"} prefix="$" value={s.amt} onChange={(v) => set("amt", v ?? 0)} min={0} max={MAX_INPUT} />
      <Segmented label="Account" value={s.acct} onChange={(v) => set("acct", v)} options={[{ value: "plan", label: "401(k) / 403(b)" }, { value: "ira", label: "IRA" }]} />
      <Toggle label="I'm under 59½ (and no exception applies)" checked={s.under} onChange={(v) => set("under", v)} />
      <NumberField label="State income tax rate" suffix="%" decimals={2} value={s.st} onChange={(v) => set("st", v ?? 0)} min={0} max={15} hint="Use 0 if your state doesn't tax retirement withdrawals." />
      <HouseholdFields s={s} set={set} show={["ss", "pen", "int", "cg"]} />
    </>
  );

  const result = (
    <>
      <ResultHero label={s.mode === "gross" ? "You keep" : "Withdraw this much"} value={money(s.mode === "gross" ? r.net : r.gross)} tone="sun" sub={<>From {money(r.gross)}: federal tax {money(r.fedTax)}{r.penalty ? `, 10% penalty ${money(r.penalty)}` : ""}{r.stateTax ? `, state ${money(r.stateTax)}` : ""}.</>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Withheld at payout" value={money(r.withheld)} sub={s.acct === "plan" ? "20% required" : "10% default"} />
        <Stat label={r.owedAtFiling >= 0 ? "Still owed at tax time" : "Refund at tax time"} value={money(Math.abs(r.owedAtFiling))} tone={r.owedAtFiling > 0 ? "ember" : "sage"} sub="federal, incl. penalty" />
        <Stat label="Total cost" value={money(r.fedTax + r.penalty + r.stateTax)} />
      </div>
      {r.owedAtFiling > 500 ? (
        <div className="mt-5">
          <Callout tone="ember" title="Withholding won't cover it">
            <p>Ask for extra federal withholding on the distribution, or make an estimated payment, to avoid an underpayment penalty.</p>
          </Callout>
        </div>
      ) : null}
      <ShowMath>
        <p>
          Federal tax is the difference between your 2026 tax with and without the withdrawal, so it reflects your bracket, the standard deduction and any extra Social Security that becomes taxable. Employer plans must withhold 20% of payouts that could be rolled over; IRAs withhold 10% unless you choose another rate on Form W-4R. State tax uses the flat rate you enter.
        </p>
      </ShowMath>
      <NextStep href={s.under ? "/rule-of-55-calculator" : "/retirement-tax-calculator"} title={s.under ? "Left your job at 55 or later?" : "See your whole-year tax"} why={s.under ? "The Rule of 55 may wipe out the 10% penalty." : "All income sources, with the senior deduction."} />
      <div className="mt-6">
        <ShareBar tool="withdrawtax" subject="My 401(k) withdrawal after tax" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={s.mode === "gross" ? `You keep ${money(r.net)}` : `Withdraw ${money(r.gross)}`} />;
}
