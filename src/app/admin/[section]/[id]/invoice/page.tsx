import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminOrderInvoiceView } from "@/components/admin-order-invoice-view";

export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  if (section !== "orders") notFound();

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading invoice...</div>}>
      <AdminOrderInvoiceView orderId={id} />
    </Suspense>
  );
}
