import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { SITE } from "@/lib/site";
import { longDate } from "@/lib/format";

/** Top of every tool/reference page: breadcrumb, H1, and an answer-first lead paragraph. */
export function ToolHero({
  crumbs,
  eyebrow,
  icon,
  title,
  lead,
  chips,
}: {
  crumbs: { name: string; path: string }[];
  eyebrow: string;
  icon?: AnyIcon;
  title: React.ReactNode;
  lead: React.ReactNode;
  chips?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1180px] px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 flex items-center gap-2.5">
        {icon ? (
          <span className="float-soft grid h-10 w-10 place-items-center text-sun-ink">
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <p className="eyebrow">{eyebrow}</p>
      </div>
      <h1 className="mt-4 max-w-4xl text-[2.35rem] font-semibold leading-[1.08] sm:text-[3.4rem]">{title}</h1>
      <div className="mt-5 max-w-3xl text-[1.1875rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">{lead}</div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {chips}
        <span className="pill" title="Every number on this page was re-checked against SSA, CMS and IRS publications on this date.">
          <Icon name="check" size={15} strokeWidth={2.2} /> Verified {longDate(SITE.dataVerifiedOn)}
        </span>
      </div>
    </section>
  );
}
