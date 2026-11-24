CREATE INDEX "tax_notices_new_idx" ON "tax_notices" USING btree ("user_id") WHERE "tax_notices"."seen_at" is null;--> statement-breakpoint
-- Before this change a firm's first read marked the notices GİB already showed as read seen at that moment, so its history sat in
-- the week-long list as if found then. Now that history is seen at the epoch: same rows, never listed, never new. Those rows were
-- written with seen_at = first_seen_at in one statement (seconds apart at most, either way: app and database clocks); a Gördüm
-- comes from a person, later.
UPDATE "tax_notices" SET "seen_at" = 'epoch' WHERE "read_on_gib" AND "seen_at" IS NOT NULL AND abs(extract(epoch from "seen_at" - "first_seen_at")) < 5;
