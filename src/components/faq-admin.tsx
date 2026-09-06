"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "@/lib/admin-client";

type Faq = { id: string; question: string; answer: string; category: string; sortOrder: number; isActive: boolean };

export function FaqAdmin() {
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ question: "", answer: "", category: "General" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try { setItems(await adminRequest<Faq[]>("/api/admin/faqs")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load FAQs"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await adminRequest("/api/admin/faqs", { method: "POST", body: JSON.stringify({ ...form, sortOrder: items.length }) });
      setForm({ question: "", answer: "", category: form.category });
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this FAQ"); }
    finally { setSaving(false); }
  }

  async function toggleActive(item: Faq) {
    try { await adminRequest(`/api/admin/faqs/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.isActive }) }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update this FAQ"); }
  }

  async function remove(item: Faq) {
    if (!window.confirm("Delete this FAQ?")) return;
    try { await adminRequest(`/api/admin/faqs/${item.id}`, { method: "DELETE" }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete this FAQ"); }
  }

  return (
    <div>
      <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Content</p><h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">FAQ</h1><p className="mt-2 text-sm text-[#607089]">Published at /faq, grouped by category.</p></header>
      {error ? <p className="mt-4 border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm font-semibold text-[#9b2525]">{error}</p> : null}
      <form onSubmit={create} className="mt-6 grid gap-3 border border-[#d7dce5] bg-white p-4 sm:grid-cols-2">
        <input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category, e.g. Ordering, Artwork, GST" className="border border-[#c9d2df] px-3 py-2 text-sm sm:col-span-2" />
        <input required value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} placeholder="Question" className="border border-[#c9d2df] px-3 py-2 text-sm sm:col-span-2" />
        <textarea required rows={3} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} placeholder="Answer" className="border border-[#c9d2df] px-3 py-2 text-sm sm:col-span-2" />
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-[#2457b8] px-3 py-2.5 text-sm font-bold text-white sm:col-span-2"><Plus size={16} />{saving ? "Saving..." : "Add FAQ"}</button>
      </form>
      {loading ? <p className="mt-6 text-sm text-[#607089]">Loading...</p> : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-[#d7dce5] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#607089]">{item.category}</p>
                  <p className="mt-1 font-bold text-[#162237]">{item.question}</p>
                  <p className="mt-1 text-sm text-[#52647e]">{item.answer}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void toggleActive(item)} className="border border-[#c9d2df] px-2.5 py-1.5 text-xs font-bold">{item.isActive ? "Deactivate" : "Activate"}</button>
                  <button type="button" onClick={() => void remove(item)} className="border border-[#efc4be] p-2 text-[#b13a2f]" aria-label="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
          {!items.length ? <p className="border border-dashed border-[#c9d2df] bg-white p-8 text-center text-sm text-[#607089]">No FAQs yet.</p> : null}
        </div>
      )}
    </div>
  );
}
