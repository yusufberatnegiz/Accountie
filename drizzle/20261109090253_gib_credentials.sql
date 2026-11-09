CREATE TABLE "gib_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"username_sealed" text NOT NULL,
	"password_sealed" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "gib_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gib_credentials" ADD CONSTRAINT "gib_credentials_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gib_credentials_firm_idx" ON "gib_credentials" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "gib_credentials_user_idx" ON "gib_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "gib_credentials_owner" ON "gib_credentials" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
-- Supabase Data API roles: no grants on new tables (default privileges already revoke them; explicit here too).
REVOKE ALL ON TABLE "gib_credentials" FROM anon, authenticated;
