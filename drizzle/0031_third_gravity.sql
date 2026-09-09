ALTER TABLE "customers" ALTER COLUMN "creditEnabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "gstNumber" text DEFAULT '24AIUPJ2271L1ZV';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoiceNumber" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoiceYear" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoiceSequence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoiceDate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paidAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refundedAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "balanceBefore" numeric(12, 2);--> statement-breakpoint
CREATE UNIQUE INDEX "orders_invoice_number_idx" ON "orders" USING btree ("invoiceNumber");--> statement-breakpoint
CREATE INDEX "orders_invoice_year_seq_idx" ON "orders" USING btree ("invoiceYear","invoiceSequence");