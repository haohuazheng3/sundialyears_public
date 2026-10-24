import type { Source } from "@/data/params/types";
import { Icon } from "@/components/ui/Icon";
import { longDate } from "@/lib/format";

/** Every page ends with its primary sources — agencies, not blogs. */
export function SourceList({ sources, title = "Sources" }: { sources: Source[]; title?: string }) {
  const unique = sources.filter((s, i) => sources.findIndex((x) => x.url === s.url) === i);
  return (
    <section aria-labelledby="sources-h" className="float p-6 sm:p-8">
      <h2 id="sources-h" className="flex items-center gap-2 text-[1.5rem] font-semibold">
        <Icon name="source" size={22} className="text-sun-ink" /> {title}
      </h2>
      <p className="mt-1 text-[1rem] text-ink-3">Primary sources only. We re-check them whenever an agency publishes new figures.</p>
      <ol className="mt-5 space-y-3">
        {unique.map((s) => (
          <li key={s.url} className="flex gap-3">
            <span className="pill mt-0.5 shrink-0 !px-2 !py-0.5 text-[0.75rem]">{s.publisher}</span>
            <div className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener" className="link break-words text-[1rem]">
                {s.label}
              </a>
              {s.published ? <span className="ml-2 text-[0.9rem] text-ink-3">· published {longDate(s.published)}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
