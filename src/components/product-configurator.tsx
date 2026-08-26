"use client";

import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtworkUploader, type ArtworkRequirement, type UploadedArtwork } from "@/components/artwork-uploader";
import type { CatalogProduct } from "@/lib/catalog";

type PricingRule = { id: string; name: string; conditions: Record<string, unknown>; priceFormula: Record<string, unknown> };
type Addon = { addonId: string; pricingRuleId: string | null; name: string; description: string | null; price: string; isDefault: boolean };
type Delivery = { method: "PICKUP" | "LOCAL_DELIVERY" | "COURIER"; stateCode: string };
type Estimate = { calculatedAmount: string | null; productPrice?: string | null; addonTotal?: string; delivery?: { method: string | null; price: string }; warnings: string[]; applicableRule?: string | null };
type ProductDetails = { addons: Addon[]; pricingRules: PricingRule[]; deliveryRules: Array<{ deliveryMethod: Delivery["method"]; stateCode: string; price: string }>; artworkRequirements: Array<ArtworkRequirement & { pricingRuleId: string | null }>; };

function money(value: string | null | undefined) { return `Rs ${Number(value || 0).toLocaleString("en-IN")}`; }
function requirementFor(details: ProductDetails | null, ruleId: string | null) { return details?.artworkRequirements.find((rule) => rule.pricingRuleId === ruleId) ?? details?.artworkRequirements.find((rule) => !rule.pricingRuleId) ?? null; }

