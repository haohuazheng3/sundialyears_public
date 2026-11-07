import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifyOwner } from "./notify";
import { environment, openErrorCount } from "./errors";
import { coreHealth } from "./health";
import { digestEmail, nextAlarm, type AlarmEmail, type AlarmState, type DigestItem } from "./alerting";

/**
 * In-app health alarm + daily error digest. State lives in the `rate_limits` table (the store the alarm has always used),
 * under keys prefixed `state:` that the cleanup cron never deletes:
 *   state:health:fails    count = consecutive failed probes, window_start = last probe
 *   state:health:alerted  present while a DOWN email is out (window_start = last DOWN/reminder email)
 *   state:digest          window_start = last digest sent
 */
const FAILS_KEY = "state:health:fails";
const ALERTED_KEY = "state:health:alerted";
const DIGEST_KEY = "state:digest";
const HEALTH_URL = "https://sundialyears.com/api/health";
const ADMIN_URL = "https://sundialyears.com/admin#errors";
const PROBE_MINUTES = 30; // vercel.json → /api/cron/health

type Row = Record<string, unknown>;
const rowsOf = <T extends Row>(r: unknown): T[] => (r as { rows?: T[] }).rows ?? (r as T[]);

async function readAlarmState(): Promise<AlarmState> {
  const rows = rowsOf<{ key: string; window_start: string | Date; count: number }>(
    await db().execute(sql`select key, window_start, count from rate_limits where key in (${FAILS_KEY}, ${ALERTED_KEY})`),
  );
  const fails = rows.find((r) => r.key === FAILS_KEY);
  const alerted = rows.find((r) => r.key === ALERTED_KEY);
  return { fails: Number(fails?.count ?? 0), alertedAt: alerted ? new Date(alerted.window_start) : null };
}

async function upsertState(key: string, count: number, at: Date) {
  await db().execute(sql`
    insert into rate_limits (key, window_start, count) values (${key}, ${at.toISOString()}::timestamptz, ${count})
    on conflict (key) do update set window_start = excluded.window_start, count = excluded.count`);
}

async function writeAlarmState(s: AlarmState, now: Date) {
  await upsertState(FAILS_KEY, s.fails, now);
  if (s.alertedAt) await upsertState(ALERTED_KEY, 1, s.alertedAt);
  else await db().execute(sql`delete from rate_limits where key = ${ALERTED_KEY}`);
}

function alarmMessage(email: Exclude<AlarmEmail, null>, problems: string[], fails: number): [string, string] {
  const details = `\n\nDetails: ${HEALTH_URL}\nAdmin: ${ADMIN_URL}`;
  if (email === "recovered") return ["Health RECOVERED", `${HEALTH_URL} passes again (database reachable, required config present).${details}`];
  const hours = Math.round(((fails * PROBE_MINUTES) / 60) * 10) / 10;
  const what = problems.join("\n");
  if (email === "reminder") {
    return ["Health still DOWN", `${what}\n\nStill failing after ${fails} consecutive checks (about ${hours} h). Next reminder in 24 h at the earliest; one RECOVERED email when it passes.${details}`];
  }
  return ["Health DOWN", `${what}\n\nFailed ${fails} consecutive checks, ${PROBE_MINUTES} min apart. You'll get one RECOVERED email when it passes again, and at most one reminder a day while it stays down.${details}`];
}

/**
 * One probe of the in-app alarm (Vercel Cron, every 30 min): same core checks as /api/health, emails on state change only.
 * When the database itself is unreachable the alarm can't read or keep its state (it lives in that database), so it stays
 * quiet and the external GitHub Actions probe (.github/workflows/health.yml, state in the Actions cache) owns that case.
 */
export async function runHealthAlarm(now = new Date()) {
  const core = await coreHealth();
  if (!core.db.ok) return { ok: false, problems: core.problems, email: null, note: "database unreachable — alerting left to the external probe" };
  const prev = await readAlarmState();
  const { next, email } = nextAlarm(prev, core.ok, now);
  let sent = true;
  if (email) sent = await notifyOwner(...alarmMessage(email, core.problems, next.fails));
  // A failed send keeps the previous incident state, so the next probe retries that email; the failure counter always advances.
  await writeAlarmState(sent ? next : { fails: next.fails, alertedAt: prev.alertedAt }, now);
  return { ok: core.ok, problems: core.problems, email, sent: email ? sent : undefined, consecutiveFails: next.fails };
}

/** At most one email per UTC day listing the open error-inbox groups; nothing when none are open. Atomic, so a doubled cron can't send twice. */
export async function sendDailyErrorDigest() {
  const open = await openErrorCount();
  if (open === 0) return { open, sent: false };
  const claimed = rowsOf(
    await db().execute(sql`
      insert into rate_limits (key, window_start, count) values (${DIGEST_KEY}, now(), 1)
      on conflict (key) do update set window_start = excluded.window_start, count = rate_limits.count + 1
      where (rate_limits.window_start at time zone 'UTC')::date < (excluded.window_start at time zone 'UTC')::date
      returning key`),
  );
  if (claimed.length === 0) return { open, sent: false, note: "already sent today (UTC)" };
  const items = rowsOf<{ name: string; message: string; route: string | null; source: string; count: number; first_seen: string | Date; last_seen: string | Date }>(
    await db().execute(sql`
      select name, message, route, source, count, first_seen, last_seen from errors
      where resolved_at is null and severity = 'error' and environment = ${environment()}
      order by count desc, last_seen desc limit 10`),
  ).map<DigestItem>((r) => ({
    name: r.name,
    message: r.message,
    route: r.route,
    source: r.source,
    count: Number(r.count),
    firstSeen: new Date(r.first_seen),
    lastSeen: new Date(r.last_seen),
  }));
  const { subject, text } = digestEmail(open, items, ADMIN_URL);
  const sent = await notifyOwner(subject, text);
  // Not delivered: hand today's slot back so a re-run the same day can retry.
  if (!sent) await db().execute(sql`update rate_limits set window_start = window_start - interval '1 day' where key = ${DIGEST_KEY}`);
  return { open, sent };
}
