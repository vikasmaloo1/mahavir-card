"use client";

import Link from "next/link";
import { ArrowRight, Check, FileText, Loader2, MapPinOff, Minus, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatInr } from "@/lib/formatting";
import { normalizeProductQuantity, stepProductQuantity } from "@/lib/quantity-helper";
import { BackButton } from "@/components/back-button";
import { cachedFetchJson } from "@/lib/client-fetch-cache";
import { RequirementQuoteModal, type RequirementContext } from "@/components/requirement-quote-modal";

type QuoteBasketItem = {
  id: string;
  quantity: number;
  jobName: string | null;
  calculatedAmount: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    quoteable: boolean;
    categorySlug?: string;
  };
  pricingSnapshot: {
    applicableRule?: string | null;
    priceBeforeTax?: string | null;
    grandTotal?: string | null;
  };
};

type CatalogQuoteProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  listingSpecification: string | null;
  productSize: string | null;
  priceLabel: string;
  category?: { name: string; slug: string } | null;
  categorySlug?: string;
  quoteable: boolean;
  orderable: boolean;
};

export function QuoteFlow() {
  const [basketItems, setBasketItems] = useState<QuoteBasketItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogQuoteProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ contactName: "", email: "", phone: "", companyName: "", notes: "" });
  const [error, setError] = useState("");
  const [loadingBasket, setLoadingBasket] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [requirementContext, setRequirementContext] = useState<RequirementContext>({});

  function openRequirementModal(context: RequirementContext) {
    setRequirementContext(context);
    setIsRequirementModalOpen(true);
  }

  const loadAccount = useCallback(async () => {
    try {
      const { payload: account } = await cachedFetchJson<{ success: boolean; data: { customer?: { contactName?: string; phone?: string; companyName?: string }; user: { name: string; email: string; phoneNumber?: string | null } } }>("/api/account/summary");
      if (account?.success) {
        setForm((current) => ({
          ...current,
          contactName: account.data.customer?.contactName ?? account.data.user.name ?? "",
          email: account.data.user.email ?? "",
          phone: account.data.customer?.phone ?? account.data.user.phoneNumber ?? "",
          companyName: account.data.customer?.companyName ?? "",
        }));
      }
    } catch {
      // Ignored
    }
  }, []);

  const loadBasket = useCallback(async () => {
    try {
      const cartResponse = await fetch("/api/cart?kind=QUOTE", { cache: "no-store" });
      const cartPayload = await cartResponse.json();
      if (cartResponse.status === 401) throw new Error("Sign in to view your quote basket.");
      if (!cartResponse.ok || !cartPayload.success) throw new Error(cartPayload.error?.message ?? "Could not load your quote basket");
      setBasketItems(cartPayload.data.items || []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your quote basket");
    } finally {
      setLoadingBasket(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/products?quoteable=true&limit=50", { cache: "no-store" });
      const payload = await res.json();
      if (payload.success) {
        const productsList: CatalogQuoteProduct[] = payload.data.items || [];
        setCatalogProducts(productsList);
        const initialQuantities: Record<string, number> = {};
        for (const p of productsList) {
          const categorySlug = p.category?.slug || p.categorySlug;
          initialQuantities[p.id] = normalizeProductQuantity(1000, categorySlug, p.slug).normalizedQuantity;
        }
        setProductQuantities(initialQuantities);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccount();
      void loadBasket();
      void loadCatalog();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccount, loadBasket, loadCatalog]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return catalogProducts;
    const q = searchQuery.toLowerCase();
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
        (p.listingSpecification && p.listingSpecification.toLowerCase().includes(q))
    );
  }, [catalogProducts, searchQuery]);

  function handleProductQuantityStep(productId: string, direction: "UP" | "DOWN", categorySlug?: string, productSlug?: string) {
    setProductQuantities((prev) => {
      const current = prev[productId] || 1000;
      const next = stepProductQuantity(current, direction, categorySlug, productSlug);
      return { ...prev, [productId]: next };
    });
  }

  function handleProductQuantityInput(productId: string, rawValue: string, categorySlug?: string, productSlug?: string) {
    const val = parseInt(rawValue, 10);
    if (isNaN(val) || val <= 0) {
      setProductQuantities((prev) => ({ ...prev, [productId]: 1000 }));
      return;
    }
    const normalized = normalizeProductQuantity(val, categorySlug, productSlug).normalizedQuantity;
    setProductQuantities((prev) => ({ ...prev, [productId]: normalized }));
  }

  async function handleQuickAdd(product: CatalogQuoteProduct) {
    const categorySlug = product.category?.slug || product.categorySlug;
    const qty = productQuantities[product.id] || normalizeProductQuantity(1000, categorySlug, product.slug).normalizedQuantity;
    setBusyId(`add-${product.id}`);
    setError("");

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "QUOTE",
          productId: product.id,
          quantity: qty,
          configuration: { quantity: String(qty) },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not add product to quote");
      }
      setAddedAnimationId(product.id);
      setTimeout(() => setAddedAnimationId(null), 1800);
      await loadBasket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add product to quote");
    } finally {
      setBusyId("");
    }
  }

  async function updateBasketItemQty(item: QuoteBasketItem, direction: "UP" | "DOWN") {
    const categorySlug = item.product.categorySlug;
    const nextQty = stepProductQuantity(item.quantity, direction, categorySlug, item.product.slug);
    if (nextQty === item.quantity) return;

    setBusyId(item.id);
    try {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQty }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) setError(payload?.error?.message ?? "Could not update this quote item");
      else await loadBasket();
    } catch {
      setError("Failed to update quantity");
    } finally {
      setBusyId("");
    }
  }

  async function removeBasketItem(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/cart/items/${id}`, { method: "DELETE" });
    if (response.ok) await loadBasket();
    else setError("Could not remove this item");
    setBusyId("");
  }

  async function clearBasket() {
    setBusyId("all");
    const response = await fetch("/api/cart?kind=QUOTE", { method: "DELETE" });
    if (response.ok) await loadBasket();
    else setError("Could not clear your quote basket");
    setBusyId("");
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusyId("submit");
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error?.message ?? "We could not submit your request.");
    } else {
      setQuoteNumber(payload.data.quoteNumber);
      setBasketItems([]);
    }
    setBusyId("");
  }

  if (quoteNumber) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#eaf4eb] text-[#207a3c]">
          <Check size={36} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#162237]">Quote Request {quoteNumber} Received!</h1>
        <p className="mt-2 text-base text-[#52647e]">
          Our production estimation team will review your specifications and issue a formal quote snapshot with final rates.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/account" className="inline-flex items-center gap-2 rounded-full bg-[#2457b8] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a4494]">
            View your quotes <ArrowRight size={16} />
          </Link>
          <Link href="/products" className="inline-flex items-center gap-2 rounded-full border border-[#c9d2df] bg-white px-6 py-3 text-sm font-bold text-[#263753] hover:bg-[#f4f7fb]">
            Continue browsing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton fallbackHref="/products" label="Back to products" />
          <h1 className="mt-2 text-3xl font-bold text-[#162237]">Quote Request Workspace</h1>
          <p className="mt-1 text-[15px] text-[#607089]">
            Add custom print products directly into your quote request. No artwork required to submit.
          </p>
        </div>
        {basketItems.length ? (
          <button
            type="button"
            onClick={() => void clearBasket()}
            disabled={Boolean(busyId)}
            className="text-sm font-semibold text-[#8b2f24] hover:underline"
          >
            Clear quote basket
          </button>
        ) : null}
      </div>

      {/* Escape hatches — visible up front, before the customer even opens the basket or product list */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openRequirementModal({ mode: "SEARCH_FALLBACK", searchQuery })}
          className="inline-flex items-center gap-3 rounded-xl border border-dashed border-[#b8cae6] bg-[#fbfcfe] px-5 py-4 text-left font-semibold text-[#2457b8] hover:border-[#2457b8] hover:bg-[#f4f8ff] transition-colors"
        >
          <Sparkles size={22} className="shrink-0" />
          <span className="text-[15px] leading-snug">Can&apos;t find what you&apos;re looking for? <span className="block font-bold">Share your requirement</span></span>
        </button>
        <button
          type="button"
          onClick={() => openRequirementModal({ mode: "STATE_UNAVAILABLE" })}
          className="inline-flex items-center gap-3 rounded-xl border border-dashed border-[#b8cae6] bg-[#fbfcfe] px-5 py-4 text-left font-semibold text-[#2457b8] hover:border-[#2457b8] hover:bg-[#f4f8ff] transition-colors"
        >
          <MapPinOff size={22} className="shrink-0" />
          <span className="text-[15px] leading-snug">Not available in your state? <span className="block font-bold">Request delivery quote</span></span>
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Main Section */}
        <section className="space-y-8">
          {/* Active Quote Basket */}
          <div className="rounded-xl border border-[#cfd8e8] bg-white p-5 shadow-[0_4px_16px_rgba(16,33,63,0.04)]">
            <div className="flex items-center justify-between border-b border-[#dfe5ef] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#162237]">Your Quote Basket</h2>
                <p className="text-xs text-[#607089]">{basketItems.length} item{basketItems.length === 1 ? "" : "s"} queued for quotation</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loadingBasket ? (
                <div className="py-6 text-center text-sm text-[#607089]">Loading quote items...</div>
              ) : basketItems.length ? (
                basketItems.map((item) => (
                  <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#e2e7ef] bg-[#fcfdfe] p-4 transition-all hover:border-[#b8cae6]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#2457b8]" />
                        <h3 className="font-bold text-[#162237]">{item.product.name}</h3>
                      </div>
                      <p className="mt-1 text-xs text-[#607089]">
                        {item.pricingSnapshot.applicableRule ?? "Custom quotation"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-[#c9d2df] bg-white">
                        <button
                          type="button"
                          onClick={() => void updateBasketItemQty(item, "DOWN")}
                          disabled={busyId === item.id || item.quantity <= 500}
                          className="grid size-8 place-items-center hover:bg-[#f3f6fa] disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-14 text-center text-sm font-bold text-[#162237]">
                          {item.quantity.toLocaleString("en-IN")}
                        </span>
                        <button
                          type="button"
                          onClick={() => void updateBasketItemQty(item, "UP")}
                          disabled={busyId === item.id}
                          className="grid size-8 place-items-center hover:bg-[#f3f6fa] disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="text-right">
                        {item.calculatedAmount ? (
                          <span className="block text-sm font-bold text-[#2457b8]">
                            Indicative {formatInr(item.calculatedAmount)}
                          </span>
                        ) : (
                          <span className="block text-xs font-semibold text-[#607089]">
                            Price confirmed in quote
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeBasketItem(item.id)}
                        disabled={busyId === item.id}
                        className="grid size-8 place-items-center text-[#9b2525] hover:bg-[#fff4f4] rounded"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[#cfd8e8] bg-[#fbfcfe] p-6 text-center">
                  <p className="text-sm font-medium text-[#607089]">Your quote basket is currently empty.</p>
                  <p className="mt-1 text-xs text-[#8a99ad]">Select items from the list below to add them directly.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick-Add Product Workspace */}
          <div className="rounded-xl border border-[#cfd8e8] bg-white p-5 shadow-[0_4px_16px_rgba(16,33,63,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ef] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#162237]">Available Quote Products</h2>
                <p className="text-xs text-[#607089]">Pick a product, adjust quantity, and add directly to your quote</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-3 text-[#7b8a9f]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-[#c9d2df] bg-[#f8fafc] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2457b8] focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-4 divide-y divide-[#edf1f7]">
              {loadingProducts ? (
                <div className="py-8 text-center text-sm text-[#607089]">Loading catalog products...</div>
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => {
                  const categorySlug = product.category?.slug || product.categorySlug;
                  const currentQty = productQuantities[product.id] || normalizeProductQuantity(1000, categorySlug, product.slug).normalizedQuantity;
                  const isBusy = busyId === `add-${product.id}`;
                  const isJustAdded = addedAnimationId === product.id;

                  return (
                    <article key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 hover:bg-[#f9fafc] px-3 rounded-lg transition-colors border-b last:border-b-0 border-[#edf1f7]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[#edf2f8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#2457b8]">
                            {product.category?.name ?? "Commercial Print"}
                          </span>
                          <h3 className="text-[15px] font-bold text-[#162237]">{product.name}</h3>
                        </div>
                        {product.listingSpecification || product.shortDescription ? (
                          <p className="mt-1 text-xs text-[#607089] line-clamp-1">
                            {product.listingSpecification ?? product.shortDescription}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center rounded-lg border border-[#c9d2df] bg-white">
                          <button
                            type="button"
                            onClick={() => handleProductQuantityStep(product.id, "DOWN", categorySlug, product.slug)}
                            className="grid size-8 place-items-center hover:bg-[#f3f6fa] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={currentQty}
                            onChange={(e) => handleProductQuantityInput(product.id, e.target.value, categorySlug, product.slug)}
                            className="w-14 text-center text-sm font-bold text-[#162237] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleProductQuantityStep(product.id, "UP", categorySlug, product.slug)}
                            className="grid size-8 place-items-center hover:bg-[#f3f6fa] transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={() => void handleQuickAdd(product)}
                          disabled={isBusy}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                            isJustAdded
                              ? "bg-[#207a3c] text-white"
                              : "bg-[#2457b8] text-white hover:bg-[#1a4494]"
                          } disabled:opacity-50`}
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isJustAdded ? (
                            <>
                              <Check size={14} /> Added
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Add to quote
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-[#607089]">
                  <p>No quoteable products found matching &ldquo;{searchQuery}&rdquo;.</p>
                  <button
                    type="button"
                    onClick={() => openRequirementModal({ mode: "SEARCH_FALLBACK", searchQuery })}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2457b8] px-4 py-2 text-xs font-bold text-white hover:bg-[#1a4494] transition-colors"
                  >
                    <Sparkles size={14} /> Share your requirement instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sidebar: Contact & Submission Form */}
        <aside>
          <form
            onSubmit={submitQuote}
            className="sticky top-28 rounded-xl border border-[#cfd8e8] bg-white p-5 shadow-[0_4px_16px_rgba(16,33,63,0.04)]"
          >
            <h2 className="text-base font-bold text-[#162237]">Submit Quote Request</h2>
            <p className="mt-1 text-xs text-[#607089]">
              Provide your details and any special finishing or delivery notes.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#263753]">Contact Name *</span>
                <input
                  required
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-[#c9d2df] px-3 py-2.5 text-sm outline-none focus:border-[#2457b8]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#263753]">Email Address *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  readOnly
                  className="w-full rounded-lg border border-[#c9d2df] bg-[#f4f7fb] px-3 py-2.5 text-sm text-[#52647e] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#263753]">Phone Number *</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-[#c9d2df] px-3 py-2.5 text-sm outline-none focus:border-[#2457b8]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#263753]">Company Name (Optional)</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Business / Shop name"
                  className="w-full rounded-lg border border-[#c9d2df] px-3 py-2.5 text-sm outline-none focus:border-[#2457b8]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#263753]">Requirements &amp; Deadline</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any custom paper GSM, lamination, die-cutting, delivery date, etc."
                  rows={3}
                  className="w-full rounded-lg border border-[#c9d2df] px-3 py-2.5 text-sm outline-none focus:border-[#2457b8]"
                />
              </label>
            </div>

            {error ? (
              <div role="alert" className="mt-4 rounded-lg bg-[#fff4f4] p-3 text-xs font-medium text-[#9b2525]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!basketItems.length || Boolean(busyId)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2457b8] px-4 py-3.5 text-sm font-bold text-white shadow hover:bg-[#1a4494] disabled:cursor-not-allowed disabled:bg-[#9bb6e8]"
            >
              {busyId === "submit" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Submit quote request <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </aside>
      </div>

      <RequirementQuoteModal
        isOpen={isRequirementModalOpen}
        onClose={() => setIsRequirementModalOpen(false)}
        context={requirementContext}
      />
    </div>
  );
}