export function ProductConfigurator({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const defaults = useMemo(() => Object.fromEntries(product.configuration.map((field) => [field.id, field.defaultValue])), [product.configuration]);
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<Delivery | undefined>();
  const [estimate, setEstimate] = useState<Estimate>({ calculatedAmount: null, warnings: [] });
  const [artwork, setArtwork] = useState<UploadedArtwork | null>(null);
  const [status, setStatus] = useState<"idle" | "quote" | "cart">("idle");
  const [basketError, setBasketError] = useState("");
  const quantity = Math.max(1, Number(values.quantity || 1));
  const requirement = requirementFor(details, selectedRuleId);
  const directReady = product.orderable && Boolean(estimate.calculatedAmount) && estimate.warnings.length === 0 && (!requirement?.artworkRequired || Boolean(artwork));
  const configurationAddons = useMemo(() => {
    const scoped = details?.addons.filter((addon) => addon.pricingRuleId === selectedRuleId) ?? [];
    return scoped.length ? scoped : details?.addons.filter((addon) => addon.pricingRuleId === null) ?? [];
  }, [details?.addons, selectedRuleId]);
  const deliveryMethods = [...new Set(details?.deliveryRules.map((rule) => rule.deliveryMethod) ?? [])];

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${product.id}`, { cache: "no-store" }).then((response) => response.json()).then((payload) => {
      if (!active || !payload.success) return;
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
    }).catch(() => undefined);
    return () => { active = false; };
  }, [defaults, product.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pricing/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, quantity, options: { ...values, ...(selectedRuleId ? { pricingRuleId: selectedRuleId } : {}) }, addonIds, delivery }), signal: controller.signal })
      .then((response) => response.json()).then((result) => { if (result.success) setEstimate(result.data); }).catch(() => undefined);
    return () => controller.abort();
  }, [addonIds, delivery, product.id, quantity, selectedRuleId, values]);

  function update(id: string, value: string) { setValues((current) => ({ ...current, [id]: value })); setStatus("idle"); }
  function selectRule(id: string) {
    const rule = details?.pricingRules.find((item) => item.id === id);
    if (!rule) return;
    setSelectedRuleId(id); setArtwork(null); setStatus("idle");
    const scopedAddons = details?.addons.filter((addon) => addon.pricingRuleId === id) ?? [];
    const availableAddons = scopedAddons.length ? scopedAddons : details?.addons.filter((addon) => addon.pricingRuleId === null) ?? [];
    setAddonIds(availableAddons.filter((addon) => addon.isDefault).map((addon) => addon.addonId));
    setValues((current) => ({ ...current, ...Object.fromEntries(Object.entries(rule.conditions ?? {}).map(([key, value]) => [key, String(value)])) }));
  }
  function configuration() { return { ...values, pricingRuleId: selectedRuleId, addonIds, ...(delivery ? { delivery } : {}), ...(artwork ? { artworkId: artwork.id } : {}) }; }
  async function add(kind: "PURCHASE" | "QUOTE", checkout = false) {
    setBasketError("");
    if (requirement?.artworkRequired && !artwork) { setBasketError(`Upload the required ${(requirement.acceptedFormats ?? ["CDR"]).join(" or ")} artwork before continuing.`); return; }
    const response = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, productId: product.id, quantity, configuration: configuration() }) });
    const payload = await response.json();
    if (!response.ok) { setBasketError(response.status === 401 ? "Sign in to save this item." : payload.error?.message ?? "Could not save this item."); return; }
    setStatus(kind === "QUOTE" ? "quote" : "cart");
    if (checkout) router.push("/checkout");
  }

  return <section className="border border-[#cfd8e8] bg-white shadow-sm"><div className="border-b border-[#dfe5ef] px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#2457b8]">Configure your order</p><p className="mt-1 text-sm text-[#607089]">Select the print option, delivery, and artwork in one place.</p></div><div className="space-y-5 p-5">
    <label className="block"><span className="mb-2 block text-xs font-bold text-[#263753]">Quantity</span><div className="flex items-center border border-[#c9d2df]"><input inputMode="numeric" value={values.quantity || "1000"} onChange={(event) => update("quantity", event.target.value)} className="min-w-0 flex-1 px-3 py-3 text-sm outline-none" /><div className="flex gap-1 pr-2"><button type="button" onClick={() => update("quantity", String(Math.max(1, quantity - 1)))} className="grid size-8 place-items-center border border-[#c9d2df]" aria-label="Decrease quantity"><Minus size={14} /></button><button type="button" onClick={() => update("quantity", String(quantity + 1))} className="grid size-8 place-items-center border border-[#c9d2df]" aria-label="Increase quantity"><Plus size={14} /></button></div></div></label>
    {details?.pricingRules.length && details.pricingRules.length > 1 ? <label className="block"><span className="mb-2 block text-xs font-bold text-[#263753]">Card stock and print</span><select value={selectedRuleId ?? ""} onChange={(event) => selectRule(event.target.value)} className="w-full border border-[#c9d2df] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#2457b8]">{details.pricingRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label> : null}
    {configurationAddons.length ? <div><p className="mb-2 text-xs font-bold text-[#263753]">Add-ons</p><div className="space-y-2">{configurationAddons.map((addon) => <label key={addon.addonId} className="flex cursor-pointer items-start gap-3 border border-[#d9e0eb] p-3 text-sm"><input type="checkbox" checked={addonIds.includes(addon.addonId)} onChange={() => setAddonIds((current) => current.includes(addon.addonId) ? current.filter((id) => id !== addon.addonId) : [...current, addon.addonId])} className="mt-0.5 size-4 accent-[#2457b8]" /><span className="min-w-0 flex-1"><strong className="block text-[#162237]">{addon.name}</strong>{addon.description ? <span className="mt-1 block text-xs text-[#607089]">{addon.description}</span> : null}</span><span className="font-bold text-[#2457b8]">{money(addon.price)}</span></label>)}</div></div> : <p className="border border-dashed border-[#d5dce8] px-3 py-3 text-xs text-[#607089]">No add-ons are available for this print option.</p>}
    {deliveryMethods.length ? <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-[#263753]">Delivery</span><select value={delivery?.method ?? ""} onChange={(event) => setDelivery({ method: event.target.value as Delivery["method"], stateCode: event.target.value === "PICKUP" ? "*" : delivery?.stateCode || "GJ" })} className="w-full border border-[#c9d2df] bg-white px-3 py-3 text-sm outline-none"><option value="">Choose delivery</option>{deliveryMethods.map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></label>{delivery?.method && delivery.method !== "PICKUP" ? <label><span className="mb-2 block text-xs font-bold text-[#263753]">Delivery state</span><input value={delivery.stateCode} onChange={(event) => setDelivery({ ...delivery, stateCode: event.target.value.toUpperCase() })} placeholder="For example: GJ" maxLength={2} className="w-full border border-[#c9d2df] px-3 py-3 text-sm outline-none" /></label> : null}</div> : null}
    {requirement ? <ArtworkUploader productId={product.id} pricingRuleId={selectedRuleId} requirement={requirement} configuration={values} artwork={artwork} onUploaded={setArtwork} onRemoved={() => setArtwork(null)} /> : null}
    <div className="border-t border-[#dfe5ef] pt-5"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#607089]">Price</p><p className="mt-1 text-2xl font-bold text-[#162237]">{estimate.calculatedAmount ? money(estimate.calculatedAmount) : "Checking price..."}</p></div><span className="text-right text-xs text-[#607089]">{estimate.applicableRule ?? "Server pricing"}</span></div>{estimate.productPrice ? <div className="mt-3 space-y-1 text-xs text-[#607089]"><p>Base product: {money(estimate.productPrice)}</p>{Number(estimate.addonTotal || 0) > 0 ? <p>Add-ons: {money(estimate.addonTotal)}</p> : null}{Number(estimate.delivery?.price || 0) > 0 ? <p>Delivery: {money(estimate.delivery?.price)}</p> : null}<p className="font-semibold text-[#52647e]">Price includes applicable GST/taxes.</p></div> : null}{estimate.warnings[0] ? <p className="mt-3 border-l-2 border-[#c78b30] pl-3 text-xs leading-5 text-[#805910]">{estimate.warnings[0]}</p> : null}</div>
    {basketError ? <p className="text-sm font-semibold text-[#a53025]">{basketError}</p> : null}
    {product.orderable ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void add("PURCHASE", true)} disabled={!directReady} className="flex items-center justify-center gap-2 bg-[#2457b8] px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9bb6e8]">Buy now <ArrowRight size={16} /></button><button type="button" onClick={() => void add("PURCHASE")} disabled={!directReady} className="flex items-center justify-center gap-2 border border-[#2457b8] px-4 py-3.5 text-sm font-bold text-[#2457b8] disabled:cursor-not-allowed disabled:text-[#9bb6e8]"><ShoppingBag size={16} />Add to basket</button></div> : null}
    {product.quoteable ? <button type="button" onClick={() => void add("QUOTE")} className="flex w-full items-center justify-center gap-2 border border-[#b6c4da] px-4 py-3.5 text-sm font-bold text-[#263753]">{status === "quote" ? <><Check size={16} />Added to quote basket</> : "Request quote"}</button> : null}
    {status === "cart" ? <a href="/cart" className="block text-center text-sm font-bold text-[#2457b8]">View purchase basket</a> : null}{status === "quote" ? <a href="/quote" className="block text-center text-sm font-bold text-[#2457b8]">View quote basket</a> : null}
  </div></section>;
}
