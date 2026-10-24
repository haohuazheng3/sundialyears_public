import Link from "next/link";
import { STATES, nameOf, neighbors, type StateTax } from "@/data/states";
import { Icon } from "@/components/ui/Icon";
import { money } from "@/lib/format";
import { TaxBadge, VerdictPill, rateLabel } from "./style";
import { firstSentence } from "./content";

/** "What's taxed" matrix: Social Security / pensions / IRA & 401(k) / military / rate, each with a clear badge. */
export function TaxedMatrix({ s }: { s: StateTax }) {
  const rows = [
    { label: "Social Security", badge: <TaxBadge taxed={s.socialSecurity.taxed} />, text: s.socialSecurity.summary, href: "#social-security" },
    { label: "Pensions", badge: <TaxBadge taxed={s.pensions.taxed} />, text: s.pensions.summary, href: "#pensions" },
    { label: "IRA & 401(k) withdrawals", badge: <TaxBadge taxed={s.iraAnd401k.taxed} />, text: s.iraAnd401k.summary, href: "#ira-401k" },
    { label: "Military retirement pay", badge: <TaxBadge taxed={s.military.taxed} />, text: s.military.summary, href: "#military" },
    {
      label: "Income tax rate",
      badge: <span className="pill pill-sky num">{rateLabel(s.rates)}</span>,
      text: firstSentence(s.rates.summary),
      href: "#rate",
    },
  ];
  return (
    <section aria-labelledby="matrix-h" className="float p-5 sm:p-7">
      <h2 id="matrix-h" className="text-[1.6rem] font-semibold leading-tight sm:text-[1.85rem]">
        What’s taxed in {nameOf(s)}
      </h2>
      <p className="mt-1 text-[1rem] text-ink-3">
        2026 rules.{rows.some((r) => /\bAGI\b/.test(r.text)) ? " AGI means the adjusted gross income on your federal return." : ""}
      </p>
      <dl className="mt-4 divide-y divide-[var(--hairline)]">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[12.5rem_minmax(0,1fr)]">
            <dt className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
              <a href={r.href} className="text-[1.0625rem] font-bold text-ink hover:text-sun-ink">
                {r.label}
              </a>
              {r.badge}
            </dt>
            <dd className="text-[1.0625rem] leading-relaxed text-ink-2">{r.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Our rating + the concrete bullets that matter most. */
export function KeyPoints({ s }: { s: StateTax }) {
  return (
    <aside aria-labelledby="keypoints-h" className="float-soft p-5 sm:p-7">
      <p className="eyebrow">Our rating</p>
      <div className="mt-2">
        <VerdictPill label={s.verdict.label} className="!px-3.5 !py-1.5 !text-[1.0625rem]" />
      </div>
      <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">{s.verdict.reason}</p>
      <Link href="/state-retirement-taxes#how-we-rate" className="link mt-1 inline-block text-[1rem]">
        How we rate states
      </Link>
      <h2 id="keypoints-h" className="mt-6 text-[1.35rem] font-semibold">
        Key points for retirees
      </h2>
      <ul className="mt-3 space-y-3">
        {s.highlights.map((h) => (
          <li key={h} className="flex gap-3 text-[1.0625rem] leading-relaxed text-ink-2">
            <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun-wash text-sun-ink">
              <Icon name="check" size={14} strokeWidth={2.6} />
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** 2026 brackets — one "all filers" column when the state uses a single table. */
export function BracketTable({ s }: { s: StateTax }) {
  const b = s.rates.brackets;
  if (!b?.length) return null;
  const single = b.every((x) => x.over === x.overJoint);
  const fmt = (n: number | null) => (n == null ? "—" : n === 0 ? "$0" : money(n));
  return (
    <div className="not-prose -mx-1 overflow-x-auto px-1">
      <p className="mt-4 text-[0.95rem] text-ink-3">2026 brackets. Each rate applies to taxable income above the amount shown.</p>
      <table className="table-sy mt-2 text-[1rem]">
        <caption className="sr-only">{nameOf(s)} 2026 income tax brackets</caption>
        <thead>
          <tr>
            {single ? (
              <th scope="col">All filers</th>
            ) : (
              <>
                <th scope="col">Single</th>
                <th scope="col">Married, joint</th>
              </>
            )}
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          {b.map((x, i) => (
            <tr key={i}>
              <td className="num">{fmt(x.over)}</td>
              {single ? null : <td className="num">{fmt(x.overJoint)}</td>}
              <td className="num strong">{x.rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareCard({ s, current = false }: { s: StateTax; current?: boolean }) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[1.15rem] font-bold leading-snug text-ink">{s.name}</span>
        {current ? <span className="pill !py-0.5 text-[0.8rem]">This page</span> : <Icon name="arrow" size={18} className="mt-1 shrink-0 text-sun-ink" />}
      </span>
      <span className="mt-2 block">
        <VerdictPill label={s.verdict.label} />
      </span>
      <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.95rem] text-ink-3">
        Social Security <TaxBadge taxed={s.socialSecurity.taxed} />
      </span>
      <span className="mt-1.5 block text-[0.95rem] text-ink-3">
        Top rate: <span className="num font-bold text-ink">{rateLabel(s.rates)}</span>
      </span>
    </>
  );
  if (current) return <div className="sunk flex h-full flex-col p-4 ring-2 ring-[var(--sun)]">{body}</div>;
  return (
    <Link href={`/state-retirement-taxes/${s.slug}`} className="float-soft float-lift flex h-full flex-col p-4">
      {body}
    </Link>
  );
}

/** Neighboring states side by side (or, for Alaska and Hawaii, states with the same rating). */
export function NeighborCompare({ s }: { s: StateTax }) {
  const n = neighbors(s.code);
  const fallback = n.length === 0;
  const list = fallback ? STATES.filter((x) => x.code !== s.code && x.verdict.label === s.verdict.label).slice(0, 5) : n;
  return (
    <section aria-labelledby="neighbors-h" className="float p-5 sm:p-8">
      <h2 id="neighbors-h" className="text-[1.6rem] font-semibold leading-tight sm:text-[1.85rem]">
        {fallback ? `How ${nameOf(s)} compares` : `How ${nameOf(s)} compares with its neighbors`}
      </h2>
      <p className="mt-2 text-[1.0625rem] text-ink-2">
        {fallback
          ? `${s.name} has no land border with another state, so here are other states we rate “${s.verdict.label}”.`
          : "Thinking of moving across the line? Here’s how each bordering state treats retirement income in 2026."}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <CompareCard s={s} current />
        </li>
        {list.map((x) => (
          <li key={x.code}>
            <CompareCard s={x} />
          </li>
        ))}
      </ul>
    </section>
  );
}
