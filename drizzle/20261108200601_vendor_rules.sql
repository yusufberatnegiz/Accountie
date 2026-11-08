CREATE TABLE "vendor_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"tax_number" text NOT NULL,
	"vendor_name" text,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vendor_rules" ADD CONSTRAINT "vendor_rules_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_rules_firm_tax_idx" ON "vendor_rules" USING btree ("firm_id","tax_number");--> statement-breakpoint
CREATE INDEX "vendor_rules_user_idx" ON "vendor_rules" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "vendor_rules_owner" ON "vendor_rules" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
-- Supabase Data API roles: no grants on new tables (default privileges already revoke them; explicit here too).
REVOKE ALL ON TABLE "vendor_rules" FROM anon, authenticated;
