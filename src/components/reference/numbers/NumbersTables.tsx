import Link from "next/link";
import { StatusChip } from "@/components/tool/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { changeOf, formatCell, pendingItems, type Cell, type NumberGroup, type NumberRow } from "./numbers-data";

/**
 * 2026 vs 2027 tables. A real <table> on tablets and desktops; below 640px each row restacks into a card
 * (label on top, then 2026 / 2027 / change) so a phone never scrolls sideways. Explicit ARIA roles keep the
 * table semantics for screen readers after the CSS display change.
 */
function Value({ cell }: { cell: Cell }) {
  const f = formatCell(cell);
  // A missing 2027 value is shown by its "Not announced yet" status chip alone (no duplicate text).
  if (cell.t === "pending") return null;
  return (
    <>
      <span className="num font-bold text-ink">{f.value}</span>
      {f.per ? <span className="block text-[0.875rem] text-ink-3">{f.per}</span> : null}
    </>
  );
}

const mobileLabel =
  "max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-[0.75rem] max-sm:before:font-bold max-sm:before:uppercase max-sm:before:tracking-[0.06em] max-sm:before:text-ink-3 max-sm:before:content-[attr(data-label)]";

function Row({ row }: { row: NumberRow }) {
  const ch = changeOf(row.y2026, row.y2027, row.changeNote);
  return (
    <tr role="row" id={`n-${row.id}`} className="group max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4 max-sm:gap-y-3 max-sm:border-b max-sm:border-[var(--hairline)] max-sm:py-4 max-sm:last:border-b-0">
      <th
        role="rowheader"
        scope="row"
        className="!static text-left align-top !normal-case !tracking-normal !border-[var(--hairline)] sm:w-[44%] sm:group-last:!border-b-0 sm:group-hover:bg-[color-mix(in_oklab,var(--card-sunk)_70%,transparent)] max-sm:col-span-2 max-sm:!border-0 max-sm:!bg-transparent max-sm:!p-0"
      >
        <span className="block text-[1.0625rem] font-bold leading-snug text-ink">
          {row.href ? (
            <Link href={row.href} className="link !text-ink">
              {row.label}
            </Link>
          ) : (
            row.label
          )}
        </span>
        {row.detail ? <span className="mt-1 block text-[0.95rem] font-normal leading-snug text-ink-3">{row.detail}</span> : null}
        <a
          href={row.source.url}
          target="_blank"
          rel="noopener"
          className="mt-1.5 inline-flex items-center gap-1 text-[0.875rem] font-semibold text-sun-ink underline decoration-[color-mix(in_oklab,var(--sun)_45%,transparent)] underline-offset-2"
          aria-label={`Source for ${row.label}: ${row.source.label} (opens in a new tab)`}
        >
          <Icon name="source" size={14} /> {row.source.publisher}
        </a>
      </th>
      <td role="cell" data-label="2026" className={`align-top max-sm:!border-0 max-sm:!p-0 ${mobileLabel}`}>
        <Value cell={row.y2026} />
      </td>
      <td role="cell" data-label="2027" className={`align-top max-sm:!border-0 max-sm:!p-0 ${mobileLabel}`}>
        <Value cell={row.y2027} />
        {row.status !== "official" ? (
          <span className={row.y2027.t === "pending" ? "block" : "mt-1.5 block"}>
            <StatusChip status={row.status} />
          </span>
        ) : null}
      </td>
      <td role="cell" data-label="Change" className={`align-top max-sm:col-span-2 max-sm:!border-0 max-sm:!p-0 ${mobileLabel}`}>
        <span className={`inline-flex items-start gap-1.5 text-[0.98rem] ${ch.direction === "same" || ch.direction === "pending" ? "text-ink-3" : "font-semibold text-ink-2"}`}>
          {ch.direction === "up" ? <Icon name="up" size={16} className="mt-1 shrink-0 text-sun-ink" /> : null}
          {ch.direction === "down" ? <Icon name="up" size={16} className="mt-1 shrink-0 rotate-180 text-sky" /> : null}
          {ch.direction === "pending" ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">Not known yet</span>
            </>
          ) : (
            <span className="num">{ch.text}</span>
          )}
        </span>
      </td>
    </tr>
  );
}

export function NumbersGroupTable({ group }: { group: NumberGroup }) {
  const hId = `${group.id}-h`;
  return (
    <section id={group.id} aria-labelledby={hId} className="float scroll-mt-28 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="float-soft grid h-10 w-10 shrink-0 place-items-center text-sun-ink">
          <Icon name={group.icon} size={20} />
        </span>
        <div>
          <h2 id={hId} className="text-[1.6rem] font-semibold leading-tight">
            {group.title} in 2027
          </h2>
          <p className="mt-1 text-[1.0625rem] text-ink-2">{group.blurb}</p>
        </div>
      </div>
      <div className="mt-5">
        <table role="table" className="table-sy text-[1rem] max-sm:block">
          <caption className="sr-only">
            {group.title}: 2026 and 2027 values, change, status and source
          </caption>
          <thead role="rowgroup" className="max-sm:sr-only">
            <tr role="row">
              <th role="columnheader" scope="col">
                Number
              </th>
              <th role="columnheader" scope="col">
                2026
              </th>
              <th role="columnheader" scope="col">
                2027
              </th>
              <th role="columnheader" scope="col">
                Change
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="max-sm:block">
            {group.rows.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Jump links to each group. */
export function NumbersJumpNav({ groups }: { groups: NumberGroup[] }) {
  return (
    <nav aria-label="Jump to a section" className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <a key={g.id} href={`#${g.id}`} className="btn btn-ghost">
          <Icon name={g.icon} size={18} /> {g.title}
        </a>
      ))}
    </nav>
  );
}

/** What the agencies still haven’t published (deduplicated; see pendingItems in numbers-data). */
const PENDING = pendingItems();

export function StillWaiting() {
  return (
    <section aria-labelledby="waiting-h" className="float-soft p-5 sm:p-7">
      <h2 id="waiting-h" className="flex items-center gap-2 text-[1.45rem] font-semibold">
        <Icon name="clock" size={22} className="text-sun-ink" /> Still waiting on
      </h2>
      <p className="mt-1 text-[1.0625rem] text-ink-2">These 2027 figures aren’t final yet. We update this page the day each one is published.</p>
      <ul className="mt-4 space-y-3">
        {PENDING.map((p) => (
          <li key={p.item} className="sunk flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="font-bold text-ink">{p.item}</span>
            <span className="flex items-center gap-2 text-[0.98rem] text-ink-2">
              <Icon name="calendar" size={17} className="shrink-0 text-ink-3" /> Expected: {p.expected}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
