import Link from "next/link";
import { toolBySlug } from "@/lib/tools";
import { Icon } from "@/components/ui/Icon";

/** "Where people usually go next" — keeps the journey going instead of bouncing back to Google. */
export function RelatedTools({ slugs, title = "Where people go next" }: { slugs: string[]; title?: string }) {
  const tools = slugs.map(toolBySlug).filter((t): t is NonNullable<typeof t> => Boolean(t));
  if (!tools.length) return null;
  return (
    <section aria-labelledby="next-h">
      <h2 id="next-h" className="px-1 text-[1.75rem] font-semibold">
        {title}
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.slug} href={`/${t.slug}`} prefetch className="float float-lift group flex flex-col p-6">
            <span className="float-soft grid h-11 w-11 place-items-center text-sun-ink">
              <Icon name={t.icon} size={21} />
            </span>
            <span className="mt-4 text-[1.2rem] font-bold leading-snug text-ink">{t.title}</span>
            <span className="mt-2 flex-1 text-[1rem] leading-relaxed text-ink-2">{t.blurb}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 font-bold text-sun-ink">
              Open <Icon name="arrow" size={18} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
