import Link from "next/link";
import { Callout } from "@/components/tool/Result";
import { StatusChip } from "@/components/tool/StatusChip";
import { RMD_EXCISE } from "@/data/params/rmd";
import { JOINT_TABLE_RULE } from "@/data/params/rmd-extra";
import { INHERITED_TIMING } from "@/data/params/inherited-extra";
import { money, pct } from "@/lib/format";
import {
  CONVERSION_EXAMPLE,
  FIRST_75_BIRTH_YEAR,
  FIRST_75_FIRST_YEAR,
  GAP_YEARS,
  JOINT_GAP,
  LAST_73_BIRTH_YEAR,
  LAST_73_FIRST_YEAR,
  NEXT_YEAR,
  QCD_LIMIT_THIS_YEAR,
  QCD_MIN_AGE,
  QCD_NEXT_STATUS,
  REF_BALANCE,
  RMD_AGE_LATER,
  RMD_AGE_NOW,
  SPOUSE_EXAMPLE_GAP,
  THIS_YEAR,
  UNIFORM_MAX_AGE,
  aAn,
  aMoney,
  ageLabel,
  bandFor,
  breakEvenGrowth,
  calcHref,
  factorAt,
  fmtFactor,
  fmtPct,
  fmtPtsLong,
  OWNER_LIMIT,
  jointAt,
  qcdNextSentence,
  rmdAt,
  shareAt,
  startYears,
} from "./RmdAgeData";

const TEN_YEARS = INHERITED_TIMING.value.tenYearRuleYears;
/** Row headers inside .table-sy: plain label style instead of the uppercase, sticky column-header look. */
const ROW_TH = "text-left !text-[1rem] !normal-case !tracking-normal !font-semibold !text-ink-2 !border-b-[color:var(--hairline)]";
const ROW_TH_STYLE = { position: "static", background: "transparent" } as const;

/**
 * Age-specific explanations for /rmd/age-N (rendered inside a ProseCard). Every number is computed from the IRS tables
 * and cited params; the advice changes by age band: first year (April 1 trap), second year (double-up, Roth conversions),
 * 75 (the future RMD age), late 70s, 80s (accelerating %), 90s and 100+ (large %, beneficiaries, year-of-death RMD).
 */
