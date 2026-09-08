import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCachedSession } from "@/lib/auth/session";
import { CustomerOrderInvoiceView } from "@/components/customer-order-invoice-view";

export default async function CustomerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCachedSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/account/orders/${id}/invoice`)}`);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading tax invoice...</div>}>
      <CustomerOrderInvoiceView orderId={id} />
    </Suspense>
  );
}
