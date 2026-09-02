import { notFound } from "next/navigation";

import { AdminModule } from "@/components/admin-module";

const sections = ["categories", "addons", "pricing", "delivery", "orders", "quotes", "customers", "inquiries", "leads", "payments", "artworks", "notices", "banners", "admins", "terms"] as const;

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <AdminModule section={section === "leads" ? "inquiries" : section as Exclude<(typeof sections)[number], "leads">} />;
}
