"use client";

/**
 * Result panels for the inherited-IRA calculator: answer-first hero, the rules that apply, warnings, the math, the spouse
 * comparison and the year-by-year schedule. Every number comes from the tested engine (src/lib/calc/inherited) or cited params.
 */
import { ResultHero, Stat, ShowMath, Callout } from "@/components/tool/Result";
import { BarChart, LineChart } from "@/components/tool/Charts";
import { Icon } from "@/components/ui/Icon";
import type { Divisor, InheritedAccount, InheritedResult, SpouseComparison } from "@/lib/calc/inherited";
import { ageOn, daysInMonth, type YMD } from "@/lib/calc/dates";
import { GOVERNMENTAL_PLAN_TEN_YEAR } from "@/data/params/inherited-extra";
import { SRC } from "@/data/params/sources";
import { money, money2, pct } from "@/lib/format";
import {
  ANNUAL_FROM,
  CLOSE_GAP,
  EARLY_RATE,
  EXCISE_RATE,
  EXCISE_RATE_CORRECTED,
  FIVE,
  FIVE_SKIP_YEAR,
  MAJORITY_AGE,
  PENALTY_FREE_AGE,
  SECURE_FIRST_DEATH_YEAR,
  TEN,
  ageLabel,
  categoryLong,
  methodName,
  ymdLong,
} from "./copy";

export const fmtFactor = (n: number) => n.toFixed(1);
/** [2024] → "2024"; [2021, 2022, 2023, 2024] → "2021–2024". */
const yearSpan = (ys: number[]) => (ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : String(ys[0] ?? ""));
/** Same month and day `n` years later; February 29 becomes February 28 in a non-leap year. */
const plusYears = (d: YMD, n: number): YMD => ({ year: d.year + n, month: d.month, day: Math.min(d.day, daysInMonth(d.year + n, d.month)) });

export function basisText(d: Divisor) {
  switch (d.basis) {
    case "beneficiary":
      return "Your Single Life factor, minus 1 a year";
    case "owner":
      return "Owner’s remaining life expectancy";
    case "spouse":
      return "Single Life, looked up fresh yearly";
    default:
      return "Uniform Lifetime Table";
  }
}

