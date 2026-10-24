"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { BarChart } from "@/components/tool/Charts";
import { NumberField, Segmented, BirthDateField, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, str, bool, date } from "@/hooks/useUrlState";
import { computeRmd, projectRmds, type AccountType } from "@/lib/calc/rmd";
import { money, money2, pct, longDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";

const DEFAULTS = {
  year: 2026,
  dob: { year: 1953, month: 6, day: 15 },
  bal: 500000,
  acct: "ira" as AccountType,
  sp: false,
  sdob: { year: 1965, month: 6, day: 15 },
  work: false,
  g: 5,
};

const ACCOUNTS: { value: AccountType; label: string }[] = [
  { value: "ira", label: "Traditional, SEP or SIMPLE IRA" },
  { value: "employer", label: "401(k), 403(b) or 457(b)" },
  { value: "roth-ira", label: "Roth IRA" },
  { value: "roth-401k", label: "Roth 401(k) / Roth 403(b)" },
];

export function RmdCalculator({ initialAge }: { initialAge?: number }) {
  const defaults = useMemo(
    () => (initialAge ? { ...DEFAULTS, dob: { year: SITE.copyrightYear - initialAge, month: 6, day: 15 } } : DEFAULTS),
    [initialAge],
  );
  const { state: s, set } = useUrlState(defaults, {
    year: num,
    dob: date,
    bal: num,
    acct: str(["ira", "employer", "roth-ira", "roth-401k"] as const),
    sp: bool,
    sdob: date,
    work: bool,
    g: num,
  });

  const spouse = s.sp ? { dob: s.sdob, soleBeneficiary: true } : undefined;
  const r = computeRmd({ dob: s.dob, year: s.year, priorYearEndBalance: s.bal, accountType: s.acct, spouse, stillWorkingException: s.acct === "employer" && s.work });
  const rows = useMemo(
    () => projectRmds({ dob: s.dob, startYear: s.year, balance: s.bal, growth: s.g / 100, throughAge: 100, spouse }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.dob, s.year, s.bal, s.g, s.sp, s.sdob],
  );
  const ageThisYear = s.year - s.dob.year;
  const showResult = r.status === "first-year" || r.status === "required";

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    const key = `${r.status}|${Math.round(r.amount / 1000)}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_rmd_result", { status: r.status, year: s.year, age: ageThisYear, bucket: Math.round(r.amount / 5000) * 5000, table: r.lookup?.table });
    }, 1200);
    return () => clearTimeout(t);
  }, [r.status, r.amount, r.lookup?.table, s.year, ageThisYear]);

  const balanceDate = `December 31, ${s.year - 1}`;
  const irmaaHref = `/irmaa-calculator?rmd=${Math.round(r.amount)}`;

  const inputs = (
    <>
      <Segmented
        label="RMD for which year?"
        value={s.year}
        onChange={(v) => set("year", v)}
        options={[
          { value: 2026, label: "2026 (due this year)" },
          { value: 2027, label: "2027 (plan ahead)" },
        ]}
        size="lg"
      />
      <BirthDateField label="Your date of birth" value={s.dob} onChange={(v) => set("dob", v)} minYear={1920} maxYear={1975} />
      <NumberField
        label={`Account balance on ${balanceDate}`}
        prefix="$"
        value={s.bal}
        onChange={(v) => set("bal", v ?? 0)}
        min={0}
        max={100000000}
        hint={
          s.year === 2027
            ? "Use your December 31, 2026 balance once you have it (it’s on your January statement). Your current balance is a fine estimate."
            : "It’s on your year-end statement. Don’t subtract anything you’ve withdrawn this year."
        }
      />
      <SelectField label="Type of account" value={s.acct} onChange={(v) => set("acct", v)} options={ACCOUNTS} />
      {s.acct === "employer" ? (
        <Toggle
          label="I still work for the employer that sponsors this plan"
          checked={s.work}
          onChange={(v) => set("work", v)}
          hint="And I own 5% or less of the company. (This exception never applies to IRAs.)"
        />
      ) : null}
      <Toggle
        label="My spouse is my only beneficiary and is more than 10 years younger"
        checked={s.sp}
        onChange={(v) => set("sp", v)}
        hint="This uses a different IRS table that lowers your RMD."
      />
      {s.sp ? <BirthDateField label="Spouse’s date of birth" value={s.sdob} onChange={(v) => set("sdob", v)} minYear={1930} maxYear={2005} /> : null}
      <details className="explainer">
        <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> Projection assumptions
        </summary>
        <div className="mt-4">
          <NumberField label="Yearly growth for the projection" suffix="%" decimals={1} value={s.g} onChange={(v) => set("g", v ?? 0)} min={-10} max={15} hint="Only affects future years in the chart, not this year’s RMD." />
        </div>
      </details>
    </>
  );

  let result: React.ReactNode;
  if (r.status === "not-required-roth") {
    result = (
      <ResultHero label={`Your ${s.year} RMD`} value="$0" tone="sage" sub="Roth IRAs have no required distributions while you’re alive — and since 2024, neither do Roth 401(k) and 403(b) accounts.">
        <Callout tone="sky" title="Heirs are different">
          People who inherit a Roth account usually must empty it within 10 years. See the <Link className="link" href="/inherited-ira-rmd-calculator">inherited IRA calculator</Link>.
        </Callout>
      </ResultHero>
    );
  } else if (r.status === "not-yet") {
    const firstRow = rows.find((x) => x.year === r.firstYear);
    result = (
      <ResultHero
        label={`Your ${s.year} RMD`}
        value="$0"
        tone="sage"
        sub={
          <>
            You don’t have an RMD yet. Born in {s.dob.year}, your RMD age is <strong>{r.applicableAge}</strong>, so your first required
            distribution is for <strong>{r.firstYear}</strong> (due by April 1, {r.firstYear + 1}).
          </>
        }
      >
        {firstRow ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label={`Estimated first RMD (${r.firstYear})`} value={money(firstRow.rmd)} sub={`If the balance grows ${s.g}% a year`} />
            <Stat label="Years until then" value={String(r.firstYear - s.year)} sub="Time for Roth conversions or QCD planning" />
          </div>
        ) : null}
      </ResultHero>
    );
  } else if (r.status === "deferred-still-working") {
    result = <ResultHero label={`Your ${s.year} RMD from this plan`} value="$0" tone="sage" sub={r.deadline} />;
  } else {
    result = (
      <>
        <ResultHero
          label={`Your ${s.year} required minimum distribution`}
          value={money2(r.amount)}
          tone="ink"
          sub={
            <>
              That’s <strong>{pct(r.pctOfBalance, 2)}</strong> of your {balanceDate} balance. Withdraw it by <strong>{r.status === "first-year" ? `April 1, ${s.year + 1}` : `December 31, ${s.year}`}</strong>.
            </>
          }
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Your age in the table" value={String(r.lookup!.ownerAge)} sub={`Age you reach in ${s.year}`} />
          <Stat label="IRS distribution period" value={String(r.lookup!.period)} sub={r.lookup!.table === "joint" ? "Joint & Last Survivor table" : "Uniform Lifetime table"} />
          <Stat label="Monthly if spread out" value={money(r.amount / 12)} sub="You can take it any way you like" />
        </div>

        {r.status === "first-year" ? (
          <div className="mt-5">
            <Callout tone="ember" title="First-year trap: waiting until April doubles up">
              You may delay this first RMD until April 1, {s.year + 1}, but your {s.year + 1} RMD is still due by December 31, {s.year + 1}. Taking both in one year
              can push you into a higher tax bracket — and raise Medicare premiums two years later through IRMAA.
            </Callout>
          </div>
        ) : null}

        <ShowMath>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Balance on {balanceDate}: <strong>{money2(s.bal)}</strong>
            </li>
            <li>
              Age you reach in {s.year}: {s.year} − {s.dob.year} = <strong>{r.lookup!.ownerAge}</strong>
              {r.lookup!.table === "joint" ? (
                <>
                  ; spouse: <strong>{r.lookup!.spouseAge}</strong>
                </>
              ) : null}
            </li>
            <li>
              {r.lookup!.table === "joint" ? "Joint and Last Survivor" : "Uniform Lifetime"} table factor:{" "}
              <a className="link" href="https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-9" target="_blank" rel="noopener">
                {r.lookup!.period}
              </a>
            </li>
            <li>
              {money2(s.bal)} ÷ {r.lookup!.period} = <strong>{money2(r.amount)}</strong>
            </li>
          </ol>
          <p className="mt-3">
            If you own several IRAs, add up each one’s RMD — you can withdraw the total from any of them. 401(k) RMDs must come out of each 401(k) separately.
          </p>
        </ShowMath>

        <div className="mt-8">
          <h3 className="text-[1.3rem] font-semibold">Your RMDs over time</h3>
          <p className="mt-1 text-[1rem] text-ink-3">Assuming {s.g}% yearly growth and only the RMD withdrawn. The percentage you must take rises every year.</p>
          <div className="mt-4">
            <BarChart
              data={rows.filter((x) => x.rmd > 0).slice(0, 28).map((x) => ({ x: x.age, y: x.rmd }))}
              highlight={ageThisYear}
              caption={`Projected RMD by age starting ${s.year}`}
            />
          </div>
          <details className="explainer mt-3">
            <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
              <Icon name="chev" size={18} className="chev transition-transform" /> See the year-by-year table
            </summary>
            <div className="mt-3 max-h-[26rem] overflow-auto rounded-2xl">
              <table className="table-sy text-[0.98rem]">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Age</th>
                    <th>Balance Jan 1</th>
                    <th>Factor</th>
                    <th>RMD</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((x) => x.rmd > 0)
                    .map((x) => (
                      <tr key={x.year} className={x.year === s.year ? "is-hit" : undefined}>
                        <td>{x.year}</td>
                        <td>{x.age}</td>
                        <td>{money(x.startBalance)}</td>
                        <td>{x.period}</td>
                        <td className="strong">{money(x.rmd)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href={irmaaHref} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
            <Icon name="shield" size={20} className="mt-0.5 text-sun-ink" />
            <span>
              <span className="block font-bold text-ink">Will this RMD raise my Medicare premium?</span>
              <span className="mt-1 block text-[0.95rem] text-ink-3">RMDs count toward IRMAA income two years later.</span>
            </span>
          </Link>
          <Link href={`/taxable-social-security-calculator?ira=${Math.round(r.amount)}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
            <Icon name="tax" size={20} className="mt-0.5 text-sun-ink" />
            <span>
              <span className="block font-bold text-ink">Will it make more of my Social Security taxable?</span>
              <span className="mt-1 block text-[0.95rem] text-ink-3">RMDs raise “provisional income”.</span>
            </span>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <CalculatorShell
        inputs={inputs}
        result={
          <>
            {result}
            <div className="mt-8 border-t border-[var(--hairline)] pt-6">
              <ShareBar tool="rmd" subject={`Our ${s.year} RMD estimate`} />
              <p className="mt-4 text-[0.9375rem] text-ink-3">
                Uses the IRS tables in effect for {s.year} (Treas. Reg. §1.401(a)(9)-9). Last verified {longDate("2026-10-23")}.
              </p>
            </div>
          </>
        }
        mobileSummary={showResult ? `${s.year} RMD: ${money(r.amount)}` : `${s.year} RMD: $0`}
      />
    </>
  );
}
