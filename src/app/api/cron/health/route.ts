import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifyOwner } from "@/lib/server/notify";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { openErrorCount } from "@/lib/server/errors";
import { rateLimit } from "@/lib/server/ratelimit";

/** Vercel Cron (every 30 min): in-app self check. Emails the owner at most once per 6 hours while unhealthy. */
export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return Response.json({ ok: false }, { status: 401 });
  const problems: string[] = [];
  try {
    await db().execute(sql`select 1`);
    const open = await openErrorCount();
    if (open > 0) problems.push(`${open} unresolved error group(s) in the error inbox`);
  } catch (e) {
    problems.push(`Database check failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (problems.length) {
    let shouldEmail = true;
    try {
      shouldEmail = (await rateLimit("alert:health", 1, 6 * 3600)).ok;
    } catch {
      shouldEmail = true; // DB down: email anyway
    }
    if (shouldEmail) await notifyOwner("Health alert", `${problems.join("\n")}\n\nDetails: https://sundialyears.com/api/health\nAdmin: https://sundialyears.com/admin`);
  }
  return Response.json({ ok: problems.length === 0, problems }, { status: problems.length ? 503 : 200, headers: { "cache-control": "no-store" } });
}
