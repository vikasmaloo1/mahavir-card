"use client";

import { useEffect, useRef } from "react";

type AutoRefreshOptions = {
  /** Also refresh when the tab/window gains focus (default: true) */
  onFocus?: boolean;
  /** Also refresh when the tab becomes visible (default: true) */
  onVisibilityChange?: boolean;
  /** Minimum ms between refreshes to avoid duplicate triggers (default: 800) */
  minIntervalMs?: number;
};

/**
 * Re-runs the given refresh callback when the page is restored from bfcache
 * (browser back/forward button), on history popstate, and when returning
 * to the browser tab or window.
 */
export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  options: AutoRefreshOptions = {},
) {
  const lastRefreshRef = useRef(Date.now());
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  const minInterval = options.minIntervalMs ?? 800;
  const onFocus = options.onFocus ?? true;
  const onVisibilityChange = options.onVisibilityChange ?? true;

  useEffect(() => {
    const trigger = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < minInterval) return;
      lastRefreshRef.current = now;
      try {
        void callbackRef.current();
      } catch (err) {
        console.error("Auto-refresh error:", err);
      }
    };

    // 1. Browser Back/Forward Cache (bfcache) restore
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        trigger();
      }
    };

    // 2. History popstate (browser back/forward navigation within SPA)
    const handlePopState = () => {
      trigger();
    };

    // 3. Tab visibility (switching tabs or apps)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        trigger();
      }
    };

    // 4. Window focus
    const handleFocus = () => {
      trigger();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    if (onVisibilityChange) {
      document.addEventListener("visibilitychange", handleVisibility);
    }
    if (onFocus) {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      if (onVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      if (onFocus) {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, [minInterval, onFocus, onVisibilityChange]);
}
