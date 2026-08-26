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

type ArtworkFormat = "CDR" | "PDF";
type PageInstructionDraft = { pageNumber: number; label: string; colorMode: string; notes: string; required: boolean };
type RequirementDraft = {
  pricingRuleId: string; artworkRequired: boolean; acceptedFormats: ArtworkFormat[]; minFileSize: string; maxFileSize: string; maxFiles: string;
  designWidth: string; designHeight: string; designUnit: string; bleedWidth: string; bleedHeight: string; safeAreaWidth: string; safeAreaHeight: string;
  finalWidth: string; finalHeight: string; orientation: string; pageInstructions: PageInstructionDraft[]; multiplePageInstructions: string;
  additionalInstructions: string; notes: string; isActive: boolean;
};

const blankRequirement: RequirementDraft = { pricingRuleId: "", artworkRequired: true, acceptedFormats: ["PDF", "CDR"], minFileSize: "", maxFileSize: "100", maxFiles: "1", designWidth: "", designHeight: "", designUnit: "mm", bleedWidth: "", bleedHeight: "", safeAreaWidth: "", safeAreaHeight: "", finalWidth: "", finalHeight: "", orientation: "ANY", pageInstructions: [], multiplePageInstructions: "", additionalInstructions: "", notes: "", isActive: true };

