import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db/client";
import { openErrorCount, environment } from "@/lib/server/errors";
import { SITE } from "@/lib/site";
import { PARAM_STATUS_SUMMARY } from "@/data/params";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "NOTIFY_WORKER_URL",
  "NOTIFY_SECRET",
  "INBOX_INGEST_SECRET",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "IP_HASH_SALT",
  "CRON_SECRET",
  "GITHUB_WEBHOOK_SECRET",
  "VERCEL_DEPLOY_HOOK_URL",
] as const;
const OPTIONAL_ENV = ["NEXT_PUBLIC_ADSENSE_CLIENT", "SITE_INDEXABLE", "INDEXNOW_KEY"] as const;

/** Self-diagnosis: DB reachability, env presence (names only), open error count, deployed commit. Non-200 when unhealthy. */
export async function GET() {
  await connection();
  const started = Date.now();
  let dbOk = false;
  let dbMs: number | null = null;
  let openErrors: number | null = null;
  let dbError: string | null = null;
  if (hasDb()) {
    try {
      await db().execute(sql`select 1`);
      dbOk = true;
      dbMs = Date.now() - started;
      openErrors = await openErrorCount();
    } catch (e) {
      dbError = e instanceof Error ? e.message.slice(0, 200) : "db error";
    }
  }
  const env = Object.fromEntries(REQUIRED_ENV.map((k) => [k, Boolean(process.env[k])]));
  const optional = Object.fromEntries(OPTIONAL_ENV.map((k) => [k, Boolean(process.env[k])]));
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  const healthy = dbOk && missing.length === 0 && (openErrors ?? 0) === 0;
  const body = {
    status: healthy ? "ok" : "degraded",
    environment: environment(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_COMMIT_SHA ?? null,
    db: { ok: dbOk, latencyMs: dbMs, error: dbError },
    errors: { openSevere: openErrors },
    env: { required: env, missing, optional },
    payments: { stripe: "not_used", note: "This site takes no payments." },
    indexable: process.env.SITE_INDEXABLE === "true" && process.env.VERCEL_ENV === "production",
    data: { verifiedOn: SITE.dataVerifiedOn, ...PARAM_STATUS_SUMMARY },
    checkedAt: new Date().toISOString(),
  };
  return Response.json(body, { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } });
}
