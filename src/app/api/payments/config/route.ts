import { eq } from "drizzle-orm";

import { jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { businessSettings } from "@/lib/db/schema";
import { razorpayConfigured } from "@/lib/payment-service";

export async function GET() {
  const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1);

  return jsonOk({
    razorpayEnabled: razorpayConfigured(),
    b2c: {
      beneficiary: settings?.b2cBankBeneficiary || "MAHAVIR CARD",
      bankName: settings?.b2cBankName || "BANK OF BARODA",
      branch: settings?.b2cBankBranch || "AHMEDABAD(M) BRANCH",
      accountNumber: settings?.b2cBankAccountNumber || "03280200003947",
      ifsc: settings?.b2cBankIfsc || "BARB0GANAHM",
      upiId: settings?.b2cUpiId || "mahavircard2011-2@oksbi",
      qrImageUrl: settings?.b2cQrImageUrl || "/images/qr/b2c-qr.jpg",
    },
    b2b: {
      beneficiary: settings?.b2bBankBeneficiary || "MAHAVIR CARD & PAPER CUTTING",
      bankName: settings?.b2bBankName || "BANK OF BARODA",
      branch: settings?.b2bBankBranch || "AHMEDABAD(M) BRANCH",
      accountNumber: settings?.b2bBankAccountNumber || "12410200000662",
      ifsc: settings?.b2bBankIfsc || "BARB0GANAHM",
      upiId: settings?.b2bUpiId || "mahavircard2011-4@oksbi",
      qrImageUrl: settings?.b2bQrImageUrl || "/images/qr/b2b-qr.jpg",
    },
  });
}
