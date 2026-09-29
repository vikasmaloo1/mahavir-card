import { desc, ilike, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    const [recentPurchases, customerRows] = await Promise.all([
      db
        .select({
          id: purchases.id,
          partyName: purchases.partyName,
          partyGstin: purchases.partyGstin,
          billNo: purchases.billNo,
          date: purchases.date,
          hsnCode: purchases.hsnCode,
          description: purchases.description,
          qty: purchases.qty,
          qtyUnit: purchases.qtyUnit,
          taxValue: purchases.taxValue,
          taxType: purchases.taxType,
          cgstRate: purchases.cgstRate,
          sgstRate: purchases.sgstRate,
          igstRate: purchases.igstRate,
          totalValue: purchases.totalValue,
          notes: purchases.notes,
          items: purchases.items,
        })
        .from(purchases)
        .where(
          query
            ? or(
                ilike(purchases.partyName, `%${query}%`),
                ilike(purchases.partyGstin, `%${query}%`),
                ilike(purchases.description, `%${query}%`),
                ilike(purchases.billNo, `%${query}%`)
              )
            : undefined
        )
        .orderBy(desc(purchases.date))
        .limit(60),
      db
        .select({
          id: customers.id,
          contactName: customers.contactName,
          companyName: customers.companyName,
          gstNumber: customers.gstNumber,
          phone: customers.phone,
          city: customers.city,
          state: customers.state,
          stateCode: customers.stateCode,
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
      state?: string;
      stateCode?: string;
      taxType?: string;
      cgstRate?: string;
      sgstRate?: string;
      igstRate?: string;
      gstRate?: string;
      hsnCode?: string;
      description?: string;
      qty?: number;
      qtyUnit?: string;
      taxValue?: number;
      totalValue?: number;
      items?: Array<{
        id?: string;
        description: string;
        hsnCode: string;
        quantity: number;
        unit?: string;
        rate: number;
        amount: number;
      }>;
      lastBillNo?: string;
      lastDate?: string;
      notes?: string;
      source: "SUPPLIER" | "CUSTOMER";
    }> = [];

    const seen = new Set<string>();

    // 1. Add suppliers from past purchase entries with full details for autofill
    for (const p of recentPurchases) {
      const name = p.partyName?.trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);

        const cgst = Number(p.cgstRate || 0);
        const sgst = Number(p.sgstRate || 0);
        const igst = Number(p.igstRate || 0);
        const gstRate = (cgst + sgst + igst).toString();

        let parsedItems: Array<{
          id?: string;
          description: string;
          hsnCode: string;
          quantity: number;
          unit?: string;
          rate: number;
          amount: number;
        }> = [];

        if (Array.isArray(p.items) && p.items.length > 0) {
          parsedItems = p.items.map((it, idx) => ({
            id: it.id || `item-${idx + 1}`,
            description: it.description || "",
            hsnCode: it.hsnCode || p.hsnCode || "4802",
            quantity: Number(it.quantity || 1),
            unit: it.unit || p.qtyUnit || "PCS",
            rate: Number(it.rate || 0),
            amount: Number(it.amount || 0),
          }));
        } else if (p.description || p.taxValue) {
          const q = Number(p.qty || 1);
          const amt = Number(p.taxValue || 0);
          parsedItems = [
            {
              id: "item-1",
              description: p.description || "",
              hsnCode: p.hsnCode || "4802",
              quantity: q,
              unit: p.qtyUnit || "PCS",
              rate: q > 0 ? Number((amt / q).toFixed(2)) : amt,
              amount: amt,
            },
          ];
        }

        suggestions.push({
          name,
          gstin: p.partyGstin || "",
          taxType: p.taxType || "INTRA_STATE",
          cgstRate: p.cgstRate || "9.000",
          sgstRate: p.sgstRate || "9.000",
          igstRate: p.igstRate || "0.000",
          gstRate: gstRate !== "0" ? gstRate : "18",
          hsnCode: p.hsnCode || "4802",
          description: p.description || undefined,
          qty: p.qty ? Number(p.qty) : undefined,
          qtyUnit: p.qtyUnit || "PCS",
          taxValue: p.taxValue ? Number(p.taxValue) : undefined,
          totalValue: p.totalValue ? Number(p.totalValue) : undefined,
          items: parsedItems,
          lastBillNo: p.billNo || undefined,
          lastDate: p.date ? new Date(p.date).toISOString().slice(0, 10) : undefined,
          notes: p.notes || undefined,
          source: "SUPPLIER",
        });
      }
    }

    // 2. Add customers / businesses from customer database
    for (const c of customerRows) {
      const name = c.companyName?.trim() || c.contactName?.trim() || "";
      if (!name) continue;
      const key = `${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          name,
          companyName: c.companyName || undefined,
          gstin: c.gstNumber || "",
          phone: c.phone || undefined,
          city: c.city || undefined,
          state: c.state || undefined,
          stateCode: c.stateCode || undefined,
          taxType: c.stateCode && c.stateCode !== "GJ" ? "INTER_STATE" : "INTRA_STATE",
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
