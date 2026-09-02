"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function UpiQrCode({ amount, note, upiId }: { amount: string; note: string; upiId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const uri = `upi://pay?${new URLSearchParams({ pa: upiId, pn: "Mahavir Card", am: amount, cu: "INR", tn: note.slice(0, 50) })}`;
    QRCode.toDataURL(uri, { width: 240, margin: 1 })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setDataUrl(null); });
    return () => { active = false; };
  }, [amount, note, upiId]);

  function copyUpiId() {
    navigator.clipboard?.writeText(upiId).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => undefined);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--mc-line)] bg-white p-5 text-center">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- client-generated data URL, not an optimizable asset
        <img src={dataUrl} alt="UPI payment QR code" width={200} height={200} className="rounded-lg" />
      ) : (
        <div className="grid size-[200px] place-items-center rounded-lg bg-[var(--mc-surface)] text-xs text-[var(--mc-muted)]">Generating QR&hellip;</div>
      )}
      <p className="text-sm font-bold text-[var(--mc-ink)]">Scan with any UPI app (GPay, PhonePe, Paytm&hellip;)</p>
      <button type="button" onClick={copyUpiId} className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3.5 py-2 text-xs font-bold text-[var(--mc-ink)] hover:bg-white transition-colors">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {upiId}
      </button>
    </div>
  );
}