export function Hero({
  r,
  year,
  bal,
  owed,
  D,
  balanceDate,
  account,
}: {
  r: InheritedResult;
  year: number;
  bal: number;
  owed: number;
  D: number;
  balanceDate: string;
  account: InheritedAccount;
}) {
  const plan = r.plan;
  const st = r.thisYear.status;
  const deadline = plan.deadlineYear;
  const d = r.thisYear.divisor;
  const label = `What you must withdraw in ${year}`;
  const owedNote =
    owed > 0 ? (
      <>
        {" "}
        This includes <strong>{money2(owed)}</strong> — the owner’s own {D} RMD, which they hadn’t taken yet.
      </>
    ) : null;

  if (st === "past-deadline") {
    return (
      <ResultHero
        label={label}
        value={money2(bal)}
        tone={bal > 0 ? "ember" : "sage"}
        sub={
          bal > 0 ? (
            <>
              Everything. The deadline to empty this account was <strong>December 31, {deadline}</strong>, so whatever is left is overdue — withdraw it now.
            </>
          ) : (
            <>
              The deadline to empty this account was <strong>December 31, {deadline}</strong>. If it is already empty, you’re done; if not, withdraw what’s left now.
            </>
          )
        }
      />
    );
  }
  if (st === "final-year") {
    return (
      <ResultHero
        label={label}
        value={money2(r.totalDue)}
        tone="sun"
        sub={
          <>
            <strong>{year} is the deadline year:</strong> the whole account (shown here at its {balanceDate} value, plus any growth) must be out by December 31,{" "}
            {year}.
          </>
        }
      />
    );
  }
  if (st === "all-due") {
    return (
      <ResultHero
        label={label}
        value={money2(r.totalDue)}
        tone="sun"
        sub={<>Your life-expectancy divisor has run down to 1.0 or less, so the whole balance must come out by December 31, {year}.</>}
      />
    );
  }
  if (st === "annual" && bal <= 0) {
    return (
      <ResultHero
        label={label}
        value="$0"
        tone="sage"
        sub={
          <>
            Enter the {balanceDate} balance to see the dollar amount. Your divisor this year is {d ? fmtFactor(d.value) : "—"}, so the required share is{" "}
            <strong>{pct(d ? 1 / d.value : 0, 2)}</strong> of that balance.
          </>
        }
      />
    );
  }
  if (st === "annual") {
    return (
      <ResultHero
        label={label}
        value={money2(r.totalDue)}
        tone="ink"
        sub={
          <>
            That’s <strong>{pct(d ? 1 / d.value : 0, 2)}</strong> of the {balanceDate} balance.{" "}
            {plan.ownFirstYearRbd === year ? (
              <>
                It’s your first RMD as the owner, so it can wait until <strong>April 1, {year + 1}</strong> — but then your {year + 1} RMD is due by December 31,{" "}
                {year + 1} too.
              </>
            ) : (
              <>
                Withdraw it by <strong>December 31, {year}</strong>.
              </>
            )}
            {deadline != null ? <> Everything must be out by December 31, {deadline}.</> : null}
            {owedNote}
          </>
        }
      />
    );
  }

  // $0 this year (unless the owner's death-year RMD is still owed).
  let why: React.ReactNode;
  if (plan.method === "spouse-own") {
    why =
      plan.firstYear == null ? (
        <>It’s your own Roth IRA now, and Roth owners never have required withdrawals.</>
      ) : (
        <>
          It’s your own IRA now, so nothing is required from it until your first RMD as the owner, for <strong>{plan.firstYear}</strong>.
        </>
      );
  } else if (st === "no-annual" && deadline != null) {
    const reason =
      account === "roth"
        ? "a Roth account is treated as if the owner died before their RMDs began"
        : plan.rbd.treatedAsBefore === "still-working"
          ? "the owner was still working for the plan’s employer, so their plan RMDs hadn’t begun"
          : plan.electedTenYear
            ? `you chose the ${TEN}-year rule`
            : plan.method === "five-year"
              ? `the ${FIVE}-year rule has no yearly minimum`
              : "the owner died before their required beginning date";
    why = (
      <>
        No yearly minimum — {reason}. Take any amount, any time, but the account must be empty by <strong>December 31, {deadline}</strong>.
      </>
    );
  } else if (plan.delayedStart && plan.firstYear != null && year < plan.firstYear) {
    why = (
      <>
        As a surviving spouse you can wait: your first RMD is for <strong>{plan.firstYear}</strong>, the year the owner would have reached RMD age (
        {ageLabel(plan.rbd.applicableAge)}).
      </>
    );
  } else if (year === D) {
    why = (
      <>
        Beneficiary RMDs start the year after the death — your first is for <strong>{D + 1}</strong>.
      </>
    );
  } else if (st === "waived") {
    why = <>The IRS waived this year’s minimum.</>;
  } else {
    why = plan.firstYear != null ? <>Your first required withdrawal is for {plan.firstYear}.</> : <>No yearly minimum applies.</>;
  }
  if (owed > 0) {
    return (
      <ResultHero
        label={label}
        value={money2(r.totalDue)}
        tone="ember"
        sub={
          <>
            This is the owner’s own {D} RMD, which they hadn’t taken yet — it must come out by <strong>December 31, {D}</strong>. {why}
          </>
        }
      />
    );
  }
  return <ResultHero label={label} value="$0" tone="sage" sub={why} />;
}

