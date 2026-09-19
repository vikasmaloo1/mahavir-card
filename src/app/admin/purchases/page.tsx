import type { Metadata } from "next";
import { AdminPurchasesList } from "@/components/admin-purchases-list";

export const metadata: Metadata = {
  title: "Purchases | Admin",
  robots: { index: false, follow: false },
};

export default function AdminPurchasesPage() {
  return <AdminPurchasesList />;
}