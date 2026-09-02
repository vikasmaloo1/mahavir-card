"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront runtime error:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#f8fafc]">
      <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
          <AlertTriangle size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We encountered an unexpected issue while rendering this page. You can try refreshing the page or return to the product catalogue.
        </p>

        {error?.digest && (
          <p className="mt-3 text-[11px] font-mono text-slate-400">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
          >
            <RefreshCw size={15} />
            <span>Try again</span>
          </button>
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>View products</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
