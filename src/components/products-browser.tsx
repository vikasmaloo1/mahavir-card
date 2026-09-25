"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, FileUp, RefreshCw, Search, ShoppingBag, SlidersHorizontal, Sparkles, X, WalletCards, Zap, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { formatInr } from "@/lib/formatting";
import { productFiltersToSearchParams, productListingHref, readProductFilters, type ProductFilters } from "@/lib/catalog-routing";
import { RequirementQuoteModal, type RequirementContext } from "@/components/requirement-quote-modal";
import { normalizeProductQuantity, stepProductQuantity, MAX_ORDER_QUANTITY, isSpecialQuantityProduct } from "@/lib/quantity-helper";
import { ArtworkUploader, type ArtworkRequirement, type UploadedArtwork } from "@/components/artwork-uploader";
import { showToast } from "@/components/toast-provider";
import { HorizontalScrollContainer } from "@/components/horizontal-scroll-container";
import { isOutsideGujRaj } from "@/lib/india-states";

type ProductDetail = {
  pricingRules: Array<{
    id: string;
    name: string;
    ruleType?: string;
    conditions: Record<string, unknown>;
    priceFormula?: Record<string, unknown>;
  }>;
  addons: Array<{ addonId: string; name: string; price: string; pricingRuleId: string | null; isDefault: boolean }>;
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
  addons?: Array<{ id: string; name: string; price: string | null; isDefault: boolean }>;
  isSquareInch?: boolean;
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

type OrderHistoryItem = {
  id: string;
  description: string;
  jobName: string | null;
  quantity: number;
  totalPrice: string;
  configuration: unknown;
};

type OrderHistoryEntry = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  paymentStatus: string | null;
  items?: OrderHistoryItem[];
};

type MiniCartArtworkFile = { slotKey: string; id: string; fileName: string | null; artworkSlotId: string | null };
type MiniCartItem = { id: string; productId: string; quantity: number; calculatedAmount: string | null; name: string; slug: string; pricingRuleId: string | null; artworkFiles: MiniCartArtworkFile[] };

function formatOrderDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${month} ${day} ${year} ${hours}:${minutes}${ampm}`;
}

function formatOrderStatus(status: string) {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "Under Process";
    case "CONFIRMED":
      return "Confirmed";
    case "IN_PRODUCTION":
      return "In Production";
    case "READY":
      return "Ready";
    case "DISPATCHED":
      return "Dispatched";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function ProductsBrowser({ initialFilters, isB2B, walletBalance, isLoggedIn = false }: { initialFilters: ProductFilters; isB2B: boolean; walletBalance: string | null; isLoggedIn?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [quickError, setQuickError] = useState<Record<string, string>>({});
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [orderHistoryPage, setOrderHistoryPage] = useState(1);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [customerCompanyName, setCustomerCompanyName] = useState<string | null>(null);
  const [customerStateCode, setCustomerStateCode] = useState<string | null>(null);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const [miniCartItems, setMiniCartItems] = useState<MiniCartItem[]>([]);
  const [miniCartBusyId, setMiniCartBusyId] = useState<string | null>(null);
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
    let active = true;
    fetch("/api/account/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload?.success) {
          setOrderHistory(payload.data.orders ?? []);
          if (payload.data.customer?.companyName) {
            setCustomerCompanyName(payload.data.customer.companyName);
          }
          if (payload.data.customer?.stateCode) {
            setCustomerStateCode(payload.data.customer.stateCode);
          } else if (payload.data.addresses?.length) {
            const defaultAddr = payload.data.addresses.find((a: any) => a.isDefault) ?? payload.data.addresses[0];
            if (defaultAddr?.stateCode) setCustomerStateCode(defaultAddr.stateCode);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function cancelRecentOrder(orderId: string, orderNumber: string) {
    if (!window.confirm(`Are you sure you want to cancel Order #${orderNumber}? Any wallet balance will be refunded.`)) {
      return;
    }
    setCancellingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer from recent orders" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast.error(data.message || "Failed to cancel order");
        return;
      }
      showToast.success(`Order #${orderNumber} cancelled successfully`);
      setOrderHistory((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
      );
    } catch {
      showToast.error("Network error cancelling order");
    } finally {
      setCancellingOrderId(null);
    }
  }

  const refreshCartProductIds = useCallback(() => {
    fetch("/api/cart?kind=PURCHASE", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) return;
        const cartApiItems = payload.data.items as Array<{
          id: string;
          productId: string;
          quantity: number;
          calculatedAmount: string | null;
          configuration: Record<string, unknown>;
          artworkFiles: MiniCartArtworkFile[];
          product: { name: string; slug: string };
        }>;
        setCartProductIds(new Set(cartApiItems.map((item) => item.productId)));
        setMiniCartItems(cartApiItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          calculatedAmount: item.calculatedAmount,
          name: item.product.name,
          slug: item.product.slug,
          pricingRuleId: typeof item.configuration.pricingRuleId === "string" ? item.configuration.pricingRuleId : null,
          artworkFiles: item.artworkFiles,
        })));
      })
      .catch(() => undefined);
  }, []);

  async function removeMiniCartItem(itemId: string) {
    setMiniCartBusyId(itemId);
    try {
      await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    } finally {
      setMiniCartBusyId(null);
      refreshCartProductIds();
    }
  }

  async function updateMiniCartQuantity(item: MiniCartItem, direction: "UP" | "DOWN") {
    const nextQuantity = stepProductQuantity(item.quantity, direction, null, item.slug);
    if (nextQuantity === item.quantity) return;
    setMiniCartBusyId(item.id);
    try {
      await fetch(`/api/cart/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: nextQuantity }) });
    } finally {
      setMiniCartBusyId(null);
      refreshCartProductIds();
    }
  }

  async function replaceMiniCartArtwork(item: MiniCartItem, artworkFile: MiniCartArtworkFile, file: File) {
    setMiniCartBusyId(item.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", item.productId);
      if (item.pricingRuleId) formData.append("pricingRuleId", item.pricingRuleId);
      formData.append("artworkSlotKey", artworkFile.slotKey);
      if (artworkFile.artworkSlotId) formData.append("artworkSlotId", artworkFile.artworkSlotId);
      formData.append("replaceArtworkId", artworkFile.id);
      const response = await fetch("/api/artworks/upload", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not upload the replacement file");
      const cartResponse = await fetch("/api/cart", { cache: "no-store" });
      const cartPayload = await cartResponse.json().catch(() => null);
      const freshItem = cartPayload?.data?.items?.find((row: { id: string }) => row.id === item.id);
      if (freshItem) {
        const nextConfiguration = { ...freshItem.configuration } as Record<string, unknown>;
        const slotMap = nextConfiguration.artworkIds && typeof nextConfiguration.artworkIds === "object" ? { ...(nextConfiguration.artworkIds as Record<string, unknown>) } : {};
        slotMap[artworkFile.slotKey] = payload.data.id;
        nextConfiguration.artworkIds = slotMap;
        if (artworkFile.slotKey === "MAIN") nextConfiguration.artworkId = payload.data.id;
        await fetch(`/api/cart/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: freshItem.quantity, configuration: nextConfiguration }) });
      }
    } catch (caught) {
      setQuickError((current) => ({ ...current, [item.productId]: caught instanceof Error ? caught.message : "Could not upload the replacement file" }));
    } finally {
      setMiniCartBusyId(null);
      refreshCartProductIds();
    }
  }

  useEffect(() => {
    if (!isB2B) return;
    refreshCartProductIds();
  }, [isB2B, refreshCartProductIds]);

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
    params.set("page", isB2B ? "1" : String(page));
    params.set("limit", isB2B ? "300" : "12");

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
  }, [category, debouncedQuery, orderable, page, requestVersion, isB2B]);

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
  const destinationHref = (item: Product) => {
    return productHref(item);
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
      setAddedProductIds((prev) => new Set([...prev, item.id]));
      showToast.success(
        "Added to basket successfully!",
        `${item.name} added to your basket.`,
        { action: { label: "View basket →", href: "/cart" } }
      );
      refreshCartProductIds();
    } catch (caught) {
      setQuickError((current) => ({ ...current, [item.id]: caught instanceof Error ? caught.message : "Could not add this product to your basket" }));
    } finally {
      setQuickActionId(null);
    }
  }

  /** Re-adds a previously ordered product using the exact configuration it was ordered with last time. */
  return (
    <main className="mc-storefront min-h-screen text-[var(--mc-ink)]">
      {/* 1. FILTER & CATEGORY HEADER (Soft Blue) */}
      <div className="w-full border-b border-[#d4e4f5] mc-section-blue py-6 sm:py-8">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
          {isB2B && walletBalance !== null ? (
            <Link
              href="/account/wallet"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs transition-colors hover:border-[var(--mc-accent)]"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]">
                  <WalletCards size={18} />
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase text-[var(--mc-muted)]">Wallet balance</span>
                  <span className="block text-lg font-bold text-[var(--mc-ink)]">{formatInr(walletBalance)}</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2 text-xs font-bold text-white">
                Top up <ArrowRight size={14} />
              </span>
            </Link>
          ) : null}
          <header className="border-b border-[#c8d8ea] pb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1b365d]">Product catalogue</p>
            <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-[2.35rem]">
                  Choose a print job.
                </h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">
                  Compare specifications, artwork and ordering options in one place.
                </p>
              </div>
              <p className="text-[15px] font-semibold text-slate-600">
                {pagination.total} products
              </p>
            </div>
          </header>

          {/* Search Bar & Clear Action */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[#c8d8ea] bg-white px-4 shadow-xs">
              <Search size={18} className="shrink-0 text-slate-500" />
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
                  className="grid size-9 place-items-center rounded-full hover:bg-slate-100"
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
                className="rounded-full border border-[#c8d8ea] bg-white px-5 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50 transition-colors shadow-xs"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {/* Category Pills */}
          <div
            ref={categoriesRef}
            id="categories"
            className="mt-4 border-t border-[#c8d8ea] pt-3 scroll-mt-28 sm:scroll-mt-24"
          >
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="mr-2 inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase text-slate-600">
                <SlidersHorizontal size={15} />
                Categories
              </span>
              <button
                type="button"
                ref={!category ? activePillRef : null}
                onClick={() => selectCategory("")}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  !category
                    ? "bg-[#1e3a5f] text-white shadow-xs font-bold"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f]"
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
                      ? "bg-[#1e3a5f] text-white shadow-xs font-bold"
                      : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f]"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT GRID SECTION (White) */}
      <div className="w-full mc-section-white py-8 sm:py-10">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">

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
        <div className={isB2B && items.length ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start" : ""}>
        {items.length ? (
          <section
            className={`mt-5 transition-opacity duration-200 ${isB2B ? "overflow-hidden rounded-lg border border-[var(--mc-line)]" : "space-y-3"} ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            {isB2B ? (
              <div className="grid grid-cols-[minmax(9rem,2fr)_5rem_7rem] items-center gap-3 bg-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white sm:grid-cols-[minmax(10rem,2fr)_minmax(8rem,1.4fr)_6rem_9rem]">
                <span>Product</span>
                <span className="hidden sm:block">Print copy</span>
                <span>Amount</span>
                <span>Action</span>
              </div>
            ) : (
              <div className="hidden grid-cols-[minmax(15rem,.9fr)_minmax(20rem,1.2fr)_10rem_minmax(20rem,1fr)] gap-5 px-4 py-2 text-xs font-bold uppercase text-[var(--mc-muted)] xl:grid">
                <span>Product</span>
                <span>Specification</span>
                <span>Price</span>
                <span>Actions</span>
              </div>
            )}

            {items.map((item, index) => {
              const isUnavailableInState = item.stateAvailability?.status === "UNAVAILABLE_IN_STATE";
              const quickOrderEligible = isB2B && item.orderable && !item.hasArtworkRequirement && !isUnavailableInState;
              const expandableEligible = isB2B && item.orderable && item.hasArtworkRequirement && !isUnavailableInState;
              const isAddingToCart = quickActionId === `${item.id}:cart`;
              const isBuyingNow = quickActionId === `${item.id}:buy`;
              const rowError = quickError[item.id];
              const isExpanded = expandedId === item.id;
              const rowActions = (
                <RowActions
                  item={item}
                  isUnavailableInState={isUnavailableInState}
                  quickOrderEligible={quickOrderEligible}
                  expandableEligible={expandableEligible}
                  isExpanded={isExpanded}
                  isAdded={addedProductIds.has(item.id)}
                  quickActionId={quickActionId}
                  isBuyingNow={isBuyingNow}
                  isAddingToCart={isAddingToCart}
                  openQuoteFallback={openQuoteFallback}
                  quickOrder={quickOrder}
                  setExpandedId={setExpandedId}
                  productHref={productHref}
                  isLoggedIn={isLoggedIn}
                  inCart={cartProductIds.has(item.id)}
                />
              );

              if (isB2B) {
                return (
                  <div key={item.id} className={index !== 0 ? "border-t border-[var(--mc-line)]" : ""}>
                    <div
                      className={`grid grid-cols-[minmax(9rem,2fr)_5rem_7rem] items-center gap-3 px-3 py-3 text-[15px] sm:grid-cols-[minmax(10rem,2fr)_minmax(8rem,1.4fr)_6rem_9rem] ${
                        index % 2 === 1 ? "bg-[var(--mc-surface)]" : "bg-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <Link href={destinationHref(item)} className="font-bold text-[var(--mc-ink)] hover:text-[var(--mc-accent)] transition-colors">
                          {item.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                          {item.productSize ? <span className="text-xs text-[var(--mc-muted)]">{item.productSize}</span> : null}
                        </div>
                        {cartProductIds.has(item.id) || isUnavailableInState ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {isUnavailableInState ? (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">{item.stateAvailability?.badgeText}</span>
                            ) : null}
                            {cartProductIds.has(item.id) ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <Check size={10} /> In basket
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {item.addons && item.addons.length > 0 ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {item.addons.map((ad) => (
                              <span
                                key={ad.id}
                                className="inline-flex items-center gap-0.5 rounded bg-blue-50/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#1e3a5f] border border-[#bfd3f5]"
                                title={`Optional finishing: ${ad.name}`}
                              >
                                +{ad.name}{isLoggedIn && ad.price && Number(ad.price) > 0 ? ` (+₹${Number(ad.price)})` : ""}
                              </span>
                            ))}
                          </div>
                        ) : (item.category?.slug === "premium-card" || item.slug.startsWith("premium-")) ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 border border-emerald-200">
                              ✓ Corner Cut included
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="hidden text-sm text-[var(--mc-muted)] sm:block">
                        <p className="truncate">{item.listingSpecification || item.productSize || "-"}</p>
                        {item.artworkSummary?.fullDesign || item.artworkSummary?.safeArea ? (
                          <p className="mt-0.5 truncate text-xs">
                            {item.artworkSummary?.fullDesign ? <>Full: {item.artworkSummary.fullDesign}</> : null}
                            {item.artworkSummary?.fullDesign && item.artworkSummary?.safeArea ? " · " : null}
                            {item.artworkSummary?.safeArea ? <>Safe: {item.artworkSummary.safeArea}</> : null}
                          </p>
                        ) : null}
                      </div>
                      {isLoggedIn && item.priceState !== "LOGIN" && item.priceLabel !== "Login to view price" ? (
                        <div className="text-[15px] font-bold leading-snug text-[var(--mc-ink)]">{item.priceLabel}</div>
                      ) : (
                        <Link href="/login" className="text-xs font-bold text-[var(--mc-accent)] hover:underline">
                          Login to view price &rarr;
                        </Link>
                      )}
                      <div className="flex flex-col items-start gap-1">
                        {rowActions}
                        {rowError ? <p className="text-[11px] font-semibold text-[#a53025]">{rowError}</p> : null}
                      </div>
                    </div>
                    {isExpanded ? (
                      <div className="border-t-2 border-[var(--mc-accent)]/20 bg-[#f8fbfe] p-4 sm:p-6 shadow-inner transition-all">
                        <InlineOrderPanel item={item} customerStateCode={customerStateCode} onAdded={() => { setExpandedId(null); setAddedProductIds((prev) => new Set([...prev, item.id])); refreshCartProductIds(); }} />
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white shadow-xs transition-all duration-200 hover:border-[#1e3a5f]/40 hover:shadow-md ${
                    isUnavailableInState ? "border-amber-200" : "border-slate-200/90"
                  }`}
                >
                <article
                  className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,.9fr)_minmax(20rem,1.2fr)_10rem_minmax(20rem,1fr)] xl:items-center"
                >
                  {/* Product Visual + Title */}
                  <div className="flex min-w-0 gap-3.5">
                    <Link
                      href={destinationHref(item)}
                      className="relative h-[76px] w-[92px] shrink-0 overflow-hidden rounded-xl bg-[#f0f5fa] border border-[#d5e3f1]/70"
                    >
                      <ProductImage
                        src={item.imageUrl || "/images/mahavir-print-assortment.png"}
                        alt={`${item.name} print sample`}
                        slug={item.slug}
                      />
                    </Link>
                    <div className="min-w-0 self-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md border border-[#d5e3f1] bg-[#edf4fb] px-2 py-0.5 text-[11px] font-bold text-[#1b365d]">
                          {item.category?.name ?? "Print product"}
                        </span>
                        {isUnavailableInState && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            {item.stateAvailability?.badgeText}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1.5 text-[17.5px] font-bold leading-snug text-slate-950">
                        <Link href={destinationHref(item)} className="hover:text-[#1e3a5f] transition-colors">
                          {item.name}
                        </Link>
                      </h2>
                    </div>
                  </div>

                  {/* Product Specification */}
                  <ProductSpecification item={item} isLoggedIn={isLoggedIn} />

                  {/* Price */}
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 xl:hidden">Price</p>
                    {isLoggedIn && item.priceState !== "LOGIN" && item.priceLabel !== "Login to view price" ? (
                      <>
                        <p className="mt-1 text-[18px] font-bold leading-snug text-slate-950 xl:mt-0">
                          {item.priceLabel}
                        </p>
                        {!isB2B && (
                          item.taxInclusive ? (
                            <p className="mt-0.5 text-xs text-slate-500">GST included</p>
                          ) : item.priceState === "STARTING" ? (
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              GST charged additionally as applicable
                            </p>
                          ) : null
                        )}
                      </>
                    ) : (
                      <Link href="/login" className="mt-1 block text-xs font-bold text-[var(--mc-accent)] hover:underline xl:mt-0">
                        Login to view price &rarr;
                      </Link>
                    )}
                  </div>

                  {/* Actions & State Fallback */}
                  <div className="flex flex-col items-start gap-2 pt-2 sm:pt-0 sm:col-span-2 xl:col-span-1">
                    {rowActions}
                    {rowError ? <p className="text-xs font-semibold text-[#a53025]">{rowError} <Link href={productHref(item)} className="underline">Configure on the product page</Link></p> : null}
                  </div>
                </article>
                {isExpanded ? (
                  <div className="border-t border-[var(--mc-line)] p-4">
                    <InlineOrderPanel item={item} customerStateCode={customerStateCode} onAdded={() => { setExpandedId(null); setAddedProductIds((prev) => new Set([...prev, item.id])); refreshCartProductIds(); }} />
                  </div>
                ) : null}
                </div>
              );
            })}
            {!isB2B && pagination.totalPages > 1 ? (
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
            {!isB2B && isLoggedIn ? (
              <p className="border-t border-[var(--mc-line)] pt-4 text-right text-xs font-medium text-[var(--mc-muted)]">
                Prices shown above are exclusive of GST. GST charged additionally as applicable.
              </p>
            ) : null}
          </section>
        ) : null}
        {isB2B && items.length ? (
          <MiniCart
            items={miniCartItems}
            busyId={miniCartBusyId}
            onRemove={(id) => void removeMiniCartItem(id)}
            onQuantityChange={(item, direction) => void updateMiniCartQuantity(item, direction)}
            onReplaceArtwork={(item, artworkFile, file) => void replaceMiniCartArtwork(item, artworkFile, file)}
          />
        ) : null}
        </div>

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

        {orderHistory.length ? (
          <section className="mt-12 border-t-2 border-slate-200 pt-8 pb-4">
            <h2 className="text-xl md:text-2xl font-black text-[#1e429f] tracking-wide text-center uppercase mb-5">
              RECENT ORDERS
            </h2>
            <div className="rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
              <HorizontalScrollContainer>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-white text-xs font-bold uppercase tracking-wider">
                      <th className="px-3 py-3 text-center border-r border-slate-800 whitespace-nowrap">ORDER NO.</th>
                      <th className="px-3 py-3 text-center border-r border-slate-800 whitespace-nowrap">DATE</th>
                      <th className="px-3 py-3 border-r border-slate-800 whitespace-nowrap">ORDER NAME</th>
                      <th className="px-3 py-3 border-r border-slate-800 min-w-[220px]">ORDER DETAIL</th>
                      <th className="px-3 py-3 text-center border-r border-slate-800 whitespace-nowrap">CURRENT STATUS</th>
                      <th className="px-3 py-3 text-center border-r border-slate-800 w-12 whitespace-nowrap">TRACK</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {orderHistory.slice(0, 10).map((order) => {
                      const orderName =
                        order.items?.find((it) => it.jobName?.trim())?.jobName ||
                        order.notes?.trim() ||
                        customerCompanyName ||
                        `Order #${order.orderNumber}`;

                      const isPending = order.status === "PENDING";
                      const isCancelled = order.status === "CANCELLED";

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-3 text-center font-medium border-r border-slate-200 whitespace-nowrap">
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-200 whitespace-nowrap">
                            {formatOrderDate(order.createdAt)}
                          </td>
                          <td className="px-3 py-3 font-semibold uppercase text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {orderName}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200">
                            {order.items && order.items.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="inline-flex flex-wrap items-center gap-1.5 rounded bg-slate-100/90 border border-slate-200/80 px-2 py-1 text-slate-700"
                                  >
                                    <span className="font-semibold text-slate-900 line-clamp-1">{item.description}</span>
                                    <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5 border border-slate-300 text-[10px] font-bold text-slate-800">
                                      Qty: {item.quantity}
                                    </span>
                                    {item.jobName ? (
                                      <span className="text-[10px] text-slate-500 italic">({item.jobName})</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Standard Order</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center border-r border-slate-200 whitespace-nowrap font-medium">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isCancelled
                                  ? "text-rose-700 bg-rose-50"
                                  : isPending
                                  ? "text-amber-700 bg-amber-50"
                                  : order.status === "DELIVERED"
                                  ? "text-emerald-700 bg-emerald-50"
                                  : "text-blue-700 bg-blue-50"
                              }`}
                            >
                              {formatOrderStatus(order.status)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <span
                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white shadow-xs ${
                                  isCancelled
                                    ? "bg-rose-500"
                                    : isPending
                                    ? "bg-amber-500"
                                    : "bg-[#16a34a]"
                                }`}
                                title={formatOrderStatus(order.status)}
                              >
                                {isCancelled ? (
                                  <X size={13} strokeWidth={2.5} />
                                ) : isPending ? (
                                  <RefreshCw size={12} className="animate-spin-slow" />
                                ) : (
                                  <Check size={13} strokeWidth={2.5} />
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => cancelRecentOrder(order.id, order.orderNumber)}
                                  disabled={cancellingOrderId === order.id}
                                  className="rounded bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
                                >
                                  {cancellingOrderId === order.id ? "..." : "Cancel"}
                                </button>
                              )}
                              <Link
                                href={`/account/orders/${order.id}`}
                                className="rounded bg-[#16a34a] px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-green-700 transition-colors"
                              >
                                Details
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </HorizontalScrollContainer>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded bg-[#0098ca] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-[#0082ad] transition-colors"
              >
                Show More...
              </Link>
            </div>
          </section>
        ) : null}
        </div>
      </div>

      {/* 3. SUPPORTING / CUSTOM QUOTE SECTION (Warm Beige) */}
      <section className="w-full border-t border-[#ede4d5] mc-section-beige py-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e0d4c0] bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#4d402e] shadow-2xs">
              <span className="size-1.5 rounded-full bg-[#1e3a5f]" />
              Custom Print Specifications
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Need a non-standard size, custom paper stock, or volume quotation?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Submit your specific dimensions, quantities, or special finishing requests for a fast, direct estimate from our Ahmedabad offset press.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openQuoteFallback({
                mode: "CUSTOM_REQUEST",
                title: "Custom Print Specification Quote",
                subtitle: "Tell us about your non-standard dimensions, materials, or special finishing.",
              })
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1e3a5f] px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#152a45]"
          >
            Share Custom Requirement <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* Embedded Accessible Requirement Quote Modal */}
      <RequirementQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        context={quoteContext}
      />
    </main>
  );
}

function RowActions({
  item,
  isUnavailableInState,
  quickOrderEligible,
  expandableEligible,
  isExpanded,
  isAdded = false,
  quickActionId,
  isBuyingNow,
  isAddingToCart,
  openQuoteFallback,
  quickOrder,
  setExpandedId,
  productHref,
  isLoggedIn = false,
  inCart = false,
}: {
  item: Product;
  isUnavailableInState: boolean;
  quickOrderEligible: boolean;
  expandableEligible: boolean;
  isExpanded: boolean;
  isAdded?: boolean;
  quickActionId: string | null;
  isBuyingNow: boolean;
  isAddingToCart: boolean;
  openQuoteFallback: (context: RequirementContext) => void;
  quickOrder: (item: Product, checkout: boolean) => Promise<void>;
  setExpandedId: (id: string | null) => void;
  productHref: (item: Product) => string;
  isLoggedIn?: boolean;
  inCart?: boolean;
}) {
  if (isUnavailableInState) {
    return (
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
        className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs whitespace-nowrap"
      >
        <span>Request Quote</span>
        <ArrowRight size={12} />
      </button>
    );
  }
  if (quickOrderEligible) {
    const isAddedRecently = isAdded;
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {isAddedRecently || inCart ? (
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors shadow-2xs"
          >
            <Check size={12} className="text-emerald-700" />
            <span>{isAddedRecently ? "Added!" : "In basket"} · View &rarr;</span>
          </Link>
        ) : null}
        <button
          type="button"
          disabled={Boolean(quickActionId)}
          onClick={() => void quickOrder(item, false)}
          className="inline-flex items-center gap-1 rounded bg-[var(--mc-accent)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag size={12} />
          <span>{isAddingToCart ? "..." : inCart ? "+ Add more" : "Add"}</span>
        </button>
        <button
          type="button"
          disabled={Boolean(quickActionId)}
          onClick={() => void quickOrder(item, true)}
          className="inline-flex items-center gap-1 rounded border border-[var(--mc-line)] bg-white px-2 py-1 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
        >
          <Zap size={12} />
          <span>{isBuyingNow ? "..." : "Buy"}</span>
        </button>
        <Link
          href={productHref(item)}
          className="text-xs font-bold text-[var(--mc-muted)] hover:text-[var(--mc-accent)] hover:underline"
        >
          Details
        </Link>
      </div>
    );
  }
  if (expandableEligible) {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {inCart ? (
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors shadow-2xs"
          >
            <Check size={12} className="text-emerald-700" />
            <span>In basket · View &rarr;</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
          className="inline-flex items-center gap-1 rounded bg-[var(--mc-accent)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-xs"
        >
          <span>{isExpanded ? "Close" : inCart ? "Order more" : "Order now"}</span>
          <ArrowRight
            size={12}
            className={isExpanded ? "rotate-90 transition-transform" : "transition-transform"}
          />
        </button>
        <Link
          href={productHref(item)}
          className="text-xs font-bold text-[var(--mc-muted)] hover:text-[var(--mc-accent)] hover:underline"
        >
          Details
        </Link>
      </div>
    );
  }
  return (
    <Link
      href={productHref(item)}
      className="inline-flex items-center gap-1 rounded bg-[var(--mc-accent)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-xs whitespace-nowrap"
    >
      <span>Configure</span>
      <ArrowRight size={12} />
    </Link>
  );
}

function MiniCart({
  items,
  busyId,
  onRemove,
  onQuantityChange,
  onReplaceArtwork,
}: {
  items: MiniCartItem[];
  busyId: string | null;
  onRemove: (id: string) => void;
  onQuantityChange: (item: MiniCartItem, direction: "UP" | "DOWN") => void;
  onReplaceArtwork: (item: MiniCartItem, artworkFile: MiniCartArtworkFile, file: File) => void;
}) {
  const total = items.reduce((sum, item) => sum + Number(item.calculatedAmount ?? 0), 0);
  return (
    <aside className="mt-5 h-fit overflow-hidden rounded-lg border border-[var(--mc-line)] bg-white xl:sticky xl:top-24">
      <div className="flex items-center gap-2 bg-[#1e2430] px-4 py-3 text-base font-bold text-white">
        <ShoppingBag size={18} />
        Basket {items.length ? `(${items.length})` : ""}
      </div>
      {items.length ? (
        <>
          <div className="max-h-[34rem] divide-y divide-[var(--mc-line)] overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-[15px] font-bold text-[var(--mc-ink)]">{item.name}</p>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-full border border-[var(--mc-line)] bg-white">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => onQuantityChange(item, "DOWN")}
                      className="grid size-7 place-items-center text-sm hover:bg-[var(--mc-surface)] disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-14 text-center text-sm font-bold text-[var(--mc-ink)]">{item.quantity.toLocaleString("en-IN")}</span>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => onQuantityChange(item, "UP")}
                      className="grid size-7 place-items-center text-sm hover:bg-[var(--mc-surface)] disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[15px] font-bold text-[var(--mc-accent-dark)]">{item.calculatedAmount ? formatInr(item.calculatedAmount) : "-"}</p>
                </div>

                {item.artworkFiles.length ? (
                  <div className="mt-2.5 space-y-1.5">
                    {item.artworkFiles.map((artworkFile) => (
                      <ArtworkReplaceRow key={artworkFile.id} item={item} artworkFile={artworkFile} busy={busyId === item.id} onReplace={onReplaceArtwork} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--mc-line)] p-4">
            <p className="flex items-center justify-between text-base font-bold text-[var(--mc-ink)]">
              <span>Total</span>
              <span>{formatInr(total.toFixed(2))}</span>
            </p>
            <Link
              href="/checkout"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors"
            >
              Checkout <ArrowRight size={15} />
            </Link>
            <Link
              href="/cart"
              className="mt-2 flex w-full items-center justify-center text-xs font-bold text-[var(--mc-muted)] underline hover:text-[var(--mc-accent)]"
            >
              View full basket
            </Link>
          </div>
        </>
      ) : (
        <p className="p-4 text-sm text-[var(--mc-muted)]">Nothing added yet. Use &ldquo;Order now&rdquo; on any product to add it here.</p>
      )}
    </aside>
  );
}

function ArtworkReplaceRow({
  item,
  artworkFile,
  busy,
  onReplace,
}: {
  item: MiniCartItem;
  artworkFile: MiniCartArtworkFile;
  busy: boolean;
  onReplace: (item: MiniCartItem, artworkFile: MiniCartArtworkFile, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-2 rounded-full border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3 py-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".cdr"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) onReplace(item, artworkFile, file);
        }}
      />
      <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-[var(--mc-ink)]">
        <FileUp size={12} className="shrink-0 text-[var(--mc-muted)]" />
        <span className="truncate">{artworkFile.fileName}</span>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="shrink-0 text-xs font-bold text-[var(--mc-accent)] hover:underline disabled:opacity-50"
      >
        Re-upload
      </button>
    </div>
  );
}

function ProductSpecification({ item, isLoggedIn = false }: { item: Product; isLoggedIn?: boolean }) {
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
    <div className="min-w-0 space-y-1.5 text-[13px] leading-5 text-slate-600">
      <p className="text-xs font-bold uppercase text-slate-400 xl:hidden">Specification</p>
      {isPremium ? <p className="font-semibold text-[#1e4da1]">Corner cut included by default.</p> : null}
      {specText ? <p className="line-clamp-2 text-sm font-medium text-slate-900">{specText}</p> : null}
      {item.productSize ? (
        <p>
          <strong className="font-semibold text-slate-900">Size:</strong> {item.productSize}
        </p>
      ) : null}
      {artwork ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {artworkLabel ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#d5e3f1] bg-[#f0f5fa] px-2 py-0.5 text-[11px] font-semibold text-[#1b365d]">
              <FileUp size={12} />
              {artworkLabel}
            </span>
          ) : null}
          {artwork.fullDesign ? (
            <span className="rounded-md border border-slate-200 bg-[#faf8f5] px-2 py-0.5 text-[11px] text-slate-700">
              <strong className="font-semibold text-slate-900">Full:</strong> {artwork.fullDesign}
            </span>
          ) : null}
          {artwork.finalSize ? (
            <span className="rounded-md border border-slate-200 bg-[#faf8f5] px-2 py-0.5 text-[11px] text-slate-700">
              <strong className="font-semibold text-slate-900">Final:</strong> {artwork.finalSize}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.addons && item.addons.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {item.addons.map((ad) => (
            <span
              key={ad.id}
              className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#1e3a5f] border border-[#bfd3f5]"
            >
              +{ad.name}{isLoggedIn && ad.price && Number(ad.price) > 0 ? ` (+₹${Number(ad.price)})` : ""}
            </span>
          ))}
        </div>
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
function InlineOrderPanel({ item, onAdded, customerStateCode }: { item: Product; onAdded: () => void; customerStateCode?: string | null }) {
  const router = useRouter();
  const [details, setDetails] = useState<ProductDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1000);

  const isSticker =
    item.category?.slug === "sticker" ||
    item.slug.includes("sticker") ||
    item.slug.startsWith("sticker-") ||
    item.slug.startsWith("avery-sticker");

  const isSquareInch =
    Boolean(item.isSquareInch) ||
    isSticker ||
    item.category?.slug === "art-card" ||
    item.slug.includes("art-card") ||
    Boolean(details?.pricingRules?.some((r) => r.ruleType === "PER_SQ_INCH"));

  const isArtCardBoth = item.slug.includes("art-card-both-side");

  // Custom dimension fields
  const [width, setWidth] = useState(isArtCardBoth ? "10" : "2");
  const [height, setHeight] = useState(isArtCardBoth ? "5" : "2");
  const [bladeCount, setBladeCount] = useState("0");

  const [artworks, setArtworks] = useState<Record<string, UploadedArtwork>>({});
  const [submitting, setSubmitting] = useState<"cart" | "buy" | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const minQuantity = isSpecialQuantityProduct(item.category?.slug ?? null, item.slug) ? 500 : 1000;

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
          setQuantity(conditionQuantity ? Number(conditionQuantity) : normalizeProductQuantity(undefined, item.category?.slug ?? null, item.slug).normalizedQuantity);
        }
        if (data.addons?.length) {
          const scoped = rule ? data.addons.filter((addon) => addon.pricingRuleId === rule.id) : [];
          const list = scoped.length ? scoped : data.addons.filter((addon) => addon.pricingRuleId === null);
          setSelectedAddonIds(list.filter((addon) => addon.isDefault).map((addon) => addon.addonId));
        }
      })
      .catch((caught) => { if (active) setLoadError(caught instanceof Error ? caught.message : "Could not load this product's options"); })
      .finally(() => { if (active) setLoadingDetails(false); });
    return () => { active = false; };
  }, [item.category?.slug, item.id, item.slug]);

  const availableAddons = useMemo(() => {
    if (!details?.addons?.length) return [];
    const scoped = details.addons.filter((addon) => addon.pricingRuleId === ruleId);
    return scoped.length ? scoped : details.addons.filter((addon) => addon.pricingRuleId === null);
  }, [details?.addons, ruleId]);

  const stickerArea = useMemo(() => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return (w * h).toFixed(2);
    }
    return null;
  }, [width, height]);

  const activeRule = details?.pricingRules.find((r) => r.id === ruleId) ?? details?.pricingRules[0];
  const minimumArea = (activeRule?.priceFormula as any)?.minimumArea
    ? Number((activeRule?.priceFormula as any).minimumArea)
    : isArtCardBoth
    ? 50
    : null;
  const bladeCharge = Number((activeRule?.priceFormula as any)?.bladeCharge || (activeRule?.conditions as any)?.bladeCharge || 0);

  useEffect(() => {
    if (!details || !ruleId) return;
    const controller = new AbortController();
    setCalculating(true);
    const timer = setTimeout(() => {
      const options: Record<string, string> = { pricingRuleId: ruleId };
      if (isSquareInch) {
        if (parseFloat(width) > 0) options.width = String(width);
        if (parseFloat(height) > 0) options.height = String(height);
        if (parseInt(bladeCount, 10) > 0) options.bladeCount = String(bladeCount);
      }
      fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.id,
          quantity,
          options,
          addonIds: selectedAddonIds,
        }),
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((payload) => {
          if (payload?.success && payload?.data?.calculatedAmount) {
            setEstimatedPrice(payload.data.calculatedAmount);
            setSubmitError("");
          } else if (payload?.error?.message) {
            setEstimatedPrice(null);
            setSubmitError(payload.error.message);
          }
        })
        .catch(() => {})
        .finally(() => setCalculating(false));
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [details, isSquareInch, item.id, quantity, ruleId, selectedAddonIds, width, height, bladeCount]);

  const requirement = details?.artworkRequirements.find((row) => row.pricingRuleId === ruleId)
    ?? details?.artworkRequirements.find((row) => !row.pricingRuleId)
    ?? details?.artworkRequirements.find((row) => (row as { scopeKey?: string }).scopeKey === "PRODUCT")
    ?? details?.artworkRequirements[0]
    ?? null;
  const slots = requirement?.slots?.length ? requirement.slots : [];
  const requiredKeys = requirement?.artworkRequired ? (slots.length ? slots.filter((slot) => slot.required).map((slot) => slot.slotKey) : ["MAIN"]) : [];
  const artworkReady = requiredKeys.every((key) => Boolean(artworks[key]));

  async function submit(checkout: boolean) {
    if (quantity <= 0) {
      setSubmitError("Quantity must be a positive number.");
      return;
    }
    if (quantity > MAX_ORDER_QUANTITY) {
      setSubmitError("Direct orders above 25,000 units require a custom quotation.");
      return;
    }
    if (isSquareInch) {
      const w = parseFloat(width);
      const h = parseFloat(height);
      if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
        setSubmitError("Please enter valid positive width and height in inches.");
        return;
      }
      if (minimumArea && (w * h) < minimumArea) {
        setSubmitError(`This product requires a minimum area of ${minimumArea} sq. inches (${(w * h).toFixed(1)} sq. in entered).`);
        return;
      }
    }
    setSubmitting(checkout ? "buy" : "cart");
    setSubmitError("");
    const artworkIds = Object.fromEntries(Object.entries(artworks).map(([slotKey, artwork]) => [slotKey, artwork.id]));
    const configuration: Record<string, unknown> = {
      quantity: String(quantity),
      pricingRuleId: ruleId,
      addonIds: selectedAddonIds,
      ...(isSquareInch ? { width: String(width), height: String(height), bladeCount: String(bladeCount || "0") } : {}),
      ...(Object.keys(artworkIds).length ? { artworkIds } : {}),
      ...(artworkIds.MAIN ? { artworkId: artworkIds.MAIN } : {}),
    };
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.id, quantity, configuration, kind: "PURCHASE" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not add this product to your basket");
      if (checkout) { router.push("/checkout"); return; }
      showToast.success(
        "Added to basket successfully!",
        `${item.name} (${quantity.toLocaleString("en-IN")} pcs) added to your basket.`,
        { action: { label: "View basket →", href: "/cart" } }
      );
      onAdded();
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Could not add this product to your basket");
    } finally {
      setSubmitting(null);
    }
  }

  if (loadingDetails) return <p className="py-4 text-sm text-[var(--mc-muted)]">Loading order options&hellip;</p>;
  if (!details || loadError) return <p className="py-4 text-sm font-semibold text-[#a53025]">{loadError || "Could not load options."}</p>;

  const hasMultipleRules = !isSquareInch && (details.pricingRules?.length ?? 0) > 1;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Quick Order &amp; Configuration</span>
        </div>
        <Link
          href={`/catalog/${item.slug}`}
          className="text-xs font-bold text-[var(--mc-accent)] hover:underline inline-flex items-center gap-1"
        >
          <span>Open full product page</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Main Options Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Size / Dimensions (takes 2 cols for stickers, art cards or single-rule items) */}
        {isSquareInch ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                {isSticker ? "Sticker Dimensions" : "Dimensions (Width × Height)"}
              </span>
              {stickerArea ? (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                  minimumArea && parseFloat(stickerArea) < minimumArea
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "text-[var(--mc-accent-dark)] bg-blue-50 border-blue-200"
                }`}>
                  {minimumArea && parseFloat(stickerArea) < minimumArea
                    ? `Area: ${stickerArea} sq.in (Min ${minimumArea} sq.in)`
                    : `Total Area: ${stickerArea} sq.in / pc`}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Width (in inches)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="100"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full h-11 rounded-lg border border-slate-300 px-3.5 pr-10 text-sm sm:text-base font-bold text-slate-900 focus:border-[var(--mc-accent)] focus:ring-1 focus:ring-[var(--mc-accent)] outline-none"
                    placeholder={isArtCardBoth ? "10" : "2"}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">in</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Height (in inches)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="100"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full h-11 rounded-lg border border-slate-300 px-3.5 pr-10 text-sm sm:text-base font-bold text-slate-900 focus:border-[var(--mc-accent)] focus:ring-1 focus:ring-[var(--mc-accent)] outline-none"
                    placeholder={isArtCardBoth ? "5" : "2"}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">in</span>
                </div>
              </div>
            </div>
            {bladeCharge > 0 ? (
              <div className="pt-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Half Blades (₹{bladeCharge} / blade)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={bladeCount}
                  onChange={(e) => setBladeCount(e.target.value)}
                  className="w-full sm:w-48 h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 focus:border-[var(--mc-accent)] outline-none"
                />
              </div>
            ) : null}
            <p className="text-[11px] text-slate-500">
              {minimumArea
                ? `Enter width & height in inches (minimum ${minimumArea} sq. inches required). Calculated live.`
                : "Enter custom width & height in inches. Calculated live per square inch."}
            </p>
          </div>
        ) : (
          <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 ${!hasMultipleRules ? "sm:col-span-2 lg:col-span-2" : ""}`}>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">Product Size</span>
            <div className="flex items-center h-11 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800">
              {item.productSize || item.listingSpecification || "Standard Size (3.5 × 2 in)"}
            </div>
            <p className="text-[11px] text-slate-500">Standard offset print production die cut</p>
          </div>
        )}

        {/* 2. Paper Stock / Printing Rule - ONLY shown if multiple options exist */}
        {hasMultipleRules ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">Paper Stock &amp; Print</span>
            <select
              value={ruleId ?? ""}
              onChange={(e) => setRuleId(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-[var(--mc-accent)] outline-none"
            >
              {details.pricingRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">Select printing specification</p>
          </div>
        ) : null}

        {/* 3. Quantity Stepper */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Quantity</span>
            <span className="text-[11px] font-semibold text-slate-500">min {minQuantity.toLocaleString("en-IN")} pcs</span>
          </div>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white h-11 overflow-hidden">
            <button
              type="button"
              disabled={quantity <= minQuantity}
              onClick={() =>
                setQuantity((current) =>
                  stepProductQuantity(current, "DOWN", item.category?.slug ?? null, item.slug)
                )
              }
              className="w-11 h-full flex items-center justify-center text-base font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex-1 text-center text-sm font-bold text-slate-900">
              {quantity.toLocaleString("en-IN")} pcs
            </span>
            <button
              type="button"
              disabled={quantity >= MAX_ORDER_QUANTITY}
              onClick={() =>
                setQuantity((current) =>
                  stepProductQuantity(current, "UP", item.category?.slug ?? null, item.slug)
                )
              }
              className="w-11 h-full flex items-center justify-center text-base font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Max limit: 25,000 units</p>
        </div>

        {/* 4. Live Rate & Estimated Total */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">Total Rate</span>
          <div>
            <div className="text-2xl font-black text-[var(--mc-ink)]">
              {calculating ? "Calculating..." : estimatedPrice ? formatInr(estimatedPrice) : item.priceLabel || "-"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>B2B Wholesale Rate</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400">Includes packaging &amp; standard lead time</span>
        </div>
      </div>

      {/* Add-ons Row */}
      {availableAddons.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">Available Finishing / Add-ons</span>
          <div className="flex flex-wrap gap-2.5">
            {availableAddons.map((addon) => {
              const isChecked = selectedAddonIds.includes(addon.addonId);
              return (
                <label
                  key={addon.addonId}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium cursor-pointer select-none transition-colors ${
                    isChecked
                      ? "border-[var(--mc-accent)] bg-blue-50/80 text-[var(--mc-ink)] font-semibold shadow-2xs"
                      : "border-slate-300 bg-slate-50/60 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedAddonIds((current) =>
                        current.includes(addon.addonId)
                          ? current.filter((id) => id !== addon.addonId)
                          : [...current, addon.addonId]
                      );
                    }}
                    className="size-4 accent-[var(--mc-accent)] rounded"
                  />
                  <span>{addon.name}</span>
                  {addon.price && Number(addon.price) > 0 ? (
                    <span className="text-xs text-[var(--mc-accent-dark)] font-bold">
                      (+₹{addon.price})
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* CorelDRAW Artwork File Upload */}
      {requirement?.artworkRequired ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">
              CorelDRAW (.cdr) Production Artwork
            </span>
            <span className="text-[11px] font-medium text-slate-500">Required format: .CDR</span>
          </div>
          <div className="space-y-2">
            {slots.length ? (
              slots.map((slot) => (
                <ArtworkUploader
                  key={slot.id}
                  productId={item.id}
                  pricingRuleId={ruleId}
                  requirement={requirement}
                  slot={slot}
                  compact
                  configuration={{
                    quantity: String(quantity),
                    ...(isSquareInch ? { width, height } : {}),
                  }}
                  artwork={artworks[slot.slotKey] ?? null}
                  onUploaded={(uploaded) =>
                    setArtworks((current) => ({ ...current, [slot.slotKey]: uploaded }))
                  }
                  onRemoved={() =>
                    setArtworks((current) => {
                      const next = { ...current };
                      delete next[slot.slotKey];
                      return next;
                    })
                  }
                />
              ))
            ) : (
              <ArtworkUploader
                productId={item.id}
                pricingRuleId={ruleId}
                requirement={requirement}
                compact
                configuration={{
                  quantity: String(quantity),
                  ...(isSquareInch ? { width, height } : {}),
                }}
                artwork={artworks.MAIN ?? null}
                onUploaded={(uploaded) =>
                  setArtworks((current) => ({ ...current, MAIN: uploaded }))
                }
                onRemoved={() =>
                  setArtworks((current) => {
                    const next = { ...current };
                    delete next.MAIN;
                    return next;
                  })
                }
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Error / Warning Notice */}
      {submitError ? (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-[#a53025] border border-red-200">
          {submitError}
        </div>
      ) : null}
      {!artworkReady && requirement?.artworkRequired ? (
        <div className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800 border border-amber-200">
          Please upload your CorelDRAW (.cdr) artwork file above to enable adding to basket.
        </div>
      ) : null}

      {isOutsideGujRaj(customerStateCode) ? (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900">
          <Truck className="size-4 shrink-0 text-blue-600" />
          <span>Courier charge will be applicable extra as per weight per kg</span>
        </div>
      ) : null}

      {/* Bottom Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/90">
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-900">{quantity.toLocaleString("en-IN")} pcs</span>
          {isSquareInch && stickerArea ? <> &bull; <span className="font-semibold">{width}&Prime; &times; {height}&Prime; ({stickerArea} sq.in)</span></> : null}
          {estimatedPrice ? <> &bull; <span className="font-bold text-[var(--mc-accent-dark)]">{formatInr(estimatedPrice)}</span></> : null}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={!artworkReady || submitting !== null || quantity <= 0}
            onClick={() => void submit(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--mc-accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <ShoppingBag size={14} />
            <span>{submitting === "cart" ? "Adding..." : "Add to basket"}</span>
          </button>
          <button
            type="button"
            disabled={!artworkReady || submitting !== null || quantity <= 0}
            onClick={() => void submit(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <Zap size={14} />
            <span>{submitting === "buy" ? "Starting..." : "Buy now"}</span>
          </button>
        </div>
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
