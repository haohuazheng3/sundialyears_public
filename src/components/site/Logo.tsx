const DIAL = "M6.00 42.00 A26 26 0 0 1 43.72 18.79 L32 41.99 L47.72 21.29 A26 26 0 0 1 58.00 42.00 Z";

/** The Sundial Years mark: a dial plate with the gnomon's shadow cut through it, resting on a baseline. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d={DIAL} fill="var(--sun)" />
      <rect x="6" y="48" width="52" height="4.5" rx="2.25" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.32rem] leading-none tracking-[-0.02em] ${className}`}>
      <span className="font-semibold">Sundial</span> <span className="italic font-normal">Years</span>
    </span>
  );
}
