CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"badge" text,
	"ctaLabel" text,
	"ctaUrl" text,
	"imageUrl" text,
	"storageKey" text,
	"placement" text DEFAULT 'HOME_HERO_BOTTOM' NOT NULL,
	"animationType" text DEFAULT 'FADE' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"startsAt" timestamp with time zone,
	"endsAt" timestamp with time zone,
	"updatedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "animationType" text DEFAULT 'MARQUEE' NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "priority" text DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banners_active_placement_idx" ON "banners" USING btree ("isActive","placement","sortOrder");