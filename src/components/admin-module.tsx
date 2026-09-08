"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Download, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { adminRequest, asItems, formattedAmount, formattedDate } from "@/lib/admin-client";
import { formatInrExact } from "@/lib/formatting";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { HorizontalScrollContainer } from "@/components/horizontal-scroll-container";
import { showToast } from "@/components/toast-provider";

type Row = Record<string, unknown>;
type ModuleKey = "categories" | "addons" | "pricing" | "delivery" | "orders" | "quotes" | "customers" | "inquiries" | "payments" | "artworks" | "notices" | "admins" | "banners" | "terms";

const moduleCopy: Record<ModuleKey, { title: string; description: string; endpoint: string; createLabel?: string }> = {
  categories: { title: "Categories", description: "Organize the storefront catalogue and control category availability.", endpoint: "/api/admin/categories", createLabel: "New category" },
  addons: { title: "Add-ons", description: "Maintain the optional finishing and service add-ons used by products.", endpoint: "/api/admin/addons", createLabel: "New add-on" },
  pricing: { title: "Pricing", description: "Maintain server-side pricing rules. Product editors provide the same rules in context.", endpoint: "/api/admin/pricing", createLabel: "New pricing rule" },
  delivery: { title: "Delivery", description: "Set product-specific pickup, local delivery, and state-based courier charges.", endpoint: "/api/admin/delivery", createLabel: "New delivery rule" },
  orders: { title: "Orders", description: "Move real production orders through the fulfilment workflow.", endpoint: "/api/admin/orders", createLabel: "New offline order" },
  quotes: { title: "Quotes", description: "Create and manage quotations before they become orders.", endpoint: "/api/admin/quotes", createLabel: "New quote" },
  customers: { title: "Customers", description: "Maintain customer contact and account information.", endpoint: "/api/admin/customers", createLabel: "New customer" },
  inquiries: { title: "Inquiries", description: "Qualify incoming print requirements and convert them to quotations.", endpoint: "/api/admin/inquiries" },
  payments: { title: "Payments", description: "Record manual payments and update COD or payment-provider records.", endpoint: "/api/admin/payments", createLabel: "Record payment" },
  artworks: { title: "Artwork", description: "Review uploaded CorelDRAW artwork and communicate approval decisions.", endpoint: "/api/admin/artworks" },
  notices: { title: "Notices", description: "Publish scheduled moving ticker and static notices on the storefront.", endpoint: "/api/admin/notices", createLabel: "New notice" },
  banners: { title: "Banners", description: "Manage promotional and informational banner placements across the customer site.", endpoint: "/api/admin/banners", createLabel: "New banner" },
  admins: { title: "Administrators", description: "Create and manage restricted administrative accounts.", endpoint: "/api/admin/admins", createLabel: "New administrator" },
  terms: { title: "Terms & Conditions", description: "Manage commercial printing policies, color disclaimers, dispatch responsibility, and legal terms in English, Gujarati, and Hindi.", endpoint: "/api/admin/terms", createLabel: "New condition" },
};

