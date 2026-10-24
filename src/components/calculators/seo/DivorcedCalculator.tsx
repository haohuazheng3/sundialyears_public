"use client";

import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, SelectField, Toggle, Segmented } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { money } from "@/lib/format";
import { divorcedEligibility, spousalBenefit, survivorBenefit } from "@/lib/calc/ss-more";
import { NextStep, useResultTrack, MAX_INPUT, ageOptions, yearOptions } from "./kit";

const D = { my: 12, rem: false, rem60: false, alive: true, exage: 66, filed: false, ydiv: 4, by: 1963, age: 64 * 12, xpia: 2600, pia: 800 };

export function DivorcedCalculator() {
  const { state: s, set } = useUrlState(D, { my: num, rem: bool, rem60: bool, alive: bool, exage: num, filed: bool, ydiv: num, by: num, age: num, xpia: num, pia: num });
  const myAge = Math.floor(s.age / 12);
  const chk = divorcedEligibility({ marriageYears: s.my, remarried: s.rem, age: myAge, exAlive: s.alive, exAge: s.exage, exClaimed: s.filed, yearsDivorced: s.ydiv, remarriedAfter60: s.rem60 });
  const sp = spousalBenefit({ workerPia: s.xpia, ownPia: s.pia, birthYear: s.by, claimAgeMonths: s.age });
  const sv = survivorBenefit({ deceasedPia: s.xpia, deceasedBenefit: null, survivorBirthYear: s.by, claimAgeMonths: s.age });
  const amount = s.alive ? sp.total : Math.max(sv.benefit, sp.ownBenefit);
  useResultTrack("calc_divorced_result", JSON.stringify(s), { eligible: chk.eligible, alive: s.alive });

  const inputs = (
    <>
      <Segmented label="Your ex-spouse is" value={s.alive ? "alive" : "dead"} onChange={(v) => set("alive", v === "alive")} options={[{ value: "alive", label: "Living" }, { value: "dead", label: "Deceased" }]} />
      <NumberField label="Years you were married" suffix="yrs" value={s.my} onChange={(v) => set("my", v ?? 0)} min={0} max={80} />
      <Toggle label="I am remarried now" checked={s.rem} onChange={(v) => set("rem", v)} />
      {!s.alive && s.rem ? <Toggle label="I remarried at 60 or later" checked={s.rem60} onChange={(v) => set("rem60", v)} /> : null}
      {s.alive ? (
        <>
          <NumberField label="Your ex's age" suffix="yrs" value={s.exage} onChange={(v) => set("exage", v ?? 0)} min={40} max={110} />
          <Toggle label="My ex has started Social Security" checked={s.filed} onChange={(v) => set("filed", v)} />
          {!s.filed ? <NumberField label="Years since the divorce" suffix="yrs" value={s.ydiv} onChange={(v) => set("ydiv", v ?? 0)} min={0} max={70} /> : null}
        </>
      ) : null}
      <NumberField label="Your ex's benefit at full retirement age" prefix="$" value={s.xpia} onChange={(v) => set("xpia", v ?? 0)} min={0} max={MAX_INPUT} hint="SSA will look it up for you when you apply; an estimate is fine here." />
      <NumberField label="Your own benefit at full retirement age" prefix="$" value={s.pia} onChange={(v) => set("pia", v ?? 0)} min={0} max={MAX_INPUT} />
      <SelectField label="Your birth year" value={s.by} onChange={(v) => set("by", v)} options={yearOptions(1950, 1975)} />
      <SelectField label="Age you would start" value={s.age} onChange={(v) => set("age", v)} options={ageOptions(s.alive ? 62 : 60, 70)} />
    </>
  );

  const result = (
    <>
      <ResultHero
        label={chk.eligible ? "You qualify — estimated check" : "Not eligible yet"}
        value={chk.eligible ? money(amount) : "—"}
        tone={chk.eligible ? "sage" : "ember"}
        sub={
          chk.eligible ? (
            s.alive ? (
              <>Your own {money(sp.ownBenefit)} plus a divorced-spouse top-up of {money(sp.excessPaid)}. Your ex is not notified and their check does not change.</>
            ) : (
              <>As a surviving divorced spouse you can get up to 100% of your ex&rsquo;s benefit at survivor full retirement age.</>
            )
          ) : (
            <>One or more conditions below is not met yet.</>
          )
        }
      />
      <ul className="mt-6 space-y-2">
        {chk.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-2.5 text-[1.0625rem]">
            <Icon name={r.ok ? "check" : "close"} size={20} className={`mt-0.5 shrink-0 ${r.ok ? "text-sage" : "text-ember"}`} />
            <span className={r.ok ? "text-ink-2" : "font-semibold text-ink"}>{r.text}</span>
          </li>
        ))}
      </ul>
      {s.alive ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Stat label="Most you can get on their record" value={money(sp.maxSpousal)} sub="50% at your full retirement age" />
          <Stat label="Top-up at your start age" value={money(sp.excessPaid)} />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Stat label="Survivor benefit at your start age" value={money(sv.benefit)} />
          <Stat label="Your own at that age" value={money(sp.ownBenefit)} />
        </div>
      )}
      <ShowMath>
        <p>
          A divorced spouse is paid exactly like a current spouse: up to half the ex&rsquo;s full-retirement-age benefit, minus your own, reduced if you start before your full retirement age. After 2 years of divorce you can be paid even if your ex hasn&rsquo;t filed. A surviving divorced spouse is paid like a widow(er): 71.5% at 60 rising to 100%. Several ex-spouses can all claim on one record without reducing each other.
        </p>
      </ShowMath>
      {!s.alive || s.rem ? null : (
        <div className="mt-5">
          <Callout tone="sky" title="If you remarry">
            <p>Remarrying ends divorced-spouse benefits (unless that marriage also ends). Survivor benefits on an ex survive a remarriage at 60 or later.</p>
          </Callout>
        </div>
      )}
      <NextStep href="/social-security-spousal-benefits-calculator" title="Compare with a current spouse's record" why="If you have remarried, see what the new spouse's record would pay instead." />
      <div className="mt-6">
        <ShareBar tool="divorced" subject="My divorced-spouse Social Security check" />
      </div>
    </>
  );
  return <CalculatorShell inputs={inputs} result={result} mobileSummary={chk.eligible ? `Estimated: ${money(amount)}/mo` : "Not eligible yet"} />;
}
