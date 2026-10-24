"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { StatusChip } from "@/components/tool/StatusChip";
import { NumberField, Segmented, SelectField, Toggle } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useUrlState, num, str, bool } from "@/hooks/useUrlState";
import {
  computeFedTax,
  marginalDetail,
  torpedoCurve,
  torpedoZones,
  maxPeople,
  scheduleKey,
  w4vRateToCover,
  type FedTaxInput,
} from "@/lib/calc/fed-tax";
import { incomeRoom, worksheet1Labels, type FilingStatus, type Worksheet1Lines } from "@/lib/calc/ss-tax";
import { BRACKETS_2026, SENIOR_DEDUCTION, NIIT, QCD, SS_WITHHOLDING_RATES, IRS_2027_ADJUSTMENTS } from "@/data/params/tax";
import { SRC } from "@/data/params/sources";
import { SRC_SS_TAX, SS_INCLUSION, CAP_GAINS_RATES, NIIT_SOURCE } from "@/data/params/ss-tax-extra";
import { money, moneySmart, pct, longDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { track } from "@/lib/analytics";
import { ProvisionalIncomeBar } from "./ProvisionalIncomeBar";
import { TorpedoChart } from "./TorpedoChart";

const FS_VALUES = ["single", "mfj", "hoh", "mfs", "mfsApart", "qss"] as const satisfies readonly FilingStatus[];

const FILING: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "hoh", label: "Head of household" },
  { value: "qss", label: "Qualifying surviving spouse" },
  { value: "mfs", label: "Married filing separately — lived together at any time" },
  { value: "mfsApart", label: "Married filing separately — lived apart all year" },
];

/** Defaults: a married couple, both 65+, with typical benefits and IRA withdrawals — so a result shows immediately. */
const DEFAULTS = {
  fs: "mfj" as FilingStatus,
  ss: 48000,
  ira: 40000,
  pen: 0,
  other: 0,
  tei: 0,
  age65: 2,
  wages: 0,
  int: 0,
  qd: 0,
  blind: 0,
  item: 0,
  adj: 0,
  niit: true,
};

/** The tax year whose brackets and deductions the estimate uses (2027 not announced by the IRS yet). */
const TAX_YEAR = 2026;
const TORPEDO_DELTA = 1000;
/** Field ranges (input sanity limits, not tax figures). Out-of-range entries are flagged by the field and clamped here. */
const SS_MAX = 500000;
const AMOUNT_MAX = 10000000;
/** Non-negative, finite and within the field's range, so a pasted 300-digit number can't overflow to Infinity. */
const clampAmt = (x: number, max = AMOUNT_MAX) => (Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0);

const W1_LABELS = worksheet1Labels();
const W1_LINES = Object.keys(W1_LABELS).map(Number) as (keyof Worksheet1Lines)[];

const FS_SHORT: Record<FilingStatus, string> = {
  single: "single",
  mfj: "married filing jointly",
  hoh: "head of household",
  qss: "qualifying surviving spouse",
  mfs: "married filing separately (lived together)",
  mfsApart: "married filing separately (lived apart)",
};

/** IRMAA calculator accepts single | mfj | mfs (URL contract); HOH, QSS and MFS-lived-apart use the individual table. */
const irmaaFs = (fs: FilingStatus) => (fs === "mfj" ? "mfj" : fs === "mfs" ? "mfs" : "single");

/** 70.5 → "70½". */
const halfAge = (n: number) => (n % 1 === 0.5 ? `${Math.floor(n)}½` : String(n));

