"use client";

import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, Download, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { adminRequest, formattedAmount, formattedDate } from "@/lib/admin-client";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { mapItemsWithArtworks } from "@/lib/order-artwork-mapping";
import { HorizontalScrollContainer } from "@/components/horizontal-scroll-container";

type Row = Record<string, unknown>;
export type DetailSection = "orders" | "quotes" | "customers" | "inquiries" | "payments" | "artworks";

const statusOptions: Partial<Record<DetailSection, string[]>> = {
  orders: ["PENDING", "CONFIRMED", "IN_PRODUCTION", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"],
  quotes: ["NEW", "REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER", "CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"],
  inquiries: ["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_REQUESTED", "CONVERTED", "CLOSED", "LOST"],
  payments: ["PENDING", "PAID", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED", "CREDIT_APPROVED"],
  artworks: ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED", "REJECTED"],
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Order Confirmed",
  IN_PRODUCTION: "In Production",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};


function text(value: unknown) { return value === null || value === undefined || value === "" ? "-" : String(value); }
function value(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function rows(value: unknown) { return Array.isArray(value) ? value as Row[] : []; }
function record(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }
function title(section: DetailSection, row: Row) { return section === "orders" ? text(row.orderNumber) : section === "quotes" ? text(row.quoteNumber) : section === "customers" ? text(row.contactName) : section === "inquiries" ? text(row.subject || row.contactName) : section === "payments" ? `Payment ${text(row.id).slice(0, 8)}` : text(row.fileName); }

export function AdminRecordDetail({ section, id }: { section: DetailSection; id: string }) {
  const [payload, setPayload] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const primary = useMemo(() => record(payload[section.slice(0, -1)] ?? payload), [payload, section]);

  async function load() {
    setLoading(true); setError("");
    try { setPayload(await adminRequest<Row>(`/api/admin/${section}/${id}`)); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [id, section]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoRefresh(() => void load());

  async function mutate(path: string, options: RequestInit, message: string) {
    setSaving(true); setError(""); setNotice("");
    try { await adminRequest(path, options); setNotice(message); await load(); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setSaving(false); }
  }

  return <div><header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end"><div><Link href={`/admin/${section}`} className="inline-flex items-center gap-1 text-sm font-bold text-[#2457b8]"><ArrowLeft size={16} />{section[0].toUpperCase() + section.slice(1)}</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Admin record</p><h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{title(section, primary)}</h1><p className="mt-2 text-sm text-[#607089]">Live data, related records, and authorized actions for this {section.slice(0, -1)}.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></header>
    {notice ? <Message tone="success">{notice}</Message> : null}{error ? <Message tone="error">{error}</Message> : null}
    {loading ? <p className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading record...</p> : <DetailBody section={section} id={id} data={payload} primary={primary} saving={saving} mutate={mutate} />}
  </div>;
}

function DetailBody({ section, id, data, primary, saving, mutate }: { section: DetailSection; id: string; data: Row; primary: Row; saving: boolean; mutate: (path: string, options: RequestInit, message: string) => Promise<void> }) {
  if (section === "quotes") return <QuoteDetail id={id} data={data} quote={primary} saving={saving} mutate={mutate} />;
  if (section === "customers") return <CustomerDetail data={data} customer={primary} mutate={mutate} />;
  const fields = section === "orders" ? ["orderNumber", "status", "subtotal", "deliveryPrice", "tax", "total", "deliveryMethod", "deliveryState", "notes", "createdAt"] : section === "inquiries" ? ["contactName", "companyName", "email", "phone", "subject", "message", "internalNotes", "status", "createdAt"] : section === "payments" ? ["orderId", "customerId", "method", "status", "amount", "paidAmount", "refundedAmount", "provider", "providerOrderId", "providerPaymentId", "codCollectedAt", "createdAt"] : ["fileName", "fileSize", "customerId", "productId", "orderId", "quoteId", "status", "notes", "createdAt"];
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {section === "orders" ? <OrderOverview data={data} primary={primary} /> : null}
        {section === "orders" ? (
          <OrderPaymentSection
            order={primary}
            payment={record(data.payment)}
            customer={record(data.customer)}
            onRefresh={() => mutate(`/api/admin/orders/${id}`, {}, "Order updated.")}
          />
        ) : null}
        <FieldGrid row={primary} fields={fields} />
        {section === "orders" ? (
          <>
            <Rows title="Status history" items={rows(data.history)} fields={["status", "notes", "createdAt"]} />
            <OrderItemsList items={rows(data.items)} orderArtworks={rows(data.artworks)} />
            <ArtworkList items={rows(data.artworks)} />
            <Rows title="Documents" items={rows(data.documents)} fields={["originalFilename", "documentType", "status"]} />
          </>
        ) : null}
        {section === "inquiries" ? <InquiryRelations data={data} id={id} saving={saving} mutate={mutate} /> : null}
      </div>
      <RecordActions section={section} id={id} row={primary} saving={saving} mutate={mutate} />
      {section === "orders" ? (
        <div className="xl:col-span-2 grid gap-6 lg:grid-cols-2">
          <FieldGrid title="Customer" row={record(data.customer)} fields={["contactName", "companyName", "email", "phone", "customerType", "state"]} />
          <FieldGrid title="Payment" row={record(data.payment)} fields={["method", "status", "amount", "paidAmount", "refundedAmount", "provider", "providerPaymentId", "codCollectedAt"]} />
        </div>
      ) : null}
    </div>
  );
}

function OrderOverview({ data, primary }: { data: Row; primary: Row }) {
  const customer = record(data.customer);
  const payment = record(data.payment);
  const jobNames = rows(data.items).map((item) => text(item.jobName || item.description)).join(", ") || "-";
  const artworkCount = rows(data.artworks).length;
  const cells: Array<[string, string]> = [
    ["Customer", text(customer.contactName || customer.companyName)],
    ["Type", text(customer.customerType)],
    ["Order", text(primary.orderNumber)],
    ["Job name(s)", jobNames],
    ["Artwork", artworkCount ? `${artworkCount} file${artworkCount === 1 ? "" : "s"}` : "None"],
    ["Payment", payment.method ? `${text(payment.method)} · ${text(payment.status)}` : "-"],
  ];
  return <section className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">Overview</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cells.map(([label, val]) => <div key={label}><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#607089]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#263753]">{val}</p></div>)}</div></section>;
}

function RecordActions({ section, id, row, saving, mutate }: { section: DetailSection; id: string; row: Row; saving: boolean; mutate: AdminMutate }) {
  const [status, setStatus] = useState(value(row.status));
  const [notes, setNotes] = useState(value(section === "inquiries" ? row.internalNotes : row.notes));
  const [amount, setAmount] = useState(value(row.amount));
  return <aside className="h-fit border border-[#d7dce5] bg-white p-4 sm:p-5"><h2 className="font-bold">Manage record</h2>{statusOptions[section] ? <label className="mt-4 block text-sm font-semibold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal">{statusOptions[section]?.map((item) => <option key={item} value={item}>{section === "orders" ? (ORDER_STATUS_LABELS[item] || item) : item}</option>)}</select></label> : null}{section === "payments" ? <label className="mt-4 block text-sm font-semibold">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal" /></label> : null}{section !== "payments" ? <label className="mt-4 block text-sm font-semibold">{section === "inquiries" ? "Internal notes" : "Notes"}<textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] p-3 font-normal" /></label> : null}<button type="button" disabled={saving} onClick={() => { if (section === "orders" && status === "CANCELLED" && row.status !== "CANCELLED") { if (!window.confirm("Are you sure you want to cancel this order? Note: Balance will NOT be automatically refunded. If approved, you can credit the balance manually using the Credit to Balance button.")) return; } void mutate(`/api/admin/${section}/${id}`, { method: "PATCH", body: JSON.stringify({ status, ...(section === "payments" ? { amount } : section === "inquiries" ? { internalNotes: notes || null } : { notes: notes || undefined }) }) }, "Record updated."); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Check size={16} />Save changes</button>{section === "artworks" ? <a href={`/api/artworks/${id}/download`} className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-[#c9d2df] px-4 py-2.5 text-sm font-bold text-[#2457b8]"><Download size={16} />Download CDR</a> : null}</aside>;
}

type AdminMutate = (path: string, options: RequestInit, message: string) => Promise<void>;
function QuoteDetail({ id, data, quote, saving, mutate }: { id: string; data: Row; quote: Row; saving: boolean; mutate: AdminMutate }) {
  const [status, setStatus] = useState(value(quote.status)); const [discount, setDiscount] = useState(value(quote.discountAmount) || "0"); const [tax, setTax] = useState(value(quote.tax) || "0"); const [validUntil, setValidUntil] = useState(value(quote.validUntil).slice(0, 10)); const [notes, setNotes] = useState(value(quote.notes)); const [internalNotes, setInternalNotes] = useState(value(quote.internalNotes)); const [customerMessage, setCustomerMessage] = useState(value(quote.customerMessage));
  return <div className="mt-6 space-y-6"><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"><FieldGrid row={quote} fields={["quoteNumber", "contactName", "companyName", "email", "phone", "status", "createdAt"]} /><aside className="border border-[#d7dce5] bg-white p-5"><h2 className="font-bold">Quotation totals</h2><dl className="mt-4 space-y-2 text-sm"><Amount label="Subtotal" value={quote.subtotal} /><Amount label="Discount" value={quote.discountAmount} /><Amount label="Tax" value={quote.tax} /><Amount label="Total" value={quote.total} strong /></dl></aside></div><section className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">Line items</h2><div className="mt-4 space-y-3">{rows(data.items).map((item) => <QuoteItem key={text(item.id)} quoteId={id} item={item} saving={saving} mutate={mutate} />)}<QuoteItem quoteId={id} saving={saving} mutate={mutate} /></div></section><form onSubmit={(event) => { event.preventDefault(); void mutate(`/api/admin/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ status, discountAmount: discount, tax, validUntil: validUntil || null, notes, internalNotes: internalNotes || null, customerMessage: customerMessage || null }) }, "Quotation updated and totals recalculated."); }} className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">Quotation controls</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)} className="control">{statusOptions.quotes?.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Valid until"><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="control" /></Field><Field label="Discount amount"><input value={discount} onChange={(event) => setDiscount(event.target.value)} className="control" /></Field><Field label="Tax amount"><input value={tax} onChange={(event) => setTax(event.target.value)} className="control" /></Field><Field label="Customer notes"><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="control" /></Field><Field label="Internal notes"><textarea rows={4} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} className="control" /></Field><div className="sm:col-span-2"><Field label="Message to customer"><textarea rows={3} value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} className="control" /></Field></div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={saving} className="bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white">Save quotation</button>{quote.status === "CUSTOMER_APPROVED" ? <button type="button" disabled={saving} onClick={() => { if (window.confirm("Convert this approved quote into an order?")) void mutate(`/api/admin/quotes/${id}/convert-to-order`, { method: "POST" }, "Order created from quote."); }} className="border border-[#2457b8] px-4 py-2.5 text-sm font-bold text-[#2457b8]">Convert to order</button> : null}</div></form><Rows title="Artwork and documents" items={[...rows(data.artworks), ...rows(data.documents)]} fields={["fileName", "originalFilename", "status", "documentType", "fileSize"]} /></div>;
}

function QuoteItem({ quoteId, item, saving, mutate }: { quoteId: string; item?: Row; saving: boolean; mutate: AdminMutate }) { const [description, setDescription] = useState(value(item?.description)); const [quantity, setQuantity] = useState(value(item?.quantity) || "1"); const [unitPrice, setUnitPrice] = useState(value(item?.unitPrice) || "0"); const [configuration, setConfiguration] = useState(JSON.stringify(item?.configuration ?? {}, null, 2)); const submit = (event: FormEvent) => { event.preventDefault(); let parsed: unknown; try { parsed = JSON.parse(configuration || "{}"); } catch { window.alert("Configuration must be valid JSON."); return; } const path = item ? `/api/admin/quotes/${quoteId}/items/${text(item.id)}` : `/api/admin/quotes/${quoteId}/items`; void mutate(path, { method: item ? "PATCH" : "POST", body: JSON.stringify({ description, quantity: Number(quantity), unitPrice, configuration: parsed }) }, item ? "Quote item updated." : "Quote item added."); }; return <form onSubmit={submit} className="grid gap-3 border border-[#e1e6ee] p-3 lg:grid-cols-[minmax(12rem,2fr)_7rem_8rem_minmax(12rem,1fr)_auto]"><input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="control" /><input required type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="control" /><input required value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="control" /><textarea rows={2} value={configuration} onChange={(event) => setConfiguration(event.target.value)} className="control font-mono text-xs" /><div className="flex items-center justify-end gap-2"><button disabled={saving} className="border border-[#c9d2df] p-2 text-[#2457b8]" aria-label={item ? "Save item" : "Add item"}>{item ? <Check size={16} /> : <Plus size={16} />}</button>{item ? <button type="button" disabled={saving} onClick={() => { if (window.confirm("Delete this quote item?")) void mutate(`/api/admin/quotes/${quoteId}/items/${text(item.id)}`, { method: "DELETE" }, "Quote item deleted."); }} className="border border-[#efc4be] p-2 text-[#b13a2f]" aria-label="Delete item"><Trash2 size={16} /></button> : null}</div></form>; }

function CustomerDetail({ data, customer, mutate }: { data: Row; customer: Row; mutate: AdminMutate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const balance = Number(customer.availableCredit ?? 0);

  return (
    <div className="mt-6 space-y-6">
      {/* Customer Balance & Profile Card */}
      <section className="border border-[#d7dce5] bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e1e6ee] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-[#162237]">{text(customer.contactName)}</h2>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${customer.customerType === "B2B" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                {text(customer.customerType || "B2C")}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${customer.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {text(customer.status)}
              </span>
            </div>
            {customer.companyName ? (
              <p className="mt-1 text-sm font-medium text-[#607089]">{text(customer.companyName)}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Plus size={15} /> Add Balance
            </button>
            <button
              type="button"
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-1.5 rounded border border-[#c9d2df] bg-white px-3.5 py-2 text-xs font-bold text-[#24324a] hover:bg-slate-50 transition-colors shadow-xs"
            >
              Adjust Balance
            </button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#607089]">Current Balance</p>
            <div className="mt-1">
              {balance < -0.001 ? (
                <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-base font-mono">
                  <CircleAlert size={16} /> {formattedAmount(balance)}
                </span>
              ) : balance > 0.001 ? (
                <span className="font-mono text-base font-bold text-emerald-700">
                  {formattedAmount(balance)}
                </span>
              ) : (
                <span className="font-mono text-base font-semibold text-slate-600">₹0.00</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#607089]">
              {balance < 0 ? "Customer has outstanding dues" : "Available balance for ordering"}
            </p>
          </div>

          <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#607089]">Credit Eligibility</p>
            <p className="mt-1 text-base font-semibold text-[#162237]">
              {customer.creditEnabled ? "Enabled (Allow B2B Credit)" : "Disabled"}
            </p>
            <p className="mt-1 text-[11px] text-[#607089]">
              Payment Terms: {customer.paymentTermsDays ? `${customer.paymentTermsDays} days` : "Immediate"}
            </p>
          </div>

          <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#607089]">Contact Details</p>
            <p className="mt-1 font-mono text-sm font-bold text-[#162237]">{text(customer.phone)}</p>
            <p className="text-xs text-[#607089] truncate">{text(customer.email)}</p>
            {customer.gstNumber ? <p className="text-xs font-mono text-slate-700 mt-0.5">GST: {text(customer.gstNumber)}</p> : null}
          </div>
        </div>
      </section>

      {/* Customer Full Profile Grid */}
      <FieldGrid
        title="Customer profile"
        row={customer}
        fields={[
          "contactName",
          "companyName",
          "email",
          "phone",
          "gstNumber",
          "customerType",
          "state",
          "city",
          "creditEnabled",
          "paymentTermsDays",
          "availableCredit",
          "status",
          "createdAt",
        ]}
      />

      {/* Wallet / Balance Ledger Transactions */}
      <section className="border border-[#d7dce5] bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-[#e1e6ee] pb-3">
          <h2 className="font-bold text-[#162237]">Balance & Credit Ledger</h2>
          <span className="text-xs font-semibold text-[#607089]">
            {rows(data.walletTransactions).length} transactions
          </span>
        </div>
        {rows(data.walletTransactions).length ? (
          <HorizontalScrollContainer className="mt-4">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-[#e1e6ee] bg-[#f8fafc] text-[#52647e]">
                <tr>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Before</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">After</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Reference</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {rows(data.walletTransactions).map((tx, idx) => (
                  <tr key={text(tx.id || idx)} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formattedDate(tx.createdAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-bold">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800 border border-slate-200">
                        {text(tx.transactionType)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono font-bold">
                      {formattedAmount(tx.amount)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-500">
                      {tx.balanceBefore !== null && tx.balanceBefore !== undefined ? formattedAmount(tx.balanceBefore) : "-"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono font-bold text-slate-800">
                      {tx.balanceAfter !== null && tx.balanceAfter !== undefined ? formattedAmount(tx.balanceAfter) : "-"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{text(tx.reference)}</td>
                    <td className="px-3 py-2.5 text-slate-700 max-w-xs truncate" title={text(tx.notes)}>{text(tx.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollContainer>
        ) : (
          <p className="mt-4 text-sm text-[#607089]">No ledger activity recorded yet.</p>
        )}
      </section>

      {/* Addresses, Orders, Quotes, Inquiries */}
      <Rows title="Addresses" items={rows(data.addresses)} fields={["type", "line1", "line2", "city", "state", "postalCode", "isDefault"]} />
      <Rows title="Orders" items={rows(data.orders)} fields={["orderNumber", "status", "total", "createdAt"]} link="orders" />
      <Rows title="Quotes" items={rows(data.quotes)} fields={["quoteNumber", "status", "total", "createdAt"]} link="quotes" />
      <Rows title="Inquiries" items={rows(data.inquiries)} fields={["subject", "status", "createdAt"]} link="inquiries" />

      {/* Add Balance Modal */}
      {showAddModal ? (
        <AddBalanceModal
          customerId={String(customer.id)}
          currentBalance={customer.availableCredit}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            void mutate(`/api/admin/customers/${customer.id}`, {}, "Balance updated successfully.");
          }}
        />
      ) : null}

      {/* Adjust Balance Modal */}
      {showAdjustModal ? (
        <AdjustBalanceModal
          customerId={String(customer.id)}
          currentBalance={customer.availableCredit}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            setShowAdjustModal(false);
            void mutate(`/api/admin/customers/${customer.id}`, {}, "Balance adjusted successfully.");
          }}
        />
      ) : null}
    </div>
  );
}
function InquiryRelations({ data, id, saving, mutate }: { data: Row; id: string; saving: boolean; mutate: AdminMutate }) { return <button type="button" disabled={saving || data.status === "CONVERTED"} onClick={() => { if (window.confirm("Create a quote from this inquiry?")) void mutate(`/api/admin/inquiries/${id}/convert-to-quote`, { method: "POST" }, "Draft quote created."); }} className="bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Create quote</button>; }
function FieldGrid({ row, fields, title }: { row: Row; fields: string[]; title?: string }) {
  return (
    <section className="border border-[#d7dce5] bg-white p-4 sm:p-6">
      {title ? <h2 className="mb-4 font-bold">{title}</h2> : null}
      <dl className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field}>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#607089]">{field.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-[#263753]">{display(field, row[field])}</dd>
          </div>
        ))}
      </dl>
      {row.proofImageUrl ? (
        <div className="mt-5 border-t border-[#e1e6ee] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#607089]">Payment Screenshot Proof</p>
          <div className="mt-2">
            <a href={String(row.proofImageUrl)} target="_blank" rel="noopener noreferrer" className="group inline-block">
              <img
                src={String(row.proofImageUrl)}
                alt="Payment proof screenshot"
                className="max-h-52 rounded border border-[#cfd7e3] object-contain shadow-sm transition-transform group-hover:scale-[1.02]"
              />
              <span className="mt-1.5 block text-xs font-bold text-[#2457b8] group-hover:underline">Click to view full image in new tab &rarr;</span>
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
function OrderItemsList({ items, orderArtworks }: { items: Row[]; orderArtworks: Row[] }) {
  const { mappedItems, unmappedArtworks } = mapItemsWithArtworks(
    items as Array<{ id: string; productId?: string | null; configuration?: unknown; description?: string; jobName?: string | null; quantity: number; unitPrice: string; totalPrice: string }>,
    orderArtworks as Array<{ id: string; fileName: string; fileSize?: number | null; status?: string; productId?: string | null }>
  );

  return (
    <section className="border border-[#d7dce5] bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-[#e1e6ee] pb-3">
        <h2 className="font-bold text-[#162237]">Order items</h2>
        <span className="text-xs font-semibold text-[#607089]">
          {mappedItems.length} {mappedItems.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-4 divide-y divide-[#e8ecf2]">
        {mappedItems.map((item, index) => {
          const itemArts = (item.artworks || []) as Array<{ id: string; fileName: string; fileSize?: number | null; status?: string }>;
          return (
            <div key={text(item.id || index)} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                {/* Left: Item Specs & Pricing */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <strong className="text-base font-bold text-[#162237]">
                      {text(item.jobName || item.description)}
                    </strong>
                    {item.jobName && item.description !== item.jobName ? (
                      <span className="text-xs text-[#607089] font-normal">({text(item.description)})</span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#607089]">
                    <span>
                      Quantity: <strong className="text-[#162237]">{Number(item.quantity || 1).toLocaleString("en-IN")}</strong>
                    </span>
                    <span>
                      Unit price: <strong className="text-[#162237]">{formattedAmount(item.unitPrice)}</strong>
                    </span>
                    <span>
                      Total price: <strong className="text-[#162237] font-bold text-sm">{formattedAmount(item.totalPrice)}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: Artwork Download in front of this cart item */}
                <div className="shrink-0 md:text-right">
                  {itemArts.length ? (
                    <div className="flex flex-col md:items-end gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#607089]">
                        CDR Artwork ({itemArts.length})
                      </span>
                      {itemArts.map((art) => (
                        <a
                          key={art.id}
                          href={`/api/artworks/${art.id}/download`}
                          download
                          title={`Download ${art.fileName}`}
                          className="inline-flex items-center gap-1.5 rounded border border-[#2457b8] bg-[#f0f4ff] px-3 py-2 text-xs font-bold text-[#2457b8] shadow-sm hover:bg-[#2457b8] hover:text-white transition-colors"
                        >
                          <Download size={14} className="shrink-0" />
                          <span className="max-w-[220px] truncate">{art.fileName || "Download CDR"}</span>
                          {art.fileSize ? (
                            <span className="text-[10px] opacity-75">
                              ({Math.max(1, Math.round(Number(art.fileSize) / 1024))} KB)
                            </span>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded border border-dashed border-[#cfd7e3] px-3 py-1.5 text-xs text-[#8896ab]">
                      No CDR uploaded for this item
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {unmappedArtworks.length ? (
        <div className="mt-5 border-t border-dashed border-[#e1e6ee] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#607089]">
            Other order files ({unmappedArtworks.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unmappedArtworks.map((art) => (
              <a
                key={art.id}
                href={`/api/artworks/${art.id}/download`}
                download
                className="inline-flex items-center gap-1 rounded border border-[#c9d2df] bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#2457b8] hover:bg-slate-100"
              >
                <Download size={13} />
                <span className="max-w-[180px] truncate">{art.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ArtworkList({ items }: { items: Row[] }) { return <section className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">Artwork</h2>{items.length ? <div className="mt-4 divide-y divide-[#e1e6ee]">{items.map((item) => <div key={text(item.id)} className="flex items-center justify-between gap-3 py-4 text-sm"><span className="min-w-0"><strong className="block truncate text-[#263753]">{text(item.fileName)}</strong><small className="text-[#607089]">{text(item.status)}{item.fileSize ? ` · ${Math.max(1, Math.round(Number(item.fileSize) / 1024))} KB` : ""}</small></span><a href={`/api/artworks/${text(item.id)}/download`} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#2457b8]"><Download size={14} />Download</a></div>)}</div> : <p className="mt-4 text-sm text-[#607089]">No artwork linked yet.</p>}</section>; }
function Rows({ title, items, fields, link }: { title: string; items: Row[]; fields: string[]; link?: DetailSection }) { return <section className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">{title}</h2>{items.length ? <div className="mt-4 divide-y divide-[#e1e6ee]">{items.map((item, index) => <div key={text(item.id || index)} className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3">{fields.filter((field) => item[field] !== undefined && item[field] !== null).map((field) => <div key={field}><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#607089]">{field.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-sm text-[#263753]">{display(field, item[field])}</p></div>)}{link ? <Link href={`/admin/${link}/${text(item.id)}`} className="self-end text-sm font-bold text-[#2457b8]">Open record</Link> : null}</div>)}</div> : <p className="mt-4 text-sm text-[#607089]">No related records.</p>}</section>; }
function Amount({ label, value: amount, strong }: { label: string; value: unknown; strong?: boolean }) { return <div className={`flex justify-between gap-4 ${strong ? "border-t border-[#d7dce5] pt-3 font-bold" : ""}`}><dt>{label}</dt><dd>{formattedAmount(amount)}</dd></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span>{children}</label>; }
function Message({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) { return <p className={`mt-5 flex gap-2 border p-3 text-sm font-semibold ${tone === "success" ? "border-[#bbdfc9] bg-[#f3fbf5] text-[#1e6b3a]" : "border-[#efc4be] bg-[#fff6f4] text-[#a9362c]"}`}><CircleAlert size={17} />{children}</p>; }
function display(field: string, input: unknown) {
  const f = field.toLowerCase();
  if (["availablecredit", "walletbalance", "creditlimit"].includes(f)) {
    const num = Number(input ?? 0);
    if (num < -0.001) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-red-600 font-mono">
          <CircleAlert size={14} />
          {formattedAmount(num)}
        </span>
      );
    }
    return <span className="font-mono">{formattedAmount(num)}</span>;
  }
  if (f.includes("price") || ["subtotal", "tax", "total", "amount", "paidamount", "refundedamount", "discountamount"].includes(f)) {
    return formattedAmount(input);
  }
  if (f.includes("at") && input) return formattedDate(input);
  if (typeof input === "object" && input !== null) return JSON.stringify(input);
  if (typeof input === "boolean") return input ? "Yes" : "No";
  return text(input);
}

function OrderPaymentSection({
  order,
  payment,
  customer,
  onRefresh,
}: {
  order: Row;
  payment: Row;
  customer: Row;
  onRefresh: () => Promise<void>;
}) {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const orderTotal = Number(order.total || 0);
  const paidAmount = Number(
    payment.paidAmount ??
      (payment.status === "PAID" || payment.method === "CREDIT"
        ? payment.amount
        : 0)
  );
  const refundedAmount = Number(payment.refundedAmount || 0);
  const outstanding = Math.max(0, orderTotal - paidAmount);
  const isCancelled = order.status === "CANCELLED";
  const maxCreditable = Math.max(
    0,
    Math.min(orderTotal, paidAmount > 0 ? paidAmount : orderTotal) - refundedAmount
  );

  return (
    <section className="border border-[#d7dce5] bg-white p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e1e6ee] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#162237]">Payment & Reconciliation</h2>
          <p className="mt-0.5 text-xs text-[#607089]">
            Method: <strong className="text-slate-800">{text(payment.method)}</strong> · Status:{" "}
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                payment.status === "PAID"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : payment.status === "PARTIALLY_PAID"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : payment.status === "REFUNDED"
                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {text(payment.status)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCancelled && outstanding > 0.001 ? (
            <button
              type="button"
              onClick={() => setShowRecordModal(true)}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Plus size={15} /> Record Payment
            </button>
          ) : null}

          {isCancelled ? (
            maxCreditable > 0.001 ? (
              <button
                type="button"
                onClick={() => setShowCreditModal(true)}
                className="inline-flex items-center gap-1.5 rounded bg-[#2457b8] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1a4497] transition-colors shadow-xs"
              >
                Credit to Balance
              </button>
            ) : refundedAmount > 0.001 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                <Check size={14} /> Balance Credited: {formattedAmount(refundedAmount)}
              </span>
            ) : null
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
          <span className="font-bold uppercase tracking-wider text-[#607089]">Order Total</span>
          <p className="mt-1 font-mono text-base font-bold text-slate-900">{formattedAmount(orderTotal)}</p>
        </div>
        <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
          <span className="font-bold uppercase tracking-wider text-emerald-700">Total Paid</span>
          <p className="mt-1 font-mono text-base font-bold text-emerald-900">{formattedAmount(paidAmount)}</p>
        </div>
        <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
          <span className="font-bold uppercase tracking-wider text-red-600">Outstanding</span>
          <p className="mt-1 font-mono text-base font-bold text-red-700">{formattedAmount(outstanding)}</p>
        </div>
        <div className="rounded border border-[#e1e6ee] bg-slate-50/70 p-3">
          <span className="font-bold uppercase tracking-wider text-slate-600">Refunded / Credited</span>
          <p className="mt-1 font-mono text-base font-bold text-slate-700">{formattedAmount(refundedAmount)}</p>
        </div>
      </div>

      {showRecordModal ? (
        <RecordPaymentModal
          orderId={String(order.id)}
          orderNumber={String(order.orderNumber)}
          orderTotal={orderTotal}
          currentPaid={paidAmount}
          outstanding={outstanding}
          onClose={() => setShowRecordModal(false)}
          onSuccess={() => {
            setShowRecordModal(false);
            void onRefresh();
          }}
        />
      ) : null}

      {showCreditModal ? (
        <CreditBalanceModal
          orderId={String(order.id)}
          orderNumber={String(order.orderNumber)}
          customerName={text(customer.contactName || customer.companyName)}
          maxCreditable={maxCreditable}
          onClose={() => setShowCreditModal(false)}
          onSuccess={() => {
            setShowCreditModal(false);
            void onRefresh();
          }}
        />
      ) : null}
    </section>
  );
}

function AddBalanceModal({
  customerId,
  currentBalance,
  onClose,
  onSuccess,
}: {
  customerId: string;
  currentBalance: unknown;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (!notes.trim() || notes.trim().length < 3) {
      setError("Please provide a note / reason (min 3 characters)");
      return;
    }
    setSubmitting(true);
    try {
      await adminRequest(`/api/admin/customers/${customerId}/balance`, {
        method: "POST",
        body: JSON.stringify({
          action: "ADD",
          amount: num,
          paymentMode,
          reference: reference.trim() || undefined,
          notes: notes.trim(),
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add balance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-[#162237]">Add Balance to Customer</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg bg-slate-50 border p-3">
            <span className="text-xs font-bold uppercase text-[#607089]">Current Balance</span>
            <p className="mt-0.5 font-mono text-base font-bold text-[#162237]">
              {formattedAmount(currentBalance)}
            </p>
          </div>
          <label className="block">
            <span className="font-semibold text-slate-700">Amount to Add (₹) *</span>
            <input
              required
              type="number"
              step="100"
              min="1"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setAmount(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const current = parseInt(amount, 10) || 0;
                  setAmount(String(current + 100));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const current = parseInt(amount, 10) || 0;
                  setAmount(String(Math.max(1, current - 100)));
                } else if (e.key === "." || e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              placeholder="e.g. 5000"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Payment Mode *</span>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Reference / UTR Number (optional)</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR / NEFT / Cheque no."
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Notes / Details *</span>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via Bank of Baroda from client"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#c9d2df] px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustBalanceModal({
  customerId,
  currentBalance,
  onClose,
  onSuccess,
}: {
  customerId: string;
  currentBalance: unknown;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [adjustmentType, setAdjustmentType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Correction");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (!notes.trim() || notes.trim().length < 3) {
      setError("Please provide detailed notes (min 3 characters)");
      return;
    }
    setSubmitting(true);
    try {
      await adminRequest(`/api/admin/customers/${customerId}/balance`, {
        method: "POST",
        body: JSON.stringify({
          action: "ADJUST",
          adjustmentType,
          amount: num,
          reason,
          notes: notes.trim(),
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-[#162237]">Adjust Customer Balance</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg bg-slate-50 border p-3">
            <span className="text-xs font-bold uppercase text-[#607089]">Current Balance</span>
            <p className="mt-0.5 font-mono text-base font-bold text-[#162237]">
              {formattedAmount(currentBalance)}
            </p>
          </div>
          <div>
            <span className="font-semibold text-slate-700 block mb-1.5">Adjustment Type *</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("CREDIT")}
                className={`rounded border py-2 text-center font-bold text-xs ${adjustmentType === "CREDIT" ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                + Credit Customer
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("DEBIT")}
                className={`rounded border py-2 text-center font-bold text-xs ${adjustmentType === "DEBIT" ? "border-red-600 bg-red-50 text-red-800 ring-1 ring-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                - Debit Customer
              </button>
            </div>
          </div>
          <label className="block">
            <span className="font-semibold text-slate-700">Amount (₹) *</span>
            <input
              required
              type="number"
              step="100"
              min="1"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setAmount(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const current = parseInt(amount, 10) || 0;
                  setAmount(String(current + 100));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const current = parseInt(amount, 10) || 0;
                  setAmount(String(Math.max(1, current - 100)));
                } else if (e.key === "." || e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              placeholder="e.g. 1000"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Reason Category *</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            >
              <option value="Correction">Correction / Reconciliation</option>
              <option value="Write-off">Write-off / Bad Debt</option>
              <option value="Penalty">Penalty / Charge</option>
              <option value="Discount">Special Commercial Discount</option>
              <option value="Other">Other Reason</option>
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Detailed Reason & Audit Notes *</span>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why this adjustment is being made..."
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#c9d2df] px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#2457b8] px-5 py-2 font-bold text-white hover:bg-[#1a4497] disabled:opacity-50"
            >
              {submitting ? "Adjusting..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  orderId,
  orderNumber,
  orderTotal,
  currentPaid,
  outstanding,
  onClose,
  onSuccess,
}: {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  currentPaid: number;
  outstanding: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Please enter an amount greater than 0");
      return;
    }
    if (num > outstanding + 0.001) {
      setError(`Amount cannot exceed outstanding balance of ${formattedAmount(outstanding)}`);
      return;
    }
    setSubmitting(true);
    try {
      await adminRequest(`/api/admin/orders/${orderId}/partial-payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentDate: paymentDate || undefined,
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-[#162237]">Record Payment for #{orderNumber}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 border p-2.5 text-center text-xs">
            <div>
              <span className="text-[#607089] block uppercase text-[10px]">Total</span>
              <span className="font-mono font-bold text-[#162237]">{formattedAmount(orderTotal)}</span>
            </div>
            <div>
              <span className="text-emerald-700 block uppercase text-[10px]">Paid</span>
              <span className="font-mono font-bold text-emerald-800">{formattedAmount(currentPaid)}</span>
            </div>
            <div>
              <span className="text-red-600 block uppercase text-[10px]">Outstanding</span>
              <span className="font-mono font-bold text-red-700">{formattedAmount(outstanding)}</span>
            </div>
          </div>
          <label className="block">
            <span className="font-semibold text-slate-700">Amount Received (₹) *</span>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Payment Method *</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI / QR</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Reference / UTR / Cheque Number</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 423456789012"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Payment Date</span>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deposited in bank branch"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#c9d2df] px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreditBalanceModal({
  orderId,
  orderNumber,
  customerName,
  maxCreditable,
  onClose,
  onSuccess,
}: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  maxCreditable: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(maxCreditable.toFixed(2));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (num > maxCreditable + 0.001) {
      setError(`Amount cannot exceed eligible balance of ${formattedAmount(maxCreditable)}`);
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a reason (min 3 characters)");
      return;
    }
    setSubmitting(true);
    try {
      await adminRequest(`/api/admin/orders/${orderId}/credit-balance`, {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          reason: reason.trim(),
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to credit customer balance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-[#162237]">Credit Balance for Cancelled Order</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg bg-slate-50 border p-3 text-xs space-y-1">
            <p><strong>Customer:</strong> {customerName}</p>
            <p><strong>Order Number:</strong> #{orderNumber}</p>
            <p><strong>Eligible Credit:</strong> <span className="font-mono font-bold text-emerald-800">{formattedAmount(maxCreditable)}</span></p>
          </div>
          <label className="block">
            <span className="font-semibold text-slate-700">Amount to Credit to Wallet (₹) *</span>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              max={maxCreditable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-700">Reason / Approval Note *</span>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Order cancelled per client request, credit approved"
              className="mt-1 w-full rounded border border-[#c9d2df] p-2.5 outline-none focus:border-[#2457b8]"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#c9d2df] px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#2457b8] px-5 py-2 font-bold text-white hover:bg-[#1a4497] disabled:opacity-50"
            >
              {submitting ? "Crediting..." : "Confirm & Credit Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
