ALTER TABLE "products" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "orderable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quoteable" boolean DEFAULT true NOT NULL;