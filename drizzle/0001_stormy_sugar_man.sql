DROP INDEX "session_user_idx";--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("userId");