export function RmdAgeNotes({ age }: { age: number }) {
  const f = factorAt(age);
  const share = shareAt(age);
  const b26 = THIS_YEAR - age;
  const r500 = rmdAt(REF_BALANCE, age);
  const rNext500 = rmdAt(REF_BALANCE, age + 1);
  const be = breakEvenGrowth(age);

  return (
    <>
      <h2 className="!mt-0">How do you calculate your RMD at {age}?</h2>
      <p className="answer">
        Take each account’s balance on December 31 of last year and divide it by {fmtFactor(f)}, the IRS factor for {age}. On {aMoney(REF_BALANCE)} IRA that’s {money(r500)} for
        the year — about {money(r500 / 12)} a month if you’d rather spread it out. You can take more, but never less, and the extra doesn’t count toward next year.
      </p>
      <ol>
        <li>
          <strong>Find last year’s December 31 balance</strong> for every traditional, SEP and SIMPLE IRA, 401(k), 403(b) and 457(b). Leave out Roth IRAs and Roth 401(k) and
          403(b) money — they have no RMDs while you’re alive.
        </li>
        <li>
          <strong>Use the age you reach on your birthday this year</strong> — {age} if you were born in {b26} — even if that birthday is on December 31.
        </li>
        <li>
          <strong>Divide by {fmtFactor(f)}</strong>, the Uniform Lifetime Table factor for {age} (or by the Joint and Last Survivor factor if your spouse qualifies — see below).
        </li>
        <li>
          <strong>Withdraw it by the deadline:</strong> December 31, or April 1 of next year for a first RMD. You can add up your IRA RMDs and take the total from any one IRA;
          each 401(k) has to pay its own.
        </li>
      </ol>
      <p>
        One number worth knowing: after an RMD of {fmtPct(share)}, your investments have to earn about <strong>{pct(be, 1)}</strong> this year just for the account to end
        the year where it started. Earn more and next year’s RMD grows; earn less and the account slowly shrinks — exactly what the rules intend.
      </p>

      <BandSections age={age} />

      <h2>What if your spouse is {SPOUSE_EXAMPLE_GAP} years younger?</h2>
      <SpouseExample age={age} />

      <h2>Can a qualified charitable distribution cover your RMD at {age}?</h2>
      <p className="answer">
        Yes. Past age {ageLabel(QCD_MIN_AGE)}, money sent straight from your IRA to a charity — a qualified charitable distribution (QCD) — counts toward your RMD and never
        shows up in your taxable income, up to {money(QCD_LIMIT_THIS_YEAR)} per person in {THIS_YEAR}. It can cover part of the RMD or all of it.
      </p>
      <p>
        At {age}, that limit covers the entire RMD on any IRA balance up to <strong>{money(QCD_LIMIT_THIS_YEAR * f)}</strong>. A QCD beats taking the RMD and then writing a
        check: the gift never enters your adjusted gross income, which can keep more of your Social Security untaxed and your Medicare premiums lower — even if you take the
        standard deduction.
      </p>
      <p>
        The money must go directly from the IRA to the charity by December 31. It can’t come from a 401(k) — to give from 401(k) money, take that plan’s RMD for the year
        first (an RMD can’t be rolled over), then roll the rest into an IRA — or from an ongoing SEP or SIMPLE IRA. {qcdNextSentence()} {QCD_NEXT_STATUS !== "official" ? <StatusChip status={QCD_NEXT_STATUS} /> : null}
      </p>
      <p className="text-[1rem] text-ink-3">
        Gift on your mind but not sure how much? On {money(REF_BALANCE)} the whole {money(r500)} RMD could go to charity; next year at {age + 1} the same balance would require{" "}
        {money(rNext500)}.
      </p>
    </>
  );
}

/** The joint-table worked example: owner `age`, spouse `age − 15`, $500,000 balance. */
function SpouseExample({ age }: { age: number }) {
  const f = factorAt(age);
  const spouseAge = age - SPOUSE_EXAMPLE_GAP;
  const j = jointAt(age, spouseAge);
  const b26 = THIS_YEAR - age;
  const viaUniform = rmdAt(REF_BALANCE, age);
  const viaJoint = REF_BALANCE / j;
  const rule = JOINT_TABLE_RULE.value;
  return (
    <>
      <p className="answer">
        If your spouse is your only beneficiary all year, you use the Joint and Last Survivor Table instead. At {age} with {aAn(spouseAge)} {spouseAge}-year-old spouse the factor
        is{" "}
        {fmtFactor(j)} rather than {fmtFactor(f)}, so you must take {fmtPct(1 / j)} of the balance instead of {fmtPct(1 / f)}.
      </p>
      <div className="not-prose overflow-x-auto">
        <table className="table-sy mt-2 text-[1rem]">
          <caption className="sr-only">
            Worked example: RMD at {age} with a spouse {SPOUSE_EXAMPLE_GAP} years younger
          </caption>
          <tbody>
            <tr>
              <th scope="row" className={ROW_TH} style={ROW_TH_STYLE}>Balance on December 31, {THIS_YEAR - 1}</th>
              <td className="num strong">{money(REF_BALANCE)}</td>
            </tr>
            <tr>
              <th scope="row" className={ROW_TH} style={ROW_TH_STYLE}>Ages reached in {THIS_YEAR}</th>
              <td className="num">
                You {age} (born {b26}), spouse {spouseAge} (born {b26 + SPOUSE_EXAMPLE_GAP})
              </td>
            </tr>
            <tr>
              <th scope="row" className={ROW_TH} style={ROW_TH_STYLE}>Joint and Last Survivor factor</th>
              <td className="num">
                {fmtFactor(j)} <span className="text-ink-3">(row {age}, column {spouseAge})</span>
              </td>
            </tr>
            <tr>
              <th scope="row" className={ROW_TH} style={ROW_TH_STYLE}>RMD with the joint table</th>
              <td className="num strong">
                {money(REF_BALANCE)} ÷ {fmtFactor(j)} = {money(viaJoint)}
              </td>
            </tr>
            <tr>
              <th scope="row" className={ROW_TH} style={ROW_TH_STYLE}>RMD with the Uniform table</th>
              <td className="num">
                {money(REF_BALANCE)} ÷ {fmtFactor(f)} = {money(viaUniform)}
              </td>
            </tr>
            <tr className="is-hit">
              <th scope="row" className={ROW_TH} style={{ ...ROW_TH_STYLE, background: "var(--sun-wash)" }}>You withdraw less</th>
              <td className="num strong">
                {money(viaUniform - viaJoint)} ({pct(1 - viaJoint / viaUniform, 1)} less)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Two conditions, both strict: your spouse must be <strong>more than {rule.spouseYoungerByMoreThan} years younger</strong> and the <strong>sole beneficiary</strong> of
        that account for the entire year. Marital status is fixed on {rule.maritalStatusDate}, so a divorce or a death during the year changes the table only from the next
        year. At a gap of exactly {JOINT_GAP} years the two tables give the same factor. Try your own ages in the{" "}
        <Link href={calcHref({ birthYear: b26, bal: REF_BALANCE, spouseBirthYear: b26 + SPOUSE_EXAMPLE_GAP })}>RMD calculator with a younger spouse</Link> or the{" "}
        <Link href="/rmd-table#joint">joint-table lookup</Link>.
      </p>
    </>
  );
}

