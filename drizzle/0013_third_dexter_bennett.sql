ALTER TABLE "cart_items" ADD COLUMN "calculatedAmount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "pricingSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryMethod" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryState" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryPrice" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deliveryAddress" jsonb;