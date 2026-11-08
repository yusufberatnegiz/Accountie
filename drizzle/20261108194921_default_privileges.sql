-- Tables created later by this role (the migrations') get no grants for Supabase's Data API roles either, so a future table is
-- closed to them even if its migration forgets RLS. The existing tables were closed in 20261108192201_revoke_api_roles.sql.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
