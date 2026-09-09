import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCachedSession } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import { customers, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  const [orderCustomer] = await db
    .select({ customerType: customers.customerType })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (orderCustomer && orderCustomer.customerType !== "B2C") {
    redirect(`/account/orders/${id}`);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading tax invoice...</div>}>
      <CustomerOrderInvoiceView orderId={id} />
    </Suspense>
  );
}
