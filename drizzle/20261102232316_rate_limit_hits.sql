CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limit_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "rate_limit_hits_key_created_idx" ON "rate_limit_hits" USING btree ("key","created_at");--> statement-breakpoint
CREATE POLICY "rate_limit_hits_server_only" ON "rate_limit_hits" AS PERMISSIVE FOR ALL TO public USING (false) WITH CHECK (false);