export function ArtworkRequirementsPanel({ rows, pricingRules, mutate }: { rows: Row[]; pricingRules: Row[]; mutate: Mutation }) {
  const [form, setForm] = useState<RequirementDraft>(blankRequirement);
  const [editingId, setEditingId] = useState("");
  const assign = <K extends keyof RequirementDraft>(key: K, value: RequirementDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setForm(blankRequirement); setEditingId(""); };
  const toggleFormat = (format: ArtworkFormat) => assign("acceptedFormats", form.acceptedFormats.includes(format) ? form.acceptedFormats.filter((item) => item !== format) : [...form.acceptedFormats, format]);
  const addPage = () => assign("pageInstructions", [...form.pageInstructions, { pageNumber: form.pageInstructions.length + 1, label: "", colorMode: "", notes: "", required: true }]);
  const updatePage = (index: number, patch: Partial<PageInstructionDraft>) => assign("pageInstructions", form.pageInstructions.map((page, pageIndex) => pageIndex === index ? { ...page, ...patch } : page));
  const removePage = (index: number) => assign("pageInstructions", form.pageInstructions.filter((_, pageIndex) => pageIndex !== index).map((page, pageIndex) => ({ ...page, pageNumber: pageIndex + 1 })));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.acceptedFormats.length) return;
    const numbers = ["minFileSize", "maxFileSize", "maxFiles", "designWidth", "designHeight", "bleedWidth", "bleedHeight", "safeAreaWidth", "safeAreaHeight", "finalWidth", "finalHeight"] as const;
    const data: Row = { ...form, pricingRuleId: form.pricingRuleId || null, pageInstructions: form.pageInstructions.map((page, index) => ({ ...page, pageNumber: index + 1, colorMode: page.colorMode || null, notes: page.notes || null })) };
    for (const key of numbers) data[key] = form[key] === "" ? null : Number(form[key]);
    await mutate(editingId ? "PATCH" : "POST", "ARTWORK_REQUIREMENT", data, editingId || undefined);
    reset();
  }
  function edit(row: Row) {
    const pages = Array.isArray(row.pageInstructions) ? row.pageInstructions.filter((page): page is Row => Boolean(page && typeof page === "object")) : [];
    setEditingId(text(row.id));
    setForm({
      pricingRuleId: text(row.pricingRuleId), artworkRequired: bool(row.artworkRequired), acceptedFormats: (Array.isArray(row.acceptedFormats) ? row.acceptedFormats : ["CDR"]).filter((format): format is ArtworkFormat => format === "CDR" || format === "PDF"),
      minFileSize: text(row.minFileSize), maxFileSize: text(row.maxFileSize), maxFiles: text(row.maxFiles || 1), designWidth: text(row.designWidth), designHeight: text(row.designHeight), designUnit: text(row.designUnit || "mm"), bleedWidth: text(row.bleedWidth), bleedHeight: text(row.bleedHeight), safeAreaWidth: text(row.safeAreaWidth), safeAreaHeight: text(row.safeAreaHeight), finalWidth: text(row.finalWidth), finalHeight: text(row.finalHeight), orientation: text(row.orientation || "ANY"),
      pageInstructions: pages.map((page, index) => ({ pageNumber: index + 1, label: text(page.label), colorMode: text(page.colorMode), notes: text(page.notes), required: page.required !== false })), multiplePageInstructions: text(row.multiplePageInstructions), additionalInstructions: text(row.additionalInstructions), notes: text(row.notes), isActive: bool(row.isActive),
    });
  }
  const ruleName = (id: unknown) => pricingRules.find((rule) => text(rule.id) === text(id))?.name ?? "Product default";
  return <div><Title title="Artwork requirements" description="Control accepted formats, dimensions, and ordered PDF pages for the product default or an exact pricing configuration." />
    <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <Field label="Pricing configuration"><select value={form.pricingRuleId} onChange={(event) => assign("pricingRuleId", event.target.value)} className="field"><option value="">Product default</option>{pricingRules.map((rule) => <option key={text(rule.id)} value={text(rule.id)}>{text(rule.name)}</option>)}</select></Field>
      <fieldset className="border border-[#d7dce5] p-3"><legend className="px-1 text-sm font-semibold text-[#263753]">Accepted formats</legend><div className="flex gap-5"><Check label="PDF" checked={form.acceptedFormats.includes("PDF")} onChange={() => toggleFormat("PDF")} /><Check label="CDR" checked={form.acceptedFormats.includes("CDR")} onChange={() => toggleFormat("CDR")} /></div>{!form.acceptedFormats.length ? <p className="mt-2 text-xs font-semibold text-[#a53025]">Select at least one format.</p> : null}</fieldset>
      <Field label="Maximum size (MB)"><input required type="number" min="1" value={form.maxFileSize} onChange={(event) => assign("maxFileSize", event.target.value)} className="field" /></Field>
      <Field label="Maximum files"><input required type="number" min="1" value={form.maxFiles} onChange={(event) => assign("maxFiles", event.target.value)} className="field" /></Field>
      <DimensionFields label="Full design size" width={form.designWidth} height={form.designHeight} onWidth={(value) => assign("designWidth", value)} onHeight={(value) => assign("designHeight", value)} />
      <DimensionFields label="Bleed" width={form.bleedWidth} height={form.bleedHeight} onWidth={(value) => assign("bleedWidth", value)} onHeight={(value) => assign("bleedHeight", value)} />
      <DimensionFields label="Safe area" width={form.safeAreaWidth} height={form.safeAreaHeight} onWidth={(value) => assign("safeAreaWidth", value)} onHeight={(value) => assign("safeAreaHeight", value)} />
      <DimensionFields label="Final size" width={form.finalWidth} height={form.finalHeight} onWidth={(value) => assign("finalWidth", value)} onHeight={(value) => assign("finalHeight", value)} />
      <Field label="Orientation"><select value={form.orientation} onChange={(event) => assign("orientation", event.target.value)} className="field">{["ANY", "PORTRAIT", "LANDSCAPE", "SQUARE"].map((value) => <option key={value}>{value}</option>)}</select></Field>
      <div className="flex items-end gap-4"><Check label="Artwork required" checked={form.artworkRequired} onChange={(artworkRequired) => assign("artworkRequired", artworkRequired)} /><Check label="Active" checked={form.isActive} onChange={(isActive) => assign("isActive", isActive)} /></div>
      <fieldset className="sm:col-span-2 border border-[#d7dce5] p-4"><div className="flex items-center justify-between gap-3"><div><legend className="text-sm font-bold text-[#162237]">PDF page order</legend><p className="mt-1 text-xs text-[#607089]">Add pages in the exact order the customer must upload them.</p></div><button type="button" onClick={addPage} className="border border-[#c9d2df] px-3 py-2 text-xs font-bold text-[#2457b8]">Add page</button></div><div className="mt-3 space-y-3">{form.pageInstructions.map((page, index) => <div key={`${index}-${page.pageNumber}`} className="grid gap-2 border border-[#e4e8ef] p-3 sm:grid-cols-[4rem_1fr_10rem_auto]"><input value={index + 1} readOnly aria-label="Page number" className="field bg-[#f5f7fb] text-center" /><input required value={page.label} onChange={(event) => updatePage(index, { label: event.target.value })} placeholder="Design File" aria-label={`Page ${index + 1} label`} className="field" /><input value={page.colorMode} onChange={(event) => updatePage(index, { colorMode: event.target.value })} placeholder="B&W only" aria-label={`Page ${index + 1} colour mode`} className="field" /><button type="button" onClick={() => removePage(index)} className="border border-[#e3c5c0] px-3 py-2 text-xs font-bold text-[#a53025]">Remove</button><input value={page.notes} onChange={(event) => updatePage(index, { notes: event.target.value })} placeholder="Optional page note" aria-label={`Page ${index + 1} notes`} className="field sm:col-span-3" /><Check label="Required" checked={page.required} onChange={(required) => updatePage(index, { required })} /></div>)}</div></fieldset>
      <label className="sm:col-span-2 text-sm font-semibold">Multiple-page instructions<textarea value={form.multiplePageInstructions} onChange={(event) => assign("multiplePageInstructions", event.target.value)} rows={3} className="field mt-1.5" placeholder="Upload all pages in one PDF and keep them in the displayed order." /></label>
      <label className="sm:col-span-2 text-sm font-semibold">Additional instructions<textarea value={form.additionalInstructions} onChange={(event) => assign("additionalInstructions", event.target.value)} rows={4} className="field mt-1.5" placeholder="Keep important content inside the safe area. Convert text to curves." /></label>
      <label className="sm:col-span-2 text-sm font-semibold">Internal notes<textarea value={form.notes} onChange={(event) => assign("notes", event.target.value)} rows={3} className="field mt-1.5" /></label>
      <div className="flex flex-wrap gap-2"><button disabled={!form.acceptedFormats.length} className="w-fit bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{editingId ? "Update artwork requirements" : "Save artwork requirements"}</button>{editingId ? <button type="button" onClick={reset} className="border border-[#c9d2df] px-4 py-2.5 text-sm font-bold">Cancel edit</button> : null}</div>
    </form>
    <div className="mt-6 space-y-3">{rows.map((row) => { const pages = Array.isArray(row.pageInstructions) ? row.pageInstructions.filter((page): page is Row => Boolean(page && typeof page === "object")) : []; const formats = Array.isArray(row.acceptedFormats) ? row.acceptedFormats.join(" & ") : "CDR"; return <article key={text(row.id)} className="border border-[#d7dce5] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#162237]">{text(ruleName(row.pricingRuleId))}</p><p className="mt-1 text-sm text-[#607089]">{formats}, up to {text(row.maxFileSize)} MB, {bool(row.artworkRequired) ? "required" : "optional"}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(row)} className="border border-[#c9d2df] px-3 py-2 text-xs font-bold text-[#2457b8]">Edit</button><button type="button" onClick={() => void mutate("DELETE", "ARTWORK_REQUIREMENT", {}, text(row.id))} className="border border-[#e3c5c0] px-3 py-2 text-xs font-bold text-[#a53025]">Remove</button></div></div><div className="mt-3 grid gap-2 text-xs text-[#52647e] sm:grid-cols-3"><span>Full: {size(row.designWidth, row.designHeight, row.designUnit)}</span><span>Safe: {size(row.safeAreaWidth, row.safeAreaHeight, row.designUnit)}</span><span>Final: {size(row.finalWidth, row.finalHeight, row.designUnit)}</span></div>{pages.length ? <ol className="mt-3 space-y-1 text-sm text-[#52647e]">{pages.map((page, index) => <li key={index}>Page {index + 1}: <strong>{text(page.label)}</strong>{text(page.colorMode) ? ` (${text(page.colorMode)})` : ""}{page.required === false ? " - when applicable" : ""}</li>)}</ol> : null}{text(row.multiplePageInstructions) ? <p className="mt-3 text-sm text-[#52647e]">{text(row.multiplePageInstructions)}</p> : null}{text(row.additionalInstructions) ? <p className="mt-3 text-sm text-[#52647e]">{text(row.additionalInstructions)}</p> : null}</article>; })}</div>
  </div>;
}

function size(width: unknown, height: unknown, unit: unknown) { return width && height ? `${width} x ${height} ${unit || "mm"}` : "Not set"; }
function Title({ title, description }: { title: string; description: string }) { return <div className="border-b border-[#e4e8ef] pb-4"><h2 className="font-bold text-[#162237]">{title}</h2><p className="mt-1 text-sm text-[#607089]">{description}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#263753]"><span>{label}</span>{children}</label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#2457b8]" />{label}</label>; }
function DimensionFields({ label, width, height, onWidth, onHeight }: { label: string; width: string; height: string; onWidth: (value: string) => void; onHeight: (value: string) => void }) { return <label className="block text-sm font-semibold text-[#263753]"><span>{label} (mm)</span><div className="mt-1.5 grid grid-cols-2 gap-2"><input type="number" min="0" step="0.001" value={width} onChange={(event) => onWidth(event.target.value)} placeholder="Width" className="field" /><input type="number" min="0" step="0.001" value={height} onChange={(event) => onHeight(event.target.value)} placeholder="Height" className="field" /></div></label>; }
