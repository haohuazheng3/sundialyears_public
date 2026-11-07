import { Icon } from "@/components/ui/Icon";
import { longDate } from "@/lib/format";
import { ALL_SOURCES, sourcesByAgency } from "./source-registry";

/** Every primary source the federal calculators cite, grouped by the agency that publishes it (methodology page). */
export function SourceDirectory({ id = "all-sources" }: { id?: string }) {
  const groups = sourcesByAgency();
  return (
    <section aria-labelledby={`${id}-h`} id={id} className="float scroll-mt-28 p-6 sm:p-10">
      <h2 id={`${id}-h`} className="flex items-center gap-2 text-[1.75rem] font-semibold leading-tight">
        <Icon name="source" size={24} className="text-sun-ink" /> Every federal source we use, by agency
      </h2>
      <p className="mt-2 max-w-3xl text-[1.0625rem] leading-relaxed text-ink-2">
        {ALL_SOURCES.length} official documents from {groups.length} publishers. Each calculator and reference page lists the ones it relies on at
        the bottom of the page; each state tax page lists its own state’s sources.
      </p>
      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <div key={g.publisher}>
            <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[1.3rem] font-semibold text-ink">
              {g.name}
              <span className="text-[0.95rem] font-normal text-ink-3">
                {g.sources.length} {g.sources.length === 1 ? "document" : "documents"}
              </span>
            </h3>
            <p className="mt-1 text-[1rem] leading-relaxed text-ink-3">{g.what}</p>
            <ul className="mt-3 space-y-2.5">
              {g.sources.map((s) => (
                <li key={s.url} className="flex gap-3">
                  <Icon name="link" size={16} className="mt-1.5 shrink-0 text-ink-3" />
                  <div className="min-w-0">
                    <a href={s.url} target="_blank" rel="noopener" className="link break-words text-[1.0625rem]">
                      {s.label}
                    </a>
                    {s.published ? <span className="ml-2 text-[0.9375rem] text-ink-3">· published {longDate(s.published)}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
