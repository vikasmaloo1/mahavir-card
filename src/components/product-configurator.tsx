"use client";

import { ArrowRight, Check, Minus, Plus, ShoppingBag, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArtworkUploader, type ArtworkRequirement, type UploadedArtwork } from "@/components/artwork-uploader";
import { ProductImage } from "@/components/product-image";
import type { CatalogProduct } from "@/lib/catalog";
import { formatInr, formatRoundOff } from "@/lib/formatting";
import { commerceStates } from "@/lib/india-states";
import { isSpecialQuantityProduct, normalizeProductQuantity, stepProductQuantity } from "@/lib/quantity-helper";
import { RequirementQuoteModal, type RequirementContext } from "@/components/requirement-quote-modal";
import { cachedFetchJson } from "@/lib/client-fetch-cache";
import { showToast } from "@/components/toast-provider";

type PricingRule = { id: string; name: string; conditions: Record<string, unknown>; priceFormula: Record<string, unknown> };
type Addon = { addonId: string; pricingRuleId: string | null; name: string; description: string | null; price: string; isDefault: boolean };
type Delivery = { method: "PICKUP" | "LOCAL_DELIVERY" | "COURIER"; stateCode: string };
type Estimate = {
  calculatedAmount: string | null;
  productPrice?: string | null;
  blade?: { count: number; rate: string; amount: string } | null;
  addonTotal?: string;
  addons?: Array<{ addonId: string; name: string; price: string; pricingType: string }>;
  delivery?: { method: string | null; price: string };
  locationSurcharge?: { amount: string; label: string | null };
  taxAmount?: string;
  cgstAmount?: string;
  sgstAmount?: string;
  igstAmount?: string;
  taxJurisdictionState?: string | null;
  priceBeforeTax?: string | null;
  taxRate?: string | null;
  unroundedTotal?: string | null;
  roundOff?: string | null;
  warnings: string[];
  applicableRule?: string | null;
};
type ProductDetails = { addons: Addon[]; pricingRules: PricingRule[]; deliveryRules: Array<{ deliveryMethod: Delivery["method"]; stateCode: string; price: string }>; artworkRequirements: Array<ArtworkRequirement & { pricingRuleId: string | null }>; relatedProducts?: Array<{ id: string; name: string; slug: string; imageUrl: string | null }>; };
type CartKind = "PURCHASE" | "QUOTE";
type EditableCartItem = { id: string; quantity: number; jobName: string | null; configuration: Record<string, unknown> };

const money = formatInr;

function requirementFor(details: ProductDetails | null, ruleId: string | null) {
  if (!details?.artworkRequirements?.length) return null;
  return details.artworkRequirements.find((rule) => rule.pricingRuleId === ruleId)
      ?? details.artworkRequirements.find((rule) => !rule.pricingRuleId)
      ?? details.artworkRequirements.find((rule) => (rule as { scopeKey?: string }).scopeKey === "PRODUCT")
      ?? details.artworkRequirements[0]
      ?? null;
}

