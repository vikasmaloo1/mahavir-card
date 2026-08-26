import { notFound } from "next/navigation";

import { AdminResourceTable } from "@/components/admin-resource-table";

const resources = {
  products: { title: "Products", description: "Manage the active print catalogue and product availability.", endpoint: "/api/admin/products", columns: [{ key: "name", label: "Product" }, { key: "slug", label: "Slug" }, { key: "orderable", label: "Orderable" }, { key: "quoteable", label: "Quoteable" }, { key: "isActive", label: "Active" }] },
  categories: { title: "Categories", description: "Review the categories used across the storefront catalogue.", endpoint: "/api/admin/categories", columns: [{ key: "name", label: "Category" }, { key: "slug", label: "Slug" }, { key: "sortOrder", label: "Order" }, { key: "isActive", label: "Active" }] },
  pricing: { title: "Pricing Rules", description: "Review server-side rules imported from the price list.", endpoint: "/api/admin/pricing", columns: [{ key: "name", label: "Rule" }, { key: "ruleType", label: "Type" }, { key: "isActive", label: "Active" }, { key: "createdAt", label: "Created" }] },
  quotes: { title: "Quotes", description: "Track quote requests and quotations through their workflow.", endpoint: "/api/admin/quotes", columns: [{ key: "quoteNumber", label: "Quote" }, { key: "contactName", label: "Customer" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "total", label: "Total" }, { key: "createdAt", label: "Created" }] },
  orders: { title: "Orders", description: "Review production orders and their payment-ready totals.", endpoint: "/api/admin/orders", columns: [{ key: "orderNumber", label: "Order" }, { key: "status", label: "Status" }, { key: "total", label: "Total" }, { key: "createdAt", label: "Created" }] },
  customers: { title: "Customers", description: "Find customers and review their recorded contact details.", endpoint: "/api/admin/customers", columns: [{ key: "contactName", label: "Contact" }, { key: "companyName", label: "Company" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }] },
  inquiries: { title: "Inquiries", description: "Review new print requirements before they become quotations.", endpoint: "/api/admin/inquiries", columns: [{ key: "contactName", label: "Contact" }, { key: "email", label: "Email" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Created" }] },
  leads: { title: "Inquiries", description: "Review new print requirements before they become quotations.", endpoint: "/api/admin/inquiries", columns: [{ key: "contactName", label: "Contact" }, { key: "email", label: "Email" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Created" }] },
  payments: { title: "Payments", description: "Review COD and Razorpay payment records and their current status.", endpoint: "/api/admin/payments", columns: [{ key: "orderNumber", label: "Order" }, { key: "customerEmail", label: "Customer" }, { key: "payment", label: "Payment" }] },
  artworks: { title: "Artwork", description: "Review CDR artwork metadata linked to print work.", endpoint: "/api/admin/artworks", columns: [{ key: "fileName", label: "File" }, { key: "extension", label: "Type" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Uploaded" }] },
  admins: { title: "Admins", description: "Review active administrative accounts.", endpoint: "/api/admin/admins", columns: [{ key: "user", label: "Account" }, { key: "admin", label: "Admin access" }] },
} as const;

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const resource = resources[section as keyof typeof resources];

  if (!resource) notFound();

  return <AdminResourceTable {...resource} />;
}
