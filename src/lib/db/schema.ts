import { pgTable, serial, text, integer, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

/** Self-hosted error inbox: one row per fingerprint (error name + first stack frame + route). */
export const errors = pgTable(
  "errors",
  {
    id: serial("id").primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    source: text("source").notNull(), // server | client | edge | cron
    severity: text("severity").notNull().default("error"), // error | warning
    name: text("name").notNull(),
    message: text("message").notNull(),
    topFrame: text("top_frame"),
    stack: text("stack"),
    route: text("route"),
    sample: jsonb("sample"), // last occurrence context (url, ua, digest…)
    count: integer("count").notNull().default(1),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    environment: text("environment").notNull().default("production"),
  },
  (t) => [uniqueIndex("errors_fingerprint_env_idx").on(t.fingerprint, t.environment), index("errors_open_idx").on(t.resolvedAt, t.lastSeen)],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name"),
    email: text("email").notNull(),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    page: text("page"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    status: text("status").notNull().default("new"), // new | replied | spam | closed
    notified: boolean("notified").notNull().default(false),
  },
  (t) => [index("contact_created_idx").on(t.createdAt)],
);

/** "Was this helpful?" votes + optional comment, per page/tool. */
export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    page: text("page").notNull(),
    helpful: boolean("helpful").notNull(),
    comment: text("comment"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("feedback_page_idx").on(t.page)],
);

/** test@sundialyears.com → Cloudflare Email Worker → here. Used to prove mail delivery (DKIM/SPF headers). */
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: serial("id").primaryKey(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    toAddr: text("to_addr").notNull(),
    fromAddr: text("from_addr").notNull(),
    subject: text("subject"),
    text: text("text"),
    authResults: text("auth_results"),
    headers: jsonb("headers"),
  },
  (t) => [index("inbox_received_idx").on(t.receivedAt)],
);

/** Official pages we watch for new numbers (SSA/CMS/IRS). Written by the watcher job. */
export const sourceWatch = pgTable("source_watch", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  url: text("url").notNull(),
  label: text("label").notNull(),
  lastHash: text("last_hash"),
  lastStatus: integer("last_status"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
  note: text("note"),
});

/** Fixed-window counters for app-level rate limiting of write endpoints. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});
