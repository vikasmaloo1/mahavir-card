CREATE TABLE "branding_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assetKey" text NOT NULL,
	"assetType" text DEFAULT 'ASSET' NOT NULL,
	"storageKey" text NOT NULL,
	"imageUrl" text NOT NULL,
	"originalFilename" text NOT NULL,
	"contentType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"altText" text,
	"isPublic" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branding_assets_assetKey_unique" UNIQUE("assetKey"),
	CONSTRAINT "branding_assets_storageKey_unique" UNIQUE("storageKey")
);
--> statement-breakpoint
CREATE TABLE "category_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoryId" uuid NOT NULL,
	"imageUrl" text NOT NULL,
	"storageKey" text NOT NULL,
	"originalFilename" text NOT NULL,
	"contentType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"altText" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_images_storageKey_unique" UNIQUE("storageKey")
);
--> statement-breakpoint
CREATE TABLE "stored_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentType" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" uuid NOT NULL,
	"customerId" uuid,
	"quoteId" uuid,
	"orderId" uuid,
	"storageKey" text NOT NULL,
	"originalFilename" text NOT NULL,
	"contentType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"etag" text,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"isPrivate" boolean DEFAULT true NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stored_documents_storageKey_unique" UNIQUE("storageKey")
);
--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "storageProvider" text DEFAULT 'R2' NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "etag" text;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "replacesArtworkId" uuid;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "uploadExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "originalFilename" text;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "contentType" text;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "fileSize" integer;--> statement-breakpoint
ALTER TABLE "category_images" ADD CONSTRAINT "category_images_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_documents" ADD CONSTRAINT "stored_documents_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_documents" ADD CONSTRAINT "stored_documents_quoteId_quotes_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_documents" ADD CONSTRAINT "stored_documents_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_documents" ADD CONSTRAINT "stored_documents_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branding_assets_type_idx" ON "branding_assets" USING btree ("assetType");--> statement-breakpoint
CREATE INDEX "category_images_category_idx" ON "category_images" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "stored_documents_customer_idx" ON "stored_documents" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "stored_documents_quote_idx" ON "stored_documents" USING btree ("quoteId");--> statement-breakpoint
CREATE INDEX "stored_documents_order_idx" ON "stored_documents" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "stored_documents_entity_idx" ON "stored_documents" USING btree ("entityType","entityId");