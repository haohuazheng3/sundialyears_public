import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { ipHash, rateLimit } from "@/lib/server/ratelimit";
import { captureError } from "@/lib/server/errors";
import { notifyOwner } from "@/lib/server/notify";

const TOPICS = ["question", "number-looks-wrong", "suggestion", "partnership", "other"] as const;

const Body = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(5).max(5000),
  page: z.string().max(300).optional(),
  website: z.string().max(0).optional(), // honeypot: real people never fill this
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Please add a valid email and a message of at least a few words." }, { status: 400 });
  }
  try {
    const ip = ipHash(req);
    const rl = await rateLimit(`contact:${ip}`, 5, 3600);
    if (!rl.ok) return Response.json({ ok: false, error: "You've sent several messages already. Please email us directly instead." }, { status: 429 });
    const b = parsed.data;
    const [row] = await db()
      .insert(schema.contactMessages)
      .values({ name: b.name || null, email: b.email, topic: b.topic, message: b.message, page: b.page ?? null, userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null, ipHash: ip })
      .returning({ id: schema.contactMessages.id });
    const delivered = await notifyOwner(
      `Contact form (${b.topic}) from ${b.name || b.email}`,
      [`From: ${b.name ? `${b.name} <${b.email}>` : b.email}`, `Topic: ${b.topic}`, b.page ? `Page: ${b.page}` : "", "", b.message, "", `Message #${row.id} — reply directly to this email.`]
        .filter((l) => l !== null)
        .join("\n"),
      b.email,
    );
    if (delivered) await db().update(schema.contactMessages).set({ notified: true }).where(eq(schema.contactMessages.id, row.id));
    else await captureError({ source: "server", severity: "warning", name: "NotifyFailed", message: `Contact message #${row.id} stored but owner email failed`, route: "/api/contact" });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    const err = e as Error;
    await captureError({ source: "server", name: err.name, message: err.message, stack: err.stack, route: "/api/contact" });
    return Response.json({ ok: false, error: "Something went wrong on our side. Please email contact@sundialyears.com." }, { status: 500 });
  }
}
