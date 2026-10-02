-- M6: keep updated_at accurate for writes that bypass the ORM.
SELECT jobbank_attach_updated_at('applicants');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('applicant_addresses');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('applicant_preferences');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('applicant_documents');
--> statement-breakpoint
-- Identity checks are evidence: never edited or deleted (same guard as audit_logs).
SELECT jobbank_make_append_only('identity_verifications');
--> statement-breakpoint
-- Matching (M9) filters applicants by distance: ST_DWithin needs a GiST index.
CREATE INDEX IF NOT EXISTS applicant_addresses_location_gix ON applicant_addresses USING gist (location);
--> statement-breakpoint
-- Staff search by name.
CREATE INDEX IF NOT EXISTS applicants_full_name_lower_idx ON applicants (lower(full_name) text_pattern_ops);
--> statement-breakpoint
-- New DOCUMENT_TYPE meta flag: certificates and letters keep several files; the rest replace.
UPDATE master_data
SET meta = meta || jsonb_build_object('multiple', code IN ('EDUCATION_CERTIFICATE', 'EXPERIENCE_LETTER'))
WHERE type = 'DOCUMENT_TYPE' AND NOT meta ? 'multiple';
