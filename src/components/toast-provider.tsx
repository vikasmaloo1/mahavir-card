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
  // Actionable notifications (e.g. View basket) NEVER auto-dismiss on timer (duration 0).
  // Non-actionable alerts have a generous 25s window, and freeze permanently upon any hover or touch.
  const defaultDuration = options.action ? 0 : 25000;
  const { durationMs, ...restOptions } = options;
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, {
      detail: {
        id,
        durationMs: durationMs !== undefined ? durationMs : defaultDuration,
        ...restOptions,
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
      setToasts((current) => [newToast, ...current].slice(0, 5));
    }

    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, []);

  if (!toasts.length) return null;

  return (
    <aside
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 left-4 right-4 z-[999999] flex max-w-sm w-auto mx-auto flex-col gap-2.5 sm:left-auto sm:right-6 sm:bottom-6 sm:w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </aside>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [isInteracted, setIsInteracted] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = React.useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // If toast has an action button (like "View basket →"), NEVER auto-dismiss!
  // It stays until the user explicitly clicks or dismisses.
  const hasAction = Boolean(toast.action);
  const shouldAutoDismiss = !hasAction && Boolean(toast.durationMs && toast.durationMs > 0);
  const duration = toast.durationMs && toast.durationMs > 0 ? toast.durationMs : 25000;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initial countdown ONLY for non-actionable toasts
  useEffect(() => {
    if (shouldAutoDismiss) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        onDismissRef.current();
      }, duration);
    }
    return () => clearTimer();
  }, [shouldAutoDismiss, duration, clearTimer]);

  // When mouse enters, moves, or user touches on mobile:
  // PERMANENTLY CANCEL ANY DISMISS TIMER! The notification will NEVER disappear while interacting.
  const handleInteraction = useCallback(() => {
    setIsInteracted(true);
    clearTimer();
  }, [clearTimer]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleInteraction}
      onMouseMove={handleInteraction}
      onPointerEnter={handleInteraction}
      onPointerDown={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
        isInteracted ? "shadow-2xl ring-2 ring-[var(--mc-accent)]/40" : ""
      } ${
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
          <div className="mt-2.5 flex items-center gap-2">
            {toast.action.href ? (
              <Link
                href={toast.action.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mc-accent)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <span>{toast.action.label}</span>
                <ExternalLink size={12} />
              </Link>
            ) : toast.action.onClick ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mc-accent)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)] active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
      >
        <X size={15} />
      </button>

      {/* Subtle indicator when timer is paused on hover/touch */}
      {isInteracted && (
        <span className="absolute bottom-1 right-2 text-[9px] font-semibold text-slate-400/80 uppercase tracking-wider select-none">
          Paused
        </span>
      )}
    </div>
  );
}
