import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the project. */
export function cronAuthorized(req: Request) {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${s}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
