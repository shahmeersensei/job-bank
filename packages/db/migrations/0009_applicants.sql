CREATE TABLE "applicant_addresses" (
	"applicant_id" uuid PRIMARY KEY NOT NULL,
	"address_line" text NOT NULL,
	"city_code" text NOT NULL,
	"area_code" text,
	"location" geography(Point, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"issued_month" date,
	"expires_month" date,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"type_code" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" text DEFAULT 'PENDING_UPLOAD' NOT NULL,
	"scan_result" text,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone,
	"replaced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_documents_storageKey_unique" UNIQUE("storage_key"),
	CONSTRAINT "applicant_documents_status_valid" CHECK ("applicant_documents"."status" in ('PENDING_UPLOAD', 'UPLOADED', 'ACCEPTED', 'REJECTED')),
	CONSTRAINT "applicant_documents_size_positive" CHECK ("applicant_documents"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "applicant_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"level_code" text NOT NULL,
	"institution" text,
	"field_of_study" text,
	"completion_year" smallint,
	"is_current" boolean DEFAULT false NOT NULL,
	"grade" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"job_title" text NOT NULL,
	"category_code" text,
	"start_month" date NOT NULL,
	"end_month" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_experience_dates" CHECK (("applicant_experience"."is_current" and "applicant_experience"."end_month" is null)
       or (not "applicant_experience"."is_current" and "applicant_experience"."end_month" is not null and "applicant_experience"."end_month" >= "applicant_experience"."start_month"))
);
--> statement-breakpoint
CREATE TABLE "applicant_languages" (
	"applicant_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"proficiency" text NOT NULL,
	CONSTRAINT "applicant_languages_applicant_id_language_code_pk" PRIMARY KEY("applicant_id","language_code"),
	CONSTRAINT "applicant_languages_proficiency_valid" CHECK ("applicant_languages"."proficiency" in ('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE'))
);
--> statement-breakpoint
CREATE TABLE "applicant_preferences" (
	"applicant_id" uuid PRIMARY KEY NOT NULL,
	"category_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_salary_pkr" integer,
	"shifts" text[] DEFAULT '{}'::text[] NOT NULL,
	"job_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"willing_radius_m" integer,
	"available_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_preferences_salary" CHECK ("applicant_preferences"."min_salary_pkr" is null or "applicant_preferences"."min_salary_pkr" >= 0),
	CONSTRAINT "applicant_preferences_radius" CHECK ("applicant_preferences"."willing_radius_m" is null or "applicant_preferences"."willing_radius_m" between 500 and 10000)
);
--> statement-breakpoint
CREATE TABLE "applicant_skills" (
	"applicant_id" uuid NOT NULL,
	"skill_code" text NOT NULL,
	"level" text NOT NULL,
	"years" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "applicant_skills_applicant_id_skill_code_pk" PRIMARY KEY("applicant_id","skill_code"),
	CONSTRAINT "applicant_skills_level_valid" CHECK ("applicant_skills"."level" in ('BEGINNER', 'INTERMEDIATE', 'EXPERT')),
	CONSTRAINT "applicant_skills_years_range" CHECK ("applicant_skills"."years" between 0 and 50)
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"branch_id" uuid,
	"full_name" text NOT NULL,
	"father_name" text NOT NULL,
	"cnic" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"status_reason" text,
	"identity_status" text DEFAULT 'UNVERIFIED' NOT NULL,
	"profile_completeness" smallint DEFAULT 0 NOT NULL,
	"has_no_experience" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "applicants_cnic_unique" UNIQUE("cnic"),
	CONSTRAINT "applicants_cnic_format" CHECK ("applicants"."cnic" ~ '^[1-9][0-9]{12}$'),
	CONSTRAINT "applicants_status_valid" CHECK ("applicants"."status" in ('DRAFT', 'ACTIVE', 'INACTIVE', 'RESTRICTED')),
	CONSTRAINT "applicants_identity_status_valid" CHECK ("applicants"."identity_status" in ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
	CONSTRAINT "applicants_gender_valid" CHECK ("applicants"."gender" in ('MALE', 'FEMALE', 'UNDISCLOSED')),
	CONSTRAINT "applicants_completeness_range" CHECK ("applicants"."profile_completeness" between 0 and 100),
	CONSTRAINT "applicants_active_needs_branch" CHECK ("applicants"."status" = 'DRAFT' or "applicants"."branch_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "identity_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"cnic" text NOT NULL,
	"method" text NOT NULL,
	"outcome" text NOT NULL,
	"notes" text,
	"front_document_id" uuid,
	"back_document_id" uuid,
	"verified_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_verifications_method_valid" CHECK ("identity_verifications"."method" in ('DOCUMENT_REVIEW', 'IN_PERSON')),
	CONSTRAINT "identity_verifications_outcome_valid" CHECK ("identity_verifications"."outcome" in ('VERIFIED', 'REJECTED'))
);
--> statement-breakpoint
ALTER TABLE "applicant_addresses" ADD CONSTRAINT "applicant_addresses_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_certifications" ADD CONSTRAINT "applicant_certifications_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_education" ADD CONSTRAINT "applicant_education_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_experience" ADD CONSTRAINT "applicant_experience_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_languages" ADD CONSTRAINT "applicant_languages_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_preferences" ADD CONSTRAINT "applicant_preferences_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_skills" ADD CONSTRAINT "applicant_skills_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_front_document_id_applicant_documents_id_fk" FOREIGN KEY ("front_document_id") REFERENCES "public"."applicant_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_back_document_id_applicant_documents_id_fk" FOREIGN KEY ("back_document_id") REFERENCES "public"."applicant_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applicant_certifications_applicant_idx" ON "applicant_certifications" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "applicant_documents_current_idx" ON "applicant_documents" USING btree ("applicant_id","type_code") WHERE "applicant_documents"."replaced_at" is null;--> statement-breakpoint
CREATE INDEX "applicant_education_applicant_idx" ON "applicant_education" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "applicant_experience_applicant_idx" ON "applicant_experience" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "applicant_skills_skill_idx" ON "applicant_skills" USING btree ("skill_code");--> statement-breakpoint
CREATE INDEX "applicants_branch_status_idx" ON "applicants" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "identity_verifications_applicant_idx" ON "identity_verifications" USING btree ("applicant_id","created_at");