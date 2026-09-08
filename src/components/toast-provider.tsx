"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Info, X, ExternalLink } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  durationMs?: number;
};

const TOAST_EVENT = "mc-toast-event";

export function showToast(options: Omit<ToastItem, "id">) {
  if (typeof window === "undefined") return;
  const id = "toast_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, {
      detail: {
        id,
        durationMs: options.durationMs ?? (options.type === "error" ? 6000 : 4500),
        ...options,
      },
    })
  );
}

showToast.success = (title: string, message?: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title" | "message">>) => {
  showToast({ type: "success", title, message, ...options });
};

showToast.error = (title: string, message?: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title" | "message">>) => {
  showToast({ type: "error", title, message, ...options });
};

showToast.info = (title: string, message?: string, options?: Partial<Omit<ToastItem, "id" | "type" | "title" | "message">>) => {
  showToast({ type: "info", title, message, ...options });
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    function handleEvent(event: Event) {
      const customEvent = event as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;

      setToasts((current) => [newToast, ...current].slice(0, 4));

      if (newToast.durationMs && newToast.durationMs > 0) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.durationMs);
      }
    }

    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, [removeToast]);

  if (!toasts.length) return null;

  return (
    <aside
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm w-[calc(100vw-2rem)] flex-col gap-2.5 sm:bottom-6 sm:right-6 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "border-emerald-300 bg-white/95 text-emerald-950 shadow-emerald-900/10 ring-1 ring-emerald-500/20"
              : toast.type === "error"
              ? "border-red-300 bg-white/95 text-red-950 shadow-red-900/10 ring-1 ring-red-500/20"
              : "border-blue-300 bg-white/95 text-slate-900 shadow-slate-900/10 ring-1 ring-blue-500/20"
          }`}
        >
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
              toast.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : toast.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : toast.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <Info size={18} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold leading-snug">{toast.title}</h4>
            {toast.message ? (
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed break-words">{toast.message}</p>
            ) : null}
            {toast.action ? (
              <div className="mt-2 flex items-center gap-2">
                {toast.action.href ? (
                  <Link
                    href={toast.action.href}
                    onClick={() => removeToast(toast.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--mc-accent)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-xs"
                  >
                    {toast.action.label}
                    <ExternalLink size={12} />
                  </Link>
                ) : toast.action.onClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick?.();
                      removeToast(toast.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--mc-accent)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-xs"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </aside>
  );
}
