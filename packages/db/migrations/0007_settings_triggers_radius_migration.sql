-- M5: keep updated_at accurate for writes that bypass the ORM.
SELECT jobbank_attach_updated_at('master_data');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('holidays');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('system_settings');
--> statement-breakpoint
SELECT jobbank_attach_updated_at('match_radius_policies');
--> statement-breakpoint
-- The global radius policy always exists (PRD: 8 km preferred, 10 km max).
INSERT INTO match_radius_policies (scope, preferred_m, max_m)
VALUES ('GLOBAL', 8000, 10000)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Owner decision (2026-10-02): branches.service_radius_m merges into a BRANCH policy.
-- Only radii that differ from the old 10 km default were set on purpose; the rest inherit
-- the global policy. The preferred radius can never exceed the max.
INSERT INTO match_radius_policies (scope, branch_id, preferred_m, max_m)
SELECT 'BRANCH', id, LEAST(8000, LEAST(service_radius_m, 10000)), LEAST(service_radius_m, 10000)
FROM branches
WHERE service_radius_m <> 10000
ON CONFLICT DO NOTHING;
