-- Console surface: append-only handover notes, accountable challenge release,
-- and recorded overrides of UNSAFE contact. No unique constraint is added to
-- case_notes — two officers may file notes in the same instant — so there are
-- no pre-existing duplicates to clean up.
CREATE TABLE "case_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"institution_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"reason_code" text NOT NULL,
	"type" text DEFAULT 'HANDOVER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "released_by" uuid;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "contact_override_by" uuid;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "contact_override_reason" text;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "contact_override_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_notes_incident_idx" ON "case_notes" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "case_notes_inst_idx" ON "case_notes" USING btree ("institution_id");--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_contact_override_by_users_id_fk" FOREIGN KEY ("contact_override_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;