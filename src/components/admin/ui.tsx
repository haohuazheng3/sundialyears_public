import { Icon, type AnyIcon } from "@/components/ui/Icon";

/** Admin panel: a floating card with an anchored H2 and an optional action area (buttons) on the right. */
export function Panel({
  id,
  title,
  icon,
  meta,
  action,
  children,
}: {
  id: string;
  title: string;
  icon: AnyIcon;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="float scroll-mt-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="float-soft grid h-9 w-9 place-items-center text-sun-ink">
            <Icon name={icon} size={18} />
          </span>
          <h2 id={`${id}-h`} className="text-[1.45rem] font-semibold">
            {title}
          </h2>
          {meta}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="sunk px-4 py-5 text-[1rem] text-ink-3">{children}</p>;
}

/** `logged` = the failure was written to the error inbox (false when there is no database to write it to). */
export function LoadError({ what, error, logged = true }: { what: string; error: string; logged?: boolean }) {
  return (
    <div role="alert" className="flex gap-3 rounded-[var(--r-lg)] bg-ember-wash p-4 text-ember">
      <Icon name="warn" size={20} className="mt-0.5 shrink-0" />
      <p className="text-[1rem] text-ink-2">
        <strong className="text-ember">Couldn’t load {what}.</strong> {error}
        {logged ? " (logged to the error inbox)" : null}
      </p>
    </div>
  );
}

const TONE = {
  good: "pill-sage",
  bad: "pill-ember",
  warn: "pill-sun",
  info: "pill-sky",
  neutral: "",
} as const;
export type Tone = keyof typeof TONE;

/** Status pill: always text + icon, never color alone. */
export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const icon: AnyIcon = tone === "good" ? "check" : tone === "bad" ? "warn" : "info";
  return (
    <span className={`pill ${TONE[tone]}`}>
      <Icon name={icon} size={14} strokeWidth={2.2} />
      {children}
    </span>
  );
}

/** Horizontally scrollable table wrapper (site table style). */
export function AdminTable({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="-mx-1 overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="table-sy text-[0.98rem]">{children}</table>
    </div>
  );
}
