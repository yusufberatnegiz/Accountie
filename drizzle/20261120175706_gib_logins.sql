CREATE TABLE "gib_login_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"network" text
);
--> statement-breakpoint
ALTER TABLE "gib_login_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gib_logins" (
	"firm_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username_sealed" text NOT NULL,
	"password_sealed" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gib_logins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gib_scan_grants" (
	"user_id" text PRIMARY KEY NOT NULL,
	"until" timestamp with time zone NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"network" text NOT NULL,
	"mac" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gib_scan_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gib_login_reads" ADD CONSTRAINT "gib_login_reads_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gib_logins" ADD CONSTRAINT "gib_logins_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gib_login_reads_user_idx" ON "gib_login_reads" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "gib_logins_user_idx" ON "gib_logins" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "gib_login_reads_owner" ON "gib_login_reads" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "gib_logins_owner" ON "gib_logins" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "gib_scan_grants_owner" ON "gib_scan_grants" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
REVOKE ALL ON TABLE "gib_logins", "gib_scan_grants", "gib_login_reads" FROM anon, authenticated;
