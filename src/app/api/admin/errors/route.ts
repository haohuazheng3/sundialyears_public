import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { isAdminRequest } from "@/lib/server/admin";
import { environment } from "@/lib/server/errors";

/** GET: open error groups. POST {id|all}: mark resolved. Admin only. */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ ok: false }, { status: 401 });
  const rows = await db()
    .select()
    .from(schema.errors)
    .where(and(isNull(schema.errors.resolvedAt), eq(schema.errors.environment, environment())))
    .orderBy(sql`${schema.errors.lastSeen} desc`)
    .limit(100);
  return Response.json({ ok: true, open: rows }, { headers: { "cache-control": "no-store" } });
}

const Body = z.union([z.object({ id: z.number().int().positive() }), z.object({ all: z.literal(true) })]);

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ ok: false }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  const where =
    "id" in parsed.data
      ? eq(schema.errors.id, parsed.data.id)
      : and(isNull(schema.errors.resolvedAt), eq(schema.errors.environment, environment()));
  const r = await db().update(schema.errors).set({ resolvedAt: sql`now()` }).where(where).returning({ id: schema.errors.id });
  return Response.json({ ok: true, resolved: r.length });
}
