"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, Bookmark, FileQuestion, FileText, MapPin, Package, Palette, RefreshCw, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";
import { cachedFetchJson } from "@/lib/client-fetch-cache";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

type SavedJob = { id: string; name: string; productId: string; productName: string; productSlug: string; quantity: number };

type AccountData = {
  user: { name: string; email: string; phoneNumber?: string | null };
  customer: { companyName: string; contactName: string; phone: string | null; customerType: string; state: string | null; availableCredit: string } | null;
  profileComplete: boolean;
  orders: { id: string; orderNumber: string; status: string; total: string; createdAt: string; paymentStatus: string | null }[];
  quotes: { id: string; quoteNumber: string; status: string; total: string; createdAt: string }[];
  inquiries: { id: string; subject: string | null; status: string; createdAt: string }[];
  artworks: { id: string; fileName: string; status: string; createdAt: string }[];
  addresses: { id: string; label: string; line1: string; line2: string | null; city: string; state: string; postalCode: string; country: string }[];
};

type OrderBucket = "ALL" | "AWAITING_ARTWORK" | "IN_PRODUCTION" | "READY" | "DELIVERED";
const ORDER_BUCKETS: Array<{ id: OrderBucket; label: string; statuses: string[] | null }> = [
  { id: "ALL", label: "All", statuses: null },
  { id: "AWAITING_ARTWORK", label: "Pending / Confirmed", statuses: ["PENDING", "CONFIRMED"] },
  { id: "IN_PRODUCTION", label: "In production", statuses: ["IN_PRODUCTION"] },
  { id: "READY", label: "Ready / Dispatched", statuses: ["READY", "DISPATCHED"] },
  { id: "DELIVERED", label: "Delivered", statuses: ["DELIVERED"] },
];

