-- PRD §7.2 + rule 8: the audit trail is immutable. Trigger blocks UPDATE/DELETE/TRUNCATE
-- for everyone (SQLSTATE JB001); app_rw additionally loses UPDATE/DELETE privileges.
SELECT jobbank_make_append_only('audit_logs');
