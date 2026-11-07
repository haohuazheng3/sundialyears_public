/**
 * IRMAA bracket tables (no hooks, no client code — usable from server pages and from the calculator).
 * Ranges and amounts come from IRMAA_SCHEDULES via the tested engine (tierRows / rangeLabel), with the exact
 * CMS boundary wording: "more than … up to …", "less than $500,000", "$500,000 or more".
 */
import type { FilingGroup } from "@/data/params/medicare";
import { altBoundsFor, rangeLabel, scheduleFor, tierRows, tierName, type Tier, type TierRow } from "@/lib/calc/irmaa";
import { money, money2 } from "@/lib/format";
import { MISSING_CPI_MONTH, PUBLISHED_CPI_MONTHS, S26, S27, TIERS, monthlyPerPerson, partBTotal, pctLabel, yearlyPerPerson } from "./irmaa-content";

const moved = (a: TierRow, b: TierRow | undefined) => b != null && (a.from !== b.from || a.to !== b.to);

function TierCell({ tier }: { tier: Tier }) {
  return (
    <td className="strong whitespace-nowrap">
      {tierName(tier)}
      <span className="block text-[0.875rem] font-normal text-ink-3">{pctLabel(tier)}</span>
    </td>
  );
}

/**
 * CMS-style table: individual and joint MAGI ranges side by side, Part B and Part D amounts per person.
 * For a year with alternative projected lines (2027), the ranges that could move are marked with † and listed below.
 */
