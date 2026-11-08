-- Supabase grants its Data API roles (anon, authenticated) access to new public tables. The app reaches these tables only from
-- the server as the table owner; the browser never queries them. RLS already shows those roles no rows; this takes the grants away too.
REVOKE ALL ON TABLE "firms", "receipts", "journal_lines", "account_rules", "extension_tokens", "rate_limit_hits" FROM anon, authenticated;
