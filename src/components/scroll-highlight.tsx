"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps content and applies a one-time highlight/reveal transition when it
 * first scrolls into view. Falls back to always-visible if IntersectionObserver
 * is unavailable, and skips the animation for prefers-reduced-motion.
 */
export function ScrollHighlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-2xl transition-all duration-700 ease-out motion-reduce:transition-none ${
        inView
          ? "opacity-100 translate-y-0 ring-2 ring-[var(--mc-accent)]/25 bg-[var(--mc-accent-soft)]"
          : "opacity-0 translate-y-3 motion-reduce:opacity-100 motion-reduce:translate-y-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
