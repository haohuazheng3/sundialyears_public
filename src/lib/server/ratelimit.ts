import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export function clientIp(req: Request) {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

export function ipHash(req: Request) {
  const salt = process.env.IP_HASH_SALT ?? "sundialyears";
  return createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex").slice(0, 24);
}

/** Fixed-window limiter backed by Postgres. Returns { ok, count }. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const r = await db().execute(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count`);
  const rows = (r as unknown as { rows?: { count: number }[] }).rows ?? (r as unknown as { count: number }[]);
  const count = Number(rows[0]?.count ?? 0);
  return { ok: count <= limit, count };
}
