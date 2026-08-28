ALTER TABLE "notes" ADD COLUMN "related_type" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "related_id" uuid;--> statement-breakpoint
CREATE INDEX "notes_reminder_idx" ON "notes" USING btree ("owner_id","reminder_at");