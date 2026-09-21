import { ilike, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    const [purchaseParties, customerRows] = await Promise.all([
      db
        .selectDistinct({
          partyName: purchases.partyName,
          partyGstin: purchases.partyGstin,
        })
        .from(purchases)
        .where(
          query
            ? or(
                ilike(purchases.partyName, `%${query}%`),
                ilike(purchases.partyGstin, `%${query}%`)
              )
            : undefined
        )
        .limit(20),
      db
        .select({
          contactName: customers.contactName,
          companyName: customers.companyName,
          gstNumber: customers.gstNumber,
          phone: customers.phone,
          city: customers.city,
          state: customers.state,
        })
        .from(customers)
        .where(
          query
            ? or(
                ilike(customers.contactName, `%${query}%`),
                ilike(customers.companyName, `%${query}%`),
                ilike(customers.gstNumber, `%${query}%`),
                ilike(customers.phone, `%${query}%`)
              )
            : undefined
        )
        .limit(20),
    ]);

    const suggestions: Array<{
      name: string;
      companyName?: string;
      gstin: string;
      phone?: string;
      city?: string;
      source: "SUPPLIER" | "CUSTOMER";
    }> = [];

    const seen = new Set<string>();

    // 1. Add suppliers from past purchase entries
    for (const p of purchaseParties) {
      const name = p.partyName?.trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}_${(p.partyGstin || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          name,
          gstin: p.partyGstin || "",
          source: "SUPPLIER",
        });
      }
    }

    // 2. Add customers / businesses from customer database
    for (const c of customerRows) {
      const name = (c.companyName?.trim() || c.contactName?.trim() || "");
      if (!name) continue;
      const key = `${name.toLowerCase()}_${(c.gstNumber || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          name,
          companyName: c.companyName || undefined,
          gstin: c.gstNumber || "",
          phone: c.phone || undefined,
          city: c.city || undefined,
          source: "CUSTOMER",
        });
      }
    }

    return jsonOk({ suggestions });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
