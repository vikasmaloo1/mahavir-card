import type { Metadata } from "next";
import { AdminPurchaseForm } from "@/components/admin-purchase-form";
import { db } from "@/lib/db/server";
import { purchases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Purchase | Admin",
  robots: { index: false, follow: false },
};

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
  if (!row) notFound();

  const initial = {
    id: row.id,
    date: row.date.toISOString(),
    partyName: row.partyName,
    partyGstin: row.partyGstin ?? null,
    billNo: row.billNo,
    hsnCode: row.hsnCode,
    description: row.description ?? null,
    qty: row.qty ?? null,
    qtyUnit: row.qtyUnit ?? null,
    taxValue: row.taxValue,
    taxType: row.taxType,
    cgstRate: row.cgstRate,
    sgstRate: row.sgstRate,
    igstRate: row.igstRate,
    roundOff: row.roundOff,
    notes: row.notes ?? null,
    items: (row.items as any) ?? [],
  };

  return <AdminPurchaseForm initial={initial} />;
}