export function RulesCard({ r, ownerDob, ownerDod }: { r: InheritedResult; ownerDob: YMD; ownerDod: YMD }) {
  const plan = r.plan;
  const rbd = plan.rbd;
  const D = plan.deathYear;
  const deadline = plan.deadlineYear;
  let explain: string;
  switch (plan.method) {
    case "ten-year-annual": {
      const firstRequired = plan.waivedYears.length ? plan.waivedYears[plan.waivedYears.length - 1] + 1 : D + 1;
      explain = `Because the owner died on or after their required beginning date, you must take a yearly minimum every year from ${firstRequired} through ${(deadline ?? D) - 1}, and empty the account by December 31, ${deadline}.`;
      break;
    }
    case "ten-year-lump":
      explain = `No yearly minimum: take any amount whenever you like, as long as the account is empty by December 31, ${deadline}.`;
      break;
    case "life-expectancy":
      explain = plan.grandfathered
        ? `The owner died before ${SECURE_FIRST_DEATH_YEAR}, so the old “stretch” rules still apply: a yearly RMD over your life expectancy and no ${TEN}-year deadline.`
        : `A yearly RMD spread over your life expectancy, with no ${TEN}-year deadline.${plan.canElectTenYear ? ` You could instead choose the ${TEN}-year rule.` : ""}`;
      break;
    case "minor-child":
      explain = `Yearly RMDs over your life expectancy until you turn ${MAJORITY_AGE} in ${plan.majorityYear}. Then the ${TEN}-year clock starts: yearly RMDs continue and the account must be empty by December 31, ${deadline}.`;
      break;
    case "spouse-beneficiary":
      explain = `You keep it as an inherited IRA. Yearly RMDs start in ${plan.firstYear}, using your life expectancy looked up fresh each year${rbd.diedOnOrAfterRbd ? " (or the owner’s remaining life expectancy, if that is longer)" : ""}. There is no deadline to empty it.`;
      break;
    case "spouse-own":
      explain =
        plan.firstYear == null
          ? "It becomes your own Roth IRA: no required withdrawals while you’re alive, and your own beneficiaries."
          : `It becomes your own IRA: RMDs follow your own RMD age and the Uniform Lifetime Table (the first one from this account is for ${plan.firstYear}), and you name your own beneficiaries.`;
      break;
    case "five-year":
      explain = `With no person named as beneficiary and death before the required beginning date, the account must be empty by December 31, ${deadline}. There is no yearly minimum.`;
      break;
    default:
      explain = "With no person named as beneficiary and death after the required beginning date, yearly RMDs continue over what would have been the owner’s remaining life expectancy.";
  }
  const timing = rbd.diedOnOrAfterRbd ? "on or after" : "before";
  return (
    <div className="sunk mt-6 p-5">
      <p className="eyebrow">Your rules</p>
      <h3 className="mt-1 text-[1.3rem] font-semibold">{methodName(plan.method)}</h3>
      <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-2">{explain}</p>
      <ul className="mt-3 space-y-2 text-[1rem] leading-relaxed text-ink-2">
        <li>
          <strong className="text-ink">Who you are:</strong> {categoryLong(plan.category)}.
        </li>
        <li>
          <strong className="text-ink">The owner:</strong> born {ymdLong(ownerDob)}, so their RMD age was {ageLabel(rbd.applicableAge)} and their required beginning date
          (RBD) April 1, {rbd.rbd.year}. They died {ymdLong(ownerDod)} — <strong className="text-ink">{rbd.treatedAsBefore ? "treated as before" : timing}</strong> that
          date
          {rbd.treatedAsBefore === "roth"
            ? ", because a Roth owner is always treated as dying before their RBD"
            : rbd.treatedAsBefore === "still-working"
              ? ", because they were still working, so their plan RMDs hadn’t started"
              : ""}
          .
        </li>
      </ul>
    </div>
  );
}

