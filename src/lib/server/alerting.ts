/**
 * Owner health alerting — pure decision logic (no I/O, unit-tested). Emails go out on state change only:
 *  - DOWN once, after FAILS_BEFORE_DOWN consecutive failed probes (a single bad probe is a blip, not an incident);
 *  - while still down, at most one reminder per REMINDER_MS;
 *  - RECOVERED once, when a probe passes again after a DOWN email.
 * Open error-inbox groups are never an incident: they go out in the once-a-day digest (digestEmail) instead.
 */
export const FAILS_BEFORE_DOWN = 2;
export const REMINDER_MS = 24 * 3600 * 1000;

export interface AlarmState {
  /** Consecutive failed probes (0 = the last probe passed). */
  fails: number;
  /** When the last DOWN/reminder email went out; null = no open incident has been emailed. */
  alertedAt: Date | null;
}

export type AlarmEmail = "down" | "reminder" | "recovered" | null;

export function nextAlarm(prev: AlarmState, probeOk: boolean, now: Date): { next: AlarmState; email: AlarmEmail } {
  if (probeOk) return { next: { fails: 0, alertedAt: null }, email: prev.alertedAt ? "recovered" : null };
  const fails = prev.fails + 1;
  if (!prev.alertedAt) {
    return fails >= FAILS_BEFORE_DOWN ? { next: { fails, alertedAt: now }, email: "down" } : { next: { fails, alertedAt: null }, email: null };
  }
  if (now.getTime() - prev.alertedAt.getTime() >= REMINDER_MS) return { next: { fails, alertedAt: now }, email: "reminder" };
  return { next: { fails, alertedAt: prev.alertedAt }, email: null };
}

export interface DigestItem {
  name: string;
  message: string;
  route: string | null;
  source: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

const utc = (d: Date) => `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
const groups = (n: number) => `${n} unresolved error group${n === 1 ? "" : "s"}`;

/** The once-a-day summary of open error-inbox groups (callers send nothing when the count is 0). */
export function digestEmail(open: number, items: DigestItem[], adminUrl: string): { subject: string; text: string } {
  const lines = items.map((e, i) => {
    const msg = e.message.replace(/\s+/g, " ").trim();
    return [
      `${i + 1}. ${e.name}: ${msg.length > 200 ? `${msg.slice(0, 199)}…` : msg}`,
      `   ${e.source} · ${e.route ?? "(no route)"} · ${e.count}× · first seen ${utc(e.firstSeen)} · last seen ${utc(e.lastSeen)}`,
    ].join("\n");
  });
  const shown = items.length < open ? ` (top ${items.length} by occurrences)` : "";
  return {
    subject: `Daily error digest: ${groups(open)}`,
    text: [
      `${groups(open)} in the error inbox${shown}. This is a once-a-day summary, not an outage alert — open errors do not mark the site as down.`,
      "",
      ...lines,
      "",
      `Review and resolve: ${adminUrl}`,
      "No digest is sent on days with nothing open.",
    ].join("\n"),
  };
}
