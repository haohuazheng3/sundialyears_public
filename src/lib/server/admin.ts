import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sy_admin";
const TTL_SECONDS = 60 * 60 * 24 * 14;

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function makeSessionToken(nowSeconds: number) {
  const exp = String(nowSeconds + TTL_SECONDS);
  return { token: `${exp}.${sign(exp)}`, maxAge: TTL_SECONDS };
}

export function verifySessionToken(token: string | undefined | null, nowSeconds: number) {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < nowSeconds) return false;
  try {
    return safeEqual(mac, sign(exp));
  } catch {
    return false;
  }
}

export function checkPassword(password: string) {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  return safeEqual(password, want);
}

/** For route handlers: admin cookie, or `Authorization: Bearer <ADMIN_SESSION_SECRET>` for scripted checks. */
export async function isAdminRequest(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (auth && secret && safeEqual(auth, `Bearer ${secret}`)) return true;
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value, Math.floor(Date.now() / 1000));
}

/** For server components inside <Suspense>. */
export async function isAdmin() {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value, Math.floor(Date.now() / 1000));
}
