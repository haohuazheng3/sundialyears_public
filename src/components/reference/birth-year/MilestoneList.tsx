import { Icon } from "@/components/ui/Icon";

export type MilestoneStatus = "done" | "now" | "ahead";

export interface Milestone {
  key: string;
  /** Calendar year used for ordering and the status. */
  year: number;
  /** What to print in the year column ("2027", "2025–26"). */
  when: string;
  /** "Age 62", "Age 66 and 10 months". */
  age: string;
  title: string;
  detail: React.ReactNode;
  status: MilestoneStatus;
}

const STATUS: Record<MilestoneStatus, { label: string; cls: string; icon: "check" | "clock" | "arrow" }> = {
  done: { label: "Done", cls: "pill-sage", icon: "check" },
  now: { label: "This year", cls: "pill-sun", icon: "clock" },
  ahead: { label: "Coming up", cls: "pill-sky", icon: "arrow" },
};

export const statusFor = (years: number[], refYear: number): MilestoneStatus =>
  years.includes(refYear) ? "now" : Math.max(...years) < refYear ? "done" : "ahead";

/** A vertical, chronological list of a birth year's milestones. Status is spelled out in text, not only color. */
export function BirthYearTimeline({ items, refYear }: { items: Milestone[]; refYear: number }) {
  return (
    <ol className="relative mt-6 space-y-0" aria-label={`Milestones, with their status as of ${refYear}`}>
      {items.map((m, i) => {
        const st = STATUS[m.status];
        const last = i === items.length - 1;
        return (
          <li key={m.key} className="relative grid grid-cols-[4.75rem_1fr] gap-4 pb-7 sm:grid-cols-[6rem_1fr]">
            {!last ? <span aria-hidden="true" className="absolute bottom-0 left-[2.3rem] top-10 w-px bg-[var(--hairline-2)] sm:left-[2.9rem]" /> : null}
            <div className="relative z-[1] flex flex-col items-center">
              <span
                className={`num grid min-h-[2.75rem] w-full place-items-center rounded-2xl px-1 text-center text-[1.05rem] font-bold leading-tight ${
                  m.status === "now" ? "bg-sun-wash text-sun-ink" : m.status === "done" ? "bg-sunk text-ink-3" : "bg-[var(--card)] text-ink shadow-[inset_0_0_0_1.5px_var(--hairline-2)]"
                }`}
              >
                {m.when}
              </span>
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.95rem] font-semibold text-ink-3">{m.age}</span>
                <span className={`pill ${st.cls} !py-0.5 text-[0.8rem]`}>
                  <Icon name={st.icon} size={13} strokeWidth={2.2} /> {st.label}
                </span>
              </div>
              <h3 className="mt-1 text-[1.2rem] font-semibold leading-snug text-ink">{m.title}</h3>
              <div className="mt-1.5 text-[1.0625rem] leading-relaxed text-ink-2">{m.detail}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
