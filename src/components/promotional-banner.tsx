"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

export type BannerItem = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  storageKey: string | null;
  placement: "HOME_HERO_BOTTOM" | "HOME_MID" | "CATALOG_TOP" | "CART_CHECKOUT" | "GLOBAL";
  animationType: "FADE" | "SLIDE_UP" | "IMAGE_ZOOM" | "NONE";
  sortOrder?: number;
};

export function PromotionalBanner({
  placement,
  className = "",
}: {
  placement: "HOME_HERO_BOTTOM" | "HOME_MID" | "CATALOG_TOP" | "CART_CHECKOUT" | "GLOBAL";
  className?: string;
}) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/banners?placement=${placement}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data)) {
          setBanners(payload.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [placement]);

  const nextSlide = useCallback(() => {
    if (!banners.length) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    if (!banners.length) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-rotate every 5 seconds when not paused
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, nextSlide]);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  if (!loaded || !banners.length) return null;

  const banner = banners[currentIndex] || banners[0];
  const imageSrc = banner.imageUrl || "/images/home-hero-printing.jpg";

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <section
      className={`w-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Promotional highlights"
    >
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:border-[#1e3a5f]/30 hover:shadow-md sm:p-7 lg:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* Text & CTA Section */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              {banner.badge ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
                  <Sparkles size={13} className="shrink-0 text-[#1e3a5f]" />
                  {banner.badge}
                </span>
              ) : null}
              {banners.length > 1 && (
                <span className="text-[11px] font-bold text-slate-400">
                  {currentIndex + 1} of {banners.length}
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl transition-opacity duration-300">
              {banner.title}
            </h3>

            {banner.subtitle ? (
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {banner.subtitle}
              </p>
            ) : null}

            {banner.ctaLabel && banner.ctaUrl ? (
              <div className="pt-2">
                <Link
                  href={banner.ctaUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-bold text-white shadow-xs transition-all duration-200 hover:bg-[#152a45] hover:shadow-sm"
                >
                  {banner.ctaLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : null}
          </div>

          {/* Realistic Image Frame */}
          <div className="relative aspect-[16/10] min-h-[160px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs sm:min-h-[200px]">
            <Image
              key={banner.id + "-img"}
              src={imageSrc}
              alt={banner.title}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Carousel Navigation Controls (Visible when multiple banners exist) */}
        {banners.length > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-6 bg-[#1e3a5f]"
                      : "w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Circular Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                aria-label="Previous promotion"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                aria-label="Next promotion"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
