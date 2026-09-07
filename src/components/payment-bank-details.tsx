"use client";

import { Check, Copy, Image as ImageIcon, Loader2, QrCode, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export type BankConfig = {
  beneficiary: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImageUrl: string;
};

type PaymentConfigResponse = {
  razorpayEnabled: boolean;
  b2c: BankConfig;
  b2b: BankConfig;
};

const DEFAULT_B2C: BankConfig = {
  beneficiary: "MAHAVIR CARD",
  bankName: "BANK OF BARODA",
  branch: "AHMEDABAD(M) BRANCH",
  accountNumber: "03280200003947",
  ifsc: "BARB0GANAHM",
  upiId: "mahavircard2011-2@oksbi",
  qrImageUrl: "/images/qr/b2c-qr.jpg",
};

const DEFAULT_B2B: BankConfig = {
  beneficiary: "MAHAVIR CARD & PAPER CUTTING",
  bankName: "BANK OF BARODA",
  branch: "AHMEDABAD(M) BRANCH",
  accountNumber: "12410200000662",
  ifsc: "BARB0GANAHM",
  upiId: "mahavircard2011-4@oksbi",
  qrImageUrl: "/images/qr/b2b-qr.jpg",
};

export function PaymentBankDetails({
  customerType = "B2C",
  onProofUploaded,
  proofImageUrl,
  onClearProof,
  amount,
}: {
  customerType?: string;
  onProofUploaded?: (url: string) => void;
  proofImageUrl?: string | null;
  onClearProof?: () => void;
  amount?: string;
}) {
  const [config, setConfig] = useState<{ b2c: BankConfig; b2b: BankConfig }>({
    b2c: DEFAULT_B2C,
    b2b: DEFAULT_B2B,
  });
  const [selectedType, setSelectedType] = useState<"B2C" | "B2B">(
    customerType === "B2B" ? "B2B" : "B2C",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/payments/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload?.success && payload.data) {
          setConfig({
            b2c: payload.data.b2c || DEFAULT_B2C,
            b2b: payload.data.b2b || DEFAULT_B2B,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const activeBank = selectedType === "B2B" ? config.b2b : config.b2c;

  function copy(text: string, key: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Screenshot file must be smaller than 15MB.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/payments/proof-upload", {
        method: "POST",
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error?.message || "Failed to upload payment proof.");
      }

      onProofUploaded?.(payload.data.imageUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload screenshot.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--mc-line)] bg-slate-50/50 p-4 sm:p-5">
      {/* Account Type Selector Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--mc-line)] pb-3">
        <div className="flex items-center gap-1.5">
          <QrCode size={18} className="text-[var(--mc-accent)]" />
          <span className="text-sm font-bold text-[var(--mc-ink)]">
            Scan QR & Bank Details
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--mc-line)] bg-white p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedType("B2C")}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              selectedType === "B2C"
                ? "bg-[var(--mc-accent)] text-white shadow-xs"
                : "text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"
            }`}
          >
            B2C Account
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("B2B")}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              selectedType === "B2B"
                ? "bg-[var(--mc-accent)] text-white shadow-xs"
                : "text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"
            }`}
          >
            B2B Account
          </button>
        </div>
      </div>

      {/* QR Code and Bank Details Grid */}
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] items-start">
        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--mc-line)] bg-white p-3 text-center shadow-xs">
          <div className="relative size-40 overflow-hidden rounded-lg border border-slate-100 bg-white">
            <Image
              src={activeBank.qrImageUrl || (selectedType === "B2B" ? "/images/qr/b2b-qr.jpg" : "/images/qr/b2c-qr.jpg")}
              alt={`UPI QR Code for ${activeBank.beneficiary}`}
              width={160}
              height={160}
              className="size-full object-contain"
              unoptimized
            />
          </div>
          <span className="mt-2 text-[11px] font-semibold text-slate-500">
            Scan with GPay / PhonePe / Paytm / BHIM
          </span>
          {amount ? (
            <span className="mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
              Amount: ₹{amount}
            </span>
          ) : null}
        </div>

        {/* Bank Account Details Table */}
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-3.5 sm:p-4 text-xs">
          <p className="font-bold text-sm text-[var(--mc-ink)]">
            Bank Transfer Details ({selectedType})
          </p>
          <dl className="mt-2.5 divide-y divide-slate-100 text-slate-700">
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">Beneficiary</dt>
              <dd className="font-bold text-slate-900 text-right">{activeBank.beneficiary}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">Bank</dt>
              <dd className="font-semibold text-right">{activeBank.bankName}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">Branch</dt>
              <dd className="font-semibold text-right">{activeBank.branch}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">Current A/C</dt>
              <dd className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-right">
                <span>{activeBank.accountNumber}</span>
                <button
                  type="button"
                  onClick={() => copy(activeBank.accountNumber, "acc")}
                  title="Copy Account Number"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {copiedKey === "acc" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">IFSC Code</dt>
              <dd className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-right">
                <span>{activeBank.ifsc}</span>
                <button
                  type="button"
                  onClick={() => copy(activeBank.ifsc, "ifsc")}
                  title="Copy IFSC Code"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {copiedKey === "ifsc" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500 font-medium">UPI ID</dt>
              <dd className="flex items-center gap-1.5 font-mono font-bold text-[var(--mc-accent)] text-right">
                <span className="break-all">{activeBank.upiId}</span>
                <button
                  type="button"
                  onClick={() => copy(activeBank.upiId, "upi")}
                  title="Copy UPI ID"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
                >
                  {copiedKey === "upi" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Payment Screenshot / Proof Upload Section */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment Screenshot / Receipt Proof
            </span>
            <p className="mt-0.5 text-xs text-slate-500">
              Upload a screenshot showing the transaction ID or UTR clearly for fast verification.
            </p>
          </div>
        </div>

        {proofImageUrl ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href={proofImageUrl}
                target="_blank"
                rel="noreferrer"
                className="relative size-12 shrink-0 overflow-hidden rounded border border-emerald-300 bg-white"
              >
                <Image
                  src={proofImageUrl}
                  alt="Payment screenshot proof"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </a>
              <div className="min-w-0 text-xs">
                <span className="flex items-center gap-1 font-bold text-emerald-800">
                  <Check size={13} /> Screenshot attached
                </span>
                <a
                  href={proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:underline hover:text-[var(--mc-accent)] truncate block"
                >
                  View uploaded proof
                </a>
              </div>
            </div>
            {onClearProof ? (
              <button
                type="button"
                onClick={onClearProof}
                className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:text-red-600 hover:border-red-200"
                title="Remove screenshot"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-2.5">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[var(--mc-accent)]" />
                  <span>Uploading screenshot...</span>
                </>
              ) : (
                <>
                  <Upload size={15} className="text-[var(--mc-accent)]" />
                  <span>Upload screenshot photo (optional)</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {uploadError ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p>
        ) : null}
      </div>
    </div>
  );
}