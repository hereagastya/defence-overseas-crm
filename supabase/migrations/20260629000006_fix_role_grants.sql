-- ============================================================
-- Migration 006: Explicit object-level grants for PostgREST
-- ============================================================
--
-- Root cause: Supabase's newer projects do not automatically
-- grant table-level privileges to API roles when tables are
-- created via SQL migrations. service_role bypasses RLS but
-- still requires a PostgreSQL-level GRANT to pass object
-- privilege checks. Without it, PostgREST returns:
--   "permission denied for table <name>"  (SQLSTATE 42501)
-- regardless of any RLS policies.
--
-- Fix: grant all DML operations on every public table to both
-- API roles, then set ALTER DEFAULT PRIVILEGES so future
-- tables in later migrations inherit the same grants
-- automatically.
--
-- authenticated: all DML allowed at the table level;
--   RLS policies (migration 004) control which rows each
--   user can actually read or write.
--
-- service_role: all DML allowed; bypasses RLS entirely.
--   Used exclusively by the API server (never the browser).
--

-- ── Existing tables ───────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO service_role;

-- ── Future tables (added in later migrations) ─────────────────
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
