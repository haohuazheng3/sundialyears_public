import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db/client";
import { notifyOwner } from "./notify";

export type ErrorSource = "server" | "client" | "edge" | "cron";

export interface CapturedError {
  source: ErrorSource;
  name?: string;
  message: string;
  stack?: string | null;
  route?: string | null;
  severity?: "error" | "warning";
  sample?: Record<string, unknown>;
}

export function environment() {
  return process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
}

/** First meaningful stack frame, with line/column numbers and hashes stripped so rebuilds group together. */
export function topFrame(stack?: string | null): string | null {
  if (!stack) return null;
  const line = stack
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at ") && !l.includes("node_modules") && !l.includes("node:internal"));
  if (!line) return null;
  return line
    .replace(/:\d+:\d+\)?$/, "")
    .replace(/\?[^\s)]*/, "")
    .replace(/[a-f0-9]{8,}/gi, "#")
    .slice(0, 240);
}

export function fingerprintOf(e: Pick<CapturedError, "name" | "message" | "stack" | "route">) {
  const frame = topFrame(e.stack) ?? (e.message || "").replace(/\d+/g, "#").slice(0, 120);
  return createHash("sha256")
    .update(`${e.name ?? "Error"}|${frame}|${e.route ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Write an error into the inbox (grouped by fingerprint). New or re-opened groups email the owner.
 * Never throws: a failing error-logger must not take the request down with it.
 */
export async function captureError(input: CapturedError): Promise<{ stored: boolean; isNew: boolean; fingerprint: string }> {
  const name = (input.name || "Error").slice(0, 120);
  const message = (input.message || "(no message)").slice(0, 2000);
  const stack = input.stack ? input.stack.slice(0, 8000) : null;
  const route = input.route ? input.route.slice(0, 300) : null;
  const fingerprint = fingerprintOf({ name, message, stack, route });
  const env = environment();
  console.error(`[error-inbox] ${input.source} ${name}: ${message}${route ? ` @ ${route}` : ""}`);
  if (!hasDb()) return { stored: false, isNew: false, fingerprint };
  try {
    const rows = await db()
      .insert(schema.errors)
      .values({
        fingerprint,
        source: input.source,
        severity: input.severity ?? "error",
        name,
        message,
        topFrame: topFrame(stack),
        stack,
        route,
        sample: input.sample ?? null,
        environment: env,
      })
      .onConflictDoUpdate({
        target: [schema.errors.fingerprint, schema.errors.environment],
        set: {
          count: sql`${schema.errors.count} + 1`,
          lastSeen: sql`now()`,
          message,
          stack,
          sample: input.sample ?? null,
          resolvedAt: null,
        },
      })
      .returning({ count: schema.errors.count, firstSeen: schema.errors.firstSeen, lastSeen: schema.errors.lastSeen });
    const row = rows[0];
    // xmax trick is unavailable through drizzle; a count of 1 means this group was just created.
    const isNew = row?.count === 1;
    if (isNew && env === "production" && (input.severity ?? "error") === "error") {
      await notifyOwner(
        `New ${input.source} error: ${name}`,
        [
          `${name}: ${message}`,
          route ? `Route: ${route}` : "",
          `Source: ${input.source} · Environment: ${env}`,
          stack ? `\n${stack.split("\n").slice(0, 8).join("\n")}` : "",
          "\nReview and resolve: https://sundialyears.com/admin/errors",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    return { stored: true, isNew, fingerprint };
  } catch (e) {
    console.error("[error-inbox] failed to store error", e);
    return { stored: false, isNew: false, fingerprint };
  }
}

export async function openErrorCount(): Promise<number> {
  const env = environment();
  const r = await db().execute(
    sql`select count(*)::int as n from errors where resolved_at is null and severity = 'error' and environment = ${env}`,
  );
  const rows = (r as unknown as { rows?: { n: number }[] }).rows ?? (r as unknown as { n: number }[]);
  return Number(rows[0]?.n ?? 0);
}
