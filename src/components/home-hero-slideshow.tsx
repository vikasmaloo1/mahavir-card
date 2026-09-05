"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

export type HeroSlide = {
  id: string;
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  imageUrl: string;
  imageAlt: string;
  floatingBadgeTitle: string;
  floatingBadgeSubtitle: string;
  tag: string;
};

const defaultHeroSlides: HeroSlide[] = [
  {
    id: "hero-1",
    badge: "Commercial Offset Printing · Ahmedabad, Gujarat",
    titlePrefix: "Premium Printing. ",
    titleHighlight: "Made Simple.",
    subtitle:
      "Business cards, brochures, stickers, stationery and commercial printing — ordered online with transparent pricing and direct CDR file upload.",
    primaryCtaLabel: "Order Now",
    primaryCtaUrl: "/products",
    secondaryCtaLabel: "Explore Printing",
    secondaryCtaUrl: "#categories",
    imageUrl: "/images/banners/banner-commercial-press.jpg",
    imageAlt: "Ahmedabad commercial offset printing press workshop, gold foil cards and pantone guide",
    floatingBadgeTitle: "Ready to Print",
    floatingBadgeSubtitle: "Live Prices · Online Specs · CDR Proof",
    tag: "Gujarat & Rajasthan",
  },
  {
    id: "hero-2",
    badge: "Tactile Luxury Card Finishing",
    titlePrefix: "Make Your First Impression ",
    titleHighlight: "Unmistakable.",
    subtitle:
      "400 GSM card stocks, velvet soft-touch lamination, selective spot UV gloss, metallic gold foil stamping, and smooth rounded die-cut corners.",
    primaryCtaLabel: "Explore Visiting Cards",
    primaryCtaUrl: "/products?category=visiting-card",
    secondaryCtaLabel: "View Premium Cards",
    secondaryCtaUrl: "/products?category=premium-card",
    imageUrl: "/images/visiting-card-promo.jpg",
    imageAlt: "Luxury foil stamped and velvet coated business cards on studio desk",
    floatingBadgeTitle: "Tactile Luxury",
    floatingBadgeSubtitle: "Velvet · Thermal Matt · Spot UV · Foil",
    tag: "1,000 / 500 Qty",
  },
  {
    id: "hero-4",
    badge: "Executive Stationery & Brochures",
    titlePrefix: "Print That Represents ",
    titleHighlight: "Your Brand.",
    subtitle:
      "100 GSM Alabaster letterheads, custom flap envelopes, 250 GSM art card brochures, and corporate presentation suites calibrated for commercial distribution.",
    primaryCtaLabel: "Configure Brochures",
    primaryCtaUrl: "/products?category=brochure",
    secondaryCtaLabel: "Letterhead & Envelopes",
    secondaryCtaUrl: "/products?category=letterhead-envelope",
    imageUrl: "/images/banners/banner-stationery-suite.jpg",
    imageAlt: "Executive stationery suite with embossed letterhead, custom envelopes and brochures on slate desk",
    floatingBadgeTitle: "Executive Suite",
    floatingBadgeSubtitle: "Alabaster · SS Finish · Machine Creasing",
    tag: "3–5 Days Turnaround",
  },
  {
    id: "hero-5",
    badge: "Square-Inch Precision Die-Cutting",
    titlePrefix: "Your Custom Design. ",
    titleHighlight: "Your Size & Finish.",
    subtitle:
      "Avery and standard vinyl adhesive stickers, custom retail boxes, and bottle labels priced by finished square-inch area with automated margin checking.",
    primaryCtaLabel: "Configure Stickers",
    primaryCtaUrl: "/products?category=sticker",
    secondaryCtaLabel: "All Products",
    secondaryCtaUrl: "/products",
    imageUrl: "/images/banners/banner-stickers-packaging.jpg",
    imageAlt: "Custom printed adhesive vinyl stickers, product labels, and retail packaging on studio podium",
    floatingBadgeTitle: "Stickers & Labels",
    floatingBadgeSubtitle: "Avery Adhesive · Square-Inch Calculator",
    tag: "₹250 Min Charge",
  },
];

export function HomeHeroSlideshow({ className = "" }: { className?: string }) {
  const [slides, setSlides] = useState<HeroSlide[]>(defaultHeroSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    let active = true;
    fetch("/api/banners?placement=HOME_HERO", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data) && payload.data.length > 0) {
          const mapped: HeroSlide[] = payload.data.map((b: { id: string; badge?: string; title: string; subtitle?: string; ctaLabel?: string; ctaUrl?: string; imageUrl?: string }) => {
            const parts = b.title.split(".");
            return {
              id: b.id,
              badge: b.badge || "Commercial Printing · Ahmedabad",
              titlePrefix: parts[0] ? parts[0] + "." : b.title,
              titleHighlight: parts[1] ? parts[1].trim() : "",
              subtitle: b.subtitle || "Premium printing made simple.",
              primaryCtaLabel: b.ctaLabel || "Order Now",
              primaryCtaUrl: b.ctaUrl || "/products",
              secondaryCtaLabel: "Explore Printing",
              secondaryCtaUrl: "#categories",
              imageUrl: b.imageUrl || "/images/home-hero-printing.jpg",
              imageAlt: b.title,
              floatingBadgeTitle: b.badge || "Ready to Print",
              floatingBadgeSubtitle: "Live Prices · Online Specs",
              tag: "Mahavir Card",
            };
          });
          setSlides(mapped);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(nextSlide, 7000);
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

  const current = slides[currentIndex] || slides[0];

  return (
    <section
      className={`relative border-b border-slate-200/80 bg-white ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Homepage hero highlights"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* Left Hero Content */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs">
                <span className="size-2 rounded-full bg-[#1e3a5f]" />
                {current.badge}
              </div>
              {slides.length > 1 && (
                <span className="text-xs font-bold text-slate-500">
                  {currentIndex + 1} / {slides.length}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.12]">
              {current.titlePrefix}
              <span className="text-[#1e3a5f]">{current.titleHighlight}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {current.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={current.primaryCtaUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-7 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152a45] hover:scale-[1.02]"
              >
                {current.primaryCtaLabel} <ArrowRight size={17} />
              </Link>
              <Link
                href={current.secondaryCtaUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-800 shadow-xs transition hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
              >
                {current.secondaryCtaLabel} <ReceiptText size={17} />
              </Link>
            </div>

            {/* Subtle Local Proof Badge */}
            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500">
              <MapPin size={16} className="shrink-0 text-[#1e3a5f]" />
              <span>Press Facility: Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad</span>
            </div>
          </div>

          {/* Right Hero Image Frame with Slide Controls */}
          <div className="group relative">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg sm:aspect-[16/10]">
              <Image
                key={current.id + "-" + current.imageUrl}
                src={current.imageUrl}
                alt={current.imageAlt}
                fill
                priority={currentIndex === 0}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Floating Badge */}
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/95 p-3.5 shadow-md backdrop-blur-xs">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#1e3a5f]">
                    {current.floatingBadgeTitle}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {current.floatingBadgeSubtitle}
                  </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {current.tag}
                </span>
              </div>

              {/* Previous & Next overlay buttons */}
              {slides.length > 1 && (
                <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="grid size-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-md backdrop-blur-xs transition hover:bg-white hover:scale-105"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="grid size-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-md backdrop-blur-xs transition hover:bg-white hover:scale-105"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom dots */}
            {slides.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to hero slide ${idx + 1}`}
                    className="group flex items-center justify-center p-2.5 -m-2.5"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? "w-6 bg-[#1e3a5f]" : "w-2 bg-slate-300 group-hover:bg-slate-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
