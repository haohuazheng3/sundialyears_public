import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Neon over HTTP (pooled host) — no connection to hold open in serverless. Throws if DATABASE_URL is missing. */
export function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _db = drizzle(neon(url), { schema });
  return _db;
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
