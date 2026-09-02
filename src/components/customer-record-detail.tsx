"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, FileText, Package, RefreshCw, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";

type Item = { id: string; description: string; jobName: string | null; quantity: number; unitPrice: string; totalPrice: string };
type Document = { id: string; documentType: string; originalFilename: string; status: string };
type Artwork = { id: string; fileName: string; fileSize: number; status: string; notes: string | null };
type History = { id: string; status: string; notes: string | null; createdAt: string };
type OrderPayload = { order: { id: string; orderNumber: string; status: string; subtotal: string; tax: string; total: string; deliveryPrice: string; deliveryMethod: string | null; deliveryState: string | null; createdAt: string }; items: Item[]; payment: { method: string; status: string; amount: string } | null; artworks: Artwork[]; documents: Document[]; history: History[] };
type QuotePayload = { quote: { id: string; quoteNumber: string; status: string; subtotal: string; discountAmount: string; tax: string; total: string; validUntil: string | null; notes: string | null; customerMessage: string | null; createdAt: string }; items: Item[]; artworks: Artwork[]; documents: Document[]; order: { id: string; orderNumber: string; status: string } | null };

export function CustomerRecordDetail({ kind, id }: { kind: "order" | "quote"; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<OrderPayload | QuotePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/account/${kind}s/${id}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? `Could not load this ${kind}`);
      setData(payload.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Could not load this ${kind}`); }
    finally { setLoading(false); }
  }, [id, kind]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function reorder() {
    setReordering(true); setReorderError("");
    try {
      const response = await fetch(`/api/orders/${id}/reorder`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "This order could not be reordered");
      router.push("/cart");
    } catch (caught) {
      setReorderError(caught instanceof Error ? caught.message : "This order could not be reordered");
      setReordering(false);
    }
  }

  async function decide(decision: "APPROVE" | "REJECT") {
    const message = window.prompt(decision === "APPROVE" ? "Optional message to Mahavir Card" : "Tell Mahavir Card what needs to change");
    if (message === null) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/account/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, message: message || null }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Your quote decision could not be saved");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your quote decision could not be saved"); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><p className="text-sm text-[var(--mc-muted)]">Loading {kind}...</p></main>;
  if (error && !data) return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><ErrorMessage text={error} /><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} />Retry</button></main>;
  if (!data) return null;

  const primary = kind === "order" ? (data as OrderPayload).order : (data as QuotePayload).quote;
  const number = kind === "order" ? (primary as OrderPayload["order"]).orderNumber : (primary as QuotePayload["quote"]).quoteNumber;
  const quote = kind === "quote" ? data as QuotePayload : null;
  const order = kind === "order" ? data as OrderPayload : null;

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
    <Link href="/account" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--mc-accent)]"><ArrowLeft size={16} />Back to account</Link>
    <header className="mt-5 flex flex-col justify-between gap-4 border-b border-[var(--mc-line)] pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{kind}</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{number}</h1><p className="mt-2 text-sm text-[var(--mc-muted)]">Created {date(primary.createdAt)}</p></div><div className="flex items-center gap-3"><Status value={primary.status} />{order ? <button type="button" disabled={reordering} onClick={() => void reorder()} className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"><ShoppingBag size={15} />{reordering ? "Adding to basket..." : "Reorder"}</button> : null}</div></header>
    {error ? <ErrorMessage text={error} /> : null}
    {reorderError ? <ErrorMessage text={reorderError} /> : null}
    {quote?.quote.status === "SENT_TO_CUSTOMER" && !isPastValidUntil(quote.quote.validUntil) ? <section className="mt-6 border border-[#b8ccf5] bg-[#f5f8ff] p-5"><h2 className="font-bold">Your quotation is ready</h2><p className="mt-2 text-sm text-[var(--mc-muted)]">Review the line items and total before approving or requesting changes.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void decide("APPROVE")} className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />Approve quote</button><button type="button" disabled={saving} onClick={() => void decide("REJECT")} className="inline-flex items-center gap-2 rounded-full border border-[#c9d2df] bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"><X size={16} />Request changes</button></div></section> : null}
    {quote && (quote.quote.status === "EXPIRED" || quote.quote.status === "CUSTOMER_REJECTED" || (quote.quote.status === "SENT_TO_CUSTOMER" && isPastValidUntil(quote.quote.validUntil))) ? <section className="mt-6 border border-[var(--mc-line)] bg-white p-5"><h2 className="font-bold">{quote.quote.status === "CUSTOMER_REJECTED" ? "Changes were requested on this quote" : "This quotation is no longer active"}</h2><p className="mt-2 text-sm text-[var(--mc-muted)]">{quote.quote.status === "CUSTOMER_REJECTED" ? "Mahavir Card will follow up, or you can start a fresh request below." : "Its validity period has passed. Request a new quote for the same or updated specifications."}</p><Link href="/quote" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors">Request a new quote</Link></section> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-6"><Section title="Items" icon={<Package size={18} />}>{data.items.map((item) => <div key={item.id} className="grid gap-2 border-t border-[var(--mc-line)] py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"><div><strong>{item.jobName || item.description}</strong>{item.jobName ? <p className="mt-1 text-[var(--mc-muted)]">{item.description}</p> : null}<p className="mt-1 text-xs text-[var(--mc-muted)]">Quantity {item.quantity.toLocaleString("en-IN")}</p></div><strong>{formatInr(item.totalPrice)}</strong></div>)}</Section><Section title="Artwork" icon={<FileText size={18} />}>{data.artworks.length ? data.artworks.map((artwork) => <div key={artwork.id} className="flex justify-between gap-3 border-t border-[var(--mc-line)] py-4 text-sm"><span className="min-w-0"><strong className="block truncate">{artwork.fileName}</strong><small className="text-[var(--mc-muted)]">{fileSize(artwork.fileSize)}{artwork.notes ? ` · ${artwork.notes}` : ""}</small></span><Status value={artwork.status} small /></div>) : <Empty text="No artwork linked yet." />}</Section><Section title="Documents" icon={<Download size={18} />} id="documents">{data.documents.length ? data.documents.map((document) => <a key={document.id} href={document.documentType === "INVOICE" ? `/api/invoices/${document.id}/download` : `/api/quotes/${id}/document/download`} className="flex items-center justify-between gap-3 border-t border-[var(--mc-line)] py-4 text-sm font-bold text-[var(--mc-accent)]"><span>{document.originalFilename}</span><Download size={16} /></a>) : <Empty text="No documents available yet." />}</Section></div>
      <aside className="h-fit border border-[var(--mc-line)] bg-white p-5 lg:sticky lg:top-32"><h2 className="font-bold">Summary</h2><Money label="Price before GST" value={primary.subtotal} /><Money label="GST" value={primary.tax} /><Money label="Delivery" value={order?.order.deliveryPrice ?? "0"} /><Money label="Total" value={primary.total} strong />{order?.payment ? <div className="mt-5 border-t border-[var(--mc-line)] pt-4 text-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Payment</p><p className="mt-2 font-semibold">{label(order.payment.method)} · {label(order.payment.status)}</p></div> : null}{quote?.order ? <Link href={`/account/orders/${quote.order.id}`} className="mt-5 flex items-center gap-2 border-t border-[var(--mc-line)] pt-4 text-sm font-bold text-[var(--mc-accent)]">Order {quote.order.orderNumber}</Link> : null}</aside>
    </div>
    {order ? <Section title="Order status history" icon={<RefreshCw size={18} />} className="mt-6">{order.history.length ? order.history.map((event) => <div key={event.id} className="grid gap-1 border-t border-[var(--mc-line)] py-4 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_auto]"><strong>{label(event.status)}</strong><span className="text-[var(--mc-muted)]">{event.notes || "Status updated"}</span><time className="text-xs text-[var(--mc-muted)]">{date(event.createdAt)}</time></div>) : <Empty text="Current status is shown above. New updates will appear here." />}</Section> : null}
  </main>;
}

function Section({ title, icon, children, className = "", id }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) { return <section id={id} className={`scroll-mt-24 border border-[var(--mc-line)] bg-white p-5 ${className}`}><h2 className="flex items-center gap-2 font-bold">{icon}{title}</h2><div className="mt-3">{children}</div></section>; }
function Money({ label: text, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <p className={`mt-3 flex justify-between gap-3 border-t border-[var(--mc-line)] pt-3 text-sm ${strong ? "text-base font-bold" : "text-[var(--mc-muted)]"}`}><span>{text}</span><strong className="text-[var(--mc-ink)]">{formatInr(value)}</strong></p>; }
function Status({ value, small = false }: { value: string; small?: boolean }) { return <span className={`inline-flex h-fit w-fit bg-[var(--mc-accent-soft)] font-bold text-[var(--mc-accent-dark)] ${small ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"}`}>{label(value)}</span>; }
function ErrorMessage({ text }: { text: string }) { return <p role="alert" className="mt-5 border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm font-semibold text-[#9b2525]">{text}</p>; }
function Empty({ text }: { text: string }) { return <p className="border-t border-dashed border-[var(--mc-line)] py-5 text-sm text-[var(--mc-muted)]">{text}</p>; }
function label(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function date(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function isPastValidUntil(value: string | null) { return Boolean(value) && new Date(value!).getTime() < Date.now(); }
function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