export function AccountDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderBucket>("ALL");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedJobActionId, setSavedJobActionId] = useState<string | null>(null);
  const [savedJobError, setSavedJobError] = useState("");

  const loadSavedJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/account/saved-jobs", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (payload?.success) {
        setSavedJobs(payload.data.items.map((item: { id: string; name: string; productId: string; productName: string; productSlug: string; quantity: number }) => ({ id: item.id, name: item.name, productId: item.productId, productName: item.productName, productSlug: item.productSlug, quantity: item.quantity })));
      }
    } catch { /* Saved jobs are a convenience panel — a failed fetch just leaves it empty. */ }
  }, []);

  async function orderJobAgain(jobId: string) {
    setSavedJobActionId(jobId); setSavedJobError("");
    try {
      const response = await fetch(`/api/account/saved-jobs/${jobId}/order-again`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "This job could not be added to your basket");
      router.push("/cart");
    } catch (caught) {
      setSavedJobError(caught instanceof Error ? caught.message : "This job could not be added to your basket");
      setSavedJobActionId(null);
    }
  }

  async function deleteSavedJob(jobId: string) {
    setSavedJobActionId(jobId); setSavedJobError("");
    try {
      const response = await fetch(`/api/account/saved-jobs/${jobId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "This job could not be removed");
      setSavedJobs((current) => current.filter((job) => job.id !== jobId));
    } catch (caught) {
      setSavedJobError(caught instanceof Error ? caught.message : "This job could not be removed");
    } finally {
      setSavedJobActionId(null);
    }
  }

  async function reorder(orderId: string) {
    setReorderingId(orderId);
    setReorderError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "This order could not be reordered");
      router.push("/cart");
    } catch (caught) {
      setReorderError(caught instanceof Error ? caught.message : "This order could not be reordered");
      setReorderingId(null);
    }
  }

  async function cancelOrder(orderId: string, orderNumber: string) {
    if (!window.confirm(`Are you sure you want to cancel order ${orderNumber}? If already paid, the full amount will be credited back to your wallet balance.`)) return;
    setCancellingId(orderId);
    setReorderError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "This order could not be cancelled");
      window.alert(payload.data?.message || "Order cancelled successfully. If paid, refund was credited to your wallet.");
      await load();
    } catch (caught) {
      setReorderError(caught instanceof Error ? caught.message : "This order could not be cancelled");
    } finally {
      setCancellingId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSignedOut(false);
    try {
      const { status, ok, payload } = await cachedFetchJson<{ success: boolean; data: AccountData; error?: { message?: string } }>("/api/account/summary", 15_000, { forceFresh: true });
      if (status === 401) { setSignedOut(true); throw new Error("Sign in to view your account."); }
      if (!ok || !payload?.success) throw new Error(payload?.error?.message ?? "We couldn't load your account. Please retry.");
      setData(payload.data);
    } catch (caught) {
      setError(caught instanceof TypeError ? "Connection interrupted. Check your connection and retry." : caught instanceof Error ? caught.message : "We couldn't load your account. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); void loadSavedJobs(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, loadSavedJobs]);

  useAutoRefresh(load);

  if (loading) return <AccountSkeleton />;
  if (error) return <div role="alert" className="mt-6 rounded-lg border border-[#c7d6f0] bg-white p-5"><p className="font-bold text-[var(--mc-ink)]">{error}</p>{signedOut ? <Link href={`/login?next=${encodeURIComponent("/account")}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white">Customer sign in <ArrowRight size={15} /></Link> : <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} />Retry</button>}</div>;
  if (!data) return null;

  const openQuotes = data.quotes.filter((quote) => !["CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"].includes(quote.status)).length;
  const activeOrders = data.orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length;
  const isB2B = data.customer?.customerType === "B2B";
  const pendingQuote = data.quotes.find((quote) => quote.status === "SENT_TO_CUSTOMER");
  const awaitingArtworkCount = data.orders.filter((order) => ["PENDING", "CONFIRMED"].includes(order.status)).length;
  // COD_PENDING is excluded deliberately — that's the expected resting state for cash-on-delivery until dispatch, not something the customer needs to act on.
  const pendingPaymentOrders = data.orders.filter((order) => order.paymentStatus === "PENDING");

  const savedJobsSection = (
    <section id="saved-jobs" className="scroll-mt-36 rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-[var(--mc-ink)]"><Bookmark size={17} className="text-[var(--mc-accent)]" />Saved jobs</h2>
      {savedJobError ? <p className="mt-2 text-xs font-semibold text-[#9b2525]">{savedJobError}</p> : null}
      <div className="mt-3 space-y-3">
        {savedJobs.length ? savedJobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between gap-3 border-t border-[var(--mc-line)] pt-3 text-sm">
            <div className="min-w-0">
              <strong className="block truncate">{job.name}</strong>
              <small className="mt-1 block text-[var(--mc-muted)]">{job.productName} · Qty {job.quantity.toLocaleString("en-IN")}</small>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" disabled={savedJobActionId === job.id} onClick={() => void orderJobAgain(job.id)} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"><ShoppingBag size={13} />{savedJobActionId === job.id ? "Adding..." : "Order again"}</button>
              <button type="button" disabled={savedJobActionId === job.id} onClick={() => void deleteSavedJob(job.id)} className="rounded-full border border-[var(--mc-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--mc-muted)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60">Remove</button>
            </div>
          </div>
        )) : <p className="border-t border-dashed border-[var(--mc-line)] pt-5 text-sm text-[var(--mc-muted)]">No saved jobs yet. Save a job from any order to reorder it in one click.</p>}
      </div>
    </section>
  );

  return (
    <div>
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--mc-line)] pb-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Customer account</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your print desk</h1><p className="mt-2 text-[15px] text-[var(--mc-muted)]">Orders, quotes, inquiries, artwork, and delivery details from your account.</p></div>
        <div className="flex items-center gap-3"><Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-[var(--mc-accent-dark)] transition-colors">Browse products <ArrowRight size={16} /></Link></div>
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
      {pendingQuote || awaitingArtworkCount > 0 || pendingPaymentOrders.length > 0 ? (
        <div className="mt-6 space-y-2">
          {pendingQuote ? <Link href={`/account/quotes/${pendingQuote.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors">You have a quote awaiting your decision ({pendingQuote.quoteNumber}). <ArrowRight size={15} /></Link> : null}
          {awaitingArtworkCount > 0 ? <a href="#orders" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors">Upload artwork to keep {awaitingArtworkCount > 1 ? `${awaitingArtworkCount} orders` : "your order"} moving. <ArrowRight size={15} /></a> : null}
          {pendingPaymentOrders.length > 0 ? <Link href={`/account/orders/${pendingPaymentOrders[0].id}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors">Payment pending for {pendingPaymentOrders.length > 1 ? `${pendingPaymentOrders.length} orders` : `order ${pendingPaymentOrders[0].orderNumber}`}. <ArrowRight size={15} /></Link> : null}
        </div>
      ) : null}
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Open quotes" value={openQuotes} Icon={FileText} /><Metric label="Active orders" value={activeOrders} Icon={Package} /><Metric label="Artwork files" value={data.artworks.length} Icon={Palette} /></div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <section id="orders" className="scroll-mt-36 rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="font-bold text-[var(--mc-ink)]">Orders</h2>
          {data.orders.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ORDER_BUCKETS.map((bucket) => {
                const count = bucket.statuses ? data.orders.filter((order) => bucket.statuses!.includes(order.status)).length : data.orders.length;
                if (bucket.id !== "ALL" && !count) return null;
                return (
                  <button
                    key={bucket.id}
                    type="button"
                    onClick={() => setOrderFilter(bucket.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${orderFilter === bucket.id ? "bg-[var(--mc-ink)] text-white" : "border border-[var(--mc-line)] bg-white text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"}`}
                  >
                    {bucket.label} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}
          {reorderError ? <p className="mt-3 rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-xs font-semibold text-[#9b2525]">{reorderError}</p> : null}
          <div className="mt-4 space-y-3">
            {(() => {
              const activeBucket = ORDER_BUCKETS.find((bucket) => bucket.id === orderFilter);
              const filteredOrders = activeBucket?.statuses ? data.orders.filter((order) => activeBucket.statuses!.includes(order.status)) : data.orders;
              return filteredOrders.length ? filteredOrders.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mc-line)] pt-3 text-sm">
                <Link href={`/account/orders/${item.id}`} className="min-w-0 flex-1 hover:text-[var(--mc-accent)] transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong>{item.orderNumber}</strong>
                    <OrderStatusBadge status={item.status} />
                  </div>
                  <small className="mt-1 block text-[var(--mc-muted)]">{date(item.createdAt)}</small>
                </Link>
                <strong className="shrink-0">{formatInr(item.total)}</strong>
                <Link href={`/account/orders/${item.id}#documents`} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors sm:inline-flex">
                  <FileText size={13} />
                  Invoice
                </Link>
                {(item.status === "PENDING" || item.status === "CONFIRMED") ? (
                  <button
                    type="button"
                    disabled={cancellingId === item.id}
                    onClick={() => void cancelOrder(item.id, item.orderNumber)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === item.id ? "Cancelling..." : "Cancel"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={reorderingId === item.id}
                  onClick={() => void reorder(item.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--mc-accent)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingBag size={13} />
                  {reorderingId === item.id ? "Adding..." : "Reorder"}
                </button>
              </div>
            )) : data.orders.length ? (
                <p className="border-t border-dashed border-[var(--mc-line)] pt-5 text-sm text-[var(--mc-muted)]">No orders match this filter.</p>
              ) : (
                <div className="border-t border-dashed border-[var(--mc-line)] pt-5 text-sm text-[var(--mc-muted)]">
                  <p>No orders yet.</p>
                  <Link href="/products" className="mt-3 inline-flex items-center gap-2 font-bold text-[var(--mc-accent)]">Browse products <ArrowRight size={15} /></Link>
                </div>
              );
            })()}
          </div>
        </section>
        {(() => {
          const quotesSection = <Records key="quotes" id="quotes" title="Quotes" items={data.quotes} empty="No quote requests yet." action="Open quote basket" href="/quote" itemHref={(item) => `/account/quotes/${item.id}`} render={(item) => <><span><strong>{item.quoteNumber}</strong><small className="mt-1 block text-[var(--mc-muted)]">{labelStatus(item.status)} / {date(item.createdAt)}</small></span><strong>{formatInr(item.total)}</strong></>} />;
          // B2B accounts see Saved jobs and Quotes ahead of Inquiries/Artwork — repeat-order and quote-status are what a B2B customer checks first.
          return isB2B ? <>{savedJobsSection}{quotesSection}</> : <>{quotesSection}{savedJobsSection}</>;
        })()}
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", label: "Pending" },
    CONFIRMED: { bg: "bg-sky-50 border-sky-200", text: "text-sky-800", label: "Order Confirmed" },
    IN_PRODUCTION: { bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-800", label: "In Production" },
    READY: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", label: "Ready" },
    DISPATCHED: { bg: "bg-purple-50 border-purple-200", text: "text-purple-800", label: "Dispatched" },
    DELIVERED: { bg: "bg-green-50 border-green-200", text: "text-green-800", label: "Delivered" },
    CANCELLED: { bg: "bg-red-50 border-red-200", text: "text-red-800", label: "Cancelled" },
  };
  const config = styles[status] || { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", label: labelStatus(status) };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