export function Warnings({
  r,
  year,
  bal,
  D,
  beneDob,
  ownerDob,
  ownerDod,
  account,
  took,
  showTook,
}: {
  r: InheritedResult;
  year: number;
  bal: number;
  D: number;
  beneDob: YMD;
  ownerDob: YMD;
  ownerDod: YMD;
  account: InheritedAccount;
  took: boolean;
  showTook: boolean;
}) {
  const plan = r.plan;
  const items: React.ReactNode[] = [];
  const dy = r.deathYearRmd;

  if (dy && showTook) {
    if (took) {
      items.push(
        <Callout key="dy" tone="sage" title={`Nothing extra for ${D}`}>
          The owner took their {D} RMD, so the beneficiary doesn’t owe it.
        </Callout>,
      );
    } else if (year === D) {
      items.push(
        <Callout key="dy" tone="ember" title={`Don’t miss the owner’s ${D} RMD`}>
          They died after their required beginning date, so if they hadn’t finished their {D} RMD, the beneficiary must withdraw the rest by December 31, {D}: about{" "}
          <strong>{money2(dy.amount ?? 0)}</strong> ({money2(bal)} ÷ {fmtFactor(dy.period)}, the {dy.table === "joint" ? "Joint and Last Survivor" : "Uniform Lifetime"} factor at age{" "}
          {dy.ownerAge}). It’s included in the amount above. Late? Taking it by your tax-filing deadline (with extensions) — or by December 31, {dy.waiverYear}, if later —
          gets an automatic waiver of the penalty.
        </Callout>,
      );
    } else {
      items.push(
        <Callout key="dy" tone="ember" title={`Was the owner’s ${D} RMD taken?`}>
          They died after their required beginning date. If their {D} RMD wasn’t fully taken by December 31, {D}, withdraw the shortfall now: it’s the December 31,{" "}
          {D - 1} balance ÷ {fmtFactor(dy.period)} (the {dy.table === "joint" ? "Joint and Last Survivor" : "Uniform Lifetime"} factor at age {dy.ownerAge}). The IRS
          automatically waives the penalty if the beneficiary takes it by their tax-filing deadline for {D} (with extensions) or by December 31, {dy.waiverYear}, whichever
          is later. It comes on top of your own {year} RMD.
        </Callout>,
      );
    }
  }

  if (r.thisYear.status === "past-deadline") {
    items.push(
      <Callout key="late" tone="ember" title="Fix a missed deadline quickly">
        The IRS excise tax is {pct(EXCISE_RATE)} of what should have come out, cut to {pct(EXCISE_RATE_CORRECTED)} if you correct it within the correction window. Withdraw the
        balance and file Form 5329; you can ask for a full waiver for a reasonable error by attaching an explanation.
      </Callout>,
    );
  }

  if (plan.waivedYears.length) {
    items.push(
      <Callout key="relief" tone="sky" title={`No catch-up for ${yearSpan(plan.waivedYears)}`}>
        The IRS waived the penalty for missed yearly RMDs under the {TEN}-year rule for {plan.waivedYears.join(", ")}, and you don’t have to make them up. Yearly RMDs are
        required again from {ANNUAL_FROM}, and the deadline did not move: the account must still be empty by December 31, {plan.deadlineYear}. Your divisor is not reset — it
        keeps falling by 1 a year from {D + 1}.
      </Callout>,
    );
  }

  const childAge = Math.max(0, ageOn(beneDob, ownerDod));
  for (const n of plan.notes) {
    if ((n === "other-is-close-age" || n === "child-is-close-age") && !plan.grandfathered) {
      items.push(
        <Callout key={n} tone="sage" title="Good news: you count as an eligible beneficiary">
          You were born no more than {CLOSE_GAP} years after the owner, so you can stretch withdrawals over your life expectancy instead of emptying the account in {TEN} years.
        </Callout>,
      );
    } else if (n === "close-age-too-young") {
      items.push(
        <Callout key={n} tone="sun" title={`More than ${CLOSE_GAP} years younger`}>
          The close-in-age rule only covers people born on or before {ymdLong(plusYears(ownerDob, CLOSE_GAP))}. You’re treated as an ordinary designated
          beneficiary.
        </Callout>,
      );
    } else if (n === "child-not-minor" && !plan.grandfathered) {
      items.push(
        <Callout key={n} tone="sky" title={`Adult children use the ${TEN}-year rule`}>
          Only the owner’s children under {MAJORITY_AGE} on the date of death get life-expectancy payouts. You were {childAge} on the date of death, so you’re a designated beneficiary.
        </Callout>,
      );
    }
  }

  if (plan.method === "minor-child" && plan.majorityYear != null) {
    items.push(
      <Callout key="minor" tone="sky" title={`At ${MAJORITY_AGE}, the ${TEN}-year clock starts`}>
        Life-expectancy RMDs run until the child turns {MAJORITY_AGE} in {plan.majorityYear}. Yearly RMDs then continue, and the account must be empty by December 31,{" "}
        {plan.deadlineYear}. A child who is also disabled or chronically ill keeps the life-expectancy payouts after {MAJORITY_AGE}.
      </Callout>,
    );
  }

  if (account === "roth" && plan.method === "ten-year-lump") {
    items.push(
      <Callout key="roth" tone="sage" title="Inherited Roth: let it grow">
        Withdrawals from an inherited Roth are usually tax-free, and there’s no yearly minimum. Most heirs do best leaving it invested until near the deadline, then emptying
        it — just don’t miss December 31, {plan.deadlineYear}.
      </Callout>,
    );
  }

  if (plan.category === "none") {
    items.push(
      <Callout key="estate" tone="sky" title="Estates, charities and trusts">
        A trust that qualifies as a “see-through” trust is looked through to its beneficiaries, who may get longer payouts. A charity pays no income tax on the withdrawals.
        Ask the trustee or executor which rule the account is on.
      </Callout>,
    );
  }

  if (account === "plan" && D >= SECURE_FIRST_DEATH_YEAR && D < GOVERNMENTAL_PLAN_TEN_YEAR.value.firstDeathYear && !plan.edb) {
    items.push(
      <Callout key="gov" tone="sky" title="Government employer plan?">
        For governmental plans (like many 457(b) plans), the {TEN}-year rule only applies to deaths from {GOVERNMENTAL_PLAN_TEN_YEAR.value.firstDeathYear} on, so older
        stretch rules may still apply. Ask the plan administrator.
      </Callout>,
    );
  }

  if (!items.length) return null;
  return <div className="mt-5 space-y-3">{items}</div>;
}

