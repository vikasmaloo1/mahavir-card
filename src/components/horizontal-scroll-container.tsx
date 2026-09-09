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
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidthPct, setThumbWidthPct] = useState(30);
  const [thumbLeftPct, setThumbLeftPct] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowing = scrollWidth > clientWidth + 2;
    setIsOverflowing(overflowing);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);

    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    const rawThumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1;
    const thumbWidth = Math.max(0.18, Math.min(1, rawThumbRatio));
    const thumbLeft = progress * (1 - thumbWidth);

    setScrollProgress(progress);
    setThumbWidthPct(thumbWidth * 100);
    setThumbLeftPct(thumbLeft * 100);
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

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const el = scrollRef.current;
    if (!track || !el) return;

    const updateScrollFromPointer = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = ratio * maxScroll;
    };

    updateScrollFromPointer(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateScrollFromPointer(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className={`relative group/hscroll ${className}`}>
      {/* Top action bar when table/listing overflows */}
      {showControls && isOverflowing ? (
        <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
          {showHint ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 truncate">
              <span className="inline-block size-2 rounded-full bg-[var(--mc-accent,#162237)] animate-pulse shrink-0" />
              <span className="truncate">Scroll table left/right to view all columns</span>
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 shrink-0">
            {/* Scroller Line Track with Draggable/Clickable Indicator */}
            <div
              ref={trackRef}
              role="scrollbar"
              aria-valuenow={Math.round(scrollProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-orientation="horizontal"
              aria-label="Table horizontal scroll track"
              title="Click or drag to scroll table horizontally"
              className="relative h-2.5 w-24 sm:w-36 cursor-pointer rounded-full bg-slate-200/90 hover:bg-slate-300/80 transition-colors select-none"
              onPointerDown={handleTrackPointerDown}
            >
              <div
                className="absolute top-0 bottom-0 rounded-full bg-[var(--mc-accent,#162237)] shadow-xs transition-[left,width] duration-75 pointer-events-none"
                style={{
                  width: `${thumbWidthPct}%`,
                  left: `${thumbLeftPct}%`,
                }}
              />
            </div>

            {/* Scroll Arrows */}
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
          <div className="inline-block min-w-full align-middle">
            {children}
          </div>
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
