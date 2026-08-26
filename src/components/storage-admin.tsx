"use client";

import Image from "next/image";
import { Download, FileImage, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Row = Record<string, unknown>;
type Tab = "categories" | "branding" | "documents";

function value(row: Row, key: string) { return row[key] === null || row[key] === undefined ? "" : String(row[key]); }
function rows(payload: unknown): Row[] { return Array.isArray(payload) ? payload as Row[] : []; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The storage request failed."; }
function fileSize(bytes: unknown) { const size = Number(bytes || 0); return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || "The storage request failed.");
  return payload?.data ?? payload;
}

export function StorageAdmin() {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<Row[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoryImages, setCategoryImages] = useState<Row[]>([]);
  const [branding, setBranding] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadBase() {
    setLoading(true); setError("");
    try {
      const [categoryData, brandingData, documentData] = await Promise.all([request("/api/admin/categories"), request("/api/admin/branding/assets"), request("/api/admin/documents")]);
      const nextCategories = rows(categoryData); setCategories(nextCategories); setCategoryId((current) => current || value(nextCategories[0] ?? {}, "id"));
      setBranding(rows(brandingData)); setDocuments(rows(documentData));
    } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  }

  async function loadCategoryImages(id: string) {
    if (!id) { setCategoryImages([]); return; }
    try { setCategoryImages(rows(await request(`/api/categories/${id}/images`))); } catch (caught) { setError(errorMessage(caught)); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadBase(), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadCategoryImages(categoryId), 0); return () => window.clearTimeout(timer); }, [categoryId]);

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!categoryId) return; setSaving(true); setError("");
    try { await request(`/api/admin/categories/${categoryId}/images`, { method: "POST", body: new FormData(event.currentTarget) }); event.currentTarget.reset(); await loadCategoryImages(categoryId); setNotice("Category image uploaded to R2."); } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  async function submitBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await request("/api/admin/branding/assets", { method: "POST", body: new FormData(event.currentTarget) }); event.currentTarget.reset(); await loadBase(); setNotice("Brand asset stored in R2."); } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await request("/api/admin/documents", { method: "POST", body: new FormData(event.currentTarget) }); event.currentTarget.reset(); await loadBase(); setNotice("Private PDF stored in R2."); } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  async function remove(url: string, refresh: () => Promise<void>) {
    if (!window.confirm("Delete this stored object and its metadata?")) return; setSaving(true); setError("");
    try { await request(url, { method: "DELETE" }); await refresh(); setNotice("Stored object deleted."); } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  async function setPrimary(imageId: string) {
    setSaving(true); setError("");
    try { await request(`/api/admin/categories/${categoryId}/images/${imageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPrimary: true }) }); await loadCategoryImages(categoryId); setNotice("Primary category image updated."); } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  return <div>
    <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Object storage</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Cloudflare R2</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">Manage public catalogue media and private business documents without exposing storage credentials.</p></div><button type="button" onClick={() => void loadBase()} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold"><RefreshCw size={16} />Refresh</button></header>
    {notice ? <p className="mt-5 border border-[#bbdfc9] bg-[#f3fbf5] p-3 text-sm font-semibold text-[#1e6b3a]">{notice}</p> : null}
    {error ? <p className="mt-5 border border-[#efc4be] bg-[#fff6f4] p-3 text-sm font-semibold text-[#a9362c]">{error}</p> : null}
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[#d7dce5]">{(["categories", "branding", "documents"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-4 py-3 text-sm font-bold capitalize ${tab === item ? "border-[#2457b8] text-[#2457b8]" : "border-transparent text-[#607089]"}`}>{item}</button>)}</nav>
    {loading ? <p className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading storage metadata...</p> : null}
    {!loading && tab === "categories" ? <section className="mt-6"><StorageForm title="Category image" description="Upload, promote, or remove an image for a catalogue category." onSubmit={submitCategory} saving={saving}><label className="text-sm font-semibold"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5"><option value="">Select category</option>{categories.map((category) => <option key={value(category, "id")} value={value(category, "id")}>{value(category, "name")}</option>)}</select></label><FileField accept="image/jpeg,image/png,image/webp,image/avif" /><TextField name="altText" label="Alternative text" /><label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="isPrimary" value="true" />Set as primary</label></StorageForm><MediaGrid items={categoryImages} onPrimary={(id) => void setPrimary(id)} onDelete={(id) => void remove(`/api/admin/categories/${categoryId}/images/${id}`, () => loadCategoryImages(categoryId))} saving={saving} /></section> : null}
    {!loading && tab === "branding" ? <section className="mt-6"><StorageForm title="Brand asset" description="Use asset key logo.primary to replace the storefront header logo." onSubmit={submitBranding} saving={saving}><FileField accept="image/jpeg,image/png,image/webp,image/avif" /><TextField name="assetKey" label="Asset key" placeholder="logo.primary" required /><label className="text-sm font-semibold"><span>Type</span><select name="assetType" className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5"><option value="LOGO">Logo</option><option value="ASSET">Website asset</option></select></label><TextField name="altText" label="Alternative text" /></StorageForm><MediaGrid items={branding} onDelete={(id) => void remove(`/api/admin/branding/assets/${id}`, loadBase)} saving={saving} /></section> : null}
    {!loading && tab === "documents" ? <section className="mt-6"><StorageForm title="Private PDF" description="Store an invoice, quotation, or other business PDF. Customers only receive authorized signed downloads." onSubmit={submitDocument} saving={saving}><FileField accept="application/pdf" /><label className="text-sm font-semibold"><span>Document type</span><select name="documentType" className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5"><option>INVOICE</option><option>QUOTE</option><option>OTHER</option></select></label><TextField name="entityType" label="Entity type" placeholder="INVOICE" required /><TextField name="entityId" label="Entity ID" placeholder="UUID" required /><TextField name="orderId" label="Order ID (invoices)" placeholder="UUID" /><TextField name="quoteId" label="Quote ID (quotes)" placeholder="UUID" /></StorageForm><div className="mt-6 space-y-3">{documents.map((document) => <article key={value(document, "id")} className="flex flex-col justify-between gap-4 border border-[#d7dce5] bg-white p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 items-start gap-3"><FileText className="mt-0.5 shrink-0 text-[#2457b8]" size={20} /><div className="min-w-0"><p className="truncate font-bold">{value(document, "originalFilename")}</p><p className="mt-1 text-xs text-[#607089]">{value(document, "documentType")} · {fileSize(document.fileSize)} · {value(document, "status")}</p></div></div><div className="flex gap-2"><a href={`/api/admin/documents/${value(document, "id")}/download`} className="inline-flex items-center gap-1.5 border border-[#c9d2df] px-3 py-2 text-xs font-bold text-[#2457b8]"><Download size={14} />Download</a><button type="button" disabled={saving} onClick={() => void remove(`/api/admin/documents/${value(document, "id")}`, loadBase)} className="border border-[#efc4be] p-2 text-[#b13a2f]" aria-label="Delete document"><Trash2 size={15} /></button></div></article>)}</div></section> : null}
  </div>;
}

function StorageForm({ title, description, onSubmit, saving, children }: { title: string; description: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; children: React.ReactNode }) { return <form onSubmit={onSubmit} className="border border-[#d7dce5] bg-white p-4 sm:p-6"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[#607089]">{description}</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div><button disabled={saving} className="mt-5 inline-flex items-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Upload size={16} />{saving ? "Saving..." : "Upload to R2"}</button></form>; }
function FileField({ accept }: { accept: string }) { return <label className="text-sm font-semibold"><span>File</span><input name="file" type="file" accept={accept} required className="mt-1.5 block w-full border border-[#c9d2df] bg-white p-2 text-sm" /></label>; }
function TextField({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) { return <label className="text-sm font-semibold"><span>{label}</span><input name={name} required={required} placeholder={placeholder} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal" /></label>; }
function MediaGrid({ items, onPrimary, onDelete, saving }: { items: Row[]; onPrimary?: (id: string) => void; onDelete: (id: string) => void; saving: boolean }) { return <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={value(item, "id")} className="border border-[#d7dce5] bg-white p-3"><div className="relative aspect-[16/9] overflow-hidden bg-[#eef2f7]">{value(item, "imageUrl") ? <Image src={value(item, "imageUrl")} alt={value(item, "altText") || value(item, "originalFilename") || "Stored image"} fill unoptimized className="object-contain" /> : <FileImage className="absolute inset-0 m-auto text-[#607089]" />}</div><p className="mt-3 truncate text-sm font-bold">{value(item, "assetKey") || value(item, "originalFilename")}</p><p className="mt-1 text-xs text-[#607089]">{fileSize(item.fileSize)}{item.isPrimary ? " · Primary" : ""}</p><div className="mt-3 flex justify-end gap-2">{onPrimary && !item.isPrimary ? <button type="button" disabled={saving} onClick={() => onPrimary(value(item, "id"))} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]">Set primary</button> : null}<button type="button" disabled={saving} onClick={() => onDelete(value(item, "id"))} className="border border-[#efc4be] p-1.5 text-[#b13a2f]" aria-label="Delete stored image"><Trash2 size={15} /></button></div></article>)}</div>; }
