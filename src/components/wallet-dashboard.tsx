"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, WalletCards, X } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";

import { formatInr } from "@/lib/formatting";
import { UpiQrCode } from "@/components/upi-qr-code";
import { PaymentBankDetails } from "@/components/payment-bank-details";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

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
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 8;
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const transactions = data?.transactions;
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [transactions]);

  const totalActivityPages = Math.max(1, Math.ceil(sortedTransactions.length / ACTIVITY_PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
    return sortedTransactions.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [sortedTransactions, activityPage]);

  function formatDateTime(dateString: string) {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  }

  async function load() {
    const response = await fetch(`/api/account/wallet/top-up?_t=${Date.now()}`, { cache: "no-store" });
    if (response.status === 401) { setSignedOut(true); return; }
    const payload = await response.json();
    if (payload.success) setData(payload.data);
    else setErrorMessage(payload.error?.message ?? "Could not load balance");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  useAutoRefresh(load);

  if (signedOut) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div role="alert" className="rounded-xl border border-[#c7d6f0] bg-white p-6 text-center">
          <p className="font-bold text-[var(--mc-ink)]">Your session has expired.</p>
          <p className="mt-1.5 text-sm text-[var(--mc-muted)]">Sign in again to view your wallet balance.</p>
          <Link
            href={`/login?next=${encodeURIComponent("/account/wallet")}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"
          >
            Customer sign in <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    );
  }

  function triggerToast(toastData: ToastState) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(toastData);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 25000);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 500) {
      const err = "Minimum top-up amount is ₹500.";
      setErrorMessage(err);
      triggerToast({ type: "error", title: "Invalid Amount", message: err });
      return;
    }
    if (parsedAmount > 100000) {
      const err = "Maximum top-up amount is ₹1,00,000.";
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
        body: JSON.stringify({
          amount: parsedAmount,
          utr: submittedUtr || null,
          proofImageUrl: proofImageUrl || null,
        }),
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
      setProofImageUrl(null);
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
          onMouseEnter={() => {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
          }}
          onMouseMove={() => {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
          }}
          onPointerDown={() => {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
          }}
          onTouchStart={() => {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
          }}
          onTouchMove={() => {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
          }}
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

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <form onSubmit={submit} noValidate className="h-fit rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[var(--mc-accent)]" />
                <h2 className="font-bold text-lg text-[var(--mc-ink)]">Add balance via UPI / Bank Transfer</h2>
              </div>
              <p className="text-xs leading-5 text-[var(--mc-muted)]">
                Enter your top-up amount, pay via QR or direct Bank of Baroda transfer (zero fee), then enter the reference and screenshot proof below.
              </p>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Top-up Amount (₹) <span className="font-normal text-[var(--mc-muted)]">— min ₹500, max ₹1,00,000</span></span>
                <input
                  required
                  min="500"
                  max="100000"
                  step="100"
                  type="number"
                  value={amount}
                  onChange={(event) => {
                    const val = event.target.value.replace(/[^0-9]/g, "");
                    setAmount(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const current = parseInt(amount, 10) || 0;
                      setAmount(String(current ? Math.min(100000, current + 100) : 500));
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const current = parseInt(amount, 10) || 0;
                      setAmount(String(Math.max(500, current - 100)));
                    } else if (e.key === "." || e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter amount (₹)"
                  className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors font-semibold"
                />
              </label>

              <PaymentBankDetails
                customerType={data.customer?.customerType || "B2C"}
                amount={Number(amount) > 0 ? Number(amount).toFixed(2) : undefined}
                proofImageUrl={proofImageUrl}
                onProofUploaded={setProofImageUrl}
                onClearProof={() => setProofImageUrl(null)}
              />

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">
                  12-Digit UPI / IMPS Reference (UTR){" "}
                  <span className="font-normal text-[var(--mc-muted)]">(optional, speeds up confirmation)</span>
                </span>
                <input
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  placeholder="e.g. 423456789012"
                  className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors font-mono"
                />
              </label>

              <button
                disabled={saving}
                className="w-full rounded-full bg-[var(--mc-accent)] px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60"
              >
                {saving ? "Submitting top-up request..." : "Submit Top-up Request"}
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
              <div className="flex items-center justify-between border-b border-[var(--mc-line)] p-5">
                <h2 className="font-bold text-lg text-[var(--mc-ink)]">
                  Balance activity
                </h2>
                {sortedTransactions.length > 0 ? (
                  <span className="text-xs font-semibold text-[var(--mc-muted)]">
                    Showing {paginatedTransactions.length} of {sortedTransactions.length}
                  </span>
                ) : null}
              </div>
              {sortedTransactions.length ? (
                <>
                  <div className="divide-y divide-[var(--mc-line)]">
                    {paginatedTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--mc-surface)] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-[var(--mc-ink)]">
                              {transaction.transactionType.replaceAll("_", " ")}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                transaction.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : transaction.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--mc-muted)]">
                            <span className="inline-flex items-center gap-1 font-medium text-[var(--mc-ink)]">
                              <Clock size={12} className="text-[var(--mc-muted)]" />
                              {formatDateTime(transaction.createdAt)}
                            </span>
                            {transaction.reference ? (
                              <>
                                <span>·</span>
                                <span className="font-mono">{transaction.reference}</span>
                              </>
                            ) : null}
                          </div>
                          {transaction.notes ? (
                            <p className="mt-1 text-xs text-[var(--mc-muted)]">{transaction.notes}</p>
                          ) : null}
                        </div>
                        <strong className="shrink-0 text-base font-bold text-[var(--mc-accent-dark)]">
                          {formatInr(transaction.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  {totalActivityPages > 1 ? (
                    <div className="flex items-center justify-between border-t border-[var(--mc-line)] bg-slate-50/50 px-5 py-3">
                      <span className="text-xs text-[var(--mc-muted)]">
                        Page {activityPage} of {totalActivityPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activityPage <= 1}
                          onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--mc-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--mc-ink)] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                        >
                          <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                          type="button"
                          disabled={activityPage >= totalActivityPages}
                          onClick={() => setActivityPage((prev) => Math.min(totalActivityPages, prev + 1))}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--mc-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--mc-ink)] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
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
