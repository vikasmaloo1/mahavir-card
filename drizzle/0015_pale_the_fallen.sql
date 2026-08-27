CREATE TABLE "artwork_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artworkRequirementId" uuid NOT NULL,
	"pricingRuleId" uuid,
	"slotKey" text NOT NULL,
	"name" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"acceptedFormats" jsonb DEFAULT '["CDR"]'::jsonb NOT NULL,
	"maxFileSize" integer,
	"instructions" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_surcharges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"pricingRuleId" uuid,
	"locationScope" text NOT NULL,
	"city" text,
	"stateCode" text,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxInclusive" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"transactionType" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balanceAfter" numeric(12, 2),
	"reference" text,
	"notes" text,
	"createdBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "stateCode" text;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "jobName" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "customerType" text DEFAULT 'B2C' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "stateCode" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "creditEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "creditLimit" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "availableCredit" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "walletBalance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "paymentTermsDays" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "jobName" text;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "taxRate" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "productionTime" text;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "jobName" text;--> statement-breakpoint
ALTER TABLE "artwork_slots" ADD CONSTRAINT "artwork_slots_artworkRequirementId_artwork_requirements_id_fk" FOREIGN KEY ("artworkRequirementId") REFERENCES "public"."artwork_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artwork_slots" ADD CONSTRAINT "artwork_slots_pricingRuleId_pricing_rules_id_fk" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_surcharges" ADD CONSTRAINT "location_surcharges_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_surcharges" ADD CONSTRAINT "location_surcharges_pricingRuleId_pricing_rules_id_fk" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artwork_slots_requirement_key_idx" ON "artwork_slots" USING btree ("artworkRequirementId","slotKey");--> statement-breakpoint
CREATE INDEX "artwork_slots_pricing_rule_idx" ON "artwork_slots" USING btree ("pricingRuleId");--> statement-breakpoint
CREATE INDEX "location_surcharges_product_idx" ON "location_surcharges" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "location_surcharges_pricing_rule_idx" ON "location_surcharges" USING btree ("pricingRuleId");--> statement-breakpoint
CREATE INDEX "wallet_transactions_customer_idx" ON "wallet_transactions" USING btree ("customerId");