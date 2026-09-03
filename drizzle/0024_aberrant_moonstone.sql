CREATE TABLE "design_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid,
	"categoryId" uuid,
	"title" text NOT NULL,
	"description" text,
	"imageUrl" text,
	"storageKey" text,
	"sourceFileUrl" text,
	"sourceFileStorageKey" text,
	"licenseSource" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "design_templates_storageKey_unique" UNIQUE("storageKey"),
	CONSTRAINT "design_templates_sourceFileStorageKey_unique" UNIQUE("sourceFileStorageKey")
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"normalizedQuery" text,
	"customerState" text,
	"customerType" text,
	"resultCount" integer DEFAULT 0 NOT NULL,
	"confidence" text DEFAULT 'NONE' NOT NULL,
	"matchedProductId" uuid,
	"quoteFallbackInitiated" boolean DEFAULT false NOT NULL,
	"userId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "mobileImageUrl" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "mobileStorageKey" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "composition" text DEFAULT 'SPLIT_RIGHT' NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_matchedProductId_products_id_fk" FOREIGN KEY ("matchedProductId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "design_templates_category_idx" ON "design_templates" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "design_templates_product_idx" ON "design_templates" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "search_logs_query_idx" ON "search_logs" USING btree ("query");--> statement-breakpoint
CREATE INDEX "search_logs_created_idx" ON "search_logs" USING btree ("createdAt");