export function DoMath({ r, year, bal, D, beneDob, balanceDate }: { r: InheritedResult; year: number; bal: number; D: number; beneDob: YMD; balanceDate: string }) {
  const plan = r.plan;
  const d = r.thisYear.divisor;
  const b = d?.beneficiary;
  const o = d?.owner;
  const tables = SRC.ecfrRmdTables.url;
  const dy = r.deathYearRmd;
  return (
    <ShowMath>
      <ol className="list-decimal space-y-2 pl-5">
        {d ? (
          <>
            <li>
              Balance on {balanceDate}: <strong>{money2(bal)}</strong>
            </li>
            {d.basis === "uniform" ? (
              <li>
                Your age in {year}: <strong>{d.uniformAge}</strong>. Uniform Lifetime Table factor:{" "}
                <a className="link" href={tables} target="_blank" rel="noopener">
                  {fmtFactor(d.value)}
                </a>
                .
              </li>
            ) : null}
            {b && !b.recalculated ? (
              <li>
                Your age in {b.lookupYear} (the year after the death): {b.lookupYear} − {beneDob.year} = <strong>{b.age}</strong>. Single Life Table:{" "}
                <a className="link" href={tables} target="_blank" rel="noopener">
                  {fmtFactor(b.initial)}
                </a>
                .{" "}
                {year > b.lookupYear ? (
                  <>
                    Minus 1 for each year since: {fmtFactor(b.initial)} − {year - b.lookupYear} = <strong>{fmtFactor(b.value)}</strong>.
                  </>
                ) : (
                  <>This is the first year, so nothing is subtracted yet.</>
                )}
              </li>
            ) : null}
            {b && b.recalculated ? (
              <li>
                Your age in {year}: <strong>{b.age}</strong>. Single Life Table, looked up fresh each year for a spouse:{" "}
                <a className="link" href={tables} target="_blank" rel="noopener">
                  {fmtFactor(b.value)}
                </a>
                .
              </li>
            ) : null}
            {o ? (
              <li>
                Owner’s age in {o.lookupYear} (the year of death): <strong>{o.age}</strong>. Single Life Table: {fmtFactor(o.initial)}, minus {year - o.lookupYear} ={" "}
                <strong>{fmtFactor(o.value)}</strong>.
              </li>
            ) : null}
            {b && o ? (
              <li>
                The owner died after their required beginning date, so use the larger of the two: <strong>{fmtFactor(d.value)}</strong> ({d.basis === "owner" ? "the owner’s" : "yours"}).
              </li>
            ) : null}
            {d.value <= 1 ? (
              <li>
                The divisor is 1.0 or less, so the whole balance is due: <strong>{money2(bal)}</strong>.
              </li>
            ) : (
              <li>
                {money2(bal)} ÷ {fmtFactor(d.value)} = <strong>{money2(r.thisYear.computed)}</strong>
                {r.thisYear.status === "final-year" ? " — but this year the whole balance is due." : null}
              </li>
            )}
          </>
        ) : (
          <li>No yearly divisor applies in {year}, so the minimum is $0{plan.deadlineYear != null && year === plan.deadlineYear ? ", except that the whole balance is due this year" : ""}.</li>
        )}
        {plan.deadlineYear != null ? (
          <li>
            Deadline:{" "}
            {plan.deadlineKind === "minor-child" ? (
              <>
                you turn {MAJORITY_AGE} in {plan.majorityYear}; {plan.majorityYear} + {TEN} = <strong>{plan.deadlineYear}</strong>.
              </>
            ) : plan.deadlineKind === "five-year" ? (
              <>
                {D} + {FIVE}
                {plan.deadlineYear !== D + FIVE ? ` + 1 (${FIVE_SKIP_YEAR} is skipped for deaths before ${FIVE_SKIP_YEAR})` : ""} = <strong>{plan.deadlineYear}</strong>.
              </>
            ) : (
              <>
                the {TEN}th anniversary of a {D} death falls in {D} + {TEN} = <strong>{plan.deadlineYear}</strong>; the account must be empty by December 31 of that year.
              </>
            )}
          </li>
        ) : null}
        {dy && dy.amount != null && !dy.taken ? (
          <li>
            Owner’s {D} RMD: {money2(bal)} ÷ {fmtFactor(dy.period)} ({dy.table === "joint" ? "Joint and Last Survivor" : "Uniform Lifetime"} table, age {dy.ownerAge}) ={" "}
            <strong>{money2(dy.amount)}</strong>.
          </li>
        ) : null}
      </ol>
      <p className="mt-3">
        Several inherited IRAs from the same person can be added together and the total taken from any of them — but never mixed with your own IRAs or with IRAs inherited from
        someone else. Inherited 401(k)s pay their own RMD separately.
      </p>
    </ShowMath>
  );
}

