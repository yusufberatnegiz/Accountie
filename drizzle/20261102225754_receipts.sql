CREATE TABLE "account_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"line_no" integer NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL,
	"debit_kurus" bigint DEFAULT 0 NOT NULL,
	"credit_kurus" bigint DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"document_no" text NOT NULL,
	"document_date" date,
	"document_type" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"babs" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"vendor_name" text,
	"tax_number" text,
	"receipt_no" text,
	"receipt_date" date,
	"total_kurus" bigint,
	"payment_method" text,
	"category" text,
	"extraction" jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"exported_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_rules_user_kind_key_idx" ON "account_rules" USING btree ("user_id","kind","key");--> statement-breakpoint
CREATE INDEX "journal_lines_receipt_idx" ON "journal_lines" USING btree ("receipt_id","line_no");--> statement-breakpoint
CREATE INDEX "receipts_user_created_idx" ON "receipts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE POLICY "account_rules_owner" ON "account_rules" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "journal_lines_owner" ON "journal_lines" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "receipts_owner" ON "receipts" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));