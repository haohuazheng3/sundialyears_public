import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { notifyOwner } from "@/lib/server/notify";
import { captureError } from "@/lib/server/errors";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { probeSources } from "@/lib/server/source-watch";

/** Vercel Cron (every 6 h): probe official sources; email the owner when one changes. */
export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return Response.json({ ok: false }, { status: 401 });
  try {
    const results = await probeSources();
    const changed: string[] = [];
    for (const r of results) {
      const prev = await db().select().from(schema.sourceWatch).where(sql`${schema.sourceWatch.key} = ${r.key}`).limit(1);
      const before = prev[0];
      const isChange = before?.lastHash != null && before.lastHash !== r.hash && r.hash !== "error";
      const note = r.found ? "key phrases present" : r.note ?? "not yet published";
      await db()
        .insert(schema.sourceWatch)
        .values({ key: r.key, url: r.url, label: r.label, lastHash: r.hash, lastStatus: r.status, lastCheckedAt: sql`now()`, lastChangedAt: sql`now()`, note })
        .onConflictDoUpdate({
          target: schema.sourceWatch.key,
          set: { url: r.url, label: r.label, lastHash: r.hash, lastStatus: r.status, lastCheckedAt: sql`now()`, note, ...(isChange ? { lastChangedAt: sql`now()` } : {}) },
        });
      if (isChange) changed.push(`• ${r.label}\n  ${r.url}\n  HTTP ${r.status}, key phrases ${r.found ? "FOUND" : "absent"}`);
    }
    if (changed.length) {
      await notifyOwner(
        `Official source changed (${changed.length}) — numbers may need updating`,
        `These pages changed since the last check:\n\n${changed.join("\n\n")}\n\nRe-verify and update src/data/params, then redeploy.`,
      );
    }
    return Response.json({ ok: true, checked: results.length, changed: changed.length, results }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const err = e as Error;
    await captureError({ source: "cron", name: err.name, message: err.message, stack: err.stack, route: "/api/cron/source-watch" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
