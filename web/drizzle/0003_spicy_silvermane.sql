DROP INDEX "raw_events_event_idx";--> statement-breakpoint
-- Remove duplicate raw events created by retries before the uniqueness rule
-- existed. Keep the earliest row for each (institution, event) pair.
DELETE FROM "raw_events" a USING "raw_events" b
WHERE a.institution_id = b.institution_id
  AND a.event_id = b.event_id
  AND a.ctid > b.ctid;--> statement-breakpoint
-- Remove duplicate action rows from concurrent decisions.
DELETE FROM "actions" a USING "actions" b
WHERE a.incident_id = b.incident_id
  AND a.type = b.type
  AND a.ctid > b.ctid;--> statement-breakpoint
CREATE UNIQUE INDEX "actions_incident_type_uq" ON "actions" USING btree ("incident_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_events_event_uq" ON "raw_events" USING btree ("institution_id","event_id");