export function ProductConfigurator({ product, editItemId, editKind = "PURCHASE", templateName }: { product: CatalogProduct & { customerType?: "B2C" | "B2B" | null; priceLabel?: string }; editItemId?: string; editKind?: CartKind; templateName?: string }) {
  const router = useRouter();
  const defaults = useMemo(() => Object.fromEntries(product.configuration.map((field) => [field.id, field.defaultValue])), [product.configuration]);
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [detailsError, setDetailsError] = useState("");
  const [detailsVersion, setDetailsVersion] = useState(0);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<Delivery | undefined>();
  const [estimate, setEstimate] = useState<Estimate>({ calculatedAmount: null, warnings: [] });
  const [isCalculating, setIsCalculating] = useState(false);
  const [artworks, setArtworks] = useState<Record<string, UploadedArtwork>>({});
  const [status, setStatus] = useState<"idle" | "quote" | "cart">("idle");
  const [basketError, setBasketError] = useState("");
  const [basketSignInRequired, setBasketSignInRequired] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  // undefined = the profile lookup hasn't settled yet; null = settled, no saved state on file.
  const [profileStateCode, setProfileStateCode] = useState<string | null | undefined>(undefined);
  // Prefilled from a "Use this template" link (see design-templates-gallery.tsx) — a
  // starting-point reference only; the customer still uploads their own CDR artwork.
  const [jobName, setJobName] = useState(templateName ? `Based on template: ${templateName}` : "");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteContext, setQuoteContext] = useState<RequirementContext>({});
  const defaultQty = useMemo(() => isSpecialQuantityProduct(product.categorySlug, product.slug) ? 500 : 1000, [product.categorySlug, product.slug]);
  const rawEnteredQty = useMemo(() => {
    const raw = values.quantity ?? String(defaultQty);
    return Number(String(raw).replace(/[^0-9-]/g, ""));
  }, [defaultQty, values.quantity]);
  const isQuantityNegativeOrZero = isNaN(rawEnteredQty) || rawEnteredQty <= 0;
  const isQuantityAboveMax = rawEnteredQty > 25000;
  const quantity = useMemo(() => {
    if (isQuantityNegativeOrZero) return defaultQty;
    if (isQuantityAboveMax) return 25000;
    return normalizeProductQuantity(values.quantity || defaultQty, product.categorySlug, product.slug).normalizedQuantity;
  }, [defaultQty, isQuantityAboveMax, isQuantityNegativeOrZero, product.categorySlug, product.slug, values.quantity]);
  const requirement = requirementFor(details, selectedRuleId);
  const artworkSlots = requirement?.slots?.length ? requirement.slots : [];
  const requiredArtworkKeys = artworkSlots.length ? artworkSlots.filter((slot) => slot.required).map((slot) => slot.slotKey) : ["MAIN"];
  const artworkReady = !requirement?.artworkRequired || requiredArtworkKeys.every((key) => Boolean(artworks[key]));
  const directReady = product.orderable && Boolean(estimate.calculatedAmount) && estimate.warnings.length === 0 && artworkReady && !isQuantityAboveMax && !isQuantityNegativeOrZero;

  const blockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!details) return ["Loading product options\u2026"];
    if (isQuantityNegativeOrZero) reasons.push(`Quantity must be a positive number (minimum ${defaultQty.toLocaleString("en-IN")}).`);
    if (isQuantityAboveMax) reasons.push(`Direct online ordering is capped at 25,000 units (${rawEnteredQty.toLocaleString("en-IN")} pcs entered). Please request a custom quotation below.`);
    if (isCalculating) return ["Price is being calculated\u2026"];
    if (!estimate.calculatedAmount && estimate.warnings.length === 0 && !isQuantityAboveMax && !isQuantityNegativeOrZero) reasons.push("Price could not be calculated. Review your configuration.");
    if (estimate.warnings.length > 0) reasons.push(estimate.warnings[0]);
    if (requirement?.artworkRequired && !artworkReady) reasons.push("Upload your CDR artwork file to enable ordering.");
    return reasons;
  }, [details, isCalculating, estimate, requirement, artworkReady, isQuantityNegativeOrZero, isQuantityAboveMax, defaultQty, rawEnteredQty]);
  const configurationAddons = useMemo(() => {
    const scoped = details?.addons.filter((addon) => addon.pricingRuleId === selectedRuleId) ?? [];
    const available = scoped.length ? scoped : details?.addons.filter((addon) => addon.pricingRuleId === null) ?? [];
    return available.map((addon) => {
      const isCornerCut = addon.name.toLowerCase().includes("corner cut");
      const multiplier = isCornerCut ? Math.max(1, Math.ceil(quantity / 1000)) : 1;
      return {
        ...addon,
        displayPrice: Number(addon.price) * multiplier,
      };
    });
  }, [details?.addons, quantity, selectedRuleId]);

  const deliveryMethods = useMemo(
    () => [...new Set(details?.deliveryRules.map((rule) => rule.deliveryMethod) ?? [])],
    [details?.deliveryRules]
  );

  // Wait for the profile lookup to settle before fetching product details, so the delivery
  // default (which needs profileStateCode) is set correctly on the first pass instead of
  // fetching+configuring everything twice — once with a placeholder state, once for real.
  useEffect(() => {
    if (profileStateCode === undefined) return;
    let active = true;
    fetch(`/api/products/${product.id}`, { cache: "no-store" }).then(async (response) => ({ response, payload: await response.json().catch(() => null) })).then(({ response, payload }) => {
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Product options could not be loaded");
      if (!active) return;
      const next = payload.data as ProductDetails;
      setDetails(next);
      const initialRule = next.pricingRules[0];
      if (initialRule) {
        setSelectedRuleId(initialRule.id);
        const nextValues = { ...defaults };
        for (const [key, value] of Object.entries(initialRule.conditions ?? {})) nextValues[key] = String(value);
        setValues(nextValues);
        const scopedAddons = next.addons.filter((addon) => addon.pricingRuleId === initialRule.id);
        setAddonIds((scopedAddons.length ? scopedAddons : next.addons.filter((addon) => addon.pricingRuleId === null)).filter((addon) => addon.isDefault).map((addon) => addon.addonId));
      }
      const pickup = next.deliveryRules.find((rule) => rule.deliveryMethod === "PICKUP");
      const nonPickupMethods = [...new Set(next.deliveryRules.map((rule) => rule.deliveryMethod).filter((method) => method !== "PICKUP"))];
      if (pickup) setDelivery({ method: "PICKUP", stateCode: "*" });
      // Only one non-pickup delivery method: auto-select it instead of making the customer
      // choose from a single-option dropdown, defaulting the state to their saved profile state.
      else if (nonPickupMethods.length === 1) setDelivery({ method: nonPickupMethods[0], stateCode: profileStateCode ?? "GJ" });
    }).catch((caught) => { if (active) setDetailsError(caught instanceof Error ? caught.message : "Product options could not be loaded"); });
    return () => { active = false; };
  }, [defaults, detailsVersion, product.id, profileStateCode]);

  useEffect(() => {
    let active = true;
    cachedFetchJson<{ success: boolean; data: { customer?: { stateCode?: string | null } } }>("/api/account/profile").then(({ payload }) => {
      if (active) setProfileStateCode(payload?.success ? payload.data.customer?.stateCode ?? null : null);
    }).catch(() => { if (active) setProfileStateCode(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editItemId || !details) return;
    let active = true;
    fetch(`/api/cart?kind=${editKind}`, { cache: "no-store" }).then((response) => response.json()).then(async (payload) => {
      if (!active || !payload.success) return;
      const item = (payload.data.items as EditableCartItem[]).find((candidate) => candidate.id === editItemId);
      if (!item) { setBasketError("This basket item could not be found."); return; }
      const configuration = item.configuration;
      const ruleId = typeof configuration.pricingRuleId === "string" ? configuration.pricingRuleId : null;
      const selectedAddons = Array.isArray(configuration.addonIds) ? configuration.addonIds.filter((value): value is string => typeof value === "string") : [];
      const deliveryValue = configuration.delivery;
      const deliveryRecord = deliveryValue && typeof deliveryValue === "object" ? deliveryValue as Record<string, unknown> : null;
      const nextDelivery = deliveryRecord && typeof deliveryRecord.method === "string" ? { method: deliveryRecord.method as Delivery["method"], stateCode: typeof deliveryRecord.stateCode === "string" ? deliveryRecord.stateCode : "*" } : undefined;
      setSelectedRuleId(ruleId);
      setJobName(item.jobName ?? "");
      setAddonIds(selectedAddons);
      setDelivery(nextDelivery);
      setValues({ ...defaults, ...Object.fromEntries(Object.entries(configuration).filter(([, value]) => typeof value === "string").map(([key, value]) => [key, String(value)])), quantity: String(item.quantity) });
      const configuredArtworkIds = configuration.artworkIds && typeof configuration.artworkIds === "object" && !Array.isArray(configuration.artworkIds) ? configuration.artworkIds as Record<string, unknown> : {};
      if (typeof configuration.artworkId === "string" && !configuredArtworkIds.MAIN) configuredArtworkIds.MAIN = configuration.artworkId;
      const loaded = await Promise.all(Object.entries(configuredArtworkIds).filter((entry): entry is [string, string] => typeof entry[1] === "string").map(async ([slotKey, artworkId]) => {
        const artworkResponse = await fetch(`/api/artworks/${artworkId}`, { cache: "no-store" });
        const artworkPayload = await artworkResponse.json().catch(() => null);
        return artworkPayload?.success ? [slotKey, artworkPayload.data] as const : null;
      }));
      if (active) setArtworks(Object.fromEntries(loaded.filter((entry): entry is readonly [string, UploadedArtwork] => Boolean(entry))));
    }).catch(() => { if (active) setBasketError("This basket item could not be loaded."); });
    return () => { active = false; };
  }, [defaults, details, editItemId, editKind]);

  useEffect(() => {
    // Don't price a configuration that hasn't loaded yet — details resolves selectedRuleId,
    // addonIds and delivery together, so calculating before it arrives just schedules a request
    // that's guaranteed to be superseded (and, on a slow connection, may not even get a chance
    // to finish before the next real change cancels it).
    if (!details || !product.customerType) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsCalculating(true);
      fetch("/api/pricing/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, quantity, options: { ...values, ...(selectedRuleId ? { pricingRuleId: selectedRuleId } : {}) }, addonIds, delivery }), signal: controller.signal })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) setEstimate(result.data);
          else setEstimate({ calculatedAmount: null, warnings: [result.error?.message ?? "This price could not be calculated. Review the selected options."] });
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setEstimate({ calculatedAmount: null, warnings: ["Pricing is temporarily unavailable. Check your connection and retry."] });
        })
        .finally(() => { if (!controller.signal.aborted) setIsCalculating(false); });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [addonIds, delivery, details, product.id, quantity, selectedRuleId, values]);

  function update(id: string, value: string) { setValues((current) => ({ ...current, [id]: value })); setStatus("idle"); }
  function selectRule(id: string) {
    const rule = details?.pricingRules.find((item) => item.id === id);
    if (!rule) return;
    setSelectedRuleId(id); setArtworks({}); setStatus("idle");
    const scopedAddons = details?.addons.filter((addon) => addon.pricingRuleId === id) ?? [];
    const availableAddons = scopedAddons.length ? scopedAddons : details?.addons.filter((addon) => addon.pricingRuleId === null) ?? [];
    setAddonIds(availableAddons.filter((addon) => addon.isDefault).map((addon) => addon.addonId));
    setValues((current) => ({ ...current, ...Object.fromEntries(Object.entries(rule.conditions ?? {}).map(([key, value]) => [key, String(value)])) }));
  }
  function configuration() {
    const artworkIds = Object.fromEntries(Object.entries(artworks).map(([slotKey, artwork]) => [slotKey, artwork.id]));
    return { ...values, pricingRuleId: selectedRuleId, addonIds, ...(delivery ? { delivery } : {}), ...(Object.keys(artworkIds).length ? { artworkIds } : {}), ...(artworkIds.MAIN ? { artworkId: artworkIds.MAIN } : {}) };
  }
  async function add(kind: "PURCHASE" | "QUOTE", checkout = false) {
    if (isQuantityNegativeOrZero) {
      const err = `Quantity must be a positive number (minimum ${defaultQty.toLocaleString("en-IN")}).`;
      setBasketError(err);
      showToast.error("Invalid Quantity", err);
      return;
    }
    if (kind === "PURCHASE" && isQuantityAboveMax) {
      const err = `Direct online ordering is capped at 25,000 units (${rawEnteredQty.toLocaleString("en-IN")} pcs entered). Please request a quotation for bulk quantities.`;
      setBasketError(err);
      showToast.error("Bulk Quantity", err);
      return;
    }
    setIsAdding(true);
    try {
      const payloadBody = { productId: product.id, quantity, jobName: jobName || undefined, configuration: configuration() };
      const editing = Boolean(editItemId);
      const response = await fetch(editing ? `/api/cart/items/${editItemId}` : "/api/cart/items", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? payloadBody : { ...payloadBody, kind }) });
      const payload = await response.json();
      if (!response.ok) {
        setBasketSignInRequired(response.status === 401);
        const errMsg = response.status === 401 ? "Your session has expired. Sign in to save this item." : payload.error?.message ?? "Could not save this item.";
        setBasketError(errMsg);
        showToast.error("Could not add to basket", errMsg);
        return;
      }
      setStatus(kind === "QUOTE" ? "quote" : "cart");
      if (editing) {
        showToast.success("Basket item updated!", `${product.name} configuration saved.`);
        router.push(kind === "QUOTE" ? "/quote" : "/cart");
        return;
      }
      if (checkout) {
        router.push("/checkout");
        return;
      }
      setJustAdded(true);
      showToast.success(
        kind === "QUOTE" ? "Added to quote request!" : "Added to basket successfully!",
        `${product.name} (${Number(quantity).toLocaleString("en-IN")} pcs) added to your ${kind === "QUOTE" ? "quote request" : "basket"}.`,
        {
          action: {
            label: kind === "QUOTE" ? "View quotes →" : "View basket →",
            href: kind === "QUOTE" ? "/quote" : "/cart",
          },
        }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to add item.";
      setBasketError(errMsg);
      showToast.error("Error", errMsg);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#cfd8e8] bg-white shadow-[0_10px_30px_rgba(16,33,63,0.08)] mb-20 sm:mb-0">
        <div className="border-b border-[#d4e4f5] mc-section-blue px-4 py-2.5 sm:px-5 sm:py-3">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.13em] text-[#1b365d]">Configure your order</p>
        </div>
        <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
          {product.categorySlug === "premium-card" || product.slug.startsWith("premium-") ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#c7d7f3] bg-[#eef4ff] px-3 py-1.5 text-xs font-semibold text-[#1e4da1]">
              <span className="grid size-4 place-items-center rounded-full bg-[#2457b8] text-white text-[10px] font-bold">✓</span>
              <span>Corner cut included by default</span>
            </div>
          ) : null}

          {/* Job Name & Quantity side-by-side */}
          <div className="grid gap-2 sm:gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#263753]">Job name <span className="font-normal text-[#607089]">(optional)</span></span>
              <input value={jobName} onChange={(event) => setJobName(event.target.value)} maxLength={160} placeholder="e.g. Restaurant cards" className="w-full rounded-lg border border-[#c9d2df] px-3 py-1.5 text-sm outline-none focus:border-[#2457b8]" />
            </label>
            <label className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-[#263753]">Quantity</span>
                <span className="text-[11px] text-[#607089]">min {defaultQty.toLocaleString("en-IN")} &bull; max 25,000</span>
              </div>
              <div className="flex items-center rounded-lg border border-[#c9d2df] bg-white">
                <input
                  inputMode="numeric"
                  value={values.quantity ?? String(defaultQty)}
                  onChange={(event) => update("quantity", event.target.value)}
                  onBlur={() => update("quantity", String(quantity))}
                  className="min-w-0 flex-1 px-3 py-1.5 text-sm font-semibold outline-none"
                />
                <div className="flex gap-0.5 pr-1.5">
                  <button
                    type="button"
                    disabled={quantity <= defaultQty}
                    onClick={() => update("quantity", String(stepProductQuantity(values.quantity, "DOWN", product.categorySlug, product.slug)))}
                    className="grid size-7 place-items-center rounded-full border border-[#c9d2df] hover:bg-[#f3f6fa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={quantity >= 25000}
                    onClick={() => update("quantity", String(stepProductQuantity(values.quantity, "UP", product.categorySlug, product.slug)))}
                    className="grid size-7 place-items-center rounded-full border border-[#c9d2df] hover:bg-[#f3f6fa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              {isQuantityAboveMax ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 border border-amber-200">
                  <span>Quantity exceeds direct limit (25,000 pcs).</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteContext({
                        mode: "CUSTOM_REQUEST",
                        title: `Bulk Quote for ${product.name}`,
                        subtitle: `Request custom wholesale pricing for ${rawEnteredQty.toLocaleString("en-IN")} pcs.`,
                        productName: product.name,
                        category: product.category,
                        quantity: Math.max(25000, rawEnteredQty || 25000),
                        customerState: delivery?.stateCode && delivery.stateCode !== "*" ? delivery.stateCode : undefined,
                      });
                      setIsQuoteModalOpen(true);
                    }}
                    className="font-bold underline hover:text-amber-900 shrink-0"
                  >
                    Request Quote &rarr;
                  </button>
                </div>
              ) : isQuantityNegativeOrZero ? (
                <p className="mt-1 text-[11px] font-medium text-rose-600">Quantity must be at least {defaultQty.toLocaleString("en-IN")} pcs.</p>
              ) : null}
            </label>
          </div>

          {detailsError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#efc4be] bg-[#fff6f4] p-2.5 text-xs text-[#a53025]"><span>{detailsError}</span><button type="button" onClick={() => { setDetailsError(""); setDetailsVersion((version) => version + 1); }} className="rounded-full border border-[#d99d95] bg-white px-2.5 py-1 text-xs font-bold">Retry</button></div> : null}

          {/* Product configuration fields */}
          {product.configuration.filter((field) => field.id !== "quantity").length ? (
            <div className="grid gap-2 sm:gap-2.5 sm:grid-cols-2">
              {product.configuration.filter((field) => field.id !== "quantity").map((field) => (
                <label key={field.id} className="block">
                  <span className="mb-1 block text-xs font-bold text-[#263753]">{field.label}</span>
                  {field.type === "select" ? (
                    <select value={values[field.id] ?? field.defaultValue} onChange={(event) => update(field.id, event.target.value)} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-1.5 text-sm outline-none">
                      {field.options?.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <div>
                      <div className="flex rounded-lg border border-[#c9d2df]">
                        <input inputMode={field.type === "number" ? "decimal" : undefined} value={values[field.id] ?? field.defaultValue} onChange={(event) => update(field.id, event.target.value)} className="min-w-0 flex-1 px-3 py-1.5 text-sm outline-none" />
                        {field.suffix ? <span className="border-l border-[#c9d2df] px-2.5 py-1.5 text-xs text-[#607089] flex items-center">{field.suffix}</span> : null}
                      </div>
                      {field.id === "bladeCount" && product.customerType ? <span className="mt-0.5 block text-[11px] font-semibold text-[#2457b8]">Blade: ₹50 / blade</span> : null}
                    </div>
                  )}
                </label>
              ))}
            </div>
          ) : null}

          {/* Card stock and print & Delivery side-by-side */}
          {(details?.pricingRules.length && details.pricingRules.length > 1) || deliveryMethods.length > 1 ? (
            <div className="grid gap-2 sm:gap-2.5 sm:grid-cols-2">
              {details?.pricingRules.length && details.pricingRules.length > 1 ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-[#263753]">Card stock and print</span>
                  <select value={selectedRuleId ?? ""} onChange={(event) => selectRule(event.target.value)} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#2457b8]">
                    {details.pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                  </select>
                </label>
              ) : null}
              {deliveryMethods.length > 1 ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-[#263753]">Delivery</span>
                  <select value={delivery?.method ?? ""} onChange={(event) => setDelivery({ method: event.target.value as Delivery["method"], stateCode: event.target.value === "PICKUP" ? "*" : delivery?.stateCode === "*" ? (profileStateCode ?? "GJ") : delivery?.stateCode || (profileStateCode ?? "GJ") })} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-1.5 text-sm outline-none">
                    <option value="">Choose delivery</option>
                    {deliveryMethods.map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          {delivery?.method && delivery.method !== "PICKUP" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#263753]">Delivery state {profileStateCode && delivery.stateCode === profileStateCode ? <span className="font-normal text-[#8b9bb5]">(from your profile)</span> : null}</span>
              <select value={delivery.stateCode} onChange={(event) => setDelivery({ ...delivery, stateCode: event.target.value })} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-1.5 text-sm outline-none">
                {commerceStates.map(([code, state]) => <option key={code} value={code}>{state}</option>)}
              </select>
            </label>
          ) : null}

          {/* Add-ons in compact 2-column or list */}
          {configurationAddons.length ? (
            <div>
              <p className="mb-1.5 text-xs font-bold text-[#263753]">Add-ons</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {configurationAddons.map((addon) => (
                  <label key={addon.addonId} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#d9e0eb] p-2 text-xs hover:border-[#b6c4da] transition-colors bg-[#fafbfc]">
                    <div className="flex items-center gap-2 min-w-0">
                      <input type="checkbox" checked={addonIds.includes(addon.addonId)} onChange={() => setAddonIds((current) => current.includes(addon.addonId) ? current.filter((id) => id !== addon.addonId) : [...current, addon.addonId])} className="size-3.5 accent-[#2457b8] rounded shrink-0" />
                      <strong className="truncate font-semibold text-[#162237]">{addon.name}</strong>
                    </div>
                    {product.customerType && addon.displayPrice ? (
                      <span className="font-bold text-[#2457b8] shrink-0 text-xs">{money(addon.displayPrice)}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {/* Artwork uploader */}
          {requirement ? (
            <div className="space-y-2">
              {artworkSlots.length ? artworkSlots.map((slot, index) => <ArtworkUploader key={slot.id} productId={product.id} pricingRuleId={selectedRuleId} requirement={requirement} slot={slot} showRequirements={index === 0} configuration={values} artwork={artworks[slot.slotKey] ?? null} onUploaded={(uploaded) => setArtworks((current) => ({ ...current, [slot.slotKey]: uploaded }))} onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next[slot.slotKey]; return next; })} />) : <ArtworkUploader productId={product.id} pricingRuleId={selectedRuleId} requirement={requirement} configuration={values} artwork={artworks.MAIN ?? null} onUploaded={(uploaded) => setArtworks((current) => ({ ...current, MAIN: uploaded }))} onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next.MAIN; return next; })} />}
            </div>
          ) : null}

          {/* Grand total and breakdown */}
          <div className="border-t border-[#dfe5ef] pt-3">
            {!product.customerType ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-sm text-[#1e3a5f]">Pricing</span>
                  <Link
                    href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/catalog/${product.slug}`)}`}
                    className="font-bold text-[#1e3a5f] hover:underline"
                  >
                    Login to view price &rarr;
                  </Link>
                </div>
                <p className="mt-1.5 text-slate-600 leading-relaxed">
                  Sign in or create an account to view prices, calculate live totals and delivery, and order.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/catalog/${product.slug}`)}`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
                >
                  Sign in to View Pricing &rarr;
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#607089]">Grand total</p>
                    <p className="text-xl sm:text-2xl font-bold text-[#162237]">
                      {isCalculating ? <span className="text-[#607089] text-base font-medium animate-pulse">Calculating...</span> : estimate.calculatedAmount ? money(estimate.calculatedAmount) : "Checking price..."}
                    </p>
                  </div>
                  <span className="text-right text-xs text-[#607089]">{estimate.applicableRule ?? "Server pricing"}</span>
                </div>
                {estimate.productPrice ? (
                  <div className="mt-2 rounded-lg bg-[#FAF5ED] border border-[#ede4d5] p-2.5 text-xs text-[#607089] space-y-1">
                    <div className="flex justify-between"><span>Printing</span><strong className="text-[#162237]">{money(estimate.productPrice)}</strong></div>
                    {estimate.blade ? (
                      <div className="flex justify-between text-[#162237]">
                        <span>Blade ({estimate.blade.count} &times; {money(estimate.blade.rate)})</span>
                        <strong className="text-[#2457b8]">{money(estimate.blade.amount)}</strong>
                      </div>
                    ) : null}
                    {estimate.addons && estimate.addons.length > 0 ? (
                      estimate.addons.filter((addon) => addon.addonId !== "blade").map((addon) => (
                        <div key={addon.addonId} className="flex justify-between text-[#162237]">
                          <span>{addon.name}</span>
                          <strong>{money(addon.price)}</strong>
                        </div>
                      ))
                    ) : null}
                    {Number(estimate.locationSurcharge?.amount || 0) > 0 ? <div className="flex justify-between"><span>{estimate.locationSurcharge?.label ?? "Location charge"}</span><strong className="text-[#162237]">{money(estimate.locationSurcharge?.amount)}</strong></div> : null}
                    {Number(estimate.delivery?.price || 0) > 0 ? <div className="flex justify-between"><span>Courier</span><strong className="text-[#162237]">{money(estimate.delivery?.price)}</strong></div> : null}
                    {estimate.taxRate && Number(estimate.taxRate) > 0 && estimate.priceBeforeTax && product.customerType !== "B2B" ? (
                      <div className="border-t border-[#e2e7ef] pt-1 mt-1 space-y-1">
                        <div className="flex justify-between"><span>Taxable subtotal</span><strong className="text-[#162237]">{money(estimate.priceBeforeTax)}</strong></div>
                        {estimate.taxJurisdictionState === "GJ" ? (
                          <div className="flex justify-between text-[#607089]">
                            <span>GST ({Number(estimate.taxRate)}% CGST+SGST)</span>
                            <strong>{money(Number(estimate.cgstAmount || 0) + Number(estimate.sgstAmount || 0))}</strong>
                          </div>
                        ) : (
                          <div className="flex justify-between text-[#607089]">
                            <span>IGST ({Number(estimate.taxRate)}%)</span>
                            <strong>{money(estimate.igstAmount || estimate.taxAmount)}</strong>
                          </div>
                        )}
                        {estimate.roundOff && Math.abs(Number(estimate.roundOff)) > 0.001 ? (
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Round off</span>
                            <strong className={Number(estimate.roundOff) < 0 ? "text-emerald-700" : "text-slate-700"}>
                              {formatRoundOff(estimate.roundOff)}
                            </strong>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {estimate.warnings[0] ? <p className="mt-2 border-l-2 border-[#c78b30] pl-2.5 text-xs leading-4 text-[#805910]">{estimate.warnings[0]}</p> : null}
              </>
            )}
          </div>
          {basketError ? (
            <p className="text-xs sm:text-sm font-semibold text-[#a53025]">
              {basketError}
              {basketSignInRequired && typeof window !== "undefined" ? (
                <Link href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="ml-2 font-bold underline">
                  Sign in
                </Link>
              ) : null}
            </p>
          ) : null}
          {estimate.warnings.some((w) => w.toLowerCase().includes("not available for the selected state") || w.toLowerCase().includes("delivery option is not available")) ? (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1 text-xs">
                  <strong className="block font-bold text-slate-900">Not available in your state?</strong>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Standard automated courier is currently not configured for {delivery?.stateCode || "this state"}. We may still be able to arrange special courier dispatch. Send us your requirement and our production desk will check.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteContext({
                        mode: "STATE_UNAVAILABLE",
                        title: "Not available in your state?",
                        subtitle: `We will check special courier dispatch to ${delivery?.stateCode} for ${product.name}.`,
                        productName: product.name,
                        quantity,
                        customerState: delivery?.stateCode,
                        additionalNotes: `Special dispatch check requested for state ${delivery?.stateCode} with quantity ${quantity}.`,
                      });
                      setIsQuoteModalOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
                  >
                    <span>Request a Quote</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {!directReady && blockingReasons.length > 0 && !estimate.warnings.some((w) => w.toLowerCase().includes("not available for the selected state") || w.toLowerCase().includes("delivery option is not available")) ? (
            <div role="alert" className="rounded-lg border border-[#f0c060] bg-[#fffbea] px-3 py-2 text-xs font-medium text-[#7c5c00]">
              {blockingReasons.map((reason, index) => (
                <p key={index} className={index > 0 ? "mt-0.5" : ""}>{reason}</p>
              ))}
            </div>
          ) : null}
          {isQuantityAboveMax ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setQuoteContext({
                    mode: "CUSTOM_REQUEST",
                    title: `Bulk Quote for ${product.name}`,
                    subtitle: `Request custom wholesale pricing for ${rawEnteredQty.toLocaleString("en-IN")} pcs.`,
                    productName: product.name,
                    category: product.category,
                    quantity: Math.max(25000, rawEnteredQty || 25000),
                    customerState: delivery?.stateCode && delivery.stateCode !== "*" ? delivery.stateCode : undefined,
                  });
                  setIsQuoteModalOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e3a5f] px-4 py-2.5 sm:py-3 text-sm font-bold text-white shadow-sm hover:bg-[#152a45] transition-colors"
              >
                Request Bulk Quotation ({rawEnteredQty.toLocaleString("en-IN")} pcs) <ArrowRight size={15} />
              </button>
            </div>
          ) : !product.customerType ? (
            <div className="pt-1">
              <Link
                href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/catalog/${product.slug}`)}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e3a5f] px-4 py-2.5 sm:py-3 text-sm font-bold text-white shadow-sm hover:bg-[#152a45] transition-colors"
              >
                Sign in to Order &amp; Upload Artwork <ArrowRight size={15} />
              </Link>
            </div>
          ) : editItemId ? (
            <button type="button" onClick={() => void add(editKind)} disabled={editKind === "PURCHASE" && !directReady} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2457b8] px-4 py-2.5 sm:py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a4494] transition-colors disabled:cursor-not-allowed disabled:bg-[#9bb6e8]"><Check size={15} />Update {editKind === "QUOTE" ? "quote" : "purchase"} basket</button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              <button type="button" onClick={() => void add("PURCHASE", true)} disabled={!directReady || isAdding} className="flex items-center justify-center gap-1.5 rounded-full bg-[#2457b8] px-4 py-2.5 sm:py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a4494] transition-colors disabled:cursor-not-allowed disabled:bg-[#9bb6e8]">Buy now <ArrowRight size={15} /></button>
              <button
                type="button"
                onClick={() => void add("PURCHASE")}
                disabled={!directReady || isAdding}
                className={`flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 sm:py-3 text-sm font-bold transition-all disabled:cursor-not-allowed ${
                  justAdded
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20"
                    : "border-[#2457b8] bg-white text-[#2457b8] hover:bg-[#f0f4fc] disabled:text-[#9bb6e8] disabled:border-[#d0dbeb]"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check size={16} className="text-emerald-600" />
                    <span>Added to basket! · Add more</span>
                  </>
                ) : isAdding ? (
                  <span>Adding...</span>
                ) : (
                  <>
                    <ShoppingBag size={15} />
                    <span>Add to basket</span>
                  </>
                )}
              </button>
            </div>
          )}
          {status === "cart" ? <a href="/cart" className="block text-center text-xs sm:text-sm font-bold text-[#2457b8] hover:underline">View purchase basket &rarr;</a> : null}
          <button
            type="button"
            onClick={() => {
              setQuoteContext({
                mode: "CUSTOM_REQUEST",
                title: "Need something different?",
                subtitle: `Tell us how ${product.name} needs to differ (size, quantity, material) and we'll send a custom quote.`,
                productName: product.name,
                category: product.category,
                quantity,
                customerState: delivery?.stateCode && delivery.stateCode !== "*" ? delivery.stateCode : undefined,
              });
              setIsQuoteModalOpen(true);
            }}
            className="block w-full text-center text-xs font-semibold text-[#607089] hover:text-[#2457b8] hover:underline transition-colors pt-0.5"
          >
            Need something different? Request a custom quote &rarr;
          </button>
        </div>
      </section>

      {details?.relatedProducts?.length ? (
        <section className="mt-5 rounded-xl border border-[#dfe5ef] bg-white p-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.13em] text-[#2457b8]">You might also need</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {details.relatedProducts.map((related) => (
              <Link key={related.id} href={`/catalog/${related.slug}`} className="flex items-center gap-3 rounded-lg border border-[#dfe5ef] p-2.5 hover:border-[#2457b8] transition-colors">
                <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded bg-[#eef4ff]">
                  <ProductImage src={related.imageUrl || "/images/mahavir-print-assortment.png"} alt={related.name} slug={related.slug} />
                </span>
                <span className="text-sm font-bold text-[#162237]">{related.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--mc-line)] bg-white/95 p-3 backdrop-blur shadow-[0_-8px_20px_rgba(16,33,63,0.08)] sm:hidden">
        {!product.customerType ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mc-muted)]">Pricing</p>
              <Link
                href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/catalog/${product.slug}`)}`}
                className="text-xs font-bold text-[var(--mc-accent)] hover:underline"
              >
                Login to view price &rarr;
              </Link>
            </div>
            <Link
              href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/catalog/${product.slug}`)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors"
            >
              Sign in to View <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            {!directReady && blockingReasons.length > 0 ? (
              <p className="mb-2 text-center text-[12px] font-medium text-[#7c5c00]">{blockingReasons[0]}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mc-muted)]">Grand Total</p>
                <p className="text-lg font-bold text-[var(--mc-ink)]">
                  {isCalculating ? <span className="text-sm font-medium animate-pulse text-[var(--mc-muted)]">...</span> : estimate.calculatedAmount ? money(estimate.calculatedAmount) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void add("PURCHASE", true)}
                  disabled={!directReady || isAdding}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#9bb6e8]"
                >
                  Buy now <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => void add("PURCHASE")}
                  disabled={!directReady || isAdding}
                  className={`grid size-10 place-items-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    justAdded
                      ? "border-emerald-600 bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/30"
                      : "border-[var(--mc-accent)] bg-white text-[var(--mc-accent)]"
                  }`}
                  aria-label="Add to basket"
                >
                  {justAdded ? <Check size={18} className="text-emerald-700" /> : <ShoppingBag size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <RequirementQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        context={quoteContext}
      />
    </>
  );
}
