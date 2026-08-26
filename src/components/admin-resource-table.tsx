"use client";

import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Column = { key: string; label: string };

type AdminResourceTableProps = {
  endpoint: string;
  title: string;
  description: string;
  columns: readonly Column[];
};

async function getItems(endpoint: string) {
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Could not load this admin view");
  const data = payload.data;
  return Array.isArray(data) ? data : data.items ?? [];
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AdminResourceTable({ endpoint, title, description, columns }: AdminResourceTableProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setItems(await getItems(endpoint));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this admin view");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialItems() {
      try {
        const nextItems = await getItems(endpoint);
        if (!cancelled) setItems(nextItems);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load this admin view");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialItems();
    return () => { cancelled = true; };
  }, [endpoint]);

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => columns.some(({ key }) => displayValue(item[key]).toLowerCase().includes(term)));
  }, [columns, items, query]);

  return <div>
    <div className="flex flex-col justify-between gap-4 border-b border-[#ddd9d0] pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f15a3a]">Admin workspace</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#646b64]">{description}</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-[#cfcfc6] bg-white px-4 py-2.5 text-sm font-bold text-[#273229] hover:border-[#273229] disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
    </div>

    <div className="mt-6 flex items-center gap-3 border border-[#d9d6ce] bg-white px-3">
      <Search size={17} className="shrink-0 text-[#777d76]" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
    </div>

    {error ? <div className="mt-6 border border-[#e9c4bd] bg-[#fff4f1] p-4 text-sm text-[#8b2f24]">{error}</div> : null}
    {loading ? <div className="mt-6 border border-[#ddd9d0] bg-white p-6 text-sm text-[#646b64]">Loading {title.toLowerCase()}...</div> : null}
    {!loading && !error && visibleItems.length === 0 ? <div className="mt-6 border border-dashed border-[#cfcfc6] bg-white p-8 text-center"><p className="font-bold">No {title.toLowerCase()} found.</p><p className="mt-2 text-sm text-[#646b64]">New records will appear here as they are created.</p></div> : null}

    {!loading && !error && visibleItems.length > 0 ? <>
      <div className="mt-6 space-y-3 md:hidden">
        {visibleItems.map((item, index) => <article key={String(item.id ?? index)} className="border border-[#ddd9d0] bg-white p-4">
          {columns.map(({ key, label }) => <div key={key} className="flex justify-between gap-4 border-b border-[#eeeae2] py-2 last:border-0"><span className="shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-[#777d76]">{label}</span><span className="min-w-0 break-words text-right text-sm font-medium text-[#18231e]">{displayValue(item[key])}</span></div>)}
        </article>)}
      </div>
      <div className="mt-6 hidden overflow-x-auto border border-[#ddd9d0] bg-white md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#ddd9d0] bg-[#f7f6f2]"><tr>{columns.map(({ key, label }) => <th key={key} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#596159]">{label}</th>)}</tr></thead><tbody>{visibleItems.map((item, index) => <tr key={String(item.id ?? index)} className="border-b border-[#eeeae2] last:border-0">{columns.map(({ key }) => <td key={key} className="max-w-72 px-4 py-3 align-top text-[#263129]">{displayValue(item[key])}</td>)}</tr>)}</tbody></table></div>
    </> : null}
  </div>;
}
