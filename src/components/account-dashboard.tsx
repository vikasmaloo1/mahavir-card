"use client";

import Link from "next/link";
import { ArrowRight, FileQuestion, FileText, MapPin, Package, Palette, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";

type AccountData = {
  user: { name: string; email: string; phoneNumber?: string | null };
  customer: { companyName: string; contactName: string; phone: string | null; customerType: string; state: string | null; availableCredit: string } | null;
  profileComplete: boolean;
  orders: { id: string; orderNumber: string; status: string; total: string; createdAt: string }[];
  quotes: { id: string; quoteNumber: string; status: string; total: string; createdAt: string }[];
  inquiries: { id: string; subject: string | null; status: string; createdAt: string }[];
  artworks: { id: string; fileName: string; status: string; createdAt: string }[];
  addresses: { id: string; label: string; line1: string; line2: string | null; city: string; state: string; postalCode: string; country: string }[];
};

export function AccountDashboard() {
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSignedOut(false);
    try {
      const response = await fetch("/api/account/summary", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) { setSignedOut(true); throw new Error("Sign in to view your account."); }
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "We couldn't load your account. Please retry.");
      setData(payload.data);
    } catch (caught) {
      setError(caught instanceof TypeError ? "Connection interrupted. Check your connection and retry." : caught instanceof Error ? caught.message : "We couldn't load your account. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <AccountSkeleton />;
  if (error) return <div role="alert" className="mt-6 rounded-lg border border-[#c7d6f0] bg-white p-5"><p className="font-bold text-[var(--mc-ink)]">{error}</p>{signedOut ? <Link href="/login" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white">Customer sign in <ArrowRight size={15} /></Link> : <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} />Retry</button>}</div>;
  if (!data) return null;

  const openQuotes = data.quotes.filter((quote) => !["CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"].includes(quote.status)).length;
  const activeOrders = data.orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length;

  return (
    <div>
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--mc-line)] pb-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Customer account</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your print desk</h1><p className="mt-2 text-[15px] text-[var(--mc-muted)]">Orders, quotes, inquiries, artwork, and delivery details from your account.</p></div>
        <Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white">Browse products <ArrowRight size={16} /></Link>
      </header>
      <section className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-px overflow-hidden rounded-xl border border-[var(--mc-line)] bg-[var(--mc-line)] shadow-sm">
        <ProfileValue label="Person" value={data.customer?.contactName ?? data.user.name} />
        <ProfileValue label="Company" value={data.customer?.companyName || "Not provided"} />
        <ProfileValue label="Customer type" value={data.customer?.customerType || "Not set"} />
        <ProfileValue label="State" value={data.customer?.state || "Not provided"} />
        <div className="bg-white p-4 col-span-2 sm:col-span-1">
          <ProfileValue label="Available balance" value={data.profileComplete && data.customer ? formatInr(data.customer.availableCredit) : "Complete profile"} />
          {!data.profileComplete ? <Link href="/account/profile" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--mc-accent)]">Complete profile <ArrowRight size={13} /></Link> : null}
        </div>
      </section>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Open quotes" value={openQuotes} Icon={FileText} /><Metric label="Active orders" value={activeOrders} Icon={Package} /><Metric label="Artwork files" value={data.artworks.length} Icon={Palette} /></div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <Records id="orders" title="Orders" items={data.orders} empty="No orders yet." action="Browse products" href="/products" itemHref={(item) => `/account/orders/${item.id}`} render={(item) => <><span><strong>{item.orderNumber}</strong><small className="mt-1 block text-[var(--mc-muted)]">{labelStatus(item.status)} / {date(item.createdAt)}</small></span><strong>{formatInr(item.total)}</strong></>} />
        <Records id="quotes" title="Quotes" items={data.quotes} empty="No quote requests yet." action="Open quote basket" href="/quote" itemHref={(item) => `/account/quotes/${item.id}`} render={(item) => <><span><strong>{item.quoteNumber}</strong><small className="mt-1 block text-[var(--mc-muted)]">{labelStatus(item.status)} / {date(item.createdAt)}</small></span><strong>{formatInr(item.total)}</strong></>} />
        <Records title="Inquiries" items={data.inquiries} empty="No inquiries yet." action="Contact Mahavir Card" href="/contact" render={(item) => <><span className="min-w-0"><strong className="block truncate">{item.subject || "General inquiry"}</strong><small className="mt-1 block text-[var(--mc-muted)]">{labelStatus(item.status)} / {date(item.createdAt)}</small></span><FileQuestion size={18} className="shrink-0 text-[var(--mc-accent)]" /></>} />
        <Records title="Artwork" items={data.artworks} empty="No CDR artwork uploaded yet." action="Choose a product" href="/products" render={(item) => <><span className="min-w-0"><strong className="block truncate">{item.fileName}</strong><small className="mt-1 block text-[var(--mc-muted)]">{labelStatus(item.status)} / {date(item.createdAt)}</small></span><Palette size={18} className="shrink-0 text-[var(--mc-accent)]" /></>} />
      </div>
      <div className="mt-5">
        <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center gap-2"><MapPin size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold">Saved delivery addresses</h2></div><div className="mt-5 space-y-4">{data.addresses.length ? data.addresses.map((address) => <address key={address.id} className="border-t border-[var(--mc-line)] pt-4 text-sm not-italic leading-6 text-[var(--mc-muted)]"><strong className="block text-[var(--mc-ink)]">{address.label || "Delivery"}</strong>{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}</address>) : <p className="text-sm leading-6 text-[var(--mc-muted)]">Your delivery address is securely saved when you complete checkout.</p>}</div></section>
      </div>
    </div>
  );
}

