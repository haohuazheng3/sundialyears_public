import Link from "next/link";
import { money } from "@/lib/format";
import { SS_AGES } from "@/data/params/birth-year-extra";
import { LONGEVITY_AGES } from "./longevity-ages";
import {
  BIRTH_YEARS,
  type BirthYearProfile,
  birthYearProfile,
  type ColaRow,
  CLAIM_AGES,
  rmdAgeLabel,
  claimingRows,
  drcPerYearLabel,
  fraChartRows,
  monthRange,
  monthShort,
  pct1,
  survivorRows,
} from "./timeline";
import type { CohortLife } from "./cohort-life";
import { shortRange } from "./basics";
import { PERIOD_LIFE_TABLE_YEAR } from "@/data/generated/period-life-table";

/** Scroll wrapper so wide tables never push the page sideways on a phone. */
function Scroll({ children, minWidth }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="not-prose -mx-2 overflow-x-auto px-2" tabIndex={0} role="region" aria-label="Scrollable table">
      <div style={minWidth ? { minWidth } : undefined}>{children}</div>
    </div>
  );
}

const yearCell = (label: string, href?: string) =>
  href ? (
    <Link className="link" href={href}>
      {label}
    </Link>
  ) : (
    label
  );

/** Full retirement age chart, 1937 or earlier → 1960 or later (20 CFR 404.409(a); POMS RS 00615.692 for credits). */
export function FraChartTable() {
  const rows = fraChartRows();
  return (
    <>
      <Scroll minWidth="40rem">
        <table className="table-sy mt-4 text-[1rem]">
          <caption className="sr-only">Social Security full retirement age by year of birth, with the benefit at 62 and 70</caption>
          <thead>
            <tr>
              <th scope="col">Year of birth</th>
              <th scope="col">Full retirement age</th>
              <th scope="col">Months early at {SS_AGES.value.earliestRetirement}</th>
              <th scope="col">Benefit at {SS_AGES.value.earliestRetirement}</th>
              <th scope="col">Delayed credit per year</th>
              <th scope="col">Benefit at {SS_AGES.value.drcStops}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label}>
                <td className="strong">{yearCell(r.label, r.href)}</td>
                <td className="strong">{r.fra.label}</td>
                <td>{r.monthsEarlyAt62}</td>
                <td>{pct1(r.pctAt62)}</td>
                <td>
                  {pct1(r.drcPerYear)}
                  {i === 0 ? <sup aria-label="see note">*</sup> : null}
                </td>
                <td>
                  {pct1(r.pctAt70)}
                  {i === 0 ? <sup aria-label="see note">*</sup> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      <p className="text-[0.95rem] text-ink-3">
        * Delayed credits for the first row are those for 1937. Earlier birth years earned less: {drcPerYearLabel(1935)} a year for 1935–36 and{" "}
        {drcPerYearLabel(1933)} for 1933–34. Born on January 1? Use the row for the year before.
      </p>
    </>
  );
}

