import type { Metadata } from "next";
import { AdminPurchaseForm } from "@/components/admin-purchase-form";

export const metadata: Metadata = {
  title: "Add Purchase | Admin",
  robots: { index: false, follow: false },
};

export default function NewPurchasePage() {
  return <AdminPurchaseForm />;
}