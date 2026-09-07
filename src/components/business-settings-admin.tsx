"use client";

import { Check, CircleAlert, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { adminRequest } from "@/lib/admin-client";

type Settings = Record<string, unknown>;
type Payload = { settings: Settings; assets: Settings[] };

const generalFields = [
  ["businessName", "Business name"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["city", "City"],
  ["state", "State"],
  ["postalCode", "Postal code"],
  ["businessHours", "Business hours"],
] as const;

function value(input: unknown) {
  return input === null || input === undefined ? "" : String(input);
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The settings could not be saved.";
}

export function BusinessSettingsAdmin() {
  const [form, setForm] = useState<Record<string, string>>({
    businessName: "Mahavir Card",
    b2cBankBeneficiary: "MAHAVIR CARD",
    b2cBankName: "BANK OF BARODA",
    b2cBankBranch: "AHMEDABAD(M) BRANCH",
    b2cBankAccountNumber: "03280200003947",
    b2cBankIfsc: "BARB0GANAHM",
    b2cUpiId: "mahavircard2011-2@oksbi",
    b2cQrImageUrl: "/images/qr/b2c-qr.jpg",
    b2bBankBeneficiary: "MAHAVIR CARD & PAPER CUTTING",
    b2bBankName: "BANK OF BARODA",
    b2bBankBranch: "AHMEDABAD(M) BRANCH",
    b2bBankAccountNumber: "12410200000662",
    b2bBankIfsc: "BARB0GANAHM",
    b2bUpiId: "mahavircard2011-4@oksbi",
    b2bQrImageUrl: "/images/qr/b2b-qr.jpg",
  });
  const [assets, setAssets] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState<"b2c" | "b2b" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const b2cFileInputRef = useRef<HTMLInputElement>(null);
  const b2bFileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest<Payload>("/api/admin/business-settings");
      setForm((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(data.settings).map(([key, item]) => [key, value(item)])),
      }));
      setAssets(data.assets);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function uploadQr(variant: "b2c" | "b2b", file: File) {
    setUploadingQr(variant);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("variant", variant);

      const response = await fetch("/api/admin/business-settings/qr-upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error?.message ?? "Failed to upload QR code image");
      }

      const imageUrl = data.data.imageUrl;
      setForm((prev) => ({
        ...prev,
        [variant === "b2c" ? "b2cQrImageUrl" : "b2bQrImageUrl"]: imageUrl,
      }));
      setNotice(`${variant.toUpperCase()} QR code uploaded successfully.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploadingQr(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const nullable = (key: string) => form[key]?.trim() || null;
      await adminRequest("/api/admin/business-settings", {
        method: "PATCH",
        body: JSON.stringify({
          businessName: form.businessName,
          addressLine1: nullable("addressLine1"),
          addressLine2: nullable("addressLine2"),
          city: nullable("city"),
          state: nullable("state"),
          postalCode: nullable("postalCode"),
          phone: nullable("phone"),
          email: nullable("email"),
          whatsapp: nullable("whatsapp"),
          businessHours: nullable("businessHours"),
          footerText: nullable("footerText"),
          logoAssetId: nullable("logoAssetId"),
          // B2C Bank & QR Settings
          b2cBankBeneficiary: nullable("b2cBankBeneficiary"),
          b2cBankName: nullable("b2cBankName"),
          b2cBankBranch: nullable("b2cBankBranch"),
          b2cBankAccountNumber: nullable("b2cBankAccountNumber"),
          b2cBankIfsc: nullable("b2cBankIfsc"),
          b2cUpiId: nullable("b2cUpiId"),
          b2cQrImageUrl: nullable("b2cQrImageUrl"),
          // B2B Bank & QR Settings
          b2bBankBeneficiary: nullable("b2bBankBeneficiary"),
          b2bBankName: nullable("b2bBankName"),
          b2bBankBranch: nullable("b2bBankBranch"),
          b2bBankAccountNumber: nullable("b2bBankAccountNumber"),
          b2bBankIfsc: nullable("b2bBankIfsc"),
          b2bUpiId: nullable("b2bUpiId"),
          b2bQrImageUrl: nullable("b2bQrImageUrl"),
        }),
      });
      setNotice("Business & payment settings saved successfully.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const update =
    (key: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div>
      <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Settings</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Business &amp; Payment Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607089]">
            Configure contact details, branding, and B2B / B2C bank accounts and UPI QR codes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-[#c9d2df] bg-white px-3 py-2.5 text-sm font-bold shadow-sm hover:bg-slate-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {notice ? (
        <p className="mt-5 border border-[#bbdfc9] bg-[#f3fbf5] p-3 text-sm font-semibold text-[#1e6b3a]">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 flex gap-2 border border-[#efc4be] bg-[#fff6f4] p-3 text-sm font-semibold text-[#a9362c]">
          <CircleAlert size={17} />
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 border border-[#d7dce5] bg-white p-6 text-sm text-[#607089]">
          Loading business settings...
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-8">
          {/* General Business Info */}
          <div className="border border-[#d7dce5] bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#162237]">General Information &amp; Branding</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {generalFields.map(([key, label]) => (
                <label key={key} className="text-sm font-semibold text-[#263753]">
                  <span>{label}</span>
                  <input
                    required={key === "businessName"}
                    type={key === "email" ? "email" : "text"}
                    value={form[key] ?? ""}
                    onChange={update(key)}
                    className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                  />
                </label>
              ))}
              <label className="text-sm font-semibold text-[#263753]">
                <span>Logo asset</span>
                <select
                  value={form.logoAssetId ?? ""}
                  onChange={update("logoAssetId")}
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal"
                >
                  <option value="">Use bundled logo</option>
                  {assets.map((asset) => (
                    <option key={value(asset.id)} value={value(asset.id)}>
                      {value(asset.assetKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#263753] sm:col-span-2">
                <span>Footer text</span>
                <textarea
                  rows={3}
                  value={form.footerText ?? ""}
                  onChange={update("footerText")}
                  className="mt-1.5 w-full border border-[#c9d2df] p-3 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
            </div>
          </div>

          {/* B2C Payment & Bank Details */}
          <div className="border border-[#d7dce5] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#162237]">B2C Payment &amp; Bank Details</h2>
                <p className="text-xs text-[#607089]">Shown to retail customers on checkout, pending orders, and wallet top-ups.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                B2C Retail
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#263753]">
                <span>Beneficiary Name</span>
                <input
                  type="text"
                  value={form.b2cBankBeneficiary ?? ""}
                  onChange={update("b2cBankBeneficiary")}
                  placeholder="MAHAVIR CARD"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Bank Name</span>
                <input
                  type="text"
                  value={form.b2cBankName ?? ""}
                  onChange={update("b2cBankName")}
                  placeholder="BANK OF BARODA"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Branch</span>
                <input
                  type="text"
                  value={form.b2cBankBranch ?? ""}
                  onChange={update("b2cBankBranch")}
                  placeholder="AHMEDABAD(M) BRANCH"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Current Account Number</span>
                <input
                  type="text"
                  value={form.b2cBankAccountNumber ?? ""}
                  onChange={update("b2cBankAccountNumber")}
                  placeholder="03280200003947"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>IFSC Code</span>
                <input
                  type="text"
                  value={form.b2cBankIfsc ?? ""}
                  onChange={update("b2cBankIfsc")}
                  placeholder="BARB0GANAHM"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>UPI ID / VPA</span>
                <input
                  type="text"
                  value={form.b2cUpiId ?? ""}
                  onChange={update("b2cUpiId")}
                  placeholder="mahavircard2011-2@oksbi"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-[#263753]">
                  <span>B2C QR Code Image URL</span>
                  <input
                    type="text"
                    value={form.b2cQrImageUrl ?? ""}
                    onChange={update("b2cQrImageUrl")}
                    placeholder="/images/qr/b2c-qr.jpg"
                    className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                  />
                </label>
                <div className="mt-3 flex items-center gap-4">
                  {form.b2cQrImageUrl ? (
                    <img
                      src={form.b2cQrImageUrl}
                      alt="B2C QR preview"
                      className="size-20 rounded border border-[#cfd7e3] object-contain p-1 bg-white"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded border border-dashed border-[#cfd7e3] bg-slate-50 text-xs text-slate-400">
                      No QR
                    </div>
                  )}
                  <div>
                    <input
                      ref={b2cFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadQr("b2c", f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingQr === "b2c"}
                      onClick={() => b2cFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded border border-[#c9d2df] bg-white px-3 py-1.5 text-xs font-bold text-[#24324a] hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Upload size={13} />
                      {uploadingQr === "b2c" ? "Uploading..." : "Upload New B2C QR"}
                    </button>
                    <p className="mt-1 text-xs text-[#607089]">PNG, JPG, or WebP up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* B2B Payment & Bank Details */}
          <div className="border border-[#d7dce5] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#162237]">B2B Payment &amp; Bank Details</h2>
                <p className="text-xs text-[#607089]">Shown to business &amp; printing partner accounts.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                B2B Printing Partners
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#263753]">
                <span>Beneficiary Name</span>
                <input
                  type="text"
                  value={form.b2bBankBeneficiary ?? ""}
                  onChange={update("b2bBankBeneficiary")}
                  placeholder="MAHAVIR CARD & PAPER CUTTING"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Bank Name</span>
                <input
                  type="text"
                  value={form.b2bBankName ?? ""}
                  onChange={update("b2bBankName")}
                  placeholder="BANK OF BARODA"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Branch</span>
                <input
                  type="text"
                  value={form.b2bBankBranch ?? ""}
                  onChange={update("b2bBankBranch")}
                  placeholder="AHMEDABAD(M) BRANCH"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>Current Account Number</span>
                <input
                  type="text"
                  value={form.b2bBankAccountNumber ?? ""}
                  onChange={update("b2bBankAccountNumber")}
                  placeholder="12410200000662"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>IFSC Code</span>
                <input
                  type="text"
                  value={form.b2bBankIfsc ?? ""}
                  onChange={update("b2bBankIfsc")}
                  placeholder="BARB0GANAHM"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <label className="text-sm font-semibold text-[#263753]">
                <span>UPI ID / VPA</span>
                <input
                  type="text"
                  value={form.b2bUpiId ?? ""}
                  onChange={update("b2bUpiId")}
                  placeholder="mahavircard2011-4@oksbi"
                  className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                />
              </label>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-[#263753]">
                  <span>B2B QR Code Image URL</span>
                  <input
                    type="text"
                    value={form.b2bQrImageUrl ?? ""}
                    onChange={update("b2bQrImageUrl")}
                    placeholder="/images/qr/b2b-qr.jpg"
                    className="mt-1.5 w-full border border-[#c9d2df] px-3 py-2.5 font-normal outline-none focus:border-[#2457b8]"
                  />
                </label>
                <div className="mt-3 flex items-center gap-4">
                  {form.b2bQrImageUrl ? (
                    <img
                      src={form.b2bQrImageUrl}
                      alt="B2B QR preview"
                      className="size-20 rounded border border-[#cfd7e3] object-contain p-1 bg-white"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded border border-dashed border-[#cfd7e3] bg-slate-50 text-xs text-slate-400">
                      No QR
                    </div>
                  )}
                  <div>
                    <input
                      ref={b2bFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadQr("b2b", f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingQr === "b2b"}
                      onClick={() => b2bFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded border border-[#c9d2df] bg-white px-3 py-1.5 text-xs font-bold text-[#24324a] hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Upload size={13} />
                      {uploadingQr === "b2b" ? "Uploading..." : "Upload New B2B QR"}
                    </button>
                    <p className="mt-1 text-xs text-[#607089]">PNG, JPG, or WebP up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#2457b8] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1b4391] disabled:opacity-60"
            >
              <Check size={16} />
              {saving ? "Saving settings..." : "Save all settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
