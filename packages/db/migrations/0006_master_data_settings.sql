CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holidays_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "master_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_data_type_code_uq" UNIQUE("type","code"),
	CONSTRAINT "master_data_type_valid" CHECK ("master_data"."type" in ('JOB_CATEGORY', 'SKILL', 'EDUCATION_LEVEL', 'LANGUAGE', 'CITY', 'AREA', 'DOCUMENT_TYPE', 'REJECTION_REASON', 'REFUSAL_REASON', 'BLACKLIST_REASON', 'VERIFICATION_REJECTION_REASON', 'WITHDRAWAL_REASON')),
	CONSTRAINT "master_data_code_format" CHECK ("master_data"."code" ~ '^[A-Z0-9]+(_[A-Z0-9]+)*$'),
	CONSTRAINT "master_data_meta_object" CHECK (jsonb_typeof("master_data"."meta") = 'object')
);
--> statement-breakpoint
CREATE TABLE "match_radius_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"branch_id" uuid,
	"category_id" uuid,
	"preferred_m" integer NOT NULL,
	"max_m" integer NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_radius_policies_scope_ref" CHECK (("match_radius_policies"."scope" = 'GLOBAL' and "match_radius_policies"."branch_id" is null and "match_radius_policies"."category_id" is null)
       or ("match_radius_policies"."scope" = 'BRANCH' and "match_radius_policies"."branch_id" is not null and "match_radius_policies"."category_id" is null)
       or ("match_radius_policies"."scope" = 'CATEGORY' and "match_radius_policies"."category_id" is not null and "match_radius_policies"."branch_id" is null)),
	CONSTRAINT "match_radius_policies_range" CHECK ("match_radius_policies"."preferred_m" >= 500 and "match_radius_policies"."preferred_m" <= "match_radius_policies"."max_m" and "match_radius_policies"."max_m" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"branch_id" uuid,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_branch_uq" UNIQUE NULLS NOT DISTINCT("key","branch_id")
);
--> statement-breakpoint
ALTER TABLE "master_data" ADD CONSTRAINT "master_data_parent_id_master_data_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."master_data"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_radius_policies" ADD CONSTRAINT "match_radius_policies_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_radius_policies" ADD CONSTRAINT "match_radius_policies_category_id_master_data_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."master_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_radius_policies" ADD CONSTRAINT "match_radius_policies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_data_type_idx" ON "master_data" USING btree ("type","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "master_data_parent_idx" ON "master_data" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_radius_policies_global_uq" ON "match_radius_policies" USING btree ("scope") WHERE "match_radius_policies"."scope" = 'GLOBAL';--> statement-breakpoint
CREATE UNIQUE INDEX "match_radius_policies_branch_uq" ON "match_radius_policies" USING btree ("branch_id") WHERE "match_radius_policies"."branch_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "match_radius_policies_category_uq" ON "match_radius_policies" USING btree ("category_id") WHERE "match_radius_policies"."category_id" is not null;