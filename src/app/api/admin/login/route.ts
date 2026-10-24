import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkPassword, makeSessionToken } from "@/lib/server/admin";
import { ipHash, rateLimit } from "@/lib/server/ratelimit";

const Body = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const rl = await rateLimit(`login:${ipHash(req)}`, 8, 900);
  if (!rl.ok) return Response.json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    return Response.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
  const { token, maxAge } = makeSessionToken(Math.floor(Date.now() / 1000));
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge });
  // Read by FlowGlance's fw.js: marks this browser as the owner's so it's excluded from visitor stats.
  jar.set("fw_exclude", "1", { httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return Response.json({ ok: true, identify: { userRef: "site-owner", email: process.env.OWNER_EMAIL ?? null } });
}
