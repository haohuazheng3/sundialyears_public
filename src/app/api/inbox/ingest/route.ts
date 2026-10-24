import { timingSafeEqual } from "node:crypto";
import { db, schema } from "@/lib/db/client";
import { captureError } from "@/lib/server/errors";

function authorized(req: Request, secret: string | undefined) {
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Called only by the sundialyears-mail Worker for mail sent to test@sundialyears.com. */
export async function POST(req: Request) {
  if (!authorized(req, process.env.INBOX_INGEST_SECRET)) return Response.json({ ok: false }, { status: 401 });
  try {
    const b = (await req.json()) as { to: string; from: string; headers: Record<string, string>; raw: string };
    const PostalMime = (await import("postal-mime")).default;
    const parsed = await PostalMime.parse(b.raw ?? "");
    const h = Object.fromEntries(Object.entries(b.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
    await db()
      .insert(schema.inboxMessages)
      .values({
        toAddr: String(b.to).slice(0, 200),
        fromAddr: String(b.from).slice(0, 200),
        subject: (parsed.subject ?? h["subject"] ?? "").slice(0, 500),
        text: (parsed.text ?? "").slice(0, 20000),
        authResults: (h["authentication-results"] ?? h["arc-authentication-results"] ?? "").slice(0, 2000),
        headers: h,
      });
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as Error;
    await captureError({ source: "server", name: err.name, message: err.message, stack: err.stack, route: "/api/inbox/ingest" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
