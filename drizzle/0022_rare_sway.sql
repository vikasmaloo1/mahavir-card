ALTER TABLE "order_items" ADD COLUMN "taxableAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "cgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "igstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "taxableSubtotal" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "taxType" text DEFAULT 'INTRA_STATE' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "taxRate" numeric(6, 3) DEFAULT '18.000';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cgstRate" numeric(6, 3) DEFAULT '9.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sgstRate" numeric(6, 3) DEFAULT '9.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "igstRate" numeric(6, 3) DEFAULT '0.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "igstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "taxJurisdictionState" text DEFAULT 'GJ';--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "taxableAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "cgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "sgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "igstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "taxableSubtotal" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "taxType" text DEFAULT 'INTRA_STATE' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "taxRate" numeric(6, 3) DEFAULT '18.000';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cgstRate" numeric(6, 3) DEFAULT '9.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "sgstRate" numeric(6, 3) DEFAULT '9.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "sgstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "igstRate" numeric(6, 3) DEFAULT '0.000' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "igstAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "taxJurisdictionState" text DEFAULT 'GJ';