import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { isAdminRequest } from "@/lib/server/admin";

/** Protected: latest test-inbox messages (admin cookie or Bearer ADMIN_SESSION_SECRET for automation). */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return Response.json({ ok: false }, { status: 401 });
  const rows = await db().select().from(schema.inboxMessages).orderBy(desc(schema.inboxMessages.receivedAt)).limit(10);
  return Response.json({ ok: true, messages: rows }, { headers: { "cache-control": "no-store" } });
}
