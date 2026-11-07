import type { IconName } from "@/lib/tools";

const paths: Record<IconName | "arrow" | "check" | "info" | "menu" | "close" | "print" | "link" | "chev" | "mail" | "source" | "up" | "warn", React.ReactNode> = {
  rmd: (<><path d="M4 19h16" /><path d="M6 15l4-4 3 3 5-6" /><path d="M15 8h3v3" /></>),
  inherit: (<><path d="M12 3v6" /><path d="M7 21v-4a5 5 0 0 1 10 0v4" /><circle cx="12" cy="11" r="2.4" /><path d="M5 8l3 2" /><path d="M19 8l-3 2" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  work: (<><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" /><path d="M3.5 12.5h17" /></>),
  tax: (<><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" /><path d="M14 3.5V8h4" /><path d="M10 13l4-4" /><circle cx="10" cy="9.8" r=".8" /><circle cx="14" cy="13.2" r=".8" /><path d="M10 17h4" /></>),
  shield: (<><path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.1z" /><path d="M9 12.5l2 2 4-4.5" /></>),
  medicare: (<><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M12 9v6M9 12h6" /></>),
  table: (<><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15" /></>),
  chart: (<><path d="M4 20h16" /><rect x="5.5" y="12" width="3" height="6" rx="1" /><rect x="10.5" y="8" width="3" height="10" rx="1" /><rect x="15.5" y="4.5" width="3" height="13.5" rx="1" /></>),
  map: (<><path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h3" /></>),
  spark: (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></>),
  arrow: (<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>),
  up: (<><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>),
  check: (<path d="M5 12.5l4.5 4.5L19 7.5" />),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></>),
  warn: (<><path d="M12 4l9 16H3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r=".6" fill="currentColor" /></>),
  menu: (<><path d="M4 8h16M4 16h16" /></>),
  close: (<><path d="M6 6l12 12M18 6L6 18" /></>),
  print: (<><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v6H7z" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  chev: (<path d="M6 9l6 6 6-6" />),
  mail: (<><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4 7l8 6 8-6" /></>),
  source: (<><path d="M5 4.5h10l4 4v11H5z" /><path d="M9 12h6M9 15.5h6M9 8.5h3" /></>),
};

export type AnyIcon = keyof typeof paths;

export function Icon({ name, size = 22, className = "", strokeWidth = 1.8, title }: { name: AnyIcon; size?: number; className?: string; strokeWidth?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
