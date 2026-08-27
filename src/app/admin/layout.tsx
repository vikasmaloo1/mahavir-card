import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Boxes, Building2, CreditCard, FileText, FolderKanban, HardDrive, LayoutDashboard, LogOut, Package, Settings2, Truck, Users, WandSparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAdminAccess } from "@/lib/permissions";

type NavLink = readonly [string, string, LucideIcon];
type NavGroup = { label: string; links: readonly NavLink[] };

const navGroups: readonly NavGroup[] = [
  { label: "", links: [["Dashboard", "/admin", LayoutDashboard]] },
  { label: "Catalog", links: [["Products", "/admin/products", Boxes], ["Categories", "/admin/categories", FolderKanban], ["Add-ons", "/admin/addons", Settings2], ["Pricing", "/admin/pricing", WandSparkles], ["Delivery", "/admin/delivery", Truck]] },
  { label: "Sales", links: [["Orders", "/admin/orders", Package], ["Quotes", "/admin/quotes", FileText], ["Inquiries", "/admin/inquiries", BarChart3], ["Payments", "/admin/payments", CreditCard]] },
  { label: "Operations", links: [["Customers", "/admin/customers", Users], ["Artwork", "/admin/artworks", FileText]] },
  { label: "Settings", links: [["Admins", "/admin/admins", Users], ["Business settings", "/admin/business-settings", Building2], ["Storage", "/admin/storage", HardDrive]] },
] as const;
const mobileLinks = navGroups.flatMap((group) => group.links);

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const requestHeaders = await headers();
  const access = await getAdminAccess(new Request("http://localhost/admin", { headers: requestHeaders }));

  if (!access) redirect("/admin/login");

  return <div className="min-h-screen bg-[#f5f7fa] text-[#162237]"><aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col bg-[#13233d] text-white lg:flex"><div className="border-b border-white/10 px-6 py-6"><Link href="/" className="text-lg font-bold">mahavir<span className="text-[#8fb3ff]">card</span><span className="ml-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#a8b7cb]">admin</span></Link></div><nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">{navGroups.map((group) => <div key={group.label || "dashboard"} className="mb-4">{group.label ? <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#71839b]">{group.label}</p> : null}<div className="space-y-0.5">{group.links.map(([label, href, Icon]) => <Link href={href} key={href} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#b8c4d4] hover:bg-white/10 hover:text-white"><Icon size={17} />{label}</Link>)}</div></div>)}</nav><div className="border-t border-white/10 px-3 py-4"><Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#b8c4d4] hover:text-white"><LogOut size={17} />Back to storefront</Link></div></aside><div className="min-w-0 lg:pl-64"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7dce5] bg-white px-4 py-4 sm:px-5 lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Operations</p><p className="mt-1 text-sm font-semibold">Mahavir Card admin workspace</p></div><Link href="/" className="text-sm font-semibold text-[#607089] hover:text-[#2457b8]">View storefront</Link></header><nav className="flex gap-1 overflow-x-auto border-b border-[#d7dce5] bg-white px-4 py-2 lg:hidden" aria-label="Admin navigation">{mobileLinks.map(([label, href, Icon]) => <Link href={href} key={href} className="inline-flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-semibold text-[#52647e] hover:bg-[#f5f7fa] hover:text-[#162237]"><Icon size={16} />{label}</Link>)}</nav><main className="min-w-0 px-4 py-6 sm:px-5 sm:py-8 lg:px-8">{children}</main></div></div>;
}
