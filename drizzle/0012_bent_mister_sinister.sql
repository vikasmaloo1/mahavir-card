ALTER TABLE "artwork_requirements" ADD COLUMN "acceptedFormats" jsonb DEFAULT '["CDR"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "artwork_requirements" ADD COLUMN "pageInstructions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "artwork_requirements" ADD COLUMN "multiplePageInstructions" text;