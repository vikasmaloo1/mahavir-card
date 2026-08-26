"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Download, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { adminRequest, asItems, formattedAmount, formattedDate } from "@/lib/admin-client";

type Row = Record<string, unknown>;
type ModuleKey = "categories" | "addons" | "pricing" | "delivery" | "orders" | "quotes" | "customers" | "inquiries" | "payments" | "artworks" | "admins";

const moduleCopy: Record<ModuleKey, { title: string; description: string; endpoint: string; createLabel?: string }> = {
  categories: { title: "Categories", description: "Organize the storefront catalogue and control category availability.", endpoint: "/api/admin/categories", createLabel: "New category" },
  addons: { title: "Add-ons", description: "Maintain the optional finishing and service add-ons used by products.", endpoint: "/api/admin/addons", createLabel: "New add-on" },
  pricing: { title: "Pricing", description: "Maintain server-side pricing rules. Product editors provide the same rules in context.", endpoint: "/api/admin/pricing", createLabel: "New pricing rule" },
  delivery: { title: "Delivery", description: "Set product-specific pickup, local delivery, and state-based courier charges.", endpoint: "/api/admin/delivery", createLabel: "New delivery rule" },
  orders: { title: "Orders", description: "Move real production orders through the fulfilment workflow.", endpoint: "/api/admin/orders" },
  quotes: { title: "Quotes", description: "Create and manage quotations before they become orders.", endpoint: "/api/admin/quotes", createLabel: "New quote" },
  customers: { title: "Customers", description: "Maintain customer contact and account information.", endpoint: "/api/admin/customers" },
  inquiries: { title: "Inquiries", description: "Qualify incoming print requirements and convert them to quotations.", endpoint: "/api/admin/inquiries" },
  payments: { title: "Payments", description: "Record manual payments and update COD or payment-provider records.", endpoint: "/api/admin/payments", createLabel: "Record payment" },
  artworks: { title: "Artwork", description: "Review uploaded CorelDRAW artwork and communicate approval decisions.", endpoint: "/api/admin/artworks" },
  admins: { title: "Administrators", description: "Create and manage restricted administrative accounts.", endpoint: "/api/admin/admins", createLabel: "New administrator" },
};

