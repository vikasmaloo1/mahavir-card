"use client";

import Link from "next/link";
import { Download, Palette } from "lucide-react";
import { useEffect, useState } from "react";

type Template = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  hasSourceFile: boolean;
  category: { name: string; slug: string } | null;
  product: { slug: string; name: string } | null;
};
type Category = { id: string; name: string; slug: string };

export function DesignTemplatesGallery() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories").then((response) => response.json()).then((payload) => { if (payload.success) setCategories(payload.data); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = category ? `?category=${category}` : "";
      fetch(`/api/design-templates${params}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => { if (active && payload.success) setTemplates(payload.data.items); })
        .catch(() => undefined)
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [category]);

  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8 lg:py-10">
        <header className="border-b border-[var(--mc-line)] pb-6">
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Free design templates</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-[2.35rem]">Don&apos;t have a design ready?</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--mc-muted)]">Browse a template, use it as your starting point, then upload your finished CDR artwork the normal way when you order.</p>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-[var(--mc-line)] pb-4">
          <button type="button" onClick={() => setCategory("")} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${!category ? "bg-[var(--mc-accent)] text-white" : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"}`}>All templates</button>
          {categories.map((item) => (
            <button key={item.id} type="button" onClick={() => setCategory(item.slug)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${category === item.slug ? "bg-[var(--mc-accent)] text-white" : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"}`}>
              {item.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[var(--mc-line)] bg-white"><div className="aspect-square rounded-t-xl bg-[#e5ebf5]" /><div className="p-4"><div className="h-4 w-2/3 rounded bg-[#dce4f0]" /></div></div>)}
          </div>
        ) : templates.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template) => (
              <article key={template.id} className="overflow-hidden rounded-xl border border-[var(--mc-line)] bg-white shadow-[0_5px_16px_rgba(16,33,63,0.035)]">
                <div className="aspect-square bg-[var(--mc-accent-soft)]">
                  {template.imageUrl ? <img src={template.imageUrl} alt={template.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--mc-muted)]"><Palette size={28} /></div>}
                </div>
                <div className="p-4">
                  {template.category ? <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{template.category.name}</p> : null}
                  <h2 className="mt-1 text-[15px] font-bold leading-snug">{template.title}</h2>
                  {template.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--mc-muted)]">{template.description}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {template.product ? (
                      <Link href={`/catalog/${template.product.slug}?templateName=${encodeURIComponent(template.title)}`} className="inline-flex items-center justify-center rounded-full bg-[var(--mc-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors">
                        Use this template
                      </Link>
                    ) : null}
                    {template.hasSourceFile ? (
                      <Link href={`/api/design-templates/${template.id}/download`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors">
                        <Download size={13} /> Source file
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
            <p className="text-lg font-bold text-slate-900">No templates in this category yet.</p>
            <p className="mt-2 text-sm text-slate-600">Check back soon, or <Link href="/quote" className="font-bold text-[var(--mc-accent)]">share your requirement</Link> and we&apos;ll help you design it.</p>
          </div>
        )}
      </div>
    </main>
  );
}
