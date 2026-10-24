"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { TAXED_ORDER, VERDICT_ORDER } from "@/data/states/types";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { TaxBadge, VerdictPill } from "./style";
import type { StateRow } from "./table-rows";

type FilterKey = "all" | "noTax" | "ssFree" | "ssTaxed" | "big";
type SortKey = "name" | "ss" | "pensions" | "ira" | "rate" | "verdict";

const FILTERS: { key: FilterKey; label: string; test: (r: StateRow) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "noTax", label: "No income tax", test: (r) => r.noTax },
  { key: "ssFree", label: "Doesn’t tax Social Security", test: (r) => r.ss === "no" },
  { key: "ssTaxed", label: "Taxes Social Security", test: (r) => r.ss !== "no" },
  { key: "big", label: "Big pension/IRA exclusions", test: (r) => r.big },
];

const COLUMNS: { key: SortKey; label: string; short: string }[] = [
  { key: "name", label: "State", short: "State" },
  { key: "ss", label: "Social Security", short: "Social Security" },
  { key: "pensions", label: "Pensions", short: "Pensions" },
  { key: "ira", label: "IRA / 401(k)", short: "IRA / 401(k)" },
  { key: "rate", label: "Top rate", short: "Top rate" },
  { key: "verdict", label: "Our rating", short: "Rating" },
];

const PHONE_PREVIEW = 8;

const taxedIdx = (t: StateRow["ss"]) => TAXED_ORDER.indexOf(t);

function compare(a: StateRow, b: StateRow, key: SortKey) {
  switch (key) {
    case "ss":
      return taxedIdx(a.ss) - taxedIdx(b.ss);
    case "pensions":
      return taxedIdx(a.pensions) - taxedIdx(b.pensions);
    case "ira":
      return taxedIdx(a.ira) - taxedIdx(b.ira);
    case "rate":
      return a.topRate - b.topRate;
    case "verdict":
      return VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict);
    default:
      return 0;
  }
}

/**
 * Interactive comparison of all 51 jurisdictions: filter chips, search and sortable columns.
 * Desktop: a real table with sortable headers. Phones and tablets: big tappable cards with a "Sort by" menu.
 */
