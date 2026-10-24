/**
 * "On this page" jump list for the long trust pages. Plain anchor links (keyboard and screen-reader friendly);
 * each target H2 carries the matching id and `scroll-mt-28` so it isn't hidden under the sticky header.
 */
export function OnThisPage({ items, title = "On this page" }: { items: { id: string; label: string }[]; title?: string }) {
  return (
    <nav aria-label={title} className="sunk p-5 sm:p-6">
      <p className="eyebrow mt-0">{title}</p>
      <ol className="mt-3 grid list-none gap-x-8 gap-y-1 pl-0 text-[1.0625rem] sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.id} className="mt-0 flex items-center gap-2">
            <span aria-hidden="true" className="num w-6 shrink-0 text-ink-3">
              {i + 1}.
            </span>
            <a href={`#${it.id}`} className="link flex min-h-11 items-center leading-snug">
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