export function SpouseOptions({ cmp, year, account }: { cmp: SpouseComparison; year: number; account: InheritedAccount }) {
  const { bene, own } = cmp;
  const age = ageLabel(PENALTY_FREE_AGE);
  let title: string;
  let text: React.ReactNode;
  switch (cmp.suggestion) {
    case "stay-under-59":
      title = `Under ${age}? Keep it inherited for now`;
      text = (
        <>
          You won’t reach {age} until {cmp.year59Half}. Withdrawals from an inherited IRA never carry the {pct(EARLY_RATE)} early-withdrawal tax; from your own IRA they
          would. You can usually switch and treat it as your own later — many spouses do once they pass {age}.
        </>
      );
      break;
    case "own-roth":
      title = "Make the Roth your own";
      text = (
        <>
          As your own Roth IRA it never has required withdrawals, while keeping it inherited means yearly RMDs from {bene.plan.firstYear ?? "the year after the death"}.
          {cmp.under59HalfAllYear ? (
            <>
              {" "}
              Under {age} (until {cmp.year59Half}), the {pct(EARLY_RATE)} early-withdrawal tax only hits the taxable part of a withdrawal from your own Roth — so it
              matters only if you may need its earnings before then.
            </>
          ) : null}
        </>
      );
      break;
    case "own-starts-later":
      title = "Treat it as your own";
      text = (
        <>
          You haven’t reached your own RMD age yet, so as your own IRA nothing is required until {own.plan.firstYear}, versus {bene.plan.firstYear} as a beneficiary.
          That’s more years of tax-deferred growth.
        </>
      );
      break;
    case "bene-starts-later":
      title = "Staying a beneficiary lets you wait longer";
      text = (
        <>
          As a beneficiary you can wait until {bene.plan.firstYear}, the year the owner would have reached RMD age — later than your own start in {own.plan.firstYear}. You
          can still switch and make it your own later.
        </>
      );
      break;
    case "own-lower":
      title = "Treat it as your own";
      text = (
        <>
          The Uniform Lifetime Table gives a smaller required withdrawal: {money(own.thisYear.amount)} instead of {money(bene.thisYear.amount)} in {year}.
        </>
      );
      break;
    default:
      title = "Either choice works";
      text = <>Both options require about the same this year. The main differences are the early-withdrawal tax before {age} and the rules your own heirs will face.</>;
  }
  return (
    <div className="mt-8">
      <h3 className="text-[1.3rem] font-semibold">Spouse: keep it inherited, or make it yours?</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="table-sy text-[0.98rem]">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Option</span>
              </th>
              <th scope="col">Keep as inherited IRA</th>
              <th scope="col">Treat as your own</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="strong">
                Required in {year}
              </th>
              <td className="strong">{money(bene.thisYear.amount)}</td>
              <td className="strong">{money(own.thisYear.amount)}</td>
            </tr>
            <tr>
              <th scope="row" className="strong">
                First yearly RMD
              </th>
              <td>{bene.plan.firstYear ?? "None"}</td>
              <td>{own.plan.firstYear ?? (account === "roth" ? "Never (Roth)" : "None")}</td>
            </tr>
            <tr>
              <th scope="row" className="strong">
                IRS table
              </th>
              <td>{bene.plan.rbd.diedOnOrAfterRbd ? "Single Life: yours looked up yearly, or the owner’s if longer" : "Single Life, looked up yearly"}</td>
              <td>{account === "roth" ? "None needed" : "Uniform Lifetime"}</td>
            </tr>
            <tr>
              <th scope="row" className="strong">
                Withdrawals before {age}
              </th>
              <td>No {pct(EARLY_RATE)} early-withdrawal tax</td>
              <td>{account === "roth" ? `${pct(EARLY_RATE)} extra tax on any taxable earnings` : `${pct(EARLY_RATE)} extra tax (some exceptions)`}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Callout tone="sage" title={title}>
          {text}
        </Callout>
      </div>
    </div>
  );
}

