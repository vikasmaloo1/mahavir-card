import { notFound } from "next/navigation";

import { AdminRecordDetail, type DetailSection } from "@/components/admin-record-detail";

const sections = new Set<DetailSection>(["orders", "quotes", "customers", "inquiries", "payments", "artworks"]);

export default async function AdminRecordPage({ params }: PageProps<"/admin/[section]/[id]">) {
  const { section, id } = await params;
  if (!sections.has(section as DetailSection)) notFound();
  return <AdminRecordDetail section={section as DetailSection} id={id} />;
}
