ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "orderable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "quoteable" boolean DEFAULT true NOT NULL;
