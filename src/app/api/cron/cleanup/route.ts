import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { captureError } from "@/lib/server/errors";

/** Vercel Cron (daily): enforce the retention periods promised in the privacy policy. */
export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return Response.json({ ok: false }, { status: 401 });
  try {
    const run = async (q: ReturnType<typeof sql>) => {
      const r = await db().execute(q);
      return (r as unknown as { rowCount?: number }).rowCount ?? 0;
    };
    const deleted = {
      contactMessages: await run(sql`delete from contact_messages where created_at < now() - interval '24 months'`),
      feedback: await run(sql`delete from feedback where created_at < now() - interval '24 months'`),
      errors: await run(sql`delete from errors where last_seen < now() - interval '90 days'`),
      inbox: await run(sql`delete from inbox_messages where received_at < now() - interval '30 days'`),
      rateLimits: await run(sql`delete from rate_limits where window_start < now() - interval '1 day'`),
    };
    return Response.json({ ok: true, deleted }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const err = e as Error;
    await captureError({ source: "cron", name: err.name, message: err.message, stack: err.stack, route: "/api/cron/cleanup" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
