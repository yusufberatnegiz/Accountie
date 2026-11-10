CREATE TABLE "firm_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firm_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "firm_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firm_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "luca_sirket_id" text;--> statement-breakpoint
ALTER TABLE "firm_accounts" ADD CONSTRAINT "firm_accounts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_rules" ADD CONSTRAINT "firm_rules_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "firm_accounts_firm_code_idx" ON "firm_accounts" USING btree ("firm_id","code");--> statement-breakpoint
CREATE INDEX "firm_accounts_user_idx" ON "firm_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "firm_rules_firm_kind_key_idx" ON "firm_rules" USING btree ("firm_id","kind","key");--> statement-breakpoint
CREATE INDEX "firm_rules_user_idx" ON "firm_rules" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "firm_accounts_owner" ON "firm_accounts" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "firm_rules_owner" ON "firm_rules" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
-- Supabase Data API roles: no grants on new tables (default privileges already revoke them; explicit here too).
REVOKE ALL ON TABLE "firm_accounts", "firm_rules" FROM anon, authenticated;
