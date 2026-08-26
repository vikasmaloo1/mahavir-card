"use client";

import { FormEvent, useState } from "react";

type Row = Record<string, unknown>;
type Mutation = (method: "POST" | "PATCH" | "DELETE", resource: string, data?: Row, resourceId?: string) => Promise<void>;

function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function bool(value: unknown) { return value === true; }
function asRow(value: unknown) { return value && typeof value === "object" ? value as Row : null; }

export function ConfigurationAddonsPanel({ rows, addons, pricingRules, mutate }: { rows: Row[]; addons: Row[]; pricingRules: Row[]; mutate: Mutation }) {
  const [form, setForm] = useState({ addonId: "", pricingRuleId: "", price: "0", isActive: true, isDefault: false, taxInclusive: true });
  const ruleName = (id: unknown) => pricingRules.find((rule) => text(rule.id) === text(id))?.name ?? "Product fallback";
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutate("POST", "ADDON", { ...form, pricingRuleId: form.pricingRuleId || null, sortOrder: rows.length });
    setForm({ addonId: "", pricingRuleId: "", price: "0", isActive: true, isDefault: false, taxInclusive: true });
  }
  return <div><Title title="Configuration add-ons" description="Map reusable add-ons to the exact pricing configuration. A fallback is only used when the selected configuration has no specific mapping." />
    <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <Field label="Pricing configuration"><select value={form.pricingRuleId} onChange={(event) => setForm({ ...form, pricingRuleId: event.target.value })} className="field"><option value="">Product fallback</option>{pricingRules.map((rule) => <option key={text(rule.id)} value={text(rule.id)}>{text(rule.name)}</option>)}</select></Field>
      <Field label="Global add-on"><select required value={form.addonId} onChange={(event) => setForm({ ...form, addonId: event.target.value })} className="field"><option value="">Select add-on</option>{addons.filter((addon) => bool(addon.isActive)).map((addon) => <option key={text(addon.id)} value={text(addon.id)}>{text(addon.name)}</option>)}</select></Field>
      <Field label="Price"><input required inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="field" /></Field>
      <div className="flex flex-wrap items-end gap-4"><Check label="Active" checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} /><Check label="Default" checked={form.isDefault} onChange={(isDefault) => setForm({ ...form, isDefault })} /><button className="bg-[#2457b8] px-3 py-2.5 text-sm font-bold text-white">Map add-on</button></div>
    </form>
    <div className="mt-6 space-y-3">{rows.map((item) => { const mapping = asRow(item.mapping) ?? item; const addon = asRow(item.addon); return <article key={text(mapping.id)} className="flex flex-col gap-3 border border-[#d7dce5] p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-bold text-[#162237]">{text(addon?.name) || "Add-on"}</p><p className="mt-1 text-xs text-[#607089]">{text(ruleName(mapping.pricingRuleId))}</p></div><p className="font-semibold text-[#2457b8]">Rs {text(mapping.price)}</p><button type="button" onClick={() => void mutate("PATCH", "ADDON", { isActive: !bool(mapping.isActive) }, text(mapping.id))} className="border border-[#c9d2df] px-3 py-2 text-xs font-bold">{bool(mapping.isActive) ? "Disable" : "Enable"}</button><button type="button" onClick={() => void mutate("DELETE", "ADDON", {}, text(mapping.id))} className="border border-[#e3c5c0] px-3 py-2 text-xs font-bold text-[#a53025]">Remove</button></article>; })}</div>
  </div>;
}

const blankRequirement = { pricingRuleId: "", artworkRequired: true, minFileSize: "", maxFileSize: "100", maxFiles: "1", designWidth: "", designHeight: "", designUnit: "mm", bleedWidth: "", bleedHeight: "", safeAreaWidth: "", safeAreaHeight: "", finalWidth: "", finalHeight: "", orientation: "ANY", additionalInstructions: "", notes: "", isActive: true };