export function SsTaxCalculator() {
  const { state: s, set } = useUrlState(DEFAULTS, {
    fs: str(FS_VALUES),
    ss: num,
    ira: num,
    pen: num,
    other: num,
    tei: num,
    age65: num,
    wages: num,
    int: num,
    qd: num,
    blind: num,
    item: num,
    adj: num,
    niit: bool,
  });

  const maxP = maxPeople(s.fs);
  const age65 = Math.max(0, Math.min(maxP, Math.round(Number.isFinite(s.age65) ? s.age65 : 0)));
  const blind = Math.max(0, Math.min(maxP, Math.round(Number.isFinite(s.blind) ? s.blind : 0)));
  const benefits = clampAmt(s.ss, SS_MAX);
  const ira = clampAmt(s.ira);
  const adj = clampAmt(s.adj);
  const tei = clampAmt(s.tei);

  const input: FedTaxInput = {
    year: TAX_YEAR,
    filingStatus: s.fs,
    ssBenefits: benefits,
    wages: clampAmt(s.wages),
    pension: clampAmt(s.pen),
    iraDistributions: ira,
    taxableInterest: clampAmt(s.int),
    qualifiedDividendsLtcg: clampAmt(s.qd),
    otherOrdinary: clampAmt(s.other),
    taxExemptInterest: tei,
    adjustments: adj,
    itemizedDeductions: clampAmt(s.item),
    people65: age65,
    peopleBlind: blind,
    includeNiit: s.niit,
  };
  const r = computeFedTax(input);
  const md = marginalDetail(input, TORPEDO_DELTA);
  const noSenior = computeFedTax({ ...input, applySeniorDeduction: false });
  const ss = r.ss;
  const room = incomeRoom(ss);
  const pi = ss.provisionalIncome;
  const { tier1, tier2, maxFraction } = SS_INCLUSION.value;
  const sd = SENIOR_DEDUCTION.value;

  // Torpedo curve: everything except the IRA line held fixed (~60 points × 2 whole-return recomputes of plain
  // arithmetic — cheap enough to run on every render without memoization).
  const curveTo = Math.max(150000, Math.ceil((ira * 1.25) / 10000) * 10000);
  const curveStep = curveTo <= 150000 ? 2500 : Math.ceil(curveTo / 60 / 500) * 500;
  const curve = torpedoCurve(input, { to: curveTo, step: curveStep, delta: TORPEDO_DELTA });
  const zones = torpedoZones(curve);

  // One analytics event per settled result (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    const key = `${s.fs}|${ss.zone}|${Math.round(ss.taxable / 1000)}|${Math.round(r.totalTax / 500)}|${Math.round(md.rate * 100)}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_ss_tax_result", {
        fs: s.fs,
        zone: ss.zone,
        pctTaxable: Math.round((ss.taxablePct * 100) / 5) * 5,
        ssBucket: Math.round(benefits / 5000) * 5000,
        taxBucket: Math.round(r.totalTax / 1000) * 1000,
        marginal: Math.round(md.rate * 100),
        torpedo: md.ssPhaseIn > 0,
        senior: r.senior.total > 0,
        people65: age65,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [s.fs, ss.zone, ss.taxable, ss.taxablePct, benefits, r.totalTax, r.senior.total, md.rate, md.ssPhaseIn, age65]);

  // ---------- inputs ----------
  const cutoff = sd.birthCutoff[TAX_YEAR];
  const peopleOptions =
    maxP === 2
      ? [
          { value: 0, label: "Neither" },
          { value: 1, label: "One of us" },
          { value: 2, label: "Both" },
        ]
      : [
          { value: 0, label: "No" },
          { value: 1, label: "Yes" },
        ];
  const moreIncome = (input.wages ?? 0) + (input.taxableInterest ?? 0) + (input.qualifiedDividendsLtcg ?? 0);
  const moreDetails = (input.itemizedDeductions ?? 0) + adj + blind + (s.niit ? 0 : 1);

  const inputs = (
    <>
      <p className="flex flex-wrap items-center gap-2 text-[1rem] text-ink-2">
        Tax year <strong className="text-ink">{TAX_YEAR}</strong>
        <StatusChip status="official">{TAX_YEAR} IRS figures</StatusChip>
        <StatusChip status={IRS_2027_ADJUSTMENTS.status}>{TAX_YEAR + 1} brackets not announced</StatusChip>
      </p>
      <SelectField label="Filing status" value={s.fs} onChange={(v) => set("fs", v)} options={FILING} />
      <Segmented
        label={maxP === 2 ? `How many of you are 65 or older by the end of ${TAX_YEAR}?` : `Are you 65 or older by the end of ${TAX_YEAR}?`}
        value={age65}
        onChange={(v) => set("age65", v)}
        options={peopleOptions}
        hint={`Counts if born before ${longDate(cutoff)}. It raises your standard deduction and unlocks the senior deduction.`}
        size="lg"
      />
      <NumberField
        label={`Social Security benefits for ${TAX_YEAR}`}
        prefix="$"
        value={s.ss}
        onChange={(v) => set("ss", v ?? 0)}
        min={0}
        max={SS_MAX}
        hint={
          s.fs === "mfj"
            ? "Both of you combined, for the whole year: box 5 of your SSA-1099s, or each monthly check × 12 before Medicare premiums are taken out."
            : "For the whole year: box 5 of your SSA-1099, or your monthly check × 12 before Medicare premiums are taken out."
        }
      />
      <NumberField
        label="IRA, 401(k) and 403(b) withdrawals"
        prefix="$"
        value={s.ira}
        onChange={(v) => set("ira", v ?? 0)}
        min={0}
        max={AMOUNT_MAX}
        hint="The taxable amount, including RMDs (required minimum distributions) and Roth conversions. Leave out Roth IRA withdrawals and gifts sent straight to charity (QCDs)."
      />
      <NumberField
        label="Pensions and annuities (taxable part)"
        prefix="$"
        value={s.pen}
        onChange={(v) => set("pen", v ?? 0)}
        min={0}
        max={AMOUNT_MAX}
        hint="Box 2a of each pension or annuity Form 1099-R. IRA and 401(k) withdrawals go in the line above, not here."
      />
      <NumberField
        label="Tax-exempt interest"
        prefix="$"
        value={s.tei}
        onChange={(v) => set("tei", v ?? 0)}
        min={0}
        max={AMOUNT_MAX}
        hint="Municipal bond interest. It isn’t taxed itself, but it does count toward provisional income."
      />
      <NumberField
        label="Other taxable income"
        prefix="$"
        value={s.other}
        onChange={(v) => set("other", v ?? 0)}
        min={0}
        max={AMOUNT_MAX}
        hint="Non-qualified dividends, short-term gains, rental or business profit — anything else taxable."
      />

      <details className="explainer">
        <summary className="flex min-h-[3rem] cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> More income: wages, interest, dividends
          {moreIncome > 0 ? <span className="num font-semibold text-sun-ink">· {money(moreIncome)} entered</span> : null}
        </summary>
        <div className="mt-4 space-y-6">
          <NumberField label="Wages from a job" prefix="$" value={s.wages} onChange={(v) => set("wages", v ?? 0)} min={0} max={AMOUNT_MAX} hint="Box 1 of your W-2s." />
          <NumberField
            label="Taxable interest"
            prefix="$"
            value={s.int}
            onChange={(v) => set("int", v ?? 0)}
            min={0}
            max={AMOUNT_MAX}
            hint="Bank, CD and Treasury interest (Form 1099-INT box 1)."
          />
          <NumberField
            label="Qualified dividends and long-term capital gains"
            prefix="$"
            value={s.qd}
            onChange={(v) => set("qd", v ?? 0)}
            min={0}
            max={AMOUNT_MAX}
            hint={`Taxed at ${pct(CAP_GAINS_RATES.value.zero, 0)}, ${pct(CAP_GAINS_RATES.value.mid, 0)} or ${pct(CAP_GAINS_RATES.value.top, 0)} — but they count in full toward provisional income.`}
          />
        </div>
      </details>

      <details className="explainer">
        <summary className="flex min-h-[3rem] cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> Deductions and other details
          {moreDetails > 0 ? <span className="font-semibold text-sun-ink">· changed</span> : null}
        </summary>
        <div className="mt-4 space-y-6">
          <Segmented
            label={maxP === 2 ? "How many of you are legally blind?" : "Are you legally blind?"}
            value={blind}
            onChange={(v) => set("blind", v)}
            options={peopleOptions}
            hint="Each adds the same extra standard deduction as being 65+."
          />
          <NumberField
            label="Itemized deductions (only if you itemize)"
            prefix="$"
            value={s.item}
            onChange={(v) => set("item", v ?? 0)}
            min={0}
            max={AMOUNT_MAX}
            hint="Leave at $0 to use the standard deduction. We use whichever is larger."
          />
          <NumberField
            label="Adjustments to income"
            prefix="$"
            value={s.adj}
            onChange={(v) => set("adj", v ?? 0)}
            min={0}
            max={AMOUNT_MAX}
            hint="Schedule 1 adjustments such as half of self-employment tax, self-employed health insurance or a deductible IRA contribution. They lower provisional income. Leave out student-loan interest: the IRS worksheet adds it back."
          />
          <Toggle
            label={`Include the ${pct(NIIT.value.rate, 1)} Net Investment Income Tax`}
            checked={s.niit}
            onChange={(v) => set("niit", v)}
            hint={`A tax on interest, dividends and gains. It only applies when adjusted gross income is above ${money(NIIT.value.thresholds.single)} (${money(NIIT.value.thresholds.mfj)} joint or surviving spouse, ${money(NIIT.value.thresholds.mfs)} married filing separately).`}
          />
        </div>
      </details>
    </>
  );

  // ---------- result ----------
  const fullSenior = sd.perPerson;
  const seniorSaved = Math.max(0, noSenior.totalTax - r.totalTax);
  const seniorPhasing = r.senior.qualifying > 0 && r.senior.reductionPerPerson > 0;
  // Only flag the torpedo once there is tax to pay (bracket 0 = taxable income still $0).
  const inTorpedo = md.ssPhaseIn > 0 && r.bracket > 0 && md.rate > r.bracket + 0.0005;

  let heroSub: React.ReactNode;
  if (benefits <= 0) {
    heroSub = "Enter your Social Security benefits for the year to see how much of them is taxable.";
  } else if (ss.taxable <= 0) {
    heroSub = (
      <>
        None of your {money(benefits)} in benefits is taxable: your provisional income of <strong>{money(pi)}</strong> isn’t above the {money(ss.base)} base
        amount{room.toBase != null && room.toBase > 0 ? (
          <>
            . You could add about <strong>{money(room.toBase)}</strong> more income before that changes
          </>
        ) : null}
        .
      </>
    );
  } else {
    heroSub = (
      <>
        That’s <strong>{pct(ss.taxablePct, 1)}</strong> of your {money(benefits)} in benefits. This amount is added to your other taxable income — it isn’t a tax
        bill by itself.
      </>
    );
  }

  const zoneText =
    ss.mfsLivedWithSpouse
      ? `Base amount is ${money(ss.base)} for your filing status`
      : ss.zone === "none"
        ? `At or below the ${money(ss.base)} base amount`
        : ss.zone === "fifty"
          ? `Between ${money(ss.base)} and ${money(ss.adjustedBase)}: ${pct(tier1, 0)} tier`
          : `Above ${money(ss.adjustedBase)}: ${pct(tier2, 0)} tier`;

  // Rate-schedule row used for the ordinary tax (for "show the math").
  const schedule = BRACKETS_2026.value[scheduleKey(s.fs)];
  let row = schedule[0];
  for (const x of schedule) if (r.ordinaryTaxableIncome > x[0]) row = x;

  // QCD illustration: move ~10% of the IRA withdrawal to charity (rounded to $500).
  const qcd = QCD[TAX_YEAR].value;
  const qcdLimit = qcd.limit ?? 0;
  // Never more than one person's annual QCD limit (the law caps QCDs per IRA owner).
  const qcdAmt = ira > 0 && qcdLimit > 0 && age65 > 0 ? Math.min(ira, qcdLimit, Math.max(500, Math.round((ira * 0.1) / 500) * 500)) : 0;
  const qcdSaving = qcdAmt > 0 ? Math.max(0, r.totalTax - computeFedTax({ ...input, iraDistributions: ira - qcdAmt }).totalTax) : 0;

  // Withholding via Form W-4V (only 7/10/12/22% allowed).
  const w4vRates = SS_WITHHOLDING_RATES.value;
  const w4v = w4vRateToCover(r.totalTax, benefits, w4vRates);
  const rateNames = w4vRates.map((x) => pct(x, 0));
  const rateList = `${rateNames.slice(0, -1).join(", ")} or ${rateNames[rateNames.length - 1]}`;

  const magiIrmaa = Math.round(r.agi + tei);

  const result = (
    <>
      <ResultHero
        label={`Taxable part of your Social Security (${TAX_YEAR})`}
        value={money(ss.taxable)}
        tone={ss.taxable > 0 ? "ink" : "sage"}
        sub={heroSub}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Provisional income" value={money(pi)} sub={zoneText} />
        <Stat label={`Estimated ${TAX_YEAR} federal income tax`} value={money(r.totalTax)} sub={`${pct(r.effectiveRate, 1)} of everything you received`} />
        <Stat
          label={`Tax on your next ${money(TORPEDO_DELTA)} withdrawn`}
          value={money(md.extraTax)}
          tone={inTorpedo ? "ember" : undefined}
          sub={
            r.taxableIncome > 0
              ? `That’s a rate of ${pct(md.rate, 1)}. Your bracket: ${pct(r.bracket, 0)}.`
              : md.extraTax > 0
                ? `That’s a rate of ${pct(md.rate, 1)}: it would take you past your deductions into the first bracket.`
                : "Your deductions still cover it — no tax yet."
          }
        />
      </div>

      {benefits > 0 ? (
        <>
          <ProvisionalIncomeBar provisionalIncome={pi} base={ss.base} adjustedBase={ss.adjustedBase} tier1={tier1} tier2={tier2} />
          <p className="mt-3 text-[1rem] text-ink-3">
            Provisional income = {pct(tier1, 0)} of your benefits ({money(ss.lines[2] ?? 0)}) + other income ({money(ss.lines[3] ?? 0)})
            {(ss.lines[4] ?? 0) > 0 ? <> + tax-exempt interest ({money(ss.lines[4] ?? 0)})</> : null}
            {(ss.lines[7] ?? 0) > 0 ? <> − adjustments ({money(ss.lines[7] ?? 0)})</> : null}.
          </p>
        </>
      ) : null}

      <div className="mt-6 space-y-3">
        <Callout tone="sky" title="The new senior deduction did not make Social Security tax-free">
          {r.senior.total > 0 ? (
            <p>
              You get a <strong>{money(r.senior.total)}</strong> senior deduction ({r.senior.qualifying} × {money(seniorPhasing ? r.senior.perPerson : fullSenior)}
              {seniorPhasing ? `, cut from ${money(fullSenior)} because income is over ${money(r.senior.threshold)}` : ""}).{" "}
              {seniorSaved >= 1 ? (
                <>
                  It lowers your estimated tax by <strong>{money(seniorSaved)}</strong>
                </>
              ) : (
                <>With this income you’d owe no federal tax even without it</>
              )}
              {ss.taxable > 0 ? <>, but the {money(ss.taxable)} of benefits above is still taxable — the deduction comes off later, after the Social Security worksheet</> : null}
              . It applies for tax years {sd.years[0]}–{sd.years[sd.years.length - 1]} only.
            </p>
          ) : !r.senior.eligibleStatus ? (
            <p>
              Married couples must file jointly to claim the {money(fullSenior)}-per-person senior deduction, so it doesn’t apply here. Either way, the law didn’t change
              how much of your benefits is taxable.
            </p>
          ) : age65 === 0 ? (
            <p>
              Nobody on this return is 65 by the end of {TAX_YEAR}, so the {money(fullSenior)} senior deduction ({sd.years[0]}–{sd.years[sd.years.length - 1]}) doesn’t
              apply yet. It never changes how much of your benefits is taxable — it only lowers taxable income afterwards.
            </p>
          ) : (
            <p>
              Your income ({money(r.agi)} modified adjusted gross income) is at or above {money(r.senior.zeroAt)}, where the {money(fullSenior)} senior deduction
              phases out completely. The {money(ss.taxable)} of taxable benefits is figured the same way with or without it.
            </p>
          )}
        </Callout>

        {inTorpedo ? (
          <Callout tone="ember" title="You’re in the “tax torpedo”">
            Each extra {money(TORPEDO_DELTA)} you withdraw also makes {money(md.ssPhaseIn * TORPEDO_DELTA)} of your Social Security taxable
            {md.seniorLoss > 0 ? ` and shrinks your senior deduction by ${money(md.seniorLoss * TORPEDO_DELTA)}` : ""}, so it costs{" "}
            <strong>{money(md.extraTax)}</strong> in tax — a rate of <strong>{pct(md.rate, 1)}</strong>, even though your bracket is {pct(r.bracket, 0)}.
          </Callout>
        ) : md.seniorLoss > 0 && r.bracket > 0 && md.rate > r.bracket + 0.0005 ? (
          <Callout tone="sun" title="Your senior deduction is phasing out">
            Each extra {money(TORPEDO_DELTA)} you withdraw takes {money(md.seniorLoss * TORPEDO_DELTA)} off your senior deduction, so it costs{" "}
            <strong>{money(md.extraTax)}</strong> in tax — a rate of {pct(md.rate, 1)}, not your {pct(r.bracket, 0)} bracket.
          </Callout>
        ) : null}

        {ss.mfsLivedWithSpouse ? (
          <Callout tone="ember" title="Filing separately while living together is the costliest choice">
            Your base amount is {money(ss.base)}, so {pct(tier2, 0)} of your provisional income is taxable from the first dollar (up to {pct(maxFraction, 0)} of benefits), and you
            can’t take the senior deduction. Compare with filing jointly before you file.
          </Callout>
        ) : null}

        {ss.capHit === "max85" ? (
          <Callout tone="sage" title={`You’ve reached the ${pct(maxFraction, 0)} ceiling`}>
            No more of your benefits can become taxable, however much you withdraw. From here, extra income no longer drags Social Security into tax with it.
          </Callout>
        ) : null}

        {r.niit > 0 ? (
          <Callout tone="sun" title={`Net Investment Income Tax: ${money(r.niit)}`}>
            {pct(NIIT.value.rate, 1)} on the smaller of your investment income or the amount your income exceeds {money(r.niitBase.threshold)}. Social Security
            itself is never investment income.
          </Callout>
        ) : null}
      </div>

      <ShowMath>
        <h3 className="font-bold text-ink">1. How much of your Social Security is taxable</h3>
        <p className="mt-1">
          <a className="link" href={SRC.irsPub915.url} target="_blank" rel="noopener">
            IRS Publication 915, Worksheet 1
          </a>
          , line by line{ss.mfsLivedWithSpouse ? " (married filing separately and lived together: lines 9–16 are skipped)" : ""}:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="table-sy text-[0.98rem]">
            <thead>
              <tr>
                <th>Line</th>
                <th>What it is</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {W1_LINES.filter((n) => ss.lines[n] != null).map((n) => (
                <tr key={n} className={n === 8 || n === 19 ? "is-hit" : undefined}>
                  <td>{n}</td>
                  <td>{W1_LABELS[n]}</td>
                  <td className={n === 19 ? "strong" : undefined}>{moneySmart(ss.lines[n] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ss.stoppedAt ? <p className="mt-2">The worksheet stops at line {ss.stoppedAt}: none of your benefits are taxable.</p> : null}

        <h3 className="mt-6 font-bold text-ink">2. Your estimated {TAX_YEAR} federal income tax</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            Adjusted gross income (AGI): other income {money(r.otherIncome)} + taxable benefits {moneySmart(ss.taxable)}
            {adj > 0 ? <> − adjustments {money(adj)}</> : null} = <strong>{moneySmart(r.agi)}</strong>
          </li>
          <li>
            {r.deductionType === "itemized" ? (
              <>
                Itemized deductions: <strong>{money(r.deduction)}</strong> (larger than your {money(r.standard.total)} standard deduction)
              </>
            ) : (
              <>
                Standard deduction ({FS_SHORT[s.fs]}): {money(r.standard.basic)}
                {r.standard.boxes > 0 ? (
                  <>
                    {" "}
                    + {r.standard.boxes} × {money(r.standard.each)} for age 65+ / blindness
                  </>
                ) : null}{" "}
                = <strong>{money(r.standard.total)}</strong>
              </>
            )}{" "}
            <a className="link" href={SRC.irsRevProc202532.url} target="_blank" rel="noopener">
              (Rev. Proc. 2025-32)
            </a>
          </li>
          <li>
            Senior deduction:{" "}
            {r.senior.qualifying > 0 ? (
              <>
                {r.senior.qualifying} × ({money(fullSenior)} − {pct(sd.phaseoutRate, 0)} × {money(Math.max(0, r.senior.magi - r.senior.threshold))} of income over{" "}
                {money(r.senior.threshold)}
                {r.senior.perPerson <= 0 ? ", not below $0" : ""}) = <strong>{moneySmart(r.senior.total)}</strong>
              </>
            ) : (
              <strong>$0</strong>
            )}{" "}
            <a className="link" href={SRC_SS_TAX.irsSchedule1A.url} target="_blank" rel="noopener">
              (Schedule 1-A)
            </a>
          </li>
          <li>
            Taxable income: {moneySmart(r.agi)} − {money(r.deduction)} − {moneySmart(r.senior.total)} = <strong>{moneySmart(r.taxableIncome)}</strong>
          </li>
          <li>
            Tax on ordinary income of {moneySmart(r.ordinaryTaxableIncome)}: {moneySmart(row[2])} + {pct(row[1], 0)} × ({moneySmart(r.ordinaryTaxableIncome)} −{" "}
            {money(row[0])}) = <strong>{moneySmart(r.ordinaryTax)}</strong> ({TAX_YEAR} rate schedule)
          </li>
          {r.pref.amount > 0 ? (
            <li>
              Qualified dividends and long-term gains stacked on top: {money(r.pref.at0)} at {pct(CAP_GAINS_RATES.value.zero, 0)} + {money(r.pref.at15)} at{" "}
              {pct(CAP_GAINS_RATES.value.mid, 0)} + {money(r.pref.at20)} at {pct(CAP_GAINS_RATES.value.top, 0)}
              {r.pref.usedRegularRates ? (
                <>
                  . Taxing all {moneySmart(r.taxableIncome)} at the regular rates comes out lower, and the IRS worksheet (line 25) lets you use the lower
                  figure, so this part adds <strong>{moneySmart(r.pref.tax)}</strong>
                </>
              ) : (
                <>
                  {" "}
                  = <strong>{moneySmart(r.pref.tax)}</strong>
                </>
              )}
            </li>
          ) : null}
          {r.niit > 0 ? (
            <li>
              Net Investment Income Tax: {pct(NIIT.value.rate, 1)} × the smaller of {money(r.niitBase.nii)} or ({moneySmart(r.niitBase.magi)} −{" "}
              {money(r.niitBase.threshold)}) = <strong>{moneySmart(r.niit)}</strong>{" "}
              <a className="link" href={NIIT_SOURCE.url} target="_blank" rel="noopener">
                (IRS)
              </a>
            </li>
          ) : null}
          <li>
            Estimated federal tax: <strong>{moneySmart(r.totalTax)}</strong>, or {pct(r.effectiveRate, 1)} of the {money(r.grossIncome)} you received.
          </li>
        </ol>
        <p className="mt-3">
          The marginal rate is measured, not guessed: we recompute your whole return with {money(TORPEDO_DELTA)} more of IRA withdrawals and divide the extra tax by{" "}
          {money(TORPEDO_DELTA)}.
        </p>
      </ShowMath>

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">Your tax torpedo: the real rate on each extra dollar</h3>
        <p className="mt-1 text-[1rem] text-ink-3">
          What the next {money(TORPEDO_DELTA)} of IRA withdrawals would cost at every level of withdrawals, keeping everything else you entered the same.
        </p>
        <div className="mt-4">
          <TorpedoChart points={curve} zones={zones} currentIra={ira} delta={TORPEDO_DELTA} />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-[1.3rem] font-semibold">Ways to owe less</h3>
        <ul className="mt-3 space-y-3 text-[1.0rem] leading-relaxed text-ink-2">
          {qcdAmt > 0 ? (
            <li className="flex gap-3">
              <Icon name="check" size={19} className="mt-1 shrink-0 text-sage" />
              <span>
                <strong className="text-ink">Give from your IRA, not your checkbook.</strong> If you’re {halfAge(qcd.minAge)} or older, a qualified charitable
                distribution (QCD) sent straight from your IRA to a charity counts toward your RMD but never enters provisional income.{" "}
                {qcdSaving >= 1 ? (
                  <>
                    Turning {money(qcdAmt)} of your withdrawals into a QCD would cut this tax by about <strong>{money(qcdSaving)}</strong>.
                  </>
                ) : (
                  <>With these numbers your deductions already cover the tax, so a QCD wouldn’t lower this year’s bill — it still keeps your income lower.</>
                )}{" "}
                Limit: {money(qcdLimit)} per person in {TAX_YEAR}.
              </span>
            </li>
          ) : null}
          <li className="flex gap-3">
            <Icon name="check" size={19} className="mt-1 shrink-0 text-sage" />
            <span>
              <strong className="text-ink">Use Roth money and earlier years.</strong> Qualified Roth IRA withdrawals don’t count in provisional income. Converting IRA
              money to a Roth in the years before you claim Social Security (or before RMDs begin) means less taxable income stacked on your benefits later.
            </span>
          </li>
          {zones.length ? (
            <li className="flex gap-3">
              <Icon name="check" size={19} className="mt-1 shrink-0 text-sage" />
              <span>
                <strong className="text-ink">Steer around the torpedo zone.</strong> Inside it, cash savings or a taxable brokerage account (only the gain counts) are
                cheaper sources of spending money than the IRA.
              </span>
            </li>
          ) : null}
          <li className="flex gap-3">
            <Icon name="check" size={19} className="mt-1 shrink-0 text-sage" />
            <span>
              <strong className="text-ink">Withholding.</strong>{" "}
              {r.totalTax <= 0 ? (
                <>With these numbers you don’t need tax withheld from your benefits.</>
              ) : benefits <= 0 ? (
                <>With no Social Security yet, cover the {money(r.totalTax)} through withholding on IRA withdrawals or quarterly estimated tax.</>
              ) : w4v != null ? (
                <>
                  Form W-4V lets SSA withhold only {rateList} of each payment. The smallest that covers {money(r.totalTax)} is <strong>{pct(w4v, 0)}</strong> (
                  {money(w4v * benefits)} a year)
                  {w4v * benefits - r.totalTax > 50 ? <>, about {money(w4v * benefits - r.totalTax)} more than needed — you’d get it back as a refund</> : null}.
                  Withholding from IRA withdrawals can be set to any amount instead.
                </>
              ) : (
                <>
                  Even the highest Form W-4V rate ({pct(w4vRates[w4vRates.length - 1], 0)}) on your benefits wouldn’t cover {money(r.totalTax)}. Add withholding on IRA
                  withdrawals or pay quarterly estimated tax.
                </>
              )}{" "}
              <a className="link" href={SRC_SS_TAX.ssaWithholding.url} target="_blank" rel="noopener">
                How to request it
              </a>
              .
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={`/irmaa-calculator?fs=${irmaaFs(s.fs)}&magi=${magiIrmaa}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="shield" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Will this income raise your Medicare premiums?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">
              Your {TAX_YEAR} income ({money(magiIrmaa)} for IRMAA, the Medicare surcharge) sets your {TAX_YEAR + 2} Part B and Part D premiums. Until those
              brackets are out, check it against the latest ones.
            </span>
          </span>
        </Link>
        <Link href={`/rmd-calculator?year=${TAX_YEAR}`} className="sunk group flex items-start gap-3 p-4 hover:bg-[var(--card-2)]">
          <Icon name="rmd" size={20} className="mt-0.5 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Is your IRA withdrawal at least your RMD?</span>
            <span className="mt-1 block text-[0.95rem] text-ink-3">Check your required minimum distribution and its deadline.</span>
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <CalculatorShell
      inputs={inputs}
      result={
        <>
          {result}
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <ShareBar tool="ss_tax" subject={`Our ${TAX_YEAR} Social Security tax estimate`} />
            <p className="mt-4 text-[0.9375rem] text-ink-3">
              Taxable benefits: IRS Publication 915 Worksheet 1 — the thresholds are fixed by law, so this part is the same for any year. Tax estimate: {TAX_YEAR}{" "}
              brackets and deductions (Rev. Proc. 2025-32); the IRS hasn’t published {TAX_YEAR + 1} brackets yet. Federal only — no credits, alternative minimum tax or
              state tax. Last verified {longDate(SITE.dataVerifiedOn)}.
            </p>
          </div>
        </>
      }
      mobileSummary={`Taxable: ${money(ss.taxable)} · Tax: ${money(r.totalTax)}`}
    />
  );
}
