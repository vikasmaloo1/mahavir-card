CREATE TABLE "business_settings" (
	"id" text PRIMARY KEY DEFAULT 'primary' NOT NULL,
	"businessName" text DEFAULT 'Mahavir Card' NOT NULL,
	"addressLine1" text,
	"addressLine2" text,
	"city" text,
	"state" text,
	"postalCode" text,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"businessHours" text,
	"footerText" text,
	"logoAssetId" uuid,
	"updatedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "internalNotes" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "internalNotes" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "customerMessage" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_logoAssetId_branding_assets_id_fk" FOREIGN KEY ("logoAssetId") REFERENCES "public"."branding_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;