"use client";

import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtworkUploader, type ArtworkRequirement, type UploadedArtwork } from "@/components/artwork-uploader";
import type { CatalogProduct } from "@/lib/catalog";
import { formatInr } from "@/lib/formatting";
import { commerceStates } from "@/lib/india-states";
import { normalizeProductQuantity, stepProductQuantity } from "@/lib/quantity-helper";

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
  warnings: string[];
  applicableRule?: string | null;
};
type ProductDetails = { addons: Addon[]; pricingRules: PricingRule[]; deliveryRules: Array<{ deliveryMethod: Delivery["method"]; stateCode: string; price: string }>; artworkRequirements: Array<ArtworkRequirement & { pricingRuleId: string | null }>; };
type CartKind = "PURCHASE" | "QUOTE";
type EditableCartItem = { id: string; quantity: number; jobName: string | null; configuration: Record<string, unknown> };

const money = formatInr;
function requirementFor(details: ProductDetails | null, ruleId: string | null) { return details?.artworkRequirements.find((rule) => rule.pricingRuleId === ruleId) ?? details?.artworkRequirements.find((rule) => !rule.pricingRuleId) ?? null; }

export function ProductConfigurator({ product, editItemId, editKind = "PURCHASE" }: { product: CatalogProduct; editItemId?: string; editKind?: CartKind }) {
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
  const [jobName, setJobName] = useState("");
  const quantity = useMemo(() => normalizeProductQuantity(values.quantity || (product.categorySlug === "art-card" && product.slug !== "art-card-both-side-lamination" ? 500 : 1000), product.categorySlug, product.slug).normalizedQuantity, [product.categorySlug, product.slug, values.quantity]);
  const requirement = requirementFor(details, selectedRuleId);
  const artworkSlots = requirement?.slots?.length ? requirement.slots : [];
  const requiredArtworkKeys = artworkSlots.length ? artworkSlots.filter((slot) => slot.required).map((slot) => slot.slotKey) : ["MAIN"];
  const artworkReady = !requirement?.artworkRequired || requiredArtworkKeys.every((key) => Boolean(artworks[key]));
  const directReady = product.orderable && Boolean(estimate.calculatedAmount) && estimate.warnings.length === 0 && artworkReady;

  const blockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (isCalculating) return ["Price is being calculated\u2026"];
    if (!estimate.calculatedAmount && estimate.warnings.length === 0) reasons.push("Price could not be calculated. Review your configuration.");
    if (estimate.warnings.length > 0) reasons.push(estimate.warnings[0]);
    if (requirement?.artworkRequired && !artworkReady) reasons.push("Upload your CDR artwork file to enable ordering.");
    return reasons;
  }, [isCalculating, estimate, requirement, artworkReady]);
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

  useEffect(() => {
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
      if (pickup) setDelivery({ method: "PICKUP", stateCode: "*" });
    }).catch((caught) => { if (active) setDetailsError(caught instanceof Error ? caught.message : "Product options could not be loaded"); });
    return () => { active = false; };
  }, [defaults, detailsVersion, product.id]);

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
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsCalculating(true);
      fetch("/api/pricing/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, quantity, options: { ...values, ...(selectedRuleId ? { pricingRuleId: selectedRuleId } : {}) }, addonIds, delivery }), signal: controller.signal })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) setEstimate(result.data);
          else setEstimate({ calculatedAmount: null, warnings: [result.error?.message ?? "This price could not be calculated. Review the selected options."] });
        })
        .catch(() => setEstimate({ calculatedAmount: null, warnings: ["Pricing is temporarily unavailable. Check your connection and retry."] }))
        .finally(() => { if (!controller.signal.aborted) setIsCalculating(false); });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [addonIds, delivery, product.id, quantity, selectedRuleId, values]);

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
    const payloadBody = { productId: product.id, quantity, jobName: jobName || undefined, configuration: configuration() };
    const editing = Boolean(editItemId);
    const response = await fetch(editing ? `/api/cart/items/${editItemId}` : "/api/cart/items", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? payloadBody : { ...payloadBody, kind }) });
    const payload = await response.json();
    if (!response.ok) { setBasketError(response.status === 401 ? "Sign in to save this item." : payload.error?.message ?? "Could not save this item."); return; }
    setStatus(kind === "QUOTE" ? "quote" : "cart");
    if (editing) { router.push(kind === "QUOTE" ? "/quote" : "/cart"); return; }
    if (checkout) router.push("/checkout");
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#cfd8e8] bg-white shadow-[0_10px_30px_rgba(16,33,63,0.08)] mb-20 sm:mb-0">
        <div className="border-b border-[#dfe5ef] px-5 py-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.13em] text-[#2457b8]">Configure your order</p>
        </div>
        <div className="space-y-5 p-5">
          {product.categorySlug === "premium-card" || product.slug.startsWith("premium-") ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#c7d7f3] bg-[#eef4ff] px-3.5 py-2.5 text-[13px] font-semibold text-[#1e4da1]">
              <span className="grid size-5 place-items-center rounded-full bg-[#2457b8] text-white text-[11px] font-bold">✓</span>
              <span>Corner cut included by default</span>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-[13px] font-bold text-[#263753]">Job name <span className="font-normal text-[#607089]">(optional)</span></span>
            <input value={jobName} onChange={(event) => setJobName(event.target.value)} maxLength={160} placeholder="e.g. Restaurant visiting cards" className="w-full rounded-lg border border-[#c9d2df] px-3 py-3 text-[15px] outline-none focus:border-[#2457b8]" />
          </label>
          {detailsError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#efc4be] bg-[#fff6f4] p-3 text-sm text-[#a53025]"><span>{detailsError}</span><button type="button" onClick={() => { setDetailsError(""); setDetailsVersion((version) => version + 1); }} className="rounded-full border border-[#d99d95] bg-white px-3 py-1.5 font-bold">Retry</button></div> : null}
          <label className="block">
            <span className="mb-2 block text-[13px] font-bold text-[#263753]">Quantity</span>
            <div className="flex items-center rounded-lg border border-[#c9d2df]">
              <input inputMode="numeric" value={values.quantity || (product.categorySlug === "art-card" && product.slug !== "art-card-both-side-lamination" ? "500" : "1000")} onChange={(event) => update("quantity", event.target.value)} onBlur={() => update("quantity", String(quantity))} className="min-w-0 flex-1 px-3 py-3 text-[15px] outline-none" />
              <div className="flex gap-1 pr-2">
                <button type="button" onClick={() => update("quantity", String(stepProductQuantity(values.quantity, "DOWN", product.categorySlug, product.slug)))} className="grid size-9 place-items-center rounded-full border border-[#c9d2df] hover:bg-[#f3f6fa] transition-colors" aria-label="Decrease quantity"><Minus size={14} /></button>
                <button type="button" onClick={() => update("quantity", String(stepProductQuantity(values.quantity, "UP", product.categorySlug, product.slug)))} className="grid size-9 place-items-center rounded-full border border-[#c9d2df] hover:bg-[#f3f6fa] transition-colors" aria-label="Increase quantity"><Plus size={14} /></button>
              </div>
            </div>
          </label>
          {product.configuration.filter((field) => field.id !== "quantity").length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {product.configuration.filter((field) => field.id !== "quantity").map((field) => (
                <label key={field.id}>
                  <span className="mb-2 block text-[13px] font-bold text-[#263753]">{field.label}</span>
                  {field.type === "select" ? (
                    <select value={values[field.id] ?? field.defaultValue} onChange={(event) => update(field.id, event.target.value)} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-3 text-[15px] outline-none">
                      {field.options?.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <div>
                      <div className="flex rounded-lg border border-[#c9d2df]">
                        <input inputMode={field.type === "number" ? "decimal" : undefined} value={values[field.id] ?? field.defaultValue} onChange={(event) => update(field.id, event.target.value)} className="min-w-0 flex-1 px-3 py-3 text-[15px] outline-none" />
                        {field.suffix ? <span className="border-l border-[#c9d2df] px-3 py-3 text-sm text-[#607089]">{field.suffix}</span> : null}
                      </div>
                      {field.id === "bladeCount" ? <span className="mt-1 block text-xs font-semibold text-[#2457b8]">Blade: ₹50 / blade</span> : null}
                    </div>
                  )}
                </label>
              ))}
            </div>
          ) : null}
          {details?.pricingRules.length && details.pricingRules.length > 1 ? (
            <label className="block">
              <span className="mb-2 block text-[13px] font-bold text-[#263753]">Card stock and print</span>
              <select value={selectedRuleId ?? ""} onChange={(event) => selectRule(event.target.value)} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-3 text-[15px] font-semibold outline-none focus:border-[#2457b8]">
                {details.pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
              </select>
            </label>
          ) : null}
          {configurationAddons.length ? (
            <div>
              <p className="mb-2 text-[13px] font-bold text-[#263753]">Add-ons</p>
              <div className="space-y-2">
                {configurationAddons.map((addon) => (
                  <label key={addon.addonId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#d9e0eb] p-3 text-[15px] hover:border-[#b6c4da] transition-colors">
                    <input type="checkbox" checked={addonIds.includes(addon.addonId)} onChange={() => setAddonIds((current) => current.includes(addon.addonId) ? current.filter((id) => id !== addon.addonId) : [...current, addon.addonId])} className="mt-0.5 size-4 accent-[#2457b8] rounded" />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[#162237]">{addon.name}</strong>
                      {addon.description ? <span className="mt-1 block text-[13px] text-[#607089]">{addon.description}</span> : null}
                    </span>
                    <span className="font-bold text-[#2457b8]">{money(addon.displayPrice)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {deliveryMethods.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[13px] font-bold text-[#263753]">Delivery</span>
                <select value={delivery?.method ?? ""} onChange={(event) => setDelivery({ method: event.target.value as Delivery["method"], stateCode: event.target.value === "PICKUP" ? "*" : delivery?.stateCode === "*" ? "GJ" : delivery?.stateCode || "GJ" })} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-3 text-[15px] outline-none">
                  <option value="">Choose delivery</option>
                  {deliveryMethods.map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}
                </select>
              </label>
              {delivery?.method && delivery.method !== "PICKUP" ? (
                <label>
                  <span className="mb-2 block text-[13px] font-bold text-[#263753]">Delivery state</span>
                  <select value={delivery.stateCode} onChange={(event) => setDelivery({ ...delivery, stateCode: event.target.value })} className="w-full rounded-lg border border-[#c9d2df] bg-white px-3 py-3 text-[15px] outline-none">
                    {commerceStates.map(([code, state]) => <option key={code} value={code}>{state}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {requirement ? (
            <div className="space-y-3">
              {artworkSlots.length ? artworkSlots.map((slot, index) => <ArtworkUploader key={slot.id} productId={product.id} pricingRuleId={selectedRuleId} requirement={requirement} slot={slot} showRequirements={index === 0} configuration={values} artwork={artworks[slot.slotKey] ?? null} onUploaded={(uploaded) => setArtworks((current) => ({ ...current, [slot.slotKey]: uploaded }))} onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next[slot.slotKey]; return next; })} />) : <ArtworkUploader productId={product.id} pricingRuleId={selectedRuleId} requirement={requirement} configuration={values} artwork={artworks.MAIN ?? null} onUploaded={(uploaded) => setArtworks((current) => ({ ...current, MAIN: uploaded }))} onRemoved={() => setArtworks((current) => { const next = { ...current }; delete next.MAIN; return next; })} />}
            </div>
          ) : null}
          <div className="border-t border-[#dfe5ef] pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#607089]">Grand total</p>
                <p className="mt-1 text-2xl font-bold text-[#162237]">
                  {isCalculating ? <span className="text-[#607089] text-xl font-medium animate-pulse">Calculating...</span> : estimate.calculatedAmount ? money(estimate.calculatedAmount) : "Checking price..."}
                </p>
              </div>
              <span className="text-right text-[13px] text-[#607089]">{estimate.applicableRule ?? "Server pricing"}</span>
            </div>
            {estimate.productPrice ? (
              <div className="mt-3 space-y-1.5 text-[13px] text-[#607089]">
                <p className="flex justify-between"><span>Base price</span><strong>{money(estimate.productPrice)}</strong></p>
                {estimate.blade ? (
                  <p className="flex justify-between text-[#162237]">
                    <span>Blade ({estimate.blade.count} &times; {money(estimate.blade.rate)})</span>
                    <strong className="text-[#2457b8]">{money(estimate.blade.amount)}</strong>
                  </p>
                ) : null}
                {estimate.addons && estimate.addons.length > 0 ? (
                  estimate.addons.filter((addon) => addon.addonId !== "blade").map((addon) => (
                    <p key={addon.addonId} className="flex justify-between text-[#162237]">
                      <span>{addon.name}</span>
                      <strong>{money(addon.price)}</strong>
                    </p>
                  ))
                ) : null}
                {Number(estimate.locationSurcharge?.amount || 0) > 0 ? <p className="flex justify-between"><span>{estimate.locationSurcharge?.label ?? "Location charge"}</span><strong>{money(estimate.locationSurcharge?.amount)}</strong></p> : null}
                {Number(estimate.delivery?.price || 0) > 0 ? <p className="flex justify-between"><span>Courier</span><strong>{money(estimate.delivery?.price)}</strong></p> : null}
                {estimate.taxRate && estimate.priceBeforeTax ? (
                  <>
                    <p className="flex justify-between border-t border-[#e2e7ef] pt-2"><span>Taxable subtotal</span><strong>{money(estimate.priceBeforeTax)}</strong></p>
                    {estimate.taxJurisdictionState === "GJ" ? (
                      <>
                        <p className="flex justify-between"><span>CGST {Number(estimate.taxRate) / 2}%</span><strong>{money(estimate.cgstAmount)}</strong></p>
                        <p className="flex justify-between"><span>SGST {Number(estimate.taxRate) / 2}%</span><strong>{money(estimate.sgstAmount)}</strong></p>
                      </>
                    ) : (
                      <p className="flex justify-between"><span>IGST {Number(estimate.taxRate)}%</span><strong>{money(estimate.igstAmount || estimate.taxAmount)}</strong></p>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
            {estimate.warnings[0] ? <p className="mt-3 border-l-2 border-[#c78b30] pl-3 text-[13px] leading-5 text-[#805910]">{estimate.warnings[0]}</p> : null}
          </div>
          {basketError ? <p className="text-[15px] font-semibold text-[#a53025]">{basketError}</p> : null}
          {!directReady && blockingReasons.length > 0 ? (
            <div role="alert" className="rounded-lg border border-[#f0c060] bg-[#fffbea] px-4 py-3 text-[13px] font-medium text-[#7c5c00]">
              {blockingReasons.map((reason, index) => (
                <p key={index} className={index > 0 ? "mt-1" : ""}>{reason}</p>
              ))}
            </div>
          ) : null}
          {editItemId ? (
            <button type="button" onClick={() => void add(editKind)} disabled={editKind === "PURCHASE" && !directReady} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2457b8] px-4 py-3.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#1a4494] transition-colors disabled:cursor-not-allowed disabled:bg-[#9bb6e8]"><Check size={16} />Update {editKind === "QUOTE" ? "quote" : "purchase"} basket</button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void add("PURCHASE", true)} disabled={!directReady} className="flex items-center justify-center gap-2 rounded-full bg-[#2457b8] px-4 py-3.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#1a4494] transition-colors disabled:cursor-not-allowed disabled:bg-[#9bb6e8]">Buy now <ArrowRight size={16} /></button>
              <button type="button" onClick={() => void add("PURCHASE")} disabled={!directReady} className="flex items-center justify-center gap-2 rounded-full border border-[#2457b8] bg-white px-4 py-3.5 text-[15px] font-bold text-[#2457b8] hover:bg-[#f0f4fc] transition-colors disabled:cursor-not-allowed disabled:text-[#9bb6e8] disabled:border-[#d0dbeb]"><ShoppingBag size={16} />Add to basket</button>
            </div>
          )}
          {status === "cart" ? <a href="/cart" className="block text-center text-[15px] font-bold text-[#2457b8] hover:underline">View purchase basket &rarr;</a> : null}
        </div>
      </section>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--mc-line)] bg-white/95 p-3 backdrop-blur shadow-[0_-8px_20px_rgba(16,33,63,0.08)] sm:hidden">
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
              disabled={!directReady}
              className="flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#9bb6e8]"
            >
              Buy now <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => void add("PURCHASE")}
              disabled={!directReady}
              className="grid size-10 place-items-center rounded-full border border-[var(--mc-accent)] bg-white text-[var(--mc-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Add to basket"
            >
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
