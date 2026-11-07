import { connection } from "next/server";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { captureError } from "@/lib/server/errors";
import { runHealthAlarm } from "@/lib/server/alarm";

/**
 * Vercel Cron (every 30 min): in-app health alarm. Emails on state change only — DOWN after 2 consecutive failed probes,
 * at most one reminder per 24 h while down, one RECOVERED. Open error-inbox groups are not an alarm (daily digest instead).
 * Returns 200 whenever the job itself ran; the health verdict is in the body.
 */
export async function GET(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return Response.json({ ok: false }, { status: 401 });
  try {
    return Response.json(await runHealthAlarm(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await captureError({ source: "cron", name: err.name, message: err.message, stack: err.stack, route: "/api/cron/health" });
    return Response.json({ ok: false, error: "alarm run failed" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