export function ArtworkRequirementsPanel({ rows, pricingRules, mutate }: { rows: Row[]; pricingRules: Row[]; mutate: Mutation }) {
  const [form, setForm] = useState(blankRequirement);
  const assign = (key: keyof typeof blankRequirement, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const numbers = ["minFileSize", "maxFileSize", "maxFiles", "designWidth", "designHeight", "bleedWidth", "bleedHeight", "safeAreaWidth", "safeAreaHeight", "finalWidth", "finalHeight"] as const;
    const data: Row = { ...form, pricingRuleId: form.pricingRuleId || null };
    for (const key of numbers) data[key] = form[key] === "" ? null : Number(form[key]);
    await mutate("POST", "ARTWORK_REQUIREMENT", data);
    setForm(blankRequirement);
  }
  const ruleName = (id: unknown) => pricingRules.find((rule) => text(rule.id) === text(id))?.name ?? "Product default";
  return <div><Title title="Artwork requirements" description="CDR is the only accepted artwork format. Set the product default or a more specific rule for one pricing configuration." />
    <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <Field label="Pricing configuration"><select value={form.pricingRuleId} onChange={(event) => assign("pricingRuleId", event.target.value)} className="field"><option value="">Product default</option>{pricingRules.map((rule) => <option key={text(rule.id)} value={text(rule.id)}>{text(rule.name)}</option>)}</select></Field>
      <Field label="Accepted format"><input value="CDR only" readOnly className="field bg-[#f5f7fb] text-[#607089]" /></Field>
      <Field label="Maximum size (MB)"><input required type="number" min="1" value={form.maxFileSize} onChange={(event) => assign("maxFileSize", event.target.value)} className="field" /></Field>
      <Field label="Maximum files"><input required type="number" min="1" value={form.maxFiles} onChange={(event) => assign("maxFiles", event.target.value)} className="field" /></Field>
      <DimensionFields label="Full design size" width={form.designWidth} height={form.designHeight} onWidth={(value) => assign("designWidth", value)} onHeight={(value) => assign("designHeight", value)} />
      <DimensionFields label="Bleed" width={form.bleedWidth} height={form.bleedHeight} onWidth={(value) => assign("bleedWidth", value)} onHeight={(value) => assign("bleedHeight", value)} />
      <DimensionFields label="Safe area" width={form.safeAreaWidth} height={form.safeAreaHeight} onWidth={(value) => assign("safeAreaWidth", value)} onHeight={(value) => assign("safeAreaHeight", value)} />
      <DimensionFields label="Final size" width={form.finalWidth} height={form.finalHeight} onWidth={(value) => assign("finalWidth", value)} onHeight={(value) => assign("finalHeight", value)} />
      <Field label="Orientation"><select value={form.orientation} onChange={(event) => assign("orientation", event.target.value)} className="field">{["ANY", "PORTRAIT", "LANDSCAPE", "SQUARE"].map((value) => <option key={value}>{value}</option>)}</select></Field>
      <div className="flex items-end gap-4"><Check label="Artwork required" checked={form.artworkRequired} onChange={(artworkRequired) => assign("artworkRequired", artworkRequired)} /><Check label="Active" checked={form.isActive} onChange={(isActive) => assign("isActive", isActive)} /></div>
      <label className="sm:col-span-2 text-sm font-semibold">Additional instructions<textarea value={form.additionalInstructions} onChange={(event) => assign("additionalInstructions", event.target.value)} rows={4} className="field mt-1.5" placeholder="Keep important content inside the safe area. Convert text to curves." /></label>
      <label className="sm:col-span-2 text-sm font-semibold">Internal notes<textarea value={form.notes} onChange={(event) => assign("notes", event.target.value)} rows={3} className="field mt-1.5" /></label>
      <button className="w-fit bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white">Save artwork requirements</button>
    </form>
    <div className="mt-6 space-y-3">{rows.map((row) => <article key={text(row.id)} className="border border-[#d7dce5] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#162237]">{text(ruleName(row.pricingRuleId))}</p><p className="mt-1 text-sm text-[#607089]">CDR only, up to {text(row.maxFileSize)} MB, {bool(row.artworkRequired) ? "required" : "optional"}</p></div><button type="button" onClick={() => void mutate("DELETE", "ARTWORK_REQUIREMENT", {}, text(row.id))} className="border border-[#e3c5c0] px-3 py-2 text-xs font-bold text-[#a53025]">Remove</button></div><div className="mt-3 grid gap-2 text-xs text-[#52647e] sm:grid-cols-3"><span>Full: {size(row.designWidth, row.designHeight, row.designUnit)}</span><span>Safe: {size(row.safeAreaWidth, row.safeAreaHeight, row.designUnit)}</span><span>Final: {size(row.finalWidth, row.finalHeight, row.designUnit)}</span></div>{text(row.additionalInstructions) ? <p className="mt-3 text-sm text-[#52647e]">{text(row.additionalInstructions)}</p> : null}</article>)}</div>
  </div>;
}

function size(width: unknown, height: unknown, unit: unknown) { return width && height ? `${width} x ${height} ${unit || "mm"}` : "Not set"; }
function Title({ title, description }: { title: string; description: string }) { return <div className="border-b border-[#e4e8ef] pb-4"><h2 className="font-bold text-[#162237]">{title}</h2><p className="mt-1 text-sm text-[#607089]">{description}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span>{children}</label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#2457b8]" />{label}</label>; }
function DimensionFields({ label, width, height, onWidth, onHeight }: { label: string; width: string; height: string; onWidth: (value: string) => void; onHeight: (value: string) => void }) { return <label className="block text-sm font-semibold text-[#263753]"><span>{label} (mm)</span><div className="mt-1.5 grid grid-cols-2 gap-2"><input type="number" min="0" step="0.001" value={width} onChange={(event) => onWidth(event.target.value)} placeholder="Width" className="field" /><input type="number" min="0" step="0.001" value={height} onChange={(event) => onHeight(event.target.value)} placeholder="Height" className="field" /></div></label>; }
