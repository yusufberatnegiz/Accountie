CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"tax_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "firm_id" uuid;--> statement-breakpoint
CREATE INDEX "firms_user_name_idx" ON "firms" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipts_firm_created_idx" ON "receipts" USING btree ("firm_id","created_at");--> statement-breakpoint
CREATE POLICY "firms_owner" ON "firms" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));