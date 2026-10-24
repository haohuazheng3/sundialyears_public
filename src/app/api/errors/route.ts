import { z } from "zod";
import { captureError } from "@/lib/server/errors";
import { ipHash, rateLimit } from "@/lib/server/ratelimit";

const Body = z.object({
  kind: z.string().max(40).optional(),
  name: z.string().max(120).optional(),
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).nullish(),
  url: z.string().max(500).optional(),
  ua: z.string().max(400).optional(),
  digest: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  const rl = await rateLimit(`err:${ipHash(req)}`, 30, 60);
  if (!rl.ok) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const b = parsed.data;
  const path = b.url?.split("?")[0] ?? null;
  const r = await captureError({
    source: "client",
    name: b.name,
    message: b.message,
    stack: b.stack ?? null,
    route: path,
    sample: { url: b.url ?? null, ua: b.ua ?? null, kind: b.kind ?? null, digest: b.digest ?? null },
  });
  return Response.json({ ok: true, stored: r.stored });
}
