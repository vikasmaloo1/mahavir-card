"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ImagePlus, Plus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { adminRequest, asItems } from "@/lib/admin-client";

type Row = Record<string, unknown>;

function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function bool(value: unknown, fallback = false) { return typeof value === "boolean" ? value : fallback; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }

export function DesignTemplateList() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setItems(asItems(await adminRequest<Row[] | { items?: Row[] }>("/api/admin/design-templates"))); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <div>
    <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Catalogue CMS</p>
        <h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">Free design templates</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">Only add templates with a clear, licensed right to redistribute to customers — the license source field is required and shown here for audit.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold text-[#24324a]"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        <Link href="/admin/templates/new" className="inline-flex items-center gap-2 bg-[#2457b8] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#17479f]"><Plus size={16} />New template</Link>
      </div>
    </header>
    {error ? <p role="alert" className="mt-5 border border-[#efc4be] bg-[#fff6f4] p-3 text-sm font-semibold text-[#a9362c]">{error}</p> : null}
    {loading ? <div className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading templates...</div> : null}
    {!loading && !items.length ? <div className="mt-6 border border-dashed border-[#c9d2df] bg-white p-8 text-center"><p className="font-bold">No templates yet.</p><p className="mt-2 text-sm text-[#607089]">Add a licensed template to make it available on the customer-facing gallery.</p></div> : null}
    {!loading && items.length ? <div className="mt-6 overflow-x-auto border border-[#d7dce5] bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#d7dce5] bg-[#f7f9fc]"><tr>{["Template", "License source", "Active", "Actions"].map((label) => <th key={label} className="px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#52647e]">{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={text(item.id)} className="border-b border-[#e8ecf2] last:border-0"><td className="px-4 py-3"><p className="font-bold text-[#162237]">{text(item.title)}</p></td><td className="px-4 py-3 text-[#52647e]">{text(item.licenseSource)}</td><td className="px-4 py-3">{bool(item.isActive) ? <span className="font-semibold text-[#1c7a3a]">Active</span> : <span className="font-semibold text-[#8a99ad]">Hidden</span>}</td><td className="px-4 py-3"><Link href={`/admin/templates/${text(item.id)}`} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold text-[#2457b8]">Manage</Link></td></tr>)}</tbody></table></div> : null}
  </div>;
}

export function DesignTemplateEditor({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Row | null>(null);
  const [products, setProducts] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [productList, categoryList] = await Promise.all([
        adminRequest<Row[] | { items?: Row[] }>("/api/admin/products?limit=200"),
        adminRequest<Row[]>("/api/admin/categories"),
      ]);
      setProducts(asItems(productList)); setCategories(categoryList);
      if (templateId) setTemplate(await adminRequest<Row>(`/api/admin/design-templates/${templateId}`));
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading...</div>;
  if (error && !template && templateId) return <div><Message text={error} /><Link href="/admin/templates" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#2457b8]"><ChevronLeft size={16} />Back to templates</Link></div>;

  return <div>
    <Link href="/admin/templates" className="inline-flex items-center gap-1 text-sm font-semibold text-[#2457b8]"><ChevronLeft size={16} />Templates</Link>
    <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Catalogue CMS</p>
    <h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">{templateId ? text(template?.title) || "Edit template" : "New template"}</h1>
    {notice ? <Message text={notice} tone="success" /> : null}
    {error ? <Message text={error} /> : null}
    <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <OverviewForm
        template={template}
        products={products}
        categories={categories}
        onSaved={(saved, isNew) => {
          setTemplate(saved);
          setNotice("Template saved.");
          if (isNew) router.replace(`/admin/templates/${text(saved.id)}`);
        }}
        onError={setError}
      />
      {templateId ? <FilesPanel templateId={templateId} template={template} onChanged={load} onError={setError} /> : <div className="h-fit border border-dashed border-[#c9d2df] bg-white p-5 text-sm text-[#607089]">Save the template first, then upload its preview image.</div>}
    </section>
  </div>;
}

function OverviewForm({ template, products, categories, onSaved, onError }: { template: Row | null; products: Row[]; categories: Row[]; onSaved: (row: Row, isNew: boolean) => void; onError: (message: string) => void }) {
  const [title, setTitle] = useState(text(template?.title));
  const [description, setDescription] = useState(text(template?.description));
  const [productId, setProductId] = useState(text(template?.productId));
  const [categoryId, setCategoryId] = useState(text(template?.categoryId));
  const [licenseSource, setLicenseSource] = useState(text(template?.licenseSource));
  const [isActive, setIsActive] = useState(bool(template?.isActive, true));
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); onError("");
    const payload = { title, description: description || null, productId: productId || null, categoryId: categoryId || null, licenseSource, isActive };
    try {
      const isNew = !template;
      const saved = isNew
        ? await adminRequest<Row>("/api/admin/design-templates", { method: "POST", body: JSON.stringify(payload) })
        : await adminRequest<Row>(`/api/admin/design-templates/${text(template!.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      onSaved(saved, isNew);
    } catch (caught) { onError(errorMessage(caught)); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="border border-[#d7dce5] bg-white p-4 sm:p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-[#263753] sm:col-span-2"><span>Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 text-sm font-normal" /></label>
      <label className="block text-sm font-semibold text-[#263753]"><span>Linked product</span><select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 text-sm font-normal"><option value="">Not linked (browsing only)</option>{products.map((item) => <option key={text(item.id)} value={text(item.id)}>{text(item.name)}</option>)}</select></label>
      <label className="block text-sm font-semibold text-[#263753]"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 text-sm font-normal"><option value="">Uncategorised</option>{categories.map((item) => <option key={text(item.id)} value={text(item.id)}>{text(item.name)}</option>)}</select></label>
      <label className="block text-sm font-semibold text-[#263753] sm:col-span-2"><span>License source <span className="font-normal text-[#8a99ad]">(required — where this design is licensed from)</span></span><input required value={licenseSource} onChange={(event) => setLicenseSource(event.target.value)} placeholder="e.g. Envato Elements — license #12345" className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 text-sm font-normal" /></label>
      <label className="block text-sm font-semibold text-[#263753] sm:col-span-2"><span>Description</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full border border-[#c9d2df] p-3 text-sm font-normal" /></label>
    </div>
    <label className="mt-5 flex items-center gap-2 border-t border-[#e4e8ef] pt-5 text-sm font-semibold"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-[#2457b8]" />Visible in the customer gallery</label>
    <button disabled={saving} className="mt-6 inline-flex items-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Check size={16} />{saving ? "Saving..." : "Save template"}</button>
  </form>;
}

function FilesPanel({ templateId, template, onChanged, onError }: { templateId: string; template: Row | null; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSource, setUploadingSource] = useState(false);

  async function uploadImage(file: File) {
    setUploadingImage(true); onError("");
    try {
      const form = new FormData(); form.append("file", file);
      await adminRequest(`/api/admin/design-templates/${templateId}/image`, { method: "POST", body: form });
      await onChanged();
    } catch (caught) { onError(errorMessage(caught)); }
    finally { setUploadingImage(false); }
  }

  async function uploadSourceFile(file: File) {
    setUploadingSource(true); onError("");
    try {
      const form = new FormData(); form.append("file", file);
      await adminRequest(`/api/admin/design-templates/${templateId}/source-file`, { method: "POST", body: form });
      await onChanged();
    } catch (caught) { onError(errorMessage(caught)); }
    finally { setUploadingSource(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    try { await adminRequest(`/api/admin/design-templates/${templateId}`, { method: "DELETE" }); router.push("/admin/templates"); }
    catch (caught) { onError(errorMessage(caught)); }
  }

  return <aside className="h-fit border border-[#d7dce5] bg-white p-4 sm:p-5">
    <h2 className="font-bold">Files</h2>
    <div className="mt-4">
      <p className="text-xs font-bold uppercase text-[#8a99ad]">Preview image</p>
      {text(template?.imageUrl) ? <div className="mt-2 aspect-video w-full overflow-hidden border border-[#e4e8ef] bg-[#f7f9fc]"><img src={`/api/design-templates/${templateId}/image/file`} alt="" className="h-full w-full object-cover" /></div> : <p className="mt-2 text-xs text-[#8a99ad]">No image uploaded yet.</p>}
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border border-[#c9d2df] px-3 py-2 text-xs font-bold text-[#2457b8]"><ImagePlus size={15} />{uploadingImage ? "Uploading..." : "Upload preview image"}<input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} /></label>
    </div>
    <div className="mt-5 border-t border-[#e4e8ef] pt-4">
      <p className="text-xs font-bold uppercase text-[#8a99ad]">Editable source file <span className="font-normal normal-case">(optional — only if the license allows redistributing it)</span></p>
      <p className="mt-2 text-xs text-[#607089]">{text(template?.sourceFileUrl) ? "A source file is attached." : "No source file uploaded."}</p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border border-[#c9d2df] px-3 py-2 text-xs font-bold text-[#2457b8]"><UploadCloud size={15} />{uploadingSource ? "Uploading..." : "Upload source file"}<input type="file" className="hidden" disabled={uploadingSource} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSourceFile(file); event.target.value = ""; }} /></label>
    </div>
    <button type="button" onClick={() => void remove()} className="mt-6 inline-flex items-center gap-2 border border-[#efc4be] px-3 py-2 text-xs font-bold text-[#a9362c]"><Trash2 size={15} />Delete template</button>
  </aside>;
}

function Message({ text: value, tone = "error" }: { text: string; tone?: "error" | "success" }) {
  return <p role="alert" className={`mt-5 border p-3 text-sm font-semibold ${tone === "success" ? "border-[#bfe3c9] bg-[#f2fbf4] text-[#1c7a3a]" : "border-[#efc4be] bg-[#fff6f4] text-[#a9362c]"}`}>{value}</p>;
}
