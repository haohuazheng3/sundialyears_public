import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { ipHash, rateLimit } from "@/lib/server/ratelimit";
import { captureError } from "@/lib/server/errors";

const Body = z.object({
  page: z.string().min(1).max(300),
  helpful: z.boolean(),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  try {
    const ip = ipHash(req);
    const rl = await rateLimit(`fb:${ip}`, 20, 600);
    if (!rl.ok) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
    await db().insert(schema.feedback).values({ ...parsed.data, comment: parsed.data.comment?.trim() || null, ipHash: ip });
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as Error;
    await captureError({ source: "server", name: err.name, message: err.message, stack: err.stack, route: "/api/feedback" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
