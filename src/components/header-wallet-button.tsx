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
    if (initialBalance === null) return;
    const timer = window.setTimeout(() => setBalance(initialBalance), 0);
    return () => window.clearTimeout(timer);
  }, [initialBalance]);

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
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!parsedAmount || parsedAmount < 500) {
      setError("Minimum top-up amount is ₹500.");
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
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Network error. Please check connection.");
    }
  }

  const quickAmounts = ["500", "1000", "2000", "5000", "10000"];

  return (
    <>
      {/* HEADER CORNER BUTTON */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open wallet and top-up"
        className="group flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#bfd3f5] bg-gradient-to-r from-[#eef4ff] to-[#f8faff] px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs sm:text-sm font-semibold text-[var(--mc-ink)] shadow-xs hover:border-[var(--mc-accent)] hover:shadow-md transition-all duration-200"
      >
        <span className="flex size-6 sm:size-6.5 shrink-0 items-center justify-center rounded-full bg-[var(--mc-accent)] text-white shadow-xs group-hover:scale-105 transition-transform">
          <WalletCards size={13} className="sm:size-[14px]" />
        </span>

        <span className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--mc-muted)] hidden md:inline">
            Wallet:
          </span>
          <strong className="font-bold text-[var(--mc-ink)] text-xs sm:text-sm">
            {isLoggedIn ? formatInr(balance) : "₹0.00"}
          </strong>
        </span>

        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--mc-accent)]/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[var(--mc-accent)] group-hover:bg-[var(--mc-accent)] group-hover:text-white transition-colors">
          <Plus size={11} className="shrink-0" />
          <span className="hidden xs:inline">Top up</span>
        </span>
      </button>

      {/* TOP-UP MODAL DIALOG */}
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl border border-[var(--mc-line)] bg-white shadow-2xl animate-in zoom-in-95 duration-200"
          >
            {/* CLOSE BUTTON — pinned to the outer (non-scrolling) container so it never scrolls out of reach */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close modal"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-slate-400 backdrop-blur-xs hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            {/* SCROLLABLE CONTENT — kept separate from the rounded outer border so the scrollbar
                doesn't overlap/clip the rounded corners */}
            <div className="max-h-[92vh] overflow-y-auto p-4 pr-3.5 sm:p-5 sm:pr-4">

            {/* MODAL HEADER */}
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--mc-accent)]/10 text-[var(--mc-accent)]">
                <WalletCards size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--mc-ink)] leading-tight">
                  Add Wallet Balance
                </h2>
                <p className="text-xs text-[var(--mc-muted)]">
                  Instant UPI transfer · Zero gateway fees · Same-day confirmation
                </p>
              </div>
            </div>

            {/* LOGGED IN / ANONYMOUS STATES */}
            {!isLoggedIn ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm font-semibold text-amber-950">
                  Please log in to manage your balance
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Your wallet is linked to your customer account for instant order checkout and statement records.
                </p>
                <div className="mt-4 flex justify-center gap-2.5">
                  <Link
                    href="/login?returnTo=/account/wallet"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors"
                  >
                    Log in now <ArrowRight size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* CURRENT BALANCE BANNER */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] px-4 py-2.5">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--mc-muted)]">
                      Current Balance
                    </span>
                    <p className="text-xl font-bold text-[var(--mc-ink)]">
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

                {/* SUCCESS NOTIFICATION IN MODAL */}
                {submittedData ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                            Request Submitted!
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <Clock size={10} /> Pending Verification
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-emerald-900 leading-relaxed">
                          Top-up request for <strong>{formatInr(submittedData.amount)}</strong> was logged.
                          {submittedData.utr ? (
                            <> Reference UTR: <span className="font-mono font-bold text-emerald-950">{submittedData.utr}</span>.</>
                          ) : null}
                        </p>
                        <p className="mt-2 text-[11px] text-emerald-800 font-medium">
                          ✓ Once our accounts team confirms your UPI reference, the funds will be credited to your available balance.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ERROR BANNER */}
                {error ? (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 animate-in fade-in">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                    <p>{error}</p>
                  </div>
                ) : null}

                {/* FORM */}
                <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--mc-ink)] mb-1.5">
                      Top-up Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        required
                        type="number"
                        min="500"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000"
                        className="w-full rounded-xl border border-[var(--mc-line)] bg-white pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[var(--mc-accent)] transition-colors"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--mc-muted)]">Minimum top-up amount is ₹500.</p>

                    {/* QUICK AMOUNT CHIPS */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
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

                  {/* DYNAMIC QR CODE & UPI VPA */}
                  {Number(amount) > 0 ? (
                    <div className="rounded-xl border border-[var(--mc-line)] bg-slate-50/70 p-3">
                      <div className="flex justify-center">
                        <UpiQrCode
                          amount={Number(amount).toFixed(2)}
                          note="Wallet top-up"
                          upiId={upiVpa}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* UTR REFERENCE INPUT */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--mc-ink)] mb-1">
                      UPI Reference / UTR Number{" "}
                      <span className="font-normal text-[var(--mc-muted)]">
                        (optional, accelerates confirmation)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="e.g. 402812345678 (12-digit UTR)"
                      className="w-full rounded-xl border border-[var(--mc-line)] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 outline-none focus:border-[var(--mc-accent)] transition-colors"
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-[var(--mc-accent)] py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Submitting Request..." : "Submit Top-Up Request"}
                  </button>

                  <p className="text-center text-[11px] text-[var(--mc-muted)]">
                    Need instant credit assistance? WhatsApp support at{" "}
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
      ) : null}
    </>
  );
}
