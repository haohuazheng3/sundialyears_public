CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"user_agent" text,
	"ip_hash" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"top_frame" text,
	"stack" text,
	"route" text,
	"sample" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"environment" text DEFAULT 'production' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"page" text NOT NULL,
	"helpful" boolean NOT NULL,
	"comment" text,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"to_addr" text NOT NULL,
	"from_addr" text NOT NULL,
	"subject" text,
	"text" text,
	"auth_results" text,
	"headers" jsonb
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_watch" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"last_hash" text,
	"last_status" integer,
	"last_checked_at" timestamp with time zone,
	"last_changed_at" timestamp with time zone,
	"note" text,
	CONSTRAINT "source_watch_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "contact_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "errors_fingerprint_env_idx" ON "errors" USING btree ("fingerprint","environment");--> statement-breakpoint
CREATE INDEX "errors_open_idx" ON "errors" USING btree ("resolved_at","last_seen");--> statement-breakpoint
CREATE INDEX "feedback_page_idx" ON "feedback" USING btree ("page");--> statement-breakpoint
CREATE INDEX "inbox_received_idx" ON "inbox_messages" USING btree ("received_at");