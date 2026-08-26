CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"pricingType" text DEFAULT 'FIXED' NOT NULL,
	"priceConfiguration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "product_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"addonId" uuid NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"taxInclusive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sectionId" uuid NOT NULL,
	"label" text,
	"content" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_content_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"title" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_delivery_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"deliveryMethod" text NOT NULL,
	"stateCode" text DEFAULT '*' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"taxInclusive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"imageUrl" text NOT NULL,
	"storageKey" text,
	"altText" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "pricingSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "taxInclusive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shortDescription" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productCode" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productReference" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productClass" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productionTime" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "artworkRequired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "artworkInstructions" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "referenceQuantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "referenceWeight" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "referenceWeightUnit" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pricesTaxInclusive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "archivedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "pricingSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_addonId_addons_id_fk" FOREIGN KEY ("addonId") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_content_items" ADD CONSTRAINT "product_content_items_sectionId_product_content_sections_id_fk" FOREIGN KEY ("sectionId") REFERENCES "public"."product_content_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_content_sections" ADD CONSTRAINT "product_content_sections_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_delivery_rules" ADD CONSTRAINT "product_delivery_rules_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_addons_product_addon_idx" ON "product_addons" USING btree ("productId","addonId");--> statement-breakpoint
CREATE INDEX "product_addons_product_idx" ON "product_addons" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "product_content_items_section_idx" ON "product_content_items" USING btree ("sectionId");--> statement-breakpoint
CREATE INDEX "product_content_sections_product_idx" ON "product_content_sections" USING btree ("productId");--> statement-breakpoint
CREATE UNIQUE INDEX "product_delivery_rules_product_method_state_idx" ON "product_delivery_rules" USING btree ("productId","deliveryMethod","stateCode");--> statement-breakpoint
CREATE INDEX "product_delivery_rules_product_idx" ON "product_delivery_rules" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("productId");