const columns: Record<ModuleKey, { label: string; value: (row: Row) => string; render?: (row: Row) => React.ReactNode }[]> = {
  categories: [{ label: "Category", value: (r) => text(r.name) }, { label: "Slug", value: (r) => text(r.slug) }, { label: "Order", value: (r) => text(r.sortOrder) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  addons: [{ label: "Add-on", value: (r) => text(r.name) }, { label: "Code", value: (r) => text(r.code) }, { label: "Pricing", value: (r) => text(r.pricingType) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  pricing: [{ label: "Rule", value: (r) => text(r.name) }, { label: "Type", value: (r) => text(r.ruleType) }, { label: "Price / rate", value: (r) => pricingValue(r) }, { label: "Tax", value: (r) => boolLabel(r.taxInclusive, "Inclusive", "Exclusive") }, { label: "Status", value: (r) => enabled(r.isActive) }],
  delivery: [{ label: "Product", value: (r) => text(r.productName) }, { label: "Method", value: (r) => text(r.deliveryMethod) }, { label: "State", value: (r) => text(r.stateName) }, { label: "Code", value: (r) => text(r.stateCode) }, { label: "Charge", value: (r) => formattedAmount(r.price) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  orders: [
    { label: "Order", value: (r) => text(r.orderNumber) },
    { label: "Customer", value: (r) => text(r.customerName) },
    { label: "Type", value: (r) => text(r.customerType) },
    {
      label: "Job / Items",
      value: (r) => text(r.jobName),
      render: (r) => {
        const items = (r.items as Array<{ jobName?: string | null; description: string; quantity: number }>) || [];
        if (!items.length) return <span className="font-semibold">{text(r.jobName)}</span>;
        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            {items.map((it, idx) => (
              <div key={idx} className="text-xs leading-tight">
                <span className="font-bold text-[#162237] block truncate max-w-[200px]" title={it.jobName || it.description}>
                  {it.jobName || it.description}
                </span>
                <span className="text-[11px] text-[#607089]">
                  {it.jobName && it.jobName !== it.description ? `${it.description} · ` : ""}
                  Qty {Number(it.quantity || 1).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      label: "Artwork",
      value: (r) => (Number(r.artworkCount) > 0 ? `${r.artworkCount} file${Number(r.artworkCount) === 1 ? "" : "s"}` : "None"),
      render: (r) => {
        const items = (r.items as Array<{ jobName?: string | null; description: string; artworks?: Array<{ id: string; fileName: string }> }>) || [];
        const unmapped = (r.unmappedArtworks as Array<{ id: string; fileName: string }>) || [];
        const orderArtworks = (r.artworks as Array<{ id: string; fileName: string }>) || [];

        if (!orderArtworks.length) return <span className="text-[#8896ab]">None</span>;

        if (items.length > 0) {
          return (
            <div className="flex flex-col gap-2 min-w-[170px]" onClick={(e) => e.stopPropagation()}>
              {items.map((it, idx) => {
                const arts = it.artworks || [];
                return (
                  <div key={idx} className="text-xs">
                    {items.length > 1 ? (
                      <span className="text-[10px] font-bold text-[#607089] block truncate max-w-[180px]" title={it.jobName || it.description}>
                        {it.jobName || it.description}:
                      </span>
                    ) : null}
                    {arts.length ? (
                      arts.map((art) => (
                        <a
                          key={art.id}
                          href={`/api/artworks/${art.id}/download`}
                          download
                          title={`Download ${art.fileName}`}
                          className="inline-flex items-center gap-1 font-bold text-[#2457b8] hover:underline"
                        >
                          <Download size={13} className="shrink-0 text-[#2457b8]" />
                          <span className="max-w-[160px] truncate">{art.fileName || "Download CDR"}</span>
                        </a>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#8896ab] italic">No CDR</span>
                    )}
                  </div>
                );
              })}
              {unmapped.length ? (
                <div className="border-t border-dashed border-[#cfd7e3] pt-1">
                  {unmapped.map((art) => (
                    <a
                      key={art.id}
                      href={`/api/artworks/${art.id}/download`}
                      download
                      title={`Download ${art.fileName}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2457b8] hover:underline"
                    >
                      <Download size={12} className="shrink-0 text-[#2457b8]" />
                      <span className="max-w-[160px] truncate">{art.fileName}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            {orderArtworks.map((art) => (
              <a
                key={art.id}
                href={`/api/artworks/${art.id}/download`}
                download
                title={`Download ${art.fileName}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2457b8] hover:underline"
              >
                <Download size={13} className="shrink-0 text-[#2457b8]" />
                <span className="max-w-[160px] truncate">{art.fileName || "Download CDR"}</span>
              </a>
            ))}
          </div>
        );
      },
    },
    {
      label: "Status",
      value: (r) => text(r.status),
      render: (r) => <AdminOrderStatusSelect orderId={String(r.id)} initialStatus={String(r.status)} />,
    },
    { label: "Total", value: (r) => formattedAmount(r.total) },
    { label: "Created", value: (r) => formattedDate(r.createdAt) },
  ],
  quotes: [{ label: "Quote", value: (r) => text(r.quoteNumber) }, { label: "Customer", value: (r) => text(r.contactName) }, { label: "Status", value: (r) => text(r.status) }, { label: "Total", value: (r) => formattedAmount(r.total) }],
  customers: [
    {
      label: "Customer / Company",
      value: (r) => `${text(r.contactName)} ${text(r.companyName)}`,
      render: (r) => (
        <div>
          <span className="font-bold text-[#162237] block">{text(r.contactName)}</span>
          {r.companyName ? <span className="text-xs text-[#607089] block">{text(r.companyName)}</span> : null}
        </div>
      ),
    },
    {
      label: "Type",
      value: (r) => text(r.customerType),
      render: (r) => {
        const type = text(r.customerType) || "B2C";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
              type === "B2B"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {type}
          </span>
        );
      },
    },
    {
      label: "Phone & Email",
      value: (r) => `${text(r.phone)} ${text(r.email)}`,
      render: (r) => (
        <div className="text-xs">
          <span className="font-mono text-[#162237] block">{text(r.phone)}</span>
          <span className="text-[#607089] truncate max-w-[170px] block">{text(r.email)}</span>
        </div>
      ),
    },
    {
      label: "Balance",
      value: (r) => formatInrExact(r.availableCredit as string | number),
      render: (r) => {
        const num = Number(r.availableCredit ?? 0);
        if (num < -0.001) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-xs font-bold text-red-700 tabular-nums">
              <CircleAlert size={12} />
              {formatInrExact(num)}
            </span>
          );
        }
        if (num > 0.001) {
          return (
            <span className="font-bold text-emerald-700 text-xs tabular-nums">
              {formatInrExact(num)}
            </span>
          );
        }
        return <span className="text-slate-500 text-xs font-semibold tabular-nums">₹0.00</span>;
      },
    },
    {
      label: "Credit",
      value: (r) => (r.creditEnabled ? "Enabled" : "Disabled"),
      render: (r) => (
        <span className={`text-xs font-semibold ${r.creditEnabled ? "text-emerald-700" : "text-slate-400"}`}>
          {r.creditEnabled ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      label: "Status",
      value: (r) => text(r.status),
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            r.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {text(r.status)}
        </span>
      ),
    },
    {
      label: "State",
      value: (r) => `${text(r.state)} ${text(r.city)}`,
      render: (r) => (
        <span className="text-xs text-slate-700">
          {text(r.stateCode || r.state)}
          {r.city ? `, ${text(r.city)}` : ""}
        </span>
      ),
    },
  ],
  inquiries: [{ label: "Contact", value: (r) => text(r.contactName) }, { label: "Subject", value: (r) => text(r.subject) }, { label: "Source", value: (r) => text(r.source) }, { label: "Email", value: (r) => text(r.email) }, { label: "Status", value: (r) => text(r.status) }, { label: "Received", value: (r) => formattedDate(r.createdAt) }],
  payments: [{ label: "Order", value: (r) => text(r.orderNumber) }, { label: "Customer", value: (r) => text(r.customerEmail) }, { label: "Type", value: (r) => text(r.customerType) }, { label: "Method", value: (r) => text(nested(r, "payment.method")) }, { label: "Amount", value: (r) => formattedAmount(nested(r, "payment.amount")) }, { label: "Status", value: (r) => text(nested(r, "payment.status")) }],
  artworks: [{ label: "File", value: (r) => text(r.fileName) }, { label: "Type", value: (r) => text(r.extension) }, { label: "Status", value: (r) => text(r.status) }, { label: "Uploaded", value: (r) => formattedDate(r.createdAt) }],
  notices: [{ label: "Notice", value: (r) => text(r.title) }, { label: "Placement", value: (r) => text(r.placement) }, { label: "Tone", value: (r) => text(r.tone) }, { label: "Animation", value: (r) => text(r.animationType) }, { label: "Priority", value: (r) => text(r.priority) }, { label: "Order", value: (r) => text(r.sortOrder) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  banners: [{ label: "Banner", value: (r) => text(r.title) }, { label: "Placement", value: (r) => text(r.placement) }, { label: "Animation", value: (r) => text(r.animationType) }, { label: "Badge", value: (r) => text(r.badge) }, { label: "Order", value: (r) => text(r.sortOrder) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  admins: [{ label: "Name", value: (r) => text(nested(r, "user.name")) }, { label: "Email", value: (r) => text(nested(r, "user.email")) }, { label: "Phone", value: (r) => text(nested(r, "user.phoneNumber")) }, { label: "Access", value: (r) => text(nested(r, "admin.status")) }],
  terms: [{ label: "Title", value: (r) => text(r.title) }, { label: "Category", value: (r) => text(r.category) }, { label: "Emphasis", value: (r) => boolLabel(r.isImportant, "Important (Red)", "Standard") }, { label: "Order", value: (r) => text(r.sortOrder) }, { label: "Status", value: (r) => enabled(r.isActive) }],
};

function nested(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Row)[key] : undefined, row);
}
function text(value: unknown) { return value === null || value === undefined || value === "" ? "-" : String(value); }
function enabled(value: unknown) { return value === true ? "Active" : "Inactive"; }
function boolLabel(value: unknown, yes: string, no: string) { return value === true ? yes : no; }
function asString(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function asBoolean(value: unknown, fallback = false) { return typeof value === "boolean" ? value : fallback; }
function asJson(value: unknown) { return JSON.stringify(value ?? {}, null, 2); }
function parseJson(value: string, label: string) {
  try { return JSON.parse(value || "{}"); } catch { throw new Error(`${label} must be valid JSON.`); }
}
function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function pricingValue(row: Row) {
  const formula = object(row.priceFormula);
  if (formula.ratePaisePerSqInch) return `${text(formula.ratePaisePerSqInch)} paise / sq.in`;
  if (formula.ratePerSqInch) return `${formattedAmount(formula.ratePerSqInch)} / sq.in`;
  return formattedAmount(formula.amount);
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Order Confirmed",
  IN_PRODUCTION: "In Production",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-300",
  CONFIRMED: "bg-sky-50 text-sky-800 border-sky-300",
  IN_PRODUCTION: "bg-indigo-50 text-indigo-800 border-indigo-300",
  READY: "bg-emerald-50 text-emerald-800 border-emerald-300",
  DISPATCHED: "bg-purple-50 text-purple-800 border-purple-300",
  DELIVERED: "bg-green-50 text-green-800 border-green-300",
  CANCELLED: "bg-red-50 text-red-800 border-red-300",
};

function AdminOrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const nextStatus = e.target.value;
    if (nextStatus === status) return;

    if (nextStatus === "CANCELLED") {
      const confirm = window.confirm("Are you sure you want to cancel this order? Note: Balance will not be automatically refunded. If approved, you can credit the balance manually using the Credit to Balance button in order details.");
      if (!confirm) return;
    }

    const previousStatus = status;
    setStatus(nextStatus);
    setUpdating(true);

    try {
      await adminRequest(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update order status");
      setStatus(previousStatus);
    } finally {
      setUpdating(false);
    }
  }

  const colorClass = ORDER_STATUS_COLORS[status] || "bg-slate-50 text-slate-700 border-slate-300";

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <select
        value={status}
        disabled={updating}
        onChange={(e) => void handleChange(e)}
        className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-bold outline-none transition-all disabled:opacity-50 ${colorClass}`}
      >
        {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
          <option key={val} value={val} className="bg-white text-slate-800">
            {label}
          </option>
        ))}
      </select>
      {updating ? (
        <RefreshCw size={11} className="ml-1 animate-spin text-slate-500" />
      ) : null}
    </div>
  );
}

export function AdminModule({ section }: { section: ModuleKey }) {
  const config = moduleCopy[section];
  const [items, setItems] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [customersList, setCustomersList] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    setError("");
    try {
      const suffix = ["orders", "quotes", "customers", "inquiries"].includes(section) ? `?page=${nextPage}&limit=100` : "";
      const result = await adminRequest<Row[] | { items?: Row[] }>(`${config.endpoint}${suffix}`);
      setItems(asItems(result));
      setPage(nextPage);
      if (["pricing", "delivery"].includes(section)) {
        const productsResult = await adminRequest<Row[] | { items?: Row[] }>("/api/admin/products?limit=100");
        setProducts(asItems(productsResult));
      }
      if (section === "orders") {
        const [custResult, prodsResult] = await Promise.all([
          adminRequest<Row[] | { items?: Row[] }>("/api/admin/customers?limit=100"),
          adminRequest<Row[] | { items?: Row[] }>("/api/admin/products?limit=100"),
        ]);
        setCustomersList(asItems(custResult));
        setProducts(asItems(prodsResult));
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  useAutoRefresh(() => {
    void load(page);
  });

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !term || columns[section].some((column) => column.value(item).toLowerCase().includes(term));
      const itemStatus = text(section === "payments" ? nested(item, "payment.status") : section === "admins" ? nested(item, "admin.status") : item.status);
      const matchesCustomerType = !customerTypeFilter || text(item.customerType) === customerTypeFilter;
      const balanceNum = Number(item.availableCredit ?? 0);
      const matchesBalance =
        !balanceFilter ||
        (balanceFilter === "NEGATIVE" && balanceNum < -0.001) ||
        (balanceFilter === "ZERO" && Math.abs(balanceNum) <= 0.001) ||
        (balanceFilter === "POSITIVE" && balanceNum > 0.001);
      return matchesQuery && (!statusFilter || itemStatus === statusFilter) && matchesCustomerType && matchesBalance;
    });
  }, [items, query, section, statusFilter, customerTypeFilter, balanceFilter]);
  const statuses = useMemo(() => [...new Set(items.map((item) => text(section === "payments" ? nested(item, "payment.status") : section === "admins" ? nested(item, "admin.status") : item.status)).filter((item) => item !== "-"))].sort(), [items, section]);

  async function save(data: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const id = rowId(section, editing);
      const path = id ? actionPath(section, id) : config.endpoint;
      const method = id ? "PATCH" : "POST";
      await adminRequest(path, { method, body: JSON.stringify(data) });
      setNotice(id ? "Changes saved." : "Record created.");
      setCreating(false);
      setEditing(null);
      await load(page);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Row) {
    const id = rowId(section, item);
    if (!id || !window.confirm("Remove or deactivate this record? This action cannot be undone from this screen.")) return;
    setSaving(true);
    setError("");
    try {
      await adminRequest(deletePath(section, id, item), { method: "DELETE" });
      setNotice(section === "categories" || section === "delivery" ? "Record removed." : "Record deactivated.");
      await load(page);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  async function convertInquiry(item: Row) {
    if (!window.confirm("Create a draft quote from this inquiry?")) return;
    setSaving(true);
    try {
      await adminRequest(`/api/admin/inquiries/${text(item.id)}/convert-to-quote`, { method: "POST" });
      setNotice("Draft quote created and inquiry marked converted.");
      await load(page);
    } catch (caught) { setError(message(caught)); } finally { setSaving(false); }
  }

  async function remindQuote(item: Row) {
    if (!window.confirm("Send a reminder email to this customer about their pending quote?")) return;
    setSaving(true);
    try {
      await adminRequest(`/api/admin/quotes/${text(item.id)}/remind`, { method: "POST" });
      setNotice("Reminder recorded — sent if email delivery is configured.");
    } catch (caught) { setError(message(caught)); } finally { setSaving(false); }
  }

  return <div>
    <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Admin CMS</p><h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">{config.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">{config.description}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load(page)} disabled={loading} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold text-[#24324a] hover:border-[#2457b8] disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>{config.createLabel ? <button type="button" onClick={() => { setCreating(true); setEditing(null); setError(""); }} className="inline-flex items-center gap-2 bg-[#2457b8] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#17479f]"><Plus size={16} />{config.createLabel}</button> : null}</div>
    </header>

    {notice ? <Notice tone="success" onDismiss={() => setNotice("")}>{notice}</Notice> : null}
    {error ? <Notice tone="error" onDismiss={() => setError("")}>{error}</Notice> : null}

    {(creating || editing) ? (
      <section className="mt-6 border border-[#c9d2df] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#e4e8ef] pb-4">
          <div>
            <h2 className="font-bold text-[#162237]">{editing ? `Edit ${singular(config.title)}` : config.createLabel}</h2>
            <p className="mt-1 text-sm text-[#607089]">Changes are saved to the live admin API.</p>
          </div>
          <button type="button" onClick={() => { setCreating(false); setEditing(null); setError(""); }} className="p-2 text-[#607089] hover:text-[#162237]" aria-label="Close form">
            <X size={18} />
          </button>
        </div>
        {creating && section === "orders" ? (
          <AdminOrderCreateForm
            products={products}
            customers={customersList}
            saving={saving}
            onSubmit={async (orderData) => {
              setSaving(true);
              setError("");
              try {
                await adminRequest("/api/admin/orders", { method: "POST", body: JSON.stringify(orderData) });
                setNotice("Offline order placed successfully with payment history logs.");
                setCreating(false);
                await load(page);
              } catch (caught) {
                setError(message(caught));
              } finally {
                setSaving(false);
              }
            }}
            onCancel={() => { setCreating(false); setEditing(null); }}
          />
        ) : (
          <ModuleForm section={section} item={editing} products={products} saving={saving} onSubmit={save} onCancel={() => { setCreating(false); setEditing(null); }} />
        )}
      </section>
    ) : null}

    <div className={`mt-6 grid gap-2 ${section === "orders" || section === "payments" ? "sm:grid-cols-[minmax(0,1fr)_10rem_13rem]" : section === "customers" ? "sm:grid-cols-[minmax(0,1fr)_9rem_12rem_10rem]" : "sm:grid-cols-[minmax(0,1fr)_13rem]"}`}>
      <div className="flex items-center gap-3 border border-[#cfd7e3] bg-white px-3">
        <Search size={17} className="shrink-0 text-[#607089]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#162237] outline-none" />
      </div>
      {section === "orders" || section === "payments" || section === "customers" ? (
        <select value={customerTypeFilter} onChange={(event) => setCustomerTypeFilter(event.target.value)} className="border border-[#cfd7e3] bg-white px-3 py-3 text-sm font-semibold text-[#263753]">
          <option value="">B2B & B2C</option>
          <option value="B2B">B2B only</option>
          <option value="B2C">B2C only</option>
        </select>
      ) : null}
      {section === "customers" ? (
        <select value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value)} className="border border-[#cfd7e3] bg-white px-3 py-3 text-sm font-semibold text-[#263753]">
          <option value="">All balances</option>
          <option value="NEGATIVE">Negative (Outstanding)</option>
          <option value="ZERO">Zero (₹0.00)</option>
          <option value="POSITIVE">Positive</option>
        </select>
      ) : null}
      {statuses.length ? (
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border border-[#cfd7e3] bg-white px-3 py-3 text-sm font-semibold text-[#263753]">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      ) : null}
    </div>
    {loading ? <div className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading {config.title.toLowerCase()}...</div> : null}
    {!loading && !visible.length ? <div className="mt-6 border border-dashed border-[#c9d2df] bg-white p-8 text-center"><p className="font-bold text-[#162237]">No {config.title.toLowerCase()} found.</p><p className="mt-2 text-sm text-[#607089]">Use the new-record control when this module supports creation.</p></div> : null}
    {!loading && visible.length ? <ResourceTable section={section} items={visible} saving={saving} onEdit={(item) => { setEditing(item); setCreating(false); setError(""); }} onDelete={remove} onConvert={convertInquiry} onRemind={remindQuote} /> : null}
    {["orders", "quotes", "customers", "inquiries"].includes(section) ? <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={page === 1 || loading} onClick={() => void load(page - 1)} className="inline-flex items-center gap-1 border border-[#c9d2df] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={16} />Previous</button><button type="button" disabled={items.length < 100 || loading} onClick={() => void load(page + 1)} className="inline-flex items-center gap-1 border border-[#c9d2df] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">Next<ChevronRight size={16} /></button></div> : null}
  </div>;
}

function ResourceTable({ section, items, saving, onEdit, onDelete, onConvert, onRemind }: { section: ModuleKey; items: Row[]; saving: boolean; onEdit: (item: Row) => void; onDelete: (item: Row) => void; onConvert: (item: Row) => void; onRemind: (item: Row) => void }) {
  const actionLabel = section === "categories" || section === "delivery" ? "Remove" : section === "customers" || section === "orders" || section === "quotes" || section === "inquiries" || section === "artworks" || section === "payments" ? "Update" : "Deactivate";
  return (
    <>
      <div className="mt-6 space-y-3 md:hidden">
        {items.map((item) => (
          <article key={rowId(section, item)} className="border border-[#d7dce5] bg-white p-4">
            <div className="space-y-2">
              {columns[section].map((column) => (
                <div key={column.label} className="flex justify-between gap-5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#607089]">{column.label}</span>
                  <span className="text-right text-sm font-medium text-[#162237]">{column.render ? column.render(item) : column.value(item)}</span>
                </div>
              ))}
            </div>
            <Actions section={section} item={item} saving={saving} actionLabel={actionLabel} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} onRemind={onRemind} />
          </article>
        ))}
      </div>
      <div className="mt-6 hidden md:block">
        <HorizontalScrollContainer>
          <div className="border border-[#d7dce5] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#d7dce5] bg-[#f7f9fc]">
                <tr>
                  {columns[section].map((column) => (
                    <th key={column.label} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#52647e]">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[#52647e]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={rowId(section, item)} className="border-b border-[#e8ecf2] last:border-0 hover:bg-[#fafbfe] transition-colors">
                    {columns[section].map((column) => (
                      <td key={column.label} className="max-w-60 px-4 py-3 align-top text-[#263753]">
                        {column.render ? column.render(item) : column.value(item)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Actions section={section} item={item} saving={saving} actionLabel={actionLabel} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} onRemind={onRemind} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HorizontalScrollContainer>
      </div>
    </>
  );
}

function Actions({ section, item, saving, actionLabel, onEdit, onDelete, onConvert, onRemind }: { section: ModuleKey; item: Row; saving: boolean; actionLabel: string; onEdit: (item: Row) => void; onDelete: (item: Row) => void; onConvert: (item: Row) => void; onRemind: (item: Row) => void }) {
  if (section === "pricing") return <div className="mt-4 flex flex-wrap justify-end gap-2"><Link href={`/admin/products/${text(item.productId)}?tab=pricing`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]">Open product</Link><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] p-1.5 text-[#24324a]" aria-label="Edit"><Pencil size={15} /></button><button type="button" onClick={() => onDelete(item)} disabled={saving} className="border border-[#efc4be] p-1.5 text-[#b13a2f]" aria-label="Deactivate"><Trash2 size={15} /></button></div>;
  if (section === "inquiries") return <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onConvert(item)} disabled={saving || item.status === "CONVERTED"} className="border border-[#b8ccf5] px-2.5 py-1.5 text-xs font-bold text-[#2457b8] disabled:opacity-40">Create quote</button><Link href={`/admin/inquiries/${rowId(section, item)}`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">View details</Link></div>;
  if (section === "quotes" && text(item.status) === "SENT_TO_CUSTOMER") return <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onRemind(item)} disabled={saving} className="border border-[#b8ccf5] px-2.5 py-1.5 text-xs font-bold text-[#2457b8] disabled:opacity-40">Send Reminder</button><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] p-1.5 text-[#24324a]" aria-label="Edit"><Pencil size={15} /></button></div>;
  if (section === "artworks") return <div className="mt-4 flex flex-wrap justify-end gap-2"><a href={`/api/artworks/${text(item.id)}/download`} className="inline-flex items-center gap-1.5 border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]"><Download size={14} />Download CDR</a><Link href={`/admin/artworks/${rowId(section, item)}`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">Review</Link></div>;
  if (["orders", "quotes", "customers", "payments"].includes(section)) return <div className="mt-4 flex justify-end"><Link href={`/admin/${section}/${rowId(section, item)}`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]">View details</Link></div>;
  return <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] p-1.5 text-[#24324a]" aria-label="Edit"><Pencil size={15} /></button><button type="button" onClick={() => onDelete(item)} disabled={saving} className="border border-[#efc4be] p-1.5 text-[#b13a2f]" aria-label={actionLabel}><Trash2 size={15} /></button></div>;
}

interface OrderLineItemState {
  productId: string;
  description: string;
  jobName: string;
  quantity: number;
  unitPrice: number;
}

function AdminOrderCreateForm({
  products,
  customers,
  saving,
  onSubmit,
  onCancel,
}: {
  products: Row[];
  customers: Row[];
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "COURIER">("PICKUP");
  const [deliveryState, setDeliveryState] = useState("GJ");
  const [deliveryPrice, setDeliveryPrice] = useState("0.00");
  const [orderStatus, setOrderStatus] = useState("CONFIRMED");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const [items, setItems] = useState<OrderLineItemState[]>([
    { productId: "", description: "", jobName: "", quantity: 1000, unitPrice: 0 },
  ]);

  const [recordPayment, setRecordPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CREDIT">("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter((c) => {
        const name = String(c.contactName || "").toLowerCase();
        const comp = String(c.companyName || "").toLowerCase();
        const phone = String(c.phone || "");
        return name.includes(q) || comp.includes(q) || phone.includes(q);
      })
      .slice(0, 50);
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => String(c.id) === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [items]);

  const deliveryCharge = deliveryMethod === "COURIER" ? Math.max(0, Number(deliveryPrice) || 0) : 0;
  const isIntraState = deliveryMethod === "PICKUP" || deliveryState === "GJ";
  const taxRate = 18;
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const cgstAmount = isIntraState ? Number((taxAmount / 2).toFixed(2)) : 0;
  const sgstAmount = isIntraState ? Number((taxAmount - cgstAmount).toFixed(2)) : 0;
  const igstAmount = !isIntraState ? taxAmount : 0;
  const grandTotal = Number((subtotal + taxAmount + deliveryCharge).toFixed(2));

  useEffect(() => {
    if (recordPayment && (!paymentAmount || paymentAmount === "0" || Number(paymentAmount) <= 0)) {
      setPaymentAmount(grandTotal.toFixed(2));
    }
  }, [grandTotal, recordPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  const enteredPaid = Math.max(0, Number(paymentAmount) || 0);
  const remainingDue = Math.max(0, Number((grandTotal - enteredPaid).toFixed(2)));

  function handleProductSelect(index: number, prodId: string) {
    const prod = products.find((p) => String(p.id) === prodId);
    setItems((curr) => {
      const next = [...curr];
      if (prod) {
        next[index] = {
          ...next[index],
          productId: prodId,
          description: String(prod.name || ""),
        };
      } else {
        next[index] = {
          ...next[index],
          productId: "",
        };
      }
      return next;
    });
  }

  function updateItem(index: number, patch: Partial<OrderLineItemState>) {
    setItems((curr) => {
      const next = [...curr];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addItem() {
    setItems((curr) => [...curr, { productId: "", description: "", jobName: "", quantity: 1000, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((curr) => curr.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!selectedCustomerId) {
      setFormError("Please select a customer for this order.");
      return;
    }

    if (!items.length || items.some((i) => !i.description.trim() || Number(i.quantity) <= 0)) {
      setFormError("Each line item must have a description and quantity greater than 0.");
      return;
    }

    const payload = {
      customerId: selectedCustomerId,
      items: items.map((item) => ({
        productId: item.productId || null,
        description: item.description.trim(),
        jobName: item.jobName.trim() || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice).toFixed(2),
        configuration: {},
      })),
      deliveryMethod,
      deliveryState: deliveryMethod === "COURIER" ? deliveryState : undefined,
      deliveryPrice: deliveryCharge.toFixed(2),
      status: orderStatus,
      notes: notes.trim() || undefined,
      initialPayment: recordPayment
        ? {
            recorded: true,
            amount: enteredPaid,
            method: paymentMethod,
            reference: paymentReference.trim() || undefined,
            notes: paymentNotes.trim() || undefined,
          }
        : undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create order.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div className="rounded-lg border border-[#c9d2df] bg-slate-50/50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e1e6ee] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#162237]">1. Select Customer</h3>
            <p className="text-xs text-[#607089]">Choose the offline or walk-in customer placing this job.</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search customer by name, company, phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded border border-[#c9d2df] bg-white px-2.5 py-1.5 text-xs focus:border-[#2457b8] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3">
          <select
            required
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm font-medium focus:border-[#2457b8] focus:outline-none"
          >
            <option value="">-- Choose Customer ({filteredCustomers.length} available) --</option>
            {filteredCustomers.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.contactName)} {c.companyName ? `(${String(c.companyName)})` : ""} {c.phone ? `· ${String(c.phone)}` : ""} · [{String(c.customerType || "B2C")}] · Bal: ₹{Number(c.availableCredit || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer ? (
          <div className="mt-3 flex flex-wrap items-center gap-4 rounded border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-[#162237]">
            <span>
              Customer: <strong>{String(selectedCustomer.contactName)}</strong>
            </span>
            {selectedCustomer.companyName ? (
              <span>
                Company: <strong>{String(selectedCustomer.companyName)}</strong>
              </span>
            ) : null}
            {selectedCustomer.phone ? (
              <span>
                Phone: <strong className="font-mono">{String(selectedCustomer.phone)}</strong>
              </span>
            ) : null}
            <span className="rounded bg-white px-2 py-0.5 font-bold border border-blue-200">
              Type: {String(selectedCustomer.customerType || "B2C")}
            </span>
            <span className="rounded bg-white px-2 py-0.5 font-bold border border-blue-200">
              Available Balance: ₹{Number(selectedCustomer.availableCredit || 0).toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-[#c9d2df] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[#e1e6ee] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#162237]">2. Order Line Items</h3>
            <p className="text-xs text-[#607089]">Add the printed products, job names, quantities, and agreed prices.</p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded bg-[#2457b8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1a4497]"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item, index) => {
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            return (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-[#e1e6ee] bg-slate-50/40 p-3 lg:grid-cols-[12rem_minmax(10rem,1fr)_10rem_7rem_7rem_8rem_auto] items-end"
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Catalog Product
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-2.5 py-2 text-xs focus:border-[#2457b8] focus:outline-none"
                  >
                    <option value="">Custom / Offline Job</option>
                    {products.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {String(p.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Item Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Visiting Cards Matte 350 GSM"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-2.5 py-2 text-xs focus:border-[#2457b8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Job / File Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Front Shop Board"
                    value={item.jobName}
                    onChange={(e) => updateItem(index, { jobName: e.target.value })}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-2.5 py-2 text-xs focus:border-[#2457b8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value)) })}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-2.5 py-2 text-xs font-mono focus:border-[#2457b8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: Math.max(0, Number(e.target.value)) })}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-2.5 py-2 text-xs font-mono focus:border-[#2457b8] focus:outline-none"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                    Line Total
                  </span>
                  <div className="mt-1 rounded bg-white border border-[#e1e6ee] px-2.5 py-2 text-xs font-bold tabular-nums text-slate-800">
                    {formatInrExact(lineTotal)}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => removeItem(index)}
                    className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fulfillment, Status & Taxes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Delivery & Status Details */}
        <div className="rounded-lg border border-[#c9d2df] bg-white p-4 space-y-4">
          <h3 className="text-sm font-bold text-[#162237] border-b border-[#e1e6ee] pb-2">
            3. Fulfillment & Order State
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                Delivery Method
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as "PICKUP" | "COURIER")}
                className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm focus:border-[#2457b8] focus:outline-none"
              >
                <option value="PICKUP">Storefront Self-Pickup</option>
                <option value="COURIER">Courier / Door Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm focus:border-[#2457b8] focus:outline-none"
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED (Production Queue)</option>
                <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                <option value="READY">READY FOR PICKUP</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="DELIVERED">DELIVERED</option>
              </select>
            </div>

            {deliveryMethod === "COURIER" ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                    Destination State
                  </label>
                  <select
                    value={deliveryState}
                    onChange={(e) => setDeliveryState(e.target.value)}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm focus:border-[#2457b8] focus:outline-none"
                  >
                    <option value="GJ">Gujarat (Intra-State CGST+SGST)</option>
                    <option value="RJ">Rajasthan (Inter-State IGST)</option>
                    <option value="MH">Maharashtra (Inter-State IGST)</option>
                    <option value="MP">Madhya Pradesh (Inter-State IGST)</option>
                    <option value="OTHER">Other State (Inter-State IGST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                    Courier Charge (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={deliveryPrice}
                    onChange={(e) => setDeliveryPrice(e.target.value)}
                    className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm font-mono focus:border-[#2457b8] focus:outline-none"
                  />
                </div>
              </>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
              Internal Notes / Printing Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Offline order walk-in, urgent delivery required by Saturday"
              className="mt-1 w-full rounded border border-[#c9d2df] bg-white p-2.5 text-xs focus:border-[#2457b8] focus:outline-none"
            />
          </div>
        </div>

        {/* Bill Breakdown Summary */}
        <div className="rounded-lg border border-[#c9d2df] bg-slate-50/70 p-4">
          <h3 className="text-sm font-bold text-[#162237] border-b border-[#e1e6ee] pb-2">
            Tax & Total Invoice Calculation
          </h3>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Item Subtotal:</span>
              <span className="font-mono font-bold text-slate-800">{formatInrExact(subtotal)}</span>
            </div>

            {deliveryCharge > 0 ? (
              <div className="flex justify-between py-1 text-slate-600">
                <span>Courier / Delivery:</span>
                <span className="font-mono font-bold text-slate-800">{formatInrExact(deliveryCharge)}</span>
              </div>
            ) : null}

            {isIntraState ? (
              <>
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="font-mono text-slate-800">{formatInrExact(cgstAmount)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="font-mono text-slate-800">{formatInrExact(sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-slate-600">
                <span>IGST (18%):</span>
                <span className="font-mono text-slate-800">{formatInrExact(igstAmount)}</span>
              </div>
            )}

            <div className="border-t border-[#c9d2df] pt-2 flex justify-between items-baseline">
              <span className="text-sm font-bold text-[#162237]">Invoice Grand Total:</span>
              <span className="text-xl font-bold text-[#162237] tabular-nums">
                {formatInrExact(grandTotal)}
              </span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-[#607089]">
            {isIntraState
              ? "Tax Jurisdiction: Gujarat Intra-State (9% CGST + 9% SGST applied)."
              : "Tax Jurisdiction: Inter-State Out-of-Gujarat (18% IGST applied)."}
          </p>
        </div>
      </div>

      {/* Immediate Payment Collection Logging */}
      <div className="rounded-lg border border-[#c9d2df] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[#e1e6ee] pb-3">
          <label className="flex items-center gap-2 text-sm font-bold text-[#162237] cursor-pointer">
            <input
              type="checkbox"
              checked={recordPayment}
              onChange={(e) => setRecordPayment(e.target.checked)}
              className="size-4 accent-[#2457b8]"
            />
            Record Payment Now (Offline Walk-In Collection)
          </label>

          {recordPayment ? (
            <span
              className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                enteredPaid >= grandTotal - 0.001
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : enteredPaid > 0
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {enteredPaid >= grandTotal - 0.001
                ? "Full Payment (PAID)"
                : enteredPaid > 0
                ? `Partial Payment (Pending ${formatInrExact(remainingDue)})`
                : "Pending Payment"}
            </span>
          ) : null}
        </div>

        {recordPayment ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm focus:border-[#2457b8] focus:outline-none"
                >
                  <option value="CASH">CASH (Physical Handover)</option>
                  <option value="UPI">UPI / QR Code Scan</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT">Customer Credit / Ledger</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                    Amount Received (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(grandTotal.toFixed(2))}
                    className="text-[11px] font-bold text-[#2457b8] hover:underline"
                  >
                    Full Amount
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm font-mono font-bold focus:border-[#2457b8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                  Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456 / Chq #00123 / Cash Slip"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-sm focus:border-[#2457b8] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
                Payment Remarks / Receipt Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Received advance cash at shop counter"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="mt-1 w-full rounded border border-[#c9d2df] bg-white px-3 py-2 text-xs focus:border-[#2457b8] focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-[#607089]">
              Payments recorded here are permanently logged in the customer&apos;s payment history ledger with exact timestamps and administrator IDs.
            </p>
          </div>
        ) : null}
      </div>

      {formError ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      {/* Buttons */}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4e8ef] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[#c9d2df] bg-white px-4 py-2.5 text-sm font-bold text-[#24324a] hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded bg-[#2457b8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a4497] disabled:opacity-60 shadow-xs"
        >
          <Check size={16} />
          {saving ? "Creating Order..." : "Create Order & Issue Bill"}
        </button>
      </div>
    </form>
  );
}

function ModuleForm({ section, item, products, saving, onSubmit, onCancel }: { section: ModuleKey; item: Row | null; products: Row[]; saving: boolean; onSubmit: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const value = (key: string) => asString(section === "payments" ? nested(item ?? {}, `payment.${key}`) : section === "admins" ? nested(item ?? {}, key === "status" ? "admin.status" : `user.${key}`) : item?.[key]);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    name: value("name"), title: value("title"), titleGu: value("titleGu"), titleHi: value("titleHi"), content: value("content"), contentGu: value("contentGu"), contentHi: value("contentHi"), category: value("category") || "GENERAL", slug: value("slug"), description: value("description"), sortOrder: value("sortOrder") || "0", code: value("code"), pricingType: value("pricingType") || "FIXED", priceConfiguration: asJson(item?.priceConfiguration), productId: value("productId"), ruleType: value("ruleType") || "FIXED_PER_REFERENCE_QUANTITY", conditions: asJson(item?.conditions), priceFormula: asJson(item?.priceFormula), baseAmount: asString(object(item?.priceFormula).amount), rateUnit: asString(object(item?.priceFormula).rateUnit) || (object(item?.priceFormula).ratePaisePerSqInch ? "PAISE" : "RUPEES"), rateValue: asString(object(item?.priceFormula).ratePaisePerSqInch ?? object(item?.priceFormula).ratePerSqInch), minimumArea: asString(object(item?.priceFormula).minimumArea), minimumCharge: asString(object(item?.priceFormula).minimumCharge), bladeCharge: asString(object(item?.priceFormula).bladeCharge), referenceQuantity: asString(object(item?.conditions).quantity) || "1", taxRate: value("taxRate") || "18", productionTime: value("productionTime"), deliveryMethod: value("deliveryMethod") || "COURIER", stateCode: value("stateCode") || "GJ", price: value("price"), status: value("status") || defaultStatus(section), notes: value("notes"), internalNotes: value("internalNotes"), contactName: value("contactName"), email: value("email"), phone: value("phone"), companyName: value("companyName"), gstNumber: value("gstNumber"), message: value("message"), tone: value("tone") || "INFO", placement: value("placement") || (section === "banners" ? "HOME_HERO_BOTTOM" : "GLOBAL"), animationType: value("animationType") || (section === "banners" ? "FADE" : "MARQUEE"), priority: value("priority") || "NORMAL", subtitle: value("subtitle"), badge: value("badge"), ctaLabel: value("ctaLabel"), ctaUrl: value("ctaUrl"), imageUrl: value("imageUrl"), storageKey: value("storageKey"), linkLabel: value("linkLabel"), linkUrl: value("linkUrl"), startsAt: dateInput(item?.startsAt), endsAt: dateInput(item?.endsAt), method: value("method") || "MANUAL", amount: value("amount"), orderId: value("orderId"), provider: value("provider"), providerOrderId: value("providerOrderId"), providerPaymentId: value("providerPaymentId"), password: "", quantity: "1", unitPrice: "0", itemDescription: "",
  }));
  const [formError, setFormError] = useState("");
  const toggleValue = (key: string, fallback: boolean) => asBoolean(item?.[key], fallback);
  const [toggles, setToggles] = useState<Record<string, boolean>>({ isActive: toggleValue("isActive", true), isImportant: toggleValue("isImportant", false), taxInclusive: toggleValue("taxInclusive", false), isDefault: toggleValue("isDefault", false), pricesTaxInclusive: toggleValue("pricesTaxInclusive", false), createLogin: false });
  const update = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    try { await onSubmit(buildPayload(section, form, toggles, Boolean(item))); } catch (caught) { setFormError(message(caught)); }
  }
  return <form onSubmit={submit} className="space-y-5"><ModuleFields section={section} form={form} toggles={toggles} products={products} update={update} setForm={setForm} setToggles={setToggles} editing={Boolean(item)} /><div className="flex flex-wrap justify-end gap-2 border-t border-[#e4e8ef] pt-5"><button type="button" onClick={onCancel} className="border border-[#c9d2df] bg-white px-4 py-2.5 text-sm font-bold text-[#24324a]">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Check size={16} />{saving ? "Saving..." : "Save changes"}</button></div>{formError ? <p className="text-sm font-medium text-[#b13a2f]">{formError}</p> : null}</form>;
}

function ModuleFields({ section, form, toggles, products, update, setForm, setToggles, editing }: { section: ModuleKey; form: Record<string, string>; toggles: Record<string, boolean>; products: Row[]; update: (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>; setToggles: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; editing: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/banners/image", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error?.message || "Image upload failed.");
      setForm((cur) => ({ ...cur, imageUrl: payload.data.imageUrl, storageKey: payload.data.storageKey }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  const fieldClass = "mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]";

  if (section === "notices") {
    return <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Title<input required value={form.title} onChange={update("title")} placeholder="e.g. CDR artwork required for applicable products" className={fieldClass} /></label>
      <label className="text-sm font-semibold">Placement<select value={form.placement} onChange={update("placement")} className={fieldClass}><option value="GLOBAL">GLOBAL (All pages)</option><option value="HOME">HOME (Homepage only)</option><option value="ORDERING">ORDERING (Ordering & Catalog)</option></select></label>
      <label className="text-sm font-semibold">Tone<select value={form.tone} onChange={update("tone")} className={fieldClass}><option value="INFO">INFO (Calm blue)</option><option value="WARNING">WARNING (Amber notice)</option><option value="SUCCESS">SUCCESS (Green calm)</option></select></label>
      <label className="text-sm font-semibold">Animation type<select value={form.animationType} onChange={update("animationType")} className={fieldClass}><option value="MARQUEE">MARQUEE (Continuous moving ticker)</option><option value="STATIC">STATIC (Stationary notice bar)</option></select></label>
      <label className="text-sm font-semibold">Priority<select value={form.priority} onChange={update("priority")} className={fieldClass}><option value="HIGH">HIGH</option><option value="NORMAL">NORMAL</option><option value="LOW">LOW</option></select></label>
      <label className="text-sm font-semibold">Display order<input required type="number" min="0" value={form.sortOrder} onChange={update("sortOrder")} className={fieldClass} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Message<textarea required rows={3} value={form.message} onChange={update("message")} placeholder="Details or file instructions for customers..." className={fieldClass} /></label>
      <label className="text-sm font-semibold">Optional link label<input value={form.linkLabel} onChange={update("linkLabel")} placeholder="e.g. View Products / Request Quote" className={fieldClass} /></label>
      <label className="text-sm font-semibold">Optional link URL<input value={form.linkUrl} onChange={update("linkUrl")} placeholder="e.g. /products or /quote" className={fieldClass} /></label>
      <label className="text-sm font-semibold">Starts at (Schedule)<input type="datetime-local" value={form.startsAt} onChange={update("startsAt")} className={fieldClass} /></label>
      <label className="text-sm font-semibold">Ends at (Schedule)<input type="datetime-local" value={form.endsAt} onChange={update("endsAt")} className={fieldClass} /></label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={toggles.isActive} onChange={(event) => setToggles((current) => ({ ...current, isActive: event.target.checked }))} className="size-4 accent-[#2457b8]" />Published & active</label>
    </div>;
  }

  if (section === "banners") {
    return <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Title<input required value={form.title} onChange={update("title")} placeholder="e.g. Business printing, one place." className={fieldClass} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Subtitle / Short text<textarea rows={2} value={form.subtitle} onChange={update("subtitle")} placeholder="e.g. Visiting cards, carton packaging, custom product labels and stationery." className={fieldClass} /></label>
      <label className="text-sm font-semibold">Placement<select value={form.placement} onChange={update("placement")} className={fieldClass}><option value="HOME_HERO">HOME_HERO (Homepage Hero Slideshow)</option><option value="HOME_HERO_BOTTOM">HOME_HERO_BOTTOM (Below Hero Cards)</option><option value="HOME_MID">HOME_MID (Homepage Middle Section)</option><option value="CATALOG_TOP">CATALOG_TOP (Catalog & Products Top)</option><option value="CART_CHECKOUT">CART_CHECKOUT (Cart & Quote Pages)</option><option value="GLOBAL">GLOBAL (Site-wide)</option></select></label>
      <label className="text-sm font-semibold">Animation type<select value={form.animationType} onChange={update("animationType")} className={fieldClass}><option value="FADE">FADE (Gentle entrance fade)</option><option value="SLIDE_UP">SLIDE_UP (Gentle slide up)</option><option value="IMAGE_ZOOM">IMAGE_ZOOM (Subtle hover zoom)</option><option value="NONE">NONE (Stationary)</option></select></label>
      <label className="text-sm font-semibold">Badge text (optional)<input value={form.badge} onChange={update("badge")} placeholder="e.g. Commercial Printing / Bulk Orders" className={fieldClass} /></label>
      <label className="text-sm font-semibold">Display order<input required type="number" min="0" value={form.sortOrder} onChange={update("sortOrder")} className={fieldClass} /></label>
      <label className="text-sm font-semibold">CTA label (optional)<input value={form.ctaLabel} onChange={update("ctaLabel")} placeholder="e.g. Browse Products / Request Quote" className={fieldClass} /></label>
      <label className="text-sm font-semibold">CTA URL (optional)<input value={form.ctaUrl} onChange={update("ctaUrl")} placeholder="e.g. /products or /quote" className={fieldClass} /></label>
      
      <div className="sm:col-span-2 border border-[#d7e1f2] bg-[#f7f9fc] p-3.5 rounded-lg space-y-2">
        <span className="block text-xs font-bold uppercase tracking-wider text-[#2457b8]">R2 Image Asset</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Upload Image to R2<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={uploading} className={fieldClass} /></label>
          <label className="text-sm font-semibold">Image URL<input value={form.imageUrl} onChange={update("imageUrl")} placeholder="/images/mahavir-print-assortment.png or /api/storage/..." className={fieldClass} /></label>
        </div>
        {uploading ? <p className="text-xs text-[#2457b8]">Uploading banner to R2 storage...</p> : null}
        {uploadError ? <p className="text-xs text-[#b13a2f]">{uploadError}</p> : null}
      </div>

      <label className="text-sm font-semibold">Starts at (Schedule)<input type="datetime-local" value={form.startsAt} onChange={update("startsAt")} className={fieldClass} /></label>
      <label className="text-sm font-semibold">Ends at (Schedule)<input type="datetime-local" value={form.endsAt} onChange={update("endsAt")} className={fieldClass} /></label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={toggles.isActive} onChange={(event) => setToggles((current) => ({ ...current, isActive: event.target.checked }))} className="size-4 accent-[#2457b8]" />Active and visible</label>
    </div>;
  }

  const toggle = (key: string, label: string) => <label className="flex items-center gap-2 text-sm font-semibold text-[#263753]"><input type="checkbox" checked={toggles[key]} onChange={(event) => setToggles((current) => ({ ...current, [key]: event.target.checked }))} className="size-4 accent-[#2457b8]" />{label}</label>;
  const field = (label: string, key: string, options: { type?: string; required?: boolean; placeholder?: string } = {}) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><input type={options.type ?? "text"} required={options.required} value={form[key] ?? ""} onChange={update(key)} placeholder={options.placeholder} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]" /></label>;
  const area = (label: string, key: string, required = false) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><textarea required={required} value={form[key] ?? ""} onChange={update(key)} rows={4} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]" /></label>;
  const select = (label: string, key: string, options: string[]) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><select value={form[key] ?? ""} onChange={update(key)} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (section === "categories") return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Slug", "slug", { required: true, placeholder: "visiting-card" })}{field("Display order", "sortOrder", { type: "number", required: true })}<div className="flex items-end pb-2">{toggle("isActive", "Available in catalogue")}</div><div className="sm:col-span-2">{area("Description", "description")}</div></div>;
  if (section === "addons") return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Code", "code", { required: true, placeholder: "MATT_LAMINATION" })}{select("Pricing type", "pricingType", ["FIXED", "PER_UNIT", "CUSTOM"])}<div className="flex items-end pb-2">{toggle("isActive", "Active add-on")}</div><div className="sm:col-span-2">{area("Description", "description")}</div><div className="sm:col-span-2">{area("Price configuration (JSON)", "priceConfiguration")}</div></div>;
  if (section === "pricing") return <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#263753]"><span>Product</span><select required value={form.productId} onChange={update("productId")} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select product</option>{products.map((product) => <option key={text(product.id)} value={text(product.id)}>{text(product.name)}</option>)}</select></label>{field("Rule name", "name", { required: true })}{select("Rule type", "ruleType", ["FIXED_PER_REFERENCE_QUANTITY", "FIXED", "PER_SQ_INCH"])}{field("Reference quantity", "referenceQuantity", { type: "number", required: true })}{form.ruleType === "PER_SQ_INCH" ? <>{select("Rate unit", "rateUnit", ["PAISE", "RUPEES"])}{field(form.rateUnit === "PAISE" ? "Rate (paise / sq.in)" : "Rate (₹ / sq.in)", "rateValue", { type: "number", required: true })}{field("Minimum area (sq.in)", "minimumArea", { type: "number" })}{field("Minimum charge (₹)", "minimumCharge", { type: "number" })}{field("Half-blade charge (₹)", "bladeCharge", { type: "number" })}</> : field("Base amount (₹, GST extra)", "baseAmount", { type: "number", required: true })}{field("GST rate (%)", "taxRate", { type: "number", required: true })}{field("Production time", "productionTime")}{field("Display order", "sortOrder", { type: "number", required: true })}<div className="flex items-end gap-5 pb-2">{toggle("taxInclusive", "Amount already includes GST")}{toggle("isActive", "Active")}</div></div>;
  if (section === "delivery") return <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#263753]"><span>Product</span><select required value={form.productId} onChange={update("productId")} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select product</option>{products.map((product) => <option key={text(product.id)} value={text(product.id)}>{text(product.name)}</option>)}</select></label>{select("Method", "deliveryMethod", ["PICKUP", "COURIER"])}<label className="block text-sm font-semibold text-[#263753]"><span>State</span><select required value={form.stateCode} onChange={update("stateCode")} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"><option value="*">All / Pickup (*)</option><option value="GJ">Gujarat (GJ)</option><option value="RJ">Rajasthan (RJ)</option></select></label>{field("Charge (₹, GST extra)", "price", { required: true, placeholder: "0.00" })}<div className="flex items-end gap-5 pb-2">{toggle("taxInclusive", "Charge already includes GST")}{toggle("isActive", "Active")}</div></div>;
  if (section === "quotes") return <div className="grid gap-4 sm:grid-cols-2">{field("Contact name", "contactName", { required: true })}{field("Email", "email", { type: "email", required: true })}{field("Phone", "phone")}{field("Company", "companyName")}{field("Item description", "itemDescription", { required: !editing })}{field("Quantity", "quantity", { type: "number", required: !editing })}{field("Unit price", "unitPrice", { required: !editing })}{select("Status", "status", ["NEW", "REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER", "CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"])}<div className="sm:col-span-2">{area("Notes", "notes")}</div></div>;
  if (section === "orders") return <div className="grid gap-4 sm:grid-cols-2">{select("Status", "status", ["PENDING", "CONFIRMED", "ARTWORK_APPROVED", "IN_PRODUCTION", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"])}<div className="sm:col-span-2">{area("Internal notes", "notes")}</div></div>;
  if (section === "customers") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("Contact name", "contactName", { required: true, placeholder: "e.g. Rajesh Shah" })}
          {field("Company name", "companyName", { required: true, placeholder: "e.g. Shah Printing Press" })}
          {field("Phone (10-digit mobile)", "phone", { placeholder: "e.g. 9876543210" })}
          {field("Email address", "email", { type: "email", placeholder: "e.g. customer@example.com", required: toggles.createLogin })}
          {field("GST number (optional)", "gstNumber", { placeholder: "e.g. 24AAAAA0000A1Z5" })}
          {select("Customer type", "customerType", ["B2B", "B2C"])}
          {field("City", "city", { placeholder: "e.g. Ahmedabad" })}
          <label className="block text-sm font-semibold text-[#263753]">
            <span>State</span>
            <select
              value={form.stateCode || "GJ"}
              onChange={(event) => update("stateCode")(event)}
              className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"
            >
              <option value="GJ">Gujarat (GJ)</option>
              <option value="RJ">Rajasthan (RJ)</option>
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-[#e1e6ee] bg-[#f8fafc] p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#2457b8] mb-3">Credit & Balance Settings</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            {field(!editing ? "Opening balance (₹)" : "Available balance (₹)", "availableCredit", { placeholder: "0.00" })}
            {field("Credit limit (₹)", "creditLimit", { placeholder: "0.00" })}
            {field("Payment terms (days)", "paymentTermsDays", { type: "number", placeholder: "0" })}
            {select("Credit enabled", "creditEnabled", ["false", "true"])}
            {editing ? select("Account status", "status", ["ACTIVE", "INACTIVE"]) : null}
          </div>
        </div>

        {!editing ? (
          <div className="rounded-lg border border-[#c9d2df] bg-white p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-[#162237] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(toggles.createLogin)}
                onChange={(e) => setToggles((cur) => ({ ...cur, createLogin: e.target.checked }))}
                className="size-4 accent-[#2457b8]"
              />
              Create storefront login account for this customer
            </label>
            <p className="text-xs text-[#607089]">
              Enable this if you want the customer to be able to sign in to the storefront website (mahavircard.in) with their email and password.
            </p>

            {toggles.createLogin ? (
              <div className="pt-2 border-t border-[#e8ecf2] grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-[#2457b8]">
                    Note: Email entered above will be their username.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#263753]">
                    <span>Initial Password</span>
                    <input
                      type="password"
                      required={Boolean(toggles.createLogin)}
                      minLength={8}
                      value={form.password || ""}
                      onChange={update("password")}
                      placeholder="Minimum 8 characters"
                      className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  if (section === "inquiries") return <div className="grid gap-4">{select("Status", "status", ["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_REQUESTED", "CONVERTED", "CLOSED", "LOST"])}{area("Inquiry message", "message", true)}{area("Internal notes", "internalNotes")}</div>;
  if (section === "payments") return <div className="grid gap-4 sm:grid-cols-2">{!editing ? <>{field("Order ID", "orderId", { required: true })}{field("Amount", "amount", { required: true, placeholder: "0.00" })}{select("Method", "method", ["MANUAL", "RAZORPAY", "COD", "CREDIT", "UPI_QR"])}{select("Status", "status", ["PAID", "PENDING", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED", "CREDIT_APPROVED"])}</> : <>{field("Amount", "amount", { required: true })}{select("Method", "method", ["MANUAL", "RAZORPAY", "COD", "CREDIT", "UPI_QR"])}{select("Status", "status", ["PAID", "PENDING", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED", "CREDIT_APPROVED"])}{field("Provider", "provider")}</>}{field("Provider order ID", "providerOrderId")}{field("Provider payment ID", "providerPaymentId")}</div>;
  if (section === "artworks") return <div className="grid gap-4 sm:grid-cols-2">{select("Review status", "status", ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED", "REJECTED"])}<div className="sm:col-span-2">{area("Review notes", "notes")}</div><p className="text-xs leading-5 text-[#607089] sm:col-span-2">The stored object is immutable from this form. Use the protected download action to review the private CDR file.</p></div>;
  if (section === "terms") {
    return <div className="grid gap-4 sm:grid-cols-2">
      {field("Title (English)", "title", { required: true, placeholder: "e.g. Color Matching & Job Profiling" })}
      {select("Category", "category", ["GENERAL", "COLOR_QUALITY", "DISPATCH_TRANSIT", "LEGAL", "ARTWORK", "PAYMENT_ORDER"])}
      {field("Title (Gujarati)", "titleGu", { placeholder: "કલર મેચિંગ અને જોબ પ્રોફાઇલિંગ" })}
      {field("Title (Hindi)", "titleHi", { placeholder: "कलर मैचिंग और जॉब प्रोफाइलिंग" })}
      {field("Display order", "sortOrder", { type: "number", required: true })}
      <div className="flex flex-col justify-end gap-2 pb-2">
        {toggle("isImportant", "Highlight in RED (Important notice with visual effect)")}
        {toggle("isActive", "Active and visible on storefront")}
      </div>
      <div className="sm:col-span-2">{area("Condition content (English)", "content", true)}</div>
      <div className="sm:col-span-2">{area("Condition content (Gujarati)", "contentGu")}</div>
      <div className="sm:col-span-2">{area("Condition content (Hindi)", "contentHi")}</div>
    </div>;
  }
  return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Email", "email", { type: "email", required: !editing })}{field("Mobile number", "phoneNumber")}{!editing ? field("Temporary password", "password", { type: "password", required: true }) : select("Access", "status", ["ACTIVE", "INACTIVE"])}{editing ? null : <p className="self-end text-xs leading-5 text-[#607089]">The administrator sets a new password after first login.</p>}</div>;
}

function buildPayload(section: ModuleKey, form: Record<string, string>, toggles: Record<string, boolean>, editing: boolean): Record<string, unknown> {
  if (section === "terms") return { title: form.title, titleGu: empty(form.titleGu) ?? null, titleHi: empty(form.titleHi) ?? null, content: form.content, contentGu: empty(form.contentGu) ?? null, contentHi: empty(form.contentHi) ?? null, category: form.category || "GENERAL", isImportant: toggles.isImportant ?? false, sortOrder: number(form.sortOrder), isActive: toggles.isActive ?? true };
  if (section === "notices") return { title: form.title, message: form.message, tone: form.tone, placement: form.placement, animationType: form.animationType || "MARQUEE", priority: form.priority || "NORMAL", linkLabel: empty(form.linkLabel) ?? null, linkUrl: empty(form.linkUrl) ?? null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, sortOrder: number(form.sortOrder), isActive: toggles.isActive };
  if (section === "banners") return { title: form.title, subtitle: empty(form.subtitle) ?? null, badge: empty(form.badge) ?? null, ctaLabel: empty(form.ctaLabel) ?? null, ctaUrl: empty(form.ctaUrl) ?? null, imageUrl: empty(form.imageUrl) ?? null, storageKey: empty(form.storageKey) ?? null, placement: form.placement || "HOME_HERO_BOTTOM", animationType: form.animationType || "FADE", startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, sortOrder: number(form.sortOrder), isActive: toggles.isActive };
  if (section === "categories") return { name: form.name, slug: form.slug, description: empty(form.description), sortOrder: number(form.sortOrder), isActive: toggles.isActive };
  if (section === "addons") return { name: form.name, code: form.code, description: empty(form.description), pricingType: form.pricingType, priceConfiguration: parseJson(form.priceConfiguration, "Price configuration"), isActive: toggles.isActive };
  if (section === "pricing") {
    const conditions = { ...parseJson(form.conditions, "Stored conditions"), quantity: number(form.referenceQuantity) };
    const storedFormula = parseJson(form.priceFormula, "Stored price formula");
    const priceFormula = form.ruleType === "PER_SQ_INCH"
      ? { ...storedFormula, amount: undefined, rateUnit: form.rateUnit, ratePaisePerSqInch: form.rateUnit === "PAISE" ? number(form.rateValue) : null, ratePerSqInch: form.rateUnit === "PAISE" ? number(form.rateValue) / 100 : number(form.rateValue), minimumArea: nullableNumber(form.minimumArea), minimumCharge: nullableNumber(form.minimumCharge), bladeCharge: nullableNumber(form.bladeCharge) }
      : { ...storedFormula, amount: form.baseAmount, unit: "batch" };
    return { productId: form.productId, name: form.name, ruleType: form.ruleType, conditions, priceFormula, taxRate: form.taxRate, productionTime: empty(form.productionTime), sortOrder: number(form.sortOrder), taxInclusive: toggles.taxInclusive, isActive: toggles.isActive };
  }
  if (section === "delivery") return { productId: form.productId, deliveryMethod: form.deliveryMethod, stateCode: form.stateCode, price: form.price, taxInclusive: toggles.taxInclusive, isActive: toggles.isActive, sortOrder: 0 };
  if (section === "quotes") return editing ? { status: form.status, notes: empty(form.notes) } : { contactName: form.contactName, email: form.email, phone: empty(form.phone), companyName: empty(form.companyName), notes: empty(form.notes), items: [{ description: form.itemDescription, quantity: number(form.quantity), unitPrice: form.unitPrice, configuration: {} }] };
  if (section === "orders") return { status: form.status, notes: empty(form.notes) };
  if (section === "customers") return { contactName: form.contactName, companyName: form.companyName, phone: empty(form.phone), email: empty(form.email), gstNumber: empty(form.gstNumber), customerType: form.customerType || "B2C", city: empty(form.city), state: form.stateCode === "RJ" ? "Rajasthan" : "Gujarat", stateCode: form.stateCode || "GJ", creditEnabled: form.creditEnabled === "true", creditLimit: form.creditLimit || "0", availableCredit: form.availableCredit || "0", paymentTermsDays: number(form.paymentTermsDays || "0"), status: form.status, createLogin: toggles.createLogin ?? false, password: form.password };
  if (section === "inquiries") return { status: form.status, message: form.message, internalNotes: empty(form.internalNotes) };
  if (section === "payments") return { ...(editing ? {} : { orderId: form.orderId }), method: form.method, amount: form.amount, status: form.status, provider: empty(form.provider), providerOrderId: empty(form.providerOrderId), providerPaymentId: empty(form.providerPaymentId) };
  if (section === "artworks") return { status: form.status, notes: empty(form.notes) };
  return editing ? { phoneNumber: empty(form.phoneNumber), status: form.status } : { name: form.name, email: form.email, phoneNumber: empty(form.phoneNumber), password: form.password };
}

function actionPath(section: ModuleKey, id: string) {
  if (section === "delivery") return `/api/admin/delivery?id=${id}`;
  if (section === "payments") return `/api/admin/payments/${id}`;
  if (section === "admins") return `/api/admin/admins/${id}`;
  return `/api/admin/${section}/${id}`;
}
function deletePath(section: ModuleKey, id: string, item: Row) { return section === "delivery" ? `/api/admin/delivery?id=${id}&productId=${text(item.productId)}` : `/api/admin/${section}/${id}`; }
function rowId(section: ModuleKey, item: Row | null) { return text(section === "payments" ? nested(item ?? {}, "payment.id") : section === "admins" ? nested(item ?? {}, "admin.id") : item?.id); }
function defaultStatus(section: ModuleKey) { return section === "quotes" ? "NEW" : section === "orders" ? "PENDING" : section === "customers" ? "ACTIVE" : section === "inquiries" ? "NEW" : section === "artworks" ? "PENDING_REVIEW" : section === "payments" ? "PAID" : section === "admins" ? "ACTIVE" : ""; }
function empty(value: string) { return value.trim() ? value.trim() : undefined; }
function number(value: string) { return Number(value || 0); }
function nullableNumber(value: string) { return value.trim() ? Number(value) : null; }
function dateInput(value: unknown) { if (!value) return ""; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function singular(value: string) { return value.endsWith("ies") ? `${value.slice(0, -3)}y` : value.endsWith("s") ? value.slice(0, -1) : value; }
function message(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }

function Notice({ tone, children, onDismiss }: { tone: "success" | "error"; children: React.ReactNode; onDismiss: () => void }) { return <div className={`mt-5 flex items-start justify-between gap-3 border p-3 text-sm ${tone === "success" ? "border-[#bbdfc9] bg-[#f3fbf5] text-[#1e6b3a]" : "border-[#efc4be] bg-[#fff6f4] text-[#a9362c]"}`}><span className="flex gap-2"><CircleAlert size={17} className="mt-0.5 shrink-0" />{children}</span><button type="button" onClick={onDismiss} aria-label="Dismiss"><X size={16} /></button></div>; }
