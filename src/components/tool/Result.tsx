import { Icon } from "@/components/ui/Icon";

/** The answer, big. Used at the top of every calculator's result panel. */
export function ResultHero({
  label,
  value,
  sub,
  tone = "ink",
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ink" | "sun" | "sage" | "ember";
  children?: React.ReactNode;
}) {
  const color = tone === "sun" ? "text-sun-ink" : tone === "sage" ? "text-sage" : tone === "ember" ? "text-ember" : "text-ink";
  return (
    <div aria-live="polite">
      <p className="eyebrow">{label}</p>
      <p className={`num font-display mt-2 text-[3.1rem] font-semibold leading-none tracking-[-0.02em] sm:text-[4rem] ${color}`}>{value}</p>
      {sub ? <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">{sub}</p> : null}
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: "sun" | "sage" | "ember" }) {
  const color = tone === "sun" ? "text-sun-ink" : tone === "sage" ? "text-sage" : tone === "ember" ? "text-ember" : "text-ink";
  return (
    <div className="sunk p-4">
      <p className="text-[0.9375rem] font-semibold text-ink-3">{label}</p>
      <p className={`num mt-1 text-[1.6rem] font-bold leading-tight ${color}`}>{value}</p>
      {sub ? <p className="mt-1 text-[0.9375rem] leading-snug text-ink-3">{sub}</p> : null}
    </div>
  );
}

/** Collapsible "show the math" with the exact table values and rules used. */
export function ShowMath({ title = "Show the math", children, defaultOpen = false }: { title?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="explainer sunk group mt-5 px-5" open={defaultOpen}>
      <summary className="flex min-h-[3.25rem] items-center justify-between gap-3 font-bold text-ink">
        <span className="flex items-center gap-2">
          <Icon name="info" size={19} className="text-sun-ink" /> {title}
        </span>
        <Icon name="chev" size={19} className="chev text-ink-3 transition-transform" />
      </summary>
      <div className="pb-5 text-[1.0rem] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

export function Callout({ tone = "sun", title, children }: { tone?: "sun" | "sage" | "ember" | "sky"; title?: React.ReactNode; children: React.ReactNode }) {
  const map = { sun: "bg-sun-wash text-sun-ink", sage: "bg-sage-wash text-sage", ember: "bg-ember-wash text-ember", sky: "bg-sky-wash text-sky" } as const;
  const icon = tone === "ember" ? "warn" : tone === "sage" ? "check" : "info";
  return (
    <div className={`flex gap-3 rounded-[var(--r-lg)] p-4 ${map[tone]}`}>
      <Icon name={icon} size={21} className="mt-0.5 shrink-0" />
      <div className="text-[1.0rem] leading-relaxed text-ink-2">
        {title ? <p className={`font-bold ${map[tone].split(" ")[1]}`}>{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
