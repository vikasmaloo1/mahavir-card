"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function fallbackForSlug(slug: string): string {
  if (slug.startsWith("premium-")) return "/images/premium-card-category.jpg";
  if (slug.startsWith("art-card-")) return "/images/art-card-category.jpg";
  if (slug.startsWith("letterhead-") || slug.startsWith("envelope-") || slug.startsWith("cover-")) {
    return "/images/letterhead-envelope-category.jpg";
  }
  if (slug.startsWith("brochure-")) return "/images/brochure-category.jpg";
  if (slug.startsWith("leaflet-")) return "/images/leaflet-category.jpg";
  if (slug.startsWith("sticker-") || slug.startsWith("avery-")) return "/images/sticker-category.jpg";
  if (
    slug.startsWith("nt-") ||
    slug.startsWith("tearable-") ||
    slug.startsWith("400-gsm-") ||
    slug.startsWith("350-gsm-") ||
    slug.includes("visiting-card")
  ) {
    return "/images/visiting-card-category.jpg";
  }
  return "/images/home-hero-printing.jpg";
}

function resolveImageForSlug(slug: string, src?: string | null): string {
  if (src && src.startsWith("/images/") && src !== "/images/mahavir-print-assortment.png") {
    return src;
  }
  return fallbackForSlug(slug);
}

export function ProductImage({
  alt,
  slug,
  src,
  priority = false,
}: {
  alt: string;
  slug: string;
  src?: string | null;
  priority?: boolean;
}) {
  const resolved = resolveImageForSlug(slug, src);
  const [currentSrc, setCurrentSrc] = useState(resolved);

  useEffect(() => {
    setCurrentSrc(resolveImageForSlug(slug, src));
  }, [slug, src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
      onError={() => {
        const fallback = fallbackForSlug(slug);
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}
