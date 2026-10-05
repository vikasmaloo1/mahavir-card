"use client";

import { useCallback, useEffect, useState } from "react";
import { invalidateAllCachedFetches } from "@/lib/client-fetch-cache";

export const WALLET_UPDATED_EVENT = "wallet-updated";

export interface WalletUpdatedDetail {
  availableCredit?: string | number | null;
  source?: string;
}

/**
 * Dispatches a global wallet-updated event to all listeners in the app,
 * invalidates in-memory fetch caches, and immediately passes the latest balance.
 */
export function dispatchWalletUpdated(
  availableCredit?: string | number | null,
  source = "mutation"
) {
  if (typeof window === "undefined") return;

  // 1. Invalidate shared client fetch caches (/api/account/summary, /api/account/wallet/top-up, etc.)
  invalidateAllCachedFetches();

  // 2. Dispatch custom event with availableCredit if known
  const detail: WalletUpdatedDetail = {
    availableCredit:
      availableCredit !== undefined && availableCredit !== null
        ? String(availableCredit)
        : null,
    source,
  };

  try {
    window.dispatchEvent(new CustomEvent(WALLET_UPDATED_EVENT, { detail }));
  } catch {
    // Ignore fallback errors
  }
}

/**
 * Fetches the freshest live balance directly from the server without any caching.
 */
export async function fetchLiveWalletBalance(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`/api/account/wallet/top-up?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    const payload = await res.json().catch(() => null);
    if (
      payload?.success &&
      payload?.data?.customer?.availableBalance !== undefined &&
      payload?.data?.customer?.availableBalance !== null
    ) {
      return String(payload.data.customer.availableBalance);
    }
  } catch {
    // Network error or offline
  }
  return null;
}

/**
 * React hook to keep wallet balance synchronized across the entire application
 * in real-time without requiring a browser reload.
 */
export function useLiveWalletBalance(
  initialBalance: string | null = null,
  isEnabled = true
) {
  const [balance, setBalance] = useState<string | null>(initialBalance);

  // Sync when initialBalance prop updates
  useEffect(() => {
    if (initialBalance !== null) {
      setBalance(initialBalance);
    }
  }, [initialBalance]);

  const refresh = useCallback(async () => {
    if (!isEnabled) return;
    const fresh = await fetchLiveWalletBalance();
    if (fresh !== null) {
      setBalance(fresh);
    }
  }, [isEnabled]);

  // Initial fetch on mount
  useEffect(() => {
    if (isEnabled) {
      void refresh();
    }
  }, [isEnabled, refresh]);

  // Real-time event listener + tab visibility/focus re-sync
  useEffect(() => {
    if (!isEnabled) return;

    function onWalletUpdate(event: Event) {
      const customEvent = event as CustomEvent<WalletUpdatedDetail>;
      if (
        customEvent.detail?.availableCredit !== undefined &&
        customEvent.detail?.availableCredit !== null
      ) {
        setBalance(String(customEvent.detail.availableCredit));
      } else {
        void refresh();
      }
    }

    function onVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener(WALLET_UPDATED_EVENT, onWalletUpdate);
    window.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, onWalletUpdate);
      window.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
    };
  }, [isEnabled, refresh]);

  return { balance, setBalance, refresh };
}
