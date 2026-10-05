ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "leadStatus" text DEFAULT 'NEW LEAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastContactedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastContactMethod" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_lead_status_idx" ON "customers" USING btree ("leadStatus");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_last_contacted_idx" ON "customers" USING btree ("lastContactedAt");
