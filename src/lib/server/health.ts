import "server-only";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db/client";

/** Env the site can't run correctly without (only the names ever leave the server). */
export const REQUIRED_ENV = [
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
export const OPTIONAL_ENV = ["NEXT_PUBLIC_ADSENSE_CLIENT", "SITE_INDEXABLE", "INDEXNOW_KEY"] as const;

export interface CoreHealth {
  ok: boolean;
  /** Human-readable reasons `ok` is false (empty when ok). */
  problems: string[];
  db: { ok: boolean; latencyMs: number | null; error: string | null };
  missing: string[];
}

/**
 * The checks that decide whether the site is healthy (HTTP 200 on /api/health): database reachable and required env present.
 * Open error-inbox groups and optional env are deliberately NOT here — they are reported (health JSON, daily digest) but never
 * make the site "down".
 */
export async function coreHealth(): Promise<CoreHealth> {
  const missing: string[] = REQUIRED_ENV.filter((k) => !process.env[k]);
  const dbState: CoreHealth["db"] = { ok: false, latencyMs: null, error: null };
  if (hasDb()) {
    const started = Date.now();
    try {
      await db().execute(sql`select 1`);
      dbState.ok = true;
      dbState.latencyMs = Date.now() - started;
    } catch (e) {
      dbState.error = e instanceof Error ? e.message.slice(0, 200) : "db error";
    }
  }
  const problems: string[] = [];
  if (!dbState.ok) problems.push(`Database unreachable${dbState.error ? `: ${dbState.error}` : ""}`);
  if (missing.length) problems.push(`Required environment variables missing: ${missing.join(", ")}`);
  return { ok: problems.length === 0, problems, db: dbState, missing };
}