export function IrmaaBracketTable({
  year,
  highlight,
  caption,
}: {
  year: number;
  /** Highlight one tier (and say which column the reader uses). */
  highlight?: { tier: Tier; group: FilingGroup };
  caption?: string;
}) {
  const s = scheduleFor(year);
  const ind = tierRows(s, "individual");
  const joint = tierRows(s, "joint");
  const alt = altBoundsFor(year);
  const altInd = alt ? tierRows(s, "individual", alt) : null;
  const altJoint = alt ? tierRows(s, "joint", alt) : null;
  const anyMoved = ind.some((r, k) => moved(r, altInd?.[k]));
  return (
    <div className="not-prose">
      {/* Phones: one card per tier (a six-column table is hard to read at 390px). */}
      <ol className="!list-none space-y-3 !pl-0 sm:hidden" aria-label={caption ?? `${year} IRMAA brackets by ${s.magiTaxYear} MAGI`}>
        {ind.map((r, k) => {
          const j = joint[k];
          const hit = highlight && highlight.group !== "mfsLivedWithSpouse" && highlight.tier === r.tier;
          return (
            <li key={r.tier} className={`sunk p-4 ${hit ? "!bg-sun-wash" : ""}`}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-bold text-ink">
                  {tierName(r.tier)}
                  {hit ? " (you)" : ""}
                </span>
                <span className="text-[0.9375rem] text-ink-3">{pctLabel(r.tier)}</span>
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[1rem] text-ink-2">
                <dt className="text-ink-3">Single</dt>
                <dd>
                  {rangeLabel(r)}
                  {moved(r, altInd?.[k]) ? " †" : ""}
                </dd>
                <dt className="text-ink-3">Joint</dt>
                <dd>
                  {rangeLabel(j)}
                  {moved(j, altJoint?.[k]) ? " †" : ""}
                </dd>
                <dt className="text-ink-3">Part B</dt>
                <dd className="num">
                  <strong className="text-ink">{money2(r.partBTotal)}</strong> a month
                </dd>
                <dt className="text-ink-3">Part D</dt>
                <dd className="num">{r.partDAddOn > 0 ? `+${money2(r.partDAddOn)} a month` : "$0"}</dd>
                <dt className="text-ink-3">Per year</dt>
                <dd className="num">{r.tier === 0 ? "No surcharge" : `${money2(yearlyPerPerson(s, r.tier))} extra per person`}</dd>
              </dl>
            </li>
          );
        })}
      </ol>
      <div className="hidden overflow-x-auto rounded-2xl sm:block">
        <table className="table-sy text-[1rem]">
          <caption className="sr-only">
            {caption ?? `${year} IRMAA brackets by ${s.magiTaxYear} MAGI, with monthly Part B and Part D amounts per person`}
          </caption>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col" className={highlight?.group === "individual" ? "strong" : undefined}>
                Single, head of household or surviving spouse ({s.magiTaxYear} MAGI)
              </th>
              <th scope="col" className={highlight?.group === "joint" ? "strong" : undefined}>
                Married filing jointly ({s.magiTaxYear} MAGI)
              </th>
              <th scope="col">Part B premium per month</th>
              <th scope="col">Part D add-on per month</th>
              <th scope="col">Extra per person per year</th>
            </tr>
          </thead>
          <tbody>
            {ind.map((r, k) => {
              const j = joint[k];
              const hit = highlight && highlight.group !== "mfsLivedWithSpouse" && highlight.tier === r.tier;
              return (
                <tr key={r.tier} className={hit ? "is-hit" : undefined}>
                  <TierCell tier={r.tier} />
                  <td>
                    {rangeLabel(r)}
                    {moved(r, altInd?.[k]) ? <span aria-label="could move, see note"> †</span> : null}
                  </td>
                  <td>
                    {rangeLabel(j)}
                    {moved(j, altJoint?.[k]) ? <span aria-label="could move, see note"> †</span> : null}
                  </td>
                  <td className="num">
                    <span className="strong text-ink">{money2(r.partBTotal)}</span>
                    {r.partBAddOn > 0 ? <span className="block text-[0.875rem] text-ink-3">incl. {money2(r.partBAddOn)} IRMAA</span> : null}
                  </td>
                  <td className="num">{r.partDAddOn > 0 ? `+${money2(r.partDAddOn)}` : "$0"}</td>
                  <td className="num">{r.tier === 0 ? "$0" : money2(yearlyPerPerson(s, r.tier))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasHit(highlight) ? <p className="mt-2 hidden text-[0.9375rem] text-ink-3 sm:block">Your row is shaded: {tierName(highlight!.tier)}.</p> : null}
      {anyMoved && altInd && altJoint ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-3">
          † Projected line that could still move. If CMS fills in the missing {MISSING_CPI_MONTH} inflation figure instead of averaging the{" "}
          {PUBLISHED_CPI_MONTHS} published months, these lines land at{" "}
          {altInd
            .slice(1, 4)
            .map((r) => money(r.to!))
            .join(", ")}{" "}
          (single) and{" "}
          {altJoint
            .slice(1, 4)
            .map((r) => money(r.to!))
            .join(", ")}{" "}
          (joint).
        </p>
      ) : null}
    </div>
  );
}

const hasHit = (h?: { tier: Tier; group: FilingGroup }) => h != null && h.group !== "mfsLivedWithSpouse";

/** Married filing separately and lived with the spouse at any time in the year: only three rows. */
export function IrmaaMfsTable({ year, highlightTier, caption }: { year: number; highlightTier?: Tier; caption?: string }) {
  const s = scheduleFor(year);
  const rows = tierRows(s, "mfsLivedWithSpouse");
  const label = caption ?? `${year} IRMAA for married people filing separately who lived with their spouse (${s.magiTaxYear} MAGI)`;
  return (
    <div className="not-prose">
      <ol className="!list-none space-y-3 !pl-0 sm:hidden" aria-label={label}>
        {rows.map((r) => (
          <li key={r.tier} className={`sunk p-4 ${highlightTier === r.tier ? "!bg-sun-wash" : ""}`}>
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-ink">
                {tierName(r.tier)}
                {highlightTier === r.tier ? " (you)" : ""}
              </span>
              <span className="text-[0.9375rem] text-ink-3">{pctLabel(r.tier)}</span>
            </p>
            <p className="mt-1 text-[1rem] text-ink-2">{rangeLabel(r)}</p>
            <p className="num mt-1 text-[1rem] text-ink-2">
              Part B <strong className="text-ink">{money2(r.partBTotal)}</strong>
              {r.partDAddOn > 0 ? ` · Part D +${money2(r.partDAddOn)}` : ""} a month
              {r.tier === 0 ? "" : ` · ${money2(yearlyPerPerson(s, r.tier))} extra a year`}
            </p>
          </li>
        ))}
      </ol>
      <div className="hidden overflow-x-auto rounded-2xl sm:block">
        <table className="table-sy text-[1rem]">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Married filing separately, lived with spouse ({s.magiTaxYear} MAGI)</th>
              <th scope="col">Part B premium per month</th>
              <th scope="col">Part D add-on per month</th>
              <th scope="col">Extra per year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tier} className={highlightTier === r.tier ? "is-hit" : undefined}>
                <TierCell tier={r.tier} />
                <td>{rangeLabel(r)}</td>
                <td className="num strong">{money2(r.partBTotal)}</td>
                <td className="num">{r.partDAddOn > 0 ? `+${money2(r.partDAddOn)}` : "$0"}</td>
                <td className="num">{r.tier === 0 ? "$0" : money2(yearlyPerPerson(s, r.tier))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Yearly IRMAA per person and per couple (both spouses on Medicare) for every tier. */
export function IrmaaYearlyTable({ year }: { year: number }) {
  const s = scheduleFor(year);
  return (
    <div className="not-prose overflow-x-auto rounded-2xl">
      <table className="table-sy text-[1rem]">
        <caption className="sr-only">{`${year} IRMAA per month and per year, for one person and for a couple`}</caption>
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">Extra per person per month</th>
            <th scope="col">Extra per person per year</th>
            <th scope="col">Couple, both on Medicare, per year</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => (
            <tr key={t}>
              <TierCell tier={t} />
              <td className="num">{money2(monthlyPerPerson(s, t))}</td>
              <td className="num strong">{money2(yearlyPerPerson(s, t))}</td>
              <td className="num">{money2(yearlyPerPerson(s, t) * 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const signed = (n: number, fmt: (x: number) => string) => (Math.abs(n) < 0.005 ? "no change" : `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}`);

/** 2026 → 2027 (projected): where each tier starts and what it costs, with the dollar change. */
export function IrmaaChangeTable() {
  const ind26 = tierRows(S26, "individual");
  const ind27 = tierRows(S27, "individual");
  const j26 = tierRows(S26, "joint");
  const j27 = tierRows(S27, "joint");
  const startLabel = (r: TierRow) => (r.from == null ? "—" : `${r.fromInclusive ? "" : "over "}${money(r.from)}`);
  return (
    <div className="not-prose overflow-x-auto rounded-2xl">
      <table className="table-sy text-[1rem]">
        <caption className="sr-only">IRMAA 2026 (official) compared with 2027 (projected): where each tier starts and how much it costs</caption>
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">Single: starts 2026 → 2027</th>
            <th scope="col">Joint: starts 2026 → 2027</th>
            <th scope="col">Part B premium 2026 → 2027</th>
            <th scope="col">Part D add-on 2026 → 2027</th>
            <th scope="col">Change per person per year</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t, k) => {
            const dInd = (ind27[k].from ?? 0) - (ind26[k].from ?? 0);
            const dJoint = (j27[k].from ?? 0) - (j26[k].from ?? 0);
            return (
              <tr key={t}>
                <TierCell tier={t} />
                <td>
                  {startLabel(ind26[k])} → {startLabel(ind27[k])}
                  {ind26[k].from != null ? <span className="block text-[0.875rem] text-ink-3">{signed(dInd, money)}</span> : null}
                </td>
                <td>
                  {startLabel(j26[k])} → {startLabel(j27[k])}
                  {j26[k].from != null ? <span className="block text-[0.875rem] text-ink-3">{signed(dJoint, money)}</span> : null}
                </td>
                <td className="num">
                  {money2(partBTotal(S26, t))} → {money2(partBTotal(S27, t))}
                  <span className="block text-[0.875rem] text-ink-3">{signed(partBTotal(S27, t) - partBTotal(S26, t), money2)}</span>
                </td>
                <td className="num">
                  {money2(S26.partDAddOn[t])} → {money2(S27.partDAddOn[t])}
                </td>
                <td className="num strong">{t === 0 ? "$0" : signed(yearlyPerPerson(S27, t) - yearlyPerPerson(S26, t), money2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
