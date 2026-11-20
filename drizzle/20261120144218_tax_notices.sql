CREATE TABLE "notice_scans" (
	"firm_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notice_scans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tax_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"gib_id" text NOT NULL,
	"institution" text NOT NULL,
	"sub_unit" text,
	"doc_type" text,
	"doc_no" text,
	"sent_at" text,
	"served_at" text,
	"read_on_gib" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tax_notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notice_scans" ADD CONSTRAINT "notice_scans_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_notices" ADD CONSTRAINT "tax_notices_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notice_scans_user_idx" ON "notice_scans" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_notices_firm_gib_idx" ON "tax_notices" USING btree ("firm_id","gib_id");--> statement-breakpoint
CREATE INDEX "tax_notices_user_idx" ON "tax_notices" USING btree ("user_id","first_seen_at");--> statement-breakpoint
CREATE POLICY "notice_scans_owner" ON "notice_scans" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "tax_notices_owner" ON "tax_notices" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
-- Supabase Data API roles: no grants on new tables (default privileges already revoke them; explicit here too).
REVOKE ALL ON TABLE "tax_notices", "notice_scans" FROM anon, authenticated;
