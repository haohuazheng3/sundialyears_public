import type { Status } from "@/data/params/types";
import { Icon } from "@/components/ui/Icon";

const COPY: Record<Status, { label: string; cls: string; title: string }> = {
  official: { label: "Official", cls: "pill-sage", title: "Published by the agency. Final." },
  projected: { label: "Projected", cls: "pill-sun", title: "Not final yet. Computed from official inputs or the Trustees Report; we update it the day the agency publishes." },
  not_yet_announced: { label: "Not announced yet", cls: "pill-ember", title: "The agency has not published this figure yet." },
};

export function StatusChip({ status, children }: { status: Status; children?: React.ReactNode }) {
  const c = COPY[status];
  return (
    <span className={`pill ${c.cls}`} title={c.title}>
      <Icon name={status === "official" ? "check" : status === "projected" ? "clock" : "info"} size={15} strokeWidth={2.2} />
      {children ?? c.label}
    </span>
  );
}
