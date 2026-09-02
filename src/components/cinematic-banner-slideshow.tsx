"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

export type CinematicSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  imageUrl: string;
};

const defaultSlides: CinematicSlide[] = [
  {
    id: "1",
    badge: "Commercial Plant Capacity",
    title: "High-Volume Commercial Printing",
    subtitle:
      "Need 10,000+ brochures, custom stickers, or bespoke stationery? Our multi-unit offset presses deliver rich ink density, tight registration, and competitive bulk rates for agencies and trade printers.",
    primaryCtaLabel: "Request Bulk Quotation",
    primaryCtaUrl: "/quote",
    secondaryCtaLabel: "View 250 GSM Brochures",
    secondaryCtaUrl: "/products?category=brochure",
    imageUrl: "/images/commercial-offset-banner.jpg",
  },
  {
    id: "2",
    badge: "Tactile Luxury Finishes",
    title: "400 GSM Velvet, Raised UV & Gold Foil",
    subtitle:
      "Make an unmistakable impression with selective high-gloss spot UV, thermal matt coatings, and metallic gold foil stamping on heavy 400 GSM card stocks.",
    primaryCtaLabel: "Explore Premium Cards",
    primaryCtaUrl: "/products?category=premium-card",
    secondaryCtaLabel: "Visiting Card Rates",
    secondaryCtaUrl: "/products?category=visiting-card",
    imageUrl: "/images/visiting-card-promo.jpg",
  },
  {
    id: "3",
    badge: "250 GSM Art Card Specialists",
    title: "Vibrant Brochures & Catalogues",
    subtitle:
      "Precision machine creasing, rich CMYK color gamut, and thermal lamination options in standard A4 trifold and A8 pocket formats calibrated for commercial trade distribution.",
    primaryCtaLabel: "Configure Brochures",
    primaryCtaUrl: "/products?category=brochure",
    secondaryCtaLabel: "View All Products",
    secondaryCtaUrl: "/products",
    imageUrl: "/images/brochure-category.jpg",
  },
  {
    id: "4",
    badge: "Square-Inch Precision Die-Cut",
    title: "Custom Product Stickers & Adhesive Labels",
    subtitle:
      "Strong adhesive backing on Avery and standard vinyl stocks, calculated down to the exact square inch with automated bleed detection and safe trimming margins.",
    primaryCtaLabel: "Configure Stickers",
    primaryCtaUrl: "/products?category=sticker",
    secondaryCtaLabel: "Request Custom Size",
    secondaryCtaUrl: "/quote",
    imageUrl: "/images/sticker-category.jpg",
  },
  {
    id: "5",
    badge: "Pre-Press & Direct CDR Workflow",
    title: "Commercial Speed & Direct Counter Pickup",
    subtitle:
      "Direct CorelDRAW file upload with automated margin verification. Collect directly from our Khadia Golwad press facility in Ahmedabad or schedule fast regional dispatch.",
    primaryCtaLabel: "Start Order Now",
    primaryCtaUrl: "/products",
    secondaryCtaLabel: "Check Order Status",
    secondaryCtaUrl: "/account",
    imageUrl: "/images/home-hero-printing.jpg",
  },
];

export function CinematicBannerSlideshow({
  placement = "HOME_MID",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  const [slides, setSlides] = useState<CinematicSlide[]>(defaultSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/banners?placement=${placement}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data) && payload.data.length > 0) {
          const apiSlides: CinematicSlide[] = payload.data.map((b: { id: string; badge?: string; title: string; subtitle?: string; ctaLabel?: string; ctaUrl?: string; imageUrl?: string }) => ({
            id: b.id,
            badge: b.badge || "Commercial Printing",
            title: b.title,
            subtitle: b.subtitle || "",
            primaryCtaLabel: b.ctaLabel || "Learn More",
            primaryCtaUrl: b.ctaUrl || "/products",
            secondaryCtaLabel: "View Catalog",
            secondaryCtaUrl: "/products",
            imageUrl: b.imageUrl || "/images/commercial-offset-banner.jpg",
          }));
          setSlides(apiSlides);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [placement]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused, nextSlide]);

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

  const slide = slides[currentIndex] || slides[0];

  return (
    <section
      className={`mx-auto max-w-[1440px] px-4 py-8 lg:px-8 lg:py-12 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Commercial printing highlights"
    >
      {/* Horizontal Cinematic Container */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 shadow-2xl">
        {/* Aspect Ratio: Wide horizontal (approx 21:8 on desktop, min-h 320px) */}
        <div className="relative min-h-[340px] w-full sm:min-h-[380px] lg:min-h-[380px] xl:min-h-[400px]">
          {/* Background Image with Gentle Crossfade */}
          <Image
            key={slide.id + "-" + slide.imageUrl}
            src={slide.imageUrl}
            alt={slide.title}
            fill
            sizes="(max-width: 1440px) 100vw, 1440px"
            priority={currentIndex === 0}
            className="object-cover opacity-40 transition-opacity duration-700 ease-in-out"
          />

          {/* Cinematic Contrast Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent sm:hidden" />

          {/* Content Box */}
          <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 py-10 sm:px-12 sm:py-12 lg:px-14">
            <div className="flex items-center gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                {slide.badge}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentIndex + 1} of {slides.length}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-[2.6rem] lg:leading-[1.15]">
              {slide.title}
            </h2>

            <p className="mt-3.5 line-clamp-3 text-sm leading-relaxed text-slate-300 sm:line-clamp-none sm:text-base">
              {slide.subtitle}
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3.5">
              <Link
                href={slide.primaryCtaUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 hover:scale-[1.02]"
              >
                {slide.primaryCtaLabel} <ArrowRight size={16} />
              </Link>
              {slide.secondaryCtaLabel && slide.secondaryCtaUrl ? (
                <Link
                  href={slide.secondaryCtaUrl}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-xs transition hover:bg-white/15"
                >
                  {slide.secondaryCtaLabel}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Navigation Controls: Bottom Right (Arrows) and Bottom Left (Dots) */}
          <div className="absolute inset-x-6 bottom-5 z-20 flex items-center justify-between sm:inset-x-12">
            {/* Slide Indicator Pills */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-8 bg-white"
                      : "w-2 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Circular Next / Prev Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevSlide}
                className="grid size-9 place-items-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-md transition hover:bg-white hover:text-slate-950"
                aria-label="Previous slide"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="grid size-9 place-items-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-md transition hover:bg-white hover:text-slate-950"
                aria-label="Next slide"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
