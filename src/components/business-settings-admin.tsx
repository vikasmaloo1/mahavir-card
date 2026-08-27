"use client";

import { Check, CircleAlert, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { adminRequest } from "@/lib/admin-client";

type Settings = Record<string, unknown>;
type Payload = { settings: Settings; assets: Settings[] };

const fields = [
  ["businessName", "Business name"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"],
  ["city", "City"], ["state", "State"], ["postalCode", "Postal code"], ["phone", "Phone"],
  ["email", "Email"], ["whatsapp", "WhatsApp"], ["businessHours", "Business hours"],
] as const;

function value(input: unknown) { return input === null || input === undefined ? "" : String(input); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The settings could not be saved."; }

export function BusinessSettingsAdmin() {
  const [form, setForm] = useState<Record<string, string>>({ businessName: "Mahavir Card" });
  const [assets, setAssets] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await adminRequest<Payload>("/api/admin/business-settings");
      setForm(Object.fromEntries(Object.entries(data.settings).map(([key, item]) => [key, value(item)])));
      setAssets(data.assets);
    } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const nullable = (key: string) => form[key]?.trim() || null;
      await adminRequest("/api/admin/business-settings", { method: "PATCH", body: JSON.stringify({
        businessName: form.businessName,
        addressLine1: nullable("addressLine1"), addressLine2: nullable("addressLine2"), city: nullable("city"), state: nullable("state"), postalCode: nullable("postalCode"),
        phone: nullable("phone"), email: nullable("email"), whatsapp: nullable("whatsapp"), businessHours: nullable("businessHours"), footerText: nullable("footerText"), logoAssetId: nullable("logoAssetId"),
      }) });
      setNotice("Business settings saved. Public API responses now use these values.");
      await load();
    } catch (caught) { setError(errorMessage(caught)); } finally { setSaving(false); }
  }

  const update = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div><header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Settings</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Business settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">Maintain the contact, identity, hours, logo, and footer information exposed through the website API.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></header>
    {notice ? <p className="mt-5 border border-[#bbdfc9] bg-[#f3fbf5] p-3 text-sm font-semibold text-[#1e6b3a]">{notice}</p> : null}
    {error ? <p className="mt-5 flex gap-2 border border-[#efc4be] bg-[#fff6f4] p-3 text-sm font-semibold text-[#a9362c]"><CircleAlert size={17} />{error}</p> : null}
    {loading ? <p className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">Loading business settings...</p> : <form onSubmit={submit} className="mt-6 border border-[#d7dce5] bg-white p-4 sm:p-6"><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="text-sm font-semibold text-[#263753]"><span>{label}</span><input required={key === "businessName"} type={key === "email" ? "email" : "text"} value={form[key] ?? ""} onChange={update(key)} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]" /></label>)}<label className="text-sm font-semibold text-[#263753]"><span>Logo asset</span><select value={form.logoAssetId ?? ""} onChange={update("logoAssetId")} className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal"><option value="">Use bundled logo</option>{assets.map((asset) => <option key={value(asset.id)} value={value(asset.id)}>{value(asset.assetKey)}</option>)}</select></label><label className="text-sm font-semibold text-[#263753] sm:col-span-2"><span>Footer text</span><textarea rows={4} value={form.footerText ?? ""} onChange={update("footerText")} className="mt-1.5 w-full border border-[#c9d2df] p-3 font-normal outline-none focus:border-[#2457b8]" /></label></div><div className="mt-6 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 bg-[#2457b8] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Check size={16} />{saving ? "Saving..." : "Save settings"}</button></div></form>}
  </div>;
}