/** Advice that genuinely differs by age band. */
function BandSections({ age }: { age: number }) {
  const band = bandFor(age);
  const f = factorAt(age);
  const share = shareAt(age);
  const b26 = THIS_YEAR - age;
  const b27 = NEXT_YEAR - age;
  const be = breakEvenGrowth(age);
  const r500 = rmdAt(REF_BALANCE, age);
  const excise = RMD_EXCISE.value;

  if (band === "first") {
    const r73 = r500;
    const r74 = rmdAt(REF_BALANCE, age + 1);
    return (
      <>
        <h2>Should you take your first RMD at {age} or wait until April 1?</h2>
        <p className="answer">
          Take it in the year you turn {age} unless next year’s income will be unusually low. Waiting until April 1 is allowed, but the RMD for {age + 1} is still due by
          December 31 of that same year — so two RMDs land on one tax return.
        </p>
        <Callout tone="ember" title={`The April 1 trap, in numbers`}>
          On a steady {money(REF_BALANCE)} IRA, postponing means {money(r73)} (your {age} RMD) plus {money(r74)} (your {age + 1} RMD) — {money(r73 + r74)} of taxable income in one
          year. That can push you into a higher bracket, make more of your Social Security taxable, and raise Medicare premiums two years later through IRMAA (the
          income-related monthly adjustment amount).
        </Callout>
        <p>
          Two more first-year rules catch people. The first dollars you withdraw in an RMD year count toward the RMD, and RMD money can’t be rolled over or converted to a Roth
          IRA — so if you plan a Roth conversion, take the RMD first. And if you still work for the company that sponsors your 401(k) and own {OWNER_LIMIT} or less of it, that
          plan’s RMD can usually wait until you retire, if the plan allows it. Your IRAs can’t.
        </p>
        <h2>Is {age} still the starting age after {LAST_73_FIRST_YEAR}?</h2>
        <p className="answer">
          No. Only people born through {LAST_73_BIRTH_YEAR} start at {RMD_AGE_NOW}; the last of them reach it in {LAST_73_FIRST_YEAR}. Nobody reaches the RMD age in{" "}
          {GAP_YEARS.join(" or ")}, and from {FIRST_75_FIRST_YEAR} the starting age is {RMD_AGE_LATER} for everyone born in {FIRST_75_BIRTH_YEAR} or later.
        </p>
        <p>
          One wrinkle: the law’s wording for people born in {LAST_73_BIRTH_YEAR} points to both {RMD_AGE_NOW} and {RMD_AGE_LATER}. Proposed IRS regulations say {RMD_AGE_NOW},
          and so do we, but the final rule hasn’t been written. If that’s your birth year, check again before {LAST_73_FIRST_YEAR}.
        </p>
      </>
    );
  }

  if (band === "second") {
    const rPrev = rmdAt(REF_BALANCE, age - 1);
    const saved = CONVERSION_EXAMPLE / factorAt(age + 1);
    return (
      <>
        <h2>Do you owe two RMDs at {age}?</h2>
        <p className="answer">
          Only if you postponed last year’s first RMD to April 1. Then the {age - 1} RMD is due by April 1 and the {age} RMD by December 31 — both on this year’s tax return. In{" "}
          {NEXT_YEAR} the same squeeze hits anyone born in {b27} who waits until April 1, {NEXT_YEAR}.
        </p>
        <p>
          Here’s the part most people miss: for an IRA, your {age} RMD is figured on the <strong>full</strong> December 31 balance — taking last year’s RMD in January or March
          doesn’t shrink it. (A 401(k) may treat that early-year withdrawal as part of last year; ask the plan.) On {money(REF_BALANCE)}, that’s {money(rPrev)} by April 1 plus {money(r500)} by December 31 — {money(rPrev + r500)} in one year. If you’re in that spot, have
          extra tax withheld from the second withdrawal rather than being surprised in April.
        </p>
        <h2>Do Roth conversions at {age} shrink future RMDs?</h2>
        <p className="answer">
          Yes. Every dollar you move to a Roth IRA leaves the balance future RMDs are figured on. Converting {money(CONVERSION_EXAMPLE)} this year trims about {money(saved)} off
          next year’s RMD and keeps lowering every RMD after it, because Roth IRAs have no RMDs while you’re alive.
        </p>
        <p>
          The conversion is taxable income this year, and this year’s RMD has to come out first. Size it so you don’t cross into the next tax bracket or an IRMAA threshold —
          Medicare looks at your income from two years earlier. The <Link href="/irmaa-calculator">IRMAA calculator</Link> shows how close you are.
        </p>
      </>
    );
  }

  if (band === "seventy-five") {
    const saved = CONVERSION_EXAMPLE / factorAt(age + 1);
    return (
      <>
        <h2>Why do people say {age} is the new RMD age?</h2>
        <p className="answer">
          Because the SECURE 2.0 Act set the RMD age at {RMD_AGE_LATER} for everyone born in {FIRST_75_BIRTH_YEAR} or later. Their first RMD is for {FIRST_75_FIRST_YEAR}, due by
          April 1, {FIRST_75_FIRST_YEAR + 1}. Today’s {age}-year-olds were born in {b26} and started at {RMD_AGE_NOW}, in {startYears(THIS_YEAR, age).join(" or ")}.
        </p>
        <p>
          The switch leaves a gap. The last people who start at {RMD_AGE_NOW} (born {LAST_73_BIRTH_YEAR}) reach it in {LAST_73_FIRST_YEAR}, so nobody reaches the RMD age in{" "}
          {GAP_YEARS.join(" or ")}. From {FIRST_75_FIRST_YEAR}, the April 1 first-year trap moves from {RMD_AGE_NOW} to {RMD_AGE_LATER}. (Proposed IRS rules put the {LAST_73_BIRTH_YEAR}{" "}
          birth year at {RMD_AGE_NOW}; the statute is ambiguous and the final rule is still open.)
        </p>
        <h2>Is it too late for Roth conversions at {age}?</h2>
        <p className="answer">
          No. Each {money(CONVERSION_EXAMPLE)} you convert now trims about {money(saved)} off next year’s RMD — and more later, when the required share passes{" "}
          {fmtPct(shareAt(85))} at 85 and {fmtPct(shareAt(90))} at 90. The catch is the tax bill: the converted amount is taxable income this year, on top of your RMD.
        </p>
        <p>
          We think it pays mainly in two cases: you expect the same or a higher tax bracket later, or your heirs will be in a higher bracket than you — most of them must
          empty an inherited traditional IRA within {TEN_YEARS} years, often in their peak-earning years. Take this year’s RMD before converting.
        </p>
      </>
    );
  }

  if (band === "late-seventies") {
    const doubleUpYear = FIRST_75_FIRST_YEAR + 1;
    return (
      <>
        <h2>Will your RMD keep growing at {age}?</h2>
        <p className="answer">
          Probably, in dollars. At {age} you must take {fmtPct(share)} of the balance; if the account earns more than about {pct(be, 1)} after that, it still grows — and next
          year’s RMD, at {fmtPct(shareAt(age + 1))}, grows with it. If returns are weak, the dollar RMD can fall even though the percentage rises.
        </p>
        <p>
          On a {money(REF_BALANCE)} account that just breaks even, the RMD goes from {money(r500)} at {age} to {money(rmdAt(REF_BALANCE, age + 1))} at {age + 1}
          {age + 1 < 80 ? <> and {money(rmdAt(REF_BALANCE, 80))} at 80</> : null}. That steady climb is why the late 70s are a good time to decide how you’ll handle RMDs for the next twenty years.
        </p>
        {age === RMD_AGE_LATER + 1 ? (
          <p>
            <strong>{age} will matter more from {doubleUpYear}.</strong> For people born in {FIRST_75_BIRTH_YEAR} or later, {age} will be the second RMD year — so anyone who
            postpones a first RMD to April 1, {doubleUpYear} owes two RMDs that year.
          </p>
        ) : null}
        <h2>What’s the easiest way to pay the tax on your RMD?</h2>
        <p className="answer">
          Have federal tax withheld from the RMD itself. The IRS treats withholding as if it were paid evenly through the year, so one December RMD with enough withheld can
          cover a whole year of tax on your other income too.
        </p>
        <p>
          That beats quarterly estimated payments: no vouchers, no penalty if you’re late in the year, and you can raise the withholding percentage once you see your total
          income. If you give to charity, a QCD (below) is even better — that part isn’t taxed at all.
        </p>
      </>
    );
  }

  if (band === "eighties") {
    const milestone = age < 85 ? 85 : 90;
    /** First and last age of the decade: the yearly step is shown at both ends (it is not larger every single year). */
    const EIGHTIES_START = 80;
    const EIGHTIES_END = 89;
    const stepAt = (a: number) => shareAt(a) - shareAt(a - 1);
    return (
      <>
        <h2>How fast does the RMD percentage rise in your 80s?</h2>
        <p className="answer">
          Steadily, in bigger steps as the decade goes on: the required share rises about {fmtPtsLong(stepAt(EIGHTIES_START))} a year at {EIGHTIES_START} but{" "}
          {fmtPtsLong(stepAt(EIGHTIES_END))} at {EIGHTIES_END}. At {age} you must take {fmtPct(share)} of the balance; by {milestone} it will be {fmtPct(shareAt(milestone))}.
          The account would need to earn about {pct(be, 1)} a year just to hold steady.
        </p>
        <p>
          For most people the balance starts shrinking somewhere in the 80s — that is what the rules intend. It isn’t a reason to worry, but it is a reason to stop treating
          the RMD as an annual surprise and set it up once: automatic yearly withdrawal, tax withheld, charity paid directly.
        </p>
        <h2>How can you cut the tax bill on RMDs in your 80s?</h2>
        <p className="answer">
          Use the RMD itself. Send part of it straight to charity as a qualified charitable distribution, and have federal tax withheld from the rest so you can skip quarterly
          estimated payments. The QCD part also stays out of the income Medicare uses to set IRMAA surcharges.
        </p>
        <ul>
          <li>
            <strong>Withholding counts as paid evenly through the year</strong>, so a single December withdrawal can cover the whole year’s tax.
          </li>
          <li>
            <strong>Mind Medicare’s IRMAA.</strong> Your {money(r500)} RMD on {money(REF_BALANCE)} counts toward the income Medicare looks at two years later —{" "}
            <Link href={`/irmaa-calculator?rmd=${Math.round(r500)}`}>check whether it crosses a threshold</Link>.
          </li>
          <li>
            <strong>Watch the tax on Social Security.</strong> RMDs raise “provisional income”; see{" "}
            <Link href={`/taxable-social-security-calculator?ira=${Math.round(r500)}`}>how much of your benefit becomes taxable</Link>.
          </li>
          <li>
            <strong>Fewer accounts, fewer mistakes.</strong> IRA RMDs can be added up and taken from one IRA, but each 401(k) must pay its own — consolidating old 401(k)s into one
            IRA means one RMD to remember.
          </li>
        </ul>
      </>
    );
  }

  if (band === "nineties") {
    const milestone = age < 95 ? 95 : 100;
    return (
      <>
        <h2>Why is the RMD so large in your 90s?</h2>
        <p className="answer">
          Because the factor is down to {fmtFactor(f)}: you must take {fmtPct(share)} of the balance at {age}, rising to {fmtPct(shareAt(milestone))} by {milestone}. The account
          would need to earn {pct(be, 1)} a year to stay level, so it will almost certainly shrink — by design.
        </p>
        <p>
          A shrinking balance is not running out of money; the RMD is a withdrawal, not a spending requirement. Whatever you don’t need can be reinvested in a regular
          brokerage account the same day.
        </p>
        <h2>What should you check on your beneficiaries in your 90s?</h2>
        <p className="answer">
          Make sure every IRA and 401(k) names the right people, and tell them what’s coming. Because your RMDs have started, most non-spouse heirs must take yearly RMDs and
          empty the account within {TEN_YEARS} years, plus any part of your final-year RMD you hadn’t taken.
        </p>
        <p>
          Our view: if your heirs are in a higher tax bracket than you, withdrawing more than the minimum now — or giving through QCDs — can lower the family’s total tax bill.
          Show them the <Link href="/inherited-ira-rmd-calculator">inherited IRA calculator</Link> so the rules don’t surprise them.
        </p>
      </>
    );
  }

  // hundreds
  return (
    <>
      <h2>Do RMDs ever stop?</h2>
      <p className="answer">
        No. The IRS table runs to age {UNIFORM_MAX_AGE} and older, where the factor is {fmtFactor(factorAt(UNIFORM_MAX_AGE))} — {fmtPct(shareAt(UNIFORM_MAX_AGE))} of the balance
        every year. At {age} you must take {fmtPct(share)}, or {money(100000 / f)} per $100,000, however small the account. The table never asks for more than half the
        balance, so the RMD alone never empties it.
      </p>
      <p>
        Missing one is expensive: an excise tax of {pct(excise.rate)} of the shortfall, cut to {pct(excise.correctedRate)} if you fix it in time. The IRS can waive it entirely for a reasonable error you correct
        promptly; you ask by attaching an explanation to {excise.form}. If someone else handles your accounts, ask the custodian to pay the RMD automatically each year.
      </p>
      <h2>What happens to the RMD in the year you die?</h2>
      <p className="answer">
        It still has to come out. If you die after your RMDs have started, whatever part of that year’s RMD you hadn’t taken must be withdrawn by your beneficiaries by
        December 31. After that they follow the inherited-IRA rules — for most non-spouse heirs, yearly RMDs and a {TEN_YEARS}-year deadline.
      </p>
      <p>
        If the death comes late in the year, there’s relief: the IRS waives the excise tax automatically when the heirs take the missing amount by the end of the
        following year, or by their tax-filing deadline (with extensions) if that is later. Heirs use a different table, the Single Life Table, and the rules depend on who they are. The <Link href="/inherited-ira-rmd-calculator">inherited IRA calculator</Link>{" "}
        works it out; the <Link href="/rmd-table#beneficiaries">beneficiary table summary</Link> shows the factors.
      </p>
    </>
  );
}
