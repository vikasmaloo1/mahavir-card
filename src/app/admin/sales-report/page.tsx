import type { Metadata } from "next";
import { AdminSalesReport } from "@/components/admin-sales-report";

export const metadata: Metadata = {
  title: "Sales Report | Admin",
  robots: { index: false, follow: false },
};

export default function SalesReportPage() {
  return <AdminSalesReport />;
}