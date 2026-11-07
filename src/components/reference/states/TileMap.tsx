import Link from "next/link";
import { STATES, TILE_GRID, TILE_COLS, TILE_ROWS, VERDICT_ORDER, SUMMARY } from "@/data/states";
import { VERDICT_STYLE } from "./style";

/**
 * Classic 8×12 square-tile US map. Each tile is a link to the state's page, colored by verdict.
 * Tiles are in reading order (row by row) so keyboard tabbing moves west→east, north→south.
 */
export function TileMap({ className = "" }: { className?: string }) {
  const tiles = [...STATES].sort((a, b) => {
    const [ra, ca] = TILE_GRID[a.code];
    const [rb, cb] = TILE_GRID[b.code];
    return ra - rb || ca - cb;
  });
  return (
    <figure className={className}>
      <ul
        aria-label="Map of states colored by how they tax retirement income"
        className="grid gap-[3px] sm:gap-1.5"
        style={{ gridTemplateColumns: `repeat(${TILE_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${TILE_ROWS}, auto)` }}
      >
        {tiles.map((s) => {
          const [r, c] = TILE_GRID[s.code];
          const st = VERDICT_STYLE[s.verdict.label];
          return (
            <li key={s.code} style={{ gridRow: r + 1, gridColumn: c + 1 }} className="list-none">
              <Link
                href={`/state-retirement-taxes/${s.slug}`}
                aria-label={`${s.name}: ${s.verdict.label}`}
                title={`${s.name}: ${s.verdict.label}`}
                className="grid aspect-square w-full place-items-center rounded-[22%] text-[0.66rem] font-bold leading-none tracking-wide transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] focus-visible:z-10 sm:text-[0.95rem] lg:text-[1.05rem]"
                style={{ background: st.bg, color: st.fg, boxShadow: "inset 0 0 0 1px var(--hairline)" }}
              >
                {s.code}
              </Link>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-5">
        <span className="sr-only">Legend: </span>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[0.95rem] text-ink-2">
          {VERDICT_ORDER.map((v) => (
            <li key={v} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-4 w-4 rounded-[5px]" style={{ background: VERDICT_STYLE[v].bg, boxShadow: "inset 0 0 0 1px var(--hairline-2)" }} />
              <span>
                {v} <span className="num text-ink-3">({SUMMARY.byVerdict[v].length})</span>
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