/** Benefit as % of the full benefit at each claiming age 62–70 (same groups as SSA OACT ar_drc.html). */
export function ClaimingTable() {
  const rows = claimingRows();
  return (
    <Scroll minWidth="46rem">
      <table className="table-sy mt-4 text-[0.98rem]">
        <caption className="sr-only">Social Security benefit as a percentage of the full benefit, by claiming age and year of birth</caption>
        <thead>
          <tr>
            <th scope="col">Born</th>
            {CLAIM_AGES.map((a) => (
              <th scope="col" key={a}>
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="strong whitespace-nowrap">{yearCell(r.label, r.href)}</td>
              {r.pcts.map((x, i) => (
                <td key={CLAIM_AGES[i]} className={Math.abs(x - 1) < 1e-9 ? "strong" : undefined}>
                  {pct1(x)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

/** Survivor full retirement age by the survivor's birth year (20 CFR 404.409(b); POMS RS 00615.301). */
export function SurvivorTable() {
  const rows = survivorRows();
  return (
    <Scroll minWidth="30rem">
      <table className="table-sy mt-4 text-[1rem]">
        <caption className="sr-only">Survivor (widow or widower) full retirement age by year of birth</caption>
        <thead>
          <tr>
            <th scope="col">Survivor born</th>
            <th scope="col">Survivor full retirement age</th>
            <th scope="col">Months of reduction from {SS_AGES.value.earliestSurvivor}</th>
            <th scope="col">Benefit at {SS_AGES.value.earliestSurvivor}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="strong">{yearCell(r.label, r.href)}</td>
              <td className="strong">{r.fra.label}</td>
              <td>{r.monthsFrom60}</td>
              <td>{pct1(r.pctAt60)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

/** Key months for each birthday month of one year. */
export function BirthMonthTable({ p }: { p: BirthYearProfile }) {
  return (
    <>
      <Scroll minWidth="42rem">
        <table className="table-sy mt-4 text-[0.98rem]">
          <caption className="sr-only">Key Social Security and Medicare months for people born in {p.year}, by birthday month</caption>
          <thead>
            <tr>
              <th scope="col">Birthday in</th>
              <th scope="col">First month you can claim</th>
              <th scope="col">Full retirement age reached</th>
              <th scope="col">Medicare sign-up window</th>
              <th scope="col">Age {SS_AGES.value.drcStops}</th>
            </tr>
          </thead>
          <tbody>
            {p.months.map((r) => (
              <tr key={r.month} className={r.fraYear === p.refYear ? "is-hit" : undefined}>
                <td className="strong">{r.monthName}</td>
                <td>{monthShort(r.earliestClaim)}</td>
                <td className="strong">
                  {monthShort(r.fraMonth)}
                  {r.fraYear === p.refYear ? (
                    <>
                      <span aria-hidden="true"> •</span>
                      <span className="sr-only"> (this year)</span>
                    </>
                  ) : null}
                </td>
                <td>{monthRange(r.iepStart, r.iepEnd)}</td>
                <td>{monthShort(r.age70)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      <p className="text-[0.95rem] text-ink-3">
        For birthdays on the 3rd through the end of the month.{" "}
        {p.months.some((r) => r.fraYear === p.refYear) ? `Rows marked • reach full retirement age in ${p.refYear}. ` : ""}
        Born on the 2nd: you can claim one month sooner. Born on the 1st: every date moves one month earlier.
      </p>
    </>
  );
}

/** Benefit at each claiming age for one cohort, with the full-retirement-age row in place. */
export function ClaimAgeTable({ p }: { p: BirthYearProfile }) {
  const rows: { key: string; label: string; pct: number; isFra: boolean }[] = CLAIM_AGES.map((a, i) => ({
    key: String(a),
    label: `${a}`,
    pct: p.pcts[i],
    isFra: a * 12 === p.fra.total,
  }));
  if (p.fra.months) {
    const at = rows.findIndex((r) => Number(r.key) * 12 > p.fra.total);
    rows.splice(at, 0, { key: "fra", label: p.fra.label, pct: 1, isFra: true });
  }
  return (
    <Scroll minWidth="30rem">
      <table className="table-sy mt-4 text-[1rem]">
        <caption className="sr-only">Social Security benefit by claiming age for people born in {p.year}</caption>
        <thead>
          <tr>
            <th scope="col">Start benefits at</th>
            <th scope="col">% of full benefit</th>
            <th scope="col">Each $1,000 becomes</th>
            <th scope="col">Change for life</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.isFra ? "is-hit" : undefined}>
              <td className="strong">
                {r.label}
                {r.isFra ? <span className="ml-2 text-[0.9rem] font-normal text-ink-3">(full retirement age)</span> : null}
              </td>
              <td className="strong">{pct1(r.pct)}</td>
              <td>{money(1000 * r.pct)}</td>
              <td>{Math.abs(r.pct - 1) < 1e-9 ? "—" : `${r.pct > 1 ? "+" : "−"}${pct1(Math.abs(r.pct - 1))}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

/** COLAs credited since the age-62 year, as compact tiles. */
export function ColaGrid({ rows }: { rows: ColaRow[] }) {
  return (
    <ul className="not-prose mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5" aria-label="Cost-of-living adjustments since age 62">
      {rows.map((r) => (
        <li key={r.effectiveDec} className="sunk px-3 py-2.5">
          <span className="block text-[0.9rem] text-ink-3">Paid from Jan {r.paidJan}</span>
          <span className="num block text-[1.2rem] font-bold text-ink">{r.pct === 0 ? "None" : `${r.pct.toFixed(1)}%`}</span>
        </li>
      ))}
    </ul>
  );
}

const yrs = (x: number) => `${x.toFixed(1)} years`;
const age = (base: number, e: number) => `about ${Math.round(base + e)}`;

/** Cohort (and period, for contrast) life expectancy for one birth year. */
export function LifeTable({ life, p }: { life: { male: CohortLife; female: CohortLife }; p: BirthYearProfile }) {
  const { earliestRetirement } = SS_AGES.value;
  const { from: AGE_65, targets } = LONGEVITY_AGES;
  const m = life.male;
  const f = life.female;
  return (
    <Scroll minWidth="32rem">
      <table className="table-sy mt-4 text-[1rem]">
        <caption className="sr-only">Life expectancy for people born in {p.year} (SSA cohort life tables, 2026 Trustees Report)</caption>
        <thead>
          <tr>
            <th scope="col">Born in {p.year}</th>
            <th scope="col">Men</th>
            <th scope="col">Women</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="strong">Years left at {earliestRetirement}</td>
            <td>
              {yrs(m.e62)} <span className="text-ink-3">(to {age(earliestRetirement, m.e62)})</span>
            </td>
            <td>
              {yrs(f.e62)} <span className="text-ink-3">(to {age(earliestRetirement, f.e62)})</span>
            </td>
          </tr>
          <tr>
            <td className="strong">Years left at {AGE_65}</td>
            <td>
              {yrs(m.e65)} <span className="text-ink-3">(to {age(AGE_65, m.e65)})</span>
            </td>
            <td>
              {yrs(f.e65)} <span className="text-ink-3">(to {age(AGE_65, f.e65)})</span>
            </td>
          </tr>
          {m.eNow !== null && f.eNow !== null && m.ageNow !== earliestRetirement && m.ageNow !== AGE_65 ? (
            <tr className="is-hit">
              <td className="strong">
                Years left at {m.ageNow} (your age in {p.refYear})
              </td>
              <td>
                {yrs(m.eNow)} <span className="text-ink-3">(to {age(m.ageNow, m.eNow)})</span>
              </td>
              <td>
                {yrs(f.eNow)} <span className="text-ink-3">(to {age(f.ageNow, f.eNow)})</span>
              </td>
            </tr>
          ) : null}
          <tr>
            <td className="strong">
              Chance a {AGE_65}-year-old reaches {targets[0]}
            </td>
            <td>{pct1(m.p85from65)}</td>
            <td>{pct1(f.p85from65)}</td>
          </tr>
          <tr>
            <td className="strong">
              Chance a {AGE_65}-year-old reaches {targets[1]}
            </td>
            <td>{pct1(m.p90from65)}</td>
            <td>{pct1(f.p90from65)}</td>
          </tr>
          <tr>
            <td className="strong">
              For contrast: {PERIOD_LIFE_TABLE_YEAR} period table at {earliestRetirement}
            </td>
            <td>{yrs(p.period62.male)}</td>
            <td>{yrs(p.period62.female)}</td>
          </tr>
          <tr>
            <td className="strong">
              For contrast: {PERIOD_LIFE_TABLE_YEAR} period table at {AGE_65}
            </td>
            <td>{yrs(p.period65.male)}</td>
            <td>{yrs(p.period65.female)}</td>
          </tr>
        </tbody>
      </table>
    </Scroll>
  );
}

/** One row per birth year 1943–1975 for the hub: the five dates people look up most. */
export function SummaryTable({ refYear }: { refYear: number }) {
  const rows = BIRTH_YEARS.map((y) => birthYearProfile(y, refYear));
  const mark = (ys: number[], text: string) =>
    ys.includes(refYear) ? (
      <strong className="text-ink">
        {text}
        <span className="sr-only"> (in {refYear})</span>
        <span aria-hidden="true"> •</span>
      </strong>
    ) : (
      text
    );
  return (
    <>
      <Scroll minWidth="44rem">
        <table className="table-sy mt-4 text-[0.98rem]">
          <caption className="sr-only">Social Security, Medicare and RMD milestones by birth year, 1943 to 1975</caption>
          <thead>
            <tr>
              <th scope="col">Born</th>
              <th scope="col">Full retirement age</th>
              <th scope="col">Turns {SS_AGES.value.earliestRetirement}</th>
              <th scope="col">Medicare</th>
              <th scope="col">Full benefit</th>
              <th scope="col">Turns {SS_AGES.value.drcStops}</th>
              <th scope="col">First RMD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const fraYs = p.fraYears.map((g) => g.year);
              const rmdYs = [...new Set(p.rmd.map((g) => g.firstYear))];
              const rmdAges = [...new Set(p.rmd.map((g) => g.age))].map(rmdAgeLabel).join("/");
              return (
                <tr key={p.year}>
                  <td className="strong">
                    <Link className="link" href={`/social-security-by-birth-year/${p.year}`} prefetch={false}>
                      {p.year}
                    </Link>
                  </td>
                  <td>{p.fra.label}</td>
                  <td>{mark([p.age62Year], String(p.age62Year))}</td>
                  <td>{mark([p.age65Year], String(p.age65Year))}</td>
                  <td>{mark(fraYs, shortRange(fraYs))}</td>
                  <td>{mark([p.age70Year], String(p.age70Year))}</td>
                  <td>
                    {mark(rmdYs, shortRange(rmdYs))} <span className="text-ink-3">(age {rmdAges})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroll>
      <p className="text-[0.95rem] text-ink-3">
        Bold with a dot (•) = happens in {refYear}. Year ranges mean it depends on your birth month. Born on January 1? Use the row above yours for Social Security.
      </p>
    </>
  );
}