const columns: Record<ModuleKey, { label: string; value: (row: Row) => string }[]> = {
  categories: [{ label: "Category", value: (r) => text(r.name) }, { label: "Slug", value: (r) => text(r.slug) }, { label: "Order", value: (r) => text(r.sortOrder) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  addons: [{ label: "Add-on", value: (r) => text(r.name) }, { label: "Code", value: (r) => text(r.code) }, { label: "Pricing", value: (r) => text(r.pricingType) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  pricing: [{ label: "Rule", value: (r) => text(r.name) }, { label: "Type", value: (r) => text(r.ruleType) }, { label: "Tax", value: (r) => boolLabel(r.taxInclusive, "Inclusive", "Exclusive") }, { label: "Status", value: (r) => enabled(r.isActive) }],
  delivery: [{ label: "Product", value: (r) => text(r.productName) }, { label: "Method", value: (r) => text(r.deliveryMethod) }, { label: "State", value: (r) => text(r.stateCode) }, { label: "Charge", value: (r) => formattedAmount(r.price) }, { label: "Status", value: (r) => enabled(r.isActive) }],
  orders: [{ label: "Order", value: (r) => text(r.orderNumber) }, { label: "Status", value: (r) => text(r.status) }, { label: "Total", value: (r) => formattedAmount(r.total) }, { label: "Created", value: (r) => formattedDate(r.createdAt) }],
  quotes: [{ label: "Quote", value: (r) => text(r.quoteNumber) }, { label: "Customer", value: (r) => text(r.contactName) }, { label: "Status", value: (r) => text(r.status) }, { label: "Total", value: (r) => formattedAmount(r.total) }],
  customers: [{ label: "Customer", value: (r) => text(r.contactName) }, { label: "Company", value: (r) => text(r.companyName) }, { label: "Email", value: (r) => text(r.email) }, { label: "Status", value: (r) => text(r.status) }],
  inquiries: [{ label: "Contact", value: (r) => text(r.contactName) }, { label: "Subject", value: (r) => text(r.subject) }, { label: "Email", value: (r) => text(r.email) }, { label: "Status", value: (r) => text(r.status) }, { label: "Received", value: (r) => formattedDate(r.createdAt) }],
  payments: [{ label: "Order", value: (r) => text(r.orderNumber) }, { label: "Customer", value: (r) => text(r.customerEmail) }, { label: "Method", value: (r) => text(nested(r, "payment.method")) }, { label: "Amount", value: (r) => formattedAmount(nested(r, "payment.amount")) }, { label: "Status", value: (r) => text(nested(r, "payment.status")) }],
  artworks: [{ label: "File", value: (r) => text(r.fileName) }, { label: "Type", value: (r) => text(r.extension) }, { label: "Status", value: (r) => text(r.status) }, { label: "Uploaded", value: (r) => formattedDate(r.createdAt) }],
  admins: [{ label: "Name", value: (r) => text(nested(r, "user.name")) }, { label: "Email", value: (r) => text(nested(r, "user.email")) }, { label: "Phone", value: (r) => text(nested(r, "user.phoneNumber")) }, { label: "Access", value: (r) => text(nested(r, "admin.status")) }],
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

export function AdminModule({ section }: { section: ModuleKey }) {
  const config = moduleCopy[section];
  const [items, setItems] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
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

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((item) => columns[section].some((column) => column.value(item).toLowerCase().includes(term))) : items;
  }, [items, query, section]);

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

  return <div>
    <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Admin CMS</p><h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">{config.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">{config.description}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load(page)} disabled={loading} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold text-[#24324a] hover:border-[#2457b8] disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>{config.createLabel ? <button type="button" onClick={() => { setCreating(true); setEditing(null); setError(""); }} className="inline-flex items-center gap-2 bg-[#2457b8] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#17479f]"><Plus size={16} />{config.createLabel}</button> : null}</div>
    </header>

    {notice ? <Notice tone="success" onDismiss={() => setNotice("")}>{notice}</Notice> : null}
    {error ? <Notice tone="error" onDismiss={() => setError("")}>{error}</Notice> : null}

    {(creating || editing) ? <section className="mt-6 border border-[#c9d2df] bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between gap-4 border-b border-[#e4e8ef] pb-4"><div><h2 className="font-bold text-[#162237]">{editing ? `Edit ${singular(config.title)}` : config.createLabel}</h2><p className="mt-1 text-sm text-[#607089]">Changes are saved to the live admin API.</p></div><button type="button" onClick={() => { setCreating(false); setEditing(null); setError(""); }} className="p-2 text-[#607089] hover:text-[#162237]" aria-label="Close form"><X size={18} /></button></div><ModuleForm section={section} item={editing} products={products} saving={saving} onSubmit={save} onCancel={() => { setCreating(false); setEditing(null); }} /></section> : null}

    <div className="mt-6 flex items-center gap-3 border border-[#cfd7e3] bg-white px-3"><Search size={17} className="shrink-0 text-[#607089]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#162237] outline-none" /></div>
    {loading ? <div className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading {config.title.toLowerCase()}...</div> : null}
    {!loading && !visible.length ? <div className="mt-6 border border-dashed border-[#c9d2df] bg-white p-8 text-center"><p className="font-bold text-[#162237]">No {config.title.toLowerCase()} found.</p><p className="mt-2 text-sm text-[#607089]">Use the new-record control when this module supports creation.</p></div> : null}
    {!loading && visible.length ? <ResourceTable section={section} items={visible} saving={saving} onEdit={(item) => { setEditing(item); setCreating(false); setError(""); }} onDelete={remove} onConvert={convertInquiry} /> : null}
    {["orders", "quotes", "customers", "inquiries"].includes(section) ? <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={page === 1 || loading} onClick={() => void load(page - 1)} className="inline-flex items-center gap-1 border border-[#c9d2df] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={16} />Previous</button><button type="button" disabled={items.length < 100 || loading} onClick={() => void load(page + 1)} className="inline-flex items-center gap-1 border border-[#c9d2df] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">Next<ChevronRight size={16} /></button></div> : null}
  </div>;
}

function ResourceTable({ section, items, saving, onEdit, onDelete, onConvert }: { section: ModuleKey; items: Row[]; saving: boolean; onEdit: (item: Row) => void; onDelete: (item: Row) => void; onConvert: (item: Row) => void }) {
  const actionLabel = section === "categories" || section === "delivery" ? "Remove" : section === "customers" || section === "orders" || section === "quotes" || section === "inquiries" || section === "artworks" || section === "payments" ? "Update" : "Deactivate";
  return <><div className="mt-6 space-y-3 md:hidden">{items.map((item) => <article key={rowId(section, item)} className="border border-[#d7dce5] bg-white p-4"><div className="space-y-2">{columns[section].map((column) => <div key={column.label} className="flex justify-between gap-5"><span className="text-xs font-bold uppercase tracking-[0.08em] text-[#607089]">{column.label}</span><span className="text-right text-sm font-medium text-[#162237]">{column.value(item)}</span></div>)}</div><Actions section={section} item={item} saving={saving} actionLabel={actionLabel} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} /></article>)}</div><div className="mt-6 hidden overflow-x-auto border border-[#d7dce5] bg-white md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#d7dce5] bg-[#f7f9fc]"><tr>{columns[section].map((column) => <th key={column.label} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#52647e]">{column.label}</th>)}<th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[#52647e]">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={rowId(section, item)} className="border-b border-[#e8ecf2] last:border-0">{columns[section].map((column) => <td key={column.label} className="max-w-60 px-4 py-3 align-top text-[#263753]">{column.value(item)}</td>)}<td className="px-4 py-3"><Actions section={section} item={item} saving={saving} actionLabel={actionLabel} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} /></td></tr>)}</tbody></table></div></>;
}

function Actions({ section, item, saving, actionLabel, onEdit, onDelete, onConvert }: { section: ModuleKey; item: Row; saving: boolean; actionLabel: string; onEdit: (item: Row) => void; onDelete: (item: Row) => void; onConvert: (item: Row) => void }) {
  if (section === "pricing") return <div className="mt-4 flex flex-wrap justify-end gap-2"><Link href={`/admin/products/${text(item.productId)}?tab=pricing`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]">Open product</Link><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] p-1.5 text-[#24324a]" aria-label="Edit"><Pencil size={15} /></button><button type="button" onClick={() => onDelete(item)} disabled={saving} className="border border-[#efc4be] p-1.5 text-[#b13a2f]" aria-label="Deactivate"><Trash2 size={15} /></button></div>;
  if (section === "inquiries") return <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onConvert(item)} disabled={saving || item.status === "CONVERTED"} className="border border-[#b8ccf5] px-2.5 py-1.5 text-xs font-bold text-[#2457b8] disabled:opacity-40">Create quote</button><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">Update</button></div>;
  if (section === "artworks") return <div className="mt-4 flex flex-wrap justify-end gap-2"><a href={`/api/artworks/${text(item.id)}/download`} className="inline-flex items-center gap-1.5 border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]"><Download size={14} />Download CDR</a><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">{actionLabel}</button></div>;
  if (["orders", "quotes", "customers", "payments"].includes(section)) return <div className="mt-4 flex justify-end"><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">{actionLabel}</button></div>;
  return <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => onEdit(item)} className="border border-[#c9d2df] p-1.5 text-[#24324a]" aria-label="Edit"><Pencil size={15} /></button><button type="button" onClick={() => onDelete(item)} disabled={saving} className="border border-[#efc4be] p-1.5 text-[#b13a2f]" aria-label={actionLabel}><Trash2 size={15} /></button></div>;
}

function ModuleForm({ section, item, products, saving, onSubmit, onCancel }: { section: ModuleKey; item: Row | null; products: Row[]; saving: boolean; onSubmit: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const value = (key: string) => asString(section === "payments" ? nested(item ?? {}, `payment.${key}`) : section === "admins" ? nested(item ?? {}, key === "status" ? "admin.status" : `user.${key}`) : item?.[key]);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    name: value("name"), slug: value("slug"), description: value("description"), sortOrder: value("sortOrder") || "0", code: value("code"), pricingType: value("pricingType") || "FIXED", priceConfiguration: asJson(item?.priceConfiguration), productId: value("productId"), ruleType: value("ruleType") || "PDF_PRICE_LIST", conditions: asJson(item?.conditions), priceFormula: asJson(item?.priceFormula), deliveryMethod: value("deliveryMethod") || "COURIER", stateCode: value("stateCode") || "*", price: value("price"), status: value("status") || defaultStatus(section), notes: value("notes"), contactName: value("contactName"), email: value("email"), phone: value("phone"), companyName: value("companyName"), gstNumber: value("gstNumber"), message: value("message"), method: value("method") || "MANUAL", amount: value("amount"), orderId: value("orderId"), provider: value("provider"), providerOrderId: value("providerOrderId"), providerPaymentId: value("providerPaymentId"), password: "", quantity: "1", unitPrice: "0", itemDescription: "",
  }));
  const [formError, setFormError] = useState("");
  const toggleValue = (key: string, fallback: boolean) => asBoolean(item?.[key], fallback);
  const [toggles, setToggles] = useState<Record<string, boolean>>({ isActive: toggleValue("isActive", true), taxInclusive: toggleValue("taxInclusive", true), isDefault: toggleValue("isDefault", false), pricesTaxInclusive: toggleValue("pricesTaxInclusive", true) });
  const update = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    try { await onSubmit(buildPayload(section, form, toggles, Boolean(item))); } catch (caught) { setFormError(message(caught)); }
  }
  return <form onSubmit={submit} className="space-y-5"><ModuleFields section={section} form={form} toggles={toggles} products={products} update={update} setToggles={setToggles} editing={Boolean(item)} /><div className="flex flex-wrap justify-end gap-2 border-t border-[#e4e8ef] pt-5"><button type="button" onClick={onCancel} className="border border-[#c9d2df] bg-white px-4 py-2.5 text-sm font-bold text-[#24324a]">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Check size={16} />{saving ? "Saving..." : "Save changes"}</button></div>{formError ? <p className="text-sm font-medium text-[#b13a2f]">{formError}</p> : null}</form>;
}

function ModuleFields({ section, form, toggles, products, update, setToggles, editing }: { section: ModuleKey; form: Record<string, string>; toggles: Record<string, boolean>; products: Row[]; update: (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; setToggles: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; editing: boolean }) {
  const toggle = (key: string, label: string) => <label className="flex items-center gap-2 text-sm font-semibold text-[#263753]"><input type="checkbox" checked={toggles[key]} onChange={(event) => setToggles((current) => ({ ...current, [key]: event.target.checked }))} className="size-4 accent-[#2457b8]" />{label}</label>;
  const field = (label: string, key: string, options: { type?: string; required?: boolean; placeholder?: string } = {}) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><input type={options.type ?? "text"} required={options.required} value={form[key] ?? ""} onChange={update(key)} placeholder={options.placeholder} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]" /></label>;
  const area = (label: string, key: string, required = false) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><textarea required={required} value={form[key] ?? ""} onChange={update(key)} rows={4} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]" /></label>;
  const select = (label: string, key: string, options: string[]) => <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span><select value={form[key] ?? ""} onChange={update(key)} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#2457b8]">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (section === "categories") return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Slug", "slug", { required: true, placeholder: "business-cards" })}{field("Display order", "sortOrder", { type: "number", required: true })}<div className="flex items-end pb-2">{toggle("isActive", "Available in catalogue")}</div><div className="sm:col-span-2">{area("Description", "description")}</div></div>;
  if (section === "addons") return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Code", "code", { required: true, placeholder: "MATT_LAMINATION" })}{select("Pricing type", "pricingType", ["FIXED", "PER_UNIT", "CUSTOM"])}<div className="flex items-end pb-2">{toggle("isActive", "Active add-on")}</div><div className="sm:col-span-2">{area("Description", "description")}</div><div className="sm:col-span-2">{area("Price configuration (JSON)", "priceConfiguration")}</div></div>;
  if (section === "pricing") return <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#263753]"><span>Product</span><select required value={form.productId} onChange={update("productId")} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select product</option>{products.map((product) => <option key={text(product.id)} value={text(product.id)}>{text(product.name)}</option>)}</select></label>{field("Rule name", "name", { required: true })}{field("Rule type", "ruleType", { required: true })}<div className="flex items-end gap-5 pb-2">{toggle("taxInclusive", "Tax inclusive")}{toggle("isActive", "Active")}</div><div className="sm:col-span-2">{area("Conditions (JSON)", "conditions")}</div><div className="sm:col-span-2">{area("Price formula (JSON)", "priceFormula")}</div></div>;
  if (section === "delivery") return <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#263753]"><span>Product</span><select required value={form.productId} onChange={update("productId")} className="mt-1.5 w-full border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select product</option>{products.map((product) => <option key={text(product.id)} value={text(product.id)}>{text(product.name)}</option>)}</select></label>{select("Method", "deliveryMethod", ["PICKUP", "LOCAL_DELIVERY", "COURIER"])}{field("State code", "stateCode", { required: true, placeholder: "GJ or *" })}{field("Charge", "price", { required: true, placeholder: "0.00" })}<div className="flex items-end gap-5 pb-2">{toggle("taxInclusive", "Tax inclusive")}{toggle("isActive", "Active")}</div></div>;
  if (section === "quotes") return <div className="grid gap-4 sm:grid-cols-2">{field("Contact name", "contactName", { required: true })}{field("Email", "email", { type: "email", required: true })}{field("Phone", "phone")}{field("Company", "companyName")}{field("Item description", "itemDescription", { required: !editing })}{field("Quantity", "quantity", { type: "number", required: !editing })}{field("Unit price", "unitPrice", { required: !editing })}{select("Status", "status", ["NEW", "REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER", "CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"])}<div className="sm:col-span-2">{area("Notes", "notes")}</div></div>;
  if (section === "orders") return <div className="grid gap-4 sm:grid-cols-2">{select("Status", "status", ["PENDING", "CONFIRMED", "ARTWORK_REVIEW", "ARTWORK_APPROVED", "IN_PRODUCTION", "QC", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"])}<div className="sm:col-span-2">{area("Internal notes", "notes")}</div></div>;
  if (section === "customers") return <div className="grid gap-4 sm:grid-cols-2">{field("Contact name", "contactName", { required: true })}{field("Company", "companyName", { required: true })}{field("Phone", "phone")}{field("GST number", "gstNumber")}{select("Status", "status", ["ACTIVE", "INACTIVE"])}<p className="self-end text-xs leading-5 text-[#607089]">Email is tied to the customer account and cannot be changed here.</p></div>;
  if (section === "inquiries") return <div className="grid gap-4">{select("Status", "status", ["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_REQUESTED", "CONVERTED", "CLOSED", "LOST"])}{area("Inquiry message", "message", true)}</div>;
  if (section === "payments") return <div className="grid gap-4 sm:grid-cols-2">{!editing ? <>{field("Order ID", "orderId", { required: true })}{field("Amount", "amount", { required: true, placeholder: "0.00" })}{select("Method", "method", ["MANUAL", "RAZORPAY", "COD"])}{select("Status", "status", ["PAID", "PENDING", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED"])}</> : <>{field("Amount", "amount", { required: true })}{select("Method", "method", ["MANUAL", "RAZORPAY", "COD"])}{select("Status", "status", ["PAID", "PENDING", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED"])}{field("Provider", "provider")}</>}{field("Provider order ID", "providerOrderId")}{field("Provider payment ID", "providerPaymentId")}</div>;
  if (section === "artworks") return <div className="grid gap-4 sm:grid-cols-2">{select("Review status", "status", ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED", "REJECTED"])}<div className="sm:col-span-2">{area("Review notes", "notes")}</div><p className="text-xs leading-5 text-[#607089] sm:col-span-2">The stored object is immutable from this form. Use the protected download action to review the private CDR file.</p></div>;
  return <div className="grid gap-4 sm:grid-cols-2">{field("Name", "name", { required: true })}{field("Email", "email", { type: "email", required: !editing })}{field("Mobile number", "phoneNumber")}{!editing ? field("Temporary password", "password", { type: "password", required: true }) : select("Access", "status", ["ACTIVE", "INACTIVE"])}{editing ? null : <p className="self-end text-xs leading-5 text-[#607089]">The administrator sets a new password after first login.</p>}</div>;
}

function buildPayload(section: ModuleKey, form: Record<string, string>, toggles: Record<string, boolean>, editing: boolean): Record<string, unknown> {
  if (section === "categories") return { name: form.name, slug: form.slug, description: empty(form.description), sortOrder: number(form.sortOrder), isActive: toggles.isActive };
  if (section === "addons") return { name: form.name, code: form.code, description: empty(form.description), pricingType: form.pricingType, priceConfiguration: parseJson(form.priceConfiguration, "Price configuration"), isActive: toggles.isActive };
  if (section === "pricing") return { productId: form.productId, name: form.name, ruleType: form.ruleType, conditions: parseJson(form.conditions, "Conditions"), priceFormula: parseJson(form.priceFormula, "Price formula"), taxInclusive: toggles.taxInclusive, isActive: toggles.isActive };
  if (section === "delivery") return { productId: form.productId, deliveryMethod: form.deliveryMethod, stateCode: form.stateCode, price: form.price, taxInclusive: toggles.taxInclusive, isActive: toggles.isActive, sortOrder: 0 };
  if (section === "quotes") return editing ? { status: form.status, notes: empty(form.notes) } : { contactName: form.contactName, email: form.email, phone: empty(form.phone), companyName: empty(form.companyName), notes: empty(form.notes), items: [{ description: form.itemDescription, quantity: number(form.quantity), unitPrice: form.unitPrice, configuration: {} }] };
  if (section === "orders") return { status: form.status, notes: empty(form.notes) };
  if (section === "customers") return { contactName: form.contactName, companyName: form.companyName, phone: empty(form.phone), gstNumber: empty(form.gstNumber), status: form.status };
  if (section === "inquiries") return { status: form.status, message: form.message };
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
function singular(value: string) { return value.endsWith("ies") ? `${value.slice(0, -3)}y` : value.endsWith("s") ? value.slice(0, -1) : value; }
function message(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }

function Notice({ tone, children, onDismiss }: { tone: "success" | "error"; children: React.ReactNode; onDismiss: () => void }) { return <div className={`mt-5 flex items-start justify-between gap-3 border p-3 text-sm ${tone === "success" ? "border-[#bbdfc9] bg-[#f3fbf5] text-[#1e6b3a]" : "border-[#efc4be] bg-[#fff6f4] text-[#a9362c]"}`}><span className="flex gap-2"><CircleAlert size={17} className="mt-0.5 shrink-0" />{children}</span><button type="button" onClick={onDismiss} aria-label="Dismiss"><X size={16} /></button></div>; }
