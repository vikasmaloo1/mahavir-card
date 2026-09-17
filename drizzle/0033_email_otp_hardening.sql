CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_otp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_otp_requests_email_created_idx" ON "email_otp_requests" USING btree ("email","createdAt");
--> statement-breakpoint
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false AND "createdAt" < '2026-09-18T00:00:00+05:30';
