"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { TaxInvoiceDocument } from "@/components/tax-invoice-document";
import type { InvoiceData } from "@/lib/invoice-types";

export function CustomerOrderInvoiceView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || "Failed to load tax invoice");
      }
      setInvoice(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tax invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  useEffect(() => {
    if (!loading && invoice && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, invoice, autoPrint]);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Customer Print Toolbar (Hidden on Print) */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/account/orders/${orderId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Order
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                Tax Invoice: {invoice?.invoiceNumber || orderId.slice(0, 8)}
              </h1>
              <p className="text-[11px] text-slate-500">
                Official GST Tax Invoice · Mahavir Card
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition-colors"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Document View */}
      <main className="py-6 print:p-0 flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-600 p-8">
            <RefreshCw size={18} className="animate-spin" />
            <span>Loading tax invoice...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-800">
            <p className="font-bold">Error loading tax invoice</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-3 rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : invoice ? (
          <div className="print:m-0 print:p-0 my-4">
            <TaxInvoiceDocument data={invoice} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
