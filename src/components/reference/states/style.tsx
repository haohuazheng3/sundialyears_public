import type { Taxed, VerdictLabel } from "@/data/states/types";
import { Icon } from "@/components/ui/Icon";

/**
 * One color per verdict, from the design tokens (works in light and dark): an ordinal scale from sage (best)
 * through sun to ember. Used by the tile map, pills and legend so they always agree.
 */
export const VERDICT_STYLE: Record<VerdictLabel, { bg: string; fg: string }> = {
  "Tax-free retirement income": { bg: "var(--sage)", fg: "var(--card)" },
  "Very friendly": { bg: "color-mix(in oklab, var(--sage) 52%, var(--card))", fg: "var(--ink)" },
  Friendly: { bg: "color-mix(in oklab, var(--sage) 20%, var(--card))", fg: "var(--ink)" },
  Mixed: { bg: "color-mix(in oklab, var(--sun) 40%, var(--card))", fg: "var(--ink)" },
  "Less friendly": { bg: "color-mix(in oklab, var(--ember) 42%, var(--card))", fg: "var(--ink)" },
};

/** Pill showing a state's verdict with its map color as a swatch. */
export function VerdictPill({ label, className = "" }: { label: VerdictLabel; className?: string }) {
  return (
    <span className={`pill !text-ink ${className}`}>
      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: VERDICT_STYLE[label].bg, boxShadow: "inset 0 0 0 1px var(--hairline-2)" }} />
      {label}
    </span>
  );
}

export const TAXED_COPY: Record<Taxed, { label: string; cls: string; icon: "check" | "info" | "warn" }> = {
  no: { label: "Not taxed", cls: "pill-sage", icon: "check" },
  partially: { label: "Partly taxed", cls: "pill-sun", icon: "info" },
  yes: { label: "Taxed", cls: "pill-ember", icon: "warn" },
};

/** "Not taxed" / "Partly taxed" / "Taxed" badge. */
export function TaxBadge({ taxed, className = "" }: { taxed: Taxed; className?: string }) {
  const c = TAXED_COPY[taxed];
  return (
    <span className={`pill ${c.cls} ${className}`}>
      <Icon name={c.icon} size={15} strokeWidth={2.2} />
      {c.label}
    </span>
  );
}

/** "None", "Flat 4.4%" or "5.75% top" — the compact rate label used in tables and cards. */
export function rateLabel(r: { type: "none" | "flat" | "graduated"; topRate: number; flatRate?: number }) {
  if (r.type === "none") return "None";
  if (r.type === "flat" && r.flatRate === r.topRate) return `${r.topRate}% flat`;
  return `${r.topRate}% top`;
}
