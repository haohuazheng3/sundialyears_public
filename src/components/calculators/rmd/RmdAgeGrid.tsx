import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AGE_PAGES, AGE_PAGE_MIN, AGE_PAGE_MAX, UNIFORM_MIN_AGE, UNIFORM_MAX_AGE, ageHref, factorAt, fmtFactor, fmtPct, shareAt } from "./RmdAgeData";

/** Grid linking every /rmd/age-N page (73–105), each tile showing the share you must withdraw at that age. */
export function RmdAgeGrid({ current }: { current?: number }) {
  return (
    <nav aria-label="RMD by age">
      <ul className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-6 lg:grid-cols-11">
        {AGE_PAGES.map((a) => {
          const here = a === current;
          return (
            <li key={a}>
              <Link
                href={ageHref(a)}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-[3.5rem] flex-col items-center justify-center rounded-[var(--r-md)] px-2 py-2 text-center transition-colors ${
                  here ? "bg-[var(--ink)] text-[var(--void)]" : "sunk text-ink hover:bg-[var(--card)]"
                }`}
              >
                <span className="text-[1.15rem] font-bold leading-tight">
                  <span className="sr-only">Age </span>
                  {a}
                </span>
                <span className={`num text-[0.85rem] leading-tight ${here ? "" : "text-ink-3"}`}>{fmtPct(shareAt(a))}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Previous / next age links with each age's factor. Past the ends it points to the full table. */
export function RmdAgePrevNext({ age }: { age: number }) {
  const prev = age > AGE_PAGE_MIN ? age - 1 : null;
  const next = age < AGE_PAGE_MAX ? age + 1 : null;
  return (
    <nav aria-label="Previous and next age" className="grid gap-3 sm:grid-cols-2">
      {prev != null ? (
        <Link href={ageHref(prev)} className="float-soft float-lift group flex min-h-[4.5rem] items-center gap-3 p-4">
          <Icon name="arrow" size={20} className="shrink-0 rotate-180 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">RMD at age {prev}</span>
            <span className="num block text-[0.95rem] text-ink-3">
              Factor {fmtFactor(factorAt(prev))} · {fmtPct(shareAt(prev))} of the balance
            </span>
          </span>
        </Link>
      ) : (
        <Link href="/rmd-table#table" className="float-soft float-lift group flex min-h-[4.5rem] items-center gap-3 p-4">
          <Icon name="table" size={20} className="shrink-0 text-sun-ink" />
          <span>
            <span className="block font-bold text-ink">Every age from {UNIFORM_MIN_AGE} to {UNIFORM_MAX_AGE}</span>
            <span className="block text-[0.95rem] text-ink-3">The full IRS Uniform Lifetime Table</span>
          </span>
        </Link>
      )}
      {next != null ? (
        <Link href={ageHref(next)} className="float-soft float-lift group flex min-h-[4.5rem] items-center justify-end gap-3 p-4 text-right">
          <span>
            <span className="block font-bold text-ink">RMD at age {next}</span>
            <span className="num block text-[0.95rem] text-ink-3">
              Factor {fmtFactor(factorAt(next))} · {fmtPct(shareAt(next))} of the balance
            </span>
          </span>
          <Icon name="arrow" size={20} className="shrink-0 text-sun-ink" />
        </Link>
      ) : (
        <Link href="/rmd-table#table" className="float-soft float-lift group flex min-h-[4.5rem] items-center justify-end gap-3 p-4 text-right">
          <span>
            <span className="block font-bold text-ink">Ages {AGE_PAGE_MAX + 1} and older</span>
            <span className="block text-[0.95rem] text-ink-3">See them in the full table</span>
          </span>
          <Icon name="arrow" size={20} className="shrink-0 text-sun-ink" />
        </Link>
      )}
    </nav>
  );
}
