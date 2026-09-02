import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, inquiries } from "@/lib/db/schema";
import { getSession, requireRole } from "@/lib/permissions";
import { inquirySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); return jsonOk(await db.select().from(inquiries).orderBy(desc(inquiries.createdAt))); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const input = await readBody(request, inquirySchema);
    const session = await getSession(request);
    const [customer] = session
      ? await db
          .select({
            id: customers.id,
            email: customers.email,
            contactName: customers.contactName,
            phone: customers.phone,
            companyName: customers.companyName,
          })
          .from(customers)
          .where(eq(customers.userId, session.user.id))
          .limit(1)
      : [];
    const [inquiry] = await db
      .insert(inquiries)
      .values({
        ...input,
        customerId: customer?.id ?? null,
        contactName: input.contactName || customer?.contactName || session?.user?.name || "Valued Customer",
        email: input.email || customer?.email || session?.user?.email || "",
        phone: input.phone || customer?.phone || undefined,
        companyName: input.companyName || customer?.companyName || undefined,
      })
      .returning();
    return inquiry ? jsonOk(inquiry, 201) : jsonError("Inquiry was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
