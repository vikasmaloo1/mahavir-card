"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock3, FileUp, RefreshCw, Search, ShoppingBag, SlidersHorizontal, Sparkles, X, MapPin, AlertCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { productFiltersToSearchParams, productListingHref, readProductFilters, type ProductFilters } from "@/lib/catalog-routing";
import { RequirementQuoteModal, type RequirementContext } from "@/components/requirement-quote-modal";
import { normalizeProductQuantity, stepProductQuantity } from "@/lib/quantity-helper";
import { ArtworkUploader, type ArtworkRequirement, type UploadedArtwork } from "@/components/artwork-uploader";

type ProductDetail = {
  pricingRules: Array<{ id: string; name: string; conditions: Record<string, unknown> }>;
  addons: Array<{ addonId: string; pricingRuleId: string | null; isDefault: boolean }>;
  deliveryRules: Array<{ deliveryMethod: "PICKUP" | "LOCAL_DELIVERY" | "COURIER"; stateCode: string }>;
  artworkRequirements: Array<ArtworkRequirement & { pricingRuleId: string | null }>;
};

type ArtworkSummary = { formatLabel: string; fullDesign: string | null; safeArea: string | null; finalSize: string | null; requiredFiles: string[] };
type StateAvailability = {
  isAvailable: boolean;
  status: "AVAILABLE" | "UNAVAILABLE_IN_STATE" | "QUOTE_ONLY";
  customerState: string | null;
  badgeText: string;
  message: string | null;
  quotePrompt: string | null;
  fallbackQuoteContext?: {
    productId: string;
    productName: string;
    productSlug: string;
    customerState?: string;
    reason: string;
  };
};

type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  listingSpecification: string | null;
  productSize: string | null;
  productionTime: string | null;
  priceLabel: string;
  priceState: "STARTING" | "CUSTOM_QUOTE" | "CONTACT" | "LOGIN";
  taxInclusive: boolean | null;
  orderable: boolean;
  quoteable: boolean;
  hasAddons: boolean;
  hasArtworkRequirement: boolean;
  artworkSummary: ArtworkSummary | null;
  stateAvailability?: StateAvailability;
};

type Category = { id: string; name: string; slug: string };
type Pagination = { page: number; limit: number; total: number; totalPages: number };

type SearchMeta = {
  query: string;
  normalizedQuery: string;
  confidence: "HIGH" | "PARTIAL" | "NONE";
  matchReason: string;
  fallbackQuoteAvailable: boolean;
  extractedRequirement?: Record<string, unknown>;
};

type RecentProduct = {
  orderId: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  quantity: number;
  configuration: Record<string, unknown>;
  lastOrderedAt: string;
};

