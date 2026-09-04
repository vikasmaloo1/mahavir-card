"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, CreditCard, WalletCards, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { formatInr } from "@/lib/formatting";
import { UpiQrCode } from "@/components/upi-qr-code";

type WalletData = {
  customer: { customerType: string; creditEnabled: boolean; creditLimit: string; availableBalance: string; paymentTermsDays: number } | null;
  profileComplete: boolean;
  transactions: Array<{ id: string; transactionType: string; status: string; amount: string; reference: string | null; notes: string | null; createdAt: string }>;
};

type ToastState = {
  type: "success" | "error";
  title: string;
  message: string;
  amount?: string;
  utr?: string;
};

type LastSubmission = {
  amount: string;
  utr: string;
  timestamp: string;
};

export function WalletDashboard({ upiVpa }: { upiVpa: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    const response = await fetch("/api/account/wallet/top-up", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setData(payload.data);
    else setErrorMessage(payload.error?.message ?? "Could not load balance");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  function triggerToast(toastData: ToastState) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(toastData);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 7000);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 500) {
      const err = "Minimum top-up amount is ₹500.";
      setErrorMessage(err);
      triggerToast({ type: "error", title: "Invalid Amount", message: err });
      return;
    }

    setSaving(true);
    const submittedAmount = parsedAmount.toFixed(2);
    const submittedUtr = utr.trim();

    try {
      const response = await fetch("/api/account/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, utr: submittedUtr || null }),
      });
      const payload = await response.json();
      setSaving(false);

      if (!response.ok) {
        const errorText = payload.error?.message ?? "Top-up request failed";
        setErrorMessage(errorText);
        triggerToast({ type: "error", title: "Request Failed", message: errorText });
        return;
      }

      setAmount("");
      setUtr("");
      setLastSubmission({
        amount: submittedAmount,
        utr: submittedUtr,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      triggerToast({
        type: "success",
        title: "Top-up Request Submitted!",
        message: "Your payment reference has been recorded. We will verify and credit your balance shortly.",
        amount: submittedAmount,
        utr: submittedUtr,
      });

      await load();
    } catch (err) {
      setSaving(false);
      const errText = err instanceof Error ? err.message : "Network error occurred. Please try again.";
      setErrorMessage(errText);
      triggerToast({ type: "error", title: "Network Error", message: errText });
    }
  }

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* FLOATING POPUP TOAST NOTIFICATION */}
      {toast ? (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3.5 rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 sm:top-6 sm:bottom-auto sm:right-6 animate-in fade-in slide-in-from-bottom-5 sm:slide-in-from-top-5 ${
            toast.type === "success"
              ? "border-emerald-300 bg-white/95 text-emerald-950 shadow-emerald-900/15 ring-2 ring-emerald-500/20"
              : "border-red-300 bg-white/95 text-red-950 shadow-red-900/15 ring-2 ring-red-500/20"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              toast.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-none tracking-tight">{toast.title}</h3>
              {toast.type === "success" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <Clock size={10} /> Pending Confirmation
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{toast.message}</p>
            {toast.amount ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                <span>
                  Amount: <strong className="text-slate-900 font-bold">{formatInr(toast.amount)}</strong>
                </span>
                {toast.utr ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>
                      UTR: <strong className="font-mono text-slate-900">{toast.utr}</strong>
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => setToast(null)}
            aria-label="Close notification"
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </aside>
      ) : null}

      <div className="flex items-center gap-3">
        <WalletCards className="text-[var(--mc-accent)]" />
        <div>
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Customer account</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--mc-ink)]">Balance and top up</h1>
        </div>
      </div>

      {data && !data.profileComplete ? (
        <section className="mt-7 rounded-xl border border-[#bfd1f3] bg-white p-6 shadow-sm">
          <h2 className="font-bold text-lg text-[var(--mc-ink)]">Complete your customer profile</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--mc-muted)]">
            Add your contact, city, and state details to activate balance and credit features.
          </p>
          <Link
            href="/account/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors"
          >
            Complete profile <ArrowRight size={16} />
          </Link>
        </section>
      ) : null}

      {data?.customer && data.profileComplete ? (
        <>
          {data.customer.customerType === "B2B" ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <Balance label="Available balance" value={formatInr(data.customer.availableBalance)} />
              <Balance label="Credit limit" value={data.customer.creditEnabled ? formatInr(data.customer.creditLimit) : "Not enabled"} />
              <Balance label="Payment terms" value={data.customer.creditEnabled ? `${data.customer.paymentTermsDays} days` : "Prepaid"} />
            </div>
          ) : (
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Balance label="Available balance" value={formatInr(data.customer.availableBalance)} />
              <Balance label="How you pay" value="Prepaid — pay per order" />
            </div>
          )}

          <div className="mt-7 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <form onSubmit={submit} className="h-fit rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[var(--mc-accent)]" />
                <h2 className="font-bold text-lg text-[var(--mc-ink)]">Add balance via UPI</h2>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[var(--mc-muted)]">
                Enter an amount, scan the QR to pay directly (no gateway fee), then submit your UPI reference below.
              </p>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Amount (₹) <span className="font-normal text-[var(--mc-muted)]">— minimum ₹500</span></span>
                <input
                  required
                  min="500"
                  step="0.01"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount (₹)"
                  className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors"
                />
              </label>

              {Number(amount) > 0 ? (
                <div className="mt-4">
                  <UpiQrCode amount={Number(amount).toFixed(2)} note="Wallet top-up" upiId={upiVpa} />
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">
                  UPI reference (UTR){" "}
                  <span className="font-normal text-[var(--mc-muted)]">(optional, but speeds up confirmation)</span>
                </span>
                <input
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  placeholder="Enter 12-digit UPI reference (UTR)"
                  className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors"
                />
              </label>

              <button
                disabled={saving}
                className="mt-4 w-full rounded-full bg-[var(--mc-accent)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60"
              >
                {saving ? "Submitting..." : "Submit top-up request"}
              </button>

              {/* IN-CARD SUCCESS ALERT BANNER */}
              {lastSubmission ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Request Registered</p>
                        <span className="text-[11px] font-semibold text-emerald-700">{lastSubmission.timestamp}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                        Top-up request for <strong>{formatInr(lastSubmission.amount)}</strong> has been recorded.
                        {lastSubmission.utr ? (
                          <> Reference UTR: <span className="font-mono font-bold text-emerald-950">{lastSubmission.utr}</span>.</>
                        ) : null}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-emerald-800 font-medium">
                        ✓ We will verify your payment and credit your balance shortly. You can track this in &ldquo;Balance activity&rdquo;.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ERROR MESSAGE */}
              {errorMessage ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              ) : null}
            </form>

            <section className="rounded-xl border border-[var(--mc-line)] bg-white shadow-sm overflow-hidden">
              <h2 className="border-b border-[var(--mc-line)] p-5 font-bold text-lg text-[var(--mc-ink)]">
                Balance activity
              </h2>
              {data.transactions.length ? (
                data.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 border-b border-[var(--mc-line)] px-5 py-4 last:border-0 hover:bg-[var(--mc-surface)] transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-[var(--mc-ink)]">
                        {transaction.transactionType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-[var(--mc-muted)]">
                        {transaction.reference || "Account adjustment"} · {transaction.status}
                      </p>
                      {transaction.notes ? <p className="mt-0.5 text-xs text-[var(--mc-muted)]">{transaction.notes}</p> : null}
                    </div>
                    <strong className="text-[var(--mc-accent-dark)]">{formatInr(transaction.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="p-5 text-sm text-[var(--mc-muted)]">No balance activity yet.</p>
              )}
            </section>
          </div>
        </>
      ) : null}

      {!data ? <WalletSkeleton /> : null}
    </main>
  );
}

function Balance({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--mc-ink)]">{value}</p></div>; }

function WalletSkeleton() {
  return (
    <div className="py-8 animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[var(--mc-line)] bg-white p-5 h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-64" />
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-80" />
      </div>
    </div>
  );
}
