CREATE TABLE "artwork_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"pricingRuleId" uuid,
	"scopeKey" text NOT NULL,
	"artworkRequired" boolean DEFAULT false NOT NULL,
	"minFileSize" integer,
	"maxFileSize" integer,
	"maxFiles" integer DEFAULT 1 NOT NULL,
	"designWidth" numeric(12, 3),
	"designHeight" numeric(12, 3),
	"designUnit" text DEFAULT 'mm' NOT NULL,
	"bleedWidth" numeric(12, 3),
	"bleedHeight" numeric(12, 3),
	"safeAreaWidth" numeric(12, 3),
	"safeAreaHeight" numeric(12, 3),
	"finalWidth" numeric(12, 3),
	"finalHeight" numeric(12, 3),
	"orientation" text,
	"additionalInstructions" text,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "product_addons_product_addon_idx";--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "productId" uuid;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "pricingRuleId" uuid;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "previewUrl" text;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "replacedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_addons" ADD COLUMN "pricingRuleId" uuid;--> statement-breakpoint
ALTER TABLE "artwork_requirements" ADD CONSTRAINT "artwork_requirements_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artwork_requirements" ADD CONSTRAINT "artwork_requirements_pricingRuleId_pricing_rules_id_fk" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artwork_requirements_product_scope_idx" ON "artwork_requirements" USING btree ("productId","scopeKey");--> statement-breakpoint
CREATE INDEX "artwork_requirements_pricing_rule_idx" ON "artwork_requirements" USING btree ("pricingRuleId");--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_pricingRuleId_pricing_rules_id_fk" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_pricingRuleId_pricing_rules_id_fk" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_addons_scope_addon_idx" ON "product_addons" USING btree ("productId","pricingRuleId","addonId");--> statement-breakpoint
CREATE INDEX "product_addons_pricing_rule_idx" ON "product_addons" USING btree ("pricingRuleId");