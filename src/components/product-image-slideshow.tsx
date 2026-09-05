"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

export type ProductImageItem = {
  id: string;
  imageUrl: string;
  altText?: string | null;
  label?: string;
};

export function ProductImageSlideshow({
  images,
  productName,
  categoryName,
}: {
  images: ProductImageItem[];
  productName: string;
  categoryName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // If no images provided, supply default fallback slides
  const slides: ProductImageItem[] =
    images.length > 0
      ? images
      : [
          {
            id: "1",
            imageUrl: "/images/visiting-card-category.jpg",
            altText: `${productName} - Full sample view`,
            label: "Full Sample",
          },
          {
            id: "2",
            imageUrl: "/images/spot-uv-closeup.jpg",
            altText: `${productName} - Material finish close-up`,
            label: "Finish Detail",
          },
          {
            id: "3",
            imageUrl: "/images/visiting-card-promo.jpg",
            altText: `${productName} - Studio craftsmanship`,
            label: "Studio View",
          },
        ];

  const current = slides[currentIndex] || slides[0];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <div className="space-y-3" aria-roledescription="carousel" aria-label={`${productName} image gallery`}>
      {/* Main Large Viewer */}
      <div
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          key={current.id + "-" + current.imageUrl}
          src={current.imageUrl}
          alt={current.altText || `${productName} photo ${currentIndex + 1}`}
          fill
          priority={currentIndex === 0}
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-xs backdrop-blur-xs">
            <span className="size-1.5 rounded-full bg-[#1e3a5f]" />
            {categoryName}
          </div>
          {slides.length > 1 && (
            <div className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
              {currentIndex + 1} / {slides.length}
            </div>
          )}
        </div>

        {/* Navigation Arrows (Visible on hover or when multiple images) */}
        {slides.length > 1 && (
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={prevSlide}
              className="grid size-9 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition hover:bg-white hover:scale-105"
              aria-label="Previous photo"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="grid size-9 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition hover:bg-white hover:scale-105"
              aria-label="Next photo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Mobile Swipe Pagination Dots */}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1 sm:hidden">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? "w-4 bg-white shadow-xs" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Flexible Thumbnail Strip for N images */}
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border transition-all ${
                  isActive
                    ? "border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20 shadow-xs"
                    : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
                }`}
                aria-label={`View photo ${idx + 1}`}
              >
                <Image
                  src={slide.imageUrl}
                  alt={slide.altText || `Thumbnail ${idx + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                <span
                  className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider ${
                    isActive ? "bg-[#1e3a5f] text-white" : "bg-black/60 text-white"
                  }`}
                >
                  {slide.label || `Photo ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
