"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollStep?: number;
  showControls?: boolean;
  showHint?: boolean;
}

export function HorizontalScrollContainer({
  children,
  className = "",
  scrollStep = 320,
  showControls = true,
  showHint = true,
}: HorizontalScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowing = scrollWidth > clientWidth + 2;
    setIsOverflowing(overflowing);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    // MutationObserver to detect dynamically rendered rows
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -scrollStep : scrollStep;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={`relative group/hscroll ${className}`}>
      {/* Top action bar when table/listing overflows */}
      {showControls && isOverflowing ? (
        <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
          {showHint ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
              <span className="inline-block size-2 rounded-full bg-[var(--mc-accent)] animate-pulse" />
              Scroll table left/right to view all columns
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        {/* Left Fade Indicator */}
        {canScrollLeft ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black/10 to-transparent transition-opacity duration-200"
          />
        ) : null}

        {/* Scrollable Container with custom styled scrollbar */}
        <div
          ref={scrollRef}
          className="mc-horizontal-scroller overflow-x-auto scroll-smooth focus:outline-none"
          tabIndex={0}
        >
          {children}
        </div>

        {/* Right Fade Indicator */}
        {canScrollRight ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black/10 to-transparent transition-opacity duration-200"
          />
        ) : null}

        {/* Floating Quick Scroll Buttons on desktop hover */}
        {isOverflowing ? (
          <>
            {canScrollLeft ? (
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex size-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg border border-slate-200 backdrop-blur-xs hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/hscroll:opacity-100"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            {canScrollRight ? (
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex size-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg border border-slate-200 backdrop-blur-xs hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/hscroll:opacity-100"
              >
                <ChevronRight size={18} />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
