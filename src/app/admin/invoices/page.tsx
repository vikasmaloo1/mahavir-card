import { AdminBillsList } from "@/components/admin-bills-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bills & Invoices | Admin",
  robots: { index: false, follow: false },
};

export default function AdminInvoicesPage() {
  return <AdminBillsList />;
}
