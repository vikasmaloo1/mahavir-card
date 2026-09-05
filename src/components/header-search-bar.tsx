"use client";

import { ArrowRight, Loader2, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RequirementQuoteModal, type RequirementContext } from "@/components/requirement-quote-modal";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  imageUrl: string | null;
};

type SuggestResponse = {
  query: string;
  confidence: "HIGH" | "PARTIAL" | "NONE";
  matchReason: string;
  suggestions: Suggestion[];
  total: number;
  fallbackQuoteAvailable: boolean;
  extractedRequirement?: Record<string, unknown>;
};

export function HeaderSearchBar({
  placeholder = "Search visiting cards, brochures, stickers...",
  className = "",
  compact = false,
}: {
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteContext, setQuoteContext] = useState<RequirementContext>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search suggest
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((payload) => {
          if (payload?.success && payload.data) {
            setResults(payload.data);
            setIsOpen(true);
            setSelectedIndex(-1);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || !results?.suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const target = results.suggestions[selectedIndex];
      if (target) {
        setIsOpen(false);
        router.push(`/catalog/${target.slug}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsOpen(false);
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  }

  function openFallback() {
    setIsOpen(false);
    setQuoteContext({
      mode: "SEARCH_FALLBACK",
      searchQuery: query.trim(),
      ...results?.extractedRequirement,
    });
    setIsQuoteModalOpen(true);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center rounded-lg border border-[var(--mc-line)] bg-white px-3 transition-colors focus-within:border-[var(--mc-accent)]"
      >
        <Search size={compact ? 16 : 17} className="text-[var(--mc-muted)] shrink-0" />
        <input
          name="search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults(null);
              setIsOpen(false);
              setLoading(false);
            }
          }}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[#8b9bb5]"
        />
        {loading ? (
          <Loader2 size={16} className="animate-spin text-[var(--mc-muted)] mr-2 shrink-0" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setIsOpen(false);
            }}
            className="text-[var(--mc-muted)] hover:text-[var(--mc-ink)] mr-2 shrink-0"
            aria-label="Clear"
          >
            <X size={15} />
          </button>
        ) : null}
        <button
          type="submit"
          className="border-l border-[var(--mc-line)] pl-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--mc-muted)] hover:text-[var(--mc-accent)] transition-colors"
        >
          {compact ? "Go" : "Find"}
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && results && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in duration-150 text-left">
          {/* Top Matches */}
          {results.suggestions.length > 0 ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <span>Products</span>
                <span className="text-[10px] text-slate-500 font-normal">{results.matchReason}</span>
              </div>
              <ul className="mt-1 divide-y divide-slate-50">
                {results.suggestions.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      href={`/catalog/${item.slug}`}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        selectedIndex === index ? "bg-slate-100 text-[var(--mc-accent)]" : "hover:bg-slate-50 text-slate-900"
                      }`}
                    >
                      <div className="min-w-0">
                        <strong className="block truncate font-semibold">{item.name}</strong>
                        <span className="text-xs text-slate-500">{item.category}</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-5 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No matching product in catalogue
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Looking for something custom or specific?
              </p>
            </div>
          )}

          {/* Quotation Fallback Action Bar */}
          <div className="border-t border-slate-100 bg-slate-50/80 p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Sparkles size={14} className="text-[var(--mc-accent)] shrink-0" />
              <span>Can&apos;t find what you&apos;re looking for?</span>
            </div>
            <button
              type="button"
              onClick={openFallback}
              className="text-xs font-bold text-[var(--mc-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Request a Quote</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Accessible Requirement Quote Modal */}
      <RequirementQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        context={quoteContext}
      />
    </div>
  );
}
