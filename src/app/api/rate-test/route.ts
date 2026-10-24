import { connection } from "next/server";
import { ipHash, rateLimit } from "@/lib/server/ratelimit";

/** Dedicated path to prove rate limiting works: 10 requests per minute per IP, then 429. */
export async function GET(req: Request) {
  await connection();
  const rl = await rateLimit(`ratetest:${ipHash(req)}`, 10, 60);
  if (!rl.ok) return Response.json({ ok: false, limited: true, count: rl.count }, { status: 429, headers: { "retry-after": "60", "cache-control": "no-store" } });
  return Response.json({ ok: true, count: rl.count }, { headers: { "cache-control": "no-store" } });
}