export function ProductsBrowser({ initialFilters, isB2B }: { initialFilters: ProductFilters; isB2B: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<Record<string, string>>({});
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(initialFilters.search);
  const [category, setCategory] = useState(initialFilters.category);
  const [orderable, setOrderable] = useState(initialFilters.orderable);
  const [page, setPage] = useState(initialFilters.page);
  const [requestVersion, setRequestVersion] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.search);

  // Quote Fallback Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteContext, setQuoteContext] = useState<RequirementContext>({});

  const categoriesRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);
  const isInitialScrollDone = useRef(false);

  const getStickyHeaderHeight = useCallback(() => {
    if (typeof window === "undefined") return 95;
    const headerEl = document.querySelector("header.sticky");
    if (headerEl) {
      return headerEl.getBoundingClientRect().height;
    }
    return window.innerWidth < 768 ? 135 : 95;
  }, []);

  const scrollToCategories = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!categoriesRef.current) return;
      const headerHeight = getStickyHeaderHeight();
      const elementTop = categoriesRef.current.getBoundingClientRect().top + window.scrollY;
      const targetY = Math.max(0, elementTop - headerHeight - 12);

      window.scrollTo({
        top: targetY,
        behavior,
      });
    },
    [getStickyHeaderHeight]
  );

  // Direct auto-scroll when landing on /products?category=... or with search query
  useEffect(() => {
    if ((initialFilters.category || initialFilters.search) && !isInitialScrollDone.current) {
      isInitialScrollDone.current = true;

      const performInstantScroll = () => {
        if (!categoriesRef.current) return;
        const headerHeight = getStickyHeaderHeight();
        const elementTop = categoriesRef.current.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, elementTop - headerHeight - 12);
        window.scrollTo({ top: targetY, behavior: "auto" });
      };

      performInstantScroll();
      const frameId = requestAnimationFrame(performInstantScroll);
      const timer1 = setTimeout(performInstantScroll, 40);
      const timer2 = setTimeout(performInstantScroll, 180);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [initialFilters.category, initialFilters.search, getStickyHeaderHeight]);

  // Keep active category pill visible horizontally
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [category]);

  const selectCategory = (catSlug: string) => {
    setCategory(catSlug);
    setPage(1);
    setTimeout(() => {
      scrollToCategories("smooth");
    }, 20);
  };

  useEffect(() => {
    const syncFromHistory = () => {
      const next = readProductFilters(new URLSearchParams(window.location.search));
      setQuery(next.search);
      setDebouncedQuery(next.search);
      setCategory(next.category);
      setOrderable(next.orderable);
      setPage(next.page);
      if (next.category || next.search) {
        setTimeout(() => scrollToCategories("smooth"), 30);
      }
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, [scrollToCategories]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const next = productFiltersToSearchParams({ category, search: debouncedQuery, orderable, page });
    const nextQuery = next.toString();
    const currentQuery = window.location.search.replace(/^\?/, "");
    if (nextQuery === currentQuery) return;
    window.history.replaceState(null, "", nextQuery ? `/products?${nextQuery}` : "/products");
  }, [category, debouncedQuery, orderable, page]);

  useEffect(() => {
    if (category || debouncedQuery) return; // Recently ordered is a landing-view shortcut, not relevant mid-search/filter.
    let active = true;
    fetch("/api/account/recent-products", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload.success) setRecentProducts(payload.data.items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [category, debouncedQuery]);

  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload.success) setCategories(payload.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
    if (category) params.set("category", category);
    if (orderable) params.set("orderable", "true");
    params.set("page", String(page));
    params.set("limit", "12");

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/products?${params}`, { signal: controller.signal })
        .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
        .then(({ response, payload }) => {
          if (!response.ok || !payload?.success) throw new Error("request_failed");
          setItems(payload.data.items);
          setPagination(payload.data.pagination);
          setSearchMeta(payload.data.searchMeta ?? null);
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError(
            caught instanceof TypeError
              ? "Connection interrupted. Check your connection and retry."
              : "We couldn't load the product catalogue. Please retry."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, debouncedQuery, orderable, page, requestVersion]);

  const hasFilters = Boolean(query || category || orderable);
  const clear = () => {
    setQuery("");
    setDebouncedQuery("");
    setCategory("");
    setOrderable(false);
    setPage(1);
    setSearchMeta(null);
  };
  const listingHref = productListingHref({ category, search: debouncedQuery, orderable, page });
  const productHref = (item: Product) => {
    const params = new URLSearchParams();
    params.set("returnTo", listingHref);
    return `/catalog/${item.slug}?${params}`;
  };

  const openQuoteFallback = (reqCtx: RequirementContext) => {
    setQuoteContext(reqCtx);
    setIsQuoteModalOpen(true);
  };

  /**
   * Adds a product straight from the listing using its default configuration
   * (first pricing rule, its default add-ons, pickup delivery if offered) —
   * for products that need no artwork or manual configuration this reduces
   * ordering to one or two clicks. Only offered for orderable, no-artwork
   * products (see the "quickOrderEligible" check below); everything else
   * keeps routing through the full product page.
   */
  async function quickOrder(item: Product, checkout: boolean) {
    const actionKey = `${item.id}:${checkout ? "buy" : "cart"}`;
    setQuickActionId(actionKey);
    setQuickError((current) => ({ ...current, [item.id]: "" }));
    try {
      const detailResponse = await fetch(`/api/products/${item.id}`, { cache: "no-store" });
      const detailPayload = await detailResponse.json().catch(() => null);
      if (!detailResponse.ok || !detailPayload?.success) throw new Error("Could not load this product's options");
      const details = detailPayload.data as ProductDetail;
      const rule = details.pricingRules[0];
      if (!rule) throw new Error("This product needs configuration on its own page");

      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(rule.conditions ?? {})) values[key] = String(value);
      if (!values.quantity) values.quantity = String(normalizeProductQuantity(undefined, null, item.slug).normalizedQuantity);

      const scopedAddons = details.addons.filter((addon) => addon.pricingRuleId === rule.id);
      const availableAddons = scopedAddons.length ? scopedAddons : details.addons.filter((addon) => addon.pricingRuleId === null);
      const addonIds = availableAddons.filter((addon) => addon.isDefault).map((addon) => addon.addonId);
      const pickup = details.deliveryRules.find((deliveryRule) => deliveryRule.deliveryMethod === "PICKUP");
      const configuration: Record<string, unknown> = { ...values, pricingRuleId: rule.id, addonIds, ...(pickup ? { delivery: { method: "PICKUP", stateCode: "*" } } : {}) };

      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.id, quantity: Number(values.quantity), configuration, kind: "PURCHASE" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not add this product to your basket");

      if (checkout) { router.push("/checkout"); return; }
      setQuickAddedId(item.id);
      window.setTimeout(() => setQuickAddedId((current) => (current === item.id ? null : current)), 2500);
    } catch (caught) {
      setQuickError((current) => ({ ...current, [item.id]: caught instanceof Error ? caught.message : "Could not add this product to your basket" }));
    } finally {
      setQuickActionId(null);
    }
  }

  /** Re-adds a previously ordered product using the exact configuration it was ordered with last time. */
  async function quickReorder(item: RecentProduct, checkout: boolean) {
    const actionKey = `${item.productId}:${checkout ? "buy" : "cart"}`;
    setQuickActionId(actionKey);
    setQuickError((current) => ({ ...current, [item.productId]: "" }));
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, quantity: item.quantity, configuration: item.configuration, kind: "PURCHASE" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not add this product to your basket");
      if (checkout) { router.push("/checkout"); return; }
      setQuickAddedId(item.productId);
      window.setTimeout(() => setQuickAddedId((current) => (current === item.productId ? null : current)), 2500);
    } catch (caught) {
      setQuickError((current) => ({ ...current, [item.productId]: caught instanceof Error ? caught.message : "Could not add this product to your basket" }));
    } finally {
      setQuickActionId(null);
    }
  }

  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8 lg:py-10">
        <header className="border-b border-[var(--mc-line)] pb-6">
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Product catalogue</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-[2.35rem]">
                Choose a print job.
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--mc-muted)]">
                Compare specifications, artwork and ordering options in one place.
              </p>
            </div>
            <p className="text-[15px] font-semibold text-[var(--mc-muted)]">
              {pagination.total} products
            </p>
          </div>
        </header>

        {/* Search Bar & Clear Action */}
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--mc-line)] bg-[var(--mc-paper)] px-4 shadow-sm">
            <Search size={18} className="shrink-0 text-[var(--mc-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search visiting cards, brochures, stickers, 400 GSM, thermal matt..."
              className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                className="grid size-9 place-items-center rounded-full hover:bg-[var(--mc-surface)]"
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            ) : null}
          </label>
          {hasFilters ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-full border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-3 text-sm font-bold text-[var(--mc-accent)] hover:bg-[var(--mc-surface)] transition-colors"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {/* Recently ordered — landing-view shortcut back into repeat products */}
        {recentProducts.length ? (
          <section className="mt-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--mc-muted)]">
              <Clock3 size={15} />
              Recently ordered
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recentProducts.map((item) => {
                const isAdding = quickActionId === `${item.productId}:cart`;
                const isBuying = quickActionId === `${item.productId}:buy`;
                const rowError = quickError[item.productId];
                return (
                  <div key={item.productId} className="rounded-xl border border-[var(--mc-line)] bg-[var(--mc-paper)] p-3.5 shadow-[0_5px_16px_rgba(16,33,63,0.035)]">
                    <div className="flex gap-3">
                      <Link href={`/catalog/${item.slug}`} className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--mc-accent-soft)]">
                        <ProductImage src={item.imageUrl || "/images/mahavir-print-assortment.png"} alt={`${item.name} print sample`} slug={item.slug} />
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/catalog/${item.slug}`} className="block truncate text-sm font-bold text-[var(--mc-ink)] hover:text-[var(--mc-accent)] transition-colors">{item.name}</Link>
                        <p className="mt-0.5 text-xs text-[var(--mc-muted)]">Qty {item.quantity.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    {quickAddedId === item.productId ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <Check size={13} /> Added to basket
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={Boolean(quickActionId)}
                          onClick={() => void quickReorder(item, true)}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--mc-accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Zap size={12} />
                          {isBuying ? "Starting..." : "Buy now"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(quickActionId)}
                          onClick={() => void quickReorder(item, false)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShoppingBag size={12} />
                          {isAdding ? "Adding..." : "Reorder"}
                        </button>
                      </div>
                    )}
                    {rowError ? <p className="mt-2 text-[11px] font-semibold text-[#a53025]">{rowError} <Link href={`/catalog/${item.slug}`} className="underline">Configure</Link></p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Category Pills */}
        <div
          ref={categoriesRef}
          id="categories"
          className="mt-4 border-y border-[var(--mc-line)] py-3 scroll-mt-28 sm:scroll-mt-24"
        >
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="mr-2 inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase text-[var(--mc-muted)]">
              <SlidersHorizontal size={15} />
              Categories
            </span>
            <button
              type="button"
              ref={!category ? activePillRef : null}
              onClick={() => selectCategory("")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                !category
                  ? "bg-[var(--mc-accent)] text-white"
                  : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"
              }`}
            >
              All products
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item.id}
                ref={category === item.slug ? activePillRef : null}
                onClick={() => selectCategory(item.slug)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  category === item.slug
                    ? "bg-[var(--mc-accent)] text-white"
                    : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* PARTIAL / WEAK MATCH BANNER */}
        {searchMeta && searchMeta.confidence === "PARTIAL" && items.length > 0 && (
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  We found related products for &ldquo;{debouncedQuery}&rdquo;
                </p>
                <p className="text-xs text-slate-600">
                  Showing the closest matching specifications from our commercial catalogue.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openQuoteFallback({
                  mode: "SEARCH_FALLBACK",
                  searchQuery: debouncedQuery,
                  ...searchMeta.extractedRequirement,
                })
              }
              className="shrink-0 rounded-full bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
            >
              Share Your Requirement
            </button>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div
            role="alert"
            className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-[#c7d6f0] bg-white p-4 sm:flex-row sm:items-center"
          >
            <p className="text-[15px] font-semibold text-[var(--mc-ink)]">{error}</p>
            <button
              type="button"
              onClick={() => setRequestVersion((version) => version + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        ) : null}

        {/* Loading Skeleton */}
        {loading && !items.length ? <ProductRowsSkeleton /> : null}

        {/* Product Listing Table */}
        {items.length ? (
          <section
            className={`mt-5 space-y-3 transition-opacity duration-200 ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="hidden grid-cols-[minmax(15rem,.9fr)_minmax(20rem,1.2fr)_10rem_minmax(20rem,1fr)] gap-5 px-4 py-2 text-xs font-bold uppercase text-[var(--mc-muted)] xl:grid">
              <span>Product</span>
              <span>Specification</span>
              <span>Price</span>
              <span>Actions</span>
            </div>

            {items.map((item) => {
              const isUnavailableInState = item.stateAvailability?.status === "UNAVAILABLE_IN_STATE";
              const quickOrderEligible = isB2B && item.orderable && !item.hasArtworkRequirement && !isUnavailableInState;
              const expandableEligible = isB2B && item.orderable && item.hasArtworkRequirement && !isUnavailableInState;
              const isAddingToCart = quickActionId === `${item.id}:cart`;
              const isBuyingNow = quickActionId === `${item.id}:buy`;
              const rowError = quickError[item.id];
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-[var(--mc-paper)] shadow-[0_5px_16px_rgba(16,33,63,0.035)] ${
                    isUnavailableInState ? "border-amber-200" : "border-[var(--mc-line)]"
                  }`}
                >
                <article
                  className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,.9fr)_minmax(20rem,1.2fr)_10rem_minmax(20rem,1fr)] xl:items-center"
                >
                  {/* Product Visual + Title */}
                  <div className="flex min-w-0 gap-3.5">
                    <Link
                      href={productHref(item)}
                      className="relative h-[76px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-[var(--mc-accent-soft)]"
                    >
                      <ProductImage
                        src={item.imageUrl || "/images/mahavir-print-assortment.png"}
                        alt={`${item.name} print sample`}
                        slug={item.slug}
                      />
                    </Link>
                    <div className="min-w-0 self-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">
                          {item.category?.name ?? "Print product"}
                        </p>
                        {isUnavailableInState && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            {item.stateAvailability?.badgeText}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-[17px] font-bold leading-snug text-[var(--mc-ink)]">
                        <Link href={productHref(item)} className="hover:text-[var(--mc-accent)] transition-colors">
                          {item.name}
                        </Link>
                      </h2>
                    </div>
                  </div>

                  {/* Product Specification */}
                  <ProductSpecification item={item} />

                  {/* Price */}
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--mc-muted)] xl:hidden">Price</p>
                    <p className="mt-1 text-[17px] font-bold leading-snug text-[var(--mc-ink)] xl:mt-0">
                      {item.priceLabel}
                    </p>
                    {item.taxInclusive ? (
                      <p className="mt-0.5 text-xs text-[var(--mc-muted)]">GST included</p>
                    ) : item.priceState === "STARTING" ? (
                      <p className="mt-0.5 text-xs font-medium text-[var(--mc-muted)]">
                        GST charged additionally as applicable
                      </p>
                    ) : null}
                  </div>

                  {/* Actions & State Fallback */}
                  <div className="flex flex-col items-start gap-2 pt-2 sm:pt-0 sm:col-span-2 xl:col-span-1">
                    {isUnavailableInState ? (
                      <button
                        type="button"
                        onClick={() =>
                          openQuoteFallback({
                            mode: "STATE_UNAVAILABLE",
                            productName: item.name,
                            category: item.category?.name,
                            customerState: item.stateAvailability?.customerState || undefined,
                            additionalNotes: item.stateAvailability?.message || undefined,
                          })
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors shadow-sm"
                      >
                        <span>Request Quote</span>
                        <ArrowRight size={16} />
                      </button>
                    ) : quickOrderEligible ? (
                      quickAddedId === item.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-200">
                            <Check size={15} /> Added to basket
                          </span>
                          <Link href="/cart" className="text-xs font-bold text-[var(--mc-accent)] underline">View basket</Link>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(quickActionId)}
                            onClick={() => void quickOrder(item, true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Zap size={15} />
                            {isBuyingNow ? "Starting..." : "Buy now"}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(quickActionId)}
                            onClick={() => void quickOrder(item, false)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ShoppingBag size={15} />
                            {isAddingToCart ? "Adding..." : "Add to basket"}
                          </button>
                          <Link href={productHref(item)} className="text-xs font-bold text-[var(--mc-muted)] underline hover:text-[var(--mc-accent)]">
                            Details
                          </Link>
                        </div>
                      )
                    ) : expandableEligible ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm"
                        >
                          {isExpanded ? "Close" : "Order now"} <ArrowRight size={16} className={isExpanded ? "rotate-90 transition-transform" : "transition-transform"} />
                        </button>
                        <Link href={productHref(item)} className="text-xs font-bold text-[var(--mc-muted)] underline hover:text-[var(--mc-accent)]">
                          Details
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={productHref(item)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm"
                      >
                        Configure <ArrowRight size={16} />
                      </Link>
                    )}
                    {rowError ? <p className="text-xs font-semibold text-[#a53025]">{rowError} <Link href={productHref(item)} className="underline">Configure on the product page</Link></p> : null}
                  </div>
                </article>
                {isExpanded ? (
                  <div className="border-t border-[var(--mc-line)] p-4">
                    <InlineOrderPanel item={item} onAdded={() => setExpandedId(null)} />
                  </div>
                ) : null}
                </div>
              );
            })}

            {pagination.totalPages > 1 ? (
              <nav
                aria-label="Product pages"
                className="flex items-center justify-between border-t border-[var(--mc-line)] pt-5"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-full border border-[var(--mc-line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--mc-accent)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--mc-surface)] transition-colors"
                >
                  Previous
                </button>
                <p className="text-sm font-semibold text-[var(--mc-muted)]">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  className="rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm"
                >
                  Next
                </button>
              </nav>
            ) : null}
            <p className="border-t border-[var(--mc-line)] pt-4 text-right text-xs font-medium text-[var(--mc-muted)]">
              Base prices shown above are exclusive of GST. GST charged additionally as applicable.
            </p>
          </section>
        ) : null}

        {/* NO MATCH / LOW CONFIDENCE FALLBACK CARD */}
        {!loading && !items.length && !error ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
              <Search size={26} />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Couldn&apos;t find the product you&apos;re looking for?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              We specialize in custom commercial printing at our Ahmedabad facility. Send us your requirement and our production desk will prepare the best possible quotation.
            </p>

            {debouncedQuery && (
              <div className="mt-3.5 inline-block rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-mono text-slate-700">
                Searched: &ldquo;{debouncedQuery}&rdquo;
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  openQuoteFallback({
                    mode: "SEARCH_FALLBACK",
                    searchQuery: debouncedQuery,
                    ...searchMeta?.extractedRequirement,
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-[#1e3a5f] px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
              >
                <span>Share Your Requirement</span>
                <ArrowRight size={16} />
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Browse All Products
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Embedded Accessible Requirement Quote Modal */}
      <RequirementQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        context={quoteContext}
      />
    </main>
  );
}

function ProductSpecification({ item }: { item: Product }) {
  const artwork = item.artworkSummary;
  const isPremium = item.category?.slug === "premium-card" || item.slug.startsWith("premium-");
  const rawSpec =
    item.listingSpecification && item.listingSpecification.toLowerCase() !== item.name.toLowerCase()
      ? item.listingSpecification
      : null;
  const specText =
    rawSpec && isPremium
      ? rawSpec
          .replace(/corner\s*cut\s*included\s*by\s*default\.?/gi, "")
          .trim()
          .replace(/^[,.;:\-\u00b7\s]+|[,;:\-\u00b7\s]+$/g, "") || null
      : rawSpec;
  const artworkLabel = artwork?.formatLabel?.toLowerCase().includes("cdr")
    ? "CDR required"
    : artwork?.formatLabel
    ? `${artwork.formatLabel} required`
    : null;

  return (
    <div className="min-w-0 space-y-1 text-[13px] leading-5 text-[var(--mc-muted)]">
      <p className="text-xs font-bold uppercase text-[var(--mc-muted)] xl:hidden">Specification</p>
      {isPremium ? <p className="font-semibold text-[#1e4da1]">Corner cut included by default.</p> : null}
      {specText ? <p className="line-clamp-2 text-sm font-medium text-[var(--mc-ink)]">{specText}</p> : null}
      {item.productSize ? (
        <p>
          <strong className="font-semibold text-[var(--mc-ink)]">Size:</strong> {item.productSize}
        </p>
      ) : null}
      {artwork ? (
        <>
          {artworkLabel ? (
            <p className="flex items-center gap-1.5">
              <FileUp size={14} />
              {artworkLabel}
            </p>
          ) : null}
          {artwork.fullDesign ? (
            <p>
              <strong className="font-semibold text-[var(--mc-ink)]">Full:</strong> {artwork.fullDesign}
            </p>
          ) : null}
          {artwork.finalSize ? (
            <p>
              <strong className="font-semibold text-[var(--mc-ink)]">Final:</strong> {artwork.finalSize}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * Inline "order without leaving the listing" panel for products that need CDR
 * artwork — the plain one-click quickOrder() path can't be used for these since
 * the cart API rejects artwork-required items with no artwork attached. This
 * mirrors product-configurator.tsx's defaulting logic (first pricing rule,
 * its default add-ons) but keeps everything inside the row: quantity, artwork
 * upload, and Add to basket / Buy now. "Details" still links to the full
 * product page for anyone who wants finer control (add-ons, delivery, etc).
 */
function InlineOrderPanel({ item, onAdded }: { item: Product; onAdded: () => void }) {
  const router = useRouter();
  const [details, setDetails] = useState<ProductDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1000);
  const [artworks, setArtworks] = useState<Record<string, UploadedArtwork>>({});
  const [submitting, setSubmitting] = useState<"cart" | "buy" | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${item.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (!payload?.success) throw new Error(payload?.error?.message ?? "Could not load this product's options");
        const data = payload.data as ProductDetail;
        setDetails(data);
        const rule = data.pricingRules[0];
        if (rule) {
          setRuleId(rule.id);
          const conditionQuantity = rule.conditions?.quantity;
          setQuantity(conditionQuantity ? Number(conditionQuantity) : normalizeProductQuantity(undefined, null, item.slug).normalizedQuantity);
        }
      })
      .catch((caught) => { if (active) setLoadError(caught instanceof Error ? caught.message : "Could not load this product's options"); })
      .finally(() => { if (active) setLoadingDetails(false); });
    return () => { active = false; };
  }, [item.id, item.slug]);

  const requirement = details?.artworkRequirements.find((row) => row.pricingRuleId === ruleId) ?? details?.artworkRequirements.find((row) => !row.pricingRuleId) ?? null;
  const slots = requirement?.slots?.length ? requirement.slots : [];
  const requiredKeys = requirement?.artworkRequired ? (slots.length ? slots.filter((slot) => slot.required).map((slot) => slot.slotKey) : ["MAIN"]) : [];
  const artworkReady = requiredKeys.every((key) => Boolean(artworks[key]));

  async function submit(checkout: boolean) {
    setSubmitting(checkout ? "buy" : "cart");
    setSubmitError("");
    const artworkIds = Object.fromEntries(Object.entries(artworks).map(([slotKey, artwork]) => [slotKey, artwork.id]));
    const configuration = { quantity: String(quantity), pricingRuleId: ruleId, ...(Object.keys(artworkIds).length ? { artworkIds } : {}), ...(artworkIds.MAIN ? { artworkId: artworkIds.MAIN } : {}) };
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.id, quantity, configuration, kind: "PURCHASE" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not add this product to your basket");
      if (checkout) { router.push("/checkout"); return; }
      onAdded();
      router.push("/cart");
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Could not add this product to your basket");
    } finally {
      setSubmitting(null);
    }
  }

  if (loadingDetails) return <p className="text-sm text-[var(--mc-muted)]">Loading order options&hellip;</p>;
  if (!details || loadError) return <p className="text-sm font-semibold text-[#a53025]">{loadError || "Could not load this product's options."}</p>;

  return (
    <div className="space-y-4">
      {details.pricingRules.length > 1 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-[var(--mc-muted)]">Card stock and print</p>
          <div className="flex flex-wrap gap-2">
            {details.pricingRules.map((rule) => (
              <button key={rule.id} type="button" onClick={() => setRuleId(rule.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${ruleId === rule.id ? "border-[var(--mc-accent)] bg-[var(--mc-accent)] text-white" : "border-[var(--mc-line)] bg-white text-[var(--mc-ink)] hover:bg-[var(--mc-surface)]"}`}>
                {rule.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase text-[var(--mc-muted)]">Quantity</span>
        <div className="flex items-center rounded-full border border-[var(--mc-line)] bg-white">
          <button type="button" onClick={() => setQuantity((current) => stepProductQuantity(current, "DOWN", null, item.slug))} className="grid size-9 place-items-center hover:bg-[var(--mc-surface)]" aria-label="Decrease quantity">−</button>
          <span className="min-w-16 text-center text-sm font-bold text-[var(--mc-ink)]">{quantity.toLocaleString("en-IN")}</span>
          <button type="button" onClick={() => setQuantity((current) => stepProductQuantity(current, "UP", null, item.slug))} className="grid size-9 place-items-center hover:bg-[var(--mc-surface)]" aria-label="Increase quantity">+</button>
        </div>
      </div>

      {requirement?.artworkRequired ? (
        <div className="space-y-3">
          {slots.length ? slots.map((slot, index) => (
            <ArtworkUploader
              key={slot.id}
              productId={item.id}
              pricingRuleId={ruleId}
              requirement={requirement}
              slot={slot}
              showRequirements={index === 0}
              configuration={{ quantity: String(quantity) }}
              artwork={artworks[slot.slotKey] ?? null}
              onUploaded={(uploaded) => setArtworks((current) => ({ ...current, [slot.slotKey]: uploaded }))}
              onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next[slot.slotKey]; return next; })}
            />
          )) : (
            <ArtworkUploader
              productId={item.id}
              pricingRuleId={ruleId}
              requirement={requirement}
              configuration={{ quantity: String(quantity) }}
              artwork={artworks.MAIN ?? null}
              onUploaded={(uploaded) => setArtworks((current) => ({ ...current, MAIN: uploaded }))}
              onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next.MAIN; return next; })}
            />
          )}
        </div>
      ) : null}

      {submitError ? <p className="text-sm font-semibold text-[#a53025]">{submitError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!artworkReady || submitting !== null}
          onClick={() => void submit(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Zap size={15} />
          {submitting === "buy" ? "Starting..." : "Buy now"}
        </button>
        <button
          type="button"
          disabled={!artworkReady || submitting !== null}
          onClick={() => void submit(false)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag size={15} />
          {submitting === "cart" ? "Adding..." : "Add to basket"}
        </button>
        {!artworkReady ? <p className="w-full text-xs font-medium text-[var(--mc-muted)]">Upload the required artwork to enable ordering.</p> : null}
      </div>
    </div>
  );
}

function ProductRowsSkeleton() {
  return (
    <div className="mt-5 space-y-2.5" aria-label="Loading products">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 rounded-lg border border-[var(--mc-line)] bg-white p-4 sm:grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[92px_minmax(17rem,1.1fr)_11rem_minmax(17rem,1fr)_17rem]"
        >
          <div className="h-[76px] rounded-md bg-[#e5ebf5]" />
          <div className="space-y-2 self-center">
            <div className="h-3 w-24 rounded bg-[#e5ebf5]" />
            <div className="h-5 w-48 max-w-full rounded bg-[#dce4f0]" />
            <div className="h-3 w-64 max-w-full rounded bg-[#e8edf5]" />
          </div>
          <div className="hidden h-6 w-28 self-center rounded bg-[#e2e8f2] xl:block" />
          <div className="hidden space-y-2 self-center xl:block">
            <div className="h-3 w-32 rounded bg-[#e2e8f2]" />
            <div className="h-3 w-44 rounded bg-[#e8edf5]" />
          </div>
          <div className="hidden h-10 w-56 self-center rounded-full bg-[#e2e8f2] xl:block" />
        </div>
      ))}
    </div>
  );
}
