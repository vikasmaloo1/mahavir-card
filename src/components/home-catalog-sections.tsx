"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";

type Category = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl?: string | null;
};

const categoryMeta: Record<
  string,
  {
    image: string;
    images?: string[];
    alt: string;
    badge: string;
    turnaround: string;
    specs: string;
  }
> = {
  "visiting-card": {
    image: "/images/visiting-card-category.jpg",
    images: [
      "/images/visiting-card-category.jpg",
      "/images/products/nt-single.jpg",
      "/images/products/tearable-card-natural.jpg",
      "/images/products/thermal-single-uv.jpg",
      "/images/products/textured-card-350.jpg",
      "/images/products/round-corner-card.jpg",
      "/images/products/thermal-matt-400.jpg",
    ],
    alt: "Luxury visiting cards with thermal matt and spot UV",
    badge: "1,000 Starting Qty",
    turnaround: "1–2 working days",
    specs: "NT, Thermal Matt, Spot UV",
  },
  "premium-card": {
    image: "/images/premium-card-category.jpg",
    images: [
      "/images/premium-card-category.jpg",
      "/images/products/velvet-gold-foil-pair.jpg",
      "/images/products/dripoff-hybrid-card.jpg",
      "/images/products/velvet-raised-uv-macro.jpg",
      "/images/products/velvet-foil-card.jpg",
      "/images/products/round-corner-card.jpg",
      "/images/products/spot-uv-closeup.jpg",
    ],
    alt: "Thick 400 GSM velvet card with gold foil and corner cut",
    badge: "500 Starting Qty",
    turnaround: "7–10 working days",
    specs: "400 GSM Velvet, Gold Foil, Corner Cut",
  },
  "art-card": {
    image: "/images/art-card-category.jpg",
    images: [
      "/images/art-card-category.jpg",
      "/images/products/art-card.jpg",
      "/images/products/art-card-lamination.jpg",
      "/images/products/tearable-card-natural.jpg",
      "/images/products/tearable-single.jpg",
    ],
    alt: "250 GSM heavy art card printed sheets",
    badge: "250 GSM Art Card",
    turnaround: "3–4 working days",
    specs: "Single/Both Side, Lamination",
  },
  "letterhead-envelope": {
    image: "/images/letterhead-envelope-category.jpg",
    images: [
      "/images/letterhead-envelope-category.jpg",
      "/images/products/letterhead-ss-finish.jpg",
      "/images/products/corporate-envelopes-set.jpg",
      "/images/products/letterhead-envelope-duo.jpg",
      "/images/products/letterhead-80-gsm-ss.jpg",
      "/images/products/alabaster-stationery.jpg",
    ],
    alt: "Alabaster letterhead and matching custom envelope set",
    badge: "Corporate Stationery",
    turnaround: "4–5 working days",
    specs: "Alabaster & SS Finish Papers",
  },
  brochure: {
    image: "/images/brochure-category.jpg",
    images: [
      "/images/brochure-category.jpg",
      "/images/products/trifold-brochure-open.jpg",
      "/images/products/brochure-a8-pocket.jpg",
      "/images/products/brochure-unlaminated-matte.jpg",
      "/images/products/trifold-brochure.jpg",
    ],
    alt: "Folded 250 GSM A4 and A8 art card brochures",
    badge: "250 GSM Art Card",
    turnaround: "4–5 working days",
    specs: "A4 Trifold & A8 Formats",
  },
  "leaflet-cover": {
    image: "/images/leaflet-category.jpg",
    images: [
      "/images/leaflet-category.jpg",
      "/images/products/flyer-170-art-paper.jpg",
      "/images/products/flyer-130-art-paper.jpg",
      "/images/products/leaflet.jpg",
    ],
    alt: "Commercial art paper flyers and leaflets in 130 and 170 GSM",
    badge: "Commercial Print",
    turnaround: "4–5 working days",
    specs: "130 GSM & 170 GSM Art Paper",
  },
  sticker: {
    image: "/images/sticker-category.jpg",
    images: [
      "/images/sticker-category.jpg",
      "/images/products/avery-vinyl-sticker.jpg",
      "/images/products/sticker-sheet-kisscut.jpg",
      "/images/products/diecut-stickers.jpg",
    ],
    alt: "Custom printed adhesive vinyl stickers and labels",
    badge: "Sq. Inch Sizing",
    turnaround: "3–4 working days",
    specs: "Avery & Standard Adhesive",
  },
};

