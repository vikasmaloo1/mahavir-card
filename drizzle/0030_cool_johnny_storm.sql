ALTER TABLE "business_settings" ADD COLUMN "b2cBankBeneficiary" text DEFAULT 'MAHAVIR CARD';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cBankName" text DEFAULT 'BANK OF BARODA';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cBankBranch" text DEFAULT 'AHMEDABAD(M) BRANCH';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cBankAccountNumber" text DEFAULT '03280200003947';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cBankIfsc" text DEFAULT 'BARB0GANAHM';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cUpiId" text DEFAULT 'mahavircard2011-2@oksbi';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2cQrImageUrl" text DEFAULT '/images/qr/b2c-qr.jpg';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bBankBeneficiary" text DEFAULT 'MAHAVIR CARD & PAPER CUTTING';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bBankName" text DEFAULT 'BANK OF BARODA';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bBankBranch" text DEFAULT 'AHMEDABAD(M) BRANCH';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bBankAccountNumber" text DEFAULT '12410200000662';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bBankIfsc" text DEFAULT 'BARB0GANAHM';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bUpiId" text DEFAULT 'mahavircard2011-4@oksbi';--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "b2bQrImageUrl" text DEFAULT '/images/qr/b2b-qr.jpg';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proofImageUrl" text;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "proofImageUrl" text;