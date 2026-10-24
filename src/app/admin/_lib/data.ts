import "server-only";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { captureError, environment } from "@/lib/server/errors";

/**
 * Admin dashboard reads (drizzle, straight from the server component — no API round trip).
 * Each panel loads independently: a failing query is captured into the error inbox and shown in its own panel,
 * the rest of the dashboard still renders.
 */
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

async function guarded<T>(label: string, fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await captureError({ source: "server", name: err.name, message: `admin dashboard (${label}): ${err.message}`, stack: err.stack, route: "/admin" });
    return { ok: false, error: err.message.slice(0, 300) };
  }
}

/** Most open error groups the dashboard loads (the tile shows "100+" when the cap is hit). */
export const ERROR_LIMIT = 100;

/** Open (unresolved) error groups for this deployment environment — the same set POST /api/admin/errors {all} resolves. */
export function loadOpenErrors() {
  return guarded("errors", () =>
    db()
      .select({
        id: schema.errors.id,
        source: schema.errors.source,
        severity: schema.errors.severity,
        name: schema.errors.name,
        message: schema.errors.message,
        topFrame: schema.errors.topFrame,
        stack: schema.errors.stack,
        route: schema.errors.route,
        count: schema.errors.count,
        firstSeen: schema.errors.firstSeen,
        lastSeen: schema.errors.lastSeen,
      })
      .from(schema.errors)
      .where(and(isNull(schema.errors.resolvedAt), eq(schema.errors.environment, environment())))
      .orderBy(desc(schema.errors.lastSeen))
      .limit(ERROR_LIMIT),
  );
}

export function loadContacts() {
  return guarded("contact messages", async () => {
    const [rows, [unread]] = await Promise.all([
      db()
        .select({
          id: schema.contactMessages.id,
          createdAt: schema.contactMessages.createdAt,
          name: schema.contactMessages.name,
          email: schema.contactMessages.email,
          topic: schema.contactMessages.topic,
          message: schema.contactMessages.message,
          page: schema.contactMessages.page,
          status: schema.contactMessages.status,
          notified: schema.contactMessages.notified,
        })
        .from(schema.contactMessages)
        .orderBy(desc(schema.contactMessages.createdAt))
        .limit(20),
      db()
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(schema.contactMessages)
        .where(eq(schema.contactMessages.status, "new")),
    ]);
    return { rows, unread: unread?.n ?? 0 };
  });
}

/**
 * "Did this answer your question?" votes grouped by page (top 50, most-voted first), the latest written comments, and
 * site-wide totals — computed separately so the headline numbers don't silently drop pages beyond the top 50.
 */
export function loadFeedback() {
  return guarded("feedback", async () => {
    const f = schema.feedback;
    const [pages, comments, [totals]] = await Promise.all([
      db()
        .select({
          page: f.page,
          votes: sql<number>`count(*)`.mapWith(Number),
          helpful: sql<number>`count(*) filter (where ${f.helpful})`.mapWith(Number),
          comments: sql<number>`count(${f.comment})`.mapWith(Number),
          last: sql<Date>`max(${f.createdAt})`.mapWith(f.createdAt),
        })
        .from(f)
        .groupBy(f.page)
        .orderBy(sql`count(*) desc`, f.page)
        .limit(50),
      db()
        .select({ id: f.id, createdAt: f.createdAt, page: f.page, helpful: f.helpful, comment: f.comment })
        .from(f)
        .where(isNotNull(f.comment))
        .orderBy(desc(f.createdAt))
        .limit(10),
      db()
        .select({
          votes: sql<number>`count(*)`.mapWith(Number),
          helpful: sql<number>`count(*) filter (where ${f.helpful})`.mapWith(Number),
          pages: sql<number>`count(distinct ${f.page})`.mapWith(Number),
        })
        .from(f),
    ]);
    return { pages, comments, totals: totals ?? { votes: 0, helpful: 0, pages: 0 } };
  });
}

/** test@ inbox (Cloudflare Email Worker → /api/inbox/ingest): proves delivery and shows SPF/DKIM/DMARC results. */
export function loadInbox() {
  return guarded("test inbox", () =>
    db()
      .select({
        id: schema.inboxMessages.id,
        receivedAt: schema.inboxMessages.receivedAt,
        toAddr: schema.inboxMessages.toAddr,
        fromAddr: schema.inboxMessages.fromAddr,
        subject: schema.inboxMessages.subject,
        authResults: schema.inboxMessages.authResults,
      })
      .from(schema.inboxMessages)
      .orderBy(desc(schema.inboxMessages.receivedAt))
      .limit(10),
  );
}

/** Official pages watched for next year's numbers (written by /api/cron/source-watch). */
export function loadSourceWatch() {
  return guarded("source watch", () => db().select().from(schema.sourceWatch).orderBy(schema.sourceWatch.label));
}

/**
 * Feedback/contact `page` values come from public POST bodies, so they are untrusted. Only a same-site path is turned
 * into a link: "/x" yes; "//evil.com" and "/\\evil.com" (browsers treat a backslash like a slash) no.
 */
export function internalHref(page: string | null | undefined): string | null {
  if (!page || !/^\/(?![/\\])[^\s]*$/.test(page)) return null;
  return page;
}

/** "spf=pass dkim=fail …" → [{ check: "SPF", result: "pass" }, …] (first result per mechanism). */
export function parseAuthResults(raw: string | null | undefined) {
  const seen = new Map<string, string>();
  for (const m of (raw ?? "").matchAll(/\b(spf|dkim|dmarc|arc)=([a-z]+)/gi)) {
    const k = m[1].toUpperCase();
    if (!seen.has(k)) seen.set(k, m[2].toLowerCase());
  }
  return ["SPF", "DKIM", "DMARC", "ARC"].filter((k) => seen.has(k)).map((k) => ({ check: k, result: seen.get(k)! }));
}

/** Deterministic timestamp for the dashboard: "Oct 23, 2026, 14:05 UTC". */
export function fmtTs(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" })} UTC`;
}
