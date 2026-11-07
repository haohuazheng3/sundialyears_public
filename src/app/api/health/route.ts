import { connection } from "next/server";
import { openErrorCount, environment } from "@/lib/server/errors";
import { coreHealth, OPTIONAL_ENV, REQUIRED_ENV } from "@/lib/server/health";
import { SITE } from "@/lib/site";
import { PARAM_STATUS_SUMMARY } from "@/data/params";

/**
 * Self-diagnosis: DB reachability, env presence (names only), open error count, deployed commit.
 * HTTP 200 / status "ok" whenever the site can serve (database reachable + required env present); 503 / "degraded" only
 * when one of those core checks fails. Open error-inbox groups and optional env are informational and never change the
 * status — they go out in the once-a-day digest instead (src/lib/server/alarm.ts).
 */
export async function GET() {
  await connection();
  const core = await coreHealth();
  let openErrors: number | null = null;
  let errorsError: string | null = null;
  if (core.db.ok) {
    try {
      openErrors = await openErrorCount();
    } catch (e) {
      errorsError = e instanceof Error ? e.message.slice(0, 200) : "error count failed";
    }
  }
  const body = {
    status: core.ok ? "ok" : "degraded",
    ok: core.ok,
    problems: core.problems,
    environment: environment(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_COMMIT_SHA ?? null,
    db: core.db,
    errors: { openSevere: openErrors, affectsStatus: false, ...(errorsError ? { error: errorsError } : {}) },
    env: {
      required: Object.fromEntries(REQUIRED_ENV.map((k) => [k, Boolean(process.env[k])])),
      missing: core.missing,
      optional: Object.fromEntries(OPTIONAL_ENV.map((k) => [k, Boolean(process.env[k])])),
    },
    payments: { stripe: "not_used", note: "This site takes no payments." },
    indexable: process.env.SITE_INDEXABLE === "true" && process.env.VERCEL_ENV === "production",
    data: { verifiedOn: SITE.dataVerifiedOn, ...PARAM_STATUS_SUMMARY },
    checkedAt: new Date().toISOString(),
  };
  return Response.json(body, { status: core.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
