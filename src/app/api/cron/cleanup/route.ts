import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { captureError } from "@/lib/server/errors";
import { sendDailyErrorDigest } from "@/lib/server/alarm";

/**
 * Vercel Cron (daily): enforce the retention periods promised in the privacy policy, then send the once-a-day digest of
 * open error-inbox groups (nothing when none are open). Each part runs and fails independently.
 */
export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return Response.json({ ok: false }, { status: 401 });
  let ok = true;
  let deleted: Record<string, number> | null = null;
  let digest: Awaited<ReturnType<typeof sendDailyErrorDigest>> | null = null;
  try {
    const run = async (q: ReturnType<typeof sql>) => {
      const r = await db().execute(q);
      return (r as unknown as { rowCount?: number }).rowCount ?? 0;
    };
    deleted = {
      contactMessages: await run(sql`delete from contact_messages where created_at < now() - interval '24 months'`),
      feedback: await run(sql`delete from feedback where created_at < now() - interval '24 months'`),
      errors: await run(sql`delete from errors where last_seen < now() - interval '90 days'`),
      inbox: await run(sql`delete from inbox_messages where received_at < now() - interval '30 days'`),
      // `state:*` rows are the health alarm's / digest's memory (src/lib/server/alarm.ts), not rate-limit windows.
      rateLimits: await run(sql`delete from rate_limits where window_start < now() - interval '1 day' and key not like 'state:%'`),
    };
  } catch (e) {
    ok = false;
    const err = e as Error;
    await captureError({ source: "cron", name: err.name, message: err.message, stack: err.stack, route: "/api/cron/cleanup" });
  }
  try {
    digest = await sendDailyErrorDigest();
  } catch (e) {
    ok = false;
    const err = e as Error;
    await captureError({ source: "cron", name: err.name, message: `error digest: ${err.message}`, stack: err.stack, route: "/api/cron/cleanup" });
  }
  return Response.json({ ok, deleted, digest }, { status: ok ? 200 : 500, headers: { "cache-control": "no-store" } });
}
