"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

import { formatInr } from "@/lib/formatting";
import { UpiQrCode } from "@/components/upi-qr-code";

interface HeaderWalletButtonProps {
  initialBalance: string | null;
  isLoggedIn: boolean;
  upiVpa: string;
}

export function HeaderWalletButton({
  initialBalance,
  isLoggedIn,
  upiVpa,
}: HeaderWalletButtonProps) {
  const [balance, setBalance] = useState<string>(initialBalance ?? "0.00");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    amount: string;
    utr: string;
  } | null>(null);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialBalance !== null) {
      setBalance(initialBalance);
    }
  }, [initialBalance]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  async function refreshBalance() {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/account/wallet/top-up", { cache: "no-store" });
      const payload = await res.json();
      if (payload.success && payload.data?.customer?.availableBalance) {
        setBalance(payload.data.customer.availableBalance);
      }
    } catch {
      // Ignore background refresh errors
    }
  }

  useEffect(() => {
    function onWalletUpdate() {
      void refreshBalance();
    }
    window.addEventListener("wallet-updated", onWalletUpdate);
    return () => window.removeEventListener("wallet-updated", onWalletUpdate);
  }, [isLoggedIn]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function handleOpen() {
    setError("");
    setSubmittedData(null);
    setIsOpen(true);
    void refreshBalance();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter an amount greater than ₹0.");
      return;
    }

    setSubmitting(true);
    const submittedAmount = parsedAmount.toFixed(2);
    const submittedUtr = utr.trim();

    try {
      const response = await fetch("/api/account/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          utr: submittedUtr || null,
        }),
      });
      const payload = await response.json();
      setSubmitting(false);

      if (!response.ok) {
        setError(payload.error?.message ?? "Top-up request failed. Please retry.");
        return;
      }

      setSubmittedData({
        amount: submittedAmount,
        utr: submittedUtr,
      });
      setUtr("");

      window.dispatchEvent(new CustomEvent("wallet-updated"));
      await refreshBalance();
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message || "Network error. Please check connection.");
    }
  }

  const quickAmounts = ["500", "1000", "2000", "5000"];

  const modalContent = isOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="flex min-h-full items-center justify-center py-4 sm:py-8">
        <div
          ref={modalRef}
          className="relative w-full max-w-md rounded-2xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        >
          {/* CLOSE BUTTON */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>

          {/* MODAL HEADER */}
          <div className="flex items-center gap-2.5 pr-8">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--mc-accent)]/10 text-[var(--mc-accent)] shrink-0">
              <WalletCards size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--mc-ink)] leading-tight">
                Add Wallet Balance
              </h2>
              <p className="text-[11px] text-[var(--mc-muted)]">
                Instant UPI transfer · Zero gateway fees
              </p>
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-semibold text-amber-950">
                Please log in to manage your balance
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Your wallet is linked to your customer account for instant order checkout.
              </p>
              <div className="mt-4 flex justify-center gap-2.5">
                <Link
                  href="/login?returnTo=/account/wallet"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors"
                >
                  Log in now <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CURRENT BALANCE BANNER */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3.5 py-2.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--mc-muted)]">
                    Current Balance
                  </span>
                  <p className="text-lg font-bold text-[var(--mc-ink)] leading-tight">
                    {formatInr(balance)}
                  </p>
                </div>
                <Link
                  href="/account/wallet"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--mc-accent)] hover:underline"
                >
                  Full ledger <ExternalLink size={12} />
                </Link>
              </div>

              {/* SUCCESS CONFIRMATION */}
              {submittedData ? (
                <div className="mt-3.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-950 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                          Request Logged!
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Clock size={10} /> Pending
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-900 leading-relaxed">
                        Top-up request for <strong>{formatInr(submittedData.amount)}</strong> recorded.
                        {submittedData.utr ? (
                          <> UTR: <span className="font-mono font-bold">{submittedData.utr}</span>.</>
                        ) : null}
                      </p>
                      <p className="mt-1.5 text-[11px] text-emerald-800 font-medium">
                        ✓ We will verify your payment and credit your balance shortly.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ERROR BANNER */}
              {error ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 animate-in fade-in">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
                  <p>{error}</p>
                </div>
              ) : null}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[var(--mc-ink)] mb-1">
                    Top-up Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full rounded-xl border border-[var(--mc-line)] bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-[var(--mc-accent)] transition-colors"
                    />
                  </div>

                  {/* QUICK AMOUNT CHIPS */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {quickAmounts.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          amount === q
                            ? "bg-[var(--mc-accent)] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        +₹{Number(q).toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC QR CODE */}
                {Number(amount) > 0 ? (
                  <div className="rounded-xl border border-[var(--mc-line)] bg-slate-50/70 p-2.5">
                    <UpiQrCode
                      amount={Number(amount).toFixed(2)}
                      note="Wallet top-up"
                      upiId={upiVpa}
                    />
                  </div>
                ) : null}

                {/* UTR REFERENCE INPUT */}
                <div>
                  <label className="block text-xs font-bold text-[var(--mc-ink)] mb-1">
                    UPI Reference (UTR){" "}
                    <span className="font-normal text-[var(--mc-muted)]">
                      (optional, speeds up confirmation)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 402812345678"
                    className="w-full rounded-xl border border-[var(--mc-line)] bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-[var(--mc-accent)] transition-colors"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[var(--mc-accent)] py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Submitting Request..." : "Submit Top-Up Request"}
                </button>

                <p className="text-center text-[10px] text-[var(--mc-muted)]">
                  Need help? WhatsApp{" "}
                  <a
                    href="https://wa.me/919925232932"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[var(--mc-accent)] hover:underline"
                  >
                    +91 99252 32932
                  </a>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* HEADER CORNER BUTTON */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open wallet and top-up"
        className="group flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full border border-[#bfd3f5] bg-gradient-to-r from-[#eef4ff] to-[#f8faff] px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs sm:text-sm font-semibold text-[var(--mc-ink)] shadow-xs hover:border-[var(--mc-accent)] hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--mc-accent)] text-white shadow-xs group-hover:scale-105 transition-transform">
          <WalletCards size={13} />
        </span>

        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--mc-muted)] hidden md:inline">
            Wallet:
          </span>
          <strong className="font-bold text-[var(--mc-ink)] text-xs sm:text-sm">
            {isLoggedIn ? formatInr(balance) : "₹0.00"}
          </strong>
        </span>

        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--mc-accent)]/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[var(--mc-accent)] group-hover:bg-[var(--mc-accent)] group-hover:text-white transition-colors whitespace-nowrap">
          <Plus size={11} className="shrink-0" />
          <span className="hidden xs:inline">Top up</span>
        </span>
      </button>

      {/* PORTAL TO DOCUMENT.BODY TO PREVENT ANY HEADER CLIPPING */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
