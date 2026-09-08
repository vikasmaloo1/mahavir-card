"use client";

import { Check, Copy, Loader2, QrCode, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { showToast } from "@/components/toast-provider";

export type BankConfig = {
  beneficiary: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImageUrl: string;
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
  customerType,
  onProofUploaded,
  proofImageUrl,
  onClearProof,
  amount,
  orderNumber,
  mandatoryProof,
}: {
  customerType?: string;
  onProofUploaded?: (url: string) => void;
  proofImageUrl?: string | null;
  onClearProof?: () => void;
  amount?: string;
  orderNumber?: string;
  mandatoryProof?: boolean;
}) {
  const [config, setConfig] = useState<{ b2c: BankConfig; b2b: BankConfig }>({
    b2c: DEFAULT_B2C,
    b2b: DEFAULT_B2B,
  });
  const [resolvedCustomerType, setResolvedCustomerType] = useState<"B2C" | "B2B">(
    customerType === "B2B" ? "B2B" : "B2C",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showStaticQr, setShowStaticQr] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/payments/config", { cache: "no-store" })
        .then((res) => res.json())
        .catch(() => null),
      !customerType
        ? fetch("/api/account/summary", { cache: "no-store" })
            .then((res) => res.json())
            .catch(() => null)
        : Promise.resolve(null),
    ]).then(([configPayload, accountPayload]) => {
      if (!active) return;
      if (configPayload?.success && configPayload.data) {
        setConfig({
          b2c: configPayload.data.b2c || DEFAULT_B2C,
          b2b: configPayload.data.b2b || DEFAULT_B2B,
        });
      }
      if (accountPayload?.success && accountPayload.data?.customer?.customerType) {
        setResolvedCustomerType(
          accountPayload.data.customer.customerType === "B2B" ? "B2B" : "B2C",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [customerType]);

  const isB2B = (customerType || resolvedCustomerType) === "B2B";
  const activeBank = isB2B ? config.b2b : config.b2c;

  const numAmount = amount ? parseFloat(amount.replace(/[^0-9.]/g, "")) : 0;
  const hasValidAmount = !isNaN(numAmount) && numAmount > 0;
  const formattedAmount = hasValidAmount
    ? numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount;

  // Generate dynamic QR code with exact order amount pre-filled
  useEffect(() => {
    let active = true;
    if (!activeBank.upiId) return;

    const params = new URLSearchParams({
      pa: activeBank.upiId,
      pn: activeBank.beneficiary || "Mahavir Card",
      cu: "INR",
    });
    if (hasValidAmount) {
      params.set("am", numAmount.toFixed(2));
    }
    if (orderNumber) {
      params.set("tn", `Order ${orderNumber}`.slice(0, 50));
    } else {
      params.set("tn", "Mahavir Card Payment");
    }

    const uri = `upi://pay?${params.toString()}`;
    QRCode.toDataURL(uri, {
      width: 220,
      margin: 1,
      color: {
        dark: "#162237",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [activeBank.upiId, activeBank.beneficiary, hasValidAmount, numAmount, orderNumber]);

  function copy(text: string, key: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast.info("Copied to clipboard", text);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const err = "Please upload an image file (PNG, JPG, JPEG, WEBP).";
      setUploadError(err);
      showToast.error("Invalid file", err);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      const err = "Screenshot file must be smaller than 15MB.";
      setUploadError(err);
      showToast.error("File too large", err);
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
      showToast.success("Proof uploaded", "Payment screenshot attached successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload screenshot.";
      setUploadError(msg);
      showToast.error("Upload failed", msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--mc-line)] bg-slate-50/50 p-4 sm:p-5">
      {/* Header — clean without B2B/B2C selector */}
      <div className="flex items-center gap-2 border-b border-[var(--mc-line)] pb-3">
        <QrCode size={18} className="text-[var(--mc-accent)]" />
        <span className="text-sm font-bold text-[var(--mc-ink)]">
          Scan QR & Bank Details
        </span>
      </div>

      {/* QR Code and Bank Details Grid */}
      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] items-start">
        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--mc-line)] bg-white p-3.5 text-center shadow-xs">
          {/* Exact order amount banner during QR scanning */}
          {hasValidAmount ? (
            <div className="w-full rounded-lg bg-emerald-50 border border-emerald-200/90 py-2 px-3 text-center mb-2.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Exact Order Amount
              </span>
              <span className="block text-xl font-black text-emerald-950 tabular-nums">
                ₹{formattedAmount}
              </span>
            </div>
          ) : null}

          {/* QR Code display */}
          <div className="relative size-44 overflow-hidden rounded-lg border border-slate-100 bg-white flex items-center justify-center">
            {showStaticQr && activeBank.qrImageUrl ? (
              <Image
                src={activeBank.qrImageUrl || (isB2B ? "/images/qr/b2b-qr.jpg" : "/images/qr/b2c-qr.jpg")}
                alt={`UPI QR Code for ${activeBank.beneficiary}`}
                width={176}
                height={176}
                className="size-full object-contain"
                unoptimized
              />
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`UPI payment QR code for ${activeBank.beneficiary}`}
                width={176}
                height={176}
                className="size-full object-contain"
              />
            ) : (
              <Image
                src={activeBank.qrImageUrl || (isB2B ? "/images/qr/b2b-qr.jpg" : "/images/qr/b2c-qr.jpg")}
                alt={`UPI QR Code for ${activeBank.beneficiary}`}
                width={176}
                height={176}
                className="size-full object-contain"
                unoptimized
              />
            )}
          </div>

          <p className="mt-2 text-[11px] font-medium text-slate-600 leading-tight">
            Scan with any UPI app (GPay / PhonePe / Paytm / BHIM)
            {hasValidAmount ? (
              <span className="block mt-0.5 text-emerald-700 font-semibold">
                Amount ₹{formattedAmount} pre-filled
              </span>
            ) : null}
          </p>

          <button
            type="button"
            onClick={() => copy(activeBank.upiId, "upi_qr")}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {copiedKey === "upi_qr" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            UPI: {activeBank.upiId}
          </button>

          {activeBank.qrImageUrl ? (
            <button
              type="button"
              onClick={() => setShowStaticQr(!showStaticQr)}
              className="mt-2 text-[11px] font-medium text-[var(--mc-accent)] hover:underline"
            >
              {showStaticQr ? "Switch to dynamic QR (pre-filled amount)" : "Show merchant QR image"}
            </button>
          ) : null}
        </div>

        {/* Bank Account Details Table */}
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-3.5 sm:p-4 text-xs">
          <p className="font-bold text-sm text-[var(--mc-ink)]">
            Bank Transfer Details
          </p>
          <dl className="mt-2.5 divide-y divide-slate-100 text-slate-700">
            {hasValidAmount ? (
              <div className="flex items-center justify-between py-1.5 bg-emerald-50/70 px-2.5 rounded -mx-1 mb-1">
                <dt className="text-emerald-800 font-bold">Payable Amount</dt>
                <dd className="font-black text-emerald-950 text-right text-sm tabular-nums">
                  ₹{formattedAmount}
                </dd>
              </div>
            ) : null}
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
              <dt className="text-slate-500 font-medium">GSTIN</dt>
              <dd className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-right">
                <span>24AIUPJ2271L1ZV</span>
                <button
                  type="button"
                  onClick={() => copy("24AIUPJ2271L1ZV", "gstin")}
                  title="Copy GSTIN"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {copiedKey === "gstin" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
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
      <div className={`rounded-xl border border-dashed bg-white p-3.5 sm:p-4 ${mandatoryProof && !proofImageUrl ? "border-amber-400 bg-amber-50/20" : "border-slate-300"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment Screenshot / Receipt Proof {mandatoryProof ? <span className="text-red-500">*</span> : null}
            </span>
            <p className="mt-0.5 text-xs text-slate-500">
              {mandatoryProof
                ? "Payment screenshot is mandatory. Upload a screenshot showing the transaction ID or UTR clearly to place your order."
                : "Upload a screenshot showing the transaction ID or UTR clearly for fast verification."}
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
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-bold transition-colors ${mandatoryProof ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[var(--mc-accent)]" />
                  <span>Uploading screenshot...</span>
                </>
              ) : (
                <>
                  <Upload size={15} className="text-[var(--mc-accent)]" />
                  <span>{mandatoryProof ? "Upload payment screenshot (required)" : "Upload screenshot photo (optional)"}</span>
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