function CategoryCardSlideshow({
  images,
  alt,
  badge,
  indexNumber,
  staggerIndex,
}: {
  images: string[];
  alt: string;
  badge: string;
  indexNumber: number;
  staggerIndex: number;
}) {
  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const validImages = uniqueImages.filter((src) => !failedImages[src]);
  const activeImages = validImages.length > 0 ? validImages : [uniqueImages[0] || "/images/home-hero-printing.jpg"];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const swiped = useRef(false);

  useEffect(() => {
    if (activeImages.length <= 1 || isHovered) return;

    // Stagger initial transition so cards don't flip simultaneously
    const initialDelay = ((staggerIndex % 3) + 1) * 1200 + 2000;
    let timer: NodeJS.Timeout;

    const startCycling = () => {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeImages.length);
      }, 4000);
    };

    const initialTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeImages.length);
      startCycling();
    }, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [activeImages.length, isHovered, staggerIndex]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev + 1) % activeImages.length);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeImages.length <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.touches[0].clientX;
    const diffY = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      swiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = (touchStartY.current ?? 0) - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      swiped.current = true;
      if (diffX > 0) {
        // Swiped left -> next photo
        setCurrentIndex((prev) => (prev + 1) % activeImages.length);
      } else {
        // Swiped right -> previous photo
        setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    setTimeout(() => {
      swiped.current = false;
    }, 200);
  };

  // Mouse Drag Handlers for Desktop Testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeImages.length <= 1) return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isDragging.current = true;
    swiped.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const diffX = touchStartX.current - e.clientX;
    if (Math.abs(diffX) > 10) {
      swiped.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const diffX = touchStartX.current - e.clientX;
    if (Math.abs(diffX) > 30) {
      swiped.current = true;
      if (diffX > 0) {
        setCurrentIndex((prev) => (prev + 1) % activeImages.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
      }
    }
    isDragging.current = false;
    touchStartX.current = null;
    setTimeout(() => {
      swiped.current = false;
    }, 200);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isDragging.current = false;
    touchStartX.current = null;
  };

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 group/slide touch-pan-y select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClickCapture={(e) => {
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {activeImages.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`${alt} - Slide ${i + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-cover transition-all duration-700 ease-in-out ${
            i === currentIndex ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-105"
          }`}
          loading={i === 0 ? "eager" : "lazy"}
          onError={() => setFailedImages((prev) => ({ ...prev, [src]: true }))}
        />
      ))}

      {/* Subtle hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      {/* Category Number & Badge */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-xs backdrop-blur-xs pointer-events-none">
        <span className="font-extrabold text-[#1e3a5f]">#{String(indexNumber).padStart(2, "0")}</span>
        <span className="text-slate-500">·</span>
        <span>{badge}</span>
      </div>

      {/* Multiple unique images navigation */}
      {activeImages.length > 1 && (
        <>
          {/* Previous Slide Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-xs transition hover:bg-black/80 hover:scale-110 group-hover:opacity-100"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Next Slide Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-xs transition hover:bg-black/80 hover:scale-110 group-hover:opacity-100"
          >
            <ChevronRight size={16} />
          </button>

          {/* Pagination Indicators */}
          <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-xs">
            {activeImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => handleDotClick(e, i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group flex items-center justify-center p-1.5 -m-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex ? "w-3.5 bg-white shadow-xs" : "w-1.5 bg-white/50 group-hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function HomeCatalogSections({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(!initialCategories.length);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload?.success) throw new Error("request_failed");
        if (active) setCategories(payload.data);
      })
      .catch(() => {
        if (active) setError("Product families could not be loaded. Check your connection and retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestVersion]);

  return (
    <section id="categories" className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs">
            <span className="size-1.5 rounded-full bg-[#1e3a5f]" />
            Core Print Categories
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Commercial Print Solutions
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Engineered for trade buyers, agencies, and businesses across Gujarat &amp; Rajasthan with instant online configuration.
          </p>
        </div>
        <Link
          href="/products"
          className="hidden items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-xs transition hover:border-[#1e3a5f] hover:text-[#1e3a5f] sm:inline-flex"
        >
          View Full Catalogue <ArrowRight size={16} />
        </Link>
      </div>

      {error && !categories.length ? (
        <div
          role="alert"
          className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm font-semibold text-red-900"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setRequestVersion((v) => v + 1);
            }}
            className="rounded-full bg-[#1e3a5f] px-4 py-2 text-white shadow-xs hover:bg-[#152a45]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading && !categories.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading product categories">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-slate-100" />
              <div className="mt-4 space-y-2.5">
                <div className="h-4 w-24 rounded bg-slate-100" />
                <div className="h-6 w-44 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {categories.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category, index) => {
            const meta = categoryMeta[category.slug] || {
              image: category.imageUrl || "/images/home-hero-printing.jpg",
              images: [category.imageUrl || "/images/home-hero-printing.jpg"],
              alt: category.name,
              badge: "Offset Print",
              turnaround: "2–4 working days",
              specs: "Standard Commercial",
            };

            const cardImages = meta.images && meta.images.length > 0 ? meta.images : [meta.image];

            return (
              <Link
                key={category.slug}
                href={"/products?category=" + category.slug}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#1e3a5f]/40 hover:shadow-md"
              >
                <div>
                  <CategoryCardSlideshow
                    images={cardImages}
                    alt={meta.alt}
                    badge={meta.badge}
                    indexNumber={index + 1}
                    staggerIndex={index}
                  />

                  <div className="mt-4 px-1">
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#1e3a5f]">
                      {category.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {category.description || "Custom commercial offset printing format with live online calculation."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold">{meta.specs}</span>
                      <span>·</span>
                      <span>{meta.turnaround}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 px-1 pt-3 text-xs font-bold text-[#1e3a5f]">
                  <span>Configure &amp; Order</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/products"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3.5 text-sm font-bold text-white shadow-xs"
        >
          View Full Catalogue <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
