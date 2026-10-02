-- Keep updated_at accurate for writes that bypass the ORM.
SELECT jobbank_attach_updated_at('users');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('sessions');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('accounts');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('verifications');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('branches');
--> statement-breakpoint
-- Emails are unique regardless of case (Better Auth lowercases, but imports/admin writes may not).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));
--> statement-breakpoint
-- Phone numbers are stored in E.164 (+923001234567).
ALTER TABLE users ADD CONSTRAINT users_phone_e164 CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{7,14}$');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS branches_location_gix ON branches USING gist (location);
