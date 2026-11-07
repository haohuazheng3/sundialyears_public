import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { MONTHS, MONTHS_SHORT, money } from "@/lib/format";
import type { MonthRow, MonthStatus } from "@/lib/calc/earnings-test";

const META: Record<MonthStatus, { label: string; icon: AnyIcon; cls: string }> = {
  withheld: { label: "Withheld", icon: "close", cls: "bg-ember-wash text-ember" },
  partial: { label: "Held, part paid later", icon: "clock", cls: "bg-sun-wash text-sun-ink" },
  paid: { label: "Paid", icon: "check", cls: "bg-sage-wash text-sage" },
  "retired-month": { label: "Retired month: paid", icon: "check", cls: "bg-sage-wash text-sage" },
  "at-fra": { label: "Full retirement age: no limit", icon: "shield", cls: "bg-sky-wash text-sky" },
  "not-entitled": { label: "Not collecting", icon: "info", cls: "bg-sunk text-ink-3" },
};

/**
 * January–December at a glance: which checks SSA holds back, which arrive, and which month is only partly repaid.
 * Every cell carries a text label and an icon, so color is never the only signal.
 */
export function MonthGrid({ year, months }: { year: number; months: MonthRow[] }) {
  return (
    <div>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={`Your ${year} Social Security checks, month by month`}>
        {months.map((r) => {
          const meta = META[r.status];
          const amount =
            r.status === "not-entitled"
              ? "—"
              : r.status === "withheld"
                ? "$0"
                : r.status === "partial"
                  ? `${money(r.paidLater)} later`
                  : money(r.paidOnTime);
          const sr =
            r.status === "partial"
              ? `${MONTHS[r.month - 1]}: check held; ${money(r.withheld)} kept and ${money(r.paidLater)} paid after the year ends`
              : r.status === "withheld"
                ? `${MONTHS[r.month - 1]}: check of ${money(r.benefit)} withheld`
                : `${MONTHS[r.month - 1]}: ${meta.label}${r.status === "not-entitled" ? "" : `, ${money(r.paidOnTime)}`}`;
          return (
            <li key={r.month} className={`rounded-[var(--r-md)] p-3 ${meta.cls}`}>
              <span className="sr-only">{sr}</span>
              <span aria-hidden="true" className="block">
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[1rem] font-bold text-ink">{MONTHS_SHORT[r.month - 1]}</span>
                  <Icon name={meta.icon} size={17} strokeWidth={2.2} />
                </span>
                <span className="num mt-1 block text-[1.05rem] font-bold text-ink">{amount}</span>
                <span className="mt-0.5 block text-[0.875rem] font-semibold leading-snug">{meta.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