export function Schedule({ r, year, growth, isEstate, isRoth }: { r: InheritedResult; year: number; growth: number; isEstate: boolean; isRoth: boolean }) {
  const plan = r.plan;
  const rows = r.minimum.rows;
  const even = r.even;
  if (!rows.length) return null;
  const hasDeadline = plan.deadlineYear != null && even != null && rows.length > 1;
  const evenByYear = new Map((even?.rows ?? []).map((x) => [x.year, x.withdrawal]));
  const firstEven = even?.rows[0]?.withdrawal ?? 0;
  const lastMin = rows[rows.length - 1];
  if (!hasDeadline && rows.every((x) => x.withdrawal === 0)) {
    return (
      <p className="mt-8 text-[1rem] text-ink-3">
        No withdrawals are required in any year we project. You can still take money out whenever you like.
      </p>
    );
  }
  return (
    <div className="mt-8">
      {hasDeadline ? (
        <>
          <h3 className="text-[1.3rem] font-semibold">{isRoth ? "Take it all at the end, or spread it out?" : "Should you take it faster to smooth your taxes?"}</h3>
          <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">
            Taking only the minimum leaves about <strong>{money(lastMin.withdrawal)}</strong> to come out in {lastMin.year} alone. Spreading it evenly instead starts at about{" "}
            <strong>{money(firstEven)}</strong> a year.{" "}
            {isRoth
              ? "For a Roth the usual advice is the opposite of a traditional account: withdrawals are usually tax-free, so waiting keeps the growth tax-free too. The even spread is shown only for comparison."
              : "One huge year can push you into a higher tax bracket and raise Medicare premiums two years later, so for a traditional account an even spread (more in low-income years) usually costs less tax."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Stat label="Biggest year, minimum only" value={money(r.minimum.largest)} sub={`In ${r.minimum.largestYear}`} tone="ember" />
            <Stat label="Biggest year, even spread" value={money(even!.largest)} sub={`Total withdrawn ${money(even!.total)}`} tone="sage" />
          </div>
          <div className="mt-4">
            <LineChart
              series={[
                { name: "Minimum only", color: "var(--ember)", points: rows.map((x) => ({ x: x.year, y: x.withdrawal })) },
                { name: "Even spread", color: "var(--sage)", dashed: true, points: rows.map((x) => ({ x: x.year, y: evenByYear.get(x.year) ?? 0 })) },
              ]}
              xLabel="Year"
              caption={`Yearly withdrawals from ${year} to ${plan.deadlineYear}: minimum only versus an even spread, assuming ${growth}% growth`}
            />
          </div>
        </>
      ) : (
        <>
          <h3 className="text-[1.3rem] font-semibold">Your withdrawals over time</h3>
          <p className="mt-1 text-[1rem] text-ink-3">Required minimums, assuming {growth}% yearly growth and only the minimum withdrawn.</p>
          <div className="mt-4">
            <BarChart
              data={rows.slice(0, 30).map((x) => ({ x: x.year, y: x.withdrawal }))}
              highlight={year}
              caption={`Projected required withdrawals by year starting ${year}`}
            />
          </div>
        </>
      )}
      <details className="explainer mt-3">
        <summary className="flex cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> See the year-by-year table
        </summary>
        <div className="mt-3 max-h-[26rem] overflow-auto rounded-2xl">
          <table className="table-sy text-[0.98rem]">
            <thead>
              <tr>
                <th scope="col">Year</th>
                {!isEstate ? <th scope="col">Your age</th> : null}
                <th scope="col">Balance at start</th>
                <th scope="col">Divisor</th>
                <th scope="col">Minimum</th>
                {hasDeadline ? <th scope="col">Even spread</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.year} className={x.year === year ? "is-hit" : undefined}>
                  <td>{x.year}</td>
                  {!isEstate ? <td>{x.age}</td> : null}
                  <td>{money(x.startBalance)}</td>
                  <td>{x.status === "final-year" || x.status === "past-deadline" || x.status === "all-due" ? "All" : x.divisor != null ? fmtFactor(x.divisor) : "—"}</td>
                  <td className="strong">{money(x.withdrawal)}</td>
                  {hasDeadline ? <td>{money(evenByYear.get(x.year) ?? 0)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-3">
          “Balance at start” is the prior December 31 value. Withdrawals are assumed at year-end; real returns will differ.
        </p>
      </details>
    </div>
  );
}
