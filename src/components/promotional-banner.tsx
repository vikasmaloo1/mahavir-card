"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded || !banners.length) return null;

  // Render the primary banner for this placement
  const banner = banners[0];
  const imageSrc = banner.imageUrl || "/images/mahavir-print-assortment.png";

  const animClass =
    banner.animationType === "FADE"
      ? "motion-gentle-fade"
      : banner.animationType === "SLIDE_UP"
      ? "motion-gentle-slide"
      : "";

  return (
    <section className={`w-full overflow-hidden ${className}`}>
      <div
        className={`group relative overflow-hidden rounded-xl border border-[#c7d7f3] bg-white p-5 shadow-sm transition-all duration-300 hover:border-[var(--mc-accent)] hover:shadow-md sm:p-6 lg:p-7 ${animClass}`}
      >
        <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr] lg:gap-8">
          {/* Text & CTA Section */}
          <div className="space-y-3.5">
            {banner.badge ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7d7f3] bg-[var(--mc-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--mc-accent)]">
                <Sparkles size={12} className="shrink-0" />
                {banner.badge}
              </span>
            ) : null}

            <h3 className="text-xl font-bold leading-snug text-[var(--mc-ink)] sm:text-2xl">
              {banner.title}
            </h3>

            {banner.subtitle ? (
              <p className="max-w-xl text-sm leading-relaxed text-[var(--mc-muted)] sm:text-[15px]">
                {banner.subtitle}
              </p>
            ) : null}

            {banner.ctaLabel && banner.ctaUrl ? (
              <div className="pt-1">
                <Link
                  href={banner.ctaUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[var(--mc-accent-dark)] hover:shadow"
                >
                  {banner.ctaLabel}
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : null}
          </div>

          {/* Realistic Image Frame */}
          <div className="relative aspect-[16/9] min-h-[140px] w-full overflow-hidden rounded-lg border border-[#d7e1f2] bg-[var(--mc-accent-soft)] motion-zoom-container sm:min-h-[160px]">
            <Image
              src={imageSrc}
              alt={banner.title}
              fill
              sizes="(max-width: 768px) 100vw, 35vw"
              className={`object-cover ${
                banner.animationType === "IMAGE_ZOOM" ? "motion-zoom-image" : "transition-transform duration-300 group-hover:scale-105"
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
