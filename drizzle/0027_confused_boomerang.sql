CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid,
	"event" text NOT NULL,
	"channel" text DEFAULT 'EMAIL' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"relatedEntityType" text NOT NULL,
	"relatedEntityId" uuid NOT NULL,
	"status" text DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_log_dedupe_idx" ON "notification_log" USING btree ("event","relatedEntityType","relatedEntityId");--> statement-breakpoint
CREATE INDEX "notification_log_customer_idx" ON "notification_log" USING btree ("customerId","createdAt");