export function StateTable({ rows }: { rows: StateRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  /** Phones: the unfiltered list starts collapsed so the page below stays reachable. */
  const [expanded, setExpanded] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const searchId = useId();
  const sortId = useId();

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])) as Record<FilterKey, number>, [rows]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter)!.test;
    const list = rows.filter((r) => test(r) && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase() === q));
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => compare(a, b, sort.key) * dir || a.name.localeCompare(b.name) * (sort.key === "name" ? dir : 1));
  }, [rows, filter, deferredQuery, sort]);

  const collapsed = !expanded && filter === "all" && !deferredQuery.trim();
  const phoneList = collapsed ? visible.slice(0, PHONE_PREVIEW) : visible;

  const chooseFilter = (key: FilterKey) => {
    setFilter(key);
    track("states_table_filter", { filter: key });
  };
  const chooseSort = (key: SortKey, dir?: "asc" | "desc") => {
    setSort((s) => ({ key, dir: dir ?? (s.key === key && s.dir === "asc" ? "desc" : "asc") }));
    track("states_table_sort", { key });
  };

  return (
    <div>
      {/* Filters */}
      <div role="group" aria-label="Filter states" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => chooseFilter(f.key)}
            className="btn btn-ghost !min-h-[3rem] !px-4 !text-[1rem]"
          >
            {f.label}
            <span className={`num rounded-full px-2 py-0.5 text-[0.85rem] ${filter === f.key ? "bg-[color-mix(in_oklab,var(--void)_22%,transparent)]" : "bg-sunk text-ink-3"}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + mobile sort */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div>
          <label htmlFor={searchId} className="field-label">
            Find a state
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <input
              id={searchId}
              type="search"
              inputMode="search"
              autoComplete="off"
              className="input !pl-12"
              placeholder="Type a name, e.g. Ohio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-end gap-2 lg:hidden">
          <div className="flex-1">
            <label htmlFor={sortId} className="field-label">
              Sort by
            </label>
            <select id={sortId} className="input" value={sort.key} onChange={(e) => chooseSort(e.target.value as SortKey, sort.dir)}>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost !min-h-[3.5rem] !px-4"
            onClick={() => chooseSort(sort.key, sort.dir === "asc" ? "desc" : "asc")}
            aria-label={sort.dir === "asc" ? "Sorted ascending; switch to descending" : "Sorted descending; switch to ascending"}
          >
            <Icon name="up" size={20} className={sort.dir === "asc" ? "" : "rotate-180"} />
          </button>
        </div>
        <p className="text-[1rem] text-ink-3 sm:col-span-2 lg:col-span-1 lg:text-right" aria-live="polite">
          Showing <span className="num font-bold text-ink">{visible.length}</span> of {rows.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="sunk mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-[1.0625rem] text-ink-2">No state matches “{query}” with this filter.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Show all states
          </button>
        </div>
      ) : null}

      {/* Desktop table */}
      {visible.length ? (
        <div className="mt-6 hidden lg:block">
          <table className="table-sy text-[1.0625rem]">
            <caption className="sr-only">State taxes on retirement income, 2026. Select a column heading to sort.</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="!p-0">
                      <button
                        type="button"
                        onClick={() => chooseSort(c.key)}
                        className={`flex min-h-[3rem] w-full items-center gap-1.5 px-[0.9rem] text-left uppercase tracking-[0.04em] hover:text-ink ${active ? "text-ink" : ""}`}
                      >
                        {c.short}
                        <Icon
                          name="chev"
                          size={16}
                          strokeWidth={2.4}
                          className={`transition-transform ${active ? (sort.dir === "asc" ? "rotate-180 opacity-100" : "opacity-100") : "opacity-30"}`}
                        />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.code} className="relative">
                  <td className="strong">
                    <Link
                      href={`/state-retirement-taxes/${r.slug}`}
                      className="flex min-h-[2.75rem] items-center gap-2 after:absolute after:inset-0 after:content-[''] hover:text-sun-ink focus-visible:outline-none focus-visible:after:rounded-[10px] focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-[var(--focus)]"
                    >
                      {r.name}
                      <span className="text-[0.85rem] font-semibold text-ink-3">{r.code}</span>
                    </Link>
                  </td>
                  <td>
                    <TaxBadge taxed={r.ss} />
                  </td>
                  <td>
                    <TaxBadge taxed={r.pensions} />
                  </td>
                  <td>
                    <TaxBadge taxed={r.ira} />
                  </td>
                  <td className="num whitespace-nowrap font-semibold text-ink">{r.rate}</td>
                  <td>
                    <VerdictPill label={r.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Phone cards */}
      {visible.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
          {phoneList.map((r) => (
            <li key={r.code}>
              <Link href={`/state-retirement-taxes/${r.slug}`} className="float-soft float-lift block p-4 active:scale-[0.99]">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[1.25rem] font-bold leading-tight text-ink">
                    {r.name} <span className="text-[0.9rem] font-semibold text-ink-3">{r.code}</span>
                  </span>
                  <Icon name="arrow" size={20} className="mt-1 shrink-0 text-sun-ink" />
                </span>
                <span className="mt-2 block">
                  <VerdictPill label={r.verdict} />
                </span>
                <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[0.9rem] text-ink-3">
                  <span className="flex flex-col items-start gap-1">
                    Social Security
                    <TaxBadge taxed={r.ss} />
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    Pensions
                    <TaxBadge taxed={r.pensions} />
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    IRA / 401(k)
                    <TaxBadge taxed={r.ira} />
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    Top rate
                    <span className="num text-[1.0625rem] font-bold text-ink">{r.rate}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {collapsed && visible.length > PHONE_PREVIEW ? (
        <div className="mt-4 lg:hidden">
          <button type="button" className="btn btn-ghost w-full" onClick={() => setExpanded(true)}>
            Show all {visible.length} (50 states and DC) <Icon name="chev" size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}