"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { NumberField, Segmented, BirthDateField, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, str, bool, date } from "@/hooks/useUrlState";
import { computeInherited, compareSpouseOptions, ownerRbdStatus, type InheritedAccount, type InheritedInput, type Relationship, type SpouseChoice } from "@/lib/calc/inherited";
import { daysInMonth, type YMD } from "@/lib/calc/dates";
import { money, pct, longDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { track } from "@/lib/analytics";
import { ACCOUNT_OPTIONS, CLOSE_GAP, FIVE, MAJORITY_AGE, OWNER_SHARE_LIMIT, REL_OPTIONS, SECURE_FIRST_DEATH_YEAR, TEN, categoryShort } from "./copy";
import { DoMath, Hero, RulesCard, Schedule, SpouseOptions, Warnings, basisText, fmtFactor } from "./ResultParts";

const THIS_YEAR: number = SITE.copyrightYear;
const NEXT_YEAR = THIS_YEAR + 1;

const DEFAULTS = {
  year: THIS_YEAR,
  odob: { year: 1944, month: 4, day: 12 },
  dod: { year: 2024, month: 8, day: 20 },
  bdob: { year: 1970, month: 9, day: 3 },
  bal: 400000,
  rel: "child" as Relationship,
  acct: "ira" as InheritedAccount,
  sc: "bene" as SpouseChoice,
  ten: false,
  took: false,
  work: false,
  g: 5,
};

/** Input bounds for the balance and growth fields (UI limits, not tax parameters). */
const BAL_MAX = 100000000;
const GROWTH_RANGE = [-10, 15] as const;

/** Year ranges offered by the date pickers (input bounds, not tax parameters). */
const OWNER_DOB_RANGE = [1900, THIS_YEAR - 18] as const;
const DOD_RANGE = [1990, THIS_YEAR] as const;
const BENE_DOB_RANGE = [1915, THIS_YEAR] as const;

/** Keeps shared-link dates inside the pickers' ranges and real calendar days. */
function clampYmd(d: YMD, [lo, hi]: readonly [number, number]): YMD {
  const year = Math.min(hi, Math.max(lo, d.year));
  return { year, month: d.month, day: Math.min(d.day, daysInMonth(year, d.month)) };
}

const ymdParam = (d: YMD) => `${d.year}-${d.month}-${d.day}`;

export function InheritedCalculator() {
  const { state: s, set } = useUrlState(DEFAULTS, {
    year: num,
    odob: date,
    dod: date,
    bdob: date,
    bal: num,
    rel: str(["spouse", "child", "disabled", "close-age", "other", "estate"] as const),
    acct: str(["ira", "plan", "roth"] as const),
    sc: str(["bene", "own"] as const),
    ten: bool,
    took: bool,
    work: bool,
    g: num,
  });

  const year = s.year === NEXT_YEAR ? NEXT_YEAR : THIS_YEAR;
  const ownerDob = clampYmd(s.odob, OWNER_DOB_RANGE);
  const ownerDod = clampYmd(s.dod, DOD_RANGE);
  const beneDob = clampYmd(s.bdob, BENE_DOB_RANGE);
  // Shared links and typing can carry any number: keep the math inside the fields' own limits.
  const bal = Number.isFinite(s.bal) ? Math.min(BAL_MAX, Math.max(0, s.bal)) : 0;
  const growthPct = Number.isFinite(s.g) ? Math.min(GROWTH_RANGE[1], Math.max(GROWTH_RANGE[0], s.g)) : 0;
  const isEstate = s.rel === "estate";
  const isSpouse = s.rel === "spouse";
  const isRoth = s.acct === "roth";
  const D = ownerDod.year;

  const input: InheritedInput = {
    ownerDob,
    ownerDod,
    beneDob,
    relationship: s.rel,
    account: s.acct,
    ownerStillWorking: s.acct === "plan" && s.work,
    year,
    balance: bal,
    growth: growthPct / 100,
    electTenYear: s.ten,
    spouseChoice: s.sc,
    ownerTookDeathYearRmd: s.took,
  };
  const r = computeInherited(input);
  const cmp = isSpouse && !r.problem ? compareSpouseOptions(input) : null;
  const plan = r.plan;
  const st = r.thisYear.status;
  const deadline = plan.deadlineYear;
  const owed = Math.max(0, Math.round((r.totalDue - r.thisYear.amount) * 100) / 100);
  const divisor = r.thisYear.divisor;
  const calendarAfterRbd = ownerRbdStatus(ownerDob, ownerDod, "ira").diedOnOrAfterRbd;
  const showTook = r.deathYearRmd != null && (year === D || year === D + 1);
  const balanceDate = `December 31, ${year - 1}`;

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  const yearsLeft = deadline != null ? deadline - year : null;
  useEffect(() => {
    const key = `${plan.method}|${st}|${Math.round(r.totalDue / 1000)}|${year}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_inherited_result", {
        method: plan.method,
        category: plan.category,
        status: st,
        year,
        afterRbd: plan.rbd.diedOnOrAfterRbd,
        acct: s.acct,
        yearsLeft,
        bucket: Math.round(r.totalDue / 5000) * 5000,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [plan.method, plan.category, plan.rbd.diedOnOrAfterRbd, st, r.totalDue, year, s.acct, yearsLeft]);

  // ── Inputs ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const inputs = (
    <>
      <Segmented
        label="Withdrawal for which year?"
        value={year}
        onChange={(v) => set("year", v)}
        options={[
          { value: THIS_YEAR, label: `${THIS_YEAR} (this year)` },
          { value: NEXT_YEAR, label: `${NEXT_YEAR} (plan ahead)` },
        ]}
        size="lg"
      />
      <SelectField
        label="Who are you to the person who died?"
        value={s.rel}
        onChange={(v) => set("rel", v)}
        options={REL_OPTIONS}
        hint={
          s.rel === "child"
            ? `Children under ${MAJORITY_AGE} at the date of death get special rules; we check the dates for you.`
            : s.rel === "disabled"
              ? "Disabled or chronically ill on the date of death (a Social Security disability finding counts)."
              : s.rel === "close-age"
                ? `A sibling, partner or friend born no more than ${CLOSE_GAP} years after the owner (or older).`
                : s.rel === "estate"
                  ? "The account passed to an estate, charity or a trust that doesn’t qualify as a “see-through” trust."
                  : undefined
        }
      />
      <SelectField label="Type of account you inherited" value={s.acct} onChange={(v) => set("acct", v)} options={ACCOUNT_OPTIONS} />
      <BirthDateField label="Original owner’s date of birth" value={ownerDob} onChange={(v) => set("odob", v)} minYear={OWNER_DOB_RANGE[0]} maxYear={OWNER_DOB_RANGE[1]} />
      <BirthDateField
        label="Date the owner died"
        value={ownerDod}
        onChange={(v) => set("dod", v)}
        minYear={DOD_RANGE[0]}
        maxYear={DOD_RANGE[1]}
        hint="The exact day matters: it decides whether they died before or after their required beginning date (April 1 after the year they reached RMD age)."
      />
      {!isEstate ? (
        <BirthDateField label="Your date of birth" value={beneDob} onChange={(v) => set("bdob", v)} minYear={BENE_DOB_RANGE[0]} maxYear={BENE_DOB_RANGE[1]} />
      ) : null}
      <NumberField
        label={`Inherited account balance on ${balanceDate}`}
        prefix="$"
        value={s.bal}
        onChange={(v) => set("bal", v ?? 0)}
        min={0}
        max={BAL_MAX}
        hint={
          year === NEXT_YEAR
            ? `Use the December 31, ${THIS_YEAR} balance once you have it. Today’s balance is a fair estimate.`
            : "It’s on the year-end statement. If you hold several inherited IRAs from the same person, enter their total."
        }
      />
      {isSpouse ? (
        <Segmented
          label="What are you doing with it?"
          value={s.sc}
          onChange={(v) => set("sc", v)}
          options={[
            { value: "bene", label: "Keep as inherited" },
            { value: "own", label: "Make it my own" },
          ]}
          hint="Not sure? Leave it on “inherited” — the comparison below shows both."
          size="lg"
        />
      ) : null}
      {s.acct === "plan" && calendarAfterRbd ? (
        <Toggle
          label="They still worked for the employer that sponsors this plan"
          checked={s.work}
          onChange={(v) => set("work", v)}
          hint={`And owned ${pct(OWNER_SHARE_LIMIT)} or less of the company. Their plan RMDs then hadn’t started yet.`}
        />
      ) : null}
      {plan.canElectTenYear ? (
        <Toggle
          label={`I chose the ${TEN}-year rule instead of yearly payouts`}
          checked={s.ten}
          onChange={(v) => set("ten", v)}
          hint="Eligible beneficiaries can choose this when the owner died before their required beginning date. Check your IRA paperwork."
        />
      ) : null}
      {showTook ? (
        <Segmented
          label={`Did the owner take their full ${D} RMD before they died?`}
          value={s.took ? 1 : 0}
          onChange={(v) => set("took", v === 1)}
          options={[
            { value: 1, label: "Yes" },
            { value: 0, label: "No / not sure" },
          ]}
          hint="Ask the IRA company if you don’t know. If it wasn’t taken, the beneficiary must take it."
          size="lg"
        />
      ) : null}
      <details className="explainer">
        <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> Projection assumptions
        </summary>
        <div className="mt-4">
          <NumberField
            label="Yearly growth for the projection"
            suffix="%"
            decimals={1}
            value={s.g}
            onChange={(v) => set("g", v ?? 0)}
            min={GROWTH_RANGE[0]}
            max={GROWTH_RANGE[1]}
            hint="Only affects future years in the schedule, not this year’s amount."
          />
        </div>
      </details>
    </>
  );

  // ── Result ──────────────────────────────────────────────────────────────────────────────────────────────────────
  let result: React.ReactNode;
  if (r.problem) {
    result = (
      <ResultHero
        label={`What you must withdraw in ${year}`}
        value="Check dates"
        tone="ember"
        sub={
          r.problem === "death-before-birth"
            ? "The date of death is before the owner’s date of birth. Please check both dates."
            : r.problem === "beneficiary-after-death"
              ? "Your date of birth is after the date of death. Please check the dates (a child born after the owner died can choose “son or daughter”)."
              : `The owner died in ${D}, after the year you picked. Choose a later year.`
        }
      />
    );
  } else {
    result = (
      <>
        <Hero r={r} year={year} bal={bal} owed={owed} D={D} balanceDate={balanceDate} account={s.acct} />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Account must be empty by"
            value={deadline != null ? `Dec 31, ${deadline}` : "No deadline"}
            sub={
              deadline == null
                ? plan.method === "spouse-own"
                  ? "It’s your own account now"
                  : "Payouts over life expectancy"
                : plan.deadlineKind === "minor-child"
                  ? `${TEN} years after you turn ${MAJORITY_AGE}`
                  : plan.deadlineKind === "five-year"
                    ? `${FIVE}-year rule`
                    : `Year of the ${TEN}th anniversary of the death`
            }
            tone={deadline != null && deadline <= year ? "ember" : undefined}
          />
          <Stat
            label="Your beneficiary type"
            value={categoryShort(plan.category)}
            sub={
              plan.grandfathered && plan.category !== "none"
                ? `Death before ${SECURE_FIRST_DEATH_YEAR}: old stretch rules`
                : plan.edb
                  ? "Eligible designated beneficiary"
                  : plan.category === "none"
                    ? "No person named"
                    : "Not an “eligible” beneficiary"
            }
          />
          {divisor ? (
            <Stat
              label={`IRS divisor for ${year}`}
              value={divisor.value <= 1 ? "1.0 or less" : fmtFactor(divisor.value)}
              sub={divisor.value <= 1 ? "Whole balance is due" : basisText(divisor)}
            />
          ) : (
            <Stat label="First yearly RMD" value={plan.firstYear != null ? String(plan.firstYear) : "None"} sub={plan.firstYear != null ? "Year your minimums begin" : "No yearly minimum"} />
          )}
        </div>

        <RulesCard r={r} ownerDob={ownerDob} ownerDod={ownerDod} />
        <Warnings r={r} year={year} bal={bal} D={D} beneDob={beneDob} ownerDob={ownerDob} ownerDod={ownerDod} account={s.acct} took={s.took} showTook={showTook} />

        <DoMath r={r} year={year} bal={bal} D={D} beneDob={beneDob} balanceDate={balanceDate} />

        {cmp ? <SpouseOptions cmp={cmp} year={year} account={s.acct} /> : null}

        <Schedule r={r} year={year} growth={growthPct} isEstate={isEstate} isRoth={isRoth} />

        {/* Roth withdrawals are usually tax-free, so they are not passed on to the tax tools as taxable IRA income. */}
        {!isRoth || isSpouse ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {!isRoth ? (
              <>
                <Link href={`/irmaa-calculator?rmd=${Math.round(r.totalDue)}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
                  <Icon name="shield" size={20} className="mt-0.5 text-sun-ink" />
                  <span>
                    <span className="block font-bold text-ink">Will these withdrawals raise my Medicare premium?</span>
                    <span className="mt-1 block text-[0.95rem] text-ink-3">Inherited IRA income counts toward IRMAA two years later.</span>
                  </span>
                </Link>
                <Link
                  href={`/taxable-social-security-calculator?ira=${Math.round(r.totalDue)}`}
                  className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]"
                >
                  <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
                  <span>
                    <span className="block font-bold text-ink">Will it make more of my Social Security taxable?</span>
                    <span className="mt-1 block text-[0.95rem] text-ink-3">Withdrawals raise your “provisional income”.</span>
                  </span>
                </Link>
              </>
            ) : null}
            {isSpouse ? (
              <Link
                href={`/rmd-calculator?year=${year}&dob=${ymdParam(beneDob)}&bal=${Math.round(bal)}&acct=${isRoth ? "roth-ira" : "ira"}`}
                className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)] sm:col-span-2"
              >
                <Icon name="rmd" size={20} className="mt-0.5 text-sun-ink" />
                <span>
                  <span className="block font-bold text-ink">Made it your own? Project your own RMDs</span>
                  <span className="mt-1 block text-[0.95rem] text-ink-3">Opens the regular RMD calculator with your birth date and this balance.</span>
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  const summary = r.problem ? `${year}: check the dates` : `${year} withdrawal: ${money(r.totalDue)}${deadline != null ? ` · empty by ${deadline}` : ""}`;

  return (
    <CalculatorShell
      inputs={inputs}
      inputsTitle="About the account"
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="inherited-ira" subject={`Inherited IRA: what must come out in ${year}`} />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              Uses the final IRS regulations (T.D. 10001) and the Single Life Table in Treas. Reg. §1.401(a)(9)-9. Assumes you are the only beneficiary of
              this account. Last verified {longDate(SITE.dataVerifiedOn)}.
            </p>
          </div>
        </>
      }
      mobileSummary={summary}
    />
  );
}
