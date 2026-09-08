"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Printer, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { adminRequest } from "@/lib/admin-client";
import { TaxInvoiceDocument } from "@/components/tax-invoice-document";
import { AdminInvoiceManagerModal } from "@/components/admin-invoice-manager-modal";
import type { InvoiceData, InvoiceSizeMode } from "@/lib/invoice-types";

export function AdminOrderInvoiceView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [showDesk, setShowDesk] = useState(false);
  const [forcedSize, setForcedSize] = useState<InvoiceSizeMode | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest<InvoiceData>(`/api/admin/orders/${orderId}/invoice`);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice data");
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

  const activeInvoice = invoice
    ? {
        ...invoice,
        sizeMode: forcedSize || invoice.sizeMode,
        resolvedPageSize: forcedSize
          ? (forcedSize === "A4" ? "A4" : "A5")
          : invoice.resolvedPageSize,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Top Toolbar (Hidden on Print) */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/orders/${orderId}`}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Order
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                Tax Invoice: {invoice?.invoiceNumber || orderId.slice(0, 8)}
              </h1>
              <p className="text-[11px] text-slate-500">
                {invoice ? `${invoice.items.length} item(s) · Sizing: ${activeInvoice?.resolvedPageSize}` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Size Switchers */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setForcedSize(null)}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  forcedSize === null ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Auto ({invoice?.resolvedPageSize || "A5"})
              </button>
              <button
                type="button"
                onClick={() => setForcedSize("HALF")}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  forcedSize === "HALF" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Half (A5)
              </button>
              <button
                type="button"
                onClick={() => setForcedSize("A4")}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  forcedSize === "A4" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Full (A4)
              </button>
            </div>

            {/* Edit / Manage Button */}
            <button
              type="button"
              onClick={() => setShowDesk(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Edit3 size={14} />
              Invoice Desk & GST
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition-colors"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6 print:p-0 flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-600 p-8">
            <RefreshCw size={18} className="animate-spin" />
            <span>Generating tax invoice...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-800">
            <p className="font-bold">Error loading invoice</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-3 rounded bg-red-700 px-3 py-1.5 text-xs font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : activeInvoice ? (
          <div className="print:m-0 print:p-0 my-4">
            <TaxInvoiceDocument data={activeInvoice} />
          </div>
        ) : null}
      </main>

      {/* Invoice Desk Modal */}
      {showDesk ? (
        <AdminInvoiceManagerModal
          orderId={orderId}
          onClose={() => {
            setShowDesk(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
