import { connection } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";

/** Admin-only fire drill for the error inbox: throws a real server error that onRequestError must capture. */
export async function POST(req: Request) {
  await connection();
  if (!(await isAdminRequest(req))) return Response.json({ ok: false }, { status: 401 });
  throw new Error("Error-inbox drill: intentional server error");
}