function Metric({ label, value, Icon }: { label: string; value: number; Icon: typeof FileText }) { return <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-sm"><Icon size={20} className="text-[var(--mc-accent)]" /><p className="mt-4 text-xs font-bold uppercase text-[var(--mc-muted)]">{label}</p><p className="mt-2 text-3xl font-bold text-[var(--mc-ink)]">{value}</p></div>; }
function Records<T>({ id, title, items, empty, action, href, itemHref, render }: { id?: string; title: string; items: T[]; empty: string; action: string; href: string; itemHref?: (item: T) => string; render: (item: T) => React.ReactNode }) { return <section id={id} className="scroll-mt-36 rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><h2 className="font-bold text-[var(--mc-ink)]">{title}</h2><div className="mt-4 space-y-3">{items.length ? items.map((item, index) => itemHref ? <Link href={itemHref(item)} key={index} className="flex items-center justify-between gap-3 border-t border-[var(--mc-line)] pt-3 text-sm hover:text-[var(--mc-accent)] transition-colors">{render(item)}</Link> : <div key={index} className="flex items-center justify-between gap-3 border-t border-[var(--mc-line)] pt-3 text-sm">{render(item)}</div>) : <div className="border-t border-dashed border-[var(--mc-line)] pt-5 text-sm text-[var(--mc-muted)]"><p>{empty}</p><Link href={href} className="mt-3 inline-flex items-center gap-2 font-bold text-[var(--mc-accent)]">{action} <ArrowRight size={15} /></Link></div>}</div></section>; }
function ProfileValue({ label, value }: { label: string; value: string }) { return <dl className="bg-white p-4"><dt className="text-xs font-bold uppercase text-[var(--mc-muted)]">{label}</dt><dd className="mt-1 break-words font-semibold text-[var(--mc-ink)]">{value}</dd></dl>; }
function AccountSkeleton() { return <div className="animate-pulse py-8"><div className="h-8 w-56 rounded bg-[#dce4f0]" /><div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e6ebf3]" /><div className="mt-8 grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-28 rounded-xl border border-[var(--mc-line)] bg-white" />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-44 rounded-xl border border-[var(--mc-line)] bg-white" />)}</div></div>; }
function date(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function labelStatus(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
