CREATE INDEX "tax_notices_new_idx" ON "tax_notices" USING btree ("user_id") WHERE "tax_notices"."seen_at" is null;--> statement-breakpoint
-- Before this change a firm's first read marked the notices GİB already showed as read seen at that moment, so its history sat in
-- the week-long list as if found then. Now that history is seen at the epoch: same rows, never listed, never new. Those rows were
-- written with seen_at = first_seen_at in one statement (seconds apart at most, either way: app and database clocks); a Gördüm
-- comes from a person, later.
UPDATE "tax_notices" SET "seen_at" = 'epoch' WHERE "read_on_gib" AND "seen_at" IS NOT NULL AND abs(extract(epoch from "seen_at" - "first_seen_at")) < 5;
--> statement-breakpoint
-- Scans now keep only notices sent in the last week (src/lib/notices.ts recentNotice). Ones brought in earlier that were already
-- more than a week old when found (e.g. sent in June, found in November) leave the list and the count the same way.
UPDATE "tax_notices" SET "seen_at" = 'epoch' WHERE coalesce("sent_at", "served_at") ~ '^\d{2}[./]\d{2}[./]\d{4}' AND to_date(replace(substr(coalesce("sent_at", "served_at"), 1, 10), '.', '/'), 'DD/MM/YYYY') < ("first_seen_at" AT TIME ZONE 'Europe/Istanbul')::date - 7;
