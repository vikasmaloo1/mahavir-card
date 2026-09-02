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
        className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:border-[#1e3a5f]/30 hover:shadow-md sm:p-7 lg:p-8 ${animClass}`}
      >
        <div className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* Text & CTA Section */}
          <div className="space-y-3.5">
            {banner.badge ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
                <Sparkles size={13} className="shrink-0 text-[#1e3a5f]" />
                {banner.badge}
              </span>
            ) : null}

            <h3 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
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
              src={imageSrc}
              alt={banner.title}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className={`object-cover ${
                banner.animationType === "IMAGE_ZOOM" ? "motion-zoom-image" : "transition-transform duration-500 group-hover:scale-105"
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
